<?php

namespace App\Events;

use App\Models\Payment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $payment;

    public function __construct(Payment $payment)
    {
        $this->payment = $payment;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('payment-management'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'payment.received';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->payment->id,
            'receipt' => $this->payment->receipt,
            'client' => $this->payment->client,
            'invoice' => $this->payment->invoice,
            'amount' => $this->payment->amount,
            'paid_amount' => $this->payment->paid_amount,
            'remaining_balance' => $this->payment->remaining_balance,
            'status' => $this->payment->status,
            'payment_date' => $this->payment->payment_date,
            'message' => "Payment received from {$this->payment->client}",
        ];
    }
}
