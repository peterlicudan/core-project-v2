<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    /**
     * Display the Admin Dashboard.
     */
    public function index()
    {
        /*
        |--------------------------------------------------------------------------
        | ADMIN ACCESS
        |--------------------------------------------------------------------------
        */

        if (!Auth::check() || Auth::user()->role !== 'admin') {
            abort(403, 'Unauthorized.');
        }

        /*
        |--------------------------------------------------------------------------
        | STAFF COUNT
        |--------------------------------------------------------------------------
        |
        | This counts ONLY users whose role is exactly "staff".
        |
        | Example:
        |
        | users table:
        | admin  = 1
        | staff  = 5
        | client = 10
        |
        | Dashboard:
        | Staff Accounts = 5
        |
        */

        $staffCount = User::where('role', 'staff')->count();

        /*
        |--------------------------------------------------------------------------
        | CLIENT COUNT
        |--------------------------------------------------------------------------
        |
        | Included now because this is also user/account data.
        |
        */

        $clientCount = User::where('role', 'client')->count();

        /*
        |--------------------------------------------------------------------------
        | RETURN TO INERTIA
        |--------------------------------------------------------------------------
        */

        return Inertia::render('Admin/Dashboard', [
            'staffCount' => $staffCount,
            'clientCount' => $clientCount,
        ]);
    }
}
