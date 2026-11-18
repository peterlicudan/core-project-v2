<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Mail\AdminInvitationMail;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class SuperAdminAdminController extends Controller
{
    /**
     * List all admin accounts (active only).
     */
    public function index(): Response
    {
        $admins = User::where('role', 'admin')
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->get()
            ->map(function (User $user) {
                return $this->mapAdmin($user);
            })
            ->values();

        $adminQuery = User::where('role', 'admin')->whereNull('deleted_at');

        $archivedCount = User::withTrashed()
            ->where('role', 'admin')
            ->whereNotNull('deleted_at')
            ->count();

        $stats = [
            'total' => (clone $adminQuery)->count(),

            'active' => (clone $adminQuery)
                ->whereNotNull('email_verified_at')
                ->count(),

            'pending' => (clone $adminQuery)
                ->whereNull('email_verified_at')
                ->whereNotNull('admin_invitation_token')
                ->whereNotNull('admin_invitation_expires_at')
                ->where('admin_invitation_expires_at', '>', now())
                ->count(),

            'archived' => $archivedCount,
        ];

        return Inertia::render(
            'SuperAdmin/Admins/AdminManagement',
            [
                'admins' => $admins,
                'stats' => $stats,
            ]
        );
    }

    /**
     * List archived (soft-deleted) admins.
     */
    public function archived(): Response
    {
        $archivedAdmins = User::withTrashed()
            ->where('role', 'admin')
            ->whereNotNull('deleted_at')
            ->latest('deleted_at')
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at?->format('M d, Y'),
                    'deleted_at' => $user->deleted_at?->format('M d, Y h:i A'),
                    'deleted_ago' => $user->deleted_at?->diffForHumans(),
                    'delete_reason' => $user->delete_reason ?? 'Deleted by superadmin',
                    'last_login_at' => $user->last_login_at?->diffForHumans(),
                    'email_verified_at' => $user->email_verified_at?->format('M d, Y h:i A'),
                ];
            })
            ->values();

        return Inertia::render(
            'SuperAdmin/Admins/ArchivedAdmins',
            [
                'archivedAdmins' => $archivedAdmins,
                'total' => $archivedAdmins->count(),
            ]
        );
    }

    /**
     * Restore an archived admin.
     */
    public function restore(Request $request, int $id): RedirectResponse
    {
        $user = User::withTrashed()
            ->where('role', 'admin')
            ->whereNotNull('deleted_at')
            ->findOrFail($id);

        $user->deleted_at = null;
        $user->delete_reason = null;
        $user->save();

        // ✅ LOG
        ActivityLog::log(
            'admin_restored',
            $user,
            "Restored admin account: {$user->name} ({$user->email})"
        );

        return back()->with(
            'success',
            "{$user->name}'s admin account has been restored."
        );
    }

    /**
     * Send a new admin invitation.
     */
    public function invite(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));

        $existing = User::withTrashed()->where('email', $email)->first();

        if ($existing) {
            if ($existing->role === 'admin') {
                if ($existing->deleted_at) {
                    throw ValidationException::withMessages([
                        'email' => 'An archived admin with this email exists. Restore or delete it first.',
                    ]);
                }

                if ($existing->email_verified_at) {
                    throw ValidationException::withMessages([
                        'email' => 'An active admin with this email already exists.',
                    ]);
                }

                throw ValidationException::withMessages([
                    'email' => 'This admin already has an account or invitation. Use Resend Invitation instead.',
                ]);
            }

            throw ValidationException::withMessages([
                'email' => 'A user with this email already exists.',
            ]);
        }

        $token = Str::random(64);

        $admin = DB::transaction(function () use ($validated, $email, $token) {
            return User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => Hash::make(Str::random(64)),
                'role' => 'admin',
                'admin_invitation_token' => hash('sha256', $token),
                'admin_invitation_expires_at' => now()->addHours(24),
                'invited_by' => Auth::id(),
            ]);
        });

        try {
            Mail::to($admin->email)->send(
                new AdminInvitationMail(
                    admin: $admin,
                    rawToken: $token,
                    invitedByName: Auth::user()->name,
                    expiresAt: $admin->admin_invitation_expires_at,
                )
            );
        } catch (Throwable $e) {
            report($e);
            $admin->delete();

            return back()->withErrors([
                'email' => 'The invitation email could not be sent. Please try again.',
            ]);
        }

        // ✅ LOG
        ActivityLog::log(
            'admin_invited',
            $admin,
            "Invited {$admin->name} ({$admin->email}) as admin"
        );

        return back()->with(
            'success',
            "Invitation sent to {$admin->email}. Link expires in 24 hours."
        );
    }

    /**
     * Resend an admin invitation.
     */
    public function resend(Request $request, User $user): RedirectResponse
    {
        $this->ensureAdmin($user);

        if ($user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => 'This admin account is already active. No invitation is needed.',
            ]);
        }

        $token = Str::random(64);

        $user->update([
            'admin_invitation_token' => hash('sha256', $token),
            'admin_invitation_expires_at' => now()->addHours(24),
            'invited_by' => Auth::id(),
        ]);

        try {
            Mail::to($user->email)->send(
                new AdminInvitationMail(
                    admin: $user,
                    rawToken: $token,
                    invitedByName: Auth::user()->name,
                    expiresAt: $user->admin_invitation_expires_at,
                )
            );
        } catch (Throwable $e) {
            report($e);

            return back()->withErrors([
                'email' => 'The invitation email could not be sent. Please try again.',
            ]);
        }

        // ✅ LOG
        ActivityLog::log(
            'admin_invitation_resent',
            $user,
            "Resent admin invitation to {$user->name} ({$user->email})"
        );

        return back()->with(
            'success',
            "Invitation resent to {$user->email}."
        );
    }

    /**
     * Cancel a pending invitation.
     */
    public function cancelInvite(Request $request, User $user): RedirectResponse
    {
        $this->ensureAdmin($user);

        if ($user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => 'Cannot cancel an invitation for an active admin.',
            ]);
        }

        $user->clearInvitation();
        $user->save();

        // ✅ LOG
        ActivityLog::log(
            'admin_invitation_cancelled',
            $user,
            "Cancelled admin invitation for {$user->name} ({$user->email})"
        );

        return back()->with(
            'success',
            "Invitation for {$user->email} cancelled."
        );
    }

    /**
     * Show full details of a single admin.
     */
    public function show(User $user): JsonResponse
    {
        $this->ensureAdmin($user);

        return response()->json($this->mapAdmin($user) + [
            'invited_by' => $user->invited_by,
        ]);
    }

    /**
     * Deactivate an admin (soft delete + force logout).
     */
    public function deactivate(Request $request, User $user): RedirectResponse
    {
        $this->ensureAdmin($user);

        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages([
                'email' => 'You cannot deactivate your own account.',
            ]);
        }

        $user->deleted_at = now();
        $user->delete_reason = $request->input('reason') ?? 'Deactivated by superadmin';
        $user->save();

        if (config('session.driver') === 'database') {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        // ✅ LOG
        ActivityLog::log(
            'admin_deactivated',
            $user,
            "Deactivated admin account: {$user->name}",
            ['reason' => $user->delete_reason]
        );

        return back()->with(
            'success',
            "{$user->name}'s admin account has been deactivated. It is now in the archive."
        );
    }

    /**
     * Delete an admin (soft delete + force logout).
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->ensureAdmin($user);

        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages([
                'email' => 'You cannot delete your own account.',
            ]);
        }

        $email = $user->email;
        $name = $user->name;

        $user->deleted_at = now();
        $user->delete_reason = $request->input('reason') ?? 'Deleted by superadmin';
        $user->save();

        if (config('session.driver') === 'database') {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        // ✅ LOG
        ActivityLog::log(
            'admin_deleted',
            $user,
            "Archived admin account: {$name} ({$email})",
            ['reason' => $user->delete_reason]
        );

        return back()->with(
            'success',
            "Admin account {$email} has been archived."
        );
    }

    /**
     * Permanently delete an archived admin.
     */
    public function forceDelete(Request $request, int $id): RedirectResponse
    {
        $user = User::withTrashed()
            ->where('role', 'admin')
            ->whereNotNull('deleted_at')
            ->findOrFail($id);

        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages([
                'email' => 'You cannot delete your own account.',
            ]);
        }

        $email = $user->email;
        $name = $user->name;

        // ✅ LOG BEFORE DELETE
        ActivityLog::log(
            'admin_force_deleted',
            $user,
            "Permanently deleted admin account: {$name} ({$email})"
        );

        $user->forceDelete();

        return back()->with(
            'success',
            "Admin account {$email} has been permanently deleted."
        );
    }

    /**
     * Map a User into admin data structure.
     */
    private function mapAdmin(User $user): array
    {
        $hasActiveInvitation =
            !$user->email_verified_at &&
            !empty($user->admin_invitation_token) &&
            $user->admin_invitation_expires_at &&
            $user->admin_invitation_expires_at->isFuture();

        if ($user->email_verified_at) {
            $status = 'active';
            $statusLabel = 'Active';
        } elseif ($hasActiveInvitation) {
            $status = 'pending';
            $statusLabel = 'Pending Invite';
        } elseif ($user->isInvitationExpired()) {
            $status = 'expired';
            $statusLabel = 'Invite Expired';
        } else {
            $status = 'unverified';
            $statusLabel = 'Unverified';
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $status,
            'status_label' => $statusLabel,
            'email_verified_at' => $user->email_verified_at?->format('M d, Y h:i A'),
            'invitation_expires_at' => $user->admin_invitation_expires_at?->format('M d, Y h:i A'),
            'invitation_expires_in' => $hasActiveInvitation
                ? $user->admin_invitation_expires_at->diffForHumans()
                : null,
            'invited_by' => $user->invited_by,
            'created_at' => $user->created_at?->format('M d, Y'),
            'last_login_at' => $user->last_login_at?->diffForHumans(),
        ];
    }

    /**
     * Ensure the target account is an admin.
     */
    private function ensureAdmin(User $user): void
    {
        if ($user->role !== 'admin') {
            abort(403, 'This action is only allowed for admin accounts.');
        }
    }
}