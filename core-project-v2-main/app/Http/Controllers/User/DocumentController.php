<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;

class DocumentController extends Controller
{
    /**
     * Display documents assigned to the currently logged-in staff.
     *
     * Visible documents:
     * 1. assigned_to = current logged-in user
     * 2. assigned_to IS NULL = All Staff
     *
     * Staff cannot see documents assigned to another staff member.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        /*
        |--------------------------------------------------------------------------
        | Get documents
        |--------------------------------------------------------------------------
        |
        | assigned_to = NULL
        |     -> All Staff
        |
        | assigned_to = current user ID
        |     -> Specifically assigned to this staff
        |
        */

        $documents = Document::query()
            ->with([
                'uploader:id,name,email,role',
                'assignee:id,name,email,role',
            ])
            ->where(function ($query) use ($user) {
                $query
                    ->whereNull('assigned_to')
                    ->orWhere('assigned_to', (int) $user->id);
            })
            ->latest('created_at')
            ->get()
            ->map(function (Document $document) {
                /*
                |--------------------------------------------------------------------------
                | File path
                |--------------------------------------------------------------------------
                |
                | We intentionally do NOT use:
                |
                | Storage::disk('public')->url(...)
                |
                | This avoids the ->url() issue you were getting.
                |
                */

                $filePath = ltrim(
                    (string) $document->file_path,
                    '/'
                );

                $fileUrl = null;

                if ($filePath !== '') {
                    $fileUrl = asset(
                        'storage/' . $filePath
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Download URL
                |--------------------------------------------------------------------------
                */

                $downloadUrl = route(
                    'user.documents.download',
                    [
                        'document' => $document->id,
                    ]
                );

                /*
                |--------------------------------------------------------------------------
                | Uploaded date
                |--------------------------------------------------------------------------
                */

                $createdAt = null;

                if ($document->created_at) {
                    $createdAt = $document
                        ->created_at
                        ->format('M d, Y h:i A');
                }

                /*
                |--------------------------------------------------------------------------
                | Assigned staff
                |--------------------------------------------------------------------------
                */

                $assignedName = null;
                $assignedEmail = null;

                if ($document->assignee) {
                    $assignedName =
                        $document->assignee->name;

                    $assignedEmail =
                        $document->assignee->email;
                }

                /*
                |--------------------------------------------------------------------------
                | Uploaded by
                |--------------------------------------------------------------------------
                */

                $uploadedByName = null;

                if ($document->uploader) {
                    $uploadedByName =
                        $document->uploader->name;
                }

                /*
                |--------------------------------------------------------------------------
                | File size
                |--------------------------------------------------------------------------
                */

                $fileSize =
                    $document->file_size !== null
                        ? (int) $document->file_size
                        : null;

                $formattedFileSize =
                    $this->formatFileSize(
                        $fileSize
                    );

                /*
                |--------------------------------------------------------------------------
                | Return frontend-safe record
                |--------------------------------------------------------------------------
                */

                return [
                    'id' => (int) $document->id,

                    'title' =>
                        $document->title,

                    'file_name' =>
                        $document->file_name,

                    'file_path' =>
                        $document->file_path,

                    'file_url' =>
                        $fileUrl,

                    'download_url' =>
                        $downloadUrl,

                    'assigned_to' =>
                        $document->assigned_to !== null
                            ? (int) $document->assigned_to
                            : null,

                    'assigned_name' =>
                        $assignedName,

                    'assigned_email' =>
                        $assignedEmail,

                    'uploaded_by' =>
                        $document->uploaded_by !== null
                            ? (int) $document->uploaded_by
                            : null,

                    'uploaded_by_name' =>
                        $uploadedByName,

                    'type' =>
                        $document->type ?: 'Other',

                    'description' =>
                        $document->description,

                    'status' =>
                        $document->status ?: 'Active',

                    'file_size' =>
                        $fileSize,

                    'formatted_file_size' =>
                        $formattedFileSize,

                    'mime_type' =>
                        $document->mime_type,

                    'created_at' =>
                        $createdAt,

                    'archived' =>
                        strtolower(
                            (string) $document->status
                        ) === 'archived',
                ];
            })
            ->values();

        return Inertia::render(
            'User/Compliance',
            [
                'documents' => $documents,
            ]
        );
    }

    /**
     * Download a document.
     */
    public function download(
        Request $request,
        Document $document
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        /*
        |--------------------------------------------------------------------------
        | SECURITY
        |--------------------------------------------------------------------------
        |
        | Staff can only download:
        |
        | assigned_to = themselves
        | OR
        | assigned_to = NULL / All Staff
        |
        */

        $canAccess =
            $document->assigned_to === null ||
            (int) $document->assigned_to ===
                (int) $user->id;

        if (!$canAccess) {
            abort(403);
        }

        /*
        |--------------------------------------------------------------------------
        | File path
        |--------------------------------------------------------------------------
        */

        $filePath = storage_path(
            'app/public/' .
            ltrim(
                (string) $document->file_path,
                '/'
            )
        );

        if (
            !is_file($filePath) ||
            !file_exists($filePath)
        ) {
            abort(
                404,
                'The document file could not be found.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Safe download filename
        |--------------------------------------------------------------------------
        */

        $downloadName =
            $document->file_name;

        if (
            !$downloadName ||
            trim($downloadName) === ''
        ) {
            $downloadName =
                'document-' .
                $document->id;
        }

        /*
        |--------------------------------------------------------------------------
        | MIME type
        |--------------------------------------------------------------------------
        */

        $mimeType =
            $document->mime_type;

        if (
            !$mimeType ||
            trim($mimeType) === ''
        ) {
            $mimeType =
                mime_content_type(
                    $filePath
                ) ?: 'application/octet-stream';
        }

        /*
        |--------------------------------------------------------------------------
        | Download
        |--------------------------------------------------------------------------
        |
        | No Storage::disk()->url()
        | No Storage::disk()->download()
        |
        */

        return Response::download(
            $filePath,
            $downloadName,
            [
                'Content-Type' =>
                    $mimeType,
            ]
        );
    }

    /**
     * Format bytes.
     */
    private function formatFileSize(
        ?int $bytes
    ): string {
        if (
            $bytes === null ||
            $bytes <= 0
        ) {
            return 'Unknown size';
        }

        $units = [
            'B',
            'KB',
            'MB',
            'GB',
            'TB',
        ];

        $size = (float) $bytes;
        $index = 0;

        while (
            $size >= 1024 &&
            $index < count($units) - 1
        ) {
            $size /= 1024;
            $index++;
        }

        return number_format(
            $size,
            $index === 0 ? 0 : 1
        ) .
            ' ' .
            $units[$index];
    }
}
