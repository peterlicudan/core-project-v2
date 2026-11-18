<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
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

class SuperAdminAuthController extends Controller
{
    /**
     * OTP settings (same as admin for consistency).
     */
    protected const OTP_EXPIRY_MINUTES = 5;
    protected const OTP_MAX_ATTEMPTS = 3;
    protected const OTP_RESEND_COOLDOWN_SECONDS = 60;
    protected const OTP_MAX_RESENDS = 3;

    /**
     * Show Superadmin Login page.
     */
    public function create(): Response
    {
        return Inertia::render('SuperAdmin/Auth/Login');
    }

    /**
     * Handle login — validate credentials + role, send OTP.
     */
    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:64'],
        ]);

        // Validate credentials WITHOUT logging in
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        // ✅ Only superadmin allowed
        if ($user->role !== 'superadmin') {
            throw ValidationException::withMessages([
                'email' => 'This account does not have superadmin access.',
            ]);
        }

        // ✅ Check kung soft-deleted (dapat hindi)
        if ($user->trashed()) {
            throw ValidationException::withMessages([
                'email' => 'This account has been deactivated.',
            ]);
        }

        // Generate OTP
        $this->generateOtp($user);

        // Store user_id in session for OTP verification
        $request->session()->put('superadmin_otp_user_id', $user->id);
        $request->session()->put('superadmin_otp_remember', $request->boolean('remember'));

        return redirect()->route('superadmin.otp.show');
    }

    /**
     * Show OTP verification page.
     */
    public function showOtp(Request $request): Response|RedirectResponse
    {
        $userId = $request->session()->get('superadmin_otp_user_id');

        if (!$userId) {
            return redirect()->route('superadmin.login');
        }

        $user = User::find($userId);

        if (!$user || $user->role !== 'superadmin') {
            $request->session()->forget('superadmin_otp_user_id');
            return redirect()->route('superadmin.login');
        }

        return Inertia::render('SuperAdmin/Auth/VerifyOtp', [
            'email'            => $this->maskEmail($user->email),
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

        $userId = $request->session()->get('superadmin_otp_user_id');

        if (!$userId) {
            return redirect()->route('superadmin.login')
                ->withErrors(['code' => 'Session expired. Please login again.']);
        }

        $user = User::find($userId);

        if (!$user || $user->role !== 'superadmin') {
            $request->session()->forget('superadmin_otp_user_id');
            return redirect()->route('superadmin.login');
        }

        // ✅ Filter by purpose
        $otpRecord = OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_SUPERADMIN_LOGIN)
            ->active()
            ->latest()
            ->first();

        if (!$otpRecord) {
            return back()->withErrors([
                'code' => 'No active verification code found. Please request a new one.',
            ]);
        }

        // Check expiry
        if ($otpRecord->isExpired()) {
            $otpRecord->update(['used_at' => now()]);
            return back()->withErrors([
                'code' => 'This code has expired. Please request a new one.',
            ]);
        }

        // Check max attempts
        if ($otpRecord->hasExceededAttempts(self::OTP_MAX_ATTEMPTS)) {
            $otpRecord->update(['used_at' => now()]);
            $request->session()->forget('superadmin_otp_user_id');
            return redirect()->route('superadmin.login')
                ->withErrors(['email' => 'Too many failed attempts. Please login again.']);
        }

        // Verify code
        if (!Hash::check($request->code, $otpRecord->code)) {
            $otpRecord->increment('attempts');
            $remaining = self::OTP_MAX_ATTEMPTS - $otpRecord->attempts;

            return back()->withErrors([
                'code' => "Invalid code. {$remaining} attempt(s) remaining.",
            ]);
        }

        // ✅ Success — mark used
        $otpRecord->update(['used_at' => now()]);

        // Login
        $remember = $request->session()->pull('superadmin_otp_remember', false);
        Auth::login($user, $remember);

        $request->session()->regenerate();
        $request->session()->forget('superadmin_otp_user_id');

        $user->update(['last_login_at' => now()]);

        return redirect()->route('superadmin.dashboard');
    }

    /**
     * Resend OTP.
     */
    public function resendOtp(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('superadmin_otp_user_id');

        if (!$userId) {
            return redirect()->route('superadmin.login');
        }

        $user = User::find($userId);

        if (!$user || $user->role !== 'superadmin') {
            $request->session()->forget('superadmin_otp_user_id');
            return redirect()->route('superadmin.login');
        }

        $latestOtp = OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_SUPERADMIN_LOGIN)
            ->latest()
            ->first();

        // Cooldown check
        if ($latestOtp && !$latestOtp->canResend(self::OTP_RESEND_COOLDOWN_SECONDS)) {
            $seconds = $latestOtp->secondsUntilResend(self::OTP_RESEND_COOLDOWN_SECONDS);
            return back()->withErrors([
                'code' => "Please wait {$seconds} second(s) before requesting a new code.",
            ]);
        }

        // Max resends check
        if ($latestOtp && $latestOtp->resend_count >= self::OTP_MAX_RESENDS) {
            $request->session()->forget('superadmin_otp_user_id');
            return redirect()->route('superadmin.login')
                ->withErrors(['email' => 'Maximum resend attempts reached. Please login again.']);
        }

        // Mark old OTPs as used (only superadmin purpose)
        OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_SUPERADMIN_LOGIN)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // Generate new OTP
        $resendCount = ($latestOtp?->resend_count ?? 0) + 1;
        $this->generateOtp($user, $resendCount);

        return back()->with('success', 'A new verification code has been sent to your email.');
    }

    /**
     * Generate OTP, save sa DB, at send via email.
     */
    protected function generateOtp(User $user, int $resendCount = 0): string
    {
        // Generate 6-digit code
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Mark previous superadmin OTPs as used
        OtpCode::forUser($user->id)
            ->forPurpose(OtpCode::PURPOSE_SUPERADMIN_LOGIN)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // Create new OTP record
        OtpCode::create([
            'user_id'       => $user->id,
            'code'          => Hash::make($otp),
            'purpose'       => OtpCode::PURPOSE_SUPERADMIN_LOGIN,  // ✅
            'expires_at'    => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
            'attempts'      => 0,
            'resend_count'  => $resendCount,
            'last_sent_at'  => now(),
        ]);

        // Send OTP via email
        Mail::to($user->email)->send(
            new OtpMail(
                otp: $otp,
                userName: $user->name ?? 'Super Administrator',
                expiryMinutes: self::OTP_EXPIRY_MINUTES,
            )
        );

        return $otp;
    }

    /**
     * Mask email (j***n@example.com).
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
     * Logout.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('superadmin.login');
    }
}
