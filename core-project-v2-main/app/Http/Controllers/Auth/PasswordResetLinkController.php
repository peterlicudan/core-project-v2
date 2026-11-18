<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    public function create(Request $request): Response
    {
        $portal = $this->detectPortalFromUrl($request->path());

        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
            'portal' => $portal,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            'portal' => 'nullable|string|in:staff,admin,superadmin',
        ]);

        $portal = $request->input('portal')
            ?? $this->detectPortalFromUrl($request->path());

        $expectedRole = match ($portal) {
            'superadmin' => 'superadmin',
            'admin'      => 'admin',
            default      => 'staff',
        };

        $user = User::where('email', $request->email)->first();

        // ❌ Neutral error — hindi ipapaalam kung existing o wala
        if (!$user || $user->role !== $expectedRole) {
            throw ValidationException::withMessages([
                'email' => [
                    'We could not find an account with that email for this portal.',
                ],
            ]);
        }

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status == Password::RESET_LINK_SENT) {
            return back()->with('status', __($status));
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }

    private function detectPortalFromUrl(string $path): string
    {
        if (str_starts_with($path, 'superadmin')) {
            return 'superadmin';
        }

        if (str_starts_with($path, 'admin')) {
            return 'admin';
        }

        return 'staff';
    }
}