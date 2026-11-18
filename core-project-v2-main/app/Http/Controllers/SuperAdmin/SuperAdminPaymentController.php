<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Mail\PaymentStatusMail;
use App\Models\Payment;
use App\Services\AdminNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SuperAdminPaymentController extends Controller
{
    private const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid', 'Rejected'];
    private const PAYMENT_METHODS = ['Bank Transfer', 'Cheque'];

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL MONITORING — main page (replaces closure)
    |--------------------------------------------------------------------------
    */

    public function financialMonitoring(Request $request)
    {
        $this->authorizeSuperAdmin();

        /*
        |----------------------------------------------------------------------
        | FILTERED PAYMENTS (for table)
        |----------------------------------------------------------------------
        */

        $query = Payment::query()
            ->with([
                'user:id,name,email,role',
                'invoice:id,number,billing_number,client,client_email,project,amount,status,job_order_id',
                'invoice.jobOrder:id,number',
                'editor:id,name,email',
                'updatedBy:id,name,email',
            ]);

        if ($status = $request->input('status')) {
            $query->whereRaw('LOWER(status) = ?', [strtolower($status)]);
        }
        if ($method = $request->input('method')) {
            $query->where('payment_method', $method);
        }
        if ($request->has('verified') && $request->input('verified') !== '') {
            $query->where('superadmin_verified', (bool) $request->input('verified'));
        }
        if ($request->has('rejected') && $request->input('rejected') !== '') {
            $query->where('superadmin_rejected', (bool) $request->input('rejected'));
        }
        if ($from = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'like', "%{$search}%")
                    ->orWhere('receipt', 'like', "%{$search}%")
                    ->orWhere('invoice_number', 'like', "%{$search}%")
                    ->orWhere('client', 'like', "%{$search}%")
                    ->orWhere('client_email', 'like', "%{$search}%");
            });
        }

        $payments = $query
            ->latest('id')
            ->get()
            ->map(fn (Payment $payment) => $this->formatPayment($payment))
            ->values();

        /*
        |----------------------------------------------------------------------
        | STATS (real, from all payments)
        |----------------------------------------------------------------------
        */

        $allPayments = Payment::query();

        $totalInvoiced = (float) (clone $allPayments)->sum('amount');
        $collected = (float) (clone $allPayments)
            ->whereRaw('LOWER(status) = ?', ['paid'])
            ->sum('amount');
        $outstanding = (float) (clone $allPayments)
            ->whereRaw('LOWER(status) IN (?, ?)', ['pending', 'partial'])
            ->sum('amount');
        $overdueQuery = (clone $allPayments)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', today())
            ->whereRaw('LOWER(status) IN (?, ?)', ['pending', 'partial']);
        $overdue = (float) $overdueQuery->sum('amount');
        $overdueCount = $overdueQuery->count();

        $stats = [
            'revenue' => $totalInvoiced,
            'collected' => $collected,
            'pending' => $outstanding,
            'overdue' => $overdue,
            'overdueCount' => $overdueCount,
            'count' => Payment::count(),
            'verified' => Payment::where('superadmin_verified', true)->count(),
            'rejected' => Payment::where('superadmin_rejected', true)->count(),
            'pendingVerification' => Payment::where('superadmin_verified', false)
                ->where('superadmin_rejected', false)
                ->count(),
        ];

        /*
        |----------------------------------------------------------------------
        | MONTHLY TREND (last 12 months)
        |----------------------------------------------------------------------
        */

     $monthlyTrend = Payment::query()
    ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as ym, COUNT(*) as count, SUM(amount) as total")
    ->where('created_at', '>=', now()->subMonths(12)->startOfMonth())
        ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
    ->orderBy('ym')
    ->get()
    ->map(fn ($row) => [
        'month' => $row->ym,
        'count' => (int) $row->count,
        'revenue' => (float) $row->total,
        'collected' => (float) Payment::query()
            ->whereRaw("TO_CHAR(created_at, 'YYYY-MM') = ?", [$row->ym])
            ->whereRaw('LOWER(status) = ?', ['paid'])
            ->sum('amount'),
    ])
    ->toArray();

        /*
        |----------------------------------------------------------------------
        | BY STATUS
        |----------------------------------------------------------------------
        */

        $byStatus = Payment::query()
            ->selectRaw('LOWER(status) as status_key, COUNT(*) as count, SUM(amount) as total')
                ->groupByRaw('LOWER(status)')
            ->get()
            ->mapWithKeys(fn ($row) => [
                $row->status_key ?: 'unknown' => [
                    'count' => (int) $row->count,
                    'amount' => (float) $row->total,
                ],
            ])
            ->toArray();

        return Inertia::render('SuperAdmin/FinancialMonitoring', [
            'payments' => $payments,
            'stats' => $stats,
            'monthlyTrend' => $monthlyTrend,
            'byStatus' => $byStatus,
            'paymentStatuses' => self::PAYMENT_STATUSES,
            'paymentMethods' => self::PAYMENT_METHODS,
            'filters' => [
                'status' => $request->input('status'),
                'method' => $request->input('method'),
                'verified' => $request->input('verified'),
                'rejected' => $request->input('rejected'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
                'search' => $request->input('search'),
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE — edit payment (method, dates, notes) — Safe Edit
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, Payment $payment)
    {
        $this->authorizeSuperAdmin();

        $currentStatus = strtolower(trim((string) ($payment->status ?: 'Pending')));

        // Locked if already Rejected
        if ($currentStatus === 'rejected') {
            return back()->withErrors([
                'payment' => 'Rejected payments cannot be edited.',
            ]);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:Bank Transfer,Cheque'],
            'payment_date' => ['nullable', 'date'],
            'partial_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        DB::transaction(function () use ($payment, $validated) {
            $payment->payment_method = $validated['payment_method'];
            $payment->payment_date = $validated['payment_date'] ?? null;
            $payment->partial_date = $validated['partial_date'] ?? null;
            $payment->due_date = $validated['due_date'] ?? null;
            $payment->notes = $validated['notes'] ?? null;
            $payment->edited_by = Auth::id();
            $payment->edited_at = now();
            $payment->updated_by = Auth::id();
            $payment->save();
        });

        return back()->with('success', 'Payment updated successfully.');
    }

    /*
    |--------------------------------------------------------------------------
    | MARK PARTIAL — set to Partial (auto 50% of invoice)
    |--------------------------------------------------------------------------
    */

    public function markPartial(Payment $payment)
    {
        $this->authorizeSuperAdmin();

        if ($payment->superadmin_rejected) {
            return back()->withErrors([
                'payment' => 'Cannot modify a rejected payment.',
            ]);
        }

        DB::transaction(function () use ($payment) {
            $invoice = $payment->invoice;

            if (!$invoice) {
                abort(422, 'This payment has no linked invoice.');
            }

            $invoiceAmount = (float) $invoice->amount;

            if ($invoiceAmount <= 0) {
                abort(422, 'Invoice amount must be greater than zero.');
            }

            $payment->status = 'Partial';
            $payment->amount = round($invoiceAmount / 2, 2);
            $payment->partial_date = $payment->partial_date ?: now()->toDateString();
            $payment->payment_date = null;
            $payment->edited_by = Auth::id();
            $payment->edited_at = now();
            $payment->updated_by = Auth::id();
            $payment->save();

            $this->syncInvoiceStatus($payment);
        });

        $fresh = $payment->fresh(['user', 'invoice']);
        if ($fresh) {
            $ref = $this->paymentReference($fresh);
            AdminNotifier::toUser(
                $fresh->user,
                'Payment marked Partial by Superadmin ⏳',
                "Your payment {$ref} was marked as Partial (50% of invoice).",
                'warning',
                "/payment-management?payment_id={$fresh->id}"
            );
        }

        return back()->with('success', 'Payment marked as Partial (50%).');
    }

    /*
    |--------------------------------------------------------------------------
    | MARK PAID — set to Fully Paid
    |--------------------------------------------------------------------------
    */

    public function markPaid(Payment $payment)
    {
        $this->authorizeSuperAdmin();

        if ($payment->superadmin_rejected) {
            return back()->withErrors([
                'payment' => 'Cannot modify a rejected payment.',
            ]);
        }

        DB::transaction(function () use ($payment) {
            $invoice = $payment->invoice;

            if (!$invoice) {
                abort(422, 'This payment has no linked invoice.');
            }

            $invoiceAmount = (float) $invoice->amount;

            if ($invoiceAmount <= 0) {
                abort(422, 'Invoice amount must be greater than zero.');
            }

            $payment->status = 'Paid';
            $payment->amount = $invoiceAmount;
            $payment->payment_date = now()->toDateString();
            $payment->due_date = null;
            $payment->edited_by = Auth::id();
            $payment->edited_at = now();
            $payment->updated_by = Auth::id();
            $payment->save();

            $this->syncInvoiceStatus($payment);
        });

        $fresh = $payment->fresh(['user', 'invoice']);
        if ($fresh) {
            $ref = $this->paymentReference($fresh);
            AdminNotifier::toUser(
                $fresh->user,
                'Payment marked Fully Paid ✅',
                "Your payment {$ref} was marked as Fully Paid by superadmin.",
                'success',
                "/payment-management?payment_id={$fresh->id}"
            );
        }

        return back()->with('success', 'Payment marked as Fully Paid.');
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL — to client
    |--------------------------------------------------------------------------
    */

    public function sendEmail(Request $request, Payment $payment)
    {
        $this->authorizeSuperAdmin();

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:10000'],
        ]);

        $payment->load(['user', 'invoice']);

        try {
            Mail::to($validated['email'])->send(
                new PaymentStatusMail(
                    $payment,
                    $validated['subject'],
                    $validated['message']
                )
            );
        } catch (\Throwable $e) {
            report($e);
            return back()->withErrors([
                'email' => 'Email could not be sent. Check SMTP/mail configuration.',
            ]);
        }

        return back()->with('success', "Email sent to {$validated['email']}.");
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS — sync invoice status
    |--------------------------------------------------------------------------
    */

    private function syncInvoiceStatus(Payment $payment): void
    {
        if (!$payment->invoice_id) {
            return;
        }

        $invoice = \App\Models\Invoice::find($payment->invoice_id);
        if (!$invoice) {
            return;
        }

        $totalPaid = (float) Payment::query()
            ->where('invoice_id', $invoice->id)
            ->whereIn('status', ['Paid', 'Partial'])
            ->sum('amount');

        $invoiceAmount = (float) $invoice->amount;

        if ($totalPaid >= $invoiceAmount) {
            $invoice->status = 'Paid';
        } elseif ($totalPaid > 0) {
            $invoice->status = 'Partial';
        } else {
            $invoice->status = 'Pending';
        }

        $invoice->save();
    }

    /*
    |--------------------------------------------------------------------------
    | REJECT — (enhanced: allow Paid override? No, Q1=A)
    |--------------------------------------------------------------------------
    */

    public function reject(Request $request, Payment $payment)
    {
        $this->authorizeSuperAdmin();

        if ($payment->superadmin_verified) {
            return back()->withErrors([
                'payment' => 'Cannot reject a payment that has already been verified.',
            ]);
        }

        if ($payment->superadmin_rejected) {
            return back()->withErrors([
                'payment' => 'This payment has already been rejected.',
            ]);
        }

        $status = strtolower(trim((string) $payment->status));
        if ($status === 'paid') {
            return back()->withErrors([
                'payment' => 'Fully Paid payments cannot be rejected by superadmin.',
            ]);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $reason = trim($validated['reason']);

        DB::transaction(function () use ($payment, $reason) {
            $payment->superadmin_rejected = true;
            $payment->superadmin_rejected_at = now();
            $payment->superadmin_rejected_by = Auth::id();
            $payment->superadmin_rejection_reason = $reason;

            $existingNotes = trim((string) $payment->notes);
            $payment->notes = ($existingNotes !== '' ? $existingNotes . "\n" : '')
                . "Superadmin rejected: {$reason}";

            $payment->save();
        });

        $fresh = $payment->fresh(['user', 'invoice']);
        if ($fresh) {
            $ref = $this->paymentReference($fresh);

            AdminNotifier::toRole('admin', 'Payment Rejected by Superadmin ❌',
                "Payment {$ref} was rejected. Reason: {$reason}", 'error', '/admin/payments',
                ['payment_id' => $fresh->id, 'reason' => $reason]);

            AdminNotifier::toUser($fresh->user, 'Payment Rejected ❌',
                "Your payment {$ref} was rejected. Reason: {$reason}", 'error',
                "/payment-management?payment_id={$fresh->id}",
                ['payment_id' => $fresh->id, 'reason' => $reason]);
        }

        return back()->with('success', 'Payment rejected.');
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY — final verification
    |--------------------------------------------------------------------------
    */

    public function verify(Payment $payment)
    {
        $this->authorizeSuperAdmin();

        if ($payment->superadmin_verified) {
            return back()->withErrors(['payment' => 'Already verified.']);
        }

        if ($payment->superadmin_rejected) {
            return back()->withErrors(['payment' => 'Cannot verify a rejected payment.']);
        }

        $status = strtolower(trim((string) $payment->status));
        if (!in_array($status, ['paid', 'partial'], true)) {
            return back()->withErrors(['payment' => 'Only Paid or Partial can be verified.']);
        }

        DB::transaction(function () use ($payment) {
            $payment->superadmin_verified = true;
            $payment->superadmin_verified_at = now();
            $payment->superadmin_verified_by = Auth::id();
            $payment->save();
        });

        $fresh = $payment->fresh(['user', 'invoice']);
        if ($fresh) {
            $ref = $this->paymentReference($fresh);
            AdminNotifier::toRole('admin', 'Payment Verified by Superadmin ✅',
                "Payment {$ref} verified by superadmin.", 'success', '/admin/payments',
                ['payment_id' => $fresh->id]);
            AdminNotifier::toUser($fresh->user, 'Payment Verified ✅',
                "Your payment {$ref} verified by superadmin.", 'success',
                "/payment-management?payment_id={$fresh->id}",
                ['payment_id' => $fresh->id]);
        }

        return back()->with('success', 'Payment verified.');
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT / HELPERS
    |--------------------------------------------------------------------------
    */

    private function paymentReference(Payment $payment): string
    {
        return $payment->receipt_number
            ?: $payment->receipt
            ?: 'PAY-' . str_pad((string) $payment->id, 4, '0', STR_PAD_LEFT);
    }

    private function formatPayment(Payment $payment): array
    {
        $invoice = $payment->invoice;
        $invoiceAmount = $invoice ? (float) $invoice->amount : 0;
        $totalPaid = $invoice
            ? (float) Payment::query()
                ->where('invoice_id', $invoice->id)
                ->whereIn('status', ['Paid', 'Partial'])
                ->sum('amount')
            : 0;

        return [
            'id' => $payment->id,
            'reference' => $this->paymentReference($payment),
            'receipt_number' => $payment->receipt_number,
            'receipt' => $payment->receipt,
            'client' => $payment->client ?? $invoice?->client ?? '—',
            'client_email' => $payment->client_email ?? $invoice?->client_email,
            'invoice_number' => $payment->invoice_number ?? $invoice?->number,
            'billing_number' => $payment->billing_number ?? $invoice?->billing_number,
            'job_order_number' => $invoice?->jobOrder?->number,
            'invoice_id' => $payment->invoice_id,
            'payment_method' => $payment->payment_method,
            'amount' => (float) $payment->amount,
            'invoice_amount' => $invoiceAmount,
            'total_paid' => $totalPaid,
            'remaining_balance' => max(0, $invoiceAmount - $totalPaid),
            'status' => $payment->status ?? 'Pending',
            'payment_date' => optional($payment->payment_date)->format('Y-m-d'),
            'partial_date' => optional($payment->partial_date)->format('Y-m-d'),
            'due_date' => optional($payment->due_date)->format('Y-m-d'),
            'notes' => $payment->notes,
            'superadmin_verified' => (bool) $payment->superadmin_verified,
            'superadmin_verified_at' => optional($payment->superadmin_verified_at)->format('M d, Y h:i A'),
            'superadmin_rejected' => (bool) $payment->superadmin_rejected,
            'superadmin_rejected_at' => optional($payment->superadmin_rejected_at)->format('M d, Y h:i A'),
            'superadmin_rejection_reason' => $payment->superadmin_rejection_reason,
            'user_id' => $payment->user_id,
            'user_name' => $payment->user?->name,
            'user_email' => $payment->user?->email,
            'user_role' => $payment->user?->role,
            'edited_by' => $payment->editor?->name,
            'edited_at' => optional($payment->edited_at)->format('M d, Y h:i A'),
            'created_at' => optional($payment->created_at)->format('M d, Y h:i A'),
            'updated_at' => optional($payment->updated_at)->format('M d, Y h:i A'),
        ];
    }

    private function authorizeSuperAdmin(): void
    {
        abort_unless(
            Auth::check() && Auth::user()->role === 'superadmin',
            403,
            'Only superadmins can perform this action.'
        );
    }
}