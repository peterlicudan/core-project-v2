<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
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

            // ✅ LOG
            ActivityLog::log(
                'login_success',
                null,
                "Admin {$user->name} ({$user->email}) logged in"
            );

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

            $request->session()->forget('otp_attempts');

            $user->update([
                'last_login_at' => now(),
            ]);

            // ✅ LOG — staff initial login (before OTP)
            ActivityLog::log(
                'login_success',
                null,
                "Staff {$user->name} ({$user->email}) started login (OTP sent)"
            );

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

        // ✅ LOG
        ActivityLog::log(
            'login_success',
            null,
            "User {$user->name} ({$user->email}) logged in as {$user->role}"
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

            $request->session()->forget('otp_attempts');

            return redirect()
                ->route('login')
                ->withErrors([
                    'otp' =>
                    'Your login authentication PIN has expired. Please log in again.',
                ]);
        }

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

            $request->session()->forget('otp_attempts');

            return back()->withErrors([
                'otp' =>
                'Your authentication PIN has expired. Please log in again.',
            ]);
        }

        $attempts = (int) $request->session()->get(
            'otp_attempts',
            0
        );

        if (
            !Hash::check(
                $validated['otp'],
                $user->login_otp_hash
            )
        ) {
            $attempts++;

            $request->session()->put(
                'otp_attempts',
                $attempts
            );

            $remaining = max(
                0,
                self::MAX_OTP_ATTEMPTS - $attempts
            );

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

        // ✅ LOG — staff OTP verified
        ActivityLog::log(
            'login_success',
            null,
            "Staff {$user->name} ({$user->email}) verified OTP and logged in"
        );

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
     * Refresh the idle timer after genuine on-screen interaction.
     */
    public function activity(Request $request): JsonResponse
    {
        if (! Auth::check()) {
            abort(401);
        }

        $request->session()->put('last_activity_at', time());

        return response()->json(['ok' => true]);
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

        // ✅ LOG — logout
        if ($user) {
            ActivityLog::log(
                'logout',
                null,
                "{$user->role} {$user->name} ({$user->email}) logged out"
            );
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        $request->session()->forget('otp_attempts');

        return redirect('/');
    }
}