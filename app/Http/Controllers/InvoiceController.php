<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\JobOrder;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
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
    */

    public function index(): Response
    {
        $this->authorizeStaffOrAdmin();

        /*
        |--------------------------------------------------------------------------
        | INVOICES
        |--------------------------------------------------------------------------
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
        |----------------------------------------------------------------------
        | BANNED: service_month → "YYYY-MM" na "Service Date" ng invoice
        |----------------------------------------------------------------------
        */

        /*
        |--------------------------------------------------------------------------
        | JOB ORDERS
        |--------------------------------------------------------------------------
        */

        $jobOrders = JobOrder::query()
            ->with([
                'user:id,name,email,role',
                'generatedBy:id,name,email,role',
                'invoice:id,job_order_id,number,status,amount,due_date',
                'invoices' => fn ($query) => $query
                    ->select(
                        'id',
                        'job_order_id',
                        'number',
                        'amount',
                        'status',
                        'due_date',
                        'service_month',
                        'billing_sequence',
                        'created_at',
                    )
                    ->orderBy('service_month'),
            ])
            ->latest('created_at')
            ->get()
            ->map(function (JobOrder $jobOrder) {
                return $this->transformJobOrder($jobOrder);
            })
            ->values();

        /*
        |--------------------------------------------------------------------------
        | ✅ NOTIFICATIONS
        |--------------------------------------------------------------------------
        |
        | Para sa bell icon.
        |
        */

        $notifications = Notification::where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->take(30)
            ->get()
            ->map(function ($notification) {
                $data = is_array($notification->data)
                    ? $notification->data
                    : json_decode($notification->data, true);

                return [
                    'id' => $notification->id,
                    'title' => $data['title'] ?? 'Notification',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'link' => $data['link'] ?? null,
                    'read' => !is_null($notification->read_at),
                    'createdAt' => $notification->created_at?->toIso8601String(),
                    'job_order_id' => $data['job_order_id'] ?? null,
                    'job_order_number' => $data['job_order_number'] ?? null,
                    'payment_id' => $data['payment_id'] ?? null,
                    'invoice_id' => $data['invoice_id'] ?? null,
                    'redirect_url' => $data['redirect_url'] ?? null,
                    'client' => $data['client'] ?? null,
                    'amount' => $data['amount'] ?? null,
                    'changes' => $data['changes'] ?? null,
                ];
            });

        return Inertia::render('User/BillingInvoicing', [
            'invoices' => $invoices,
            'jobOrders' => $jobOrders,
            'records' => $jobOrders,
            'notifications' => $notifications,
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

        $invoice->load([
            'user:id,name,email,role',
            'jobOrder:id,number,status,client,project,amount,user_id,generated_at,generated_by',
        ]);

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

        /*
        |--------------------------------------------------------------------------
        | ✅ NOTIFICATIONS
        |--------------------------------------------------------------------------
        */

        $notifications = Notification::where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->take(30)
            ->get()
            ->map(function ($notification) {
                $data = is_array($notification->data)
                    ? $notification->data
                    : json_decode($notification->data, true);

                return [
                    'id' => $notification->id,
                    'title' => $data['title'] ?? 'Notification',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'link' => $data['link'] ?? null,
                    'read' => !is_null($notification->read_at),
                    'createdAt' => $notification->created_at?->toIso8601String(),
                    'job_order_id' => $data['job_order_id'] ?? null,
                    'job_order_number' => $data['job_order_number'] ?? null,
                    'payment_id' => $data['payment_id'] ?? null,
                    'invoice_id' => $data['invoice_id'] ?? null,
                    'redirect_url' => $data['redirect_url'] ?? null,
                    'client' => $data['client'] ?? null,
                    'amount' => $data['amount'] ?? null,
                    'changes' => $data['changes'] ?? null,
                ];
            });

        return Inertia::render('User/BillingInvoicing', [
            'invoices' => [
                $this->transformInvoice($invoice),
            ],
            'jobOrders' => $jobOrders,
            'records' => $jobOrders,
            'notifications' => $notifications,
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
            'number' => ['nullable', 'string', 'max:100', Rule::unique('invoices', 'number')],
            'client' => ['required', 'string', 'max:255'],
            'project' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'description' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],

            /*
            |--------------------------------------------------------------
            | MONTHLY BILLING (mula sa Job Order)
            |--------------------------------------------------------------
            */
            'job_order_id' => ['nullable', 'integer', 'exists:job_orders,id'],
            'service_month' => [
                'nullable',
                'string',
                'regex:/^\d{4}-(0[1-9]|1[0-2])$/',
            ],
            'billing_sequence' => ['nullable', 'integer', 'min:1', 'max:120'],
            'quotation_total' => ['nullable', 'numeric', 'min:0'],
            'billing_months' => ['nullable', 'integer', 'min:1', 'max:120'],

            /*
            |--------------------------------------------------------------
            | VAT + ADDITIONAL CHARGES
            |--------------------------------------------------------------
            */
            'base_amount' => ['nullable', 'numeric', 'min:0'],
            'apply_vat' => ['nullable', 'boolean'],
            'vat_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'apply_additional_charges' => ['nullable', 'boolean'],
            'additional_charges' => ['nullable', 'numeric', 'min:0'],
        ]);

        $jobOrder = null;

        if (! empty($validated['job_order_id'])) {
            $jobOrder = JobOrder::find($validated['job_order_id']);

            abort_unless($jobOrder, 404, 'Job Order not found.');

            /*
            |--------------------------------------------------------------
            | Kailangan ang buwan (Service Date) kapag monthly ang billing
            |--------------------------------------------------------------
            */

            if (empty($validated['service_month'])) {
                return back()->with(
                    'error',
                    "Please select a Service Date (month) for Job Order {$jobOrder->number}."
                );
            }

            /*
            |--------------------------------------------------------------
            | ✅ LOCK: isang Pending billing lang kada Job Order
            | Kailangan ma-approve muna ng admin bago mag-create ng next
            |--------------------------------------------------------------
            */

            if (Invoice::jobOrderHasPendingBilling($jobOrder->id)) {
                $pending = $jobOrder->invoices()->where('status', 'Pending')->first();

                return back()->with(
                    'error',
                    "Billing record {$pending?->billing_number} for Job Order {$jobOrder->number} is still awaiting admin verification. Wait for it to be approved or rejected."
                );
            }

            /*
            |--------------------------------------------------------------
            | Isang billing record kada buwan — walang duplicate
            |--------------------------------------------------------------
            |
            | ✅ Ang Rejected ay hindi bilang dito: kapag na-reject ng admin,
            |    puwedeng mag-create ng staff ng corrected billing para sa
            |    PAREHONG buwan.
            |
            */

            $alreadyBilled = Invoice::query()
                ->where('job_order_id', $jobOrder->id)
                ->where('service_month', $validated['service_month'])
                ->where('status', '!=', 'Rejected')
                ->exists();

            if ($alreadyBilled) {
                return back()->with(
                    'error',
                    "Job Order {$jobOrder->number} already has a billing record for that month."
                );
            }

            /*
            |--------------------------------------------------------------
            | Fully billed na?
            |--------------------------------------------------------------
            */

            if ($jobOrder->isFullyBilled()) {
                return back()->with(
                    'error',
                    "Job Order {$jobOrder->number} is already fully billed."
                );
            }

            /*
            |--------------------------------------------------------------
            | I-save ang approved quotation sa Job Order (kung unang beses)
            |--------------------------------------------------------------
            */

            $quotationTotal = $validated['quotation_total'] ?? $jobOrder->quotationTotal();
            $billingMonths = $validated['billing_months'] ?? $jobOrder->billingMonths();

            $jobOrder->fill([
                'quotation_total' => $quotationTotal > 0
                    ? $quotationTotal
                    : $jobOrder->quotation_total,
                'billing_months' => $billingMonths > 0
                    ? $billingMonths
                    : $jobOrder->billing_months,
            ])->save();

            $billedCount = $jobOrder->billedMonthsCount() + 1;

            $validated['billing_sequence'] = $validated['billing_sequence']
                ?? $billedCount;
        }

        /*
        |----------------------------------------------------------------------
        | ✅ VAT + ADDITIONAL CHARGES BREAKDOWN
        |----------------------------------------------------------------------
        |
        | base_amount      = amount bago VAT at charges (ito ang ihihimbing sa JO)
        | vat_amount       = (base + charges) × rate
        | amount           = base + charges + VAT  (GRAND TOTAL — ito ang collected)
        |
        */

        $baseAmount = (float) ($validated['base_amount'] ?? $validated['amount']);
        $applyVat = (bool) ($validated['apply_vat'] ?? false);
        $vatRate = $applyVat ? (float) ($validated['vat_rate'] ?? 12) : 0.0;
        $applyCharges = (bool) ($validated['apply_additional_charges'] ?? false);
        $additionalCharges = $applyCharges
            ? (float) ($validated['additional_charges'] ?? 0)
            : 0.0;

        $vatAmount = round(($baseAmount + $additionalCharges) * ($vatRate / 100), 2);
        $grandTotal = round($baseAmount + $additionalCharges + $vatAmount, 2);

        /*
        |----------------------------------------------------------------------
        | ✅ CREATE
        |----------------------------------------------------------------------
        */

        $invoice = DB::transaction(function () use (
            $validated,
            $user,
            $jobOrder,
            $baseAmount,
            $vatRate,
            $vatAmount,
            $additionalCharges,
            $grandTotal
        ) {
            $created = Invoice::create([
                /*
                |--------------------------------------------------------------
                | ✅ WALANG INVOICE NUMBER PA — binubura ito sa Billing Records
                |--------------------------------------------------------------
                |
                | Ang invoice number ay HINDI pa nabubuo dito. Ang billing
                | record ay Billing No. + Job Order No. lang.
                |
                | Kapag APPROVED na ng admin, DUN lang gumagawa ang invoice
                | at nabubuo ang Invoice No. (BillingManagement -> approve()).
                | Kaya hindi ito lumalabas sa Service Invoice tab hangga't
                | hindi na-approve.
                |
                */

                'number' => null,
                'billing_number' => $this->generateBillingNumber(),
                'client' => $validated['client'],
                'project' => $validated['project'],
                'amount' => $grandTotal,
                'base_amount' => $baseAmount,
                'vat_rate' => $vatRate,
                'vat_amount' => $vatAmount,
                'additional_charges' => $additionalCharges,
                'due_date' => $validated['due_date'] ?? null,
                'client_email' => $validated['client_email'] ?? null,
                'client_address' => $validated['client_address'] ?? null,
                'description' => $validated['description'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'service_month' => $validated['service_month'] ?? null,
                'billing_sequence' => $validated['billing_sequence'] ?? null,
                'job_order_id' => $jobOrder?->id,
                'user_id' => $user->id,
                'status' => 'Pending',
            ]);

            /* ✅ Job Order status = "Created" (may billing record na) */
            $jobOrder?->syncBillingStatus();

            return $created;
        });

        /*
        |----------------------------------------------------------------------
        | ✅ NOTIFY ADMINS
        |----------------------------------------------------------------------
        */

        if ($jobOrder) {
            $this->notifyAdminsOfBilling($invoice, $jobOrder, $user);
        }

        return redirect()
            ->route('billing.invoicing')
            ->with(
                'success',
                $jobOrder
                    ? "Billing record {$invoice->billing_number} created for Job Order {$jobOrder->number}. Awaiting admin verification."
                    : "Billing record {$invoice->billing_number} created. Awaiting admin verification."
            );
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ GENERATE BILLING NUMBER (BILL-2026-001)
    |--------------------------------------------------------------------------
    |
    | Ito ang ipinapakita sa Billing Records — hindi na ang Invoice Number.
    |
    | Ang INVOICE number (INV-2026-NNNN) ay HINDI nabubuo dito. Nasa
    | AdminBillingController@approve() iyon — doon lang gagawa ng invoice,
    | kapag na-approve na ng admin ang billing.
    |
    */

    private function generateBillingNumber(): string
    {
        $year = now()->year;

        $max = 0;

        Invoice::query()
            ->whereNotNull('billing_number')
            ->where('billing_number', 'like', "BILL-{$year}-%")
            ->pluck('billing_number')
            ->each(function (string $number) use ($year, &$max) {
                if (preg_match("/^BILL-{$year}-(\d{3})$/", $number, $matches)) {
                    $max = max($max, (int) $matches[1]);
                }
            });

        $next = $max + 1;

        do {
            $number = sprintf('BILL-%d-%03d', $year, $next);
            $exists = Invoice::query()->where('billing_number', $number)->exists();
            if ($exists) {
                $next++;
            }
        } while ($exists);

        return $number;
    }

    /**
     * ✅ Reference label para sa flash messages at iba pa.
     *
     * Ang Billing No. (BILL-YYYY-NNN) ang primary reference kasi mayroon
     * iyon agad sa pag-create. Ang Invoice No. (INV-YYYY-NNNN) ay NULL
     * hanggang ma-approve ng admin — kaya DITO ginagamit ang billing number
     * para walang lumabas na "Invoice " na walang number.
     */
    private function ref(Invoice $invoice): string
    {
        return $invoice->billing_number
            ?? $invoice->number
            ?? "#{$invoice->id}";
    }

    private function notifyAdminsOfBilling(Invoice $invoice, JobOrder $jobOrder, $user): void
    {
        try {
            $billingRef = $invoice->billing_number ?? $invoice->number ?? "#{$invoice->id}";
            $admins = User::query()
                ->where('role', 'admin')
                ->get(['id', 'name', 'email']);

            $serviceMonth = $invoice->service_month
                ? Carbon::createFromFormat('Y-m', $invoice->service_month)->format('M Y')
                : '—';

            foreach ($admins as $admin) {
                try {
                    Notification::create([
                        'id' => Str::uuid(),
                        'notifiable_type' => 'App\\Models\\User',
                        'notifiable_id' => $admin->id,
                        'type' => 'admin_notification',
                        'data' => json_encode([
                            'title' => 'New Billing Record for Verification 🧾',
                            'message' => "{$billingRef} ({$serviceMonth}) — " .
                                "{$jobOrder->client} — ₱" .
                                number_format((float) $invoice->amount, 2),
                            'type' => 'info',
                            'link' => '/admin/billing',
                            'invoice_id' => $invoice->id,
                            'billing_number' => $billingRef,
                            'job_order_id' => $jobOrder->id,
                            'job_order_number' => $jobOrder->number,
                            'client' => $jobOrder->client,
                            'amount' => (float) $invoice->amount,
                            'base_amount' => (float) $invoice->base_amount,
                            'status' => $invoice->status,
                            'submitted_by' => $user->name ?? 'Staff',
                            'redirect_url' => '/admin/billing',
                        ]),
                        'read_at' => null,
                    ]);
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->authorizeInvoice($invoice);

        $validated = $request->validate([
            'number' => ['required', 'string', 'max:100', Rule::unique('invoices', 'number')->ignore($invoice->id)],
            'client' => ['required', 'string', 'max:255'],
            'project' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'description' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        unset($validated['status']);
        unset($validated['user_id']);
        unset($validated['job_order_id']);

        $invoice->update($validated);

        return redirect()
            ->route('billing.invoicing')
            ->with('success', "Billing record {$this->ref($invoice)} updated successfully.");
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy(Invoice $invoice): RedirectResponse
    {
        $this->authorizeInvoice($invoice);

        $invoiceNumber = $this->ref($invoice);

        $invoice->delete();

        return redirect()
            ->route('billing.invoicing')
            ->with('success', "Billing record {$invoiceNumber} deleted successfully.");
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL TO CLIENT
    |--------------------------------------------------------------------------
    */

    public function sendEmail(Request $request, $id): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:5000',
        ]);

        $invoice = Invoice::findOrFail($id);

        $user = Auth::user();
        abort_unless(
            $user && in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to send invoice emails.'
        );

        if (!in_array($invoice->status, ['Approved', 'Rejected'])) {
            return redirect()
                ->back()
                ->with('error', 'Only approved or rejected invoices can be sent to the client.');
        }

        try {
            Mail::to($request->email)->send(new InvoiceMail(
                $invoice,
                $request->subject,
                $request->message
            ));

            $invoice->sent_at = now();
            $invoice->sent_by = $user->name ?? $user->email;
            $invoice->save();

            return redirect()
                ->back()
                ->with('success', "Billing record {$this->ref($invoice)} has been sent to {$request->email}.");
        } catch (\Exception $e) {
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

        if ($invoice->status !== 'Rejected') {
            return redirect()
                ->back()
                ->with('error', 'Only rejected invoices can be resubmitted.');
        }

        $invoice->status = 'Pending';
        $invoice->rejection_reason = null;
        $invoice->rejected_at = null;
        $invoice->rejected_by = null;
        $invoice->save();

        if ($invoice->jobOrder) {
            $invoice->jobOrder->status = 'Pending';
            $invoice->jobOrder->rejection_reason = null;
            $invoice->jobOrder->save();
        }

        return redirect()
            ->back()
            ->with('success', "Billing record {$this->ref($invoice)} has been resubmitted and is now PENDING for review.");
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM INVOICE
    |--------------------------------------------------------------------------
    */

    private function transformInvoice(Invoice $invoice): array
    {
        $amount = (float) $invoice->amount;
        $baseAmount = $invoice->baseAmountValue();
        $vatAmount = $invoice->vatAmountValue();
        $additionalCharges = $invoice->additionalChargesValue();
        $dueDate = $invoice->due_date ? $invoice->due_date->format('Y-m-d') : null;
        $createdAt = $invoice->created_at ? $invoice->created_at->format('Y-m-d') : null;
        $updatedAt = $invoice->updated_at ? $invoice->updated_at->format('Y-m-d') : null;
        $description = $invoice->description ?: 'Heavy Equipment & Logistics Service';
        $status = $this->getInvoiceStatus($invoice);

        return [
            'id' => $invoice->id,

            /*
            |----------------------------------------------------------------------
            | ✅ TATLONG HIWALAY NA NUMERO
            |----------------------------------------------------------------------
            |
            | billingNumber    = BILL-YYYY-NNN — mayroon agad sa pag-create.
            |                   ITO ang ginagamit sa Billing Records.
            | number           = INV-YYYY-NNNN — NULL hanggang APPROVED ng admin.
            |                   ITO lang ang lumalabas sa Service Invoice.
            | jobOrderNumber   = JO-YYYY-NNN — palaging nandun kung may JO.
            |
            */

            'number' => $invoice->number,
            'hasInvoiceNumber' => filled($invoice->number),
            'billingNumber' => $invoice->billing_number,
            'client' => $invoice->client,
            'project' => $invoice->project,
            'amount' => $amount,
            'baseAmount' => $baseAmount,
            'vatRate' => (float) ($invoice->vat_rate ?? 0),
            'vatAmount' => $vatAmount,
            'additionalCharges' => $additionalCharges,
            'totalAmount' => $invoice->totalAmountValue(),
            'hasVat' => $invoice->hasVat(),
            'hasAdditionalCharges' => $invoice->hasAdditionalCharges(),
            'status' => $status,
            'dueDate' => $dueDate,
            'createdAt' => $createdAt,
            'updatedAt' => $updatedAt,
            'clientEmail' => $invoice->client_email,
            'clientAddress' => $invoice->client_address,
            'clientContact' => '',
            'description' => $description,
            'notes' => $invoice->notes ?? '',
            'items' => [
                [
                    'id' => $invoice->id,
                    'description' => $description,
                    'quantity' => 1,
                    'unitPrice' => $baseAmount,
                ],
            ],
            'taxRate' => (float) ($invoice->vat_rate ?? 0),
            'jobOrderId' => $invoice->job_order_id,
            'jobOrderNumber' => $invoice->jobOrder?->number,
            'createdFromJobOrder' => $invoice->job_order_id !== null,
            'serviceMonth' => $invoice->service_month,
            'billingSequence' => $invoice->billing_sequence,
            /* ✅ Match check para sa admin verification */
            'matchesJobOrder' => $invoice->matchesJobOrder(),
            'verifiedAt' => $this->formatDate($invoice->verified_at),
            'verifiedBy' => $invoice->verified_by,
            'jobOrder' => $invoice->jobOrder
                ? [
                    'id' => $invoice->jobOrder->id,
                    'number' => $invoice->jobOrder->number,
                    'status' => $invoice->jobOrder->status,
                    'client' => $invoice->jobOrder->client,
                    'project' => $invoice->jobOrder->project,
                    'amount' => (float) $invoice->jobOrder->amount,
                    'quotationTotal' => $invoice->jobOrder->quotationTotal(),
                    'billingMonths' => $invoice->jobOrder->billingMonths(),
                    'monthlyAmount' => $invoice->jobOrder->monthlyAmount(),
                ]
                : null,
            'staffId' => $invoice->user_id,
            'staffName' => $invoice->user?->name ?? 'Unassigned',
            'staffEmail' => $invoice->user?->email ?? null,
            'userId' => $invoice->user_id,
            'user' => $invoice->user
                ? [
                    'id' => $invoice->user->id,
                    'name' => $invoice->user->name,
                    'email' => $invoice->user->email,
                    'role' => $invoice->user->role,
                ]
                : null,
            'sentAt' => $this->formatDate($invoice->sent_at),
            'sentBy' => $invoice->sent_by,
            'rejectionReason' => $invoice->rejection_reason,
            'rejectedAt' => $this->formatDate($invoice->rejected_at),
            'rejectedBy' => $invoice->rejected_by,
            'approvedAt' => $this->formatDate($invoice->approved_at),
            'approvedBy' => $invoice->approved_by,
            'approvalNotes' => $invoice->approval_notes,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFORM JOB ORDER
    |--------------------------------------------------------------------------
    */

    private function transformJobOrder(JobOrder $jobOrder): array
    {
        $quotationTotal = $jobOrder->quotationTotal();
        $billingMonths = $jobOrder->billingMonths();
        $monthlyAmount = $jobOrder->monthlyAmount();

        /*
        |----------------------------------------------------------------------
        | ✅ MONTHLY BILLING RECORDS (isang invoice kada buwan)
        |----------------------------------------------------------------------
        */

        $billings = $jobOrder->relationLoaded('invoices')
            ? $jobOrder->invoices
            : collect();

        /* ✅ Rejected ay hindi bilang — para makapag-correct pa rin */
        $billedCount = $billings
            ->filter(fn (Invoice $invoice) => $invoice->service_month !== null)
            ->reject(fn (Invoice $invoice) => $invoice->status === 'Rejected')
            ->unique('service_month')
            ->count();

        /* Total na na-approve lamang ang tinutukoy na "billed" */
        $totalBilled = (float) $billings
            ->reject(fn (Invoice $invoice) => $invoice->status === 'Rejected')
            ->sum('amount');

        return [
            'id' => $jobOrder->id,
            'number' => $jobOrder->number,
            'userId' => $jobOrder->user_id,
            'staffId' => $jobOrder->user_id,
            'staffName' => $jobOrder->user?->name ?? 'Unassigned',
            'staffEmail' => $jobOrder->user?->email ?? null,
            'client' => $jobOrder->client,
            'clientEmail' => $jobOrder->client_email,
            'clientContact' => $jobOrder->client_contact,
            'clientAddress' => $jobOrder->client_address,
            'project' => $jobOrder->project,
            'location' => $jobOrder->location,
            'equipment' => $jobOrder->equipment,
            'operator' => $jobOrder->operator,
            'startDate' => $jobOrder->start_date ? $jobOrder->start_date->format('Y-m-d') : null,
            'endDate' => $jobOrder->end_date ? $jobOrder->end_date->format('Y-m-d') : null,
            'amount' => (float) $jobOrder->amount,
            'quotationTotal' => $quotationTotal,
            'billingMonths' => $billingMonths > 0 ? $billingMonths : null,
            'monthlyAmount' => $monthlyAmount,
            'billedCount' => $billedCount,
            'approvedCount' => $jobOrder->approvedBillingsCount(),
            'rejectedCount' => $jobOrder->rejectedBillingsCount(),
            'pendingCount' => $jobOrder->pendingBillingsCount(),
            'totalBilled' => $totalBilled,
            'remainingAmount' => max(0, round($quotationTotal - $totalBilled, 2)),
            /* ✅ Lock logic — para sa Create Billing button */
            'canCreateBilling' => $jobOrder->canCreateBilling(),
            'isFullyBilled' => $jobOrder->isFullyBilled(),
            'isFullyCompleted' => $jobOrder->isFullyCompleted(),
            'billingStatus' => $jobOrder->billingStatus(),
            'billings' => $billings
                ->map(fn (Invoice $invoice) => [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'billingNumber' => $invoice->billing_number,
                    'serviceMonth' => $invoice->service_month,
                    'billingSequence' => $invoice->billing_sequence,
                    'baseAmount' => $invoice->baseAmountValue(),
                    'vatAmount' => $invoice->vatAmountValue(),
                    'additionalCharges' => $invoice->additionalChargesValue(),
                    'totalAmount' => $invoice->totalAmountValue(),
                    'amount' => (float) $invoice->amount,
                    'status' => $invoice->status,
                    'matchesJobOrder' => $invoice->matchesJobOrder(),
                    'dueDate' => $invoice->due_date
                        ? $invoice->due_date->format('Y-m-d')
                        : null,
                    'createdAt' => $invoice->created_at
                        ? $invoice->created_at->format('Y-m-d H:i:s')
                        : null,
                ])
                ->values(),
            'description' => $jobOrder->description,
            'notes' => $jobOrder->notes,
            'status' => $jobOrder->status,
            'generatedAt' => $jobOrder->generated_at ? $jobOrder->generated_at->format('Y-m-d H:i:s') : null,
            'generatedBy' => $jobOrder->generatedBy
                ? [
                    'id' => $jobOrder->generatedBy->id,
                    'name' => $jobOrder->generatedBy->name,
                    'email' => $jobOrder->generatedBy->email,
                ]
                : null,
            'hasInvoice' => $jobOrder->invoice !== null,
            'invoiceId' => $jobOrder->invoice?->id,
            /* Invoice No. = NULL hanggang ma-approve ng admin */
            'invoiceNumber' => $jobOrder->invoice?->number,
            'billingNumber' => $jobOrder->invoice?->billing_number,
            'invoice' => $jobOrder->invoice
                ? [
                    'id' => $jobOrder->invoice->id,
                    'number' => $jobOrder->invoice->number,
                    'hasInvoiceNumber' => filled($jobOrder->invoice->number),
                    'billingNumber' => $jobOrder->invoice->billing_number,
                    'status' => $jobOrder->invoice->status,
                    'amount' => (float) $jobOrder->invoice->amount,
                    'dueDate' => $jobOrder->invoice->due_date ? $jobOrder->invoice->due_date->format('Y-m-d') : null,
                ]
                : null,
            'rejectionReason' => $jobOrder->rejection_reason,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT DATE SAFELY
    |--------------------------------------------------------------------------
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
    */

    private function getInvoiceStatus(Invoice $invoice): string
    {
        if (
            $invoice->status === 'Pending' &&
            $invoice->due_date &&
            $invoice->due_date->isBefore(now()->startOfDay())
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
            $user && in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to access billing records.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE AUTHORIZATION
    |--------------------------------------------------------------------------
    */

    private function authorizeInvoice(Invoice $invoice): void
    {
        $user = Auth::user();

        abort_unless(
            $user && in_array($user->role, ['staff', 'admin'], true),
            403,
            'You are not authorized to access this invoice.'
        );
    }
}
