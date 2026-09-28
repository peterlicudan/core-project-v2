<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtpCode extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'user_id',
        'code',
        'expires_at',
        'attempts',
        'resend_count',
        'last_sent_at',
        'used_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'expires_at' => 'datetime',
        'last_sent_at' => 'datetime',
        'used_at' => 'datetime',
        'attempts' => 'integer',
        'resend_count' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    /**
     * The user that owns this OTP.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    /**
     * Check if the OTP is expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if the OTP has been used.
     */
    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    /**
     * Check if the OTP is still valid (not expired, not used).
     */
    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->isUsed();
    }

    /**
     * Check if max attempts has been reached.
     */
    public function hasExceededAttempts(int $max = 3): bool
    {
        return $this->attempts >= $max;
    }

    /**
     * Check if user can resend (60 second cooldown).
     */
    public function canResend(int $cooldownSeconds = 60): bool
    {
        if (!$this->last_sent_at) {
            return true;
        }

        return $this->last_sent_at->diffInSeconds(now()) >= $cooldownSeconds;
    }

    /**
     * Seconds remaining until resend is allowed.
     */
    public function secondsUntilResend(int $cooldownSeconds = 60): int
    {
        if (!$this->last_sent_at) {
            return 0;
        }

        $elapsed = $this->last_sent_at->diffInSeconds(now());
        $remaining = $cooldownSeconds - $elapsed;

        return max(0, $remaining);
    }

    /*
    |--------------------------------------------------------------------------
    | SCOPES
    |--------------------------------------------------------------------------
    */

    /**
     * Scope: only active OTPs (not used, not expired).
     */
    public function scopeActive($query)
    {
        return $query
            ->whereNull('used_at')
            ->where('expires_at', '>', now());
    }

    /**
     * Scope: for a specific user.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
