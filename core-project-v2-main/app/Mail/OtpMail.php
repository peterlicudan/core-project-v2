<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * The OTP code (plaintext — for display only).
     */
    public string $otp;

    /**
     * The user's name (for personalization).
     */
    public string $userName;

    /**
     * The expiry duration in minutes.
     */
    public int $expiryMinutes;

    /**
     * Create a new message instance.
     */
    public function __construct(
        string $otp,
        string $userName = 'Administrator',
        int $expiryMinutes = 5,
    ) {
        $this->otp = $otp;
        $this->userName = $userName;
        $this->expiryMinutes = $expiryMinutes;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'ALIBATON - Your Login Verification Code',
            from: config('mail.from.address'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
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
