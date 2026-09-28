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
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | EVERY-LOGIN STAFF AUTHENTICATION PIN
    |--------------------------------------------------------------------------
    */

    public function sendLoginOtp(): void
    {
        $loginPin = (string) random_int(
            100000,
            999999
        );

        /*
        |----------------------------------------------------------------------
        | Store hashed PIN
        |----------------------------------------------------------------------
        */

        $this->login_otp_hash = Hash::make(
            $loginPin
        );

        /*
        |----------------------------------------------------------------------
        | Valid for 5 minutes
        |----------------------------------------------------------------------
        */

        $this->login_otp_expires_at = now()
            ->addMinutes(5);

        $this->save();

        /*
        |----------------------------------------------------------------------
        | Send PIN email
        |----------------------------------------------------------------------
        */

        $this->notify(
            new LoginOtpNotification(
                $loginPin
            )
        );
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
        /*
        |----------------------------------------------------------------------
        | Generate ONE 6-digit verification PIN
        |----------------------------------------------------------------------
        */

        $verificationPin = (string) random_int(
            100000,
            999999
        );

        /*
        |----------------------------------------------------------------------
        | Store hashed PIN
        |----------------------------------------------------------------------
        */

        $this->email_verification_pin_hash = Hash::make(
            $verificationPin
        );

        /*
        |----------------------------------------------------------------------
        | Valid for 5 minutes
        |----------------------------------------------------------------------
        */

        $this->email_verification_pin_expires_at = now()
            ->addMinutes(5);

        /*
        |----------------------------------------------------------------------
        | Reset attempts if column exists
        |----------------------------------------------------------------------
        */

        if (
            array_key_exists(
                'email_verification_pin_attempts',
                $this->getAttributes()
            )
        ) {
            $this->email_verification_pin_attempts = 0;
        }

        $this->save();

        /*
        |----------------------------------------------------------------------
        | Send the SAME PIN that was saved above
        |----------------------------------------------------------------------
        */

        $this->notify(
            new CustomVerifyEmail(
                $verificationPin
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENTS
    |--------------------------------------------------------------------------
    */

    public function payments(): HasMany
    {
        return $this->hasMany(
            Payment::class,
            'user_id',
            'id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | HELPER METHODS
    |--------------------------------------------------------------------------
    */

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
     *
     * Default threshold: 2 minutes.
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
}
