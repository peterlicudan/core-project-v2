<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckIdleSession
{
    /**
     * Idle timeout in seconds (20 minutes).
     */
   protected int $timeout = 5 * 60;

    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $lastActivity = session('last_activity_at');

            if ($lastActivity && (time() - $lastActivity) > $this->timeout) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                if ($request->header('X-Inertia')) {
                    return redirect()->route('login');
                }

                return redirect()
                    ->route('login')
                    ->with('error', 'You have been logged out due to inactivity.');
            }

            session(['last_activity_at' => time()]);
        }

        return $next($request);
    }
}
