<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     *
     * NOTE:
     * Name and email should not be changed from Settings.
     * This existing profile route remains available for the
     * default Breeze Profile page.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Update user's password.
     *
     * Password requirements:
     * - Current password must be correct
     * - Maximum 12 characters
     * - Minimum 8 characters
     * - Must contain uppercase
     * - Must contain lowercase
     * - Must contain special character
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => [
                'required',
                'current_password',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'max:12',
                'different:current_password',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[^A-Za-z0-9]/',
            ],

            'password_confirmation' => [
                'required',
                'same:password',
            ],
        ], [
            'current_password.required' =>
                'Please enter your current password.',

            'current_password.current_password' =>
                'Your current password is incorrect.',

            'password.required' =>
                'Please enter a new password.',

            'password.min' =>
                'The new password must be at least 8 characters.',

            'password.max' =>
                'The new password must not exceed 12 characters.',

            'password.different' =>
                'Your new password must be different from your current password.',

            'password.regex' =>
                'The new password must contain uppercase, lowercase, and special characters.',

            'password_confirmation.same' =>
                'The password confirmation does not match.',
        ]);

        $user = $request->user();

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return Redirect::route('settings')->with(
            'success',
            'Your password has been changed successfully.'
        );
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
