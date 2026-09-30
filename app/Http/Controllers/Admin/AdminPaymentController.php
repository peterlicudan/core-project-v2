<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\PaymentStatusMail;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class AdminPaymentController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | PAYMENT METHODS
    |--------------------------------------------------------------------------
    */

    private const PAYMENT_METHODS = [
        'Bank Transfer',
        'Cheque',
    ];

    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUSES
    |--------------------------------------------------------------------------
    */

    private const PAYMENT_STATUSES = [
        'Pending',
        'Partial',
        'Paid',
    ];

    /*
    |--------------------------------------------------------------------------
    | ARCHIVE
    |--------------------------------------------------------------------------
    */

    private const ARCHIVE_DAYS = 90;

    private const DELETE_AFTER_YEARS = 1;

    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        $this->authorizeAdmin();

        $payments = Payment::query()
            ->with([
                'user:id,name,email,role',
                'invoice:id,number,billing_number,client,client_email,project,amount,status,job_order_id',
                'invoice.jobOrder:id,number',
                'editor:id,name,email',
                'updatedBy:id,name,email',
            ])
            ->latest('id')
            ->get()
            ->map(
                fn (Payment $payment) =>
                    $this->formatPaymentForAdmin($payment)
            )
            ->values();

        return Inertia::render(
            'Admin/Payments',
            [
                'payments' => $payments,

                'paymentMethods' =>
                    self::PAYMENT_METHODS,

                'paymentStatuses' =>
                    self::PAYMENT_STATUSES,
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT PAYMENT FOR ADMIN
    |--------------------------------------------------------------------------
    */

    private function formatPaymentForAdmin(
        Payment $payment
    ): array {
        $invoice = $payment->invoice;

        /*
        |--------------------------------------------------------------------------
        | CLIENT
        |--------------------------------------------------------------------------
        */

        $client =
            $payment->client
            ?: $invoice?->client
            ?: $payment->user?->name
            ?: 'Unknown Client';

        /*
        |--------------------------------------------------------------------------
        | CLIENT EMAIL
        |--------------------------------------------------------------------------
        */

        $clientEmail =
            $payment->client_email
            ?: $invoice?->client_email
            ?: $payment->user?->email
            ?: null;

        /*
        |--------------------------------------------------------------------------
        | INVOICE NUMBER
        |--------------------------------------------------------------------------
        */

        $invoiceNumber =
            $payment->invoice_number
            ?: $invoice?->number
            ?: '—';

        /*
        |--------------------------------------------------------------------------
        | RECEIPT NUMBER
        |--------------------------------------------------------------------------
        */

        $receiptNumber =
            $payment->receipt_number
            ?: $payment->receipt
            ?: 'PAY-' . str_pad(
                (string) $payment->id,
                4,
                '0',
                STR_PAD_LEFT
            );

        /*
        |--------------------------------------------------------------------------
        | INVOICE AMOUNT
        |--------------------------------------------------------------------------
        */

        $invoiceAmount =
            $invoice
            ? (float) $invoice->amount
            : 0;

        /*
        |--------------------------------------------------------------------------
        | STATUS
        |--------------------------------------------------------------------------
        */

        $status =
            $payment->status
            ?: 'Pending';

        $normalizedStatus =
            strtolower(
                trim(
                    (string) $status
                )
            );

        $isPending =
            $normalizedStatus === 'pending';

        $isPartial =
            $normalizedStatus === 'partial';

        $isPaid =
            $normalizedStatus === 'paid';

        /*
        |--------------------------------------------------------------------------
        | TOTAL PAID
        |--------------------------------------------------------------------------
        */

        $totalPaid = 0;

        if ($invoice) {
            $totalPaid =
                (float) Payment::query()
                    ->where(
                        'invoice_id',
                        $invoice->id
                    )
                    ->whereIn(
                        'status',
                        [
                            'Paid',
                            'Partial',
                        ]
                    )
                    ->sum('amount');
        }

        /*
        |--------------------------------------------------------------------------
        | REMAINING BALANCE
        |--------------------------------------------------------------------------
        */

        $remainingBalance =
            max(
                0,
                $invoiceAmount - $totalPaid
            );

        /*
        |--------------------------------------------------------------------------
        | DATES
        |--------------------------------------------------------------------------
        */

        $paymentDate =
            $payment->payment_date
            ? $payment->payment_date->format('Y-m-d')
            : null;

        $partialDate =
            $payment->partial_date
            ? $payment->partial_date->format('Y-m-d')
            : null;

        /*
        |--------------------------------------------------------------------------
        | DUE DATE
        |--------------------------------------------------------------------------
        */

        $dueDate = null;

        if (
            !$isPaid &&
            $payment->due_date
        ) {
            $dueDate =
                $payment->due_date->format('Y-m-d');
        }

        /*
        |--------------------------------------------------------------------------
        | DUE / UNPAID
        |--------------------------------------------------------------------------
        */

        $isOverdue = false;

        $isUnpaid = false;

        $daysUntilDue = null;

        $dueStatus = null;

        if (
            ($isPending || $isPartial) &&
            $payment->due_date
        ) {
            $today =
                now()->startOfDay();

            $due =
                $payment->due_date
                    ->copy()
                    ->startOfDay();

            if (
                $today->greaterThan($due)
            ) {
                $daysUntilDue =
                    -$due->diffInDays(
                        $today
                    );

                $isOverdue = true;

                if ($isPending) {
                    $isUnpaid = true;

                    $dueStatus = 'Unpaid';
                } else {
                    $dueStatus = 'Overdue';
                }
            } else {
                $daysUntilDue =
                    $today->diffInDays(
                        $due
                    );

                if ($daysUntilDue === 0) {
                    $dueStatus = 'Due Today';
                } elseif ($daysUntilDue > 0) {
                    $dueStatus = 'Due';
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | EDIT PERMISSION
        |--------------------------------------------------------------------------
        | ✅ ADMIN archive check (hindi user-side)
        |--------------------------------------------------------------------------
        */

        $canEdit =
            !$payment->admin_archived &&
            !$isPaid &&
            (
                $isPartial ||
                $isPending
            );

        /*
        |--------------------------------------------------------------------------
        | ARCHIVE
        |--------------------------------------------------------------------------
        */

        $archiveExpiresAt =
            $payment->archive_expires_at;

        $deleteAfter =
            $payment->delete_after;

        $daysUntilExpiration = null;

        $archiveExpired = false;

        $readyForDeletion = false;

        if (
            $payment->archived &&
            $archiveExpiresAt
        ) {
            $today =
                now()->startOfDay();

            $expiration =
                $archiveExpiresAt
                    ->copy()
                    ->startOfDay();

            if (
                $today->greaterThanOrEqualTo(
                    $expiration
                )
            ) {
                $daysUntilExpiration = 0;
            } else {
                $daysUntilExpiration =
                    $today->diffInDays(
                        $expiration
                    );
            }

            $archiveExpired =
                now()->greaterThanOrEqualTo(
                    $archiveExpiresAt
                );
        }

        /*
        |--------------------------------------------------------------------------
        | DELETE DATE
        |--------------------------------------------------------------------------
        */

        if (
            $payment->archived &&
            $deleteAfter
        ) {
            $readyForDeletion =
                now()->greaterThanOrEqualTo(
                    $deleteAfter
                );
        }

        /*
        |--------------------------------------------------------------------------
        | RETURN
        |--------------------------------------------------------------------------
        */

        return [
            'id' =>
                $payment->id,

            'receipt' =>
                $receiptNumber,

            'receiptNumber' =>
                $payment->receipt_number
                    ?: $payment->receipt
                    ?: null,

            'client' =>
                $client,

            'clientEmail' =>
                $clientEmail,

            'client_email' =>
                $clientEmail,

            'invoice' =>
                $invoiceNumber,

            'invoiceId' =>
                $payment->invoice_id,

            /* ✅ REFERENCE — Billing No. (BILL-YYYY-NNN) + Job Order No. */
            'billingNumber' =>
                $payment->billing_number
                ?: $invoice?->billing_number
                ?: null,

            'jobOrderNumber' =>
                $invoice?->jobOrder?->number
                ?: null,

            'method' =>
                $payment->payment_method,

            'paymentMethod' =>
                $payment->payment_method,

            'amount' =>
                (float) $payment->amount,

            'status' =>
                $status,

            'invoiceAmount' =>
                $invoiceAmount,

            'totalPaid' =>
                $totalPaid,

            'remainingBalance' =>
                $remainingBalance,

            'paymentDate' =>
                $paymentDate,

            'payment_date' =>
                $paymentDate,

            'partialDate' =>
                $partialDate,

            'partial_date' =>
                $partialDate,

            'partialPaymentDate' =>
                $partialDate,

            'partial_payment_date' =>
                $partialDate,

            'dueDate' =>
                $dueDate,

            'due_date' =>
                $dueDate,

            'isPending' =>
                $isPending,

            'isPartial' =>
                $isPartial,

            'isPaid' =>
                $isPaid,

            'isOverdue' =>
                $isOverdue,

            'isUnpaid' =>
                $isUnpaid,

            'dueStatus' =>
                $dueStatus,

            'daysUntilDue' =>
                $daysUntilDue,

            'canEdit' =>
                $canEdit,

            'isLocked' =>
                !$canEdit,

            'notes' =>
                $payment->notes,

            'userId' =>
                $payment->user_id,

            'userName' =>
                $payment->user?->name,

            'userEmail' =>
                $payment->user?->email,

            'userRole' =>
                $payment->user?->role,

            'editedBy' =>
                $payment->editor?->name,

            'editedByEmail' =>
                $payment->editor?->email,

            'updatedBy' =>
                $payment->updatedBy?->name,

            'updatedByEmail' =>
                $payment->updatedBy?->email,

            'editedAt' =>
                $payment->edited_at
                    ? $payment->edited_at->format(
                        'Y-m-d H:i:s'
                    )
                    : null,

            'invoiceStatus' =>
                $invoice?->status,

            /*
            |--------------------------------------------------------------------------
            | USER-SIDE ARCHIVE
            |--------------------------------------------------------------------------
            */

            'archived' =>
                (bool) $payment->archived,

            'archivedAt' =>
                $payment->archived_at
                    ? $payment->archived_at->format(
                        'Y-m-d H:i:s'
                    )
                    : null,

            /*
            |--------------------------------------------------------------------------
            | ✅ ADMIN-SIDE ARCHIVE (BAGO)
            |--------------------------------------------------------------------------
            */

            'admin_archived' =>
                (bool) $payment->admin_archived,

            'adminArchived' =>
                (bool) $payment->admin_archived,

            'admin_archived_at' =>
                $payment->admin_archived_at
                    ? $payment->admin_archived_at->format(
                        'Y-m-d H:i:s'
                    )
                    : null,

            'adminArchivedAt' =>
                $payment->admin_archived_at
                    ? $payment->admin_archived_at->format(
                        'Y-m-d H:i:s'
                    )
                    : null,

            'archiveExpiresAt' =>
                $archiveExpiresAt
                    ? $archiveExpiresAt->format(
                        'Y-m-d H:i:s'
                    )
                    : null,

            'deleteAfter' =>
                $deleteAfter
                    ? $deleteAfter->format(
                        'Y-m-d H:i:s'
                    )
                    : null,

            'archiveExpired' =>
                $archiveExpired,

            'readyForDeletion' =>
                $readyForDeletion,

            'daysUntilExpiration' =>
                $daysUntilExpiration,

            'archiveInfo' =>
                $payment->archived
                    ? [
                        'expiration' =>
                            $archiveExpiresAt
                                ? $archiveExpiresAt->format(
                                    'M d, Y'
                                )
                                : null,

                        'deleteDate' =>
                            $deleteAfter
                                ? $deleteAfter->format(
                                    'M d, Y'
                                )
                                : null,

                        'expired' =>
                            $archiveExpired,

                        'readyForDeletion' =>
                            $readyForDeletion,

                        'daysUntilExpiration' =>
                            $daysUntilExpiration,
                    ]
                    : null,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | BALANCE
    |--------------------------------------------------------------------------
    */

    public function balance(
        Payment $payment
    ) {
        $this->authorizeAdmin();

        $invoice =
            $payment->invoice;

        if (!$invoice) {
            return response()->json(
                [
                    'success' => false,

                    'message' =>
                        'No linked invoice found.',
                ],
                404
            );
        }

        $totalPaid =
            (float) Payment::query()
                ->where(
                    'invoice_id',
                    $invoice->id
                )
                ->whereIn(
                    'status',
                    [
                        'Paid',
                        'Partial',
                    ]
                )
                ->sum('amount');

        $invoiceTotal =
            (float) $invoice->amount;

        $remaining =
            max(
                0,
                $invoiceTotal - $totalPaid
            );

        return response()->json(
            [
                'success' => true,

                'invoice_id' =>
                    $invoice->id,

                'invoice_number' =>
                    $invoice->number ?? $invoice->billing_number,

                'invoice_amount' =>
                    number_format(
                        $invoiceTotal,
                        2,
                        '.',
                        ''
                    ),

                'total_paid' =>
                    number_format(
                        $totalPaid,
                        2,
                        '.',
                        ''
                    ),

                'remaining_balance' =>
                    number_format(
                        $remaining,
                        2,
                        '.',
                        ''
                    ),
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE PAYMENT
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        Payment $payment
    ) {
        $this->authorizeAdmin();

        /*
        |--------------------------------------------------------------------------
        | ✅ ADMIN ARCHIVED LOCK (BAGO)
        |--------------------------------------------------------------------------
        */

        if ($payment->admin_archived) {
            return back()->withErrors([
                'payment' =>
                    'Archived payments cannot be modified.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | CURRENT STATUS
        |--------------------------------------------------------------------------
        */

        $currentStatus =
            strtolower(
                trim(
                    (string) (
                        $payment->status
                        ?: 'Pending'
                    )
                )
            );

        /*
        |--------------------------------------------------------------------------
        | FULLY PAID LOCK
        |--------------------------------------------------------------------------
        */

        if ($currentStatus === 'paid') {
            return back()->withErrors([
                'payment' =>
                    'Fully Paid payments are locked and cannot be edited.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | ONLY PARTIAL / PENDING
        |--------------------------------------------------------------------------
        */

        if (
            !in_array(
                $currentStatus,
                [
                    'partial',
                    'pending',
                ],
                true
            )
        ) {
            return back()->withErrors([
                'payment' =>
                    'Only Partial or Pending payment records can be edited.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate([
                'payment_method' => [
                    'required',
                    'string',
                    'in:Bank Transfer,Cheque',
                ],

                'payment_date' => [
                    'nullable',
                    'date',
                ],

                'due_date' => [
                    'nullable',
                    'date',
                ],

                'notes' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],
            ]);

        /*
        |--------------------------------------------------------------------------
        | TRANSACTION
        |--------------------------------------------------------------------------
        */

        DB::transaction(
            function () use (
                $payment,
                $validated,
                $currentStatus
            ) {

                $payment->payment_method =
                    $validated['payment_method'];

                $invoice =
                    $payment->invoice;

                /*
                |--------------------------------------------------------------------------
                | PARTIAL RECORD
                |--------------------------------------------------------------------------
                */

                if (
                    $currentStatus === 'partial'
                ) {

                    if (!$invoice) {
                        abort(
                            422,
                            'This payment does not have a linked invoice.'
                        );
                    }

                    $invoiceAmount =
                        (float) $invoice->amount;

                    if ($invoiceAmount <= 0) {
                        abort(
                            422,
                            'Invoice amount must be greater than zero.'
                        );
                    }

                    if (
                        !empty(
                            $validated['payment_date']
                        )
                    ) {

                        $payment->status =
                            'Paid';

                        $payment->amount =
                            $invoiceAmount;

                        if (!$payment->partial_date) {
                            $payment->partial_date =
                                now()->toDateString();
                        }

                        $payment->payment_date =
                            $validated['payment_date'];

                        $payment->due_date =
                            null;

                    } else {

                        $payment->status =
                            'Partial';

                        $payment->amount =
                            round(
                                $invoiceAmount / 2,
                                2
                            );

                        if (!$payment->partial_date) {
                            $payment->partial_date =
                                now()->toDateString();
                        }

                        $payment->payment_date =
                            null;

                        $payment->due_date =
                            $validated['due_date']
                            ?? null;
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | PENDING RECORD
                |--------------------------------------------------------------------------
                */

                if (
                    $currentStatus === 'pending'
                ) {

                    if (
                        !empty(
                            $validated['payment_date']
                        )
                    ) {

                        if (!$invoice) {
                            abort(
                                422,
                                'This payment does not have a linked invoice.'
                            );
                        }

                        $invoiceAmount =
                            (float) $invoice->amount;

                        if ($invoiceAmount <= 0) {
                            abort(
                                422,
                                'Invoice amount must be greater than zero.'
                            );
                        }

                        $payment->status =
                            'Paid';

                        $payment->amount =
                            $invoiceAmount;

                        $payment->payment_date =
                            $validated['payment_date'];

                        $payment->partial_date =
                            null;

                        $payment->due_date =
                            null;

                    } else {

                        $payment->status =
                            'Pending';

                        $payment->amount =
                            $payment->getOriginal(
                                'amount'
                            );

                        $payment->payment_date =
                            null;

                        $payment->partial_date =
                            $payment->partial_date;

                        $payment->due_date =
                            $validated['due_date']
                            ?? null;
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | NOTES
                |--------------------------------------------------------------------------
                */

                $payment->notes =
                    $validated['notes']
                    ?? null;

                /*
                |--------------------------------------------------------------------------
                | AUDIT
                |--------------------------------------------------------------------------
                */

                $payment->edited_by =
                    Auth::id();

                $payment->edited_at =
                    now();

                $payment->updated_by =
                    Auth::id();

                /*
                |--------------------------------------------------------------------------
                | USER-SIDE ARCHIVE FLAGS (HUWAG GALAWIN)
                |--------------------------------------------------------------------------
                */

                $payment->archived =
                    false;

                $payment->archived_at =
                    null;

                $payment->archive_expires_at =
                    null;

                $payment->delete_after =
                    null;

                /*
                |--------------------------------------------------------------------------
                | SAVE
                |--------------------------------------------------------------------------
                */

                $payment->save();

                /*
                |--------------------------------------------------------------------------
                | SYNC INVOICE
                |--------------------------------------------------------------------------
                */

                $this->syncInvoiceStatus(
                    $payment
                );
            }
        );

        /*
        |--------------------------------------------------------------------------
        | REFRESH
        |--------------------------------------------------------------------------
        */

        $freshPayment =
            $payment->fresh([
                'user',
                'invoice',
            ]);

        /*
        |--------------------------------------------------------------------------
        | AUTOMATIC EMAIL
        |--------------------------------------------------------------------------
        */

        if ($freshPayment) {
            $this->sendAutomaticStatusEmail(
                $freshPayment
            );
        }

        return back()->with(
            'success',
            'Payment record updated successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY / FULLY PAID
    |--------------------------------------------------------------------------
    */

    public function verify(
        Payment $payment
    ) {
        $this->authorizeAdmin();

        /*
        |--------------------------------------------------------------------------
        | ✅ ADMIN ARCHIVED LOCK (BAGO)
        |--------------------------------------------------------------------------
        */

        if ($payment->admin_archived) {
            return back()->withErrors([
                'payment' =>
                    'Archived payments cannot be modified.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | PREVENT PAID -> PAID
        |--------------------------------------------------------------------------
        */

        if (
            strtolower(
                trim(
                    (string) $payment->status
                )
            ) === 'paid'
        ) {
            return back()->withErrors([
                'payment' =>
                    'This payment is already Fully Paid.',
            ]);
        }

        DB::transaction(
            function () use ($payment) {

                $invoice =
                    $payment->invoice;

                if (!$invoice) {
                    abort(
                        422,
                        'This payment does not have a linked invoice.'
                    );
                }

                $invoiceAmount =
                    (float) $invoice->amount;

                if ($invoiceAmount <= 0) {
                    abort(
                        422,
                        'Invoice amount must be greater than zero.'
                    );
                }

                $paymentDate =
                    now()->toDateString();

                $payment->status =
                    'Paid';

                $payment->amount =
                    $invoiceAmount;

                $payment->payment_date =
                    $paymentDate;

                $payment->partial_date =
                    $payment->partial_date;

                $payment->due_date =
                    null;

                /*
                |--------------------------------------------------------------------------
                | USER-SIDE ARCHIVE FLAGS
                |--------------------------------------------------------------------------
                */

                $payment->archived =
                    false;

                $payment->archived_at =
                    null;

                $payment->archive_expires_at =
                    null;

                $payment->delete_after =
                    null;

                /*
                |--------------------------------------------------------------------------
                | AUDIT
                |--------------------------------------------------------------------------
                */

                $payment->edited_by =
                    Auth::id();

                $payment->edited_at =
                    now();

                $payment->updated_by =
                    Auth::id();

                $payment->save();

                $this->syncInvoiceStatus(
                    $payment
                );
            }
        );

        $freshPayment =
            $payment->fresh([
                'user',
                'invoice',
            ]);

        if ($freshPayment) {
            $this->sendAutomaticStatusEmail(
                $freshPayment
            );
        }

        return back()->with(
            'success',
            'Payment marked as Fully Paid successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | MARK PARTIAL / HALF PAYMENT
    |--------------------------------------------------------------------------
    */

    public function partial(
        Payment $payment
    ) {
        $this->authorizeAdmin();

        /*
        |--------------------------------------------------------------------------
        | ✅ ADMIN ARCHIVED LOCK (BAGO)
        |--------------------------------------------------------------------------
        */

        if ($payment->admin_archived) {
            return back()->withErrors([
                'payment' =>
                    'Archived payments cannot be modified.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | PREVENT PAID -> PARTIAL
        |--------------------------------------------------------------------------
        */

        if (
            strtolower(
                trim(
                    (string) $payment->status
                )
            ) === 'paid'
        ) {
            return back()->withErrors([
                'payment' =>
                    'A Fully Paid payment cannot be changed to Partial.',
            ]);
        }

        DB::transaction(
            function () use ($payment) {

                $invoice =
                    $payment->invoice;

                if (!$invoice) {
                    abort(
                        422,
                        'This payment does not have a linked invoice.'
                    );
                }

                $invoiceAmount =
                    (float) $invoice->amount;

                if ($invoiceAmount <= 0) {
                    abort(
                        422,
                        'Invoice amount must be greater than zero.'
                    );
                }

                $halfPayment =
                    round(
                        $invoiceAmount / 2,
                        2
                    );

                $partialDate =
                    $payment->partial_date
                    ?: now()->toDateString();

                $payment->status =
                    'Partial';

                $payment->amount =
                    $halfPayment;

                $payment->partial_date =
                    $partialDate;

                $payment->payment_date =
                    null;

                $payment->due_date =
                    $payment->due_date;

                /*
                |--------------------------------------------------------------------------
                | USER-SIDE ARCHIVE FLAGS
                |--------------------------------------------------------------------------
                */

                $payment->archived =
                    false;

                $payment->archived_at =
                    null;

                $payment->archive_expires_at =
                    null;

                $payment->delete_after =
                    null;

                /*
                |--------------------------------------------------------------------------
                | AUDIT
                |--------------------------------------------------------------------------
                */

                $payment->edited_by =
                    Auth::id();

                $payment->edited_at =
                    now();

                $payment->updated_by =
                    Auth::id();

                $payment->save();

                $this->syncInvoiceStatus(
                    $payment
                );
            }
        );

        $freshPayment =
            $payment->fresh([
                'user',
                'invoice',
            ]);

        if ($freshPayment) {
            $this->sendAutomaticStatusEmail(
                $freshPayment
            );
        }

        return back()->with(
            'success',
            'Payment marked as Partial. The amount was automatically set to 50% of the invoice total.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ ADMIN ARCHIVE (BAGO)
    |--------------------------------------------------------------------------
    | WALANG status check — lahat pwedeng i-archive.
    | Gumagamit ng `admin_archived` (hindi `archived`).
    | HINDI apektado ang user side.
    |--------------------------------------------------------------------------
    */

    public function archive(
        Payment $payment
    ) {
        $this->authorizeAdmin();

        abort_unless(
            !$payment->admin_archived,
            422,
            'This payment is already archived.'
        );

        DB::transaction(
            function () use ($payment) {
                $payment->update([
                    'admin_archived'    => true,
                    'admin_archived_at' => now(),
                    'updated_by'        => Auth::id(),
                    'edited_by'         => Auth::id(),
                    'edited_at'         => now(),
                ]);
            }
        );

        return back()->with(
            'success',
            'Payment has been moved to admin archive successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ ADMIN UNARCHIVE (BAGO)
    |--------------------------------------------------------------------------
    */

    public function unarchive(
        Payment $payment
    ) {
        $this->authorizeAdmin();

        abort_unless(
            $payment->admin_archived,
            422,
            'This payment is not archived.'
        );

        $payment->update([
            'admin_archived'    => false,
            'admin_archived_at' => null,
            'updated_by'        => Auth::id(),
            'edited_by'         => Auth::id(),
            'edited_at'         => now(),
        ]);

        return back()->with(
            'success',
            'Payment restored from admin archive.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CLEANUP EXPIRED ARCHIVES (user-side)
    |--------------------------------------------------------------------------
    */

    public function cleanupExpiredArchives(): int
    {
        return Payment::query()
            ->where(
                'archived',
                true
            )
            ->whereNotNull(
                'delete_after'
            )
            ->where(
                'delete_after',
                '<=',
                now()
            )
            ->delete();
    }

    /*
    |--------------------------------------------------------------------------
    | SYNC INVOICE
    |--------------------------------------------------------------------------
    */

    private function syncInvoiceStatus(
        Payment $payment
    ): void {
        if (!$payment->invoice_id) {
            return;
        }

        $invoice =
            Invoice::find(
                $payment->invoice_id
            );

        if (!$invoice) {
            return;
        }

        $this->recalculateInvoiceStatus(
            $invoice
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RECALCULATE INVOICE STATUS
    |--------------------------------------------------------------------------
    */

    private function recalculateInvoiceStatus(
        Invoice $invoice
    ): void {
        $totalPaid =
            (float) Payment::query()
                ->where(
                    'invoice_id',
                    $invoice->id
                )
                ->whereIn(
                    'status',
                    [
                        'Paid',
                        'Partial',
                    ]
                )
                ->sum('amount');

        $invoiceAmount =
            (float) $invoice->amount;

        if (
            $totalPaid >= $invoiceAmount
        ) {
            $invoice->status =
                'Paid';
        }

        elseif (
            $totalPaid > 0
        ) {
            $invoice->status =
                'Partial';
        }

        else {
            $invoice->status =
                'Pending';
        }

        $invoice->save();
    }

    /*
    |--------------------------------------------------------------------------
    | MANUAL EMAIL NOTIFICATION
    |--------------------------------------------------------------------------
    */

    public function notify(
        Request $request,
        Payment $payment
    ) {
        $this->authorizeAdmin();

        $validated =
            $request->validate([
                'email' => [
                    'required',
                    'email',
                    'max:255',
                ],

                'subject' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'message' => [
                    'required',
                    'string',
                    'max:10000',
                ],
            ]);

        $payment->load([
            'user',
            'invoice',
        ]);

        try {

            Mail::to(
                $validated['email']
            )->send(
                new PaymentStatusMail(
                    $payment,
                    $validated['subject'],
                    $validated['message']
                )
            );

        } catch (\Throwable $e) {

            report($e);

            return back()
                ->withErrors([
                    'email' =>
                        'Email could not be sent. Please check your mail configuration.',
                ])
                ->withInput();
        }

        return back()->with(
            'success',
            'Payment notification email sent successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | AUTOMATIC STATUS EMAIL
    |--------------------------------------------------------------------------
    */

    private function sendAutomaticStatusEmail(
        Payment $payment
    ): void {
        $user =
            $payment->user;

        if (
            !$user ||
            !$user->email
        ) {
            return;
        }

        $receiptNumber =
            $payment->receipt_number
            ?: $payment->receipt
            ?: 'PAY-' . str_pad(
                (string) $payment->id,
                4,
                '0',
                STR_PAD_LEFT
            );

        $invoiceNumber =
            $payment->invoice_number
            ?: $payment->invoice?->number
            ?: 'N/A';

        $amount =
            number_format(
                (float) $payment->amount,
                2
            );

        $status =
            $payment->status
            ?: 'Pending';

        $invoiceAmount =
            $payment->invoice
            ? (float) $payment->invoice->amount
            : 0;

        $totalPaid =
            $payment->invoice_id
            ? (float) Payment::query()
                ->where(
                    'invoice_id',
                    $payment->invoice_id
                )
                ->whereIn(
                    'status',
                    [
                        'Paid',
                        'Partial',
                    ]
                )
                ->sum('amount')
            : 0;

        $remaining =
            max(
                0,
                $invoiceAmount - $totalPaid
            );

        $subject =
            "ALIBATON Payment Status Update - {$receiptNumber}";

        $message =
            "Hello {$user->name},\n\n" .

            "Your payment has been reviewed by ALIBATON.\n\n" .

            "PAYMENT DETAILS\n" .
            "-------------------------\n" .

            "Receipt: {$receiptNumber}\n" .

            "Invoice: {$invoiceNumber}\n" .

            "Amount: ₱{$amount}\n" .

            "Status: {$status}\n";

        if (
            $payment->partial_date
        ) {
            $message .=
                "Partial Date: " .
                $payment->partial_date->format(
                    'F d, Y'
                ) .
                "\n";
        }

        if (
            $payment->payment_date
        ) {
            $message .=
                "Fully Paid Date: " .
                $payment->payment_date->format(
                    'F d, Y'
                ) .
                "\n";
        }

        if (
            $payment->due_date &&
            strtolower(
                trim(
                    (string) $payment->status
                )
            ) !== 'paid'
        ) {
            $message .=
                "Due Date: " .
                $payment->due_date->format(
                    'F d, Y'
                ) .
                "\n";
        }

        $message .=
            "Invoice Total: ₱" .
            number_format(
                $invoiceAmount,
                2
            ) .
            "\n" .

            "Total Paid: ₱" .
            number_format(
                $totalPaid,
                2
            ) .
            "\n" .

            "Remaining Balance: ₱" .
            number_format(
                $remaining,
                2
            ) .
            "\n\n";

        if (
            $status === 'Paid'
        ) {

            $message .=
                "Your payment has been marked as Fully Paid.\n\n";

        } elseif (
            $status === 'Partial'
        ) {

            $message .=
                "Your payment has been recorded as a Partial Payment. " .
                "The partial payment was automatically calculated as 50% " .
                "of the invoice amount. The remaining balance must still be paid.\n\n";

        } elseif (
            $status === 'Pending'
        ) {

            $message .=
                "Your payment is currently pending administrative review.\n\n";
        }

        $message .=
            "Thank you,\n" .
            "ALIBATON Heavy Equipment & Logistics Management System";

        try {

            Mail::to(
                $user->email
            )->send(
                new PaymentStatusMail(
                    $payment,
                    $subject,
                    $message
                )
            );

        } catch (\Throwable $e) {

            report($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN AUTHORIZATION
    |--------------------------------------------------------------------------
    */

    private function authorizeAdmin(): void
    {
        abort_unless(
            Auth::check() &&
                Auth::user()->role === 'admin',
            403,
            'Only administrators can perform this action.'
        );
    }
}
