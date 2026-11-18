<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Document;
use App\Models\DocumentAccessRequest;
use App\Models\DocumentAttachment;
use App\Models\User;
use App\Notifications\DocumentAssignedNotification;
use App\Services\AdminNotifier;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class SuperAdminDocumentController extends Controller
{
    /**
     * Display every document uploaded by admins, staff, and superadmins.
     */
    public function index(): Response
    {
        $documents = Document::query()
            ->with([
                'uploader:id,name,email,role',
                'assignee:id,name,email,role',
                'attachments',
            ])
            ->latest()
            ->get()
            ->map(fn (Document $document) => $this->formatDocument($document))
            ->values();

        $users = User::query()
            ->where('role', 'staff')
            ->whereNull('deleted_at')
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
            ->map(fn (DocumentAccessRequest $request) => [
                'id' => $request->id,
                'document_id' => $request->document_id,
                'document_title' => $request->document?->title,
                'document_file_name' => $request->document?->file_name,
                'document_type' => $request->document?->document_type,
                'staff_id' => $request->staff_id,
                'staff_name' => $request->staff?->name,
                'staff_email' => $request->staff?->email,
                'status' => $request->status,
                'requested_at' => optional($request->requested_at)->format('M d, Y h:i A'),
                'responded_at' => optional($request->responded_at)->format('M d, Y h:i A'),
                'responded_by' => $request->responder?->name,
                'remarks' => $request->remarks,
            ])
            ->values();

        $stats = [
            'total' => $documents->count(),
            'active' => $documents->where('status', 'Active')->count(),
            'expiring' => $documents->where('status', 'Expiring Soon')->count(),
            'expired' => $documents->where('status', 'Expired')->count(),
            'archived' => $documents->where('status', 'Archived')->count(),
            'locked' => $documents->where('is_locked', true)->count(),
            'company' => $documents->where('document_type', 'company')->count(),
            'client' => $documents->where('document_type', 'client')->count(),
            'from_staff' => $documents->where('uploaded_by_role', 'staff')->count(),
            'from_admin' => $documents->where('uploaded_by_role', 'admin')->count(),
            'from_superadmin' => $documents->where('uploaded_by_role', 'superadmin')->count(),
            'access_requests_total' => $accessRequests->count(),
            'access_requests_pending' => $accessRequests->where('status', 'pending')->count(),
        ];

        return Inertia::render('SuperAdmin/DocumentsMonitoring', [
            'documents' => $documents,
            'users' => $users,
            'accessRequests' => $accessRequests,
            'stats' => $stats,
        ]);
    }

    /**
     * Upload one or more document files as a superadmin.
     */
    public function store(Request $request): RedirectResponse
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

                'document_type' => ['required', Rule::in(['client', 'company'])],
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
                'assigned_to.exists' => 'The selected account does not exist.',
            ]
        );

        $assignedUser = null;

        if (!empty($validated['assigned_to'])) {
            $assignedUser = User::query()
                ->select(['id', 'name', 'email', 'role'])
                ->find($validated['assigned_to']);

            if (!$assignedUser) {
                return back()->with('error', 'The selected account could not be found.');
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
        } catch (Throwable $exception) {
            foreach ($storedFiles as $stored) {
                Storage::disk('public')->delete($stored['file_path']);
            }

            Log::error('Superadmin document upload failed: ' . $exception->getMessage());

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
                'compliance_status' => $validated['compliance_status'] ?? 'Compliant',
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
        } catch (Throwable $exception) {
            foreach ($storedFiles as $stored) {
                Storage::disk('public')->delete($stored['file_path']);
            }

            Log::error('Superadmin document record creation failed: ' . $exception->getMessage());

            return back()->with('error', 'The document record could not be created.');
        }

        $this->notifyAboutDocument($document, $assignedUser);

        ActivityLog::log(
            'document_uploaded',
            null,
            "Uploaded document: {$document->title} (" . count($storedFiles) . ' file/s)',
            [
                'document_id' => $document->id,
                'document_type' => $document->document_type,
                'assigned_to' => $document->assigned_to,
                'file_count' => count($storedFiles),
            ]
        );

        $fileText = count($storedFiles) === 1
            ? '1 file'
            : count($storedFiles) . ' files';

        $assignee = $assignedUser
            ? " and assigned to {$assignedUser->name}"
            : '';

        return back()->with(
            'success',
            "Document ({$fileText}) uploaded successfully{$assignee}."
        );
    }

    /**
     * Approve a staff document access request.
     */
    public function approveAccessRequest(DocumentAccessRequest $accessRequest): RedirectResponse
    {
        if (!$accessRequest->isPending()) {
            return back()->with('error', 'This access request has already been processed.');
        }

        try {
            $accessRequest->approve((int) Auth::id());
        } catch (Throwable $exception) {
            Log::error('Superadmin access request approval failed: ' . $exception->getMessage());

            return back()->with('error', 'The access request could not be approved. Please try again.');
        }

        $staff = $accessRequest->staff;
        $documentTitle = $accessRequest->document?->title ?? 'a document';

        AdminNotifier::toUser(
            $staff,
            'Document Access Granted ✅',
            'You now have access to "' . $documentTitle . '".',
            'success',
            '/documents',
            [
                'request_id' => $accessRequest->id,
                'document_id' => $accessRequest->document_id,
            ]
        );

        ActivityLog::log(
            'document_access_approved',
            $staff,
            "Approved document access request for {$documentTitle}",
            [
                'request_id' => $accessRequest->id,
                'document_id' => $accessRequest->document_id,
            ]
        );

        return back()->with('success', 'Access request approved and staff permission granted.');
    }

    /**
     * Reject a staff document access request.
     */
    public function rejectAccessRequest(DocumentAccessRequest $accessRequest): RedirectResponse
    {
        if (!$accessRequest->isPending()) {
            return back()->with('error', 'This access request has already been processed.');
        }

        try {
            $accessRequest->reject((int) Auth::id());
        } catch (Throwable $exception) {
            Log::error('Superadmin access request rejection failed: ' . $exception->getMessage());

            return back()->with('error', 'The access request could not be rejected. Please try again.');
        }

        $staff = $accessRequest->staff;
        $documentTitle = $accessRequest->document?->title ?? 'a document';

        AdminNotifier::toUser(
            $staff,
            'Document Access Request Rejected ❌',
            'Your access request for "' . $documentTitle . '" was rejected.',
            'error',
            '/documents',
            [
                'request_id' => $accessRequest->id,
                'document_id' => $accessRequest->document_id,
            ]
        );

        ActivityLog::log(
            'document_access_rejected',
            $staff,
            "Rejected document access request for {$documentTitle}",
            [
                'request_id' => $accessRequest->id,
                'document_id' => $accessRequest->document_id,
            ]
        );

        return back()->with('success', 'Access request rejected.');
    }

    /**
     * Stream the primary document inline.
     */
    public function view(Document $document)
    {
        $filePath = $document->getResolvedFilePath();

        if (!$filePath) {
            abort(404, 'The requested document file could not be found.');
        }

        return response()->file($filePath, [
            'Content-Type' => $document->mime_type ?: 'application/octet-stream',
        ]);
    }

    /**
     * Download the primary document.
     */
    public function download(Document $document): BinaryFileResponse|RedirectResponse
    {
        $filePath = $document->getResolvedFilePath();

        if (!$filePath) {
            return back()->with('error', 'The requested document file could not be found.');
        }

        return response()->download(
            $filePath,
            $document->file_name ?: basename($filePath)
        );
    }

    /**
     * Stream a specific attachment inline.
     */
    public function viewAttachment(Document $document, DocumentAttachment $attachment)
    {
        if ((int) $attachment->document_id !== (int) $document->id) {
            abort(404);
        }

        $filePath = $attachment->getResolvedFilePath();

        if (!$filePath) {
            abort(404, 'The requested attachment could not be found.');
        }

        return response()->file($filePath, [
            'Content-Type' => $attachment->mime_type ?: 'application/octet-stream',
        ]);
    }

    /**
     * Download a specific attachment.
     */
    public function downloadAttachment(
        Document $document,
        DocumentAttachment $attachment
    ): BinaryFileResponse|RedirectResponse {
        if ((int) $attachment->document_id !== (int) $document->id) {
            abort(404);
        }

        $filePath = $attachment->getResolvedFilePath();

        if (!$filePath) {
            return back()->with('error', 'The requested attachment could not be found.');
        }

        return response()->download(
            $filePath,
            $attachment->file_name ?: basename($filePath)
        );
    }

    /**
     * Convert a document into the shape used by the Super Admin page.
     */
    private function formatDocument(Document $document): array
    {
        $attachments = $document->attachments
            ->map(fn (DocumentAttachment $attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_url' => route('superadmin.documents.attachment.view', [
                    'document' => $document->id,
                    'attachment' => $attachment->id,
                ]),
                'download_url' => route('superadmin.documents.attachment.download', [
                    'document' => $document->id,
                    'attachment' => $attachment->id,
                ]),
                'mime_type' => $attachment->mime_type,
                'formatted_file_size' => $attachment->formatted_file_size,
                'is_primary' => (bool) $attachment->is_primary,
                'file_exists' => $attachment->fileExists(),
            ])
            ->values()
            ->toArray();

        return [
            'id' => $document->id,
            'title' => $document->title,
            'file_name' => $document->file_name,
            'file_url' => $document->file_path
                ? route('superadmin.documents.view', ['document' => $document->id])
                : null,
            'download_url' => $document->file_path
                ? route('superadmin.documents.download', ['document' => $document->id])
                : null,
            'file_exists' => $document->fileExists(),
            'mime_type' => $document->mime_type,
            'formatted_file_size' => $document->formatted_file_size,

            'type' => $document->type,
            'description' => $document->description,
            'document_type' => $document->document_type ?: 'client',
            'is_locked' => (bool) ($document->is_locked ?? false),
            'granted_staff_ids' => $document->getGrantedStaffIds(),

            'reference_number' => $document->reference_number,
            'regulatory_body' => $document->regulatory_body,
            'compliance_status' => $document->compliance_status,
            'retention_period' => $document->retention_period,
            'expiry_date' => optional($document->expiry_date)->format('Y-m-d'),
            'review_date' => optional($document->review_date)->format('Y-m-d'),

            'uploaded_by' => $document->uploaded_by,
            'uploaded_by_name' => $document->uploader?->name,
            'uploaded_by_email' => $document->uploader?->email,
            'uploaded_by_role' => $document->uploader?->role,

            'assigned_to' => $document->assigned_to,
            'assigned_name' => $document->assignee?->name,
            'assigned_email' => $document->assignee?->email,
            'assigned_role' => $document->assignee?->role,

            'status' => $this->resolveStatus($document),
            'raw_status' => $document->status,
            'is_expired' => $document->is_expired,
            'is_expiring_soon' => $document->is_expiring_soon,
            'days_until_expiry' => $document->days_until_expiry,

            'attachments' => $attachments,
            'attachment_count' => count($attachments),

            'created_at' => optional($document->created_at)->format('M d, Y h:i A'),
            'created_at_date' => optional($document->created_at)->format('Y-m-d'),
            'updated_at' => optional($document->updated_at)->format('M d, Y h:i A'),
        ];
    }

    /**
     * Resolve the monitoring status shown to the superadmin.
     */
    private function resolveStatus(Document $document): string
    {
        if ($document->status === 'Archived' || $document->archived_at) {
            return 'Archived';
        }

        if ($document->expiry_date) {
            $today = Carbon::today();
            $expiry = Carbon::parse($document->expiry_date)->startOfDay();

            if ($expiry->lt($today)) {
                return 'Expired';
            }

            if ($expiry->lte($today->copy()->addDays(30))) {
                return 'Expiring Soon';
            }
        }

        return 'Active';
    }

    /**
     * Notify the assigned account, or all staff for company documents.
     */
    private function notifyAboutDocument(Document $document, ?User $assignedUser): void
    {
        try {
            if ($assignedUser) {
                $assignedUser->notify(new DocumentAssignedNotification($document));

                return;
            }

            if ($document->document_type === 'company') {
                User::query()
                    ->where('role', 'staff')
                    ->whereNull('deleted_at')
                    ->get()
                    ->each(fn (User $staff) => $staff->notify(
                        new DocumentAssignedNotification($document)
                    ));
            }
        } catch (Throwable $exception) {
            Log::error('Superadmin document notification failed: ' . $exception->getMessage());
        }
    }
}
