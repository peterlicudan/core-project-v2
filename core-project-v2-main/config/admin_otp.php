<?php

return [

    /*
    |--------------------------------------------------------------------------
    | ADMIN LOGIN OTP
    |--------------------------------------------------------------------------
    |
    | Controls the second-factor email code required by AdminAuthController
    | when signing in through /admin/login.
    |
    | When disabled, a valid admin email + password logs straight into the
    | admin dashboard. The OTP routes and OtpCode model are left untouched,
    | so this can be flipped back on at any time.
    |
    */

    'enabled' => env('ADMIN_OTP_ENABLED', true),

];
