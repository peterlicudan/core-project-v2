<?php

namespace App\Http\Controllers;

use App\Mail\ComplianceForwarded;
use App\Models\Compliance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class ComplianceController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | CONSTRUCTOR
    |--------------------------------------------------------------------------
    */

    // public function __construct()
    // {
    //     $this->middleware('auth');
    // }

    /*
    |--------------------------------------------------------------------------
    | USER SIDE - VIEW COMPLIANCE
    |--------------------------------------------------------------------------
    */

    /**
     * Display compliance records for staff/users.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $isAdmin = $user->role === 'admin';

        $compliances = Compliance::with(['assignee', 'creator'])
            ->active()
            ->orderBy('created_at', 'desc')
            ->get();

        if (!$isAdmin) {
            $compliances = $compliances
                ->filter(function ($compliance) use ($user) {
                    return $compliance->isForAllStaff()
                        || $compliance->isAssignedTo($user->id);
                })
                ->values();
        }

        return Inertia::render('User/Compliance', [
            'compliances' => $compliances,
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'role' => $user->role,
                ],
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN SIDE - COMPLIANCE MANAGEMENT
    |--------------------------------------------------------------------------
    */

    /**
     * Display admin compliance dashboard.
     */
    public function adminIndex(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            abort(403, 'Unauthorized access.');
        }

        $compliances = Compliance::with([
                'assignee',
                'creator',
                'reviewer',
                'archiver',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $staff = User::where('role', 'staff')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $stats = Compliance::getStatistics();

        return Inertia::render('Admin/DocumentsCompliance', [
            'compliances' => $compliances,
            'complianceStats' => $stats,
            'staff' => $staff,
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'role' => $user->role,
                ],
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLIANCE CRUD
    |--------------------------------------------------------------------------
    */

    /**
     * Store a new compliance record.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:due_date',
            'regulatory_body' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'priority' => 'required|in:High,Medium,Low',
            'notify_days_before' => 'nullable|integer|min:1|max:365',
        ]);

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $compliance = Compliance::create([
            'title' => $request->title,
            'type' => $request->type,
            'description' => $request->description,
            'status' => $request->status,
            'assigned_to' => $request->assigned_to,
            'due_date' => $request->due_date,
            'expiry_date' => $request->expiry_date,
            'created_by' => $user->id,
            'regulatory_body' => $request->regulatory_body,
            'reference_number' => $request->reference_number,
            'priority' => $request->priority,
            'notify_days_before' => $request->notify_days_before ?? 30,
            'progress_percentage' => 0,
        ]);

        return redirect()
            ->back()
            ->with(
                'success',
                'Compliance record created successfully.'
            );
    }

    /**
     * Update compliance record.
     */
    public function update(Request $request, Compliance $compliance)
    {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'status' => 'sometimes|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:due_date',
            'regulatory_body' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'priority' => 'sometimes|in:High,Medium,Low',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'notify_days_before' => 'nullable|integer|min:1|max:365',
        ]);

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $progress = $request->progress_percentage
            ?? $compliance->progress_percentage;

        $data = $request->only([
            'title',
            'type',
            'description',
            'status',
            'assigned_to',
            'due_date',
            'expiry_date',
            'regulatory_body',
            'reference_number',
            'priority',
            'progress_percentage',
            'notify_days_before',
        ]);

        if (
            $progress >= 100
            && $compliance->status !== 'Completed'
        ) {
            $data['status'] = 'Completed';
            $data['completed_at'] = Carbon::now();
        }

        $compliance->update($data);

        return redirect()
            ->back()
            ->with(
                'success',
                'Compliance record updated successfully.'
            );
    }

    /**
     * Delete compliance record.
     */
    public function destroy(Compliance $compliance)
    {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $compliance->delete();

        return redirect()
            ->back()
            ->with(
                'success',
                'Compliance record deleted successfully.'
            );
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLIANCE ACTIONS
    |--------------------------------------------------------------------------
    */

    /**
     * Mark compliance as completed.
     */
    public function complete(
        Request $request,
        Compliance $compliance
    ) {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $compliance->markAsCompleted($user->id);

        return redirect()
            ->back()
            ->with(
                'success',
                'Compliance marked as completed.'
            );
    }

    /**
     * Update compliance progress.
     */
    public function updateProgress(
        Request $request,
        Compliance $compliance
    ) {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'progress' => 'required|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors(),
            ], 422);
        }

        $compliance->updateProgress(
            $request->progress
        );

        return response()->json([
            'success' => true,
            'message' => 'Progress updated successfully.',
            'progress' => $compliance->progress_percentage,
            'status' => $compliance->status,
        ]);
    }

    /**
     * Review compliance.
     */
    public function review(
        Request $request,
        Compliance $compliance
    ) {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $compliance->review($user->id);

        if ($request->status) {
            $compliance->status = $request->status;
            $compliance->save();
        }

        return redirect()
            ->back()
            ->with(
                'success',
                'Compliance reviewed successfully.'
            );
    }

    /**
     * Archive compliance.
     */
    public function archive(Compliance $compliance)
    {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $compliance->archive($user->id);

        return redirect()
            ->back()
            ->with(
                'success',
                'Compliance archived successfully.'
            );
    }

    /**
     * Restore compliance from archive.
     */
    public function restore(Compliance $compliance)
    {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $compliance->restoreFromArchive();

        return redirect()
            ->back()
            ->with(
                'success',
                'Compliance restored successfully.'
            );
    }

    /*
    |--------------------------------------------------------------------------
    | FORWARD COMPLIANCE TO CLIENT
    |--------------------------------------------------------------------------
    */

    /**
     * Forward a compliance document to a client via email.
     *
     * Admin:
     * - Can forward any compliance.
     *
     * Staff:
     * - Can only forward compliance assigned to them.
     * - Can also forward compliance available to all staff.
     */
    public function forward(
        Request $request,
        Compliance $compliance
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        /*
        |--------------------------------------------------------------------------
        | AUTHORIZATION
        |--------------------------------------------------------------------------
        */

        if ($user->role !== 'admin') {
            $allowed = $compliance->isForAllStaff()
                || $compliance->isAssignedTo($user->id);

            if (!$allowed) {
                abort(
                    403,
                    'You are not authorized to forward this compliance.'
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATE REQUEST
        |--------------------------------------------------------------------------
        */

        $validator = Validator::make(
            $request->all(),
            [
                'email' => [
                    'required',
                    'email',
                    'max:255',
                ],
                'subject' => [
                    'nullable',
                    'string',
                    'max:255',
                ],
                'message' => [
                    'nullable',
                    'string',
                    'max:10000',
                ],
            ]
        );

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        /*
        |--------------------------------------------------------------------------
        | FILE CHECK
        |--------------------------------------------------------------------------
        */

        if (!$compliance->file_path) {
            return back()->withErrors([
                'email' => 'This compliance has no attached file to forward.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | FIND ACTUAL FILE
        |--------------------------------------------------------------------------
        */

        $filePath = ltrim(
            $compliance->file_path,
            '/'
        );

        try {
            if (
                Storage::disk('public')
                    ->exists($filePath)
            ) {
                $absolutePath = Storage::disk(
                    'public'
                )->path($filePath);
            } elseif (
                Storage::exists($filePath)
            ) {
                $absolutePath = Storage::path(
                    $filePath
                );
            } else {
                Log::error(
                    'Compliance forwarding failed: file not found.',
                    [
                        'compliance_id' => $compliance->id,
                        'file_path' => $compliance->file_path,
                        'user_id' => $user->id,
                    ]
                );

                return back()->withErrors([
                    'email' =>
                        'The compliance attachment could not be found on the server.',
                ]);
            }
        } catch (\Throwable $e) {
            Log::error(
                'Compliance forwarding storage error.',
                [
                    'compliance_id' => $compliance->id,
                    'file_path' => $compliance->file_path,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]
            );

            return back()->withErrors([
                'email' =>
                    'Unable to access the compliance attachment.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | EMAIL DATA
        |--------------------------------------------------------------------------
        */

        $recipient = trim(
            $request->email
        );

        $subject = trim(
            $request->subject ?? ''
        );

        if ($subject === '') {
            $subject =
                'Compliance Document: '
                . $compliance->title;
        }

        $message = trim(
            $request->message ?? ''
        );

        if ($message === '') {
            $message =
                "Please find attached the compliance document "
                . "\"{$compliance->title}\"."
                . "\n\n"
                . "File: "
                . (
                    $compliance->file_name
                    ?: 'compliance_file'
                )
                . "\n"
                . "Type: "
                . (
                    $compliance->type
                    ?: 'Compliance'
                )
                . "\n"
                . "Uploaded: "
                . (
                    $compliance->created_at?->format(
                        'F d, Y'
                    )
                    ?: 'N/A'
                )
                . "\n\n"
                . "Regards,\n"
                . "ALIBATON Team";
        }

        /*
        |--------------------------------------------------------------------------
        | SEND EMAIL
        |--------------------------------------------------------------------------
        */

        try {
            Mail::to($recipient)->send(
                new ComplianceForwarded(
                    $compliance,
                    $subject,
                    $message,
                    $absolutePath
                )
            );

            Log::info(
                'Compliance forwarded to client successfully.',
                [
                    'compliance_id' => $compliance->id,
                    'recipient' => $recipient,
                    'sent_by' => $user->id,
                ]
            );

            return back()->with(
                'success',
                "Compliance \"{$compliance->title}\" sent to {$recipient} successfully."
            );
        } catch (\Throwable $e) {
            Log::error(
                'Compliance forwarding email failed.',
                [
                    'compliance_id' => $compliance->id,
                    'recipient' => $recipient,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]
            );

            return back()->withErrors([
                'email' =>
                    'Failed to send the compliance email. Please check your mail configuration and try again.',
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLIANCE STATISTICS
    |--------------------------------------------------------------------------
    */

    /**
     * Get compliance statistics.
     */
    public function statistics()
    {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $stats = Compliance::getStatistics();

        $byType = Compliance::active()
            ->selectRaw(
                'type, COUNT(*) as count'
            )
            ->groupBy('type')
            ->get();

        $byPriority = Compliance::active()
            ->selectRaw(
                'priority, COUNT(*) as count'
            )
            ->groupBy('priority')
            ->get();

        /*
        |--------------------------------------------------------------------------
        | POSTGRESQL COMPATIBLE MONTH QUERY
        |--------------------------------------------------------------------------
        */

        $byMonth = Compliance::active()
            ->selectRaw(
                "TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count"
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json([
            'overall' => $stats,
            'by_type' => $byType,
            'by_priority' => $byPriority,
            'by_month' => $byMonth,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STAFF COMPLIANCE VIEW
    |--------------------------------------------------------------------------
    */

    /**
     * Get compliance for specific staff member.
     */
    public function staffCompliance(
        $staffId = null
    ) {
        $user = Auth::user();

        $targetId = $staffId ?? $user->id;

        if (
            $user->role !== 'admin'
            && $user->id !== (int) $targetId
        ) {
            abort(
                403,
                'Unauthorized access.'
            );
        }

        $compliances = Compliance::with([
                'assignee',
                'creator',
            ])
            ->active()
            ->where(function ($query) use ($targetId) {
                $query
                    ->whereNull('assigned_to')
                    ->orWhere(
                        'assigned_to',
                        $targetId
                    );
            })
            ->orderBy('due_date', 'asc')
            ->get();

        $targetUser = User::find(
            $targetId
        );

        return Inertia::render(
            'Staff/Compliance',
            [
                'compliances' => $compliances,
                'staffMember' => $targetUser,
                'auth' => [
                    'user' => [
                        'id' => $user->id,
                        'role' => $user->role,
                    ],
                ],
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | NOTIFICATIONS / REMINDERS
    |--------------------------------------------------------------------------
    */

    /**
     * Get expiring compliances for notifications.
     */
    public function expiring()
    {
        $user = Auth::user();

        $compliances = Compliance::with([
                'assignee',
            ])
            ->active()
            ->expiringSoon()
            ->get();

        if ($user->role !== 'admin') {
            $compliances = $compliances
                ->filter(function ($compliance) use ($user) {
                    return $compliance->isForAllStaff()
                        || $compliance->isAssignedTo($user->id);
                })
                ->values();
        }

        return response()->json([
            'expiring' => $compliances,
            'count' => $compliances->count(),
        ]);
    }

    /**
     * Send reminders for expiring compliances.
     */
    public function sendReminders()
    {
        $compliances =
            Compliance::getRemindersNeeded();

        foreach ($compliances as $compliance) {
            /*
             * Add ComplianceReminder mail here later if needed.
             */

            $compliance->markReminderSent();
        }

        return response()->json([
            'success' => true,
            'sent' => count($compliances),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | BULK OPERATIONS
    |--------------------------------------------------------------------------
    */

    /**
     * Bulk archive compliances.
     */
    public function bulkArchive(
        Request $request
    ) {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'ids' => 'required|array',
                'ids.*' => 'exists:compliances,id',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors(),
            ], 422);
        }

        $count = 0;

        foreach ($request->ids as $id) {
            $compliance =
                Compliance::find($id);

            if (
                $compliance
                && !$compliance->isArchived()
            ) {
                $compliance->archive(
                    $user->id
                );

                $count++;
            }
        }

        return response()->json([
            'success' => true,
            'message' =>
                "{$count} compliance records archived.",
            'count' => $count,
        ]);
    }

    /**
     * Bulk delete compliances.
     */
    public function bulkDelete(
        Request $request
    ) {
        $user = Auth::user();

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make(
            $request->all(),
            [
                'ids' => 'required|array',
                'ids.*' => 'exists:compliances,id',
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'error' => $validator->errors(),
            ], 422);
        }

        $count = Compliance::whereIn(
            'id',
            $request->ids
        )->delete();

        return response()->json([
            'success' => true,
            'message' =>
                "{$count} compliance records deleted.",
            'count' => $count,
        ]);
    }
}