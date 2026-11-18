<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractPermit extends Model
{
    use HasFactory;

    protected $table = 'contract_permits';

    protected $fillable = [
        // Basic Info
        'title',
        'name',
        'type',
        'contract_type',
        'description',
        'notes',

        // Client Info
        'client',
        'client_name',
        'client_email',
        'email',

        // Project Info
        'project',
        'project_name',
        'location',

        // Reference Numbers
        'contract_no',
        'contract_number',
        'reference_number',
        'permit_number',

        // Dates
        'start_date',
        'issue_date',
        'end_date',
        'expiry_date',

        // Status
        'status',

        // Invoice Connection
        'invoice_id',
        'is_invoice_approved',
        'invoice_approved_at',
        'invoice_approved_by',

        // Staff Assignment
        'assigned_to',

        // Files
        'file',
        'file_path',
        'document',
        'contract_file_path',
        'contract_file_name',
        'signed_contract_path',
        'signed_contract_file_name',
        'prepared_contract_url',
        'signed_contract_url',

        // Other
        'equipment',
        'documents',
        'rejection_reason',

        // Workflow
        'workflow_status',
        'workflowStatus',
        'sent_at',
        'submitted_at',
        'submitted_by',
        'reviewed_at',
        'reviewed_by',

        // Archive
        'archived',
        'is_archived',
        'isArchived',
        'archive_expires_at',
        'archiveExpiresAt',
        'retention_delete_at',

        // Days until expiry
        'days_until_expiry',
        'daysUntilExpiry',

        // Created by
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'issue_date' => 'date',
        'end_date' => 'date',
        'expiry_date' => 'date',
        'archived' => 'boolean',
        'is_archived' => 'boolean',
        'isArchived' => 'boolean',
        'is_invoice_approved' => 'boolean',
        'invoice_approved_at' => 'datetime',
        'sent_at' => 'datetime',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'days_until_expiry' => 'integer',
        'daysUntilExpiry' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    /**
     * Get the invoice associated with this contract/permit.
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    /**
     * Get the assigned staff.
     */
    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the creator of this record.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who approved the invoice.
     */
    public function invoiceApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invoice_approved_by');
    }

    /**
     * Get the user who submitted this record.
     */
    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /**
     * Get the user who reviewed this record.
     */
    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /*
    |--------------------------------------------------------------------------
    | SCOPES
    |--------------------------------------------------------------------------
    */

    /**
     * Scope for records with approved invoice.
     */
    public function scopeWithApprovedInvoice($query)
    {
        return $query->whereHas('invoice', function ($q) {
            $q->where('status', 'approved');
        });
    }

    /**
     * Scope for records without approved invoice.
     */
    public function scopeWithPendingInvoice($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('invoice_id')
              ->orWhereHas('invoice', function ($sub) {
                  $sub->where('status', '!=', 'approved');
              });
        });
    }

    /**
     * Scope for active records (not archived).
     */
    public function scopeActive($query)
    {
        return $query->where('archived', false)
                     ->where('is_archived', false)
                     ->where('isArchived', false);
    }

    /**
     * Scope for archived records.
     */
    public function scopeArchived($query)
    {
        return $query->where(function ($q) {
            $q->where('archived', true)
              ->orWhere('is_archived', true)
              ->orWhere('isArchived', true);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    /**
     * Check if the invoice is approved.
     */
    public function isInvoiceApproved(): bool
    {
        return $this->is_invoice_approved === true ||
               $this->is_invoice_approved === 1;
    }

    /**
     * Check if the record is archived.
     */
    public function isArchived(): bool
    {
        return $this->archived === true ||
               $this->archived === 1 ||
               $this->is_archived === true ||
               $this->is_archived === 1 ||
               $this->isArchived === true ||
               $this->isArchived === 1;
    }

    /**
     * Get the contract/permit number.
     */
    public function getNumber(): string
    {
        return $this->contract_number ??
               $this->reference_number ??
               $this->permit_number ??
               'CP-' . str_pad($this->id, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get the client name.
     */
    public function getClient(): string
    {
        return $this->client ??
               $this->client_name ??
               'No client assigned';
    }
}
