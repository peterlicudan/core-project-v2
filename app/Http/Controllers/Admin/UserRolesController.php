<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\StaffAccountCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserRolesController extends Controller
{
    /**
     * Display staff accounts and online status.
     */
    public function index(Request $request)
    {
        $onlineThreshold = Carbon::now()->subMinutes(2);

        $search = trim((string) $request->input('search', ''));

        $staffQuery = User::query()
            ->where('role', 'staff');

        /*
        |--------------------------------------------------------------------------
        | Search Staff
        |--------------------------------------------------------------------------
        */

        if ($search !== '') {
            $staffQuery->where(function ($query) use ($search) {
                $query
                    ->where('name', 'ILIKE', '%' . $search . '%')
                    ->orWhere('email', 'ILIKE', '%' . $search . '%');
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Staff List
        |--------------------------------------------------------------------------
        */

        $staff = $staffQuery
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'email',
                'role',
                'email_verified_at',
                'created_at',
                'last_login_at',
            ])
            ->map(function (User $user) use ($onlineThreshold) {

                $isOnline =
                    !is_null($user->last_login_at) &&
                    Carbon::parse($user->last_login_at)
                        ->greaterThanOrEqualTo($onlineThreshold);

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,

                    'email_verified_at' =>
                        $user->email_verified_at,

                    'created_at' =>
                        $user->created_at
                            ? Carbon::parse(
                                $user->created_at
                            )->toISOString()
                            : null,

                    'last_login_at' =>
                        $user->last_login_at
                            ? Carbon::parse(
                                $user->last_login_at
                            )->toISOString()
                            : null,

                    'is_online' => $isOnline,
                ];
            })
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Deleted Staff (Soft-Deleted)
        |--------------------------------------------------------------------------
        |
        | OnlyTrashed() returns ONLY soft-deleted records.
        | Regular queries automatically exclude them.
        |
        */

        $deletedUsers = User::onlyTrashed()
            ->where('role', 'staff')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'email',
                'deleted_at',
                'delete_reason',
            ])
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,

                    'deleted_at' =>
                        $user->deleted_at
                            ? Carbon::parse(
                                $user->deleted_at
                            )->toISOString()
                            : null,

                    'delete_reason' =>
                        $user->delete_reason,
                ];
            })
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Staff Statistics
        |--------------------------------------------------------------------------
        */

        $totalStaff = User::query()
            ->where('role', 'staff')
            ->count();

        $onlineStaff = User::query()
            ->where('role', 'staff')
            ->whereNotNull('last_login_at')
            ->where(
                'last_login_at',
                '>=',
                $onlineThreshold
            )
            ->count();

        $offlineStaff = max(
            0,
            $totalStaff - $onlineStaff
        );

        $neverLoggedIn = User::query()
            ->where('role', 'staff')
            ->whereNull('last_login_at')
            ->count();

        /*
        |--------------------------------------------------------------------------
        | Render User Roles Page
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'Admin/UserRoles/Index',
            [
                /*
                |--------------------------------------------------------------------------
                | React expects "users"
                |--------------------------------------------------------------------------
                */

                'users' => $staff,

                /*
                |--------------------------------------------------------------------------
                | Keep "staff" for compatibility
                |--------------------------------------------------------------------------
                */

                'staff' => $staff,

                /*
                |--------------------------------------------------------------------------
                | Deleted Staff (for Restore section)
                |--------------------------------------------------------------------------
                */

                'deletedUsers' => $deletedUsers,

                /*
                |--------------------------------------------------------------------------
                | Statistics
                |--------------------------------------------------------------------------
                */

                'stats' => [
                    'total' => $totalStaff,
                    'online' => $onlineStaff,
                    'offline' => $offlineStaff,
                    'never_logged_in' => $neverLoggedIn,
                    'visible' => $staff->count(),
                ],

                /*
                |--------------------------------------------------------------------------
                | Filters
                |--------------------------------------------------------------------------
                */

                'filters' => [
                    'search' => $search,
                ],

                /*
                |--------------------------------------------------------------------------
                | Online threshold
                |--------------------------------------------------------------------------
                */

                'online_threshold_minutes' => 2,

                /*
                |--------------------------------------------------------------------------
                | Server time
                |--------------------------------------------------------------------------
                */

                'server_time' =>
                    Carbon::now()->toISOString(),

                /*
                |--------------------------------------------------------------------------
                | Flash Messages
                |--------------------------------------------------------------------------
                */

                'flash' => [
                    'success' =>
                        session('success'),

                    'error' =>
                        session('error'),
                ],
            ]
        );
    }

    /**
     * Create Staff account and automatically send
     * account credentials through email.
     */
    public function store(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | Validate Staff Account
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'string',
                'email',
                'regex:/@gmail\.com$/i',
                'max:255',
                'unique:users,email',
            ],

            'password' => [
                'required',
                'string',
                'min:12',
                'confirmed',

                // At least one uppercase
                'regex:/[A-Z]/',

                // At least one lowercase
                'regex:/[a-z]/',

                // At least one number
                'regex:/[0-9]/',

                // At least one special character
                'regex:/[^A-Za-z0-9]/',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Keep Temporary Password
        |--------------------------------------------------------------------------
        |
        | We need the original password only so it can be included
        | in the account-created email.
        |
        | The User model already has:
        |
        | 'password' => 'hashed'
        |
        | Therefore we DO NOT use Hash::make() here.
        |
        */

        $temporaryPassword =
            $validated['password'];

        /*
        |--------------------------------------------------------------------------
        | Create Staff Account
        |--------------------------------------------------------------------------
        */

        $staff = User::create([
            'name' =>
                trim($validated['name']),

            'email' =>
                strtolower(
                    trim($validated['email'])
                ),

            'password' =>
                $temporaryPassword,

            'role' =>
                'staff',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Send Staff Account Email
        |--------------------------------------------------------------------------
        */

        try {

            $staff->notify(
                new StaffAccountCreated(
                    $temporaryPassword
                )
            );

            /*
            |--------------------------------------------------------------------------
            | Successful Account + Email
            |--------------------------------------------------------------------------
            */

            return back()->with(
                'success',
                'Staff account created successfully. An account email has been sent to '
                . $staff->email
                . '.'
            );

        } catch (\Throwable $e) {

            /*
            |--------------------------------------------------------------------------
            | Log Email Error
            |--------------------------------------------------------------------------
            */

            Log::error(
                'ALIBATON staff account email failed.',
                [
                    'staff_id' =>
                        $staff->id,

                    'staff_email' =>
                        $staff->email,

                    'error' =>
                        $e->getMessage(),

                    'exception' =>
                        get_class($e),
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | IMPORTANT
            |--------------------------------------------------------------------------
            |
            | The account has already been created.
            | We don't delete the Staff account just because
            | the email failed.
            |
            */

            return back()->with(
                'success',
                'Staff account was created, but the account email could not be sent. Please check the mail configuration.'
            );
        }
    }

    /**
     * Update Staff account.
     */
    public function update(
        Request $request,
        User $user
    ) {
        /*
        |--------------------------------------------------------------------------
        | Only Staff Accounts Can Be Updated
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user->role === 'staff',
            404
        );

        /*
        |--------------------------------------------------------------------------
        | Validate
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'string',
                'email',
                'regex:/@gmail\.com$/i',
                'max:255',

                Rule::unique(
                    'users',
                    'email'
                )->ignore($user->id),
            ],

            'password' => [
                'nullable',
                'string',
                'min:12',
                'confirmed',

                // Uppercase
                'regex:/[A-Z]/',

                // Lowercase
                'regex:/[a-z]/',

                // Number
                'regex:/[0-9]/',

                // Special character
                'regex:/[^A-Za-z0-9]/',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Update Basic Information
        |--------------------------------------------------------------------------
        */

        $user->name =
            trim($validated['name']);

        $user->email =
            strtolower(
                trim($validated['email'])
            );

        /*
        |--------------------------------------------------------------------------
        | Update Password
        |--------------------------------------------------------------------------
        */

        if (
            isset($validated['password']) &&
            $validated['password'] !== ''
        ) {
            /*
             * Hash::make() is correct here because we are
             * explicitly assigning a hashed password.
             */
            $user->password =
                Hash::make(
                    $validated['password']
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Save
        |--------------------------------------------------------------------------
        */

        $user->save();

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Staff account updated successfully.'
        );
    }

    /**
     * Delete Staff account.
     *
     * Because the User model uses the SoftDeletes trait,
     * this performs a SOFT DELETE:
     *
     * - The row stays in the database.
     * - deleted_at is set to the current timestamp.
     * - The account disappears from normal queries.
     * - The account CAN be restored later.
     *
     * A DELETE REASON is required.
     */
    public function destroy(Request $request, User $user)
    {
        /*
        |--------------------------------------------------------------------------
        | Only Staff Accounts Can Be Deleted
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user->role === 'staff',
            404
        );

        /*
        |--------------------------------------------------------------------------
        | Prevent Admin From Deleting Their Own Account
        |--------------------------------------------------------------------------
        */

        if (Auth::check() && $user->id === Auth::id()) {
            return back()->withErrors([
                'error' => 'You cannot delete your own account.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Reason
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'reason' => [
                'required',
                'string',
                'max:500',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Save Delete Reason Before Deleting
        |--------------------------------------------------------------------------
        */

        $user->delete_reason = trim($validated['reason']);
        $user->save();

        /*
        |--------------------------------------------------------------------------
        | Soft Delete
        |--------------------------------------------------------------------------
        */

        $user->delete();

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Staff account deleted successfully. You can restore it later if needed.'
        );
    }

    /**
     * Restore a soft-deleted Staff account.
     */
    public function restore($id)
    {
        /*
        |--------------------------------------------------------------------------
        | Find including soft-deleted records
        |--------------------------------------------------------------------------
        */

        $user = User::withTrashed()->findOrFail($id);

        /*
        |--------------------------------------------------------------------------
        | Only Staff Accounts Can Be Restored
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user->role === 'staff',
            404
        );

        /*
        |--------------------------------------------------------------------------
        | Restore
        |--------------------------------------------------------------------------
        */

        $user->restore();

        /*
        |--------------------------------------------------------------------------
        | Clear Delete Reason After Restore
        |--------------------------------------------------------------------------
        */

        $user->delete_reason = null;
        $user->save();

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Staff account restored successfully.'
        );
    }
}
