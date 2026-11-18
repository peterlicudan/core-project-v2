<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class AlibatonVerifyEmail extends VerifyEmail
{
    /**
     * Build the verification mail message.
     */
    public function toMail($notifiable)
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verify Your ALIBATON Account')
            ->view(
                'emails.verify-email',
                [
                    'user' => $notifiable,
                    'verificationUrl' => $verificationUrl,
                ]
            );
    }
}
