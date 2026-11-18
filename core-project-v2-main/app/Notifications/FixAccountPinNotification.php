<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FixAccountPinNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $pin,
        public string $requestedBy = 'Superadmin',
        public string $reason = '',
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('ALIBATON — Fix Account PIN')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('A superadmin (' . $this->requestedBy . ') has requested to fix your account.')
            ->line('')
            ->line('Your 6-digit fix-account PIN is:')
            ->line('**' . $this->pin . '**')
            ->line('')
            ->line('This PIN is valid for **5 minutes**.')
            ->line('Use it to reset your password and regain access to your account.');

        if (!empty($this->reason)) {
            $mail->line('')
                ->line('**Reason:** ' . $this->reason);
        }

        return $mail
            ->line('')
            ->line('If you did not expect this, please contact support immediately.')
            ->salutation('— ALIBATON Security');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'pin' => $this->pin,
            'requested_by' => $this->requestedBy,
            'reason' => $this->reason,
        ];
    }
}
