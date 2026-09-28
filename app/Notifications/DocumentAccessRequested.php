<?php

namespace App\Notifications;

use App\Models\Document;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentAccessRequested extends Notification
{
    use Queueable;

    public function __construct(
        public Document $document,
        public User $staff,
        public int $requestId
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'document_access_request',
            'request_id' => $this->requestId,
            'document_id' => $this->document->id,
            'document_title' => $this->document->title,
            'file_name' => $this->document->file_name,
            'staff_id' => $this->staff->id,
            'staff_name' => $this->staff->name,
            'staff_email' => $this->staff->email,
            'message' => $this->staff->name
                . ' requested access to company document "'
                . $this->document->title
                . '".',
        ];
    }
}
