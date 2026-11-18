<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Hash;

class NotSameAsOldPassword implements ValidationRule
{
    /**
     * The user's current hashed password.
     */
    protected ?string $currentPassword;

    /**
     * Create a new rule instance.
     */
    public function __construct(?string $currentPassword)
    {
        $this->currentPassword = $currentPassword;
    }

    /**
     * Run the validation rule.
     */
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        if (
            $this->currentPassword &&
            Hash::check((string) $value, $this->currentPassword)
        ) {
            $fail(
                'Your new password cannot be the same as your previous password.'
            );
        }
    }
}