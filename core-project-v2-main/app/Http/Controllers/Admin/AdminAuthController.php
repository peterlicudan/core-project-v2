<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\ActivityLog;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdminAuthController extends Controller
{
    /**
     * OTP settings.
     */
    protected const OTP_EXPIRY_MINUTES = 5;
    protected const OTP_MAX_ATTEMPTS = 3;
    protected const OTP_RESEND_COOLDOWN_SECONDS = 60;
    protected const OTP_MAX_RESENDS = 3;

    /**
     * Show Admin Login.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/AdminLogin');
    }

    /**
     * Handle Admin Login.
     */
    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:32'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if ($user->role !== 'admin') {
            throw ValidationException::withMessages([
                'email' => 'This account does not have administrator access.',
            ]);
        }

        if (config('admin_otp.enabled')) {
            $this->generateOtp($user);

            $request->session()->put('otp_user_id', $user->id);
            $request->session()->put('otp_remember', $request->boolean('remember'));

            // ✅ LOG — admin started login
            ActivityLog::log(
                'login_success',
                null,
                "Admin {$user->name} ({$user->email}) started login (OTP sent)"
            );

            return redirect()->route('admin.otp.show');
        }

        Auth::login($user, $request->boolean('remember'));

        $request->session()->regenerate();

        $user->update(['last_login_at' => now()]);

        // ✅ LOG — admin logged in directly (no OTP)
        ActivityLog::log(
            'login_success',
            null,
            "Admin {$user->name} ({$user->email}) logged in"
        );

        return redirect()->route('admin.dashboard');
    }

    /**
     * Show OTP verification page.
     */
    public function showOtp(Request $request): Response|RedirectResponse
    {
        $userId = $request->session()->get('otp_user_id');

        if (!$userId) {
            return redirect()->route('admin.login');
        }

        $user = User::find($userId);

        if (!$user) {
            $request->session()->forget('otp_user_id');
            return redirect()->route('admin.login');
        }

        return Inertia::render('Auth/AdminVerifyOtp', [
            'email' => $this->maskEmail($user->email),
            'expiresInSeconds' => self::OTP_EXPIRY_MINUTES * 60,
        ]);
    }

    /**
     * Verify OTP code.
     */
    public function verifyOtp(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $userId = $request->session()->get('otp_user_id');

        if (!$userId) {
            return redirect()->route('admin.login')
                ->withErrors(['code' => 'Session expired. Please login again.']);
        }

        $user = User::find($userId);

        if (!$user) {
            $request->session()->forget('otp_user_id');
            return redirect()->route('admin.login');
        }

        // ✅ FILTER BY PURPOSE — admin_login only
        $otpRecord = OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_ADMIN_LOGIN)
            ->active()
            ->latest()
            ->first();

        if (!$otpRecord) {
            return back()->withErrors([
                'code' => 'No active verification code found. Please request a new one.',
            ]);
        }

        if ($otpRecord->isExpired()) {
            $otpRecord->update(['used_at' => now()]);
            return back()->withErrors([
                'code' => 'This code has expired. Please request a new one.',
            ]);
        }

        if ($otpRecord->hasExceededAttempts(self::OTP_MAX_ATTEMPTS)) {
            $otpRecord->update(['used_at' => now()]);
            $request->session()->forget('otp_user_id');
            return redirect()->route('admin.login')
                ->withErrors(['email' => 'Too many failed attempts. Please login again.']);
        }

        if (!Hash::check($request->code, $otpRecord->code)) {
            $otpRecord->increment('attempts');
            $remaining = self::OTP_MAX_ATTEMPTS - $otpRecord->attempts;

            return back()->withErrors([
                'code' => "Invalid code. {$remaining} attempt(s) remaining.",
            ]);
        }

        $otpRecord->update(['used_at' => now()]);

        $remember = $request->session()->pull('otp_remember', false);
        Auth::login($user, $remember);

        $request->session()->regenerate();
        $request->session()->forget('otp_user_id');

        $user->update(['last_login_at' => now()]);

        // ✅ LOG — admin verified OTP
        ActivityLog::log(
            'login_success',
            null,
            "Admin {$user->name} ({$user->email}) verified OTP and logged in"
        );

        return redirect()->route('admin.dashboard');
    }

    /**
     * Resend OTP code.
     */
    public function resendOtp(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('otp_user_id');

        if (!$userId) {
            return redirect()->route('admin.login');
        }

        $user = User::find($userId);

        if (!$user) {
            $request->session()->forget('otp_user_id');
            return redirect()->route('admin.login');
        }

        // ✅ FILTER BY PURPOSE — admin_login only
        $latestOtp = OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_ADMIN_LOGIN)
            ->latest()
            ->first();

        if ($latestOtp && !$latestOtp->canResend(self::OTP_RESEND_COOLDOWN_SECONDS)) {
            $seconds = $latestOtp->secondsUntilResend(self::OTP_RESEND_COOLDOWN_SECONDS);
            return back()->withErrors([
                'code' => "Please wait {$seconds} second(s) before requesting a new code.",
            ]);
        }

        if ($latestOtp && $latestOtp->resend_count >= self::OTP_MAX_RESENDS) {
            $request->session()->forget('otp_user_id');
            return redirect()->route('admin.login')
                ->withErrors(['email' => 'Maximum resend attempts reached. Please login again.']);
        }

        // ✅ Mark old OTPs — admin_login only
        OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_ADMIN_LOGIN)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        $resendCount = ($latestOtp?->resend_count ?? 0) + 1;
        $this->generateOtp($user, $resendCount);

        return back()->with('success', 'A new verification code has been sent to your email.');
    }

    /**
     * Generate OTP, save sa DB, at send via email.
     */
    protected function generateOtp(User $user, int $resendCount = 0): string
    {
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // ✅ Mark previous active OTPs — admin_login only
        OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_ADMIN_LOGIN)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // ✅ Create with purpose
        OtpCode::create([
            'user_id' => $user->id,
            'code' => Hash::make($otp),
            'purpose' => OtpCode::PURPOSE_ADMIN_LOGIN,
            'expires_at' => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
            'attempts' => 0,
            'resend_count' => $resendCount,
            'last_sent_at' => now(),
        ]);

        Mail::to($user->email)->send(
            new OtpMail(
                otp: $otp,
                userName: $user->name ?? 'Administrator',
                expiryMinutes: self::OTP_EXPIRY_MINUTES,
            )
        );

        return $otp;
    }

    /**
     * Mask email for display.
     */
    protected function maskEmail(string $email): string
    {
        $parts = explode('@', $email);

        if (count($parts) !== 2) {
            return $email;
        }

        $name = $parts[0];
        $domain = $parts[1];

        if (strlen($name) <= 2) {
            return $name[0] . '*@' . $domain;
        }

        $masked = $name[0]
            . str_repeat('*', max(1, strlen($name) - 2))
            . $name[strlen($name) - 1];

        return $masked . '@' . $domain;
    }

    /**
     * Admin Logout.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // ✅ LOG — before logout
        if (Auth::check()) {
            $u = Auth::user();
            ActivityLog::log(
                'logout',
                null,
                "Admin {$u->name} ({$u->email}) logged out"
            );
        }

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}