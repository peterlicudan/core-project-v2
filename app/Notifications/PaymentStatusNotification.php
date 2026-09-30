<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PaymentStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $payment;
    public $statusMessage;

    public function __construct(Payment $payment, string $statusMessage = '')
    {
        $this->payment = $payment;
        $this->statusMessage = $statusMessage;
    }

    /**
     * Channels: database lang (para sa notification bell)
     */
    public function via($notifiable): array
    {
        return ['database'];
    }

    /**
     * Data na ise-save sa `data` column
     */
    public function toDatabase($notifiable): array
    {
        return [
            'payment_id' => $this->payment->id,
            'receipt' => $this->payment->receipt,
            'client' => $this->payment->client,
            'client_email' => $this->payment->client_email,
            'invoice' => $this->payment->invoice,
            'invoice_id' => $this->payment->invoice_id,
            'amount' => $this->payment->amount,
            'paid_amount' => $this->payment->paid_amount,
            'remaining_balance' => $this->payment->remaining_balance,
            'status' => $this->payment->status,
            'payment_date' => $this->payment->payment_date,
            'partial_payment_date' => $this->payment->partial_payment_date,
            'due_date' => $this->payment->due_date,
            'message' => $this->statusMessage ?: "Payment update for {$this->payment->invoice}",
            'title' => "Payment Status: {$this->payment->status}",
            'url' => "/payment-management?payment={$this->payment->id}",
        ];
    }

    /**
     * Array representation (para sa broadcasting kung kailangan)
     */
    public function toArray($notifiable): array
    {
        return $this->toDatabase($notifiable);
    }
}
