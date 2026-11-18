<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\NotSameAsOldPassword;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    /**
     * Display the password reset view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]);
    }

    /**
     * Handle an incoming new password request.
     */
    public function store(Request $request): RedirectResponse
    {
        /*
        |--------------------------------------------------------------------------
        | LOOK UP USER FIRST (for old password comparison)
        |--------------------------------------------------------------------------
        */

        $user = User::where('email', $request->email)->first();
        $currentPasswordHash = $user?->password;

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => [
                'required',
                'confirmed',
                Rules\Password::defaults(),
                new NotSameAsOldPassword($currentPasswordHash),
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | RESET
        |--------------------------------------------------------------------------
        */

        $status = Password::reset(
            $request->only(
                'email',
                'password',
                'password_confirmation',
                'token'
            ),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        /*
        |--------------------------------------------------------------------------
        | SUCCESS — Role-based redirect with flash message
        |--------------------------------------------------------------------------
        */

        if ($status === Password::PASSWORD_RESET) {
            $user = User::where('email', $request->email)->first();
            $role = $user?->role;

            $loginRoute = match ($role) {
                'superadmin' => 'superadmin.login',
                'admin'      => 'admin.login',
                default      => 'login',
            };

            return redirect()
                ->route($loginRoute)
                ->with(
                    'status',
                    'Your password has been changed successfully. You can now log in with your new password.'
                );
        }

        /*
        |--------------------------------------------------------------------------
        | ERROR
        |--------------------------------------------------------------------------
        */

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}