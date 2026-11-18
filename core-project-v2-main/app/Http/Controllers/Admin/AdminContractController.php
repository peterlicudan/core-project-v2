<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Auth;

class AdminContractController extends Controller
{
    private const ARCHIVE_RETENTION_DAYS = 90;

    private const CONTRACT_VALIDITY_DAYS = 90;

    /*
    |--------------------------------------------------------------------------
    | ✅ NOTIFY CONTRACT OWNER (IN-APP)
    |--------------------------------------------------------------------------
    */

    private function notifyContractOwner(Contract $contract, string $action): void
    {
        $recipientId = $contract->created_by ?? $contract->assigned_to ?? null;
        if (!$recipientId) {
            return;
        }

        $typeRaw = strtolower(trim((string) ($contract->type ?? 'Contract')));
        $isPermit = $typeRaw === 'permit' || str_contains($typeRaw, 'permit');
        $typeLabel = $isPermit ? 'Permit' : 'Contract';

        $reference = $contract->contract_no ?? "CTR-{$contract->id}";

        if ($action === 'approved') {
            $title = "{$typeLabel} Approved ✅";
            $message = "Your {$typeLabel} {$reference} has been approved and is now Active.";
            $notifType = 'success';
            $status = 'Active';
        } else {
            $title = "{$typeLabel} Needs Correction ⚠️";
            $message = "Your {$typeLabel} {$reference} needs correction: "
                . ($contract->rejection_reason ?? 'Please check the record for details.');
            $notifType = 'error';
            $status = 'Needs Correction';
        }

        try {
            Notification::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id' => $recipientId,
                'type' => 'admin_notification',
                'data' => json_encode([
                    'title' => $title,
                    'message' => $message,
                    'type' => $notifType,
                    'link' => '/contract-permit',
                 'from_user_id' => Auth::id(),
                    'contract_id' => $contract->id,
                    'contract_reference' => $reference,
                    'client' => $contract->client,
                    'status' => $status,
                   'redirect_url' => '/contract-permit?contract_id=' . $contract->id,
                    'changes' => [
                        'status' => [
                            'from' => 'Submitted for Review',
                            'to' => $status,
                        ],
                    ],
                ]),
                'read_at' => null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN CONTRACT LIST
    |--------------------------------------------------------------------------
    */

    public function index(): Response
    {
        $contracts = Contract::query()
            ->with([
                'creator:id,name,email',
                'assignedStaff:id,name,email',
                'submittedBy:id,name,email',
                'reviewedBy:id,name,email',
                'invoice',
                'files',
                'contractFiles',
                'signedFiles',
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Contract $contract) {
                $daysUntilExpiry = null;
                $expiryStatus = null;

                if ($contract->approved_at && $contract->end_date) {
                    $today = now()->startOfDay();
                    $expiry = Carbon::parse($contract->end_date)->startOfDay();
                    $daysUntilExpiry = $today->diffInDays($expiry, false);

                    if ($daysUntilExpiry < 0) {
                        $expiryStatus = 'Expired';
                    } elseif ($daysUntilExpiry <= 30) {
                        $expiryStatus = 'Expiring Soon';
                    } else {
                        $expiryStatus = 'Active';
                    }
                }

                $status = $this->calculateStatus($contract);
                $creator = $contract->creator;
                $assignedStaff = $contract->assignedStaff;

                $typeRaw = strtolower(trim((string) ($contract->type ?? 'Contract')));
                $isPermit = $typeRaw === 'permit' || str_contains($typeRaw, 'permit');

                $files = $contract->files
                    ->map(function ($file) {
                        return [
                            'id' => $file->id,
                            'type' => $file->type,
                            'file_path' => $file->file_path,
                            'file_name' => $file->file_name,
                            'file_size' => $file->file_size,
                            'mime_type' => $file->mime_type,
                            'created_at' => $file->created_at ? $file->created_at->format('Y-m-d H:i:s') : null,
                        ];
                    })
                    ->values()
                    ->all();

                $contractFiles = $contract->contractFiles
                    ->map(function ($file) {
                        return [
                            'id' => $file->id,
                            'type' => $file->type,
                            'file_path' => $file->file_path,
                            'file_name' => $file->file_name,
                            'file_size' => $file->file_size,
                            'mime_type' => $file->mime_type,
                            'created_at' => $file->created_at ? $file->created_at->format('Y-m-d H:i:s') : null,
                        ];
                    })
                    ->values()
                    ->all();

                $signedFiles = $contract->signedFiles
                    ->map(function ($file) {
                        return [
                            'id' => $file->id,
                            'type' => $file->type,
                            'file_path' => $file->file_path,
                            'file_name' => $file->file_name,
                            'file_size' => $file->file_size,
                            'mime_type' => $file->mime_type,
                            'created_at' => $file->created_at ? $file->created_at->format('Y-m-d H:i:s') : null,
                        ];
                    })
                    ->values()
                    ->all();

                return [
                    'id' => $contract->id,
                    'title' => $contract->contract_no ?: 'Contract / Permit #' . $contract->id,
                    'name' => $contract->contract_no ?: 'Contract / Permit #' . $contract->id,
                    'type' => $contract->type ?: 'Contract',
                    'is_permit' => $isPermit,
                    'isPermit' => $isPermit,
                    'contract_type' => $contract->contract_type,
                    'client' => $contract->client,
                    'client_name' => $contract->client,
                    'email' => $contract->email,
                    'client_email' => $contract->email,
                    'project' => $contract->project,
                    'project_name' => $contract->project,
                    'location' => $contract->location,
                    'contract_no' => $contract->contract_no,
                    'contract_number' => $contract->contract_no,
                    'reference_number' => $contract->contract_no,
                    'permit_number' => $contract->contract_no,
                    'start_date' => $contract->start_date ? $contract->start_date->format('Y-m-d') : null,
                    'issue_date' => $contract->start_date ? $contract->start_date->format('Y-m-d') : null,
                    'end_date' => $contract->end_date ? $contract->end_date->format('Y-m-d') : null,
                    'expiry_date' => $contract->end_date ? $contract->end_date->format('Y-m-d') : null,
                    'approved_at' => $contract->approved_at ? $contract->approved_at->format('Y-m-d H:i:s') : null,
                    'invoice_id' => $contract->invoice_id,
                    'is_invoice_approved' => (bool) ($contract->is_invoice_approved ?? false),
                    'invoice_approved_at' => $contract->invoice_approved_at,
                    'invoice_approved_by' => $contract->invoice_approved_by,
                    'invoice' => $contract->invoice,
                    'days_until_expiry' => $daysUntilExpiry,
                    'daysUntilExpiry' => $daysUntilExpiry,
                    'expiry_status' => $expiryStatus,
                    'status' => $status,
                    'workflow_status' => $contract->workflow_status ?: 'Pending',
                    'workflowStatus' => $contract->workflow_status ?: 'Pending',
                    'contract_file_path' => $contract->contract_file_path,
                    'contract_file_name' => $contract->contract_file_name,
                    'signed_contract_path' => $contract->signed_contract_path,
                    'signed_contract_file_name' => $contract->signed_contract_file_name,
                    'contract_file_url' => $this->fileUrl($contract->contract_file_path),
                    'signed_contract_url' => $this->fileUrl($contract->signed_contract_path),
                    'files' => $files,
                    'contract_files' => $contractFiles,
                    'signed_files' => $signedFiles,
                    'sent_at' => $contract->sent_at ? $contract->sent_at->format('Y-m-d H:i:s') : null,
                    'submitted_at' => $contract->submitted_at ? $contract->submitted_at->format('Y-m-d H:i:s') : null,
                    'reviewed_at' => $contract->reviewed_at ? $contract->reviewed_at->format('Y-m-d H:i:s') : null,
                    'submitted_by' => $contract->submitted_by,
                    'submitted_by_user' => $contract->submittedBy
                        ? [
                            'id' => $contract->submittedBy->id,
                            'name' => $contract->submittedBy->name,
                            'email' => $contract->submittedBy->email,
                        ]
                        : null,
                    'reviewed_by' => $contract->reviewed_by,
                    'reviewed_by_user' => $contract->reviewedBy
                        ? [
                            'id' => $contract->reviewedBy->id,
                            'name' => $contract->reviewedBy->name,
                            'email' => $contract->reviewedBy->email,
                        ]
                        : null,
                    'rejection_reason' => $contract->rejection_reason,
                    'rejectionReason' => $contract->rejection_reason,
                    'correction_reason' => $contract->rejection_reason,
                    'correctionReason' => $contract->rejection_reason,
                    'equipment' => $contract->equipment,
                    'documents' => (int) ($contract->documents ?? 0),
                    'description' => $contract->description,
                    'notes' => $contract->description,
                    'archived' => (bool) $contract->archived,
                    'is_archived' => (bool) $contract->archived,
                    'isArchived' => (bool) $contract->archived,
                    'archived_at' => $contract->archived_at,
                    'archive_expires_at' => $contract->archive_expires_at,
                    'retention_delete_at' => $contract->retention_delete_at,
                    'assigned_to' => $contract->assigned_to,
                    'assigned_staff' => $assignedStaff
                        ? [
                            'id' => $assignedStaff->id,
                            'name' => $assignedStaff->name,
                            'email' => $assignedStaff->email,
                        ]
                        : null,
                    'staff' => $assignedStaff
                        ? [
                            'id' => $assignedStaff->id,
                            'name' => $assignedStaff->name,
                            'email' => $assignedStaff->email,
                        ]
                        : null,
                    'created_by' => $contract->created_by,
                    'creator' => $creator
                        ? [
                            'id' => $creator->id,
                            'name' => $creator->name,
                            'email' => $creator->email,
                        ]
                        : null,
                    'created_by_name' => $creator?->name,
                    'created_by_email' => $creator?->email,
                    'created_at' => $contract->created_at ? $contract->created_at->format('Y-m-d H:i:s') : null,
                    'updated_at' => $contract->updated_at ? $contract->updated_at->format('Y-m-d H:i:s') : null,
                    'createdAt' => $contract->created_at ? $contract->created_at->format('Y-m-d H:i:s') : null,
                    'updatedAt' => $contract->updated_at ? $contract->updated_at->format('Y-m-d H:i:s') : null,
                ];
            })
            ->values();

        $approvedInvoices = Invoice::query()
            ->whereIn('status', ['Approved', 'Paid', 'Partial'])
            ->whereDoesntHave('contractPermits')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Invoice $invoice) {
                return [
                    'id' => $invoice->id,
                    'number' => $invoice->number ?? $invoice->billing_number,
                    'has_invoice_number' => filled($invoice->number),
                    'billing_number' => $invoice->billing_number,
                    'client' => $invoice->client,
                    'client_email' => $invoice->client_email,
                    'project' => $invoice->project,
                    'amount' => (float) $invoice->amount,
                    'status' => $invoice->status,
                    'due_date' => $invoice->due_date ? $invoice->due_date->format('Y-m-d') : null,
                    'has_contract' => false,
                ];
            })
            ->values();

        $staff = User::query()
            ->where('role', 'staff')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->values();

        return Inertia::render('Admin/ContractPermitManagement', [
            'contracts' => $contracts,
            'contractPermits' => $contracts,
            'permits' => $contracts,
            'staff' => $staff,
            'approvedInvoices' => $approvedInvoices,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE CONTRACT
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, Contract $contract): RedirectResponse
    {
        if ($contract->archived) {
            return back()->with('error', 'Archived Contract / Permit records cannot be edited. Restore the record first.');
        }

        if ($contract->workflow_status === 'Submitted for Review') {
            return back()->with('error', 'This contract is currently submitted for Admin review and cannot be edited.');
        }

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'contract_type' => ['nullable', 'string', 'max:255'],
            'client' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'project' => ['required', 'string', 'max:255'],
            'contract_number' => ['nullable', 'string', 'max:255', Rule::unique('contracts', 'contract_no')->ignore($contract->id)],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'location' => ['nullable', 'string', 'max:255'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'description' => ['nullable', 'string'],
            'invoice' => ['nullable', 'string', 'max:255'],
            'equipment' => ['nullable', 'string', 'max:255'],
            'documents' => ['nullable', 'integer', 'min:0'],
        ]);

        if (array_key_exists('assigned_to', $validated)) {
            $assignedTo = $validated['assigned_to'];

            if ($assignedTo !== null) {
                $staffExists = User::query()
                    ->where('id', $assignedTo)
                    ->where('role', 'staff')
                    ->exists();

                if (!$staffExists) {
                    return back()->with('error', 'The selected user is not a valid staff account.');
                }
            }
        }

        DB::transaction(function () use ($contract, $validated) {
            if (array_key_exists('contract_number', $validated)) {
                $contract->contract_no = $validated['contract_number'];
            }

            if (array_key_exists('type', $validated)) {
                $contract->type = $validated['type'];
            }

            if (array_key_exists('contract_type', $validated)) {
                $contract->contract_type = $validated['contract_type'];
            }

            if (array_key_exists('client', $validated)) {
                $contract->client = $validated['client'];
            }

            if (array_key_exists('email', $validated)) {
                $contract->email = $validated['email'];
            }

            if (array_key_exists('project', $validated)) {
                $contract->project = $validated['project'];
            }

            if (array_key_exists('location', $validated)) {
                $contract->location = $validated['location'];
            }

            if ($contract->approved_at) {
                if (array_key_exists('start_date', $validated)) {
                    $contract->start_date = $validated['start_date'];
                }

                if (array_key_exists('end_date', $validated)) {
                    $contract->end_date = $validated['end_date'];
                }
            } else {
                $contract->start_date = null;
                $contract->end_date = null;
            }

            if (array_key_exists('description', $validated)) {
                $contract->description = $validated['description'];
            }

            if (array_key_exists('invoice', $validated)) {
                $contract->invoice = $validated['invoice'];
            }

            if (array_key_exists('equipment', $validated)) {
                $contract->equipment = $validated['equipment'];
            }

            if (array_key_exists('documents', $validated)) {
                $contract->documents = $validated['documents'];
            }

            if (array_key_exists('assigned_to', $validated)) {
                $contract->assigned_to = $validated['assigned_to'];
            }

            if (!$contract->status) {
                $contract->status = 'Pending';
            }

            if (!$contract->workflow_status) {
                $contract->workflow_status = 'Pending';
            }

            $contract->save();
        });

        return back()->with('success', 'Contract / Permit updated successfully.');
    }

    /*
    |--------------------------------------------------------------------------
    | APPROVE INVOICE
    |--------------------------------------------------------------------------
    */

    public function approveInvoice(Request $request, Contract $contract): RedirectResponse
    {
        if ($contract->archived) {
            return back()->with('error', 'Archived records cannot have invoice approved.');
        }

        if ($contract->is_invoice_approved) {
            return back()->with('error', 'Invoice is already approved for this contract.');
        }

        if ($contract->invoice_id) {
            $invoice = Invoice::find($contract->invoice_id);

            if ($invoice && !in_array($invoice->status, ['Approved', 'Paid', 'Partial'], true)) {
                $invoice->status = 'Approved';
                $invoice->save();
            }
        }

        $contract->is_invoice_approved = true;
        $contract->invoice_approved_at = now();
        $contract->invoice_approved_by = $request->user()->id;
        $contract->save();

        return back()->with('success', 'Invoice approved successfully. Invoice approval is recorded separately from Contract / Permit activation.');
    }

    /*
    |--------------------------------------------------------------------------
    | CHANGE STATUS
    |--------------------------------------------------------------------------
    */

    public function updateStatus(Request $request, Contract $contract): RedirectResponse
    {
        if ($contract->archived) {
            return back()->with('error', 'Archived records cannot have their status changed.');
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['Pending', 'Active', 'Expiring', 'Expiring Soon', 'Expired', 'Needs Correction'])],
        ]);

        if ($validated['status'] === 'Needs Correction') {
            $contract->workflow_status = 'Needs Correction';
            $contract->status = 'Pending';
            $contract->approved_at = null;
            $contract->start_date = null;
            $contract->end_date = null;
            $contract->save();

            return back()->with('success', 'Contract / Permit marked as Needs Correction.');
        }

        if ($validated['status'] === 'Pending') {
            $contract->status = 'Pending';
            $contract->save();

            return back()->with('success', 'Contract / Permit status updated successfully.');
        }

        if (!$contract->approved_at && in_array($validated['status'], ['Active', 'Expiring', 'Expiring Soon', 'Expired'], true)) {
            return back()->with('error', 'A Contract / Permit cannot become Active, Expiring Soon, or Expired before final Admin approval.');
        }

        $contract->status = $this->calculateStatus($contract);
        $contract->save();

        return back()->with('success', 'Contract / Permit status updated successfully.');
    }

    /*
    |--------------------------------------------------------------------------
    | FINAL ADMIN APPROVAL
    |--------------------------------------------------------------------------
    */

    public function approve(Request $request, Contract $contract): RedirectResponse
    {
        if ($contract->archived) {
            return back()->with('error', 'Archived records cannot be approved.');
        }

        if (trim((string) $contract->workflow_status) !== 'Submitted for Review') {
            return back()->with('error', 'Only records submitted for review can be approved.');
        }

        $contract->load(['contractFiles', 'signedFiles']);

        $typeRaw = strtolower(trim((string) ($contract->type ?? 'Contract')));
        $isPermit = $typeRaw === 'permit' || str_contains($typeRaw, 'permit');

        $primaryFiles = $contract->contractFiles;
        $hasPrimaryFiles = $primaryFiles->isNotEmpty();

        if (!$hasPrimaryFiles) {
            $legacyPrimaryPath = $contract->contract_file_path;

            if ($legacyPrimaryPath && trim((string) $legacyPrimaryPath) !== '') {
                $primaryFiles = collect([
                    (object) [
                        'file_path' => $legacyPrimaryPath,
                        'file_name' => $contract->contract_file_name,
                    ],
                ]);
                $hasPrimaryFiles = true;
            }
        }

        if (!$hasPrimaryFiles) {
            return back()->with('error', $isPermit
                ? 'The permit document is required before approval.'
                : 'The actual contract file is required before approval.');
        }

        foreach ($primaryFiles as $file) {
            $path = ltrim((string) $file->file_path, '/');
            $path = preg_replace('#^storage/#i', '', $path);

            if (!$path || !Storage::disk('public')->exists($path)) {
                return back()->with('error', $isPermit
                    ? 'One or more permit documents could not be found on the server.'
                    : 'One or more contract documents could not be found on the server.');
            }
        }

        if (!$isPermit) {
            $signedFiles = $contract->signedFiles;

            if ($signedFiles->isEmpty() && $contract->signed_contract_path) {
                $signedFiles = collect([
                    (object) [
                        'file_path' => $contract->signed_contract_path,
                        'file_name' => $contract->signed_contract_file_name,
                    ],
                ]);
            }

            if ($signedFiles->isEmpty()) {
                return back()->with('error', 'A signed contract file is required before approval.');
            }

            foreach ($signedFiles as $file) {
                $path = ltrim((string) $file->file_path, '/');
                $path = preg_replace('#^storage/#i', '', $path);

                if (!$path || !Storage::disk('public')->exists($path)) {
                    return back()->with('error', 'One or more signed contract files could not be found on the server.');
                }
            }
        }

        $approvedAt = now();
        $startDate = $approvedAt->copy()->startOfDay();
        $endDate = $startDate->copy()->addDays(self::CONTRACT_VALIDITY_DAYS);

        $contract->approved_at = $approvedAt;
        $contract->start_date = $startDate->toDateString();
        $contract->end_date = $endDate->toDateString();
        $contract->workflow_status = 'Active';
        $contract->status = 'Active';
        $contract->reviewed_at = $approvedAt;
        $contract->reviewed_by = $request->user()->id;
        $contract->rejection_reason = null;

        $contract->save();

        $this->notifyContractOwner($contract, 'approved');

        return back()->with(
            'success',
            $isPermit
                ? 'Permit approved successfully. It is now Active for 90 days from the Admin approval date.'
                : 'Contract approved successfully. It is now Active for 90 days from the Admin approval date.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RETURN FOR CORRECTION
    |--------------------------------------------------------------------------
    */

    public function returnForCorrection(Request $request, Contract $contract): RedirectResponse
    {
        if ($contract->archived) {
            return back()->with('error', 'Archived records cannot be returned for correction.');
        }

        if ($contract->workflow_status !== 'Submitted for Review') {
            return back()->with('error', 'Only records submitted for review can be returned for correction.');
        }

        $validated = $request->validate([
            'correction_reason' => ['required', 'string', 'max:5000'],
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

        $typeRaw = strtolower(trim((string) ($contract->type ?? 'Contract')));
        $isPermit = $typeRaw === 'permit' || str_contains($typeRaw, 'permit');

        if (!$isPermit) {
            $contract->contract_file_path = null;
            $contract->contract_file_name = null;
            $contract->signed_contract_path = null;
            $contract->signed_contract_file_name = null;
        }

        $contract->save();

        $this->notifyContractOwner($contract, 'returned_for_correction');

        return back()->with(
            'success',
            $isPermit
                ? 'Permit returned for correction. Staff will update the permit document and resubmit for Admin review.'
                : 'Contract returned for correction. Staff must upload the corrected contract and signed contract again, then resubmit for Admin review.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ARCHIVE
    |--------------------------------------------------------------------------
    */

    public function archive(Contract $contract): RedirectResponse
    {
        if ($contract->archived) {
            return back()->with('error', 'This Contract / Permit is already archived.');
        }

        $archivedAt = now();

        $contract->archived = true;
        $contract->archived_at = $archivedAt;
        $contract->archive_expires_at = $archivedAt->copy()->addDays(self::ARCHIVE_RETENTION_DAYS);
        $contract->retention_delete_at = $contract->archive_expires_at;

        $contract->save();

        return back()->with('success', 'Contract / Permit moved to Archive successfully. Retention period is 90 days.');
    }

    /*
    |--------------------------------------------------------------------------
    | RESTORE
    |--------------------------------------------------------------------------
    */

    public function restore(Contract $contract): RedirectResponse
    {
        if (!$contract->archived) {
            return back()->with('error', 'This Contract / Permit is already active.');
        }

        $contract->archived = false;
        $contract->archived_at = null;
        $contract->archive_expires_at = null;
        $contract->retention_delete_at = null;
        $contract->status = $this->calculateStatus($contract);

        $contract->save();

        return back()->with('success', 'Contract / Permit restored successfully.');
    }

    /*
    |--------------------------------------------------------------------------
    | PERMANENT DELETE
    |--------------------------------------------------------------------------
    */

    public function destroy(Contract $contract): RedirectResponse
    {
        if (!$contract->archived) {
            return back()->with('error', 'Only archived Contract / Permit records can be permanently deleted.');
        }

        $contract->load('files');

        foreach ($contract->files as $file) {
            if ($file->file_path) {
                Storage::disk('public')->delete($file->file_path);
            }
        }

        if ($contract->contract_file_path) {
            Storage::disk('public')->delete($contract->contract_file_path);
        }

        if ($contract->signed_contract_path) {
            Storage::disk('public')->delete($contract->signed_contract_path);
        }

        $contract->forceDelete();

        return back()->with('success', 'Contract / Permit deleted permanently.');
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN NOTIFY (EMAIL)
    |--------------------------------------------------------------------------
    */

    public function notify(Request $request, Contract $contract): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
        ]);

        $recipient = $validated['email'] ?? $contract->email;
        $recipient = trim((string) $recipient);

        if ($recipient === '' || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            return back()->with('error', 'No valid client email address is available for this Contract / Permit.');
        }

        try {
            Mail::raw($validated['message'], function ($mail) use ($recipient, $validated) {
                $mail->to($recipient)->subject($validated['subject']);
            });
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', 'The Contract / Permit email could not be sent.');
        }

        return back()->with('success', 'Contract / Permit update email sent successfully to ' . $recipient . '.');
    }

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD CONTRACT FILE
    |--------------------------------------------------------------------------
    */

    public function downloadContract(Contract $contract): StreamedResponse
    {
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
    | DOWNLOAD SIGNED CONTRACT FILE
    |--------------------------------------------------------------------------
    */

    public function downloadSignedContract(Contract $contract): StreamedResponse
    {
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
    | STREAM DOWNLOAD
    |--------------------------------------------------------------------------
    */

    protected function streamDownload(string $path, ?string $originalName = null, ?string $fallbackName = null): StreamedResponse
    {
        $cleanPath = ltrim($path, '/');
        $cleanPath = preg_replace('#^storage/#i', '', $cleanPath);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        if (!$disk->exists($cleanPath)) {
            abort(404, 'File does not exist on the server.');
        }

        $fileName = $originalName ?: $fallbackName ?: basename($cleanPath);

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
    | STATUS CALCULATION
    |--------------------------------------------------------------------------
    */

    private function calculateStatus(Contract $contract): string
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
        $endDate = Carbon::parse($contract->end_date)->startOfDay();

        if ($endDate->lt($today)) {
            return 'Expired';
        }

        $daysUntilExpiry = $today->diffInDays($endDate, false);

        if ($daysUntilExpiry <= 30) {
            return 'Expiring Soon';
        }

        return 'Active';
    }

    /*
    |--------------------------------------------------------------------------
    | FILE URL
    |--------------------------------------------------------------------------
    */

    private function fileUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        return asset('storage/' . ltrim($path, '/'));
    }
}
