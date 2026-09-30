<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Notification;
use App\Models\JobOrder;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminBillingController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | INDEX — Billing Management Page
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        $invoices = Invoice::with(['user', 'jobOrder'])
            ->latest('created_at')
            ->get()
            ->map(fn (Invoice $invoice) => $this->transformForAdmin($invoice));

        $pendingInvoices = $invoices
            ->where('status', 'Pending')
            ->values();

        /*
        |--------------------------------------------------------------------------
        | ✅ JOB ORDERS (reference / verification ng admin)
        |--------------------------------------------------------------------------
        |
        | Hindi na ito "pending approval" — ang BILLING na ang ina-verify ng
        | admin. Ito lang ang reference para makita kung tugma ang billing.
        |
        */

        $jobOrders = JobOrder::with([
            'user:id,name,email',
            'generatedBy:id,name,email',
            'invoices:id,job_order_id,status,service_month,amount,base_amount,billing_number',
        ])
            ->latest('created_at')
            ->get()
            ->map(function (JobOrder $jobOrder) {
                return [
                    'id' => $jobOrder->id,
                    'number' => $jobOrder->number,
                    'client' => $jobOrder->client,
                    'clientEmail' => $jobOrder->client_email,
                    'clientContact' => $jobOrder->client_contact,
                    'clientAddress' => $jobOrder->client_address,
                    'project' => $jobOrder->project,
                    'location' => $jobOrder->location,
                    'equipment' => $jobOrder->equipment,
                    'operator' => $jobOrder->operator,
                    'startDate' => $jobOrder->start_date?->format('Y-m-d'),
                    'endDate' => $jobOrder->end_date?->format('Y-m-d'),
                    'amount' => (float) $jobOrder->amount,
                    'quotationTotal' => $jobOrder->quotationTotal(),
                    'billingMonths' => $jobOrder->billingMonths(),
                    'monthlyAmount' => $jobOrder->monthlyAmount(),
                    'description' => $jobOrder->description,
                    'notes' => $jobOrder->notes,
                    'status' => $jobOrder->status,
                    'billingStatus' => $jobOrder->billingStatus(),
                    'pendingCount' => $jobOrder->pendingBillingsCount(),
                    'approvedCount' => $jobOrder->approvedBillingsCount(),
                    'rejectedCount' => $jobOrder->rejectedBillingsCount(),
                    'generatedAt' => $jobOrder->generated_at?->format('Y-m-d H:i:s'),
                    'generatedByName' => $jobOrder->generatedBy?->name ?? 'Staff',
                    'staffName' => $jobOrder->user?->name ?? 'Unassigned',
                    'billings' => $jobOrder->invoices
                        ->map(fn (Invoice $invoice) => [
                            'id' => $invoice->id,
                            'billingNumber' => $invoice->billing_number,
                            'serviceMonth' => $invoice->service_month,
                            'status' => $invoice->status,
                            'baseAmount' => $invoice->baseAmountValue(),
                            'totalAmount' => (float) $invoice->amount,
                        ])
                        ->values(),
                ];
            })
            ->values();

        $pendingJobOrders = $jobOrders->where('pendingCount', '>', 0)->values();

        $stats = [
            'pending' => $invoices->where('status', 'Pending')->count(),
            'approved' => $invoices->where('status', 'Approved')->count(),
            'rejected' => $invoices->where('status', 'Rejected')->count(),
            'paid' => $invoices->where('status', 'Paid')->count(),
            'overdue' => $invoices->where('status', 'Overdue')->count(),
            'mismatched' => $invoices->where('matchesJobOrder', false)->count(),
            'total' => $invoices->count(),
            'pendingJobOrders' => $pendingJobOrders->count(),
        ];

        // ✅ NOTIFICATIONS (polymorphic) — shared with the global bell
        $notifications = $this->flattenNotifications();

        return Inertia::render('Admin/BillingManagement', [
            'invoices' => $invoices,
            'pendingInvoices' => $pendingInvoices,
            'pendingJobOrders' => $pendingJobOrders,
            'jobOrders' => $jobOrders,
            'stats' => $stats,
            'notifications' => $notifications,
        ]);
    }

    /**
     * ✅ ADMIN NOTIFICATION LIST (JSON) — ginagamit ng global bell
     * para mag-poll/kumuha ng pinakabagong notifications kahit
     * hindi pa nag-reload ang buong page.
     */
    public function notificationList(): JsonResponse
    {
        return response()->json([
            'notifications' => $this->flattenNotifications(),
        ]);
    }

    /**
     * Flatten the admin's notifications into the UI shape:
     * { id, title, message, type, link, read, createdAt }.
     */
    private function flattenNotifications(): array
    {
        return Notification::where('notifiable_type', 'App\\Models\\User')
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
                    'link' => $data['link'] ?? $data['redirect_url'] ?? null,
                    'read' => !is_null($notification->read_at),
                    'createdAt' => $notification->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->toArray();
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ TRANSFORM INVOICE PARA SA ADMIN VERIFICATION
    |--------------------------------------------------------------------------
    */

    private function transformForAdmin(Invoice $invoice): array
    {
        $jobOrder = $invoice->jobOrder;

        $expected = $jobOrder?->monthlyAmount() ?? 0.0;
        $base = $invoice->baseAmountValue();
        $matches = $expected > 0 ? abs($base - $expected) < 0.01 : null;
        $difference = $invoice->amountDifferenceValue();

        return [
            'id' => $invoice->id,
            'number' => $invoice->number,
            'hasInvoiceNumber' => filled($invoice->number),
            'billingNumber' => $invoice->billing_number,
            'client' => $invoice->client,
            'clientEmail' => $invoice->client_email,
            'clientAddress' => $invoice->client_address,
            'project' => $invoice->project,
            'description' => $invoice->description,
            'notes' => $invoice->notes,
            'amount' => (float) $invoice->amount,
            'baseAmount' => $base,
            'vatRate' => (float) ($invoice->vat_rate ?? 0),
            'vatAmount' => $invoice->vatAmountValue(),
            'additionalCharges' => $invoice->additionalChargesValue(),
            'totalAmount' => $invoice->totalAmountValue(),
            'status' => $invoice->status,
            'due_date' => $invoice->due_date?->format('Y-m-d'),
            'created_at' => $invoice->created_at?->format('Y-m-d H:i:s'),
            'serviceMonth' => $invoice->service_month,
            'billingSequence' => $invoice->billing_sequence,
            'approved_at' => $invoice->approved_at?->format('Y-m-d H:i:s'),
            'approved_by' => $invoice->approved_by,
            'rejected_at' => $invoice->rejected_at?->format('Y-m-d H:i:s'),
            'rejected_by' => $invoice->rejected_by,
            'rejection_reason' => $invoice->rejection_reason,
            'verified_at' => $invoice->verified_at?->format('Y-m-d H:i:s'),
            'verified_by' => $invoice->verified_by,
            'staffName' => $invoice->user?->name ?? 'Unassigned',

            /* ✅ VERIFICATION DATA — JO vs Billing */
            'jobOrderId' => $invoice->job_order_id,
            'jobOrderNumber' => $jobOrder?->number,
            'jobOrderStatus' => $jobOrder?->billingStatus(),
            'quotationTotal' => $jobOrder?->quotationTotal() ?? 0,
            'billingMonths' => $jobOrder?->billingMonths() ?? 0,
            'monthlyAmount' => $expected,
            'expectedAmount' => $expected,
            'amountDifference' => $difference ?? 0,
            'matchesJobOrder' => $matches,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $request->validate([
            'client' => 'required|string|max:255',
            'project' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'nullable|date',
        ]);

        $invoice = Invoice::create([
            'number' => null,
            'billing_number' => $this->generateBillingNumber(),
            'client' => $request->client,
            'client_email' => $request->client_email,
            'client_address' => $request->client_address,
            'client_contact' => $request->client_contact,
            'project' => $request->project,
            'amount' => $request->amount,
            'due_date' => $request->due_date,
            'description' => $request->description,
            'notes' => $request->notes,
            'status' => 'Pending',
            'staff_id' => Auth::id(),
        ]);

        return redirect()->back()->with('success', "Billing record {$invoice->billing_number} has been created.");
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $request->validate([
            'client' => 'required|string|max:255',
            'project' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'nullable|date',
        ]);

        $invoice->update([
            'client' => $request->client,
            'client_email' => $request->client_email,
            'client_address' => $request->client_address,
            'client_contact' => $request->client_contact,
            'project' => $request->project,
            'amount' => $request->amount,
            'due_date' => $request->due_date,
            'description' => $request->description,
            'notes' => $request->notes,
        ]);

        return redirect()->back()->with('success', "Billing record {$this->ref($invoice)} has been updated.");
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE STATUS
    |--------------------------------------------------------------------------
    */

    public function updateStatus(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        $request->validate([
            'status' => 'required|in:Pending,Approved,Rejected,Paid,Overdue,Partial',
        ]);

        /* ✅ Kapag manu-mano inilipat sa Approved, doon din nabubuo ang invoice number */
        if ($request->status === 'Approved' && blank($invoice->number)) {
            $invoice->number = $this->generateInvoiceNumber();
        }

        $invoice->status = $request->status;
        $invoice->save();

        $invoice->jobOrder?->syncBillingStatus();

        return redirect()->back()->with('success', "Billing record {$this->ref($invoice)} status updated to {$request->status}.");
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoiceNumber = $this->ref($invoice);
        $invoice->delete();

        return redirect()->back()->with('success', "Billing record {$invoiceNumber} has been deleted.");
    }

    // ============================================================
    // ✅ JOB ORDER APPROVAL
    // ============================================================

    public function approveJobOrder(Request $request, $id)
    {
        $jobOrder = JobOrder::findOrFail($id);

        if ($jobOrder->status !== 'Pending Admin Approval') {
            return redirect()->back()->with('error', "Job Order {$jobOrder->number} is not pending admin approval.");
        }

        if ($jobOrder->invoice()->exists()) {
            return redirect()->back()->with('error', "Job Order {$jobOrder->number} already has an invoice.");
        }

        $result = DB::transaction(function () use ($jobOrder, $request) {
            $jobOrder->update([
                'status' => 'Generated',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);

            $invoice = Invoice::create([
                /* ✅ Walang invoice number pa — ito ay billing record pa lang */
                'number' => null,
                'billing_number' => $this->generateBillingNumber(),
                'job_order_id' => $jobOrder->id,
              'user_id' => $jobOrder->user_id ?? Auth::id(),
'staff_id' => $jobOrder->user_id ?? Auth::id(),
                'client' => $jobOrder->client,
                'client_email' => $jobOrder->client_email,
                'client_address' => $jobOrder->client_address,
                'client_contact' => $jobOrder->client_contact,
                'project' => $jobOrder->project,
                'amount' => $jobOrder->amount,
                'status' => 'Pending',
                'due_date' => now()->addDays(30),
                'description' => $jobOrder->description ?? 'Heavy Equipment & Logistics Service',
                'notes' => $jobOrder->notes,
                'payment_method' => $request->input('payment_method', 'Bank Transfer'),
            ]);

            if ($jobOrder->user_id) {
                $this->createNotification(
                    Auth::id(),
                    $jobOrder->user_id,
                    'Job Order Approved ✅',
                    "Your Job Order {$jobOrder->number} has been approved. A billing record is ready for verification.",
                    'success',
                    '/billing-invoicing'
                );
            }

            return ['jobOrder' => $jobOrder, 'invoice' => $invoice];
        });

        return redirect()->back()->with(
            'success',
            "Job Order {$result['jobOrder']->number} approved. Billing record {$result['invoice']->billing_number} is ready for verification."
        );
    }

    public function rejectJobOrder(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:3|max:500',
        ]);

        $jobOrder = JobOrder::findOrFail($id);

        if ($jobOrder->status !== 'Pending Admin Approval') {
            return redirect()->back()->with('error', "Job Order {$jobOrder->number} is not pending admin approval.");
        }

        $jobOrder->update([
            'status' => 'Pending',
            'generated_at' => null,
            'generated_by' => null,
            'approved_at' => null,
            'approved_by' => null,
        ]);

        if ($jobOrder->user_id) {
            $this->createNotification(
                Auth::id(),
                $jobOrder->user_id,
                'Job Order Rejected ❌',
                "Your Job Order {$jobOrder->number} was rejected. Reason: {$request->reason}",
                'error',
                '/job-orders'
            );
        }

        return redirect()->back()->with(
            'success',
            "Job Order {$jobOrder->number} was rejected. Staff has been notified."
        );
    }

    // ============================================================
    // INVOICE APPROVAL
    // ============================================================

    /**
     * Approve an invoice
     *
     * ✅ UPDATED: Nag-capture na ng $payment at nagpapasa ng extra data
     */
    public function approve(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'Pending') {
            return redirect()->back()->with('error', 'Only pending billing records can be approved.');
        }

        /*
        |----------------------------------------------------------------------
        | ✅ VERIFICATION: dapat TUGMA ang billing sa Job Order
        | Ihahambing yung BASE amount (excl. VAT + additional charges) sa
        | monthly amount ng approved quotation.
        |----------------------------------------------------------------------
        */

        $jobOrder = $invoice->jobOrder;

        if ($jobOrder) {
            $expected = $jobOrder->monthlyAmount();
            $base = $invoice->baseAmountValue();

            if ($expected > 0 && abs($base - $expected) >= 0.01) {
                return redirect()->back()->with(
                    'error',
                    "Hindi tugma ang billing at job order. Expected base amount: ₱" .
                        number_format($expected, 2) .
                        " pero ₱" .
                        number_format($base, 2) .
                        ". Pumunta sa Reject para makita ng staff ang problema."
                );
            }
        }

        /*
        |----------------------------------------------------------------------
        | ✅ DUN LANG GUMAWA NG INVOICE
        |----------------------------------------------------------------------
        |
        | Ang billing record ay walang invoice number hanggang ngayon.
        | Sa APPROVE na lang natatanggap ang Invoice No. — kaya lang
        | gumagawa ang Service Invoice, at doon na lumalabas ang number
        | kasama ang Billing No. at Job Order No.
        |
        */

        if (blank($invoice->number)) {
            $invoice->number = $this->generateInvoiceNumber();
        }

        $invoice->status = 'Approved';
        $invoice->approved_at = now();
        $invoice->approved_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->approval_notes = $request->notes;
        $invoice->verified_at = now();
        $invoice->verified_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->save();

        // ✅ Job Order status = Completed kapag na-approve na lahat, else Created
        $jobOrder?->syncBillingStatus();

        // ✅ Create payment record — CAPTURE the returned $payment
        $payment = $this->createPaymentRecord($invoice);

        // Notify staff
        $staffId = $invoice->staff_id ?? $invoice->user_id ?? 1;

        // ✅ Build extra data for enhanced notification
        $extraData = [];
        if ($payment) {
            $extraData = [
                'payment_id' => $payment->id,
                'invoice_id' => $invoice->id,
                'receipt' => $payment->receipt,
                'client' => $payment->client,
                'client_email' => $payment->client_email,
                'invoice' => $invoice->number,
                'status' => $payment->status,
                'amount' => (float) $payment->amount,
                'paid_amount' => (float) ($payment->paid_amount ?? 0),
                'remaining_balance' => (float) ($payment->remaining_balance ?? $payment->amount),
                'due_date' => $payment->due_date,
                'redirect_url' => "/payment-management?payment_id={$payment->id}",
                'changes' => [
                    'status' => [
                        'from' => null,
                        'to' => $payment->status,
                    ],
                    'amount' => [
                        'from' => null,
                        'to' => (float) $payment->amount,
                    ],
                ],
            ];
        }

        $billingRef = $invoice->billing_number ?? $invoice->number ?? "#{$invoice->id}";

        $this->createNotification(
            Auth::id(),
            $staffId,
            'Billing Record Approved ✅',
            "Billing record {$billingRef} has been verified and approved by " . Auth::user()->name . ". Service Invoice {$invoice->number} is now available. You can bill the next month.",
            'success',
            '/billing-invoicing',
            $extraData   // ✅ IPASA
        );

        return redirect()->back()->with(
            'success',
            "Billing record {$billingRef} verified and approved. Service Invoice {$invoice->number} created."
        );
    }

    /**
     * Reject an invoice
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'Pending') {
            return redirect()->back()->with('error', 'Only pending billing records can be rejected.');
        }

        $jobOrder = $invoice->jobOrder;
        $billingRef = $invoice->billing_number ?? $invoice->number ?? "#{$invoice->id}";

        $invoice->status = 'Rejected';
        $invoice->rejected_at = now();
        $invoice->rejected_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->rejection_reason = $request->reason;
        $invoice->verified_at = now();
        $invoice->verified_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->save();

        if ($jobOrder) {
            $jobOrder->rejection_reason = $request->reason;
            $jobOrder->save();

            /* ✅ Job Order status = Rejected (staff can re-create the billing) */
            $jobOrder->syncBillingStatus();
        }

        $staffId = $invoice->staff_id ?? $invoice->user_id ?? 1;

        $this->createNotification(
            Auth::id(),
            $staffId,
            'Billing Record Rejected ❌',
            "Billing record {$billingRef} has been rejected. Reason: {$request->reason}",
            'error',
            '/billing-invoicing'
        );

        return redirect()->back()->with(
            'success',
            "Billing record {$billingRef} has been rejected. Staff can now create a corrected billing."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL
    |--------------------------------------------------------------------------
    */

    public function sendEmail($id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'Approved') {
            return redirect()->back()->with('error', 'Only approved invoices can be sent to the client.');
        }

        $invoice->sent_at = now();
        $invoice->sent_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->save();

        $docLabel = $invoice->status === 'Approved'
            ? "Service Invoice {$invoice->number}"
            : "Billing record {$this->ref($invoice)}";

        return redirect()
            ->back()
            ->with('success', "{$docLabel} has been sent to {$invoice->client}.");
    }

    /*
    |--------------------------------------------------------------------------
    | NOTIFICATIONS
    |--------------------------------------------------------------------------
    */

    public function markNotificationAsRead($id)
    {
        $notification = Notification::where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->where('id', $id)
            ->firstOrFail();

        $notification->read_at = now();
        $notification->save();

        return response()->json(['success' => true]);
    }

    public function markAllNotificationsAsRead()
    {
        Notification::where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    /**
     * ✅ Reference label para sa flash messages.
     *
     * Billing No. kung meron (kahit hindi pa approved), kaya walang
     * lumilitaw na "Invoice" na walang number.
     */
    private function ref(Invoice $invoice): string
    {
        return $invoice->billing_number
            ?? $invoice->number
            ?? "#{$invoice->id}";
    }

    /**
     * ✅ Gumagawa ng Billing No. (BILL-YYYY-NNN) — mayroon agad sa pag-create.
     *
     * Ito ang number na ginagamit sa Billing Records (walang invoice number).
     */
    private function generateBillingNumber(): string
    {
        $year = (int) date('Y');

        $max = Invoice::query()
            ->where('billing_number', 'like', "BILL-{$year}-%")
            ->pluck('billing_number')
            ->map(function ($number) {
                return preg_match('/(\d+)$/', (string) $number, $matches)
                    ? (int) $matches[1]
                    : 0;
            })
            ->max() ?? 0;

        return sprintf('BILL-%d-%03d', $year, ((int) $max) + 1);
    }

    /**
     * ✅ Gumagawa ng Invoice No. (INV-YYYY-NNNN) — TINATAWAG LANG NG APPROVE().
     *
     * Hindi basta `orderByDesc('id')` dahil may ibang number format sa DB
     * (INV-TEST-..., INV-2026-1790683296) na makakaisang ma-skip.
     * Kinukuha ang pinakamalangi numeric suffix na 4-digit, at 0 kapag wala.
     */
    private function generateInvoiceNumber(): string
    {
        $year = (int) date('Y');

        $max = Invoice::query()
            ->whereNotNull('number')
            ->where('number', 'like', "INV-{$year}-%")
            ->pluck('number')
            ->map(function ($number) {
                return preg_match('/(\d+)$/', (string) $number, $matches)
                    ? (int) $matches[1]
                    : 0;
            })
            ->max() ?? 0;

        return sprintf('INV-%d-%04d', $year, ((int) $max) + 1);
    }

    /**
     * Create a notification (polymorphic)
     *
     * ✅ UPDATED: Nag-accept na ng $extraData parameter
     */
    private function createNotification(
        $fromUserId,
        $toUserId,
        $title,
        $message,
        $type = 'info',
        $link = null,
        array $extraData = []   // ✅ BAGONG PARAMETER
    ) {
        // Check if user exists
        $user = User::find($toUserId);
        if (!$user) {
            $admin = User::where('role', 'admin')->first();
            if ($admin) {
                $toUserId = $admin->id;
            } else {
                return;
            }
        }

        $uuid = \Illuminate\Support\Str::uuid();

        Notification::create([
            'id' => $uuid,
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $toUserId,
            'type' => 'admin_notification',
            'data' => json_encode(array_merge([
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'link' => $link,
                'from_user_id' => $fromUserId,
            ], $extraData)),   // ✅ MERGE EXTRA DATA
            'read_at' => null,
        ]);
    }

    /**
     * Create payment record from approved invoice
     *
     * ✅ UPDATED: Nag-re-return na ng $payment
     */
    private function createPaymentRecord(Invoice $invoice)
    {
        // Check if payment already exists
        $existingPayment = Payment::where('invoice_id', $invoice->id)->first();
        if ($existingPayment) {
            return $existingPayment;   // ✅ RETURN EXISTING
        }

        // Create new payment
        $payment = Payment::create([
            'user_id' => $invoice->user_id,
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->number,
            /* ✅ REFERENCE — Billing No., para laging nasa Payment Management */
            'billing_number' => $invoice->billing_number,
            'client' => $invoice->client,
            'amount' => $invoice->amount,
            'status' => 'Pending',
            'due_date' => $invoice->due_date,
            'payment_date' => null,
            'receipt_number' => null,
            'receipt' => null,
            'payment_method' => null,
            'notes' => 'Auto-generated from approved billing ' . $this->ref($invoice),
            'archived' => false,
        ]);

        return $payment;   // ✅ RETURN NEW PAYMENT
    }
}
