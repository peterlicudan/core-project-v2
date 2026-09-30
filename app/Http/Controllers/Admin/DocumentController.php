<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentAccessRequest;
use App\Models\DocumentAttachment;
use App\Models\User;
use App\Notifications\DocumentAccessRequested;
use App\Notifications\DocumentAssignedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use ZipArchive;

class DocumentController extends Controller
{
    /**
     * ============================================================
     * ADMIN DOCUMENT MANAGEMENT
     * ============================================================
     */
    public function index()
    {
        $documents = Document::query()
            ->with([
                'assignee:id,name,email,role',
                'uploader:id,name,email,role',
                'attachments',
            ])
            ->latest()
            ->get()
            ->map(function (Document $document) {
                return $this->formatDocument($document);
            })
            ->values();

        /* DELETED DOCUMENTS (soft-deleted) */
        $deletedDocuments = Document::onlyTrashed()
            ->with([
                'assignee:id,name,email,role',
                'uploader:id,name,email,role',
                'attachments',
            ])
            ->latest('deleted_at')
            ->get()
            ->map(function (Document $document) {
                return $this->formatDocument($document, true);
            })
            ->values();

        $staff = User::query()
            ->where('role', 'staff')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ])
            ->values();

        $accessRequests = DocumentAccessRequest::query()
            ->with([
                'document:id,title,file_name,document_type,is_locked',
                'staff:id,name,email,role',
                'responder:id,name,email,role',
            ])
            ->latest('requested_at')
            ->get()
            ->map(fn (DocumentAccessRequest $r) => [
                'id' => $r->id,
                'document_id' => $r->document_id,
                'document_title' => $r->document?->title,
                'document_file_name' => $r->document?->file_name,
                'staff_id' => $r->staff_id,
                'staff_name' => $r->staff?->name,
                'staff_email' => $r->staff?->email,
                'status' => $r->status,
                'requested_at' => optional($r->requested_at)->format('M d, Y h:i A'),
                'responded_at' => optional($r->responded_at)->format('M d, Y h:i A'),
                'responded_by' => $r->responder?->name,
            ])
            ->values();

        return Inertia::render('Admin/DocumentsCompliance', [
            'documents' => $documents,
            'deletedDocuments' => $deletedDocuments,
            'staff' => $staff,
            'accessRequests' => $accessRequests,
        ]);
    }

    /**
     * ============================================================
     * HELPER — Format Document for Frontend
     * ============================================================
     */
    private function formatDocument(Document $document, bool $isDeleted = false): array
    {
        $fileUrl = null;
        if (!empty($document->file_path)) {
            $fileUrl = asset('storage/' . ltrim($document->file_path, '/'));
        }

        $downloadUrl = route('admin.documents.download', [
            'document' => $document->id,
        ]);

        $attachments = $document->attachments
            ->map(function (DocumentAttachment $att) {
                return [
                    'id' => $att->id,
                    'file_name' => $att->file_name,
                    'file_path' => $att->file_path,
                    'file_url' => asset('storage/' . ltrim($att->file_path, '/')),
                    'download_url' => route('admin.documents.download-attachment', [
                        'document' => $att->document_id,
                        'attachment' => $att->id,
                    ]),
                    'mime_type' => $att->mime_type,
                    'file_size' => $att->file_size,
                    'formatted_file_size' => $att->formatted_file_size,
                    'is_primary' => (bool) $att->is_primary,
                ];
            })
            ->values()
            ->toArray();

        return [
            'id' => $document->id,
            'title' => $document->title,
            'file_name' => $document->file_name,
            'file_path' => $document->file_path,
            'file_url' => $fileUrl,
            'download_url' => $downloadUrl,
            'assigned_to' => $document->assigned_to,
            'assigned_name' => $document->assignee?->name,
            'assigned_email' => $document->assignee?->email,
            'assigned_role' => $document->assignee?->role,
            'uploaded_by' => $document->uploaded_by,
            'uploaded_by_name' => $document->uploader?->name,
            'uploaded_by_email' => $document->uploader?->email,
            'type' => $document->type,
            'description' => $document->description,
            'status' => $document->status,
            'file_size' => $document->file_size,
            'formatted_file_size' => $document->formatted_file_size,
            'mime_type' => $document->mime_type,

            /* DOCUMENT ACCESS CONTROL */
            'document_type' => $document->document_type,
            'is_locked' => (bool) ($document->is_locked ?? false),
            'granted_staff_ids' => $document->granted_staff_ids ?? [],

            /* REGULATORY / RETENTION FIELDS */
            'expiry_date' => $document->expiry_date,
            'retention_period' => $document->retention_period,
            'retention_start_date' => $document->retention_start_date,
            'archived_at' => $document->archived_at,
            'archived_by' => $document->archived_by,
            'regulatory_body' => $document->regulatory_body,
            'reference_number' => $document->reference_number,
            'review_date' => $document->review_date,
            'compliance_status' => $document->compliance_status,
            'is_expired' => $document->is_expired,
            'is_expiring_soon' => $document->is_expiring_soon,
            'days_until_expiry' => $document->days_until_expiry,
            'retention_date' => $document->retention_date,
            'is_retention_due' => $document->is_retention_due,
            'can_be_archived' => $document->can_be_archived,

            /* MULTI-FILE ATTACHMENTS */
            'attachments' => $attachments,
            'attachment_count' => count($attachments),

            /* DELETED INFO */
            'is_deleted' => $isDeleted,
            'deleted_at' => optional($document->deleted_at)->format('M d, Y h:i A'),

            'created_at' => optional($document->created_at)->format('M d, Y h:i A'),
            'updated_at' => optional($document->updated_at)->format('M d, Y h:i A'),
        ];
    }

    /**
     * ============================================================
     * UPLOAD DOCUMENT — UNLIMITED MULTIPLE FILES
     * ============================================================
     */
    public function store(Request $request)
    {
        $validated = $request->validate(
            [
                'title' => ['required', 'string', 'max:255'],

                'type' => [
                    'required',
                    Rule::in([
                        'Permit',
                        'Contract',
                        'Certificate',
                        'Invoice',
                        'Compliance',
                        'Safety',
                        'Company',
                        'Other',
                    ]),
                ],

                'document_type' => [
                    'required',
                    Rule::in(['client', 'company']),
                ],

                'is_locked' => ['nullable', 'boolean'],

                'granted_staff_ids' => ['nullable', 'array'],
                'granted_staff_ids.*' => ['integer', 'exists:users,id'],

                'description' => ['nullable', 'string', 'max:5000'],

                'assigned_to' => ['nullable', 'integer', 'exists:users,id'],

                'files' => ['required', 'array', 'min:1'],
                'files.*' => [
                    'file',
                    'max:51200',
                    'mimes:pdf,doc,docx,xls,xlsx,csv,png,jpg,jpeg,webp,zip,rar,7z,txt',
                ],

                'expiry_date' => ['nullable', 'date'],
                'retention_period' => [
                    'nullable',
                    'string',
                    Rule::in(['1 year', '3 years', '5 years', '10 years', 'Permanent']),
                ],
                'retention_start_date' => ['nullable', 'date'],
                'regulatory_body' => ['nullable', 'string', 'max:255'],
                'reference_number' => ['nullable', 'string', 'max:255'],
                'review_date' => ['nullable', 'date'],
                'compliance_status' => [
                    'nullable',
                    'string',
                    Rule::in(['Compliant', 'Non-Compliant', 'Under Review', 'Pending']),
                ],
            ],
            [
                'title.required' => 'Please enter a document title.',
                'type.required' => 'Please select a document type.',
                'document_type.required' => 'Please select a document category.',
                'files.required' => 'Please attach at least one document.',
                'files.min' => 'Please attach at least one document.',
                'files.*.max' => 'Each file must not be larger than 50 MB.',
                'files.*.mimes' => 'Allowed files: PDF, DOC, DOCX, XLS, XLSX, CSV, PNG, JPG, JPEG, WEBP, ZIP, RAR, 7Z, TXT.',
                'assigned_to.exists' => 'The selected staff account does not exist.',
            ]
        );

        $assignedUser = null;
        if (!empty($validated['assigned_to'])) {
            $assignedUser = User::select(['id', 'name', 'email', 'role'])
                ->find($validated['assigned_to']);

            if (!$assignedUser) {
                return back()->with('error', 'Staff account not found.');
            }
            if ($assignedUser->role !== 'staff') {
                return back()->with('error', 'Documents can only be assigned to staff accounts.');
            }
        }

        $files = $request->file('files');

        if (!$files || !is_array($files) || count($files) === 0) {
            return back()->with('error', 'Please attach at least one document file.');
        }

        $storedFiles = [];
        try {
            foreach ($files as $index => $file) {
                if (!$file || !$file->isValid()) {
                    foreach ($storedFiles as $stored) {
                        Storage::disk('public')->delete($stored['file_path']);
                    }
                    return back()->with('error', 'One of the uploaded files is invalid.');
                }

                $path = $file->store('documents', 'public');

                $storedFiles[] = [
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'is_primary' => $index === 0,
                ];
            }
        } catch (\Throwable $e) {
            foreach ($storedFiles as $stored) {
                Storage::disk('public')->delete($stored['file_path']);
            }
            return back()->with('error', 'The documents could not be uploaded. Please try again.');
        }

        $primary = $storedFiles[0];

        try {
            $document = Document::create([
                'title' => trim($validated['title']),
                'file_name' => $primary['file_name'],
                'file_path' => $primary['file_path'],
                'mime_type' => $primary['mime_type'],
                'file_size' => $primary['file_size'],
                'type' => $validated['type'],
                'description' => !empty($validated['description'])
                    ? trim($validated['description'])
                    : null,
                'status' => 'Active',
                'uploaded_by' => Auth::id(),
                'assigned_to' => $validated['assigned_to'] ?? null,
                'document_type' => $validated['document_type'],
                'is_locked' => $validated['is_locked'] ?? ($validated['document_type'] === 'company'),
                'granted_staff_ids' => $validated['granted_staff_ids'] ?? [],
                'expiry_date' => $validated['expiry_date'] ?? null,
                'retention_period' => $validated['retention_period'] ?? null,
                'retention_start_date' => !empty($validated['retention_period'])
                    ? now()->toDateString()
                    : null,
                'regulatory_body' => $validated['regulatory_body'] ?? null,
                'reference_number' => $validated['reference_number'] ?? null,
                'review_date' => $validated['review_date'] ?? null,
                'compliance_status' => $validated['compliance_status'] ?? 'Pending',
            ]);

            foreach ($storedFiles as $stored) {
                $document->attachments()->create([
                    'file_name' => $stored['file_name'],
                    'file_path' => $stored['file_path'],
                    'mime_type' => $stored['mime_type'],
                    'file_size' => $stored['file_size'],
                    'is_primary' => $stored['is_primary'],
                ]);
            }
        } catch (\Throwable $e) {
            foreach ($storedFiles as $stored) {
                Storage::disk('public')->delete($stored['file_path']);
            }
            return back()->with('error', 'The document record could not be created.');
        }

        // ✅ NOTIFY: Send notification sa assigned staff / all staff
        $this->notifyStaffAboutDocument($document);

        $category = $validated['document_type'] === 'company' ? 'Company' : 'Client';
        $locked = ($validated['is_locked'] ?? false) ? ' (Locked)' : '';
        $count = count($storedFiles);
        $fileText = $count === 1 ? '1 file' : "{$count} files";

        if ($assignedUser) {
            return back()->with(
                'success',
                "{$category} document ({$fileText}) uploaded and assigned to {$assignedUser->name} successfully.{$locked}"
            );
        }

        return back()->with(
            'success',
            "{$category} document ({$fileText}) uploaded successfully and is available to all staff.{$locked}"
        );
    }

    /**
     * ============================================================
     * HELPER — Notify staff about newly uploaded document
     * ============================================================
     */
    private function notifyStaffAboutDocument(Document $document): void
    {
        try {
            // 1️⃣ Kung may specific assignee → notify lang yung staff
            if ($document->assigned_to) {
                $staff = User::find($document->assigned_to);

                if ($staff && $staff->role === 'staff') {
                    $staff->notify(
                        new DocumentAssignedNotification($document)
                    );
                }

                return;
            }

            // 2️⃣ Kung company document at walang assignee → notify lahat ng staff
            if ($document->document_type === 'company') {
                $allStaff = User::query()
                    ->where('role', 'staff')
                    ->get();

                foreach ($allStaff as $staff) {
                    $staff->notify(
                        new DocumentAssignedNotification($document)
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::error('Document notification failed: ' . $e->getMessage());
        }
    }

    /**
     * ============================================================
     * UPDATE DOCUMENT — metadata only
     * ============================================================
     */
    public function update(Request $request, Document $document)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $validated = $request->validate(
            [
                'title' => ['required', 'string', 'max:255'],
                'type' => [
                    'required',
                    Rule::in([
                        'Permit',
                        'Contract',
                        'Certificate',
                        'Invoice',
                        'Compliance',
                        'Safety',
                        'Company',
                        'Other',
                    ]),
                ],
                'description' => ['nullable', 'string', 'max:5000'],
                'status' => ['required', Rule::in(['Active', 'Archived'])],
                'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
                'expiry_date' => ['nullable', 'date'],
                'retention_period' => [
                    'nullable',
                    'string',
                    Rule::in(['1 year', '3 years', '5 years', '10 years', 'Permanent', '']),
                ],
                'is_locked' => ['nullable', 'boolean'],
            ],
            [
                'title.required' => 'Please enter a document title.',
                'type.required' => 'Please select a document type.',
                'status.required' => 'Please select a document status.',
                'assigned_to.exists' => 'The selected staff account does not exist.',
            ]
        );

        $assignedUser = null;
        if (!empty($validated['assigned_to'])) {
            $assignedUser = User::select(['id', 'name', 'email', 'role'])
                ->find($validated['assigned_to']);

            if (!$assignedUser) {
                return back()->with('error', 'Staff account not found.');
            }
            if ($assignedUser->role !== 'staff') {
                return back()->with('error', 'Documents can only be assigned to staff accounts.');
            }
        }

        try {
            $document->update([
                'title' => trim($validated['title']),
                'type' => $validated['type'],
                'description' => !empty($validated['description'])
                    ? trim($validated['description'])
                    : null,
                'status' => $validated['status'],
                'assigned_to' => $validated['assigned_to'] ?? null,
                'expiry_date' => !empty($validated['expiry_date'])
                    ? $validated['expiry_date']
                    : null,
                'retention_period' => !empty($validated['retention_period'])
                    ? $validated['retention_period']
                    : null,
                'retention_start_date' => !empty($validated['retention_period'])
                    ? ($document->retention_start_date ?? now()->toDateString())
                    : null,
            ]);

            if ($document->document_type === 'company' && isset($validated['is_locked'])) {
                $document->update([
                    'is_locked' => (bool) $validated['is_locked'],
                ]);
            }
        } catch (\Throwable $e) {
            return back()->with('error', 'Failed to update document. Please try again.');
        }

        return back()->with('success', 'Document updated successfully.');
    }

    /**
     * ============================================================
     * DOWNLOAD PRIMARY DOCUMENT
     * ============================================================
     */
    public function download(Document $document)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            if (!$document->canBeAccessedBy($user)) {
                abort(403, 'You are not authorized to download this document.');
            }
        }

        if (!$document->file_path) {
            return back()->with('error', 'This document does not have a file attached.');
        }

        if (!Storage::disk('public')->exists($document->file_path)) {
            return back()->with('error', 'The requested document file could not be found.');
        }

        return response()->download(
            Storage::disk('public')->path($document->file_path),
            $document->file_name
        );
    }

    /**
     * ============================================================
     * DOWNLOAD A SPECIFIC ATTACHMENT
     * ============================================================
     */
    public function downloadAttachment(Document $document, DocumentAttachment $attachment)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        if ($attachment->document_id !== $document->id) {
            abort(404);
        }

        if ($user->role !== 'admin') {
            if (!$document->canBeAccessedBy($user)) {
                abort(403, 'You are not authorized to download this file.');
            }
        }

        if (!Storage::disk('public')->exists($attachment->file_path)) {
            return back()->with('error', 'The requested file could not be found.');
        }

        return response()->download(
            Storage::disk('public')->path($attachment->file_path),
            $attachment->file_name
        );
    }

    /**
     * ============================================================
     * DOWNLOAD ALL ATTACHMENTS AS ZIP
     * ============================================================
     */
    public function downloadAll(Document $document)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'admin') {
            if (!$document->canBeAccessedBy($user)) {
                abort(403, 'You are not authorized to download this document.');
            }
        }

        $attachments = $document->attachments;

        if ($attachments->isEmpty()) {
            return back()->with('error', 'This document has no attachments.');
        }

        $zipName = 'document-' . $document->id . '-' . time() . '.zip';
        $zipPath = storage_path('app/temp/' . $zipName);

        if (!is_dir(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return back()->with('error', 'Could not create ZIP archive.');
        }

        foreach ($attachments as $att) {
            $fullPath = Storage::disk('public')->path($att->file_path);
            if (file_exists($fullPath)) {
                $zip->addFile($fullPath, $att->file_name);
            }
        }
        $zip->close();

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    /**
     * ============================================================
     * DELETE DOCUMENT — SOFT DELETE (moved to Retrieve tab)
     * ============================================================
     */
    public function destroy(Document $document)
    {
        try {
            $document->delete(); // Soft delete — deleted_at = now()
        } catch (\Throwable $e) {
            return back()->with('error', 'Failed to delete document. Please try again.');
        }

        return back()->with('success', 'Document moved to Deleted. Pwede pa itong i-restore.');
    }

    /**
     * ============================================================
     * RESTORE DELETED DOCUMENT
     * ============================================================
     */
    public function restoreDeleted($id)
    {
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $document = Document::onlyTrashed()->find($id);

        if (!$document) {
            return back()->with('error', 'Deleted document not found.');
        }

        try {
            $document->restore();
        } catch (\Throwable $e) {
            return back()->with('error', 'Failed to restore document. Please try again.');
        }

        return back()->with('success', 'Document restored successfully.');
    }

    /**
     * ============================================================
     * FORCE DELETE — Permanent (files deleted)
     * ============================================================
     */
    public function forceDelete($id)
    {
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            return back()->with('error', 'Unauthorized.');
        }

        $document = Document::onlyTrashed()->find($id);

        if (!$document) {
            return back()->with('error', 'Deleted document not found.');
        }

        try {
            // Delete files
            foreach ($document->attachments as $attachment) {
                if (
                    $attachment->file_path &&
                    Storage::disk('public')->exists($attachment->file_path)
                ) {
                    Storage::disk('public')->delete($attachment->file_path);
                }
            }

            if (
                $document->file_path &&
                Storage::disk('public')->exists($document->file_path)
            ) {
                Storage::disk('public')->delete($document->file_path);
            }

            // Delete related records
            $document->attachments()->delete();
            DocumentAccessRequest::where('document_id', $document->id)->delete();

            // Force delete document
            $document->forceDelete();
        } catch (\Throwable $e) {
            return back()->with('error', 'Failed to permanently delete document. Please try again.');
        }

        return back()->with('success', 'Document permanently deleted.');
    }

    /**
     * ============================================================
     * ARCHIVE / RESTORE (Archive status — hindi delete)
     * ============================================================
     */
    public function archive(Document $document)
    {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        if ($document->isArchived()) {
            return back()->with('error', 'Document is already archived.');
        }
        $document->archive($user->id);
        return back()->with('success', 'Document archived successfully.');
    }

    public function restore(Document $document)
    {
        $user = Auth::user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        if (!$document->isArchived()) {
            return back()->with('error', 'Document is not archived.');
        }
        $document->restoreFromArchive();
        return back()->with('success', 'Document restored successfully.');
    }

    /**
     * ============================================================
     * STAFF — REQUEST ACCESS
     * ============================================================
     */
    public function requestAccess(Document $document)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        if ($user->role !== 'staff') {
            abort(403, 'Only staff members can request document access.');
        }

        if ($document->document_type !== 'company') {
            return back()->with('error', 'Access requests are only available for company documents.');
        }

        if (!$document->is_locked) {
            return back()->with('success', 'This company document is already available to staff.');
        }

        if ($document->canBeAccessedBy($user)) {
            return back()->with('success', 'You already have access to this document.');
        }

        $existingRequest = DocumentAccessRequest::where('document_id', $document->id)
            ->where('staff_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existingRequest) {
            return back()->with('success', 'Your access request is already pending.');
        }

        $accessRequest = DocumentAccessRequest::create([
            'document_id' => $document->id,
            'staff_id' => $user->id,
            'status' => 'pending',
            'requested_at' => now(),
        ]);

        foreach (User::where('role', 'admin')->get() as $admin) {
            $admin->notify(new DocumentAccessRequested($document, $user, $accessRequest->id));
        }

        return back()->with('success', 'Access request sent to the administrator.');
    }

    /**
     * ============================================================
     * GRANT PERMISSION
     * ============================================================
     */
    public function grantPermission(Request $request, Document $document)
    {
        $validated = $request->validate([
            'staff_id' => ['required', 'integer', 'exists:users,id'],
            'request_id' => ['nullable', 'integer', 'exists:document_access_requests,id'],
        ]);

        $staff = User::find($validated['staff_id']);
        if (!$staff) {
            return back()->with('error', 'Staff member not found.');
        }
        if ($staff->role !== 'staff') {
            return back()->with('error', 'Only staff members can be granted permission.');
        }
        if ($document->document_type !== 'company') {
            return back()->with('error', 'Only company documents can use staff access permissions.');
        }

        $document->grantPermission($staff->id);

        if (!empty($validated['request_id'])) {
            DocumentAccessRequest::where('id', $validated['request_id'])
                ->where('document_id', $document->id)
                ->where('staff_id', $staff->id)
                ->update([
                    'status' => 'approved',
                    'responded_at' => now(),
                    'responded_by' => Auth::id(),
                ]);
        } else {
            DocumentAccessRequest::where('document_id', $document->id)
                ->where('staff_id', $staff->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'approved',
                    'responded_at' => now(),
                    'responded_by' => Auth::id(),
                ]);
        }

        return back()->with('success', 'Permission granted to ' . $staff->name . '.');
    }

    /**
     * ============================================================
     * REJECT ACCESS REQUEST
     * ============================================================
     */
    public function rejectAccessRequest(Request $request, DocumentAccessRequest $accessRequest)
    {
        if ($accessRequest->status !== 'pending') {
            return back()->with('error', 'This access request has already been processed.');
        }

        $accessRequest->update([
            'status' => 'rejected',
            'responded_at' => now(),
            'responded_by' => Auth::id(),
        ]);

        return back()->with('success', 'Access request rejected.');
    }

    /**
     * ============================================================
     * REVOKE PERMISSION
     * ============================================================
     */
    public function revokePermission(Document $document, $staffId)
    {
        $staff = User::find($staffId);
        if (!$staff) {
            return back()->with('error', 'Staff member not found.');
        }

        $document->revokePermission($staffId);

        DocumentAccessRequest::where('document_id', $document->id)
            ->where('staff_id', $staffId)
            ->where('status', 'approved')
            ->update([
                'status' => 'revoked',
                'responded_at' => now(),
                'responded_by' => Auth::id(),
            ]);

        return back()->with('success', 'Permission revoked for ' . $staff->name . '.');
    }
}
