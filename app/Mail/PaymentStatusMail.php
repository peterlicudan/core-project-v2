<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public Payment $payment;

    public string $emailSubject;

    public string $emailMessage;

    /**
     * Create a new message instance.
     */
    public function __construct(
        Payment $payment,
        string $emailSubject = '',
        string $emailMessage = ''
    ) {
        $this->payment = $payment;

        $this->emailSubject = trim($emailSubject) !== ''
            ? $emailSubject
            : 'ALIBATON Payment Status Update';

        $this->emailMessage = trim($emailMessage) !== ''
            ? $emailMessage
            : 'This is an official payment status update from ALIBATON Heavy Equipment & Logistics.';
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->emailSubject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-status',
            with: [
                'payment' => $this->payment,
                'emailSubject' => $this->emailSubject,
                'emailMessage' => $this->emailMessage,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
