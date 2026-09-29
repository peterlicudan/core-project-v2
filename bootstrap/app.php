<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(
    basePath: dirname(__DIR__)
)
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )

    ->withMiddleware(function (Middleware $middleware): void {

        /*
        |--------------------------------------------------------------------------
        | Web Middleware
        |--------------------------------------------------------------------------
        */

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            // ✅ INALIS ang CheckIdleSession dito — hindi na global
        ]);


        /*
        |--------------------------------------------------------------------------
        | Middleware Aliases
        |--------------------------------------------------------------------------
        |
        | admin
        | -----
        | Allows only authenticated users whose role is "admin"
        | to access /admin/* routes.
        |
        | login.pin
        | ---------
        | Requires staff users to successfully enter their
        | authentication PIN before accessing staff routes.
        |
        | check.idle
        | ----------
        | Auto-logout after 10 minutes of inactivity.
        | Applied only to authenticated route groups.
        |
        */

        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,

            'login.pin' => \App\Http\Middleware\EnsureLoginPinVerified::class,

            'check.idle' => \App\Http\Middleware\CheckIdleSession::class,
        ]);
    })

    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })

    ->create();
