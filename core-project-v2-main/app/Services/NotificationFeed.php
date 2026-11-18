<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

/**
 * Single source of truth for reading the `notifications` table.
 *
 * Two writers share this table:
 *  - App\Services\AdminNotifier (type = "admin_notification", data has title/message/link)
 *  - Laravel notifications (type = notification class, data has arbitrary keys)
 *
 * `DatabaseNotification` can read both because every row stores JSON in `data`.
 */
class NotificationFeed
{
    /**
     * Latest notifications for a user in the shape the UI expects.
     */
    public static function forUser(?User $user, int $limit = 30): array
    {
        if (! $user) {
            return [];
        }

        return DatabaseNotification::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->getKey())
            ->latest()
            ->take($limit)
            ->get()
            ->map(fn (DatabaseNotification $notification) => self::present($notification))
            ->values()
            ->all();
    }

    /**
     * Normalize one row while keeping the raw fields for older consumers.
     */
    public static function present(DatabaseNotification $notification): array
    {
        $data = $notification->data;

        if (is_string($data)) {
            $data = json_decode($data, true) ?: [];
        }

        if (! is_array($data)) {
            $data = [];
        }

        $rawType = (string) ($data['type'] ?? $notification->type ?? 'info');
        $category = self::category($rawType);
        $createdAt = $notification->created_at?->toIso8601String();

        return [
            // Raw fields — kept for components that still read them directly.
            'id' => $notification->id,
            'type' => $notification->type,
            'data' => $data,
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $createdAt,

            // Flattened fields — used by the admin bell and billing page.
            'rawType' => $rawType,
            'category' => $category,
            'title' => $data['title'] ?? $data['subject'] ?? self::humanize($rawType),
            'message' => $data['message'] ?? $data['body'] ?? $data['description'] ?? '',
            'link' => $data['link'] ?? $data['redirect_url'] ?? $data['url'] ?? null,
            'read' => $notification->read_at !== null,
            'createdAt' => $createdAt,
        ];
    }

    /**
     * Map a notification/event type to one of the bell's icon categories.
     */
    public static function category(string $type): string
    {
        $type = strtolower($type);

        if (in_array($type, ['success', 'warning', 'error', 'info'], true)) {
            return $type;
        }

        if (Str::contains($type, [
            'reject', 'fail', 'error', 'correction', 'revoke', 'declin',
        ])) {
            return 'error';
        }

        if (Str::contains($type, [
            'approve', 'paid', 'complete', 'success', 'grant', 'assign',
        ])) {
            return 'success';
        }

        if (Str::contains($type, [
            'warning', 'due', 'reminder', 'expir', 'request', 'pending',
        ])) {
            return 'warning';
        }

        return 'info';
    }

    /**
     * Turn a class name or snake_case type into a readable title.
     */
    public static function humanize(string $type): string
    {
        $aliases = [
            'admin_notification' => 'Notification',
            'document_access_request' => 'Document Access Request',
            'document_assigned' => 'Document Assigned',
            'payment_status' => 'Payment Update',
        ];

        $key = strtolower($type);

        if (isset($aliases[$key])) {
            return $aliases[$key];
        }

        if (str_contains($type, '\\')) {
            $type = class_basename($type);
            $type = preg_replace('/Notification$/', '', $type) ?: $type;
        }

        $type = str_replace(['-', '_'], ' ', $type);
        $type = preg_replace('/(?<!^)[A-Z]/', ' $0', (string) $type) ?: $type;

        return Str::title(trim($type)) ?: 'Notification';
    }

    /**
     * Mark one notification as read, scoped to the owner.
     */
    public static function markRead(User $user, string $id): bool
    {
        return DatabaseNotification::query()
            ->where('id', $id)
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->getKey())
            ->update(['read_at' => now()]) > 0;
    }

    /**
     * Mark every unread notification for the user as read.
     */
    public static function markAllRead(User $user): int
    {
        return DatabaseNotification::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->getKey())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
