<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    protected $fillable = [
        'id',  // ✅ ADDED FOR UUID
        'type',
        'notifiable_type',
        'notifiable_id',
        'data',
        'read_at',
    ];

    protected $casts = [
        // ✅ REMOVED: 'data' => 'array' — kasi may manual json_encode() sa controllers
        // Kung naka-cast as array, nag-do-doble yung encoding
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the notifiable entity that the notification belongs to.
     */
    public function notifiable()
    {
        return $this->morphTo();
    }

    /**
     * ✅ HELPER: Get decoded data as array
     *
     * Gamitin ito sa controllers para consistent:
     * $data = $notification->decoded_data;
     */
    public function getDecodedDataAttribute(): array
    {
        $data = $this->data;

        if (is_array($data)) {
            return $data;
        }

        if (is_string($data)) {
            $decoded = json_decode($data, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /**
     * Check if notification is read
     */
    public function isRead(): bool
    {
        return !is_null($this->read_at);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(): void
    {
        if (is_null($this->read_at)) {
            $this->update(['read_at' => now()]);
        }
    }

    /**
     * Get user ID from notifiable
     */
    public function getUserIdAttribute()
    {
        if ($this->notifiable_type === 'App\\Models\\User' || $this->notifiable_type === 'User') {
            return $this->notifiable_id;
        }
        return null;
    }
}
