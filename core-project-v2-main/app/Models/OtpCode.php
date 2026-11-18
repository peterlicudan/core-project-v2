<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtpCode extends Model
{
    use HasFactory;

    /*
    |--------------------------------------------------------------------------
    | PURPOSE CONSTANTS
    |--------------------------------------------------------------------------
    */

    public const PURPOSE_ADMIN_LOGIN       = 'admin_login';
    public const PURPOSE_SUPERADMIN_LOGIN  = 'superadmin_login';
    public const PURPOSE_ADMIN_INVITATION  = 'admin_invitation';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'user_id',
        'code',
        'purpose',          // ✅ BAGO
        'expires_at',
        'attempts',
        'resend_count',
        'last_sent_at',
        'used_at',
    ];

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->isUsed();
    }

    public function hasExceededAttempts(int $max = 3): bool
    {
        return $this->attempts >= $max;
    }

    public function canResend(int $cooldownSeconds = 60): bool
    {
        if (!$this->last_sent_at) {
            return true;
        }

        return $this->last_sent_at->diffInSeconds(now()) >= $cooldownSeconds;
    }

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

    /*
    |--------------------------------------------------------------------------
    | ✅ BAGONG SCOPES — PURPOSE FILTERING
    |--------------------------------------------------------------------------
    */

    /**
     * Scope: filter by purpose (admin_login, superadmin_login, etc.)
     */
    public function scopeForPurpose($query, string $purpose)
    {
        return $query->where('purpose', $purpose);
    }

    /**
     * Scope: get the latest active OTP for a user + purpose combo.
     */
    public function scopeLatestActiveForPurpose($query, int $userId, string $purpose)
    {
        return $query
            ->forUser($userId)
            ->forPurpose($purpose)
            ->active()
            ->latest();
    }
}
