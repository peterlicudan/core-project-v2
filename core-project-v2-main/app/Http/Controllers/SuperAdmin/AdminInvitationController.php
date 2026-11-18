<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminInvitationController extends Controller
{
    /**
     * Show invitation acceptance page.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $token = $request->query('token');

        if (!$token) {
            return redirect()->route('admin.login')
                ->withErrors([
                    'email' => 'Invalid invitation link.',
                ]);
        }

        $user = User::where(
            'admin_invitation_token',
            hash('sha256', $token)
        )
            ->where('role', 'admin')
            ->first();

        if (!$user) {
            return redirect()->route('admin.login')
                ->withErrors([
                    'email' => 'Invalid or already-used invitation link.',
                ]);
        }

        if ($user->isInvitationExpired()) {
            return redirect()->route('admin.login')
                ->withErrors([
                    'email' => 'This invitation has expired. Ask the Super Admin to resend it.',
                ]);
        }

        if ($user->email_verified_at) {
            return redirect()->route('admin.login')
                ->withErrors([
                    'email' => 'Invitation already accepted. Please log in.',
                ]);
        }

        return Inertia::render('Admin/Auth/AcceptInvite', [
            'token' => $token,
            'name' => $user->name,
            'email' => $user->email,
            'expiresAt' => $user->admin_invitation_expires_at?->format('M d, Y h:i A'),
        ]);
    }

    /**
     * Accept invitation, activate admin account, and auto-login.
     *
     * CRITICAL:
     * - Set ALL fields, then save ONCE (no partial state).
     * - Set session timestamps after login so CheckIdleSession doesn't
     *   immediately flag the fresh session as idle and return JSON 401
     *   (which crashes Inertia).
     * - Redirect to /admin/dashboard (not /admin/login) so the newly
     *   activated admin lands directly in their dashboard.
     */
    public function accept(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],

            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(12)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ]);

        $user = User::where(
            'admin_invitation_token',
            hash('sha256', $validated['token'])
        )
            ->where('role', 'admin')
            ->first();

        if (!$user) {
            return redirect()->route('admin.login')
                ->withErrors([
                    'email' => 'Invalid or already-used invitation token.',
                ]);
        }

        if ($user->isInvitationExpired()) {
            return redirect()->route('admin.login')
                ->withErrors([
                    'email' => 'Invitation expired. Ask the Super Admin to resend.',
                ]);
        }

        if ($user->email_verified_at) {
            return redirect()->route('admin.login')
                ->withErrors([
                    'email' => 'Invitation already accepted. Please log in.',
                ]);
        }

        /*
        |------------------------------------------------------------------
        | ✅ Set ALL fields, then save ONCE
        |------------------------------------------------------------------
        */
        $user->password = Hash::make($validated['password']);
        $user->email_verified_at = now();
        $user->admin_invitation_token = null;
        $user->admin_invitation_expires_at = null;
        $user->save();

        /*
        |------------------------------------------------------------------
        | ✅ AUTO-LOGIN — diretso sa admin dashboard
        |------------------------------------------------------------------
        */
        Auth::login($user, true);

        $request->session()->regenerate();

        /*
        |------------------------------------------------------------------
        | ✅ CRITICAL: Set session timestamps
        |------------------------------------------------------------------
        | Kung hindi natin i-set ang `session_started_at` at
        | `last_activity_at`, i-flag ng CheckIdleSession ang bagong
        | session as idle → returns JSON 401 → Inertia crash.
        */
        $request->session()->put('session_started_at', now()->timestamp);
        $request->session()->put('last_activity_at', now()->timestamp);

        $user->update(['last_login_at' => now()]);

        return redirect('/admin/dashboard')->with(
            'success',
            'Your admin account is now active! Welcome to ALIBATON.'
        );
    }
}