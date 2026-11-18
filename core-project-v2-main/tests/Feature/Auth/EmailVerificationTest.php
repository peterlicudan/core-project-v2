<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * ALIBATON verifies sign-ins with OTP codes, so the default Breeze
     * email-verification URLs are intentionally not registered.
     */
    public function test_email_verification_routes_are_disabled(): void
    {
        $this->get('/verify-email')->assertNotFound();
    }
}
