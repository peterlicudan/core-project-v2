<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Maximum number of failed login attempts.
     */
    private const MAX_ATTEMPTS = 5;

    /**
     * Lockout duration in seconds.
     *
     * 10 minutes = 600 seconds.
     */
    private const LOCKOUT_SECONDS = 600;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'email',
            ],

            'password' => [
                'required',
                'string',
            ],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        /*
        |--------------------------------------------------------------------------
        | CHECK IF LOGIN IS ALREADY LOCKED
        |--------------------------------------------------------------------------
        */

        $this->ensureIsNotRateLimited();

        /*
        |--------------------------------------------------------------------------
        | ATTEMPT LOGIN
        |--------------------------------------------------------------------------
        */

        if (
            !Auth::attempt(
                $this->only('email', 'password'),
                $this->boolean('remember')
            )
        ) {
            /*
            |--------------------------------------------------------------------------
            | FAILED LOGIN
            |--------------------------------------------------------------------------
            |
            | Count this failed attempt.
            |
            | The 600-second decay window means the rate limiter
            | remains active for 10 minutes once the limit is reached.
            |
            */

            RateLimiter::hit(
                $this->throttleKey(),
                self::LOCKOUT_SECONDS
            );

            /*
            |--------------------------------------------------------------------------
            | CHECK IF THIS WAS THE 5TH FAILED ATTEMPT
            |--------------------------------------------------------------------------
            */

            if (
                RateLimiter::tooManyAttempts(
                    $this->throttleKey(),
                    self::MAX_ATTEMPTS
                )
            ) {
                event(new Lockout($this));

                throw ValidationException::withMessages([
                    'email' =>
                        'Too many failed login attempts. Please try again in 10 minutes.',
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | NORMAL INVALID LOGIN
            |--------------------------------------------------------------------------
            |
            | Do NOT show remaining attempts.
            |
            */

            throw ValidationException::withMessages([
                'email' => 'Invalid email or password.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | SUCCESSFUL LOGIN
        |--------------------------------------------------------------------------
        |
        | Clear all failed attempts immediately.
        |
        */

        RateLimiter::clear(
            $this->throttleKey()
        );
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        /*
        |--------------------------------------------------------------------------
        | CHECK LOCKOUT
        |--------------------------------------------------------------------------
        */

        if (
            !RateLimiter::tooManyAttempts(
                $this->throttleKey(),
                self::MAX_ATTEMPTS
            )
        ) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | LOCKOUT EVENT
        |--------------------------------------------------------------------------
        */

        event(new Lockout($this));

        /*
        |--------------------------------------------------------------------------
        | GET REMAINING LOCKOUT TIME
        |--------------------------------------------------------------------------
        */

        $seconds = RateLimiter::availableIn(
            $this->throttleKey()
        );

        /*
        |--------------------------------------------------------------------------
        | SHOW SIMPLE LOCKOUT MESSAGE
        |--------------------------------------------------------------------------
        |
        | User requested that we do NOT show:
        |
        | "4 attempts remaining"
        |
        | or any attempt counter.
        |
        */

        throw ValidationException::withMessages([
            'email' =>
                'Too many failed login attempts. Please try again in '
                . ceil($seconds / 60)
                . ' minutes.',
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower(
                $this->string('email')
            ) . '|' . $this->ip()
        );
    }
}

