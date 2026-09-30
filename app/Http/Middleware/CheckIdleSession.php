<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckIdleSession
{
    /**
     * Background keep-alive calls must not count as user activity,
     * otherwise an idle tab with the page open never times out.
     */
    private const NON_ACTIVITY_ROUTES = [
        'staff.heartbeat',
        'admin.notifications.list',
    ];

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

            $now = time();
            $startedAt = (int) session('session_started_at', $now);

            session(['session_started_at' => $startedAt]);

            $lastActivity = (int) session('last_activity_at', $startedAt);

            $idleExpired = ($now - $lastActivity) > $this->idleTimeout();
            $absoluteExpired = $this->maxLifetime() > 0
                && ($now - $startedAt) > $this->maxLifetime();

            if ($idleExpired || $absoluteExpired) {
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

                $reason = $absoluteExpired
                    ? 'Your session has reached its maximum length. Please sign in again.'
                    : 'You have been logged out due to inactivity.';

                return redirect()
                    ->route($loginRoute)
                    ->with('error', $reason);
            }

            /*
            |--------------------------------------------------------------------------
            | Update last activity timestamp
            |--------------------------------------------------------------------------
            |
            | Background keep-alive requests (e.g. the staff heartbeat) are
            | deliberately excluded so an idle browser tab still times out.
            |
            */

            if (! in_array($request->route()?->getName(), self::NON_ACTIVITY_ROUTES, true)) {
                session(['last_activity_at' => $now]);
            }
        }

        return $next($request);
    }

    /**
     * Idle timeout in seconds.
     */
    private function idleTimeout(): int
    {
        return (int) config('session.idle_timeout', 240);
    }

    /**
     * Maximum session length in seconds, regardless of activity.
     */
    private function maxLifetime(): int
    {
        return (int) config('session.max_lifetime', 28800);
    }
}
