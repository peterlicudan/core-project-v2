<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CustomVerifyEmail extends Notification
{
    use Queueable;

    /**
     * The email verification PIN.
     */
    protected string $pin;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $pin)
    {
        $this->pin = $pin;
    }

    /**
     * Send notification through email.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Build the email.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your ALIBATON Verification PIN')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line(
                'Use the verification PIN below to verify your ALIBATON account:'
            )
            ->line('')
            ->line($this->pin)
            ->line('')
            ->line(
                'This PIN is valid for 5 minutes.'
            )
            ->line(
                'For security, this PIN can only be used for the current verification attempt.'
            )
            ->line(
                'If you did not request this verification PIN, please ignore this email.'
            )
            ->salutation('Regards, ALIBATON Administration');
    }
}
