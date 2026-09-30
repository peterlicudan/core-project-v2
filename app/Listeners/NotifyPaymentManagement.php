<?php

namespace App\Listeners;

use App\Events\PaymentReceived;
use App\Models\User;
use App\Notifications\PaymentStatusNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

class NotifyPaymentManagement implements ShouldQueue
{
    public function handle(PaymentReceived $event): void
    {
        $payment = $event->payment;

        $totalAmount = (float) ($payment->amount ?? 0);
        $paidAmount = (float) ($payment->paid_amount ?? 0);
        $currentStatus = strtolower(trim((string) ($payment->status ?? 'pending')));

        // Recompute status based on current data
        if ($currentStatus === 'paid' || $currentStatus === 'fully paid') {
            $status = 'Fully Paid';
            $payment->update([
                'status' => $status,
                'paid_amount' => $totalAmount,
                'remaining_balance' => 0,
                'payment_date' => $payment->payment_date ?? now(),
            ]);
        } elseif ($currentStatus === 'partial' || $currentStatus === 'partially paid' || $paidAmount > 0) {
            $status = 'Partially Paid';
            $payment->update([
                'status' => $status,
                'paid_amount' => $paidAmount,
                'remaining_balance' => max(0, $totalAmount - $paidAmount),
                'partial_date' => $payment->partial_date ?? now(),
            ]);
        } else {
            $status = 'Due';
            $payment->update([
                'status' => $status,
                'paid_amount' => 0,
                'remaining_balance' => $totalAmount,
            ]);
        }

        // Build message based on status
        $message = match ($status) {
            'Fully Paid' => "Payment fully settled for {$payment->invoice_number} by {$payment->client}",
            'Partially Paid' => "Partial payment received for {$payment->invoice_number} from {$payment->client}",
            'Due' => "Payment is due for {$payment->invoice_number} - {$payment->client}",
            default => "Payment status updated to {$status}",
        };

        // Send notification to staff and admin users
        $financeUsers = User::whereIn('role', ['staff', 'admin'])->get();

        foreach ($financeUsers as $user) {
            $user->notify(new PaymentStatusNotification($payment->fresh(), $message));
        }
    }
}
