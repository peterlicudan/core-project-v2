<?php

namespace App\Mail;

use App\Models\Compliance;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ComplianceForwarded extends Mailable
{
    use Queueable, SerializesModels;

    public Compliance $compliance;
    public string $subjectText;
    public string $messageText;
    public string $filePath;

    public function __construct(
        Compliance $compliance,
        string $subjectText,
        string $messageText,
        string $filePath
    ) {
        $this->compliance = $compliance;
        $this->subjectText = $subjectText;
        $this->messageText = $messageText;
        $this->filePath = $filePath;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectText
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.compliance-forwarded'
        );
    }

    public function attachments(): array
    {
        if (
            empty($this->filePath) ||
            !is_file($this->filePath)
        ) {
            return [];
        }

        return [
            Attachment::fromPath($this->filePath)
                ->as(
                    $this->compliance->file_name
                        ?: 'compliance_document'
                )
                ->withMime(
                    $this->compliance->mime_type
                        ?: 'application/octet-stream'
                ),
        ];
    }
}
