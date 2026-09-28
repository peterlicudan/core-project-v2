<?php

namespace App\Http\Controllers\Admin;

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
     *
     * Step 1: Validate credentials
     * Step 2: Generate OTP, save sa DB, send email
     * Step 3: Redirect sa OTP verification page
     */
    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:32'],
        ]);

        // Validate credentials WITHOUT logging in
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        // Check kung admin
        if ($user->role !== 'admin') {
            throw ValidationException::withMessages([
                'email' => 'This account does not have administrator access.',
            ]);
        }

        // Generate OTP
        $this->generateOtp($user);

        // Save user_id sa session para sa OTP verification step
        $request->session()->put('otp_user_id', $user->id);
        $request->session()->put('otp_remember', $request->boolean('remember'));

        // Redirect sa OTP verification page
        return redirect()->route('admin.otp.show');
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

        // ✅ FIX: AdminVerifyOtp (hindi VerifyOtp — staff version yun)
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

        // Get active OTP
        $otpRecord = OtpCode::forUser($user->id)
            ->active()
            ->latest()
            ->first();

        if (!$otpRecord) {
            return back()->withErrors([
                'code' => 'No active verification code found. Please request a new one.',
            ]);
        }

        // Check kung expired
        if ($otpRecord->isExpired()) {
            $otpRecord->update(['used_at' => now()]);
            return back()->withErrors([
                'code' => 'This code has expired. Please request a new one.',
            ]);
        }

        // Check kung max attempts reached
        if ($otpRecord->hasExceededAttempts(self::OTP_MAX_ATTEMPTS)) {
            $otpRecord->update(['used_at' => now()]);
            $request->session()->forget('otp_user_id');
            return redirect()->route('admin.login')
                ->withErrors(['email' => 'Too many failed attempts. Please login again.']);
        }

        // Verify code (hashed comparison)
        if (!Hash::check($request->code, $otpRecord->code)) {
            $otpRecord->increment('attempts');
            $remaining = self::OTP_MAX_ATTEMPTS - $otpRecord->attempts;

            return back()->withErrors([
                'code' => "Invalid code. {$remaining} attempt(s) remaining.",
            ]);
        }

        // ✅ Success — mark OTP as used
        $otpRecord->update(['used_at' => now()]);

        // Login the user
        $remember = $request->session()->pull('otp_remember', false);
        Auth::login($user, $remember);

        // Regenerate session
        $request->session()->regenerate();
        $request->session()->forget('otp_user_id');

        // Update last login
        $user->update(['last_login_at' => now()]);

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

        // Get latest OTP
        $latestOtp = OtpCode::forUser($user->id)->latest()->first();

        // Check cooldown (60 seconds)
        if ($latestOtp && !$latestOtp->canResend(self::OTP_RESEND_COOLDOWN_SECONDS)) {
            $seconds = $latestOtp->secondsUntilResend(self::OTP_RESEND_COOLDOWN_SECONDS);
            return back()->withErrors([
                'code' => "Please wait {$seconds} second(s) before requesting a new code.",
            ]);
        }

        // Check max resends
        if ($latestOtp && $latestOtp->resend_count >= self::OTP_MAX_RESENDS) {
            $request->session()->forget('otp_user_id');
            return redirect()->route('admin.login')
                ->withErrors(['email' => 'Maximum resend attempts reached. Please login again.']);
        }

        // Mark old OTPs as used
        OtpCode::forUser($user->id)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // Generate new OTP with resend count
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

        // Mark previous active OTPs as used
        OtpCode::forUser($user->id)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        // Create new OTP record
        OtpCode::create([
            'user_id' => $user->id,
            'code' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
            'attempts' => 0,
            'resend_count' => $resendCount,
            'last_sent_at' => now(),
        ]);

        // Send OTP via email
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
     * Mask email for display (e.g., j***n@example.com).
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
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
