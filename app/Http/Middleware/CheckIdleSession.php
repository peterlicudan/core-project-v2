<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckIdleSession
{
    /**
     * Idle timeout in seconds (10 minutes).
     */
    protected int $timeout = 10 * 60;

    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            /*
            |--------------------------------------------------------------------------
            | Skip asset and prefetch requests
            |--------------------------------------------------------------------------
            */

            if (
                $request->is('build/*')
                || $request->is('assets/*')
                || $request->is('storage/*')
                || $request->is('favicon.ico')
            ) {
                return $next($request);
            }

            $lastActivity = session('last_activity_at');

            if (
                $lastActivity
                && (time() - $lastActivity) > $this->timeout
            ) {
                /*
                |--------------------------------------------------------------------------
                | Determine login route based on user role
                |--------------------------------------------------------------------------
                */

                $user = Auth::user();
                $isAdmin = $user
                    && strtolower((string) $user->role) === 'admin';

                /*
                |--------------------------------------------------------------------------
                | Log the user out
                |--------------------------------------------------------------------------
                */

                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                /*
                |--------------------------------------------------------------------------
                | Redirect to the correct login page
                |--------------------------------------------------------------------------
                */

                $loginRoute = $isAdmin ? 'admin.login' : 'login';

                if ($request->header('X-Inertia')) {
                    return redirect()->route($loginRoute);
                }

                return redirect()
                    ->route($loginRoute)
                    ->with(
                        'error',
                        'You have been logged out due to inactivity.'
                    );
            }

            /*
            |--------------------------------------------------------------------------
            | Update last activity timestamp
            |--------------------------------------------------------------------------
            */

            session(['last_activity_at' => time()]);
        }

        return $next($request);
    }
}
