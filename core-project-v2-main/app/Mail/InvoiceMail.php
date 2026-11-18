<?php

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    public $invoice;
    public $subjectLine;
    public $customMessage;

    public function __construct(Invoice $invoice, $subject = null, $message = null)
    {
        $this->invoice = $invoice;

        /*
        |------------------------------------------------------------------
        | OK Reference label — ang Invoice No. ay NULL hanggang ma-approve,
        | kaya Billing No. (BILL-YYYY-NNN) ang fallback. Para walang
        | mailable na "Invoice  from ALIBATON".
        |------------------------------------------------------------------
        */

        $ref = $invoice->number
            ?? $invoice->billing_number
            ?? "#{$invoice->id}";

        $this->subjectLine = $subject ?? "Invoice {$ref} from ALIBATON";
        $this->customMessage = $message;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectLine,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.invoice-client',
            with: [
                'invoice' => $this->invoice,
                'customMessage' => $this->customMessage,
                'status' => $this->invoice->status,
                'amount' => number_format($this->invoice->amount, 2),
                'dueDate' => $this->invoice->due_date?->format('F d, Y'),
                'client' => $this->invoice->client,
                'number' => $this->invoice->number ?? $this->invoice->billing_number,
                'rejectionReason' => $this->invoice->rejection_reason,
                'project' => $this->invoice->project,
            ],
        );
    }
}
