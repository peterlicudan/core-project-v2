<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class UserManagementController extends Controller
{
    /**
     * Display all staff accounts.
     */
    public function index()
    {
        $users = User::query()
            ->where('role', 'staff')
            ->latest()
            ->get([
                'id',
                'name',
                'email',
                'role',
                'email_verified_at',
                'created_at',
            ]);

        return Inertia::render('Admin/CreateUser', [
            'users' => $users,
        ]);
    }

    /**
     * Create a new staff account.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            /*
            |--------------------------------------------------------------------------
            | GMAIL ONLY
            |--------------------------------------------------------------------------
            */

            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'regex:/^[A-Za-z0-9._%+\-]+@gmail\.com$/i',
                'unique:users,email',
            ],

            /*
            |--------------------------------------------------------------------------
            | PASSWORD
            |--------------------------------------------------------------------------
            */

            'password' => [
                'required',
                'confirmed',
                Password::min(12)
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | GENERATE 6-DIGIT VERIFICATION PIN
        |--------------------------------------------------------------------------
        */

        $verificationPin = (string) random_int(
            100000,
            999999
        );

        /*
        |--------------------------------------------------------------------------
        | CREATE STAFF ACCOUNT
        |--------------------------------------------------------------------------
        */

        $user = User::create([
            'name' => trim(
                $validated['name']
            ),

            'email' => strtolower(
                trim($validated['email'])
            ),

            'password' => Hash::make(
                $validated['password']
            ),

            'role' => 'staff',

            /*
            |--------------------------------------------------------------------------
            | EMAIL STARTS UNVERIFIED
            |--------------------------------------------------------------------------
            */

            'email_verified_at' => null,

            /*
            |--------------------------------------------------------------------------
            | STORE HASHED PIN
            |--------------------------------------------------------------------------
            */

            'email_verification_pin_hash' => Hash::make(
                $verificationPin
            ),

            /*
            |--------------------------------------------------------------------------
            | PIN EXPIRES AFTER 15 MINUTES
            |--------------------------------------------------------------------------
            */

            'email_verification_pin_expires_at' =>
                now()->addMinutes(15),
        ]);

        /*
        |--------------------------------------------------------------------------
        | SEND VERIFICATION EMAIL
        |--------------------------------------------------------------------------
        |
        | The notification will be sent to:
        |
        | $user->email
        |
        | Since only Gmail is allowed above, the email will always be
        | delivered to the Gmail address entered by the admin.
        |
        */

        $user->notify(
            new \App\Notifications\CustomVerifyEmail(
                $verificationPin
            )
        );

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route('admin.client.accounts')
            ->with(
                'success',
                'Staff account created successfully. A 6-digit verification PIN has been sent to the staff Gmail address.'
            );
    }

    /**
     * Update a staff account.
     */
    public function update(
        Request $request,
        User $user
    ) {
        /*
        |--------------------------------------------------------------------------
        | ONLY STAFF CAN BE EDITED
        |--------------------------------------------------------------------------
        */

        if ($user->role !== 'staff') {
            abort(
                403,
                'Only staff accounts can be modified here.'
            );
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            /*
            |--------------------------------------------------------------------------
            | GMAIL ONLY
            |--------------------------------------------------------------------------
            */

            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'regex:/^[A-Za-z0-9._%+\-]+@gmail\.com$/i',
                'unique:users,email,' . $user->id,
            ],

            /*
            |--------------------------------------------------------------------------
            | PASSWORD
            |--------------------------------------------------------------------------
            |
            | Optional when editing.
            |
            */

            'password' => [
                'nullable',
                'confirmed',
                Password::min(12)
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ],
        ]);

        $oldEmail = $user->email;

        $newEmail = strtolower(
            trim($validated['email'])
        );

        /*
        |--------------------------------------------------------------------------
        | UPDATE BASIC INFORMATION
        |--------------------------------------------------------------------------
        */

        $user->name = trim(
            $validated['name']
        );

        $user->email = $newEmail;

        /*
        |--------------------------------------------------------------------------
        | KEEP STAFF ROLE
        |--------------------------------------------------------------------------
        */

        $user->role = 'staff';

        /*
        |--------------------------------------------------------------------------
        | UPDATE PASSWORD ONLY IF PROVIDED
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['password'])) {
            $user->password = Hash::make(
                $validated['password']
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK IF EMAIL CHANGED
        |--------------------------------------------------------------------------
        */

        $emailChanged =
            strtolower(trim($oldEmail)) !== $newEmail;

        /*
        |--------------------------------------------------------------------------
        | EMAIL CHANGED
        |--------------------------------------------------------------------------
        */

        if ($emailChanged) {

            /*
            |--------------------------------------------------------------------------
            | NEW EMAIL MUST BE VERIFIED AGAIN
            |--------------------------------------------------------------------------
            */

            $user->email_verified_at = null;

            /*
            |--------------------------------------------------------------------------
            | GENERATE NEW PIN
            |--------------------------------------------------------------------------
            */

            $verificationPin = (string) random_int(
                100000,
                999999
            );

            /*
            |--------------------------------------------------------------------------
            | STORE NEW HASHED PIN
            |--------------------------------------------------------------------------
            */

            $user->email_verification_pin_hash =
                Hash::make(
                    $verificationPin
                );

            /*
            |--------------------------------------------------------------------------
            | PIN EXPIRES AFTER 15 MINUTES
            |--------------------------------------------------------------------------
            */

            $user->email_verification_pin_expires_at =
                now()->addMinutes(15);

            /*
            |--------------------------------------------------------------------------
            | SAVE USER
            |--------------------------------------------------------------------------
            */

            $user->save();

            /*
            |--------------------------------------------------------------------------
            | SEND NEW PIN TO NEW GMAIL
            |--------------------------------------------------------------------------
            */

            $user->notify(
                new \App\Notifications\CustomVerifyEmail(
                    $verificationPin
                )
            );

        } else {

            /*
            |--------------------------------------------------------------------------
            | SAVE NORMAL UPDATE
            |--------------------------------------------------------------------------
            */

            $user->save();
        }

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route('admin.client.accounts')
            ->with(
                'success',
                $emailChanged
                    ? 'Staff account updated successfully. A new verification PIN has been sent to the new Gmail address.'
                    : 'Staff account updated successfully.'
            );
    }

    /**
     * Delete a staff account.
     */
    public function destroy(User $user)
    {
        /*
        |--------------------------------------------------------------------------
        | ONLY STAFF CAN BE DELETED
        |--------------------------------------------------------------------------
        */

        if ($user->role !== 'staff') {
            abort(
                403,
                'Only staff accounts can be deleted here.'
            );
        }

        $user->delete();

        return redirect()
            ->route('admin.client.accounts')
            ->with(
                'success',
                'Staff account deleted successfully.'
            );
    }
}
