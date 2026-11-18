<?php

namespace App\Mail;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $invitationUrl;

    public function __construct(
        public User $admin,
        public string $rawToken,
        public string $invitedByName,
        public Carbon $expiresAt,
    ) {
        // ✅ FIXED: Point to admin invitation acceptance page
        $this->invitationUrl = url('/admin/accept-invite') . '?token=' . urlencode($rawToken);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You\'re Invited — ALIBATON Admin Access',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.admin-invitation',
            with: [
                'admin' => $this->admin,
                'invitationUrl' => $this->invitationUrl,
                'invitedByName' => $this->invitedByName,
                'expiresAt' => $this->expiresAt,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}