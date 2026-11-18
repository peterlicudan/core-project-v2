<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffAccountCreated extends Notification
{
    use Queueable;

    /**
     * Temporary password supplied by the administrator.
     */
    protected string $temporaryPassword;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $temporaryPassword)
    {
        $this->temporaryPassword = $temporaryPassword;
    }

    /**
     * Send through email.
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
        $loginUrl = url('/login');

        return (new MailMessage)
            ->subject('Your ALIBATON Staff Account Has Been Created')
            ->view(
                'emails.staff-account-created',
                [
                    'user' => $notifiable,
                    'temporaryPassword' => $this->temporaryPassword,
                    'loginUrl' => $loginUrl,
                ]
            );
    }
}
