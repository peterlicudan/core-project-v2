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

class SuperAdminStaffController extends Controller
{
    /**
     * List all staff accounts (active only).
     */
    public function index(): Response
    {
        $staff = User::where('role', 'staff')
            ->whereNull('deleted_at')
            ->latest('created_at')
            ->get()
            ->map(function (User $user) {
                return $this->mapStaff($user);
            })
            ->values();

        $staffQuery = User::where('role', 'staff')->whereNull('deleted_at');

        $archivedCount = User::withTrashed()
            ->where('role', 'staff')
            ->whereNotNull('deleted_at')
            ->count();

        $stats = [
            'total' => (clone $staffQuery)->count(),

            'active' => (clone $staffQuery)
                ->where(function ($q) {
                    $q->whereNotNull('last_login_at')
                      ->orWhereNotNull('email_verified_at');
                })
                ->count(),

            'pending' => (clone $staffQuery)
                ->whereNull('last_login_at')
                ->whereNull('email_verified_at')
                ->whereNotNull('admin_invitation_token')
                ->whereNotNull('admin_invitation_expires_at')
                ->where('admin_invitation_expires_at', '>', now())
                ->count(),

            'archived' => $archivedCount,
        ];

        return Inertia::render(
            'SuperAdmin/Staff/StaffManagement',
            [
                'staff' => $staff,
                'stats' => $stats,
            ]
        );
    }

