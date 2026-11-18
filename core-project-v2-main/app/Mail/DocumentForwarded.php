<?php

namespace App\Mail;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DocumentForwarded extends Mailable
{
    use Queueable, SerializesModels;

    public Document $document;
    public string $subjectText;
    public string $messageText;
    public ?string $filePath;
    public ?string $fileName;

    /**
     * Create a new message instance.
     */
    public function __construct(
        Document $document,
        string $subject,
        string $message,
        ?string $filePath,
        ?string $fileName
    ) {
        $this->document = $document;
        $this->subjectText = $subject;
        $this->messageText = $message;
        $this->filePath = $filePath;
        $this->fileName = $fileName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->subjectText,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.document-forwarded',
            with: [
                'document' => $this->document,
                'messageText' => $this->messageText,
                'fileName' => $this->fileName,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        if (empty($this->filePath)) {
            return [];
        }

        try {
            if (!file_exists($this->filePath)) {
                Log::error('Document file not found for attachment.', [
                    'document_id' => $this->document->id ?? null,
                    'file_path' => $this->filePath,
                ]);
                return [];
            }

            return [
                Attachment::fromPath($this->filePath)
                    ->as($this->fileName ?? 'document.pdf')
                    ->withMime(
                        $this->document->mime_type ?? 'application/octet-stream'
                    ),
            ];
        } catch (\Throwable $e) {
            Log::error('Failed to attach document file.', [
                'document_id' => $this->document->id ?? null,
                'file_path' => $this->filePath,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }
}