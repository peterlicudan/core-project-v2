<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LoginOtpNotification extends Notification
{
    use Queueable;

    protected string $pin;

    public function __construct(string $pin)
    {
        $this->pin = $pin;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('ALIBATON Staff Login Authentication PIN')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line(
                'A login attempt was made on your ALIBATON staff account.'
            )
            ->line(
                'Use the authentication PIN below to complete your login:'
            )
            ->line('')
            ->line($this->pin)
            ->line('')
            ->line(
                'This PIN is valid for 5 minutes.'
            )
            ->line(
                'For security, this PIN can only be used for the current login attempt.'
            )

            ->salutation('Regards, ALIBATON Administration');
    }
}

