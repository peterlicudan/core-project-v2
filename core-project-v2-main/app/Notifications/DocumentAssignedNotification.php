<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(public Document $document) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $isCompany = $this->document->document_type === 'company';

        return [
            'type' => 'document_assigned',
            'title' => $isCompany
                ? 'New Company Document'
                : 'New Client Document',
            'message' => "'{$this->document->title}' has been uploaded and assigned to you.",
            'status' => 'active',
            'document_id' => $this->document->id,
            'redirect_url' => "/compliance?document_id={$this->document->id}",
            'client' => $this->document->assignee?->name,
            'receipt' => $this->document->file_name,
            'changes' => [
                'status' => [
                    'from' => '—',
                    'to' => 'New',
                ],
            ],
        ];
    }
}
