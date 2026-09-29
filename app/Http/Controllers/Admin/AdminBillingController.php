<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Notification;
use App\Models\JobOrder;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminBillingController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | INDEX — Billing Management Page
    |--------------------------------------------------------------------------
    |
    | ✅ Loads:
    | - Invoices (for billing approval)
    | - Pending Invoices
    | - ✅ Pending Job Orders (for Job Order approval)
    | - Stats
    | - Notifications
    |
    */

    public function index()
    {
        $invoices = Invoice::with(['user', 'jobOrder'])->get();
        $pendingInvoices = Invoice::where('status', 'Pending')
            ->with(['user', 'jobOrder'])
            ->get();

        // ✅ PENDING JOB ORDERS — para sa admin approval
        $pendingJobOrders = JobOrder::where('status', 'Pending Admin Approval')
            ->with(['user:id,name,email', 'generatedBy:id,name,email'])
            ->latest()
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
                    'description' => $jobOrder->description,
                    'notes' => $jobOrder->notes,
                    'status' => $jobOrder->status,
                    'generatedAt' => $jobOrder->generated_at?->format('Y-m-d H:i:s'),
                    'generatedByName' => $jobOrder->generatedBy?->name ?? 'Staff',
                    'staffName' => $jobOrder->user?->name ?? 'Unassigned',
                    'hasInvoice' => false,
                    'invoiceId' => null,
                    'invoiceNumber' => null,
                ];
            })
            ->values();

        $stats = [
            'pending' => Invoice::where('status', 'Pending')->count(),
            'approved' => Invoice::where('status', 'Approved')->count(),
            'rejected' => Invoice::where('status', 'Rejected')->count(),
            'paid' => Invoice::where('status', 'Paid')->count(),
            'overdue' => Invoice::where('status', 'Overdue')->count(),
            'total' => Invoice::count(),
            // ✅ BAGO — Pending Job Orders count
            'pendingJobOrders' => $pendingJobOrders->count(),
        ];

        // ✅ NOTIFICATIONS (polymorphic)
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
                ];
            });

        return Inertia::render('Admin/BillingManagement', [
            'invoices' => $invoices,
            'pendingInvoices' => $pendingInvoices,
            'pendingJobOrders' => $pendingJobOrders,   // ✅ BAGO
            'stats' => $stats,
            'notifications' => $notifications,
        ]);
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
            'number' => $this->generateInvoiceNumber(),
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

        return redirect()->back()->with('success', "Invoice {$invoice->number} has been created.");
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

        return redirect()->back()->with('success', "Invoice {$invoice->number} has been updated.");
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

        $invoice->status = $request->status;
        $invoice->save();

        return redirect()->back()->with('success', "Invoice {$invoice->number} status updated to {$request->status}.");
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoiceNumber = $invoice->number;
        $invoice->delete();

        return redirect()->back()->with('success', "Invoice {$invoiceNumber} has been deleted.");
    }

    // ============================================================
    // ✅ JOB ORDER APPROVAL (BAGO)
    // ============================================================

    /**
     * ✅ APPROVE JOB ORDER → Create Invoice
     *
     * Flow:
     * - Job Order status: "Pending Admin Approval" → "Generated"
     * - Invoice AUTO-CREATED (status = "Pending")
     * - Staff notified
     */
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
            // 1. Update Job Order
            $jobOrder->update([
                'status' => 'Generated',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);

            // 2. Create Invoice
            $invoiceNumber = $this->generateInvoiceNumber();

            $invoice = Invoice::create([
                'number' => $invoiceNumber,
                'job_order_id' => $jobOrder->id,
                'user_id' => $jobOrder->user_id,
                'staff_id' => $jobOrder->user_id,
                'client' => $jobOrder->client,
                'client_email' => $jobOrder->client_email,
                'client_address' => $jobOrder->client_address,
                'client_contact' => $jobOrder->client_contact,
                'project' => $jobOrder->project,
                'amount' => $jobOrder->amount,
                'status' => 'Pending',   // ✅ Invoice status = Pending (billing approval next)
                'due_date' => now()->addDays(30),
                'description' => $jobOrder->description ?? 'Heavy Equipment & Logistics Service',
                'notes' => $jobOrder->notes,
                'payment_method' => $request->input('payment_method', 'Bank Transfer'),
            ]);

            // 3. Notify staff
            if ($jobOrder->user_id) {
                $this->createNotification(
                    Auth::id(),
                    $jobOrder->user_id,
                    'Job Order Approved ✅',
                    "Your Job Order {$jobOrder->number} has been approved. Invoice {$invoiceNumber} has been created and awaits payment.",
                    'success',
                    '/billing-invoicing'
                );
            }

            return ['jobOrder' => $jobOrder, 'invoice' => $invoice];
        });

        return redirect()->back()->with(
            'success',
            "Job Order {$result['jobOrder']->number} approved. Invoice {$result['invoice']->number} has been created."
        );
    }

    /**
     * ✅ REJECT JOB ORDER
     *
     * Flow:
     * - Job Order status: "Pending Admin Approval" → "Pending"
     * - No invoice created
     * - Staff notified
     */
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

        // Notify staff
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
    // INVOICE APPROVAL (EXISTING)
    // ============================================================

    /**
     * Approve an invoice
     */
    public function approve(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'Pending') {
            return redirect()->back()->with('error', 'Only pending invoices can be approved.');
        }

        $invoice->status = 'Approved';
        $invoice->approved_at = now();
        $invoice->approved_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->approval_notes = $request->notes;
        $invoice->save();

        // Update related job order if exists
        if ($invoice->jobOrder) {
            $invoice->jobOrder->status = 'Approved';
            $invoice->jobOrder->save();
        }

        // Create payment record
        $this->createPaymentRecord($invoice);

        // Notify staff
        $staffId = $invoice->staff_id ?? $invoice->user_id ?? 1;

        $this->createNotification(
            Auth::id(),
            $staffId,
            'Invoice Approved ✅',
            "Invoice {$invoice->number} has been approved by " . Auth::user()->name . ' and payment record created.',
            'success',
            '/payment-management'
        );

        return redirect()->back()->with('success', "Invoice {$invoice->number} has been approved and payment record created.");
    }

    /**
     * Reject an invoice
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:3|max:500',
        ]);

        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'Pending') {
            return redirect()->back()->with('error', 'Only pending invoices can be rejected.');
        }

        $invoice->status = 'Rejected';
        $invoice->rejected_at = now();
        $invoice->rejected_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->rejection_reason = $request->reason;
        $invoice->save();

        if ($invoice->jobOrder) {
            $invoice->jobOrder->status = 'Rejected';
            $invoice->jobOrder->rejection_reason = $request->reason;
            $invoice->jobOrder->save();
        }

        $staffId = $invoice->staff_id ?? $invoice->user_id ?? 1;

        $this->createNotification(
            Auth::id(),
            $staffId,
            'Invoice Rejected ❌',
            "Invoice {$invoice->number} has been rejected. Reason: {$request->reason}",
            'error',
            '/billing-invoicing'
        );

        return redirect()->back()->with('success', "Invoice {$invoice->number} has been rejected.");
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

        return redirect()->back()->with('success', "Invoice {$invoice->number} has been sent to {$invoice->client}.");
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
     * Generate unique invoice number
     */
    private function generateInvoiceNumber()
    {
        $year = date('Y');

        $lastInvoice = Invoice::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastInvoice && preg_match('/-(\d+)$/', $lastInvoice->number, $matches)) {
            $lastNumber = (int) $matches[1];
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "INV-{$year}-{$newNumber}";
    }

    /**
     * Create a notification (polymorphic)
     */
    private function createNotification($fromUserId, $toUserId, $title, $message, $type = 'info', $link = null)
    {
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
            'data' => json_encode([
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'link' => $link,
                'from_user_id' => $fromUserId,
            ]),
            'read_at' => null,
        ]);
    }

    /**
     * Create payment record from approved invoice
     */
    private function createPaymentRecord(Invoice $invoice)
    {
        $existingPayment = Payment::where('invoice_id', $invoice->id)->first();
        if ($existingPayment) {
            return;
        }

        Payment::create([
            'user_id' => $invoice->user_id,
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->number,
            'client' => $invoice->client,
            'amount' => $invoice->amount,
            'status' => 'Pending',
            'due_date' => $invoice->due_date,
            'payment_date' => null,
            'receipt_number' => null,
            'receipt' => null,
            'payment_method' => null,
            'notes' => 'Auto-generated from approved invoice #' . $invoice->number,
            'archived' => false,
        ]);
    }
}