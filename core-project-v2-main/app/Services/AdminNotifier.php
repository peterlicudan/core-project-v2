<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Writes in-app notifications to the shared `notifications` table.
 *
 * The admin bell (and the staff/user bell) read this table directly, so the
 * writes here are synchronous. We intentionally do NOT queue them: the app
 * runs with QUEUE_CONNECTION=database and may not have a worker running,
 * which is why queued notifications previously never appeared.
 */
class AdminNotifier
{
    /**
     * Notify every active admin.
     */
    public static function toAdmins(
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null,
        array $extra = []
    ): void {
        self::toRole('admin', $title, $message, $type, $link, $extra);
    }

    /**
     * Notify every active staff member.
     */
    public static function toStaff(
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null,
        array $extra = []
    ): void {
        self::toRole('staff', $title, $message, $type, $link, $extra);
    }

    /**
     * Notify every active user with the given role.
     */
    public static function toRole(
        string $role,
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null,
        array $extra = []
    ): void {
        User::query()
            ->where('role', $role)
            ->pluck('id')
            ->each(fn ($userId) => self::toUserId(
                $userId,
                $title,
                $message,
                $type,
                $link,
                $extra
            ));
    }

    /**
     * Notify a single user when a User model is available.
     */
    public static function toUser(
        ?User $user,
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null,
        array $extra = []
    ): void {
        if (! $user) {
            return;
        }

        self::toUserId($user->getKey(), $title, $message, $type, $link, $extra);
    }

    /**
     * Low-level writer for one recipient.
     */
    public static function toUserId(
        int|string|null $userId,
        string $title,
        string $message,
        string $type = 'info',
        ?string $link = null,
        array $extra = []
    ): void {
        if (! $userId) {
            return;
        }

        $type = in_array($type, ['success', 'warning', 'error', 'info'], true)
            ? $type
            : 'info';

        try {
            Notification::create([
                'id' => (string) Str::uuid(),
                'notifiable_type' => User::class,
                'notifiable_id' => $userId,
                'type' => 'admin_notification',
                'data' => json_encode(array_merge([
                    'title' => $title,
                    'message' => $message,
                    'type' => $type,
                    'link' => $link,
                    'redirect_url' => $link,
                    'from_user_id' => Auth::id(),
                ], $extra), JSON_UNESCAPED_UNICODE),
                'read_at' => null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