    /**
     * List archived (soft-deleted) staff.
     */
    public function archived(): Response
    {
        $archivedStaff = User::withTrashed()
            ->where('role', 'staff')
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
            'SuperAdmin/Staff/ArchivedStaff',
            [
                'archivedStaff' => $archivedStaff,
                'total' => $archivedStaff->count(),
            ]
        );
    }

    /**
     * Restore an archived staff account.
     */
    public function restore(Request $request, int $id): RedirectResponse
    {
        $user = User::withTrashed()
            ->where('role', 'staff')
            ->whereNotNull('deleted_at')
            ->findOrFail($id);

        $user->deleted_at = null;
        $user->delete_reason = null;
        $user->save();

        // ✅ LOG
        ActivityLog::log(
            'staff_restored',
            $user,
            "Restored staff account: {$user->name} ({$user->email})"
        );

        return back()->with(
            'success',
            "{$user->name}'s staff account has been restored."
        );
    }

    /**
     * Invite a new staff member.
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
            if ($existing->role === 'staff') {
                if ($existing->deleted_at) {
                    throw ValidationException::withMessages([
                        'email' => 'An archived staff with this email exists. Restore or delete it first.',
                    ]);
                }

                if ($existing->last_login_at || $existing->email_verified_at) {
                    throw ValidationException::withMessages([
                        'email' => 'An active staff with this email already exists.',
                    ]);
                }

                throw ValidationException::withMessages([
                    'email' => 'This staff already has an account or invitation. Use Resend Invitation instead.',
                ]);
            }

            throw ValidationException::withMessages([
                'email' => 'A user with this email already exists.',
            ]);
        }

        $token = Str::random(64);

        $staff = DB::transaction(function () use ($validated, $email, $token) {
            return User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => Hash::make(Str::random(64)),
                'role' => 'staff',
                'admin_invitation_token' => hash('sha256', $token),
                'admin_invitation_expires_at' => now()->addHours(24),
                'invited_by' => Auth::id(),
            ]);
        });

        try {
            Mail::to($staff->email)->send(
                new AdminInvitationMail(
                    admin: $staff,
                    rawToken: $token,
                    invitedByName: Auth::user()->name,
                    expiresAt: $staff->admin_invitation_expires_at,
                )
            );
        } catch (Throwable $e) {
            report($e);
            $staff->delete();

            return back()->withErrors([
                'email' => 'The invitation email could not be sent. Please try again.',
            ]);
        }

        // ✅ LOG
        ActivityLog::log(
            'staff_invited',
            $staff,
            "Invited {$staff->name} ({$staff->email}) as staff"
        );

        return back()->with(
            'success',
            "Invitation sent to {$staff->email}. Link expires in 24 hours."
        );
    }

    /**
     * Resend invitation.
     */
    public function resend(Request $request, User $user): RedirectResponse
    {
        $this->ensureStaff($user);

        if ($user->last_login_at || $user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => 'This staff account is already active. No invitation is needed.',
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
            'staff_invitation_resent',
            $user,
            "Resent invitation to {$user->name} ({$user->email})"
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
        $this->ensureStaff($user);

        if ($user->last_login_at || $user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => 'Cannot cancel an invitation for an active staff.',
            ]);
        }

        $user->clearInvitation();
        $user->save();

        // ✅ LOG
        ActivityLog::log(
            'staff_invitation_cancelled',
            $user,
            "Cancelled invitation for {$user->name} ({$user->email})"
        );

        return back()->with(
            'success',
            "Invitation for {$user->email} cancelled."
        );
    }

    /**
     * Show full details of a single staff.
     */
    public function show(User $user): JsonResponse
    {
        $this->ensureStaff($user);

        return response()->json($this->mapStaff($user) + [
            'invited_by' => $user->invited_by,
        ]);
    }

    /**
     * Update staff status (activate/deactivate).
     */
    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        $this->ensureStaff($user);

        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages([
                'email' => 'You cannot change your own status.',
            ]);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        if ($validated['status'] === 'inactive') {
            $user->deleted_at = now();
            $user->delete_reason = $request->input('reason') ?? 'Deactivated by superadmin';
            $user->save();

            if (config('session.driver') === 'database') {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }

            // ✅ LOG
            ActivityLog::log(
                'staff_deactivated',
                $user,
                "Deactivated staff account: {$user->name}",
                ['reason' => $user->delete_reason]
            );

            return back()->with('success', "{$user->name}'s staff account has been deactivated.");
        }

        if ($user->trashed()) {
            $user->deleted_at = null;
            $user->delete_reason = null;
            $user->save();

            // ✅ LOG
            ActivityLog::log(
                'staff_reactivated',
                $user,
                "Reactivated staff account: {$user->name}"
            );

            return back()->with('success', "{$user->name}'s staff account has been reactivated.");
        }

        return back()->with('success', "{$user->name} is already active.");
    }

    /**
     * Delete staff (soft delete + force logout).
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->ensureStaff($user);

        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages([
                'email' => 'You cannot delete your own account.',
            ]);
        }

        $email = $user->email;

        $user->deleted_at = now();
        $user->delete_reason = $request->input('reason') ?? 'Deleted by superadmin';
        $user->save();

        if (config('session.driver') === 'database') {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        // ✅ LOG
        ActivityLog::log(
            'staff_deleted',
            $user,
            "Archived staff account: {$user->name} ({$email})",
            ['reason' => $user->delete_reason]
        );

        return back()->with(
            'success',
            "Staff account {$email} has been archived."
        );
    }

    /**
     * Permanently delete an archived staff account.
     */
    public function forceDelete(Request $request, int $id): RedirectResponse
    {
        $user = User::withTrashed()
            ->where('role', 'staff')
            ->whereNotNull('deleted_at')
            ->findOrFail($id);

        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages([
                'email' => 'You cannot delete your own account.',
            ]);
        }

        $email = $user->email;
        $name = $user->name;

        // ✅ LOG BEFORE DELETE (para may record pa)
        ActivityLog::log(
            'staff_force_deleted',
            $user,
            "Permanently deleted staff account: {$name} ({$email})"
        );

        $user->forceDelete();

        return back()->with(
            'success',
            "Staff account {$email} has been permanently deleted."
        );
    }

    /**
     * Map a User into staff data structure.
     */
    private function mapStaff(User $user): array
    {
        $hasActiveInvitation =
            !$user->last_login_at &&
            !$user->email_verified_at &&
            !empty($user->admin_invitation_token) &&
            $user->admin_invitation_expires_at &&
            $user->admin_invitation_expires_at->isFuture();

        if ($user->last_login_at || $user->email_verified_at) {
            $status = 'active';
            $statusLabel = 'Active';
        } elseif ($user->isInvitationExpired()) {
            $status = 'expired';
            $statusLabel = 'Invite Expired';
        } else {
            $status = 'pending';
            $statusLabel = 'Pending Invite';
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
     * Ensure the target account is a staff.
     */
    private function ensureStaff(User $user): void
    {
        if ($user->role !== 'staff') {
            abort(403, 'This action is only allowed for staff accounts.');
        }
    }
}