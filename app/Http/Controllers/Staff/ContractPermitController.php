<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\ContractFile;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContractPermitController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | STAFF CONTRACT & PERMIT LIST
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        $user = Auth::user();

        $contracts = Contract::query()
            ->with([
                'assignedStaff:id,name,email',
                'creator:id,name,email',
                'submittedBy:id,name,email',
                'reviewedBy:id,name,email',
                'invoice',
                'invoiceApprovedBy:id,name,email',
                'files:id,contract_id,type,file_path,file_name,file_size,mime_type,uploaded_by,created_at',
            ])
            ->where(function ($query) use ($user) {
                $query
                    ->whereNull('assigned_to')
                    ->orWhere('assigned_to', $user->id);
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Contract $contract) {

                $invoiceApproved =
                    $this->invoiceIsApproved($contract);

                if (
                    (bool) $contract->is_invoice_approved !==
                    $invoiceApproved
                ) {
                    $contract->is_invoice_approved =
                        $invoiceApproved;

                    if ($invoiceApproved) {
                        if (!$contract->invoice_approved_at) {
                            $contract->invoice_approved_at = now();
                        }
                    } else {
                        $contract->invoice_approved_at = null;
                        $contract->invoice_approved_by = null;
                    }

                    $contract->save();
                }

                $assignedStaff = $contract->assignedStaff;
                $creator = $contract->creator;

                $startDate = $contract->start_date
                    ? $contract->start_date->format('Y-m-d')
                    : null;

                $endDate = $contract->end_date
                    ? $contract->end_date->format('Y-m-d')
                    : null;

                $daysUntilExpiry = null;

                if ($contract->approved_at && $contract->end_date) {
                    $today = now()->startOfDay();
                    $expiry = $contract->end_date->copy()->startOfDay();
                    $daysUntilExpiry = $today->diffInDays($expiry, false);
                }

                $workflowStatus = $contract->workflow_status ?: 'Pending';
                $status = $this->calculateStatus($contract);
                $correctionReason = $contract->rejection_reason;

                // ✅ Multi-file arrays
                $allFiles = ($contract->files ?? collect())
                    ->map(function (ContractFile $file) {
                        return [
                            'id' => $file->id,
                            'type' => $file->type,
                            'file_path' => $file->file_path,
                            'file_name' => $file->file_name,
                            'file_size' => (int) $file->file_size,
                            'mime_type' => $file->mime_type,
                            'uploaded_by' => $file->uploaded_by,
                            'created_at' => $file->created_at
                                ? $file->created_at->format('Y-m-d H:i:s')
                                : null,
                        ];
                    })
                    ->values();

                $contractFiles = $allFiles
                    ->where('type', 'contract')
                    ->values();

                $signedFiles = $allFiles
                    ->where('type', 'signed')
                    ->values();

                return [
                    'id' => $contract->id,

                    'title' =>
                    $contract->contract_no
                        ?: 'Contract / Permit #' . $contract->id,

                    'name' =>
                    $contract->contract_no
                        ?: 'Contract / Permit #' . $contract->id,

                    'type' =>
                    $contract->type ?: 'Contract',

                    'contract_type' =>
                    $contract->contract_type,

                    'description' =>
                    $contract->description,

                    'notes' =>
                    $contract->description,

                    'client' =>
                    $contract->client,

                    'client_name' =>
                    $contract->client,

                    'client_email' =>
                    $contract->email,

                    'email' =>
                    $contract->email,

                    'project' =>
                    $contract->project,

                    'project_name' =>
                    $contract->project,

                    'contract_no' =>
                    $contract->contract_no,

                    'contract_number' =>
                    $contract->contract_no,

                    'reference_number' =>
                    $contract->contract_no,

                    'permit_number' =>
                    $contract->contract_no,

                    'start_date' => $startDate,
                    'issue_date' => $startDate,
                    'end_date' => $endDate,
                    'expiry_date' => $endDate,

                    'approved_at' =>
                    $contract->approved_at
                        ? $contract->approved_at->format('Y-m-d H:i:s')
                        : null,

                    'status' => $status,

                    'invoice_id' =>
                    $contract->invoice_id,

                    'is_invoice_approved' =>
                    $invoiceApproved,

                    'invoice_approved_at' =>
                    $contract->invoice_approved_at,

                    'invoice_approved_by' =>
                    $contract->invoice_approved_by,

                    'assigned_to' =>
                    $contract->assigned_to,

                    'assigned_staff' =>
                    $assignedStaff
                        ? [
                            'id' => $assignedStaff->id,
                            'name' => $assignedStaff->name,
                            'email' => $assignedStaff->email,
                        ]
                        : null,

                    'staff' =>
                    $assignedStaff
                        ? [
                            'id' => $assignedStaff->id,
                            'name' => $assignedStaff->name,
                            'email' => $assignedStaff->email,
                        ]
                        : null,

                    'created_by' =>
                    $contract->created_by,

                    'creator' =>
                    $creator
                        ? [
                            'id' => $creator->id,
                            'name' => $creator->name,
                            'email' => $creator->email,
                        ]
                        : null,

                    'workflow_status' =>
                    $workflowStatus,

                    'workflowStatus' =>
                    $workflowStatus,

                    'submitted_at' =>
                    $contract->submitted_at
                        ? $contract->submitted_at->format('Y-m-d H:i:s')
                        : null,

                    'submitted_by' =>
                    $contract->submitted_by,

                    'reviewed_at' =>
                    $contract->reviewed_at
                        ? $contract->reviewed_at->format('Y-m-d H:i:s')
                        : null,

                    'reviewed_by' =>
                    $contract->reviewed_by,

                    'rejection_reason' =>
                    $contract->rejection_reason,

                    'correction_reason' =>
                    $correctionReason,

                    'correctionReason' =>
                    $correctionReason,

                    'contract_file_path' =>
                    $contract->contract_file_path,

                    'contract_file_name' =>
                    $contract->contract_file_name,

                    'signed_contract_path' =>
                    $contract->signed_contract_path,

                    'signed_contract_file_name' =>
                    $contract->signed_contract_file_name,

                    'sent_at' =>
                    $contract->sent_at
                        ? $contract->sent_at->format('Y-m-d H:i:s')
                        : null,

                    'location' =>
                    $contract->location,

                    'equipment' =>
                    $contract->equipment,

                    'documents' =>
                    (int) ($contract->documents ?? 0),

                    // ✅ Multi-file arrays
                    'files' => $allFiles,
                    'contract_files' => $contractFiles,
                    'signed_files' => $signedFiles,

                    'archived' =>
                    (bool) $contract->archived,

                    'is_archived' =>
                    (bool) $contract->archived,

                    'isArchived' =>
                    (bool) $contract->archived,

                    'archive_expires_at' =>
                    $contract->archive_expires_at,

                    'retention_delete_at' =>
                    $contract->retention_delete_at,

                    'days_until_expiry' =>
                    $daysUntilExpiry,

                    'daysUntilExpiry' =>
                    $daysUntilExpiry,

                    'created_at' =>
                    $contract->created_at
                        ? $contract->created_at->format('Y-m-d H:i:s')
                        : null,

                    'updated_at' =>
                    $contract->updated_at
                        ? $contract->updated_at->format('Y-m-d H:i:s')
                        : null,
                ];
            })
            ->values();

        $staff = User::query()
            ->where('role', 'staff')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        /* APPROVED INVOICES NA WALANG CONTRACT PA */
        $approvedInvoices = Invoice::query()
            ->whereIn('status', ['Approved', 'Paid', 'Partial'])
            ->whereDoesntHave('contractPermits')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Invoice $invoice) {
                return [
                    'id' => $invoice->id,
                    'number' => $invoice->number,
                    'client' => $invoice->client,
                    'client_email' => $invoice->client_email,
                    'project' => $invoice->project,
                    'amount' => (float) $invoice->amount,
                    'status' => $invoice->status,
                    'due_date' => $invoice->due_date
                        ? $invoice->due_date->format('Y-m-d')
                        : null,
                    'has_contract' => false,
                ];
            })
            ->values();

        return Inertia::render(
            'User/ContractPermit',
            [
                'contracts' => $contracts,
                'staff' => $staff,
                'approvedInvoices' => $approvedInvoices,
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STORE — Create Contract from Invoice (with multi-file)
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'invoice_id' => ['required', 'exists:invoices,id'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:100'],
            'project' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'contract_files' => ['required', 'array', 'min:1'],
            'contract_files.*' => ['required', 'file'],
        ]);

        $invoice = Invoice::findOrFail($validated['invoice_id']);

        if (
            !in_array(
                $invoice->status,
                ['Approved', 'Paid', 'Partial'],
                true
            )
        ) {
            return back()->with(
                'error',
                'Cannot create contract. The invoice must be approved first.'
            );
        }

        if ($invoice->contractPermits()->exists()) {
            return back()->with(
                'error',
                'This invoice already has a Contract / Permit record.'
            );
        }

        $contractNumber = $this->generateUniqueContractNumber();

        $isApproved = in_array(
            $invoice->status,
            ['Approved', 'Paid', 'Partial'],
            true
        );

        $contract = Contract::create([
            'contract_no' => $contractNumber,
            'client' => $invoice->client,
            'email' => $invoice->client_email,
            'project' => $validated['project'] ?? $invoice->project,
            'location' => $validated['location'] ?? null,
            'type' => $validated['type'],
            'contract_type' => $validated['type'],
            'start_date' => null,
            'end_date' => null,
            'approved_at' => null,
            'status' => 'Pending',
            'workflow_status' => 'Pending',
            'description' => $validated['description'] ?? null,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'archived' => false,
            'invoice_id' => $invoice->id,
            'is_invoice_approved' => $isApproved,
            'invoice_approved_at' => $isApproved ? now() : null,
            'invoice_approved_by' => $isApproved ? $user->id : null,
            'contract_file_path' => null,
            'contract_file_name' => null,
            'signed_contract_path' => null,
            'signed_contract_file_name' => null,
            'submitted_at' => null,
            'submitted_by' => null,
            'reviewed_at' => null,
            'reviewed_by' => null,
            'rejection_reason' => null,
        ]);

        // ✅ Save files to contract_files table
        $this->saveContractFiles(
            $contract,
            $validated['contract_files'],
            'contract',
            $user->id
        );

        return back()->with(
            'success',
            'Contract created successfully with ' .
                count($validated['contract_files']) .
                ' document(s). Contract No: ' .
                $contract->contract_no
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STORE PERMIT — Create Permit directly (with multi-file)
    |--------------------------------------------------------------------------
    */

    public function storePermit(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:100'],
            'client' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'project' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'permit_number' => ['nullable', 'string', 'max:255'],
            'contract_files' => ['required', 'array', 'min:1'],
            'contract_files.*' => ['required', 'file'],
        ]);

        $contractNumber = $this->generateUniqueContractNumber();

        $contract = Contract::create([
            'contract_no' => $validated['permit_number'] ?? $contractNumber,
            'client' => $validated['client'],
            'email' => $validated['email'] ?? null,
            'project' => $validated['project'] ?? null,
            'location' => $validated['location'] ?? null,
            'type' => $validated['type'] ?? 'Permit',
            'contract_type' => $validated['type'] ?? 'Permit',
            'start_date' => null,
            'end_date' => null,
            'approved_at' => null,
            'status' => 'Pending',
            'workflow_status' => 'Pending',
            'description' => $validated['description'] ?? null,
            'created_by' => $user->id,
            'assigned_to' => $user->id,
            'archived' => false,
            'invoice_id' => null,
            'is_invoice_approved' => true,
            'invoice_approved_at' => now(),
            'invoice_approved_by' => $user->id,
            'contract_file_path' => null,
            'contract_file_name' => null,
            'signed_contract_path' => null,
            'signed_contract_file_name' => null,
            'submitted_at' => null,
            'submitted_by' => null,
            'reviewed_at' => null,
            'reviewed_by' => null,
            'rejection_reason' => null,
        ]);

        // ✅ Save files to contract_files table
        $this->saveContractFiles(
            $contract,
            $validated['contract_files'],
            'contract',
            $user->id
        );

        return back()->with(
            'success',
            'Permit created successfully with ' .
                count($validated['contract_files']) .
                ' document(s). Permit No: ' .
                $contract->contract_no
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE CONTRACT FILES (helper)
    |--------------------------------------------------------------------------
    */

    private function saveContractFiles(
        Contract $contract,
        array $files,
        string $type,
        ?int $uploadedBy = null
    ): void {
        $folder = $type === 'signed' ? 'signed' : 'documents';

        $lastFile = null;

        foreach ($files as $file) {
            $path = $file->store(
                'contracts/' . $contract->id . '/' . $folder,
                'public'
            );

            $lastFile = ContractFile::create([
                'contract_id' => $contract->id,
                'type' => $type,
                'file_path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize() ?? 0,
                'mime_type' => $file->getMimeType(),
                'uploaded_by' => $uploadedBy,
            ]);
        }

        // ✅ Update legacy columns for backward compatibility
        if ($lastFile) {
            if ($type === 'contract') {
                $contract->contract_file_path = $lastFile->file_path;
                $contract->contract_file_name = $lastFile->file_name;
            } else {
                $contract->signed_contract_path = $lastFile->file_path;
                $contract->signed_contract_file_name = $lastFile->file_name;
            }

            $contract->save();
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UNIQUE CONTRACT NUMBER GENERATOR
    |--------------------------------------------------------------------------
    */

    private function generateUniqueContractNumber(): string
    {
        $year = now()->year;

        $lastContract = Contract::withTrashed()
            ->where('contract_no', 'like', "CTR-{$year}-%")
            ->orderByDesc('id')
            ->first();

        $nextNumber = 1;

        if (
            $lastContract &&
            preg_match(
                '/^CTR-' . $year . '-(\d+)$/',
                (string) $lastContract->contract_no,
                $matches
            )
        ) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        do {
            $contractNumber =
                'CTR-' .
                $year .
                '-' .
                str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

            $exists = Contract::withTrashed()
                ->where('contract_no', $contractNumber)
                ->exists();

            if ($exists) {
                $nextNumber++;
            }
        } while ($exists);

        return $contractNumber;
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD MULTIPLE CONTRACT FILES
    |--------------------------------------------------------------------------
    */

    public function uploadContractFiles(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if ($contract->archived) {
            return back()->withErrors([
                'contract_files' =>
                'Archived records cannot be updated.',
            ]);
        }

        if (
            !$this->invoiceIsApproved($contract) &&
            $contract->invoice_id !== null
        ) {
            return back()->withErrors([
                'contract_files' =>
                'Cannot upload. Invoice must be approved first by Admin.',
            ]);
        }

        if (
            $contract->workflow_status === 'Active'
            || $contract->status === 'Active'
            || $contract->status === 'Expiring Soon'
            || $contract->status === 'Expired'
        ) {
            return back()->withErrors([
                'contract_files' =>
                'This record is already approved. Create a renewal record instead.',
            ]);
        }

        $validated = $request->validate([
            'contract_files' => ['required', 'array', 'min:1'],
            'contract_files.*' => ['required', 'file'],
        ]);

        $this->saveContractFiles(
            $contract,
            $validated['contract_files'],
            'contract',
            Auth::id()
        );

        if (
            in_array(
                $contract->workflow_status,
                ['Needs Correction', 'Rejected', '', null],
                true
            )
        ) {
            $contract->workflow_status = 'Pending';
            $contract->status = 'Pending';
            $contract->rejection_reason = null;
            $contract->submitted_at = null;
            $contract->submitted_by = null;
            $contract->reviewed_at = null;
            $contract->reviewed_by = null;
            $contract->approved_at = null;
            $contract->start_date = null;
            $contract->end_date = null;
            $contract->save();
        }

        return back()->with(
            'success',
            count($validated['contract_files']) .
                ' document(s) uploaded successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD MULTIPLE SIGNED FILES
    |--------------------------------------------------------------------------
    */

    public function uploadSignedFiles(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if ($contract->archived) {
            return back()->withErrors([
                'signed_files' =>
                'Archived records cannot be updated.',
            ]);
        }

        if (
            !$this->invoiceIsApproved($contract) &&
            $contract->invoice_id !== null
        ) {
            return back()->withErrors([
                'signed_files' =>
                'Cannot upload. Invoice must be approved first by Admin.',
            ]);
        }

        if ($contract->files()->where('type', 'contract')->count() === 0) {
            return back()->withErrors([
                'signed_files' =>
                'Please upload the contract document first.',
            ]);
        }

        if (
            $contract->workflow_status === 'Active'
            || $contract->status === 'Active'
            || $contract->status === 'Expiring Soon'
            || $contract->status === 'Expired'
        ) {
            return back()->withErrors([
                'signed_files' =>
                'This record is already approved. Create a renewal record instead.',
            ]);
        }

        $validated = $request->validate([
            'signed_files' => ['required', 'array', 'min:1'],
            'signed_files.*' => ['required', 'file'],
        ]);

        $this->saveContractFiles(
            $contract,
            $validated['signed_files'],
            'signed',
            Auth::id()
        );

        $contract->workflow_status = 'Pending';
        $contract->status = 'Pending';
        $contract->rejection_reason = null;
        $contract->submitted_at = null;
        $contract->submitted_by = null;
        $contract->reviewed_at = null;
        $contract->reviewed_by = null;
        $contract->approved_at = null;
        $contract->start_date = null;
        $contract->end_date = null;
        $contract->save();

        return back()->with(
            'success',
            count($validated['signed_files']) .
                ' signed document(s) uploaded successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE INDIVIDUAL FILE
    |--------------------------------------------------------------------------
    */

    public function deleteFile(ContractFile $file)
    {
        $contract = $file->contract;

        abort_unless($contract, 404);

        $this->authorizeStaffRecord($contract);

        if (
            $contract->workflow_status === 'Active'
            || $contract->status === 'Active'
            || $contract->status === 'Expiring Soon'
        ) {
            return back()->withErrors([
                'file' =>
                'Cannot delete files from an active record.',
            ]);
        }

        $this->deleteStoredFile($file->file_path);

        $fileType = $file->type;

        $file->delete();

        if ($fileType === 'contract') {
            $remaining = $contract->contractFiles()->latest()->first();
            $contract->contract_file_path = $remaining?->file_path;
            $contract->contract_file_name = $remaining?->file_name;
        }

        if ($fileType === 'signed') {
            $remaining = $contract->signedFiles()->latest()->first();
            $contract->signed_contract_path = $remaining?->file_path;
            $contract->signed_contract_file_name = $remaining?->file_name;
        }

        $contract->save();

        return back()->with(
            'success',
            'File deleted successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD SINGLE FILE
    |--------------------------------------------------------------------------
    */

    public function downloadFile(ContractFile $file): StreamedResponse
    {
        $contract = $file->contract;

        abort_unless($contract, 404);

        $this->authorizeStaffRecord($contract);

        return $this->streamDownload(
            $file->file_path,
            $file->file_name,
            $file->file_name
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD CONTRACT (LEGACY — single file)
    |--------------------------------------------------------------------------
    */

    public function uploadContractFile(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if ($contract->archived) {
            return back()->withErrors([
                'contract_file' =>
                'Archived contracts cannot be updated.',
            ]);
        }

        if (
            !$this->invoiceIsApproved($contract) &&
            $contract->invoice_id !== null
        ) {
            return back()->withErrors([
                'contract_file' =>
                'Cannot upload contract. Invoice must be approved first by Admin.',
            ]);
        }

        if (
            $contract->workflow_status === 'Active'
            || $contract->status === 'Active'
            || $contract->status === 'Expiring Soon'
            || $contract->status === 'Expired'
        ) {
            return back()->withErrors([
                'contract_file' =>
                'This contract is already approved. Create a renewal record instead of replacing the approved contract.',
            ]);
        }

        // ✅ Walang file type o size limit
        $validated = $request->validate([
            'contract_file' => ['required', 'file'],
        ]);

        if ($contract->contract_file_path) {
            $this->deleteStoredFile($contract->contract_file_path);
        }

        $file = $validated['contract_file'];

        $path = $file->store('contracts/' . $contract->id, 'public');

        $contract->contract_file_path = $path;
        $contract->contract_file_name = $file->getClientOriginalName();

        if (
            in_array(
                $contract->workflow_status,
                ['Needs Correction', 'Rejected', '', null],
                true
            )
        ) {
            $contract->workflow_status = 'Pending';
            $contract->status = 'Pending';
            $contract->rejection_reason = null;
            $contract->submitted_at = null;
            $contract->submitted_by = null;
            $contract->reviewed_at = null;
            $contract->reviewed_by = null;
            $contract->approved_at = null;
            $contract->start_date = null;
            $contract->end_date = null;
        }

        $contract->save();

        return back()->with(
            'success',
            'Contract document uploaded successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPLOAD SIGNED CONTRACT (LEGACY — single file)
    |--------------------------------------------------------------------------
    */

    public function uploadSignedContract(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if ($contract->archived) {
            return back()->withErrors([
                'signed_contract' =>
                'Archived contracts cannot be updated.',
            ]);
        }

        if (
            !$this->invoiceIsApproved($contract) &&
            $contract->invoice_id !== null
        ) {
            return back()->withErrors([
                'signed_contract' =>
                'Cannot upload signed contract. Invoice must be approved first by Admin.',
            ]);
        }

        if (!$contract->contract_file_path) {
            return back()->withErrors([
                'signed_contract' =>
                'Please upload the contract document first.',
            ]);
        }

        if (
            $contract->workflow_status === 'Active'
            || $contract->status === 'Active'
            || $contract->status === 'Expiring Soon'
            || $contract->status === 'Expired'
        ) {
            return back()->withErrors([
                'signed_contract' =>
                'This contract is already approved. Create a renewal record instead of replacing the approved contract.',
            ]);
        }

        // ✅ Walang file type o size limit
        $validated = $request->validate([
            'signed_contract' => ['required', 'file'],
        ]);

        if ($contract->signed_contract_path) {
            $this->deleteStoredFile($contract->signed_contract_path);
        }

        $file = $validated['signed_contract'];

        $path = $file->store(
            'contracts/' . $contract->id . '/signed',
            'public'
        );

        $contract->signed_contract_path = $path;
        $contract->signed_contract_file_name = $file->getClientOriginalName();

        $contract->workflow_status = 'Pending';
        $contract->status = 'Pending';
        $contract->rejection_reason = null;
        $contract->submitted_at = null;
        $contract->submitted_by = null;
        $contract->reviewed_at = null;
        $contract->reviewed_by = null;
        $contract->approved_at = null;
        $contract->start_date = null;
        $contract->end_date = null;

        $contract->save();

        return back()->with(
            'success',
            'Signed contract uploaded successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RETURN FOR CORRECTION
    |--------------------------------------------------------------------------
    */

    public function returnForCorrection(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if ($contract->archived) {
            return back()->withErrors([
                'correction_reason' =>
                'Archived contracts cannot be returned for correction.',
            ]);
        }

        if ($contract->workflow_status !== 'Submitted for Review') {
            return back()->withErrors([
                'correction_reason' =>
                'Only contracts submitted for review can be returned for correction.',
            ]);
        }

        $validated = $request->validate([
            'correction_reason' => [
                'required',
                'string',
                'max:5000',
            ],
        ]);

        $contract->workflow_status = 'Needs Correction';
        $contract->status = 'Pending';
        $contract->rejection_reason = $validated['correction_reason'];

        $contract->submitted_at = null;
        $contract->submitted_by = null;
        $contract->reviewed_at = null;
        $contract->reviewed_by = null;
        $contract->approved_at = null;
        $contract->start_date = null;
        $contract->end_date = null;

        $contract->save();

        return back()->with(
            'success',
            'Contract returned to client for correction.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL TO CLIENT
    |--------------------------------------------------------------------------
    */
public function sendEmail(
    Request $request,
    Contract $contract
) {
    $this->authorizeStaffRecord($contract);

    if ($contract->archived) {
        return back()->withErrors([
            'email' => 'Archived contracts cannot be emailed.',
        ]);
    }

    if (
        !$this->invoiceIsApproved($contract) &&
        $contract->invoice_id !== null
    ) {
        return back()->withErrors([
            'email' =>
            'Cannot email client. Invoice must be approved first by Admin.',
        ]);
    }

    $validated = $request->validate([
        'recipient_email' => ['required', 'email', 'max:255'],
        'subject' => ['required', 'string', 'max:255'],
        'message' => ['required', 'string', 'max:10000'],
    ]);

    // ✅ Kunin lahat ng files (contract + signed)
    $files = $contract->files()
        ->orderBy('type')
        ->get();

    if ($files->isEmpty() && !$contract->contract_file_path) {
        return back()->withErrors([
            'email' =>
            'Please upload the contract document first before sending it to the client.',
        ]);
    }

    $attachments = [];
    $disk = Storage::disk('public');

    foreach ($files as $file) {
        $cleanPath = ltrim($file->file_path, '/');
        $cleanPath = preg_replace('#^storage/#i', '', $cleanPath);

        if (!$disk->exists($cleanPath)) {
            continue;
        }

        try {
            $fileContents = $disk->get($cleanPath);
            $mimeType = (new \finfo(FILEINFO_MIME_TYPE))
                ->buffer($fileContents) ?: 'application/octet-stream';

            $attachments[] = [
                'contents' => $fileContents,
                'name' => $file->file_name,
                'mime' => $mimeType,
            ];
        } catch (\Throwable $e) {
            report($e);
        }
    }

    // ✅ Fallback sa legacy columns
    if (empty($attachments) && $contract->contract_file_path) {
        $cleanPath = ltrim($contract->contract_file_path, '/');
        $cleanPath = preg_replace('#^storage/#i', '', $cleanPath);

        if ($disk->exists($cleanPath)) {
            $fileContents = $disk->get($cleanPath);
            $attachments[] = [
                'contents' => $fileContents,
                'name' => $contract->contract_file_name ?: basename($cleanPath),
                'mime' => (new \finfo(FILEINFO_MIME_TYPE))
                    ->buffer($fileContents) ?: 'application/octet-stream',
            ];
        }
    }

    if (empty($attachments)) {
        return back()->withErrors([
            'email' =>
            'The contract files could not be read. Please upload them again.',
        ]);
    }

    try {
        Mail::raw(
            $validated['message'],
            function ($mail) use ($validated, $attachments) {
                $mail->to($validated['recipient_email']);
                $mail->subject($validated['subject']);

                foreach ($attachments as $att) {
                    $mail->attachData(
                        $att['contents'],
                        $att['name'],
                        ['mime' => $att['mime']]
                    );
                }
            }
        );
    } catch (\Throwable $e) {
        report($e);

        return back()->withErrors([
            'email' =>
            'The contract email could not be sent. Please check your mail configuration.',
        ]);
    }

    $contract->sent_at = now();
    $contract->save();

    return back()->with(
        'success',
        'Contract email sent successfully with ' .
            count($attachments) .
            ' file(s) attached.'
    );
}

    /*
    |--------------------------------------------------------------------------
    | SUBMIT FOR ADMIN REVIEW — ✅ PERMIT SUPPORT
    |--------------------------------------------------------------------------
    */

    public function submitForReview(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if ($contract->archived) {
            return back()->withErrors([
                'review' =>
                'Archived contracts cannot be submitted for review.',
            ]);
        }

        if (
            !in_array(
                $contract->workflow_status,
                ['Pending', 'Needs Correction'],
                true
            )
        ) {
            return back()->withErrors([
                'review' =>
                'This contract is not ready for Staff submission.',
            ]);
        }

        if (
            !$this->invoiceIsApproved($contract) &&
            $contract->invoice_id !== null
        ) {
            return back()->withErrors([
                'review' =>
                'Cannot submit. Invoice must be approved first by Admin.',
            ]);
        }

        // ✅ Document file required for BOTH Contract and Permit
        $contractFileCount = $contract->files()
            ->where('type', 'contract')
            ->count();

        if ($contractFileCount === 0 && !$contract->contract_file_path) {
            return back()->withErrors([
                'review' =>
                'Please upload the document file first.',
            ]);
        }

        // ✅ Detect if Permit
        $typeRaw = strtolower(trim((string) ($contract->type ?? 'Contract')));
        $isPermit = $typeRaw === 'permit';

        // ✅ Signed document ONLY required for CONTRACT
        if (!$isPermit) {
            $signedFileCount = $contract->files()
                ->where('type', 'signed')
                ->count();

            if ($signedFileCount === 0 && !$contract->signed_contract_path) {
                return back()->withErrors([
                    'review' =>
                    'Please upload the signed contract first.',
                ]);
            }
        }

        $contract->workflow_status = 'Submitted for Review';
        $contract->status = 'Pending';
        $contract->submitted_at = now();
        $contract->submitted_by = Auth::id();
        $contract->rejection_reason = null;
        $contract->approved_at = null;
        $contract->start_date = null;
        $contract->end_date = null;

        $contract->save();

        try {
            $admins = User::query()
                ->where('role', 'admin')
                ->get(['id', 'name', 'email']);

            $submittedBy = Auth::user();
            $recordType = $isPermit ? 'Permit' : 'Contract';

            foreach ($admins as $admin) {
                try {
                    Mail::raw(
                        "A {$recordType} has been submitted for review.\n\n" .
                            "{$recordType} No: " .
                            ($contract->contract_no ?? "CTR-{$contract->id}") .
                            "\n" .
                            "Client: " .
                            ($contract->client ?? '—') .
                            "\n" .
                            "Project: " .
                            ($contract->project ?? '—') .
                            "\n" .
                            "Submitted by: " .
                            ($submittedBy->name ?? 'Staff') .
                            "\n" .
                            "Submitted at: " .
                            now()->format('M d, Y h:i A') .
                            "\n\n" .
                            "Please review it in the admin panel:\n" .
                            url('/admin/contracts'),
                        function ($mail) use ($admin, $recordType) {
                            $mail
                                ->to($admin->email)
                                ->subject(
                                    "{$recordType} Submitted for Review — Action Required"
                                );
                        }
                    );
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return back()->with(
            'success',
            $isPermit
                ? 'Permit submitted to Admin for final review.'
                : 'Contract submitted to Admin for final review.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ARCHIVE
    |--------------------------------------------------------------------------
    */

    public function archive(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if ($contract->archived) {
            return back()->withErrors([
                'archive' =>
                'This Contract / Permit is already archived.',
            ]);
        }

        $expiresAt = now()->addDays(90);

        $contract->archived = true;
        $contract->archived_at = now();
        $contract->archive_expires_at = $expiresAt;
        $contract->retention_delete_at = $expiresAt;

        $contract->save();

        return back()->with(
            'success',
            'Contract / Permit moved to archive for 90 days.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RESTORE
    |--------------------------------------------------------------------------
    */

    public function restore(
        Request $request,
        Contract $contract
    ) {
        $this->authorizeStaffRecord($contract);

        if (!$contract->archived) {
            return back()->withErrors([
                'restore' =>
                'This Contract / Permit is not archived.',
            ]);
        }

        $contract->archived = false;
        $contract->archived_at = null;
        $contract->archive_expires_at = null;
        $contract->retention_delete_at = null;

        $contract->status = $this->calculateStatus($contract);

        $contract->save();

        return back()->with(
            'success',
            'Contract / Permit restored successfully.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD CONTRACT FILE (LEGACY)
    |--------------------------------------------------------------------------
    */

    public function downloadContract(Contract $contract): StreamedResponse
    {
        $this->authorizeStaffRecord($contract);

        if (!$contract->contract_file_path) {
            abort(404, 'Contract file not found.');
        }

        return $this->streamDownload(
            $contract->contract_file_path,
            $contract->contract_file_name,
            $contract->contract_no ?? "contract-{$contract->id}"
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD SIGNED CONTRACT FILE (LEGACY)
    |--------------------------------------------------------------------------
    */

    public function downloadSignedContract(Contract $contract): StreamedResponse
    {
        $this->authorizeStaffRecord($contract);

        if (!$contract->signed_contract_path) {
            abort(404, 'Signed contract file not found.');
        }

        return $this->streamDownload(
            $contract->signed_contract_path,
            $contract->signed_contract_file_name,
            ($contract->contract_no ?? "contract-{$contract->id}") . '-SIGNED'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | STREAM DOWNLOAD HELPER
    |--------------------------------------------------------------------------
    */

    protected function streamDownload(
        string $path,
        ?string $originalName = null,
        ?string $fallbackName = null
    ): StreamedResponse {
        $cleanPath = ltrim($path, '/');
        $cleanPath = preg_replace('#^storage/#i', '', $cleanPath);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        if (!$disk->exists($cleanPath)) {
            abort(404, 'File does not exist on the server.');
        }

        $fileName = $originalName ?: basename($cleanPath);

        if (!pathinfo($fileName, PATHINFO_EXTENSION)) {
            $ext = pathinfo($cleanPath, PATHINFO_EXTENSION);
            if ($ext) {
                $fileName .= '.' . $ext;
            }
        }

        return $disk->download($cleanPath, $fileName);
    }

    /*
    |--------------------------------------------------------------------------
    | STAFF AUTHORIZATION
    |--------------------------------------------------------------------------
    */

    protected function authorizeStaffRecord(Contract $contract): void
    {
        $user = Auth::user();

        abort_unless($user, 403, 'Unauthorized.');

        if (strtolower((string) $user->role) === 'admin') {
            return;
        }

        if (
            $contract->assigned_to !== null &&
            (int) $contract->assigned_to !== (int) $user->id
        ) {
            abort(
                403,
                'You are not authorized to access this Contract / Permit.'
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE APPROVAL
    |--------------------------------------------------------------------------
    */

    protected function invoiceIsApproved(Contract $contract): bool
    {
        if ($contract->invoice) {
            $invoiceStatus = strtolower(
                trim((string) $contract->invoice->status)
            );

            if (
                in_array(
                    $invoiceStatus,
                    ['approved', 'paid', 'partial'],
                    true
                )
            ) {
                return true;
            }
        }

        return
            $contract->is_invoice_approved === true
            || $contract->is_invoice_approved === 1;
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS CALCULATION
    |--------------------------------------------------------------------------
    */

    protected function calculateStatus(Contract $contract): string
    {
        if ($contract->archived) {
            return 'Archived';
        }

        if (!$contract->approved_at) {
            return 'Pending';
        }

        if (!$contract->end_date) {
            return 'Active';
        }

        $today = now()->startOfDay();
        $endDate = $contract->end_date->copy()->startOfDay();

        if ($endDate->lt($today)) {
            return 'Expired';
        }

        $daysUntilExpiry = $today->diffInDays($endDate, false);

        if ($daysUntilExpiry >= 0 && $daysUntilExpiry <= 30) {
            return 'Expiring Soon';
        }

        return 'Active';
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE STORED FILE
    |--------------------------------------------------------------------------
    */

    protected function deleteStoredFile(?string $path): void
    {
        if (!$path) {
            return;
        }

        $cleanPath = ltrim($path, '/');
        $cleanPath = preg_replace('#^storage/#i', '', $cleanPath);

        if (Storage::disk('public')->exists($cleanPath)) {
            Storage::disk('public')->delete($cleanPath);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | RESOLVE STORAGE PATH
    |--------------------------------------------------------------------------
    */

    protected function resolveStoragePath(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (
            str_starts_with($path, DIRECTORY_SEPARATOR)
            || preg_match('/^[A-Za-z]:[\\\\\/]/', $path)
        ) {
            return file_exists($path) ? $path : null;
        }

        $cleanPath = ltrim($path, '/');
        $cleanPath = preg_replace('#^storage/#i', '', $cleanPath);

        $fullPath = Storage::disk('public')->path($cleanPath);

        return file_exists($fullPath) ? $fullPath : null;
    }
}
