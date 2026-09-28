<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LogoutController extends Controller
{
    /**
     * Logout any authenticated user (admin or staff).
     */
    public function __invoke(Request $request): RedirectResponse
    {
        // ✅ Kunin muna yung role BAGO mag-logout
        $user = Auth::user();
        $wasAdmin = $user && $user->role === 'admin';

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // ✅ Kung admin, sa admin login; kung staff, sa regular login
        if ($wasAdmin) {
            return redirect()->route('admin.login');
        }

        return redirect()->route('login');
    }
}
