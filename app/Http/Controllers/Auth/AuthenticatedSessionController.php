<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Maximum failed OTP attempts.
     */
    private const MAX_OTP_ATTEMPTS = 3;

    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        /*
        |--------------------------------------------------------------------------
        | AUTHENTICATE EMAIL + PASSWORD
        |--------------------------------------------------------------------------
        */

        $request->authenticate();

        /*
        |--------------------------------------------------------------------------
        | REGENERATE SESSION
        |--------------------------------------------------------------------------
        */

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::user();

        /*
        |--------------------------------------------------------------------------
        | ADMIN
        |--------------------------------------------------------------------------
        */

        if ($user->role === 'admin') {

            $user->update([
                'last_login_at' => now(),
            ]);

            return redirect()->route(
                'admin.dashboard'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | STAFF LOGIN AUTHENTICATION
        |--------------------------------------------------------------------------
        */

        if ($user->role === 'staff') {

            $user->sendLoginOtp();

            $request->session()->put(
                'login_pin_verified',
                false
            );

            $request->session()->put(
                'login_pin_user_id',
                $user->id
            );

            /*
            |--------------------------------------------------------------------------
            | ✅ I-RESET ANG OTP ATTEMPTS SA BAGONG LOGIN
            |--------------------------------------------------------------------------
            */

            $request->session()->forget('otp_attempts');

            $user->update([
                'last_login_at' => now(),
            ]);

            return redirect()->route(
                'verification.otp'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CLIENT / OTHER USER
        |--------------------------------------------------------------------------
        */

        $user->update([
            'last_login_at' => now(),
        ]);

        $request->session()->put(
            'login_pin_verified',
            true
        );

        return redirect()->intended(
            route(
                'dashboard',
                absolute: false
            )
        );
    }

    /**
     * Display the login authentication PIN page.
     */
    public function showOtp(
        Request $request
    ): Response|RedirectResponse {

        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            return redirect()->route('login');
        }

        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }

        if (
            $request->session()->get(
                'login_pin_user_id'
            ) !== $user->id
        ) {
            return redirect()->route('login');
        }

        if (
            $request->session()->get(
                'login_pin_verified'
            ) === true
        ) {
            return redirect()->route('dashboard');
        }

        if (
            is_null($user->login_otp_hash) ||
            is_null($user->login_otp_expires_at)
        ) {
            return redirect()
                ->route('login')
                ->withErrors([
                    'otp' =>
                    'Your login authentication PIN is no longer available. Please log in again.',
                ]);
        }

        if (
            now()->greaterThan(
                $user->login_otp_expires_at
            )
        ) {
            $user->clearLoginOtp();

            $request->session()->forget(
                'login_pin_user_id'
            );

            $request->session()->put(
                'login_pin_verified',
                false
            );

            /*
            |--------------------------------------------------------------------------
            | ✅ I-CLEAR ANG ATTEMPTS KAPAG EXPIRED
            |--------------------------------------------------------------------------
            */

            $request->session()->forget('otp_attempts');

            return redirect()
                ->route('login')
                ->withErrors([
                    'otp' =>
                    'Your login authentication PIN has expired. Please log in again.',
                ]);
        }

        /*
        |--------------------------------------------------------------------------
        | ✅ ATTEMPTS LEFT
        |--------------------------------------------------------------------------
        */

        $attempts = (int) $request->session()->get(
            'otp_attempts',
            0
        );

        $attemptsLeft = max(
            0,
            self::MAX_OTP_ATTEMPTS - $attempts
        );

        return Inertia::render(
            'Auth/VerifyOtp',
            [
                'email' =>
                $user->email,

                'expiresAt' =>
                $user
                    ->login_otp_expires_at
                    ?->toIso8601String(),

                /*
                |--------------------------------------------------------------------------
                | ✅ IPASA ANG ATTEMPTS LEFT
                |--------------------------------------------------------------------------
                */

                'attemptsLeft' =>
                $attemptsLeft,
            ]
        );
    }

    /**
     * Verify the login authentication PIN.
     */
    public function verifyOtp(
        Request $request
    ): RedirectResponse {

        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            return redirect()->route('login');
        }

        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }

        if (
            $request->session()->get(
                'login_pin_user_id'
            ) !== $user->id
        ) {
            Auth::logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login');
        }

        if (
            $request->session()->get(
                'login_pin_verified'
            ) === true
        ) {
            return redirect()->route('dashboard');
        }

        $validated = $request->validate([
            'otp' => [
                'required',
                'digits:6',
            ],
        ]);

        if (
            is_null($user->login_otp_hash)
        ) {
            return back()->withErrors([
                'otp' =>
                'No active authentication PIN was found. Please log in again.',
            ]);
        }

        if (
            is_null($user->login_otp_expires_at) ||
            now()->greaterThan(
                $user->login_otp_expires_at
            )
        ) {
            $user->clearLoginOtp();

            /*
            |--------------------------------------------------------------------------
            | ✅ I-CLEAR ANG ATTEMPTS KAPAG EXPIRED
            |--------------------------------------------------------------------------
            */

            $request->session()->forget('otp_attempts');

            return back()->withErrors([
                'otp' =>
                'Your authentication PIN has expired. Please log in again.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | ✅ GET CURRENT ATTEMPTS
        |--------------------------------------------------------------------------
        */

        $attempts = (int) $request->session()->get(
            'otp_attempts',
            0
        );

        /*
        |--------------------------------------------------------------------------
        | CHECK PIN
        |--------------------------------------------------------------------------
        */

        if (
            !Hash::check(
                $validated['otp'],
                $user->login_otp_hash
            )
        ) {

            /*
            |--------------------------------------------------------------------------
            | ✅ DAGDAGAN ANG ATTEMPTS
            |--------------------------------------------------------------------------
            */

            $attempts++;

            $request->session()->put(
                'otp_attempts',
                $attempts
            );

            $remaining = max(
                0,
                self::MAX_OTP_ATTEMPTS - $attempts
            );

            /*
            |--------------------------------------------------------------------------
            | ✅ 3 FAILED ATTEMPTS — AUTO LOGOUT
            |--------------------------------------------------------------------------
            */

            if ($attempts >= self::MAX_OTP_ATTEMPTS) {

                $user->clearLoginOtp();

                $request->session()->forget(
                    'otp_attempts'
                );

                $request->session()->forget(
                    'login_pin_user_id'
                );

                $request->session()->put(
                    'login_pin_verified',
                    false
                );

                Auth::logout();

                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()
                    ->route('login')
                    ->withErrors([
                        'email' =>
                        'Too many failed attempts. Please log in again.',
                    ]);
            }

            return back()->withErrors([
                'otp' =>
                "The authentication PIN is incorrect. You have {$remaining} attempt(s) remaining.",
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | ✅ TAMA — RESET ATTEMPTS
        |--------------------------------------------------------------------------
        */

        $request->session()->forget('otp_attempts');

        $user->clearLoginOtp();

        $request->session()->put(
            'login_pin_verified',
            true
        );

        $request->session()->put(
            'login_pin_user_id',
            $user->id
        );

        $user->update([
            'last_login_at' => now(),
        ]);

        $request->session()->regenerate();

        return redirect()
            ->intended(
                route(
                    'dashboard',
                    absolute: false
                )
            )
            ->with(
                'success',
                'Authentication successful. Welcome back to ALIBATON.'
            );
    }

    /**
     * Resend a NEW login authentication PIN.
     */
    public function resendOtp(
        Request $request
    ): RedirectResponse {

        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            return redirect()->route('login');
        }

        if ($user->role !== 'staff') {
            return redirect()->route('dashboard');
        }

        if (
            $request->session()->get(
                'login_pin_user_id'
            ) !== $user->id
        ) {
            Auth::logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login');
        }

        if (
            $request->session()->get(
                'login_pin_verified'
            ) === true
        ) {
            return redirect()->route('dashboard');
        }

        $user->sendLoginOtp();

        /*
        |--------------------------------------------------------------------------
        | ✅ I-RESET ANG ATTEMPTS SA BAGONG OTP
        |--------------------------------------------------------------------------
        */

        $request->session()->forget('otp_attempts');

        $request->session()->put(
            'login_pin_verified',
            false
        );

        return back()->with(
            'success',
            'A new authentication PIN has been sent to your email address.'
        );
    }

    /**
     * Staff online heartbeat.
     */
    public function heartbeat(
        Request $request
    ): RedirectResponse {

        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'staff') {
            abort(403);
        }

        if (
            $request->session()->get(
                'login_pin_verified'
            ) !== true
        ) {
            abort(403);
        }

        $user->update([
            'last_login_at' => now(),
        ]);

        return back();
    }

    /**
     * Destroy authenticated session.
     */
    public function destroy(
        Request $request
    ): RedirectResponse {

        /** @var User|null $user */
        $user = Auth::user();

        if (
            $user &&
            $user->role === 'staff'
        ) {
            $user->update([
                'last_login_at' =>
                now()->subMinutes(10),
            ]);

            if (
                !is_null(
                    $user->login_otp_hash
                )
            ) {
                $user->clearLoginOtp();
            }
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        /*
        |--------------------------------------------------------------------------
        | ✅ I-CLEAR ANG OTP ATTEMPTS
        |--------------------------------------------------------------------------
        */

        $request->session()->forget('otp_attempts');

        return redirect('/');
    }
}
