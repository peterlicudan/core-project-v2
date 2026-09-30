<?php

namespace App\Http\Controllers;

use App\Mail\DocumentForwarded;
use App\Models\Document;
use App\Models\DocumentAccessRequest;
use App\Models\DocumentAttachment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class DocumentController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | USER SIDE - VIEW DOCUMENTS
    |--------------------------------------------------------------------------
    */

    /**
     * Display documents for staff/users.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        $isAdmin = $user->role === 'admin';

        $documents = Document::with([
                'uploader',
                'assignee',
                'attachments',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $filteredDocuments = $documents
            ->filter(function ($document) use ($user) {
                return $document->canBeAccessedBy($user);
            })
            ->values();

        $filteredDocuments = $filteredDocuments->map(
            function ($document) use ($user) {

                $pendingRequest = DocumentAccessRequest::forDocument(
                        $document->id
                    )
                    ->forStaff($user->id)
                    ->pending()
                    ->first();

                $document->access_requested = !is_null(
                    $pendingRequest
                );

                $document->access_request_status =
                    $pendingRequest?->status;

                return $document;
            }
        );

        if ($isAdmin) {

            $allDocuments = Document::with([
                    'uploader',
                    'assignee',
                    'attachments',
                ])
                ->orderBy('created_at', 'desc')
                ->get();

            $filteredDocuments = $allDocuments
                ->map(function ($document) use ($user) {

                    $pendingRequest =
                        DocumentAccessRequest::forDocument(
                            $document->id
                        )
                        ->forStaff($user->id)
                        ->pending()
                        ->first();

                    $document->access_requested =
                        !is_null($pendingRequest);

                    $document->access_request_status =
                        $pendingRequest?->status;

                    return $document;
                })
                ->values();
        }

        return Inertia::render(
            'User/Compliance',
            [
                'documents' => $filteredDocuments,

                'auth' => [
                    'user' => [
                        'id' => $user->id,
                        'role' => $user->role,
                    ],
                ],
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN SIDE - DOCUMENT MANAGEMENT
    |--------------------------------------------------------------------------
    */

    /**
     * Display admin documents dashboard.
     */
    public function adminIndex(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            abort(403, 'Unauthorized access.');
        }

        $documents = Document::with([
                'uploader',
                'assignee',
                'attachments',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $clientDocuments = $documents
            ->filter(function ($doc) {
                return $doc->isClientDocument();
            })
            ->values();

        $companyDocuments = $documents
            ->filter(function ($doc) {
                return $doc->isCompanyDocument();
            })
            ->values();

        $accessRequests = DocumentAccessRequest::with([
                'document',
                'staff',
                'responder',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $staff = User::where('role', 'staff')
            ->orWhere('role', 'admin')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'email',
                'role',
            ]);

        return Inertia::render(
            'Admin/DocumentsCompliance',
            [
                'documents' => $documents,
                'clientDocuments' => $clientDocuments,
                'companyDocuments' => $companyDocuments,
                'accessRequests' => $accessRequests,
                'staff' => $staff,

                'auth' => [
                    'user' => [
                        'id' => $user->id,
                        'role' => $user->role,
                    ],
                ],
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DOCUMENT CRUD
    |--------------------------------------------------------------------------
    */

    /**
     * Store a new document.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $validator = Validator::make(
            $request->all(),
            [
                'title' => 'required|string|max:255',
                'type' => 'required|string|max:100',
                'description' => 'nullable|string',
                'status' => 'required|string|in:Active,Archived',
                'assigned_to' => 'nullable|exists:users,id',
                'document_type' => 'required|in:client,company',
                'is_locked' => 'boolean',
                'granted_staff_ids' => 'nullable|array',
                'granted_staff_ids.*' => 'exists:users,id',
                'file' => 'required|file|max:20480',
            ]
        );

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $file = $request->file('file');

        $filePath = $file->store(
            'documents',
            'public'
        );

        $document = Document::create([
            'title' => $request->title,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'type' => $request->type,
            'description' => $request->description,
            'status' => $request->status,
            'uploaded_by' => $user->id,
            'assigned_to' => $request->assigned_to,
            'document_type' => $request->document_type,
            'is_locked' => $request->is_locked ?? false,
            'granted_staff_ids' =>
                $request->granted_staff_ids ?? [],
        ]);

        return redirect()
            ->back()
            ->with(
                'success',
                'Document uploaded successfully.'
            );
    }

    /**
     * Update document.
     */
    public function update(
        Request $request,
        Document $document
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $validator = Validator::make(
            $request->all(),
            [
                'title' => 'sometimes|string|max:255',
                'type' => 'sometimes|string|max:100',
                'description' => 'nullable|string',
                'status' =>
                    'sometimes|string|in:Active,Archived',
                'assigned_to' =>
                    'nullable|exists:users,id',
                'is_locked' => 'boolean',
                'granted_staff_ids' => 'nullable|array',
                'granted_staff_ids.*' =>
                    'exists:users,id',
            ]
        );

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $document->update(
            $request->only([
                'title',
                'type',
                'description',
                'status',
                'assigned_to',
                'is_locked',
                'granted_staff_ids',
            ])
        );

        return redirect()
            ->back()
            ->with(
                'success',
                'Document updated successfully.'
            );
    }

    /**
     * Delete document.
     */
    public function destroy(Document $document)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        if ($document->file_path) {
            Storage::disk('public')->delete(
                $document->file_path
            );
        }

        DocumentAccessRequest::where(
            'document_id',
            $document->id
        )->delete();

        $document->delete();

        return redirect()
            ->back()
            ->with(
                'success',
                'Document deleted successfully.'
            );
    }

    /*
    |--------------------------------------------------------------------------
    | FORWARD DOCUMENT
    |--------------------------------------------------------------------------
    */

    public function forward(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if (!in_array(
            $user->role,
            ['staff', 'admin'],
            true
        )) {
            return back()->with('error', 'Unauthorized.');
        }

        $validator = Validator::make(
            $request->all(),
            [
                'document_id' => [
                    'required',
                    'integer',
                    'exists:documents,id',
                ],
                'email' => [
                    'required',
                    'email',
                    'max:255',
                ],
                'subject' => [
                    'required',
                    'string',
                    'max:255',
                ],
                'message' => [
                    'required',
                    'string',
                    'max:10000',
                ],
            ],
            [
                'document_id.required' =>
                    'The document is required.',
                'document_id.exists' =>
                    'The selected document could not be found.',
                'email.required' =>
                    'Please enter the recipient email address.',
                'email.email' =>
                    'Please enter a valid email address.',
                'subject.required' =>
                    'Please enter an email subject.',
                'message.required' =>
                    'Please enter an email message.',
            ]
        );

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $document = Document::find(
            $validator->validated()['document_id']
        );

        if (!$document) {
            return back()
                ->withErrors([
                    'document_id' =>
                        'The selected document could not be found.',
                ])
                ->withInput();
        }

        if (!$document->canBeAccessedBy($user)) {
            return back()->with(
                'error',
                'You do not have permission to forward this document.'
            );
        }

        if (empty($document->file_path)) {
            return back()
                ->withErrors([
                    'document_id' =>
                        'This document does not have a file attached.',
                ])
                ->withInput();
        }

        $disk = Storage::disk('public');

        if (!$disk->exists($document->file_path)) {

            Log::error(
                'Document file not found while forwarding.',
                [
                    'document_id' => $document->id,
                    'file_path' => $document->file_path,
                    'user_id' => $user->id,
                ]
            );

            return back()
                ->withErrors([
                    'document_id' =>
                        'The document file could not be found.',
                ])
                ->withInput();
        }

        $filePath = $disk->path(
            $document->file_path
        );

        $fileName = $document->file_name
            ?: basename($document->file_path);

        try {

            Mail::to(
                $validator->validated()['email']
            )->send(
                new DocumentForwarded(
                    $document,
                    $validator->validated()['subject'],
                    $validator->validated()['message'],
                    $filePath,
                    $fileName
                )
            );

        } catch (\Throwable $e) {

            Log::error(
                'Failed to forward document via email.',
                [
                    'document_id' => $document->id,
                    'sender_id' => $user->id,
                    'recipient_email' =>
                        $validator->validated()['email'],
                    'file_path' => $document->file_path,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]
            );

            return back()
                ->withErrors([
                    'email' =>
                        'Failed to send the document. Please check the mail configuration and try again.',
                ])
                ->withInput();
        }

        return back()->with(
            'success',
            'Document forwarded successfully to ' .
            $validator->validated()['email'] .
            '.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD
    |--------------------------------------------------------------------------
    */

    public function download(Document $document)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if (!$document->canBeAccessedBy($user)) {
            abort(
                403,
                'You do not have permission to download this document.'
            );
        }

        $filePath = $document->getResolvedFilePath();

        if (!$filePath || !file_exists($filePath)) {
            abort(404, 'File not found on the server.');
        }

        return response()->download(
            $filePath,
            $document->file_name ?: basename($filePath)
        );
    }

    public function downloadAttachment(Document $document, DocumentAttachment $attachment)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($attachment->document_id !== $document->id) {
            abort(404);
        }

        if (!$document->canBeAccessedBy($user)) {
            abort(
                403,
                'You do not have permission to download this attachment.'
            );
        }

        $filePath = $attachment->getResolvedFilePath();

        if (!$filePath || !file_exists($filePath)) {
            abort(404, 'Attachment file not found on the server.');
        }

        return response()->download(
            $filePath,
            $attachment->file_name ?: basename($filePath)
        );
    }

    /**
     * Stream document file inline for preview in iframe or direct viewing.
     */
    public function viewFile(Document $document)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if (!$document->canBeAccessedBy($user)) {
            abort(
                403,
                'You do not have permission to view this document.'
            );
        }

        $filePath = $document->getResolvedFilePath();

        if (!$filePath || !file_exists($filePath)) {
            abort(404, 'The document file could not be found on the server.');
        }

        $mime = $document->mime_type ?: (mime_content_type($filePath) ?: 'application/octet-stream');
        $fileName = $document->file_name ?: basename($filePath);

        return response()->file($filePath, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . addslashes($fileName) . '"',
            'Cache-Control' => 'private, no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Stream attachment file inline for preview in iframe or direct viewing.
     */
    public function viewAttachment(Document $document, DocumentAttachment $attachment)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($attachment->document_id !== $document->id) {
            abort(404);
        }

        if (!$document->canBeAccessedBy($user)) {
            abort(
                403,
                'You do not have permission to view this attachment.'
            );
        }

        $filePath = $attachment->getResolvedFilePath();

        if (!$filePath || !file_exists($filePath)) {
            abort(404, 'The attachment file could not be found on the server.');
        }

        $mime = $attachment->mime_type ?: (mime_content_type($filePath) ?: 'application/octet-stream');
        $fileName = $attachment->file_name ?: basename($filePath);

        return response()->file($filePath, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . addslashes($fileName) . '"',
            'Cache-Control' => 'private, no-cache, no-store, must-revalidate',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESS REQUESTS
    |--------------------------------------------------------------------------
    */

    /**
     * Request access to a locked document.
     *
     * IMPORTANT: Ginawang Inertia-compatible ang response.
     */
    public function requestAccess(
        Request $request,
        Document $document
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        /*
        |--------------------------------------------------------------------------
        | ONLY STAFF
        |--------------------------------------------------------------------------
        */

        if ($user->role !== 'staff') {
            return back()->with(
                'error',
                'Only staff can request access.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | ONLY COMPANY DOCUMENTS
        |--------------------------------------------------------------------------
        */

        if (!$document->isCompanyDocument()) {
            return back()->with(
                'error',
                'This document does not require access permission.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | DOCUMENT MUST BE LOCKED
        |--------------------------------------------------------------------------
        */

        if (!$document->isLocked()) {
            return back()->with(
                'error',
                'This document is already accessible.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK EXISTING ACCESS
        |--------------------------------------------------------------------------
        */

        if ($document->userHasPermission($user->id)) {
            return back()->with(
                'error',
                'You already have access to this document.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK PENDING REQUEST
        |--------------------------------------------------------------------------
        */

        if (
            DocumentAccessRequest::hasPendingRequest(
                $document->id,
                $user->id
            )
        ) {
            return back()->with(
                'error',
                'You already have a pending request.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | CREATE ACCESS REQUEST
        |--------------------------------------------------------------------------
        */

        DocumentAccessRequest::createRequest(
            $document->id,
            $user->id
        );

        return back()->with(
            'success',
            'Access request sent successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN - MANAGE PERMISSIONS
    |--------------------------------------------------------------------------
    */

    public function grantPermission(
        Request $request,
        Document $document
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $validator = Validator::make(
            $request->all(),
            [
                'staff_id' =>
                    'required|exists:users,id',
                'request_id' =>
                    'nullable|exists:document_access_requests,id',
            ]
        );

        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $document->grantPermission(
            $request->staff_id
        );

        if ($request->request_id) {

            $accessRequest =
                DocumentAccessRequest::find(
                    $request->request_id
                );

            if (
                $accessRequest &&
                $accessRequest->isPending()
            ) {
                $accessRequest->approve(
                    $user->id
                );
            }
        }

        return redirect()
            ->back()
            ->with(
                'success',
                'Permission granted successfully.'
            );
    }

    public function revokePermission(
        Document $document,
        $staffId
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $document->revokePermission(
            (int) $staffId
        );

        return redirect()
            ->back()
            ->with(
                'success',
                'Permission revoked successfully.'
            );
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN - MANAGE ACCESS REQUESTS
    |--------------------------------------------------------------------------
    */

    public function approveAccessRequest(
        Request $request,
        DocumentAccessRequest $accessRequest
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $accessRequest->approve(
            $user->id,
            $request->remarks
        );

        return redirect()
            ->back()
            ->with(
                'success',
                'Access request approved.'
            );
    }

    public function rejectAccessRequest(
        Request $request,
        DocumentAccessRequest $accessRequest
    ) {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $accessRequest->reject(
            $user->id,
            $request->remarks
        );

        return redirect()
            ->back()
            ->with(
                'success',
                'Access request rejected.'
            );
    }

    /*
    |--------------------------------------------------------------------------
    | DOCUMENT PREVIEW
    |--------------------------------------------------------------------------
    */

    public function preview(Document $document)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if (!$document->canBeAccessedBy($user)) {
            abort(
                403,
                'You do not have permission to view this document.'
            );
        }

        if (!$document->fileExists()) {
            abort(404, 'File not found.');
        }

        $mimeType = $document->mime_type;

        if (
            $mimeType &&
            str_starts_with($mimeType, 'image/')
        ) {
            return response()->json([
                'url' => $document->file_url,
                'type' => 'image',
                'mime_type' => $mimeType,
            ]);
        }

        if ($mimeType === 'application/pdf') {
            return response()->json([
                'url' => $document->file_url,
                'type' => 'pdf',
                'mime_type' => $mimeType,
            ]);
        }

        return response()->json([
            'url' => $document->file_url,
            'type' => 'other',
            'mime_type' => $mimeType,
            'download_url' => route(
                'documents.download',
                $document->id
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STATISTICS
    |--------------------------------------------------------------------------
    */

    public function statistics()
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $total = Document::count();
        $clientDocs = Document::clientDocuments()->count();
        $companyDocs = Document::companyDocuments()->count();
        $lockedDocs = Document::locked()->count();
        $activeDocs = Document::active()->count();
        $archivedDocs = Document::archived()->count();
        $expiredDocs = Document::expired()->count();
        $expiringSoonDocs = Document::expiringSoon()->count();

        return response()->json([
            'total' => $total,
            'client_documents' => $clientDocs,
            'company_documents' => $companyDocs,
            'locked_documents' => $lockedDocs,
            'active_documents' => $activeDocs,
            'archived_documents' => $archivedDocs,
            'expired_documents' => $expiredDocs,
            'expiring_soon_documents' => $expiringSoonDocs,
        ]);
    }
}