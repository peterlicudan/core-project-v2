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
use Inertia\Inertia;

class AdminBillingController extends Controller
{
    /**
     * Display the billing management page
     */
    public function index()
    {
        $invoices = Invoice::with(['user', 'jobOrder'])->get();
        $pendingInvoices = Invoice::where('status', 'Pending')->with(['user', 'jobOrder'])->get();

        $stats = [
            'pending' => Invoice::where('status', 'Pending')->count(),
            'approved' => Invoice::where('status', 'Approved')->count(),
            'rejected' => Invoice::where('status', 'Rejected')->count(),
            'paid' => Invoice::where('status', 'Paid')->count(),
            'overdue' => Invoice::where('status', 'Overdue')->count(),
            'total' => Invoice::count(),
        ];

        // ✅ I-ADAPT PARA SA EXISTING NOTIFICATIONS TABLE (polymorphic)
        $notifications = Notification::where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($notification) {
                // I-extract ang data from JSON
                $data = is_array($notification->data) ? $notification->data : json_decode($notification->data, true);

                return [
                    'id' => $notification->id,
                    'title' => $data['title'] ?? 'Notification',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'link' => $data['link'] ?? null,
                    'read' => !is_null($notification->read_at),
                    'created_at' => $notification->created_at,
                ];
            });

        return Inertia::render('Admin/BillingManagement', [
            'invoices' => $invoices,
            'pendingInvoices' => $pendingInvoices,
            'stats' => $stats,
            'notifications' => $notifications,
        ]);
    }

    /**
     * Store a newly created invoice
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

    /**
     * Update an invoice
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

    /**
     * Update invoice status
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

    /**
     * Delete an invoice
     */
    public function destroy($id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoiceNumber = $invoice->number;
        $invoice->delete();

        return redirect()->back()->with('success', "Invoice {$invoiceNumber} has been deleted.");
    }

    // ============================================================
    // APPROVE & REJECT METHODS
    // ============================================================

    /**
     * Approve an invoice
     */
    public function approve(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);

        // Check if invoice is pending
        if ($invoice->status !== 'Pending') {
            return redirect()->back()->with('error', 'Only pending invoices can be approved.');
        }

        // Update invoice status
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

        // ✅ CREATE PAYMENT RECORD
        $this->createPaymentRecord($invoice);

        // Get staff user ID
        $staffId = $invoice->staff_id ?? $invoice->user_id ?? 1;

        // Create notification for staff
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

        // Check if invoice is pending
        if ($invoice->status !== 'Pending') {
            return redirect()->back()->with('error', 'Only pending invoices can be rejected.');
        }

        // Update invoice status
        $invoice->status = 'Rejected';
        $invoice->rejected_at = now();
        $invoice->rejected_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->rejection_reason = $request->reason;
        $invoice->save();

        // Update related job order if exists
        if ($invoice->jobOrder) {
            $invoice->jobOrder->status = 'Rejected';
            $invoice->jobOrder->rejection_reason = $request->reason;
            $invoice->jobOrder->save();
        }

        // Get staff user ID
        $staffId = $invoice->staff_id ?? $invoice->user_id ?? 1;

        // Create notification for staff
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

    /**
     * Send invoice email to client
     */
    public function sendEmail($id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'Approved') {
            return redirect()->back()->with('error', 'Only approved invoices can be sent to the client.');
        }

        // TODO: Add actual email sending logic here
        // Mail::to($invoice->client_email)->send(new \App\Mail\InvoiceMail($invoice));

        $invoice->sent_at = now();
        $invoice->sent_by = Auth::user()->name ?? Auth::user()->email;
        $invoice->save();

        return redirect()->back()->with('success', "Invoice {$invoice->number} has been sent to {$invoice->client}.");
    }

    /**
     * Mark notification as read
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

    /**
     * Mark all notifications as read
     */
    public function markAllNotificationsAsRead()
    {
        Notification::where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', Auth::id())
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }

    /**
     * Generate unique invoice number
     */
    private function generateInvoiceNumber()
    {
        $year = date('Y');
        $lastInvoice = Invoice::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = intval(substr($lastInvoice->number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "INV-{$year}-{$newNumber}";
    }

    /**
     * Create a notification
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
        // Check if payment already exists for this invoice
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
