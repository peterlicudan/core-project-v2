<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\JobOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class JobOrderController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(): Response
    {
        $this->authorizeStaffOrAdmin();

        $jobOrders = JobOrder::query()
            ->with([
                'user:id,name,email',
                'generatedBy:id,name,email',
                'invoice:id,job_order_id,number,status,amount,due_date',
            ])
            ->latest('created_at')
            ->get()
            ->map(function (JobOrder $jobOrder) {
                return $this->transformJobOrder($jobOrder);
            })
            ->values();

        return Inertia::render('User/JobOrders', [
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
    | STORE / RECEIVE JOB ORDER
    |--------------------------------------------------------------------------
    |
    | A Job Order can be received/imported from another system such as Core 1.
    |
    | New Job Orders start as Pending/Received.
    |
    | IMPORTANT:
    | Creating/receiving a Job Order DOES NOT create an invoice.
    |
    */

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        abort_unless(
            $user && in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to create or receive Job Orders.'
        );

        $validated = $request->validate([
            'number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('job_orders', 'number'),
            ],

            'client' => [
                'required',
                'string',
                'max:255',
            ],

            'client_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'client_contact' => [
                'nullable',
                'string',
                'max:100',
            ],

            'client_address' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'project' => [
                'required',
                'string',
                'max:255',
            ],

            'location' => [
                'nullable',
                'string',
                'max:500',
            ],

            'equipment' => [
                'nullable',
                'string',
                'max:255',
            ],

            'operator' => [
                'nullable',
                'string',
                'max:255',
            ],

            'start_date' => [
                'nullable',
                'date',
            ],

            'end_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0',
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
        | Generate Job Order Number
        |--------------------------------------------------------------------------
        */

        $number = $validated['number']
            ?? $this->generateJobOrderNumber();

        /*
        |--------------------------------------------------------------------------
        | Create / Receive Job Order
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | No invoice is created here.
        |
        */

        JobOrder::create([
            'number' => $number,

            'user_id' => $user->id,

            'client' => $validated['client'],
            'client_email' => $validated['client_email'] ?? null,
            'client_contact' => $validated['client_contact'] ?? null,
            'client_address' => $validated['client_address'] ?? null,

            'project' => $validated['project'],
            'location' => $validated['location'] ?? null,

            'equipment' => $validated['equipment'] ?? null,
            'operator' => $validated['operator'] ?? null,

            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,

            'amount' => $validated['amount'],

            'description' => $validated['description'] ?? null,
            'notes' => $validated['notes'] ?? null,

            /*
            |--------------------------------------------------------------------------
            | Initial Status
            |--------------------------------------------------------------------------
            |
            | Pending means the Job Order has been received but not yet generated.
            |
            */

            'status' => 'Pending',

            'generated_at' => null,
            'generated_by' => null,
        ]);

        return redirect()
            ->route('job-orders.index')
            ->with(
                'success',
                "Job Order {$number} was successfully received."
            );
    }

    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    */

    public function show(JobOrder $jobOrder): Response
    {
        $this->authorizeJobOrder($jobOrder);

        $jobOrder->load([
            'user:id,name,email',
            'generatedBy:id,name,email',
            'invoice:id,job_order_id,number,status,amount,due_date',
        ]);

        $record = $this->transformJobOrder($jobOrder);

        return Inertia::render('User/JobOrders', [
            'jobOrders' => [
                $record,
            ],

            'records' => [
                $record,
            ],

            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    |
    | Pending/Received Job Orders can be edited.
    |
    | Once generated, the Job Order is locked.
    |
    */

    public function update(
        Request $request,
        JobOrder $jobOrder
    ): RedirectResponse {
        $this->authorizeJobOrder($jobOrder);

        /*
        |--------------------------------------------------------------------------
        | Cannot edit if invoice already exists
        |--------------------------------------------------------------------------
        */

        if ($jobOrder->invoice()->exists()) {
            return back()->with(
                'error',
                'This Job Order already has an invoice and can no longer be edited.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Generated Job Orders are locked
        |--------------------------------------------------------------------------
        */

        if ($jobOrder->status === 'Generated') {
            return back()->with(
                'error',
                'Generated Job Orders can no longer be edited.'
            );
        }

        $validated = $request->validate([
            'number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('job_orders', 'number')
                    ->ignore($jobOrder->id),
            ],

            'client' => [
                'required',
                'string',
                'max:255',
            ],

            'client_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'client_contact' => [
                'nullable',
                'string',
                'max:100',
            ],

            'client_address' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'project' => [
                'required',
                'string',
                'max:255',
            ],

            'location' => [
                'nullable',
                'string',
                'max:500',
            ],

            'equipment' => [
                'nullable',
                'string',
                'max:255',
            ],

            'operator' => [
                'nullable',
                'string',
                'max:255',
            ],

            'start_date' => [
                'nullable',
                'date',
            ],

            'end_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],

            'amount' => [
                'required',
                'numeric',
                'min:0',
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

        $jobOrder->update([
            'number' => $validated['number'],

            'client' => $validated['client'],
            'client_email' => $validated['client_email'] ?? null,
            'client_contact' => $validated['client_contact'] ?? null,
            'client_address' => $validated['client_address'] ?? null,

            'project' => $validated['project'],
            'location' => $validated['location'] ?? null,

            'equipment' => $validated['equipment'] ?? null,
            'operator' => $validated['operator'] ?? null,

            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,

            'amount' => $validated['amount'],

            'description' => $validated['description'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()
            ->route('job-orders.index')
            ->with(
                'success',
                "Job Order {$jobOrder->number} updated successfully."
            );
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE JOB ORDER + AUTOMATICALLY CREATE INVOICE
    |--------------------------------------------------------------------------
    |
    | MAIN WORKFLOW:
    |
    | Pending/Received
    |       ↓
    |     Generate
    |       ↓
    |   Generated
    |       +
    |   Invoice Created
    |
    | The Staff does NOT approve anything.
    |
    */

    public function generate(Request $request, JobOrder $jobOrder): RedirectResponse
    {
        $this->authorizeJobOrder($jobOrder);

        /*
        |--------------------------------------------------------------------------
        | Prevent duplicate invoice
        |--------------------------------------------------------------------------
        */

        $existingInvoice = $jobOrder->invoice()->first();

        if ($existingInvoice) {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} already has invoice {$existingInvoice->number}."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Already Generated
        |--------------------------------------------------------------------------
        */

        if ($jobOrder->status === 'Generated') {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} has already been generated."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Only Pending / Received Job Orders can be generated
        |--------------------------------------------------------------------------
        |
        | We intentionally do NOT require Approved status.
        |
        */

        if (! in_array($jobOrder->status, ['Pending', 'Received'], true)) {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} cannot be generated while its status is {$jobOrder->status}."
            );
        }

        /*
        |--------------------------------------------------------------------------
        | GENERATE JOB ORDER + INVOICE IN ONE TRANSACTION
        |--------------------------------------------------------------------------
        |
        | If invoice creation fails, the Job Order will not be marked Generated.
        |
        */

        $result = DB::transaction(function () use ($request, $jobOrder) {

            /*
            |--------------------------------------------------------------------------
            | Generate Invoice Number
            |--------------------------------------------------------------------------
            */

            $invoiceNumber = $this->generateInvoiceNumber();

            /*
            |--------------------------------------------------------------------------
            | Update Job Order
            |--------------------------------------------------------------------------
            */

            $jobOrder->update([
                'status' => 'Generated',
                'generated_at' => now(),
                'generated_by' => Auth::id(),
            ]);

            /*
            |--------------------------------------------------------------------------
            | Create Invoice Automatically
            |--------------------------------------------------------------------------
            |
            | ✅ Get payment_method from request or use default
            |
            */

            $paymentMethod = $request->input('payment_method', 'Bank Transfer');

            $invoice = Invoice::create([
                'job_order_id' => $jobOrder->id,

                /*
                |--------------------------------------------------------------------------
                | Keep the source/owner user connected
                |--------------------------------------------------------------------------
                */

                'user_id' => $jobOrder->user_id
                    ?? Auth::id(),

                'number' => $invoiceNumber,

                'client' => $jobOrder->client,

                'project' => $jobOrder->project,

                'amount' => $jobOrder->amount,

                /*
                |--------------------------------------------------------------------------
                | ✅ Payment Method
                |--------------------------------------------------------------------------
                */

                'payment_method' => $paymentMethod,

                /*
                |--------------------------------------------------------------------------
                | Payment status starts as Pending.
                |
                | Admin will later change this to Partial or Paid.
                |--------------------------------------------------------------------------
                */

                'status' => 'Pending',

                /*
                |--------------------------------------------------------------------------
                | Default payment due date
                |--------------------------------------------------------------------------
                */

                'due_date' => now()
                    ->addDays(30)
                    ->toDateString(),

                'client_email' => $jobOrder->client_email,

                'client_address' => $jobOrder->client_address,

                'description' => $jobOrder->description
                    ?: 'Heavy Equipment & Logistics Service',

                'notes' => $jobOrder->notes,
            ]);

            return [
                'jobOrder' => $jobOrder->fresh([
                    'user:id,name,email',
                    'generatedBy:id,name,email',
                    'invoice:id,job_order_id,number,status,amount,due_date',
                ]),

                'invoice' => $invoice,
            ];
        });

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | Use back() instead of route('job-orders.index').
        |
        | The Generate button is being clicked from Billing & Invoicing.
        | Using back() keeps the user on the same page and allows the
        | BillingInvoicing.tsx success notification to appear.
        |
        */

        return back()->with(
            'success',
            "Job Order {$result['jobOrder']->number} was generated successfully. Invoice {$result['invoice']->number} was created automatically."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    |
    | A Job Order cannot be deleted once it has generated an invoice.
    |
    */

    public function destroy(JobOrder $jobOrder): RedirectResponse
    {
        $this->authorizeJobOrder($jobOrder);

        /*
        |--------------------------------------------------------------------------
        | Cannot delete if invoice exists
        |--------------------------------------------------------------------------
        */

        if ($jobOrder->invoice()->exists()) {
            return back()->with(
                'error',
                'This Job Order cannot be deleted because it already has an invoice.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Generated Job Orders are locked
        |--------------------------------------------------------------------------
        */

        if ($jobOrder->status === 'Generated') {
            return back()->with(
                'error',
                'Generated Job Orders cannot be deleted.'
            );
        }

        $number = $jobOrder->number;

        $jobOrder->delete();

        return redirect()
            ->route('job-orders.index')
            ->with(
                'success',
                "Job Order {$number} deleted successfully."
            );
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM JOB ORDER
    |--------------------------------------------------------------------------
    */

    private function transformJobOrder(
        JobOrder $jobOrder
    ): array {
        return [
            'id' => $jobOrder->id,

            'number' => $jobOrder->number,

            'userId' => $jobOrder->user_id,

            'staffId' => $jobOrder->user_id,

            'staffName' => $jobOrder->user?->name
                ?? 'Unassigned',

            'staffEmail' => $jobOrder->user?->email,

            'client' => $jobOrder->client,

            'clientEmail' => $jobOrder->client_email,

            'clientContact' => $jobOrder->client_contact,

            'clientAddress' => $jobOrder->client_address,

            'project' => $jobOrder->project,

            'location' => $jobOrder->location,

            'equipment' => $jobOrder->equipment,

            'operator' => $jobOrder->operator,

            'startDate' => $jobOrder->start_date
                ? $jobOrder->start_date->format('Y-m-d')
                : null,

            'endDate' => $jobOrder->end_date
                ? $jobOrder->end_date->format('Y-m-d')
                : null,

            'amount' => (float) $jobOrder->amount,

            'description' => $jobOrder->description,

            'notes' => $jobOrder->notes,

            'status' => $jobOrder->status,

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
            | Invoice Information
            |--------------------------------------------------------------------------
            */

            'hasInvoice' => $jobOrder->invoice !== null,

            'invoiceId' => $jobOrder->invoice?->id,

            'invoiceNumber' => $jobOrder->invoice?->number,

            'invoice' => $jobOrder->invoice
                ? [
                    'id' => $jobOrder->invoice->id,

                    'jobOrderId' => $jobOrder->invoice->job_order_id,

                    'number' => $jobOrder->invoice->number,

                    'status' => $jobOrder->invoice->status,

                    'amount' => (float) $jobOrder->invoice->amount,

                    'dueDate' => $jobOrder->invoice->due_date
                        ? $jobOrder->invoice->due_date->format('Y-m-d')
                        : null,

                    /*
                    |--------------------------------------------------------------------------
                    | ✅ Payment Method included in invoice response
                    |--------------------------------------------------------------------------
                    */

                    'paymentMethod' => $jobOrder->invoice->payment_method ?? 'Bank Transfer',
                ]
                : null,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE JOB ORDER NUMBER
    |--------------------------------------------------------------------------
    */

    private function generateJobOrderNumber(): string
    {
        $year = now()->year;

        $lastNumber = JobOrder::query()
            ->where('number', 'like', "JO-{$year}-%")
            ->orderByDesc('id')
            ->value('number');

        $next = 1;

        if (
            $lastNumber &&
            preg_match(
                "/^JO-{$year}-(\d+)$/",
                $lastNumber,
                $matches
            )
        ) {
            $next = ((int) $matches[1]) + 1;
        }

        do {
            $number = sprintf(
                'JO-%d-%03d',
                $year,
                $next
            );

            $exists = JobOrder::query()
                ->where('number', $number)
                ->exists();

            if ($exists) {
                $next++;
            }
        } while ($exists);

        return $number;
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE INVOICE NUMBER
    |--------------------------------------------------------------------------
    */

    private function generateInvoiceNumber(): string
    {
        $year = now()->year;

        $lastNumber = Invoice::query()
            ->where('number', 'like', "INV-{$year}-%")
            ->orderByDesc('id')
            ->value('number');

        $next = 1;

        if (
            $lastNumber &&
            preg_match(
                "/^INV-{$year}-(\d+)$/",
                $lastNumber,
                $matches
            )
        ) {
            $next = ((int) $matches[1]) + 1;
        }

        do {
            $number = sprintf(
                'INV-%d-%03d',
                $year,
                $next
            );

            $exists = Invoice::query()
                ->where('number', $number)
                ->exists();

            if ($exists) {
                $next++;
            }
        } while ($exists);

        return $number;
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
            $user && in_array(
                $user->role,
                ['staff', 'admin'],
                true
            ),
            403,
            'You are not authorized to access Job Orders.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | JOB ORDER AUTHORIZATION
    |--------------------------------------------------------------------------
    */

    private function authorizeJobOrder(
        JobOrder $jobOrder
    ): void {
        $this->authorizeStaffOrAdmin();
    }
}
