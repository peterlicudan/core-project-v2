<?php

namespace App\Http\Controllers;

use App\Mail\PaymentStatusMail;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class PaymentController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | PAYMENT CONFIGURATION
    |--------------------------------------------------------------------------
    */

    private const PAYMENT_METHODS = [
        'Bank Transfer',
        'Cheque',
    ];

    /*
    |--------------------------------------------------------------------------
    | STAFF ARCHIVE RETENTION
    |--------------------------------------------------------------------------
    */

    private const ARCHIVE_DAYS = 90;

    private const RETENTION_MONTHS = 6;

    /*
    |--------------------------------------------------------------------------
    | PAYMENT MANAGEMENT
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        abort_unless(
            $user,
            401,
            'Unauthenticated.'
        );

        /*
        |--------------------------------------------------------------------------
        | ADMIN
        |--------------------------------------------------------------------------
        */

        if (
            strtolower(
                (string) $user->role
            ) === 'admin'
        ) {
            return redirect()->route(
                'admin.payments'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SHARED PAYMENT RECORDS
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        | There is NO invoice_items table in this system.
        |
        | Sales Invoice Items are generated from:
        |
        | invoices.description
        | invoices.amount
        |
        | Quantity is 1.
        |
        */

        $payments = Payment::query()
            ->with([
                // ✅ Kasama ang billing_number (BILL-YYYY-NNN) at job order reference
                'invoice:id,number,billing_number,client,client_email,project,amount,status,due_date,description,job_order_id',
                'invoice.jobOrder:id,number',
                'user:id,name,email,role',
                'editor:id,name,email',
                'updatedBy:id,name,email',
            ])
            ->latest('id')
            ->get()
            ->map(function (
                Payment $payment
            ) {
                return $this->formatPayment(
                    $payment
                );
            })
            ->values();

        /*
        |--------------------------------------------------------------------------
        | SHARED INVOICES
        |--------------------------------------------------------------------------
        |
        | Invoice items are generated from the invoice itself.
        |
        */

        $invoices = Invoice::query()
            ->latest('id')
            ->get([
                'id',
                'number',
                'client',
                'client_email', // ✅ Added client_email
                'project',
                'amount',
                'status',
                'user_id',
                'due_date',
                'description',
                'job_order_id',
                'payment_method',
            ])
            ->map(function (
                Invoice $invoice
            ) {
                return [
                    'id' =>
                    $invoice->id,

                    'number' =>
                    $invoice->number ?? $invoice->billing_number,

                    'client' =>
                    $invoice->client,

                    'clientEmail' =>
                    $invoice->client_email, // ✅ Added client_email

                    'project' =>
                    $invoice->project,

                    'amount' =>
                    (float) $invoice->amount,

                    'status' =>
                    $invoice->status,

                    'userId' =>
                    $invoice->user_id,

                    'dueDate' =>
                    $invoice->due_date
                        ? $invoice->due_date->format(
                            'Y-m-d'
                        )
                        : null,

                    'paymentMethod' =>
                    $invoice->payment_method ?? 'Bank Transfer',

                    /*
                    |--------------------------------------------------------------------------
                    | SALES INVOICE ITEMS
                    |--------------------------------------------------------------------------
                    */

                    'items' =>
                    $this->formatInvoiceItems(
                        $invoice
                    ),
                ];
            })
            ->values();

        /*
        |--------------------------------------------------------------------------
        | ✅ NOTIFICATIONS
        |--------------------------------------------------------------------------
        */

        $notifications = $user
            ->notifications()
            ->take(20)
            ->get()
            ->map(fn($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'data' => $n->data,
                'read_at' => $n->read_at,
                'created_at' => $n->created_at->toISOString(),
            ]);

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'User/PaymentManagement',
            [
                'payments' =>
                $payments,

                'invoices' =>
                $invoices,

                'paymentMethods' =>
                self::PAYMENT_METHODS,

                'notifications' =>
                $notifications,

                'flash' => [
                    'success' =>
                    session('success'),

                    'error' =>
                    session('error'),
                ],
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT INVOICE ITEMS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | This project does NOT have an InvoiceItem model/table.
    |
    | Billing currently creates the visible invoice line item
    | directly from the Invoice record:
    |
    | quantity   = 1
    | particulars = invoice.description
    | unit price = invoice.amount
    | amount     = invoice.amount
    |
    */

    private function formatInvoiceItems(
        Invoice $invoice
    ): array {
        $description =
            trim(
                (string) (
                    $invoice->description
                    ?? ''
                )
            );

        if (
            $description === ''
        ) {
            $description =
                'Heavy Equipment & Logistics Service';
        }

        $amount =
            (float) (
                $invoice->amount
                ?? 0
            );

        return [
            [
                'id' =>
                $invoice->id,

                'quantity' =>
                1,

                'qty' =>
                1,

                'particulars' =>
                $description,

                'description' =>
                $description,

                'unitPrice' =>
                $amount,

                'unit_price' =>
                $amount,

                'amount' =>
                $amount,
            ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT PAYMENT
    |--------------------------------------------------------------------------
    */

    private function formatPayment(
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
            ?: '—';

        /*
        |--------------------------------------------------------------------------
        | ✅ CLIENT EMAIL
        |--------------------------------------------------------------------------
        */

        $clientEmail =
            $payment->client_email
            ?: $invoice?->client_email
            ?: null;

        /*
        |--------------------------------------------------------------------------
        | INVOICE NUMBER
        |--------------------------------------------------------------------------
        */

        $invoiceNumber =
            $payment->invoice_number
            ?: $invoice?->number
            ?: null;

        /*
        |--------------------------------------------------------------------------
        | RECEIPT NUMBER
        |--------------------------------------------------------------------------
        */

        $receiptNumber =
            $payment->receipt_number
            ?: $payment->receipt
            ?: 'PAY-' .
            str_pad(
                (string) $payment->id,
                4,
                '0',
                STR_PAD_LEFT
            );

        /*
        |--------------------------------------------------------------------------
        | DATABASE STATUS
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

        /*
        |--------------------------------------------------------------------------
        | STATUS FLAGS
        |--------------------------------------------------------------------------
        */

        $isPending =
            $normalizedStatus === 'pending';

        $isPartial =
            $normalizedStatus === 'partial';

        $isPaid =
            $normalizedStatus === 'paid';

        $isRejected =
            $normalizedStatus === 'rejected';

        /*
        |--------------------------------------------------------------------------
        | PAYMENT DATE
        |--------------------------------------------------------------------------
        */

        $paymentDate =
            $payment->payment_date
            ? $payment->payment_date->format(
                'Y-m-d'
            )
            : null;

        /*
        |--------------------------------------------------------------------------
        | PARTIAL DATE
        |--------------------------------------------------------------------------
        */

        $partialDate =
            $payment->partial_date
            ? $payment->partial_date->format(
                'Y-m-d'
            )
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
                $payment->due_date->format(
                    'Y-m-d'
                );
        }

        /*
        |--------------------------------------------------------------------------
        | DUE DATE CALCULATION
        |--------------------------------------------------------------------------
        */

        $isOverdue = false;

        $daysUntilDue = null;

        if (
            (
                $isPending ||
                $isPartial
            ) &&
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
            } else {
                $daysUntilDue =
                    $today->diffInDays(
                        $due
                    );

                $isOverdue = false;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | UNPAID
        |--------------------------------------------------------------------------
        */

        $isUnpaid =
            $isPending &&
            $isOverdue;

        /*
        |--------------------------------------------------------------------------
        | DUE STATUS
        |--------------------------------------------------------------------------
        */

        $dueStatus = null;

        if (
            $isUnpaid
        ) {
            $dueStatus =
                'Unpaid';
        } elseif (
            (
                $isPending ||
                $isPartial
            ) &&
            $dueDate
        ) {
            if (
                $daysUntilDue === 0
            ) {
                $dueStatus =
                    'Due Today';
            } elseif (
                $daysUntilDue !== null &&
                $daysUntilDue > 0
            ) {
                $dueStatus =
                    'Due';
            }
        }

        /*
        |--------------------------------------------------------------------------
        | INVOICE / PAYMENT AMOUNTS
        |--------------------------------------------------------------------------
        */

        $invoiceAmount =
            $invoice
            ? (float) $invoice->amount
            : null;

        $paymentAmount =
            (float) (
                $payment->amount ?? 0
            );

        /*
        |--------------------------------------------------------------------------
        | PAID AMOUNT
        |--------------------------------------------------------------------------
        */

        $paidAmount =
            (
                $isPartial ||
                $isPaid
            )
            ? $paymentAmount
            : 0.0;

        /*
        |--------------------------------------------------------------------------
        | REMAINING BALANCE
        |--------------------------------------------------------------------------
        */

        $remainingBalance = null;

        if (
            $invoiceAmount !== null
        ) {
            $remainingBalance =
                max(
                    0,
                    $invoiceAmount -
                        $paidAmount
                );
        }

        /*
        |--------------------------------------------------------------------------
        | SALES INVOICE ITEMS
        |--------------------------------------------------------------------------
        */

        $invoiceItems =
            $invoice
            ? $this->formatInvoiceItems(
                $invoice
            )
            : [];

        /*
        |--------------------------------------------------------------------------
        | SALES TOTAL
        |--------------------------------------------------------------------------
        */

        $salesTotal = 0.0;

        foreach (
            $invoiceItems as $item
        ) {
            $salesTotal +=
                (float) (
                    $item['amount'] ?? 0
                );
        }

        /*
        |--------------------------------------------------------------------------
        | VAT
        |--------------------------------------------------------------------------
        |
        | Same computation used by Billing:
        |
        | Sales Total       = ₱425,000.00
        | VAT 12%           = ₱51,000.00
        | Net of VAT        = ₱425,000.00
        | Total Amount Due  = ₱476,000.00
        |
        | Invoice amount is treated as the VAT-exclusive
        | / Net of VAT amount.
        |
        */

        $netOfVat =
            $invoiceAmount !== null
            ? $invoiceAmount
            : $salesTotal;

        $vatRate = 12;

        $vatAmount =
            round(
                $netOfVat *
                    ($vatRate / 100),
                2
            );

        $totalAmountDue =
            round(
                $netOfVat +
                    $vatAmount,
                2
            );

        /*
        |--------------------------------------------------------------------------
        | ARCHIVE INFORMATION
        |--------------------------------------------------------------------------
        */

        $archived =
            (bool) $payment->archived;

        $archiveExpiresAt =
            $payment->archive_expires_at;

        $deleteAfter =
            $payment->delete_after;

        $daysUntilExpiration =
            null;

        $archiveExpired =
            false;

        $readyForDeletion =
            false;

        /*
        |--------------------------------------------------------------------------
        | ARCHIVE EXPIRATION
        |--------------------------------------------------------------------------
        */

        if (
            $archived &&
            $archiveExpiresAt
        ) {
            $archiveExpiresAtDay =
                $archiveExpiresAt
                ->copy()
                ->startOfDay();

            $today =
                now()->startOfDay();

            if (
                $today->greaterThanOrEqualTo(
                    $archiveExpiresAtDay
                )
            ) {
                $daysUntilExpiration =
                    0;
            } else {
                $daysUntilExpiration =
                    $today->diffInDays(
                        $archiveExpiresAtDay
                    );
            }

            $archiveExpired =
                now()->greaterThanOrEqualTo(
                    $archiveExpiresAt
                );
        }

        /*
        |--------------------------------------------------------------------------
        | PERMANENT RETENTION / DELETE DATE
        |--------------------------------------------------------------------------
        */

        if (
            $archived &&
            $deleteAfter
        ) {
            $readyForDeletion =
                now()->greaterThanOrEqualTo(
                    $deleteAfter
                );
        }

        /*
        |--------------------------------------------------------------------------
        | RETURN FORMATTED PAYMENT
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

            'clientEmail' => $clientEmail, // ✅ Added clientEmail

            /*
            |--------------------------------------------------------------------------
            | INVOICE
            |--------------------------------------------------------------------------
            */

            'invoice' =>
            $invoiceNumber,

            'invoiceId' =>
            $payment->invoice_id,

            'invoiceNumber' =>
            $invoiceNumber,

            /*
            |--------------------------------------------------------------------------
            | ✅ REFERENCE NUMBERS (Billing No. + Job Order No.)
            |--------------------------------------------------------------------------
            |
            | BILLING NUMBER (BILL-YYYY-NNN) — mayroon agad sa pag-create ng
            | billing. Ito ang reference na hinahanap sa Payment Management.
            |
            */

            'billingNumber' =>
            $payment->billing_number
                ?: $invoice?->billing_number
                ?: null,

            'jobOrderNumber' =>
            $invoice?->jobOrder?->number
                ?: null,

            /*
            |--------------------------------------------------------------------------
            | PAYMENT
            |--------------------------------------------------------------------------
            */

            'method' =>
            $payment->payment_method ?? 'Bank Transfer',

            'paymentMethod' =>
            $payment->payment_method ?? 'Bank Transfer',

            'amount' =>
            $paymentAmount,

            /*
            |--------------------------------------------------------------------------
            | DATABASE STATUS
            |--------------------------------------------------------------------------
            */

            'status' =>
            $status,

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

            'isRejected' =>
            $isRejected,

            /*
            |--------------------------------------------------------------------------
            | PAID / PARTIAL AMOUNTS
            |--------------------------------------------------------------------------
            */

            'paidAmount' =>
            $paidAmount,

            'paid_amount' =>
            $paidAmount,

            'remainingBalance' =>
            $remainingBalance,

            'remaining_balance' =>
            $remainingBalance,

            /*
            |--------------------------------------------------------------------------
            | DUE / UNPAID
            |--------------------------------------------------------------------------
            */

            'dueDate' =>
            $dueDate,

            'due_date' =>
            $dueDate,

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
            | PARTIAL DATE
            |--------------------------------------------------------------------------
            */

            'partialDate' =>
            $partialDate,

            'partial_date' =>
            $partialDate,

            'partialPaymentDate' =>
            $partialDate,

            'partial_payment_date' =>
            $partialDate,

            /*
            |--------------------------------------------------------------------------
            | FINAL PAYMENT DATE
            |--------------------------------------------------------------------------
            */

            'paymentDate' =>
            $paymentDate,

            'payment_date' =>
            $paymentDate,

            /*
            |--------------------------------------------------------------------------
            | NOTES
            |--------------------------------------------------------------------------
            */

            'notes' =>
            $payment->notes,

            /*
            |--------------------------------------------------------------------------
            | OWNER / SUBMITTED BY
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
            | INVOICE INFORMATION
            |--------------------------------------------------------------------------
            */

            'invoiceAmount' =>
            $invoiceAmount,

            'invoiceStatus' =>
            $invoice?->status,

            'invoiceDueDate' =>
            $invoice?->due_date
                ? $invoice->due_date->format(
                    'Y-m-d'
                )
                : null,

            /*
            |--------------------------------------------------------------------------
            | SALES INVOICE ITEMS
            |--------------------------------------------------------------------------
            |
            | PaymentManagement.tsx can use invoiceItems.
            |
            */

            'invoiceItems' =>
            $invoiceItems,

            'salesInvoiceItems' =>
            $invoiceItems,

            /*
            |--------------------------------------------------------------------------
            | VAT / SALES INVOICE TOTALS
            |--------------------------------------------------------------------------
            */

            'salesTotal' =>
            $salesTotal,

            'netOfVat' =>
            $netOfVat,

            'vatRate' =>
            $vatRate,

            'vatAmount' =>
            $vatAmount,

            'totalAmountDue' =>
            $totalAmountDue,

            'vatInclusive' =>
            false,

            /*
            |--------------------------------------------------------------------------
            | ARCHIVE
            |--------------------------------------------------------------------------
            */

            'archived' =>
            $archived,

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
            | ARCHIVE OBJECT
            |--------------------------------------------------------------------------
            */

            'archiveInfo' =>
            $archived
                ? [

                    'archivedAt' =>
                    $payment->archived_at
                        ? $payment->archived_at->format(
                            'M d, Y'
                        )
                        : null,

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
    | CREATE PAYMENT
    |--------------------------------------------------------------------------
    */

    public function store(
        Request $request
    ) {
        $user = Auth::user();

        abort_unless(
            $user &&
                in_array(
                    strtolower(
                        (string) $user->role
                    ),
                    [
                        'staff',
                        'client',
                    ],
                    true
                ),
            403,
            'You are not authorized to submit payments.'
        );

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'invoice_id' => [
                'nullable',
                'integer',
                'exists:invoices,id',
            ],

            'receipt' => [
                'nullable',
                'string',
                'max:100',
            ],

            'receipt_number' => [
                'nullable',
                'string',
                'max:100',
            ],

            'client' => [
                'nullable',
                'string',
                'max:255',
            ],

            'client_email' => [ // ✅ Added client_email validation
                'nullable',
                'email',
                'max:255',
            ],

            'invoice_number' => [
                'nullable',
                'string',
                'max:100',
            ],

            'payment_method' => [
                'nullable',
                'string',
                'in:Bank Transfer,Cheque',
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999',
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
        | FIND INVOICE
        |--------------------------------------------------------------------------
        |
        | No invoice.items relation.
        |
        */

        $invoice = null;

        if (
            !empty($validated['invoice_id'])
        ) {
            $invoice =
                Invoice::query()
                ->where(
                    'id',
                    $validated['invoice_id']
                )
                ->first();

            abort_unless(
                $invoice,
                403,
                'The selected invoice does not exist.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CLIENT
        |--------------------------------------------------------------------------
        */

        $client =
            $invoice?->client
            ?: (
                $validated['client']
                ?? null
            )
            ?: $user->name;

        /*
        |--------------------------------------------------------------------------
        | ✅ CLIENT EMAIL
        |--------------------------------------------------------------------------
        */

        $clientEmail =
            $invoice?->client_email
            ?: (
                $validated['client_email']
                ?? null
            );

        /*
        |--------------------------------------------------------------------------
        | INVOICE NUMBER
        |--------------------------------------------------------------------------
        */

        $invoiceNumber =
            $invoice?->number
            ?: (
                $validated['invoice_number']
                ?? null
            );

        /*
        |--------------------------------------------------------------------------
        | RECEIPT
        |--------------------------------------------------------------------------
        */

        $receipt =
            $validated['receipt']
            ?? null;

        $receiptNumber =
            $validated['receipt_number']
            ?? $receipt;

        /*
        |--------------------------------------------------------------------------
        | GET PAYMENT METHOD - AUTO-POPULATE FROM INVOICE
        |--------------------------------------------------------------------------
        */

        $paymentMethod = $invoice?->payment_method
            ?? $validated['payment_method']
            ?? 'Bank Transfer';

        /*
        |--------------------------------------------------------------------------
        | CREATE SHARED PAYMENT
        |--------------------------------------------------------------------------
        */

        $payment = Payment::create([
            'user_id' =>
            $user->id,

            'invoice_id' =>
            $invoice?->id,

            'receipt_number' =>
            $receiptNumber,

            'receipt' =>
            $receipt,

            'client' =>
            $client,

            'client_email' => $clientEmail, // ✅ Added client_email

            'invoice_number' =>
            $invoiceNumber,

            'payment_method' =>
            $paymentMethod,

            'amount' =>
            $validated['amount'],

            'status' =>
            'Pending',

            'payment_date' =>
            null,

            'partial_date' =>
            null,

            'partial_amount' =>
            null,

            'remaining_balance' =>
            $invoice
                ? max(
                    0,
                    (float) $invoice->amount
                        -
                        (float) $validated['amount']
                )
                : null,

            'due_date' =>
            $validated['due_date']
                ?? $invoice?->due_date
                ?? null,

            'notes' =>
            $validated['notes']
                ?? null,

            'archived' =>
            false,

            'archived_at' =>
            null,

            'archive_expires_at' =>
            null,

            'delete_after' =>
            null,

            'edited_by' =>
            null,

            'edited_at' =>
            null,

            'updated_by' =>
            null,
        ]);

        /*
        |--------------------------------------------------------------------------
        | INVOICE STATUS
        |--------------------------------------------------------------------------
        */

        if ($invoice) {
            $invoice->update([
                'status' =>
                'Pending',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Payment submitted successfully and is now Pending for Admin verification.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STAFF / CLIENT UPDATE PAYMENT
    |--------------------------------------------------------------------------
    */

    public function staffUpdate(
        Request $request,
        Payment $payment
    ) {
        $user = Auth::user();

        /*
        |--------------------------------------------------------------------------
        | SECURITY
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user &&
                in_array(
                    strtolower(
                        (string) $user->role
                    ),
                    [
                        'staff',
                        'client',
                    ],
                    true
                ),
            403,
            'You are not authorized to update payments.'
        );

        /*
        |--------------------------------------------------------------------------
        | ARCHIVED
        |--------------------------------------------------------------------------
        */

        abort_if(
            (bool) $payment->archived,
            403,
            'Archived payments cannot be modified.'
        );

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
        | PAID
        |--------------------------------------------------------------------------
        */

        abort_if(
            $currentStatus === 'paid',
            403,
            'Paid payments cannot be modified by staff.'
        );

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'payment_method' => [
                'required',
                'string',
                'in:Bank Transfer,Cheque',
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:999999999',
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
        | UPDATE DATA
        |--------------------------------------------------------------------------
        */

        $updateData = [
            'payment_method' =>
            $validated['payment_method'],

            'amount' =>
            $validated['amount'],

            'payment_date' =>
            null,

            'notes' =>
            $validated['notes']
                ?? null,

            'due_date' =>
            $validated['due_date']
                ?? null,

            'updated_by' =>
            $user->id,
        ];

        /*
        |--------------------------------------------------------------------------
        | RESET REJECTED / PARTIAL
        |--------------------------------------------------------------------------
        */

        if (
            in_array(
                $currentStatus,
                [
                    'rejected',
                    'partial',
                ],
                true
            )
        ) {
            $updateData['status'] =
                'Pending';

            $updateData['partial_date'] =
                null;

            $updateData['partial_amount'] =
                null;
        }

        /*
        |--------------------------------------------------------------------------
        | RECALCULATE BALANCE
        |--------------------------------------------------------------------------
        */

        if ($payment->invoice) {
            $invoiceAmount =
                (float) $payment
                    ->invoice
                    ->amount;

            $newAmount =
                (float) $validated['amount'];

            $updateData['remaining_balance'] =
                max(
                    0,
                    $invoiceAmount -
                        $newAmount
                );
        }

        /*
        |--------------------------------------------------------------------------
        | SAVE
        |--------------------------------------------------------------------------
        */

        $payment->update(
            $updateData
        );

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Payment details updated successfully and are now shared with Admin.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STAFF ARCHIVE PAID PAYMENT
    |--------------------------------------------------------------------------
    */

    public function archive(
        Request $request,
        Payment $payment
    ) {
        $user = Auth::user();

        /*
        |--------------------------------------------------------------------------
        | STAFF ONLY
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user &&
                strtolower(
                    (string) $user->role
                ) === 'staff',
            403,
            'Only staff members can archive payment records.'
        );

        /*
        |--------------------------------------------------------------------------
        | ALREADY ARCHIVED
        |--------------------------------------------------------------------------
        */

        abort_if(
            (bool) $payment->archived,
            400,
            'This payment is already archived.'
        );

        /*
        |--------------------------------------------------------------------------
        | ONLY PAID PAYMENTS CAN BE ARCHIVED
        |--------------------------------------------------------------------------
        */

        $status =
            strtolower(
                trim(
                    (string) (
                        $payment->status
                        ?: ''
                    )
                )
            );

        abort_unless(
            $status === 'paid',
            403,
            'Only Paid payments can be archived.'
        );

        /*
        |--------------------------------------------------------------------------
        | ARCHIVE DATE
        |--------------------------------------------------------------------------
        */

        $archiveDate =
            now();

        /*
        |--------------------------------------------------------------------------
        | 90-DAY ARCHIVE EXPIRATION
        |--------------------------------------------------------------------------
        */

        $archiveExpiresAt =
            $archiveDate
            ->copy()
            ->addDays(
                self::ARCHIVE_DAYS
            );

        /*
        |--------------------------------------------------------------------------
        | 6-MONTH PERMANENT RETENTION DATE
        |--------------------------------------------------------------------------
        */

        $deleteAfter =
            $archiveDate
            ->copy()
            ->addMonthsNoOverflow(
                self::RETENTION_MONTHS
            );

        /*
        |--------------------------------------------------------------------------
        | SAVE ARCHIVE
        |--------------------------------------------------------------------------
        */

        $payment->update([
            'archived' =>
            true,

            'archived_at' =>
            $archiveDate,

            'archive_expires_at' =>
            $archiveExpiresAt,

            'delete_after' =>
            $deleteAfter,

            'updated_by' =>
            $user->id,
        ]);

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Paid payment archived successfully. The record will remain in Archive for 90 days, with permanent retention scheduled after 6 months.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RESTORE ARCHIVED PAYMENT
    |--------------------------------------------------------------------------
    */

    public function restore(
        Request $request,
        Payment $payment
    ) {
        $user = Auth::user();

        /*
        |--------------------------------------------------------------------------
        | STAFF ONLY
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user &&
                strtolower(
                    (string) $user->role
                ) === 'staff',
            403,
            'Only staff members can restore payment records.'
        );

        /*
        |--------------------------------------------------------------------------
        | MUST BE ARCHIVED
        |--------------------------------------------------------------------------
        */

        abort_unless(
            (bool) $payment->archived,
            400,
            'This payment is not archived.'
        );

        /*
        |--------------------------------------------------------------------------
        | ONLY PAID PAYMENTS CAN BE RESTORED
        |--------------------------------------------------------------------------
        */

        $status =
            strtolower(
                trim(
                    (string) (
                        $payment->status
                        ?: ''
                    )
                )
            );

        abort_unless(
            $status === 'paid',
            403,
            'Only Paid payment records can be restored.'
        );

        /*
        |--------------------------------------------------------------------------
        | RESTORE PAYMENT
        |--------------------------------------------------------------------------
        */

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
            $user->id,
        ]);

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Paid payment restored successfully and returned to the active payment records.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SEND PAYMENT RECORD / SOA EMAIL
    |--------------------------------------------------------------------------
    */

    public function sendRecordEmail(
        Request $request,
        Payment $payment
    ) {
        $user = Auth::user();

        /*
        |--------------------------------------------------------------------------
        | SECURITY
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user &&
                in_array(
                    strtolower(
                        (string) $user->role
                    ),
                    [
                        'admin',
                        'staff',
                    ],
                    true
                ),
            403,
            'Only administrators and staff can send payment emails.'
        );

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
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

            'soa_content' => [
                'nullable',
                'string',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | LOAD RELATIONSHIPS
        |--------------------------------------------------------------------------
        |
        | There is NO invoice.items relationship.
        |
        */

        $payment->load([
            'user:id,name,email,role',

            'invoice:id,number,client,client_email,project,amount,status,due_date,description,job_order_id', // ✅ Added client_email
        ]);

        /*
        |--------------------------------------------------------------------------
        | RECEIPT
        |--------------------------------------------------------------------------
        */

        $receiptNumber =
            $payment->receipt_number
            ?: $payment->receipt
            ?: 'PAY-' .
            str_pad(
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
        | CLIENT
        |--------------------------------------------------------------------------
        */

        $client =
            $payment->client
            ?: $payment->invoice?->client
            ?: $payment->user?->name
            ?: 'Unknown Client';

        /*
        |--------------------------------------------------------------------------
        | ✅ CLIENT EMAIL (for email)
        |--------------------------------------------------------------------------
        */

        $clientEmail =
            $payment->client_email
            ?: $payment->invoice?->client_email
            ?: null;

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
        | PAYMENT METHOD
        |--------------------------------------------------------------------------
        */

        $paymentMethod =
            $payment->payment_method
            ?: 'N/A';

        /*
        |--------------------------------------------------------------------------
        | FINAL PAYMENT DATE
        |--------------------------------------------------------------------------
        */

        $paymentDate =
            $payment->payment_date
            ? $payment->payment_date->format(
                'F d, Y'
            )
            : 'N/A';

        /*
        |--------------------------------------------------------------------------
        | PARTIAL PAYMENT DATE
        |--------------------------------------------------------------------------
        */

        $partialDate =
            $payment->partial_date
            ? $payment->partial_date->format(
                'F d, Y'
            )
            : 'N/A';

        /*
        |--------------------------------------------------------------------------
        | DUE DATE
        |--------------------------------------------------------------------------
        */

        $isPaid =
            strtolower(
                trim(
                    (string) $payment->status
                )
            ) === 'paid';

        $dueDate =
            !$isPaid &&
            $payment->due_date
            ? $payment->due_date->format(
                'F d, Y'
            )
            : 'N/A';

        /*
        |--------------------------------------------------------------------------
        | REMAINING BALANCE
        |--------------------------------------------------------------------------
        */

        $remainingBalance = null;

        if (
            $payment->invoice
        ) {
            $invoiceAmount =
                (float) $payment
                    ->invoice
                    ->amount;

            $normalizedStatus =
                strtolower(
                    trim(
                        (string) $payment->status
                    )
                );

            if (
                $normalizedStatus === 'partial'
            ) {
                $paidAmount =
                    (float) $payment->amount;
            } elseif (
                $isPaid
            ) {
                $paidAmount =
                    $invoiceAmount;
            } else {
                $paidAmount =
                    0;
            }

            $remainingBalance =
                max(
                    0,
                    $invoiceAmount -
                        $paidAmount
                );
        }

        /*
        |--------------------------------------------------------------------------
        | SUBJECT
        |--------------------------------------------------------------------------
        */

        $subject =
            $validated['subject']
            ?: "ALIBATON Statement of Account - {$receiptNumber}";

        /*
        |--------------------------------------------------------------------------
        | BASE MESSAGE
        |--------------------------------------------------------------------------
        */

        $message =
            $validated['message']
            ?: "Hello {$client},\n\n" .
            "Please find the Statement of Account details below.\n\n" .
            "PAYMENT DETAILS\n" .
            "-------------------------\n" .
            "Receipt: {$receiptNumber}\n" .
            "Invoice: {$invoiceNumber}\n" .
            "Client: {$client}\n" .
            "Client Email: {$clientEmail}\n" .
            "Payment Method: {$paymentMethod}\n" .
            "Amount: ₱{$amount}\n" .
            "Status: {$status}\n" .
            "Payment Date: {$paymentDate}\n" .
            (
                $payment->partial_date
                ? "Partial Payment Date: {$partialDate}\n"
                : ''
            ) .
            (
                !$isPaid
                ? "Due Date: {$dueDate}\n"
                : ''
            ) .
            (
                $remainingBalance !== null
                ? "Remaining Balance: ₱" .
                number_format(
                    $remainingBalance,
                    2
                ) .
                "\n"
                : ''
            ) .
            (
                $payment->notes
                ? "\nNotes:\n{$payment->notes}\n"
                : ''
            ) .
            "\nIf you have any questions regarding this payment, " .
            "please contact ALIBATON.\n\n" .
            "Thank you,\n" .
            "ALIBATON Heavy Equipment & Logistics Management System";

        /*
        |--------------------------------------------------------------------------
        | GET SOA CONTENT (from frontend)
        |--------------------------------------------------------------------------
        */

        $soaContent = $request->input('soa_content');

        // Build full email with SOA
        $fullMessage = $message;

        if ($soaContent) {
            $fullMessage .= "\n\n" . str_repeat('=', 70) . "\n";
            $fullMessage .= "STATEMENT OF ACCOUNT (SOA)\n";
            $fullMessage .= str_repeat('=', 70) . "\n\n";
            $fullMessage .= $soaContent;
            $fullMessage .= "\n\n" . str_repeat('=', 70);
        }

        /*
        |--------------------------------------------------------------------------
        | SEND
        |--------------------------------------------------------------------------
        */

        try {
            Mail::to(
                $validated['email']
            )->send(
                new PaymentStatusMail(
                    $payment,
                    $subject,
                    $fullMessage
                )
            );
        } catch (
            \Throwable $e
        ) {
            report($e);

            return back()
                ->withErrors([
                    'email' =>
                    'Email could not be sent. Please check your SMTP/mail configuration.',
                ])
                ->withInput();
        }

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            "Statement of Account sent successfully to {$validated['email']}."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ NOTIFICATIONS (BAGONG DAGDAG)
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | ✅ NOTIFICATIONS
    |--------------------------------------------------------------------------
    */

    /**
     * Get notifications (para sa bell icon polling)
     */
    public function getNotifications()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $notifications = $user
            ->notifications()
            ->take(50)
            ->get()
            ->map(fn($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'data' => $n->data,
                'read_at' => $n->read_at,
                'created_at' => $n->created_at->toISOString(),
            ]);

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark single notification as read
     */
    public function markNotificationRead($id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $notification = $user->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllNotificationsRead()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $user->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Record a payment (nag-ti-trigger ng notification)
     */
    public function recordPayment(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'method' => 'required|string',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $payment->transactions()->create([
            'amount' => $validated['amount'],
            'date' => $validated['payment_date'],
            'type' => 'Partial',
            'status' => 'Completed',
            'method' => $validated['method'],
            'reference' => $validated['reference'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        event(new \App\Events\PaymentReceived($payment->fresh()));

        return back()->with(
            'success',
            'Payment recorded successfully! Status updated.'
        );
    }
}
