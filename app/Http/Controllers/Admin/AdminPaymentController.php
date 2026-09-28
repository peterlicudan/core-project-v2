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
                /*
                |--------------------------------------------------------------------------
                | PAYMENT OWNER / CLIENT ACCOUNT
                |--------------------------------------------------------------------------
                */
                'user:id,name,email,role',

                /*
                |--------------------------------------------------------------------------
                | INVOICE
                |--------------------------------------------------------------------------
                |
                | client_email is included when the invoice table has
                | this column.
                |
                */
                'invoice:id,number,client,client_email,project,amount,status',

                /*
                |--------------------------------------------------------------------------
                | AUDIT
                |--------------------------------------------------------------------------
                */
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
        |
        | Priority:
        |
        | 1. Payment client_email
        | 2. Invoice client_email
        | 3. Payment user's email
        |
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
        |
        | Pending and Partial can be edited.
        | Paid and Archived are locked.
        |
        */

        $canEdit =
            !$payment->archived &&
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

            /*
            |--------------------------------------------------------------------------
            | BASIC
            |--------------------------------------------------------------------------
            */

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

            /*
            |--------------------------------------------------------------------------
            | CLIENT EMAIL
            |--------------------------------------------------------------------------
            */

            'clientEmail' =>
                $clientEmail,

            'client_email' =>
                $clientEmail,

            /*
            |--------------------------------------------------------------------------
            | INVOICE
            |--------------------------------------------------------------------------
            */

            'invoice' =>
                $invoiceNumber,

            'invoiceId' =>
                $payment->invoice_id,

            /*
            |--------------------------------------------------------------------------
            | PAYMENT
            |--------------------------------------------------------------------------
            */

            'method' =>
                $payment->payment_method,

            'paymentMethod' =>
                $payment->payment_method,

            'amount' =>
                (float) $payment->amount,

            /*
            |--------------------------------------------------------------------------
            | STATUS
            |--------------------------------------------------------------------------
            */

            'status' =>
                $status,

            /*
            |--------------------------------------------------------------------------
            | BALANCE
            |--------------------------------------------------------------------------
            */

            'invoiceAmount' =>
                $invoiceAmount,

            'totalPaid' =>
                $totalPaid,

            'remainingBalance' =>
                $remainingBalance,

            /*
            |--------------------------------------------------------------------------
            | DATES
            |--------------------------------------------------------------------------
            */

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

            /*
            |--------------------------------------------------------------------------
            | STATUS FLAGS
            |--------------------------------------------------------------------------
            */

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

            /*
            |--------------------------------------------------------------------------
            | EDIT
            |--------------------------------------------------------------------------
            */

            'canEdit' =>
                $canEdit,

            'isLocked' =>
                !$canEdit,

            /*
            |--------------------------------------------------------------------------
            | NOTES
            |--------------------------------------------------------------------------
            */

            'notes' =>
                $payment->notes,

            /*
            |--------------------------------------------------------------------------
            | OWNER / CLIENT ACCOUNT
            |--------------------------------------------------------------------------
            */

            'userId' =>
                $payment->user_id,

            'userName' =>
                $payment->user?->name,

            'userEmail' =>
                $payment->user?->email,

            'userRole' =>
                $payment->user?->role,

            /*
            |--------------------------------------------------------------------------
            | AUDIT
            |--------------------------------------------------------------------------
            */

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

            /*
            |--------------------------------------------------------------------------
            | INVOICE STATUS
            |--------------------------------------------------------------------------
            */

            'invoiceStatus' =>
                $invoice?->status,

            /*
            |--------------------------------------------------------------------------
            | ARCHIVE
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

            /*
            |--------------------------------------------------------------------------
            | ARCHIVE INFO
            |--------------------------------------------------------------------------
            */

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
                    $invoice->number,

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
    |
    | IMPORTANT:
    |
    | Amount is NEVER accepted from frontend.
    | Status is NEVER accepted from frontend.
    |
    | Editable:
    |
    | - Payment Method
    | - Payment Date
    | - Due Date
    | - Notes
    |
    | Partial amount = automatic 50%.
    |
    | Payment Date on Partial/Pending = Fully Paid.
    |
    */

    public function update(
        Request $request,
        Payment $payment
    ) {
        $this->authorizeAdmin();

        /*
        |--------------------------------------------------------------------------
        | ARCHIVED LOCK
        |--------------------------------------------------------------------------
        */

        if ($payment->archived) {
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
        |
        | NO amount.
        | NO status.
        | NO partial_date from frontend.
        |
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

                /*
                |--------------------------------------------------------------------------
                | PAYMENT METHOD
                |--------------------------------------------------------------------------
                */

                $payment->payment_method =
                    $validated['payment_method'];

                /*
                |--------------------------------------------------------------------------
                | INVOICE
                |--------------------------------------------------------------------------
                */

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

                    /*
                    |--------------------------------------------------------------------------
                    | PAYMENT DATE = FULLY PAID
                    |--------------------------------------------------------------------------
                    */

                    if (
                        !empty(
                            $validated['payment_date']
                        )
                    ) {

                        $payment->status =
                            'Paid';

                        /*
                        | Full invoice amount.
                        */

                        $payment->amount =
                            $invoiceAmount;

                        /*
                        | Keep original partial date.
                        */

                        if (!$payment->partial_date) {
                            $payment->partial_date =
                                now()->toDateString();
                        }

                        /*
                        | Final payment date.
                        */

                        $payment->payment_date =
                            $validated['payment_date'];

                        /*
                        | Paid = no due date.
                        */

                        $payment->due_date =
                            null;

                    } else {

                        /*
                        |--------------------------------------------------------------------------
                        | STILL PARTIAL
                        |--------------------------------------------------------------------------
                        */

                        $payment->status =
                            'Partial';

                        /*
                        | Always keep amount at 50%.
                        */

                        $payment->amount =
                            round(
                                $invoiceAmount / 2,
                                2
                            );

                        /*
                        | Automatically preserve/create
                        | partial payment date.
                        */

                        if (!$payment->partial_date) {
                            $payment->partial_date =
                                now()->toDateString();
                        }

                        /*
                        | No final payment date yet.
                        */

                        $payment->payment_date =
                            null;

                        /*
                        | Keep/update due date.
                        */

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

                    /*
                    |--------------------------------------------------------------------------
                    | PAYMENT DATE SUPPLIED
                    |--------------------------------------------------------------------------
                    |
                    | Pending -> Paid
                    |
                    */

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

                        /*
                        | Full invoice amount.
                        */

                        $payment->amount =
                            $invoiceAmount;

                        /*
                        | Final payment date.
                        */

                        $payment->payment_date =
                            $validated['payment_date'];

                        /*
                        | Pending had no partial payment.
                        */

                        $payment->partial_date =
                            null;

                        /*
                        | Paid = no due date.
                        */

                        $payment->due_date =
                            null;

                    } else {

                        /*
                        |--------------------------------------------------------------------------
                        | STILL PENDING
                        |--------------------------------------------------------------------------
                        */

                        $payment->status =
                            'Pending';

                        /*
                        | CRITICAL:
                        |
                        | Keep the existing amount.
                        | The edit form cannot change it.
                        */

                        $payment->amount =
                            $payment->getOriginal(
                                'amount'
                            );

                        /*
                        | No final payment date.
                        */

                        $payment->payment_date =
                            null;

                        /*
                        | Preserve any existing partial date.
                        */

                        $payment->partial_date =
                            $payment->partial_date;

                        /*
                        | Due date.
                        */

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
                | NEVER AUTO ARCHIVE
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

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

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
        | ARCHIVED LOCK
        |--------------------------------------------------------------------------
        */

        if ($payment->archived) {
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

                /*
                |--------------------------------------------------------------------------
                | FINAL PAYMENT DATE
                |--------------------------------------------------------------------------
                */

                $paymentDate =
                    now()->toDateString();

                /*
                |--------------------------------------------------------------------------
                | MARK PAID
                |--------------------------------------------------------------------------
                */

                $payment->status =
                    'Paid';

                /*
                |--------------------------------------------------------------------------
                | FULL INVOICE AMOUNT
                |--------------------------------------------------------------------------
                */

                $payment->amount =
                    $invoiceAmount;

                /*
                |--------------------------------------------------------------------------
                | FINAL PAYMENT DATE
                |--------------------------------------------------------------------------
                */

                $payment->payment_date =
                    $paymentDate;

                /*
                |--------------------------------------------------------------------------
                | KEEP PARTIAL DATE
                |--------------------------------------------------------------------------
                */

                $payment->partial_date =
                    $payment->partial_date;

                /*
                |--------------------------------------------------------------------------
                | PAID = NO DUE DATE
                |--------------------------------------------------------------------------
                */

                $payment->due_date =
                    null;

                /*
                |--------------------------------------------------------------------------
                | NEVER AUTO ARCHIVE
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
        | EMAIL
        |--------------------------------------------------------------------------
        */

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
        | ARCHIVED LOCK
        |--------------------------------------------------------------------------
        */

        if ($payment->archived) {
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

                /*
                |--------------------------------------------------------------------------
                | AUTOMATIC 50%
                |--------------------------------------------------------------------------
                */

                $halfPayment =
                    round(
                        $invoiceAmount / 2,
                        2
                    );

                /*
                |--------------------------------------------------------------------------
                | AUTOMATIC PARTIAL DATE
                |--------------------------------------------------------------------------
                */

                $partialDate =
                    $payment->partial_date
                    ?: now()->toDateString();

                /*
                |--------------------------------------------------------------------------
                | SAVE PARTIAL
                |--------------------------------------------------------------------------
                */

                $payment->status =
                    'Partial';

                /*
                | Amount automatically locked at 50%.
                */

                $payment->amount =
                    $halfPayment;

                /*
                |--------------------------------------------------------------------------
                | PARTIAL DATE
                |--------------------------------------------------------------------------
                */

                $payment->partial_date =
                    $partialDate;

                /*
                |--------------------------------------------------------------------------
                | FINAL PAYMENT DATE EMPTY
                |--------------------------------------------------------------------------
                */

                $payment->payment_date =
                    null;

                /*
                |--------------------------------------------------------------------------
                | KEEP DUE DATE
                |--------------------------------------------------------------------------
                */

                $payment->due_date =
                    $payment->due_date;

                /*
                |--------------------------------------------------------------------------
                | NEVER AUTO ARCHIVE
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
        | EMAIL
        |--------------------------------------------------------------------------
        */

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
    | ARCHIVE PAID PAYMENT
    |--------------------------------------------------------------------------
    */

    public function archive(
        Payment $payment
    ) {
        $this->authorizeAdmin();

        abort_unless(
            strtolower(
                trim(
                    (string) $payment->status
                )
            ) === 'paid',
            422,
            'Only Paid payments can be archived.'
        );

        abort_unless(
            !$payment->archived,
            422,
            'This payment is already archived.'
        );

        DB::transaction(
            function () use ($payment) {

                $archivedAt =
                    now();

                $payment->update([
                    'archived' =>
                        true,

                    'archived_at' =>
                        $archivedAt,

                    'archive_expires_at' =>
                        $archivedAt
                            ->copy()
                            ->addDays(
                                self::ARCHIVE_DAYS
                            ),

                    'delete_after' =>
                        $archivedAt
                            ->copy()
                            ->addYears(
                                self::DELETE_AFTER_YEARS
                            ),

                    'updated_by' =>
                        Auth::id(),

                    'edited_by' =>
                        Auth::id(),

                    'edited_at' =>
                        now(),
                ]);
            }
        );

        return back()->with(
            'success',
            'Paid payment has been archived successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UNARCHIVE
    |--------------------------------------------------------------------------
    */

    public function unarchive(
        Payment $payment
    ) {
        $this->authorizeAdmin();

        abort_unless(
            $payment->archived,
            422,
            'This payment is not archived.'
        );

        abort_unless(
            strtolower(
                trim(
                    (string) $payment->status
                )
            ) === 'paid',
            422,
            'Only Paid payments can be returned from Archive.'
        );

        $payment->update([
            'archived' =>
                false,

            'archived_at' =>
                null,

            'archive_expires_at' =>
                null,

            'delete_after' =>
                null,

            'updated_by' =>
                Auth::id(),

            'edited_by' =>
                Auth::id(),

            'edited_at' =>
                now(),
        ]);

        return back()->with(
            'success',
            'Payment returned to the Paid records.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CLEANUP EXPIRED ARCHIVES
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

        /*
        |--------------------------------------------------------------------------
        | FULLY PAID
        |--------------------------------------------------------------------------
        */

        if (
            $totalPaid >= $invoiceAmount
        ) {
            $invoice->status =
                'Paid';
        }

        /*
        |--------------------------------------------------------------------------
        | PARTIAL
        |--------------------------------------------------------------------------
        */

        elseif (
            $totalPaid > 0
        ) {
            $invoice->status =
                'Partial';
        }

        /*
        |--------------------------------------------------------------------------
        | PENDING
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | RECEIPT
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
        | INVOICE
        |--------------------------------------------------------------------------
        */

        $invoiceNumber =
            $payment->invoice_number
            ?: $payment->invoice?->number
            ?: 'N/A';

        /*
        |--------------------------------------------------------------------------
        | AMOUNT
        |--------------------------------------------------------------------------
        */

        $amount =
            number_format(
                (float) $payment->amount,
                2
            );

        /*
        |--------------------------------------------------------------------------
        | STATUS
        |--------------------------------------------------------------------------
        */

        $status =
            $payment->status
            ?: 'Pending';

        /*
        |--------------------------------------------------------------------------
        | INVOICE TOTAL
        |--------------------------------------------------------------------------
        */

        $invoiceAmount =
            $payment->invoice
            ? (float) $payment->invoice->amount
            : 0;

        /*
        |--------------------------------------------------------------------------
        | TOTAL PAID
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | REMAINING
        |--------------------------------------------------------------------------
        */

        $remaining =
            max(
                0,
                $invoiceAmount - $totalPaid
            );

        /*
        |--------------------------------------------------------------------------
        | SUBJECT
        |--------------------------------------------------------------------------
        */

        $subject =
            "ALIBATON Payment Status Update - {$receiptNumber}";

        /*
        |--------------------------------------------------------------------------
        | MESSAGE
        |--------------------------------------------------------------------------
        */

        $message =
            "Hello {$user->name},\n\n" .

            "Your payment has been reviewed by ALIBATON.\n\n" .

            "PAYMENT DETAILS\n" .
            "-------------------------\n" .

            "Receipt: {$receiptNumber}\n" .

            "Invoice: {$invoiceNumber}\n" .

            "Amount: ₱{$amount}\n" .

            "Status: {$status}\n";

        /*
        |--------------------------------------------------------------------------
        | PARTIAL DATE
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | FINAL PAYMENT DATE
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | DUE DATE
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | BALANCE
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | STATUS MESSAGE
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | FOOTER
        |--------------------------------------------------------------------------
        */

        $message .=
            "Thank you,\n" .
            "ALIBATON Heavy Equipment & Logistics Management System";

        /*
        |--------------------------------------------------------------------------
        | SEND
        |--------------------------------------------------------------------------
        */

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
