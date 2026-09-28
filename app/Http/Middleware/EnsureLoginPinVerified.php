<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLoginPinVerified
{
    /**
     * Handle an incoming request.
     */
    public function handle(
        Request $request,
        Closure $next
    ): Response {

        /*
        |--------------------------------------------------------------------------
        | ONLY APPLY TO STAFF
        |--------------------------------------------------------------------------
        */

        $user = $request->user();

        if (
            $user &&
            $user->role === 'staff'
        ) {

            /*
            |--------------------------------------------------------------------------
            | CHECK LOGIN PIN SESSION
            |--------------------------------------------------------------------------
            */

            if (
                $request->session()->get(
                    'login_pin_verified'
                ) !== true
            ) {

                /*
                |--------------------------------------------------------------------------
                | DO NOT LOOP ON VERIFY-OTP
                |--------------------------------------------------------------------------
                */

                if (
                    !$request->routeIs(
                        'verification.otp',
                        'verification.otp.verify',
                        'verification.otp.resend'
                    )
                ) {
                    return redirect()->route(
                        'verification.otp'
                    );
                }
            }
        }

        return $next($request);
    }
}
