<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

class ActivityLog extends Model
{
    protected $fillable = [
        'actor_id',
        'actor_name',
        'actor_email',
        'actor_role',
        'target_user_id',
        'target_name',
        'target_email',
        'action',
        'action_label',
        'description',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /*
    |--------------------------------------------------------------------------
    | STATIC HELPER — LOG AN ACTIVITY
    |--------------------------------------------------------------------------
    |
    | Usage:
    |   ActivityLog::log('staff_invited', $staff, 'Invited new staff');
    |   ActivityLog::log('login_success');
    |   ActivityLog::log('admin_deleted', $admin, 'Deleted admin', ['reason' => '...']);
    |
    */

    public static function log(
        string $action,
        ?User $target = null,
        ?string $description = null,
        array $metadata = []
    ): self {
        $actor = Auth::user();

        return self::create([
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'actor_email' => $actor?->email,
            'actor_role' => $actor?->role,

            'target_user_id' => $target?->id,
            'target_name' => $target?->name,
            'target_email' => $target?->email,

            'action' => $action,
            'action_label' => self::getActionLabel($action),
            'description' => $description,
            'metadata' => $metadata ?: null,

            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ACTION LABEL MAPPER
    |--------------------------------------------------------------------------
    */

    public static function getActionLabel(string $action): string
    {
        $labels = [
            // User management
            'user_created' => 'User Created',
            'user_updated' => 'User Updated',
            'user_deleted' => 'User Deleted',
            'user_restored' => 'User Restored',
            'user_force_deleted' => 'User Permanently Deleted',
            'user_deactivated' => 'User Deactivated',
            'user_reactivated' => 'User Reactivated',

            // Staff
            'staff_invited' => 'Staff Invited',
            'staff_invitation_resent' => 'Staff Invitation Resent',
            'staff_invitation_cancelled' => 'Staff Invitation Cancelled',
            'staff_created' => 'Staff Created',
            'staff_updated' => 'Staff Updated',
            'staff_deleted' => 'Staff Deleted',
            'staff_restored' => 'Staff Restored',
            'staff_deactivated' => 'Staff Deactivated',
            'staff_reactivated' => 'Staff Reactivated',
            'staff_force_deleted' => 'Staff Permanently Deleted',

            // Admin
            'admin_invited' => 'Admin Invited',
            'admin_invitation_resent' => 'Admin Invitation Resent',
            'admin_invitation_cancelled' => 'Admin Invitation Cancelled',
            'admin_created' => 'Admin Created',
            'admin_updated' => 'Admin Updated',
            'admin_deleted' => 'Admin Deleted',
            'admin_restored' => 'Admin Restored',
            'admin_deactivated' => 'Admin Deactivated',
            'admin_reactivated' => 'Admin Reactivated',
            'admin_force_deleted' => 'Admin Permanently Deleted',

            // Auth
            'login_success' => 'Login Success',
            'login_failed' => 'Login Failed',
            'logout' => 'Logout',
            'password_reset' => 'Password Reset',
            'account_fixed' => 'Account Fixed',

            // System
            'system_settings_updated' => 'System Settings Updated',
        ];

        return $labels[$action] ?? ucwords(str_replace('_', ' ', $action));
    }
}