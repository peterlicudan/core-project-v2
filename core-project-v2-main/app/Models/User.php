<?php

namespace App\Models;

use App\Notifications\CustomVerifyEmail;
use App\Notifications\LoginOtpNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /*
    |--------------------------------------------------------------------------
    | MASS ASSIGNABLE
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'last_login_at',
        'delete_reason',

        // ✅ FIX ACCOUNT
        'fix_account_pin_hash',
        'fix_account_pin_expires_at',
        'fix_account_pin_attempts',
        'fix_requested_by',
        'fix_request_reason',

        // ✅ ADMIN INVITATION
        'admin_invitation_token',
        'admin_invitation_expires_at',
        'invited_by',
    ];

    /*
    |--------------------------------------------------------------------------
    | HIDDEN
    |--------------------------------------------------------------------------
    */

    protected $hidden = [
        'password',
        'remember_token',
        'login_otp_hash',
        'email_verification_pin_hash',

        // ✅ FIX ACCOUNT
        'fix_account_pin_hash',

        // ✅ ADMIN INVITATION
        'admin_invitation_token',
    ];

    /*
    |--------------------------------------------------------------------------
    | CASTS
    |--------------------------------------------------------------------------
    */

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'login_otp_expires_at' => 'datetime',
            'email_verification_pin_expires_at' => 'datetime',
            'password' => 'hashed',

            // ✅ FIX ACCOUNT
            'fix_account_pin_expires_at' => 'datetime',

            // ✅ ADMIN INVITATION
            'admin_invitation_expires_at' => 'datetime',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | EVERY-LOGIN STAFF AUTHENTICATION PIN
    |--------------------------------------------------------------------------
    */

    public function sendLoginOtp(): void
    {
        $loginPin = (string) random_int(100000, 999999);

        $this->login_otp_hash = Hash::make($loginPin);
        $this->login_otp_expires_at = now()->addMinutes(5);
        $this->save();

        $this->notify(new LoginOtpNotification($loginPin));
    }

    /*
    |--------------------------------------------------------------------------
    | CLEAR LOGIN PIN
    |--------------------------------------------------------------------------
    */

    public function clearLoginOtp(): void
    {
        $this->login_otp_hash = null;
        $this->login_otp_expires_at = null;
        $this->save();
    }

    /*
    |--------------------------------------------------------------------------
    | EMAIL VERIFICATION
    |--------------------------------------------------------------------------
    */

    public function sendEmailVerificationNotification(): void
    {
        $verificationPin = (string) random_int(100000, 999999);

        $this->email_verification_pin_hash = Hash::make($verificationPin);
        $this->email_verification_pin_expires_at = now()->addMinutes(5);

        if (array_key_exists('email_verification_pin_attempts', $this->getAttributes())) {
            $this->email_verification_pin_attempts = 0;
        }

        $this->save();

        $this->notify(new CustomVerifyEmail($verificationPin));
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENTS
    |--------------------------------------------------------------------------
    */

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'user_id', 'id');
    }

    /*
    |--------------------------------------------------------------------------
    | ROLE HELPERS
    |--------------------------------------------------------------------------
    */

    public function isSuperadmin(): bool
    {
        return $this->role === 'superadmin';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isClient(): bool
    {
        return $this->role === 'client';
    }

    /**
     * Determine whether the user is currently online.
     */
    public function isOnline(int $minutes = 2): bool
    {
        if (!$this->last_login_at) {
            return false;
        }

        return $this->last_login_at->greaterThanOrEqualTo(
            now()->subMinutes($minutes)
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FIX ACCOUNT HELPERS
    |--------------------------------------------------------------------------
    */

    public function sendFixAccountPin(User $superadmin, string $reason = ''): void
    {
        $fixPin = (string) random_int(100000, 999999);

        $this->fix_account_pin_hash = Hash::make($fixPin);
        $this->fix_account_pin_expires_at = now()->addMinutes(5);
        $this->fix_account_pin_attempts = 0;
        $this->fix_requested_by = $superadmin->id;
        $this->fix_request_reason = $reason;
        $this->save();

        $this->notify(
            new \App\Notifications\FixAccountPinNotification(
                $fixPin,
                $superadmin->name ?? 'Superadmin',
                $reason
            )
        );
    }

    public function clearFixAccountPin(): void
    {
        $this->fix_account_pin_hash = null;
        $this->fix_account_pin_expires_at = null;
        $this->fix_account_pin_attempts = 0;
        $this->fix_requested_by = null;
        $this->fix_request_reason = null;
        $this->save();
    }

    public function hasActiveFixPin(): bool
    {
        return !is_null($this->fix_account_pin_hash)
            && !is_null($this->fix_account_pin_expires_at)
            && now()->lessThan($this->fix_account_pin_expires_at);
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN INVITATION HELPERS
    |--------------------------------------------------------------------------
    */

    public function hasActiveInvitation(): bool
    {
        return !is_null($this->admin_invitation_token)
            && !is_null($this->admin_invitation_expires_at)
            && now()->lessThan($this->admin_invitation_expires_at);
    }

    public function clearInvitation(): void
    {
        $this->admin_invitation_token = null;
        $this->admin_invitation_expires_at = null;
        $this->save();
    }

    public function isInvitationExpired(): bool
    {
        return !is_null($this->admin_invitation_expires_at)
            && now()->greaterThan($this->admin_invitation_expires_at);
    }
}
