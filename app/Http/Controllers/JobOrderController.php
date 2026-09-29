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
            'client' => ['required', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_contact' => ['nullable', 'string', 'max:100'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'project' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:500'],
            'equipment' => ['nullable', 'string', 'max:255'],
            'operator' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $number = $validated['number'] ?? $this->generateJobOrderNumber();

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
            'status' => 'Pending',
            'generated_at' => null,
            'generated_by' => null,
        ]);

        return redirect()
            ->route('job-orders.index')
            ->with('success', "Job Order {$number} was successfully received.");
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
            'jobOrders' => [$record],
            'records' => [$record],
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
    */

    public function update(Request $request, JobOrder $jobOrder): RedirectResponse
    {
        $this->authorizeJobOrder($jobOrder);

        if ($jobOrder->invoice()->exists()) {
            return back()->with(
                'error',
                'This Job Order already has an invoice and can no longer be edited.'
            );
        }

        if (in_array($jobOrder->status, ['Generated', 'Pending Admin Approval'], true)) {
            return back()->with('error', 'This Job Order can no longer be edited.');
        }

        $validated = $request->validate([
            'number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('job_orders', 'number')->ignore($jobOrder->id),
            ],
            'client' => ['required', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_contact' => ['nullable', 'string', 'max:100'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'project' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:500'],
            'equipment' => ['nullable', 'string', 'max:255'],
            'operator' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
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
            ->with('success', "Job Order {$jobOrder->number} updated successfully.");
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE JOB ORDER → SUBMIT FOR ADMIN APPROVAL
    |--------------------------------------------------------------------------
    */

    public function generate(Request $request, JobOrder $jobOrder): RedirectResponse
    {
        $this->authorizeJobOrder($jobOrder);

        $existingInvoice = $jobOrder->invoice()->first();

        if ($existingInvoice) {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} already has invoice {$existingInvoice->number}."
            );
        }

        if (in_array($jobOrder->status, ['Generated', 'Pending Admin Approval'], true)) {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} has already been submitted for approval."
            );
        }

        if (! in_array($jobOrder->status, ['Pending', 'Received'], true)) {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} cannot be generated while its status is {$jobOrder->status}."
            );
        }

        $jobOrder->update([
            'status' => 'Pending Admin Approval',
            'generated_at' => now(),
            'generated_by' => Auth::id(),
        ]);

        try {
            $admins = \App\Models\User::query()
                ->where('role', 'admin')
                ->get(['id', 'name', 'email']);

            foreach ($admins as $admin) {
                try {
                    \Illuminate\Support\Facades\Mail::raw(
                        "A Job Order is ready for your approval.\n\n" .
                            "Job Order No: {$jobOrder->number}\n" .
                            "Client: " . ($jobOrder->client ?? '—') . "\n" .
                            "Project: " . ($jobOrder->project ?? '—') . "\n" .
                            "Amount: ₱" . number_format((float) $jobOrder->amount, 2) . "\n" .
                            "Generated by: " . (Auth::user()->name ?? 'Staff') . "\n" .
                            "Generated at: " . now()->format('M d, Y h:i A') . "\n\n" .
                            "Please review and approve it in the admin panel:\n" .
                            url('/admin/job-orders'),
                        function ($mail) use ($admin) {
                            $mail->to($admin->email)
                                ->subject("Job Order Ready for Approval — Action Required");
                        }
                    );
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return back()->with(
            'success',
            "Job Order {$jobOrder->number} has been submitted for Admin approval. " .
                "The invoice will be created once Admin approves it."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN APPROVE JOB ORDER → CREATE INVOICE
    |--------------------------------------------------------------------------
    */

    public function approve(Request $request, JobOrder $jobOrder): RedirectResponse
    {
        $user = Auth::user();

        if (! $user || strtolower((string) $user->role) !== 'admin') {
            abort(403, 'Only admins can approve Job Orders.');
        }

        if ($jobOrder->status !== 'Pending Admin Approval') {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} is not pending admin approval."
            );
        }

        if ($jobOrder->invoice()->exists()) {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} already has an invoice."
            );
        }

        $result = DB::transaction(function () use ($request, $jobOrder) {

            $invoiceNumber = $this->generateInvoiceNumber();

            $jobOrder->update([
                'status' => 'Generated',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);

            $paymentMethod = $request->input('payment_method', 'Bank Transfer');

            $invoice = Invoice::create([
                'job_order_id' => $jobOrder->id,
                'user_id' => $jobOrder->user_id ?? Auth::id(),
                'number' => $invoiceNumber,
                'client' => $jobOrder->client,
                'project' => $jobOrder->project,
                'amount' => $jobOrder->amount,
                'payment_method' => $paymentMethod,
                'status' => 'Pending',
                'due_date' => now()->addDays(30)->toDateString(),
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

        return back()->with(
            'success',
            "Job Order {$result['jobOrder']->number} approved. Invoice {$result['invoice']->number} created."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN REJECT JOB ORDER
    |--------------------------------------------------------------------------
    */

    public function reject(Request $request, JobOrder $jobOrder): RedirectResponse
    {
        $user = Auth::user();

        if (! $user || strtolower((string) $user->role) !== 'admin') {
            abort(403, 'Only admins can reject Job Orders.');
        }

        if ($jobOrder->status !== 'Pending Admin Approval') {
            return back()->with(
                'error',
                "Job Order {$jobOrder->number} is not pending admin approval."
            );
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:5000'],
        ]);

        $jobOrder->update([
            'status' => 'Pending',
            'generated_at' => null,
            'generated_by' => null,
            'approved_at' => null,
            'approved_by' => null,
        ]);

        return back()->with(
            'success',
            "Job Order {$jobOrder->number} was rejected and returned to Pending. " .
                "Reason: {$validated['rejection_reason']}"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */

    public function destroy(JobOrder $jobOrder): RedirectResponse
    {
        $this->authorizeJobOrder($jobOrder);

        if ($jobOrder->invoice()->exists()) {
            return back()->with(
                'error',
                'This Job Order cannot be deleted because it already has an invoice.'
            );
        }

        if (in_array($jobOrder->status, ['Generated', 'Pending Admin Approval'], true)) {
            return back()->with('error', 'This Job Order cannot be deleted.');
        }

        $number = $jobOrder->number;

        $jobOrder->delete();

        return redirect()
            ->route('job-orders.index')
            ->with('success', "Job Order {$number} deleted successfully.");
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM JOB ORDER
    |--------------------------------------------------------------------------
    */

    private function transformJobOrder(JobOrder $jobOrder): array
    {
        return [
            'id' => $jobOrder->id,
            'number' => $jobOrder->number,
            'userId' => $jobOrder->user_id,
            'staffId' => $jobOrder->user_id,
            'staffName' => $jobOrder->user?->name ?? 'Unassigned',
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
            'approvedAt' => $jobOrder->approved_at
                ? $jobOrder->approved_at->format('Y-m-d H:i:s')
                : null,
            'approvedBy' => $jobOrder->approved_by,
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

        if ($lastNumber && preg_match("/^JO-{$year}-(\d+)$/", $lastNumber, $matches)) {
            $next = ((int) $matches[1]) + 1;
        }

        do {
            $number = sprintf('JO-%d-%03d', $year, $next);
            $exists = JobOrder::query()->where('number', $number)->exists();
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

        if ($lastNumber && preg_match("/^INV-{$year}-(\d+)$/", $lastNumber, $matches)) {
            $next = ((int) $matches[1]) + 1;
        }

        do {
            $number = sprintf('INV-%d-%03d', $year, $next);
            $exists = Invoice::query()->where('number', $number)->exists();
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
            $user && in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to access Job Orders.'
        );
    }

    private function authorizeJobOrder(JobOrder $jobOrder): void
    {
        $this->authorizeStaffOrAdmin();
    }
}
