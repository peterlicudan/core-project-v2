<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Compliance;
use App\Models\Contract;
use App\Models\ContractPermit;
use App\Models\Document;
use App\Models\DocumentAccessRequest;
use App\Models\Invoice;
use App\Models\JobOrder;
use App\Models\Payment;
use App\Models\Report;
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

    /**
     * ✅ AUDIT LOG — Activities ng isang staff sa lahat ng modules.
     *
     * Kapag pinindot ng admin ang staff account (hal. "Mark Justin"),
     * ito ang ipapakita: timeline ng mga ginawa niya sa Billing,
     * Payments, Job Orders, Contracts, Permits, Compliance,
     * Documents, Reports, at Document Access Requests.
     */
    public function activity(Request $request, User $user)
    {
        /*
        |--------------------------------------------------------------------------
        | Staff Accounts Only
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user->role === 'staff',
            404
        );

        $activities = [];

        $push = function (
            string $id,
            string $module,
            string $action,
            string $title,
            string $description,
            ?string $reference,
            ?string $time,
            string $type = 'info'
        ) use (&$activities) {
            if (!$time) {
                return;
            }

            $activities[] = [
                'id' => $id,
                'module' => $module,
                'action' => $action,
                'title' => $title,
                'description' => $description,
                'reference' => $reference,
                'time' => Carbon::parse($time)->toIso8601String(),
                'type' => $type,
            ];
        };

        /*
        |--------------------------------------------------------------------------
        | 1. INVOICES / BILLING (user_id)
        |--------------------------------------------------------------------------
        */

        Invoice::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at')
            ->get([
                'id',
                'billing_number',
                'number',
                'client',
                'amount',
                'status',
                'due_date',
                'created_at',
                'approved_at',
                'rejected_at',
            ])
            ->each(function (Invoice $invoice) use ($push) {
                $ref = $invoice->billing_number
                    ?: $invoice->number
                    ?: 'INV #' . $invoice->id;

                $type = $invoice->status === 'Approved'
                    ? 'success'
                    : ($invoice->status === 'Rejected' ? 'error' : 'warning');

                $push(
                    'invoice-' . $invoice->id . '-created',
                    'billing',
                    'created',
                    'Created Billing Record',
                    $invoice->client
                        . ' — ₱' . number_format((float) $invoice->amount, 2)
                        . ' (' . $invoice->status . ')',
                    $ref,
                    $invoice->created_at,
                    $type
                );

                if ($invoice->approved_at) {
                    $push(
                        'invoice-' . $invoice->id . '-approved',
                        'billing',
                        'approved',
                        'Billing Approved',
                        'Na-approve ng admin — ' . $ref
                            . ' (' . $invoice->client . ')',
                        $ref,
                        $invoice->approved_at,
                        'success'
                    );
                }

                if ($invoice->rejected_at) {
                    $push(
                        'invoice-' . $invoice->id . '-rejected',
                        'billing',
                        'rejected',
                        'Billing Rejected',
                        'Na-reject ng admin — ' . $ref
                            . ' (' . $invoice->client . ')',
                        $ref,
                        $invoice->rejected_at,
                        'error'
                    );
                }
            });

        /*
        |--------------------------------------------------------------------------
        | 2. PAYMENTS (user_id)
        |--------------------------------------------------------------------------
        */

        Payment::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at')
            ->get([
                'id',
                'receipt_number',
                'receipt',
                'billing_number',
                'client',
                'amount',
                'status',
                'payment_date',
                'created_at',
                'edited_at',
            ])
            ->each(function (Payment $payment) use ($push) {
                $ref = $payment->receipt_number
                    ?: $payment->receipt
                    ?: 'PAY-' . str_pad((string) $payment->id, 4, '0', STR_PAD_LEFT);

                $type = $payment->status === 'Fully Paid'
                    ? 'success'
                    : ($payment->status === 'Rejected' ? 'error' : 'warning');

                $push(
                    'payment-' . $payment->id . '-created',
                    'payment',
                    'created',
                    'Payment Record Created',
                    $payment->client
                        . ' — ₱' . number_format((float) $payment->amount, 2)
                        . ' (' . $payment->status . ')',
                    $ref,
                    $payment->created_at,
                    $type
                );

                if ($payment->payment_date) {
                    $push(
                        'payment-' . $payment->id . '-recorded',
                        'payment',
                        'recorded',
                        'Payment Received',
                        $payment->client
                            . ' — ₱' . number_format((float) $payment->amount, 2),
                        $ref,
                        $payment->payment_date,
                        'success'
                    );
                }

                if ($payment->edited_at) {
                    $push(
                        'payment-' . $payment->id . '-edited',
                        'payment',
                        'updated',
                        'Payment Updated',
                        'In-update ang payment — ' . $ref
                            . ' (' . $payment->client . ')',
                        $ref,
                        $payment->edited_at,
                        'info'
                    );
                }
            });

        /*
        |--------------------------------------------------------------------------
        | 3. JOB ORDERS (user_id)
        |--------------------------------------------------------------------------
        */

        JobOrder::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at')
            ->get([
                'id',
                'number',
                'client',
                'status',
                'created_at',
                'approved_at',
            ])
            ->each(function (JobOrder $jobOrder) use ($push) {
                $ref = $jobOrder->number ?: 'JO #' . $jobOrder->id;

                $type = $jobOrder->status === 'Approved'
                    ? 'success'
                    : ($jobOrder->status === 'Rejected' ? 'error' : 'warning');

                $push(
                    'joborder-' . $jobOrder->id . '-created',
                    'job_order',
                    'created',
                    'Job Order Created',
                    $jobOrder->client
                        . ' — ' . $ref
                        . ' (' . $jobOrder->status . ')',
                    $ref,
                    $jobOrder->created_at,
                    $type
                );

                if ($jobOrder->approved_at) {
                    $push(
                        'joborder-' . $jobOrder->id . '-approved',
                        'job_order',
                        'approved',
                        'Job Order Approved',
                        'Na-approve ng admin — ' . $ref,
                        $ref,
                        $jobOrder->approved_at,
                        'success'
                    );
                }
            });

        /*
        |--------------------------------------------------------------------------
        | 4. CONTRACTS (created_by / submitted_by / reviewed_by / assigned_to)
        |--------------------------------------------------------------------------
        */

        Contract::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('created_by', $user->id)
                    ->orWhere('submitted_by', $user->id)
                    ->orWhere('reviewed_by', $user->id)
                    ->orWhere('assigned_to', $user->id);
            })
            ->orderBy('created_at')
            ->get([
                'id',
                'contract_no',
                'client',
                'status',
                'created_by',
                'created_at',
                'submitted_by',
                'submitted_at',
                'reviewed_by',
                'reviewed_at',
            ])
            ->each(function (Contract $contract) use ($user, $push) {
                $ref = $contract->contract_no
                    ?: 'Contract #' . $contract->id;

                if ((int) $contract->created_by === (int) $user->id) {
                    $push(
                        'contract-' . $contract->id . '-created',
                        'contract',
                        'created',
                        'Contract Created',
                        $contract->client
                            . ' — ' . $ref
                            . ' (' . $contract->status . ')',
                        $ref,
                        $contract->created_at,
                        'warning'
                    );
                }

                if (
                    (int) $contract->submitted_by === (int) $user->id &&
                    $contract->submitted_at
                ) {
                    $push(
                        'contract-' . $contract->id . '-submitted',
                        'contract',
                        'submitted',
                        'Contract Submitted for Review',
                        $contract->client . ' — ' . $ref,
                        $ref,
                        $contract->submitted_at,
                        'info'
                    );
                }

                if (
                    (int) $contract->reviewed_by === (int) $user->id &&
                    $contract->reviewed_at
                ) {
                    $push(
                        'contract-' . $contract->id . '-reviewed',
                        'contract',
                        'reviewed',
                        'Contract Reviewed',
                        $contract->client . ' — ' . $ref,
                        $ref,
                        $contract->reviewed_at,
                        'info'
                    );
                }
            });

        /*
        |--------------------------------------------------------------------------
        | 5. CONTRACT PERMITS (created_by / submitted_by / reviewed_by)
        |--------------------------------------------------------------------------
        */

        ContractPermit::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('created_by', $user->id)
                    ->orWhere('submitted_by', $user->id)
                    ->orWhere('reviewed_by', $user->id)
                    ->orWhere('assigned_to', $user->id);
            })
            ->orderBy('created_at')
            ->get([
                'id',
                'contract_number',
                'contract_no',
                'permit_number',
                'reference_number',
                'client',
                'status',
                'created_by',
                'created_at',
                'submitted_by',
                'submitted_at',
                'reviewed_by',
                'reviewed_at',
            ])
            ->each(function (ContractPermit $permit) use ($user, $push) {
                $ref = $permit->contract_number
                    ?: $permit->contract_no
                    ?: $permit->permit_number
                    ?: $permit->reference_number
                    ?: 'Permit #' . $permit->id;

                if ((int) $permit->created_by === (int) $user->id) {
                    $push(
                        'permit-' . $permit->id . '-created',
                        'permit',
                        'created',
                        'Permit Record Created',
                        $permit->client
                            . ' — ' . $ref
                            . ' (' . $permit->status . ')',
                        $ref,
                        $permit->created_at,
                        'warning'
                    );
                }

                if (
                    (int) $permit->submitted_by === (int) $user->id &&
                    $permit->submitted_at
                ) {
                    $push(
                        'permit-' . $permit->id . '-submitted',
                        'permit',
                        'submitted',
                        'Permit Submitted for Review',
                        $permit->client . ' — ' . $ref,
                        $ref,
                        $permit->submitted_at,
                        'info'
                    );
                }

                if (
                    (int) $permit->reviewed_by === (int) $user->id &&
                    $permit->reviewed_at
                ) {
                    $push(
                        'permit-' . $permit->id . '-reviewed',
                        'permit',
                        'reviewed',
                        'Permit Reviewed',
                        $permit->client . ' — ' . $ref,
                        $ref,
                        $permit->reviewed_at,
                        'info'
                    );
                }
            });

        /*
        |--------------------------------------------------------------------------
        | 6. COMPLIANCE (created_by / assigned_to)
        |--------------------------------------------------------------------------
        */

        Compliance::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('created_by', $user->id)
                    ->orWhere('assigned_to', $user->id);
            })
            ->orderBy('created_at')
            ->get([
                'id',
                'title',
                'reference_number',
                'status',
                'created_by',
                'created_at',
                'assigned_to',
                'due_date',
            ])
            ->each(function (Compliance $compliance) use ($user, $push) {
                $ref = $compliance->reference_number
                    ?: $compliance->title
                    ?: 'Compliance #' . $compliance->id;

                if ((int) $compliance->created_by === (int) $user->id) {
                    $push(
                        'compliance-' . $compliance->id . '-created',
                        'compliance',
                        'created',
                        'Compliance Record Created',
                        $compliance->title
                            . ' — ' . $ref
                            . ' (' . $compliance->status . ')',
                        $ref,
                        $compliance->created_at,
                        'warning'
                    );
                }

                if (
                    (int) $compliance->assigned_to === (int) $user->id
                ) {
                    $push(
                        'compliance-' . $compliance->id . '-assigned',
                        'compliance',
                        'assigned',
                        'Compliance Assigned',
                        $compliance->title
                            . ($compliance->due_date
                                ? ' — due ' . Carbon::parse($compliance->due_date)->format('M j, Y')
                                : ''),
                        $ref,
                        $compliance->created_at,
                        'info'
                    );
                }
            });

        /*
        |--------------------------------------------------------------------------
        | 7. DOCUMENTS (uploaded_by / assigned_to / archived_by)
        |--------------------------------------------------------------------------
        */

        Document::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('uploaded_by', $user->id)
                    ->orWhere('assigned_to', $user->id)
                    ->orWhere('archived_by', $user->id);
            })
            ->orderBy('created_at')
            ->get([
                'id',
                'title',
                'file_name',
                'status',
                'document_type',
                'uploaded_by',
                'created_at',
                'assigned_to',
                'archived_by',
                'archived_at',
            ])
            ->each(function (Document $document) use ($user, $push) {
                $ref = $document->document_type
                    ?: $document->title
                    ?: $document->file_name
                    ?: 'Document #' . $document->id;

                if ((int) $document->uploaded_by === (int) $user->id) {
                    $push(
                        'document-' . $document->id . '-uploaded',
                        'document',
                        'uploaded',
                        'Document Uploaded',
                        $document->title
                            ?: $document->file_name
                            ?: ('Document #' . $document->id),
                        $ref,
                        $document->created_at,
                        'info'
                    );
                }

                if (
                    (int) $document->archived_by === (int) $user->id &&
                    $document->archived_at
                ) {
                    $push(
                        'document-' . $document->id . '-archived',
                        'document',
                        'archived',
                        'Document Archived',
                        $document->title ?: ('Document #' . $document->id),
                        $ref,
                        $document->archived_at,
                        'warning'
                    );
                }
            });

        /*
        |--------------------------------------------------------------------------
        | 8. REPORTS (created_by)
        |--------------------------------------------------------------------------
        */

        Report::query()
            ->where('created_by', $user->id)
            ->orderBy('created_at')
            ->get([
                'id',
                'name',
                'type',
                'created_at',
            ])
            ->each(function (Report $report) use ($push) {
                $push(
                    'report-' . $report->id . '-saved',
                    'report',
                    'saved',
                    'Report Saved',
                    $report->name
                        . ($report->type ? ' (' . $report->type . ')' : ''),
                    $report->name ?: ('Report #' . $report->id),
                    $report->created_at,
                    'info'
                );
            });

        /*
        |--------------------------------------------------------------------------
        | 9. DOCUMENT ACCESS REQUESTS (staff_id)
        |--------------------------------------------------------------------------
        */

        DocumentAccessRequest::query()
            ->where('staff_id', $user->id)
            ->orderBy('requested_at')
            ->get([
                'id',
                'status',
                'requested_at',
                'responded_at',
            ])
            ->each(function (DocumentAccessRequest $requestItem) use ($push) {
                $type = $requestItem->status === 'approved'
                    ? 'success'
                    : ($requestItem->status === 'rejected' ? 'error' : 'warning');

                $push(
                    'access-' . $requestItem->id . '-requested',
                    'access',
                    'requested',
                    'Document Access Requested',
                    'Status: ' . ucfirst((string) $requestItem->status),
                    'Request #' . $requestItem->id,
                    $requestItem->requested_at ?: $requestItem->created_at,
                    $type
                );
            });

        /*
        |--------------------------------------------------------------------------
        | 10. LOGIN / LAST SESSION
        |--------------------------------------------------------------------------
        */

        if ($user->last_login_at) {
            $push(
                'user-' . $user->id . '-login',
                'login',
                'login',
                'Logged In',
                'Nag-login sa system',
                null,
                $user->last_login_at,
                'info'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SORT BY TIME (newest first)
        |--------------------------------------------------------------------------
        */

        usort($activities, function (array $a, array $b) {
            return strcmp((string) $b['time'], (string) $a['time']);
        });

        $counts = [];

        foreach ($activities as $item) {
            $counts[$item['module']] =
                ($counts[$item['module']] ?? 0) + 1;
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at
                    ? Carbon::parse($user->created_at)->toISOString()
                    : null,
                'last_login_at' => $user->last_login_at
                    ? Carbon::parse($user->last_login_at)->toISOString()
                    : null,
            ],
            'activities' => array_slice($activities, 0, 200),
            'module_counts' => $counts,
            'total' => count($activities),
        ]);
    }
}
