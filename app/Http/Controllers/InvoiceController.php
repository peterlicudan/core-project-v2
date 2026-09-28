<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\JobOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use App\Mail\InvoiceMail;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    |
    | Display all invoices and all Job Orders that are available to Billing.
    |
    | IMPORTANT:
    | - No fake Job Orders.
    | - All records come directly from the database.
    | - All Staff/Admin users can see shared billing records.
    |
    */

    public function index(): Response
    {
        $this->authorizeStaffOrAdmin();

        /*
        |--------------------------------------------------------------------------
        | INVOICES
        |--------------------------------------------------------------------------
        |
        | Load:
        | - invoice owner/staff
        | - related Job Order
        |
        */

        $invoices = Invoice::query()
            ->with([
                'user:id,name,email,role',
                'jobOrder:id,number,status,client,project,amount',
            ])
            ->latest('created_at')
            ->get()
            ->map(function (Invoice $invoice) {
                return $this->transformInvoice($invoice);
            })
            ->values();

        /*
        |--------------------------------------------------------------------------
        | JOB ORDERS
        |--------------------------------------------------------------------------
        |
        | Billing needs the actual Job Orders from the database.
        |
        | These are NOT fake records.
        |
        */

        $jobOrders = JobOrder::query()
            ->with([
                'user:id,name,email,role',
                'generatedBy:id,name,email,role',
                'invoice:id,job_order_id,number,status,amount,due_date',
            ])
            ->latest('created_at')
            ->get()
            ->map(function (JobOrder $jobOrder) {
                return $this->transformJobOrder($jobOrder);
            })
            ->values();

        return Inertia::render('User/BillingInvoicing', [
            'invoices' => $invoices,

            'jobOrders' => $jobOrders,

            /*
            |--------------------------------------------------------------------------
            | Compatibility
            |--------------------------------------------------------------------------
            |
            | If your current BillingInvoicing.tsx uses "records",
            | it will still receive the Job Order records.
            |
            */

            'records' => $jobOrders,

            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    */

    public function show(Invoice $invoice): Response
    {
        $this->authorizeInvoice($invoice);

        /*
        |--------------------------------------------------------------------------
        | Load database relationships
        |--------------------------------------------------------------------------
        */

        $invoice->load([
            'user:id,name,email,role',
            'jobOrder:id,number,status,client,project,amount,user_id,generated_at,generated_by',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Load related Job Order
        |--------------------------------------------------------------------------
        |
        | This makes the Billing page aware that this invoice came
        | from a specific Job Order.
        |
        */

        $jobOrders = $invoice->jobOrder
            ? collect([
                $this->transformJobOrder(
                    $invoice->jobOrder->load([
                        'user:id,name,email,role',
                        'generatedBy:id,name,email,role',
                        'invoice:id,job_order_id,number,status,amount,due_date',
                    ])
                ),
            ])
            : collect();

        return Inertia::render('User/BillingInvoicing', [
            'invoices' => [
                $this->transformInvoice($invoice),
            ],

            'jobOrders' => $jobOrders,

            'records' => $jobOrders,

            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    |
    | Manual invoice creation from Billing.
    |
    | This remains available so your existing Billing page does not break.
    |
    | Job Order generated invoices use:
    |
    | JobOrderController::generateInvoice()
    |
    */

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        abort_unless(
            $user &&
                in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to create billing records.'
        );

        $validated = $request->validate([
            'number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('invoices', 'number'),
            ],

            'client' => [
                'required',
                'string',
                'max:255',
            ],

            'project' => [
                'required',
                'string',
                'max:255',
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0',
            ],

            'due_date' => [
                'nullable',
                'date',
            ],

            'client_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'client_address' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Manual invoice
        |--------------------------------------------------------------------------
        |
        | No Job Order is attached here unless the invoice is generated
        | through JobOrderController::generateInvoice().
        |
        */

        $validated['job_order_id'] = null;

        $validated['user_id'] = $user->id;

        $validated['status'] = 'Pending';

        $invoice = Invoice::create($validated);

        return redirect()
            ->route('billing.invoicing')
            ->with(
                'success',
                "Invoice {$invoice->number} created successfully."
            );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        Invoice $invoice
    ): RedirectResponse {
        $this->authorizeInvoice($invoice);

        $validated = $request->validate([
            'number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('invoices', 'number')
                    ->ignore($invoice->id),
            ],

            'client' => [
                'required',
                'string',
                'max:255',
            ],

            'project' => [
                'required',
                'string',
                'max:255',
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0',
            ],

            'due_date' => [
                'nullable',
                'date',
            ],

            'client_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'client_address' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Do NOT change status through normal edit
        |--------------------------------------------------------------------------
        */

        unset($validated['status']);

        /*
        |--------------------------------------------------------------------------
        | Do NOT change invoice owner
        |--------------------------------------------------------------------------
        */

        unset($validated['user_id']);

        /*
        |--------------------------------------------------------------------------
        | Do NOT change Job Order relationship through normal edit
        |--------------------------------------------------------------------------
        |
        | Once an invoice is connected to a Job Order, that relationship
        | should remain intact.
        |
        */

        unset($validated['job_order_id']);

        $invoice->update($validated);

        return redirect()
            ->route('billing.invoicing')
            ->with(
                'success',
                "Invoice {$invoice->number} updated successfully."
            );
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy(Invoice $invoice): RedirectResponse
    {
        $this->authorizeInvoice($invoice);

        $invoiceNumber = $invoice->number;

        /*
        |--------------------------------------------------------------------------
        | Delete invoice
        |--------------------------------------------------------------------------
        |
        | Because invoices.job_order_id is nullOnDelete(), deleting the
        | Job Order would not delete the invoice automatically.
        |
        | Here we only delete the invoice itself.
        |
        */

        $invoice->delete();

        return redirect()
            ->route('billing.invoicing')
            ->with(
                'success',
                "Invoice {$invoiceNumber} deleted successfully."
            );
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL TO CLIENT
    |--------------------------------------------------------------------------
    |
    | Send invoice email to the client.
    | Only available for Approved or Rejected invoices.
    |
    */

    public function sendEmail(Request $request, $id): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:5000',
        ]);

        $invoice = Invoice::findOrFail($id);

        // Check if user is authorized
        $user = Auth::user();
        abort_unless(
            $user && in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to send invoice emails.'
        );

        // Check if invoice is Approved or Rejected
        if (!in_array($invoice->status, ['Approved', 'Rejected'])) {
            return redirect()
                ->back()
                ->with('error', 'Only approved or rejected invoices can be sent to the client.');
        }

        try {
            // Send email
            Mail::to($request->email)->send(new InvoiceMail(
                $invoice,
                $request->subject,
                $request->message
            ));

            // Update invoice
            $invoice->sent_at = now();
            $invoice->sent_by = $user->name ?? $user->email;
            $invoice->save();

            return redirect()
                ->back()
                ->with('success', "Invoice {$invoice->number} has been sent to {$request->email}.");
        } catch (\Exception $e) {
            // Log the error
            Log::error('Invoice email failed: ' . $e->getMessage());

            return redirect()
                ->back()
                ->with('error', 'Failed to send invoice email. Please try again.');
        }
    }

    /*
    |--------------------------------------------------------------------------
    | RESUBMIT REJECTED INVOICE
    |--------------------------------------------------------------------------
    |
    | Staff can resubmit a rejected invoice back to PENDING status.
    |
    */

    public function resubmit(Request $request, $id): RedirectResponse
    {
        $invoice = Invoice::findOrFail($id);

        $user = Auth::user();
        abort_unless(
            $user && in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to resubmit invoices.'
        );

        // Check if invoice is rejected
        if ($invoice->status !== 'Rejected') {
            return redirect()
                ->back()
                ->with('error', 'Only rejected invoices can be resubmitted.');
        }

        // Update status back to Pending
        $invoice->status = 'Pending';
        $invoice->rejection_reason = null;
        $invoice->rejected_at = null;
        $invoice->rejected_by = null;
        $invoice->save();

        // Update related job order if exists
        if ($invoice->jobOrder) {
            $invoice->jobOrder->status = 'Pending';
            $invoice->jobOrder->rejection_reason = null;
            $invoice->jobOrder->save();
        }

        return redirect()
            ->back()
            ->with('success', "Invoice {$invoice->number} has been resubmitted and is now PENDING for review.");
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM INVOICE
    |--------------------------------------------------------------------------
    */

    private function transformInvoice(
        Invoice $invoice
    ): array {
        $amount = (float) $invoice->amount;

        $dueDate = $invoice->due_date
            ? $invoice->due_date->format('Y-m-d')
            : null;

        $createdAt = $invoice->created_at
            ? $invoice->created_at->format('Y-m-d')
            : null;

        $updatedAt = $invoice->updated_at
            ? $invoice->updated_at->format('Y-m-d')
            : null;

        $description = $invoice->description
            ?: 'Heavy Equipment & Logistics Service';

        $status = $this->getInvoiceStatus($invoice);

        return [
            /*
            |--------------------------------------------------------------------------
            | Basic Invoice
            |--------------------------------------------------------------------------
            */

            'id' => $invoice->id,

            'number' => $invoice->number,

            'client' => $invoice->client,

            'project' => $invoice->project,

            'amount' => $amount,

            'status' => $status,

            'dueDate' => $dueDate,

            'createdAt' => $createdAt,

            'updatedAt' => $updatedAt,

            /*
            |--------------------------------------------------------------------------
            | Client Information
            |--------------------------------------------------------------------------
            */

            'clientEmail' => $invoice->client_email,

            'clientAddress' => $invoice->client_address,

            'clientContact' => '',

            /*
            |--------------------------------------------------------------------------
            | Description / Notes
            |--------------------------------------------------------------------------
            */

            'description' => $description,

            'notes' => $invoice->notes ?? '',

            /*
            |--------------------------------------------------------------------------
            | Invoice Items
            |--------------------------------------------------------------------------
            */

            'items' => [
                [
                    'id' => $invoice->id,

                    'description' => $description,

                    'quantity' => 1,

                    'unitPrice' => $amount,
                ],
            ],

            'taxRate' => 0,

            /*
            |--------------------------------------------------------------------------
            | JOB ORDER CONNECTION
            |--------------------------------------------------------------------------
            |
            | This is the important database connection.
            |
            | invoices.job_order_id
            |        ↓
            | job_orders.id
            |
            */

            'jobOrderId' => $invoice->job_order_id,

            'jobOrderNumber' => $invoice->jobOrder?->number,

            'createdFromJobOrder' => $invoice->job_order_id !== null,

            'jobOrder' => $invoice->jobOrder
                ? [
                    'id' => $invoice->jobOrder->id,

                    'number' => $invoice->jobOrder->number,

                    'status' => $invoice->jobOrder->status,

                    'client' => $invoice->jobOrder->client,

                    'project' => $invoice->jobOrder->project,

                    'amount' => (float) $invoice->jobOrder->amount,
                ]
                : null,

            /*
            |--------------------------------------------------------------------------
            | STAFF ASSIGNMENT
            |--------------------------------------------------------------------------
            */

            'staffId' => $invoice->user_id,

            'staffName' => $invoice->user?->name
                ?? 'Unassigned',

            'staffEmail' => $invoice->user?->email
                ?? null,

            'userId' => $invoice->user_id,

            'user' => $invoice->user
                ? [
                    'id' => $invoice->user->id,

                    'name' => $invoice->user->name,

                    'email' => $invoice->user->email,

                    'role' => $invoice->user->role,
                ]
                : null,

            /*
            |--------------------------------------------------------------------------
            | SENT INFORMATION
            |--------------------------------------------------------------------------
            */

            'sentAt' => $this->formatDate($invoice->sent_at),

            'sentBy' => $invoice->sent_by,

            /*
            |--------------------------------------------------------------------------
            | REJECTION INFORMATION
            |--------------------------------------------------------------------------
            */

            'rejectionReason' => $invoice->rejection_reason,

            'rejectedAt' => $this->formatDate($invoice->rejected_at),

            'rejectedBy' => $invoice->rejected_by,

            /*
            |--------------------------------------------------------------------------
            | APPROVAL INFORMATION
            |--------------------------------------------------------------------------
            */

            'approvedAt' => $this->formatDate($invoice->approved_at),

            'approvedBy' => $invoice->approved_by,

            'approvalNotes' => $invoice->approval_notes,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM JOB ORDER
    |--------------------------------------------------------------------------
    |
    | Converts the actual Job Order database record into the structure
    | expected by the React Billing page.
    |
    */

    private function transformJobOrder(
        JobOrder $jobOrder
    ): array {
        return [
            /*
            |--------------------------------------------------------------------------
            | Basic
            |--------------------------------------------------------------------------
            */

            'id' => $jobOrder->id,

            'number' => $jobOrder->number,

            /*
            |--------------------------------------------------------------------------
            | Assignment
            |--------------------------------------------------------------------------
            */

            'userId' => $jobOrder->user_id,

            'staffId' => $jobOrder->user_id,

            'staffName' => $jobOrder->user?->name
                ?? 'Unassigned',

            'staffEmail' => $jobOrder->user?->email
                ?? null,

            /*
            |--------------------------------------------------------------------------
            | Client
            |--------------------------------------------------------------------------
            */

            'client' => $jobOrder->client,

            'clientEmail' => $jobOrder->client_email,

            'clientContact' => $jobOrder->client_contact,

            'clientAddress' => $jobOrder->client_address,

            /*
            |--------------------------------------------------------------------------
            | Project
            |--------------------------------------------------------------------------
            */

            'project' => $jobOrder->project,

            'location' => $jobOrder->location,

            /*
            |--------------------------------------------------------------------------
            | Equipment
            |--------------------------------------------------------------------------
            */

            'equipment' => $jobOrder->equipment,

            'operator' => $jobOrder->operator,

            /*
            |--------------------------------------------------------------------------
            | Dates
            |--------------------------------------------------------------------------
            */

            'startDate' => $jobOrder->start_date
                ? $jobOrder->start_date->format('Y-m-d')
                : null,

            'endDate' => $jobOrder->end_date
                ? $jobOrder->end_date->format('Y-m-d')
                : null,

            /*
            |--------------------------------------------------------------------------
            | Financial
            |--------------------------------------------------------------------------
            */

            'amount' => (float) $jobOrder->amount,

            /*
            |--------------------------------------------------------------------------
            | Description
            |--------------------------------------------------------------------------
            */

            'description' => $jobOrder->description,

            'notes' => $jobOrder->notes,

            /*
            |--------------------------------------------------------------------------
            | Status
            |--------------------------------------------------------------------------
            */

            'status' => $jobOrder->status,

            /*
            |--------------------------------------------------------------------------
            | Generated Information
            |--------------------------------------------------------------------------
            */

            'generatedAt' => $jobOrder->generated_at
                ? $jobOrder->generated_at->format('Y-m-d H:i:s')
                : null,

            'generatedBy' => $jobOrder->generatedBy
                ? [
                    'id' => $jobOrder->generatedBy->id,

                    'name' => $jobOrder->generatedBy->name,

                    'email' => $jobOrder->generatedBy->email,
                ]
                : null,

            /*
            |--------------------------------------------------------------------------
            | Invoice Connection
            |--------------------------------------------------------------------------
            */

            'hasInvoice' => $jobOrder->invoice !== null,

            'invoiceId' => $jobOrder->invoice?->id,

            'invoiceNumber' => $jobOrder->invoice?->number,

            'invoice' => $jobOrder->invoice
                ? [
                    'id' => $jobOrder->invoice->id,

                    'number' => $jobOrder->invoice->number,

                    'status' => $jobOrder->invoice->status,

                    'amount' => (float) $jobOrder->invoice->amount,

                    'dueDate' => $jobOrder->invoice->due_date
                        ? $jobOrder->invoice->due_date->format('Y-m-d')
                        : null,
                ]
                : null,

            /*
            |--------------------------------------------------------------------------
            | REJECTION INFORMATION
            |--------------------------------------------------------------------------
            */

            'rejectionReason' => $jobOrder->rejection_reason,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT DATE SAFELY
    |--------------------------------------------------------------------------
    |
    | Handles both Carbon instances and string dates.
    |
    */

    private function formatDate($date): ?string
    {
        if (empty($date)) {
            return null;
        }

        if ($date instanceof \Carbon\Carbon) {
            return $date->format('Y-m-d H:i:s');
        }

        if (is_string($date)) {
            try {
                return \Carbon\Carbon::parse($date)->format('Y-m-d H:i:s');
            } catch (\Exception $e) {
                return $date;
            }
        }

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE STATUS
    |--------------------------------------------------------------------------
    |
    | The database status is NOT automatically changed.
    |
    | Example:
    |
    | DB status = Pending
    | due date = already passed
    |
    | Display status = Overdue
    |
    */

    private function getInvoiceStatus(
        Invoice $invoice
    ): string {
        if (
            $invoice->status === 'Pending' &&
            $invoice->due_date &&
            $invoice->due_date->isBefore(
                now()->startOfDay()
            )
        ) {
            return 'Overdue';
        }

        return $invoice->status;
    }

    /*
    |--------------------------------------------------------------------------
    | AUTHORIZATION
    |--------------------------------------------------------------------------
    */

    private function authorizeStaffOrAdmin(): void
    {
        $user = Auth::user();

        abort_unless(
            $user &&
                in_array(
                    $user->role,
                    ['staff', 'admin'],
                    true
                ),
            403,
            'You are not authorized to access billing records.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE AUTHORIZATION
    |--------------------------------------------------------------------------
    |
    | Billing is shared.
    |
    | Any authorized Staff/Admin can access invoices.
    | We intentionally do NOT restrict by invoice.user_id.
    |
    */

    private function authorizeInvoice(
        Invoice $invoice
    ): void {
        $user = Auth::user();

        abort_unless(
            $user &&
                in_array(
                    $user->role,
                    ['staff', 'admin'],
                    true
                ),
            403,
            'You are not authorized to access this invoice.'
        );
    }
}
