<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckIdleSession
{
    private const NON_ACTIVITY_ROUTES = [
        'staff.heartbeat',
        'admin.notifications.list',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
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
                $user = Auth::user();
                $isAdmin = $user
                    && in_array(strtolower((string) $user->role), ['admin', 'superadmin'], true);

                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                $loginRoute = $isAdmin ? 'admin.login' : 'login';

                $reason = $absoluteExpired
                    ? 'Your session has reached its maximum length. Please sign in again.'
                    : 'You have been logged out due to inactivity.';

                /*
                |------------------------------------------------------------------
                | ✅ Inertia requests MUST receive redirect, NOT JSON
                |------------------------------------------------------------------
                */
                if ($request->header('X-Inertia')) {
                    return redirect()
                        ->route($loginRoute)
                        ->with('error', $reason);
                }

                /*
                |------------------------------------------------------------------
                | JSON clients (fetch, axios) get 401 so they can react
                |------------------------------------------------------------------
                */
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json(['message' => $reason], 401);
                }

                /*
                |------------------------------------------------------------------
                | Fallback: standard browser redirect
                |------------------------------------------------------------------
                */
                return redirect()
                    ->route($loginRoute)
                    ->with('error', $reason);
            }

            if (! in_array($request->route()?->getName(), self::NON_ACTIVITY_ROUTES, true)) {
                session(['last_activity_at' => $now]);
            }
        }

        return $next($request);
    }

    private function idleTimeout(): int
    {
        return (int) config('session.idle_timeout', 240);
    }

    private function maxLifetime(): int
    {
        return (int) config('session.max_lifetime', 28800);
    }
}