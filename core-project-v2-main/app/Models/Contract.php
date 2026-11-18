<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use SoftDeletes;

    protected $fillable = [
        /*
        |--------------------------------------------------------------------------
        | BASIC INFORMATION
        |--------------------------------------------------------------------------
        */
        'contract_no',
        'job_order_id',
        'client',
        'email',
        'invoice',
        'invoice_id',
        'project',
        'location',

        /*
        |--------------------------------------------------------------------------
        | CONTRACT / PERMIT INFORMATION
        |--------------------------------------------------------------------------
        */
        'type',
        'contract_type',
        'equipment',

        /*
        |--------------------------------------------------------------------------
        | DATES
        |--------------------------------------------------------------------------
        */
        'start_date',
        'end_date',

        /*
        |--------------------------------------------------------------------------
        | STATUS
        |--------------------------------------------------------------------------
        */
        'status',
        'workflow_status',

        /*
        |--------------------------------------------------------------------------
        | INVOICE APPROVAL
        |--------------------------------------------------------------------------
        */
        'is_invoice_approved',
        'invoice_approved_at',
        'invoice_approved_by',

        /*
        |--------------------------------------------------------------------------
        | DOCUMENT INFORMATION
        |--------------------------------------------------------------------------
        */
        'documents',
        'description',
        'rejection_reason',

        /*
        |--------------------------------------------------------------------------
        | ORIGINAL CONTRACT FILE (LEGACY — single file)
        |--------------------------------------------------------------------------
        */
        'contract_file_path',
        'contract_file_name',

        /*
        |--------------------------------------------------------------------------
        | SIGNED CONTRACT FILE (LEGACY — single file)
        |--------------------------------------------------------------------------
        */
        'signed_contract_path',
        'signed_contract_file_name',

        /*
        |--------------------------------------------------------------------------
        | CLIENT SENDING
        |--------------------------------------------------------------------------
        */
        'sent_at',

        /*
        |--------------------------------------------------------------------------
        | STAFF SUBMISSION
        |--------------------------------------------------------------------------
        */
        'submitted_at',
        'submitted_by',

        /*
        |--------------------------------------------------------------------------
        | ADMIN REVIEW
        |--------------------------------------------------------------------------
        */
        'reviewed_at',
        'reviewed_by',
        'approved_at',

        /*
        |--------------------------------------------------------------------------
        | ARCHIVE
        |--------------------------------------------------------------------------
        */
        'archived',
        'archived_at',
        'archive_expires_at',
        'retention_delete_at',

        /*
        |--------------------------------------------------------------------------
        | OWNERSHIP / ASSIGNMENT
        |--------------------------------------------------------------------------
        */
        'created_by',
        'assigned_to',
    ];

    protected $casts = [
        /*
        |--------------------------------------------------------------------------
        | DATES
        |--------------------------------------------------------------------------
        */
        'start_date' => 'date',
        'end_date' => 'date',

        /*
        |--------------------------------------------------------------------------
        | NUMBERS / BOOLEAN
        |--------------------------------------------------------------------------
        */
        'documents' => 'integer',
        'archived' => 'boolean',
        'is_invoice_approved' => 'boolean',

        /*
        |--------------------------------------------------------------------------
        | DATETIME
        |--------------------------------------------------------------------------
        */
        'invoice_approved_at' => 'datetime',

        'sent_at' => 'datetime',

        'submitted_at' => 'datetime',

        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',

        'archived_at' => 'datetime',
        'archive_expires_at' => 'datetime',
        'retention_delete_at' => 'datetime',

        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | JOB ORDER
    |--------------------------------------------------------------------------
    */

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(
            JobOrder::class,
            'job_order_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Admin Contract uses invoice_id.
    |
    */

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(
            Invoice::class,
            'invoice_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATOR
    |--------------------------------------------------------------------------
    */

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ASSIGNED STAFF
    |--------------------------------------------------------------------------
    */

    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'assigned_to'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE APPROVED BY
    |--------------------------------------------------------------------------
    */

    public function invoiceApprovedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'invoice_approved_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SUBMITTED BY
    |--------------------------------------------------------------------------
    */

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'submitted_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | REVIEWED BY
    |--------------------------------------------------------------------------
    */

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'reviewed_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ MULTI-FILE RELATIONSHIPS (NEW)
    |--------------------------------------------------------------------------
    */

    /**
     * All files attached to this contract (contract + signed).
     *
     * Used in: ContractPermitController (Staff + Admin)
     * Table: contract_files
     * Foreign key: contract_id
     */
    public function files(): HasMany
    {
        return $this->hasMany(ContractFile::class)
            ->orderBy('created_at');
    }

    /**
     * Only contract documents (type = 'contract').
     */
    public function contractFiles(): HasMany
    {
        return $this->hasMany(ContractFile::class)
            ->where('type', 'contract')
            ->orderBy('created_at');
    }

    /**
     * Only signed documents (type = 'signed').
     */
    public function signedFiles(): HasMany
    {
        return $this->hasMany(ContractFile::class)
            ->where('type', 'signed')
            ->orderBy('created_at');
    }

    /*
    |--------------------------------------------------------------------------
    | ACTIVE SCOPE
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->where('archived', false);
    }

    /*
    |--------------------------------------------------------------------------
    | ARCHIVED SCOPE
    |--------------------------------------------------------------------------
    */

    public function scopeArchived($query)
    {
        return $query->where('archived', true);
    }

    /*
    |--------------------------------------------------------------------------
    | RETENTION
    |--------------------------------------------------------------------------
    */

    public function scopeWithinRetention($query)
    {
        return $query
            ->where('archived', true)
            ->whereNotNull('archive_expires_at')
            ->where('archive_expires_at', '>', now());
    }

    public function scopeExpiredRetention($query)
    {
        return $query
            ->where('archived', true)
            ->whereNotNull('archive_expires_at')
            ->where('archive_expires_at', '<=', now());
    }

    /*
    |--------------------------------------------------------------------------
    | ARCHIVE CHECK
    |--------------------------------------------------------------------------
    */

    public function isArchived(): bool
    {
        return (bool) $this->archived;
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE APPROVAL CHECK
    |--------------------------------------------------------------------------
    */

    public function isInvoiceApproved(): bool
    {
        /*
        | First use the actual Invoice record if available.
        */
        if ($this->relationLoaded('invoice') && $this->invoice) {
            return in_array(
                strtolower(trim((string) $this->invoice->status)),
                [
                    'approved',
                    'paid',
                    'partial',
                ],
                true
            );
        }

        /*
        | Otherwise use the stored Contract flag.
        */
        return (bool) $this->is_invoice_approved;
    }

    /*
    |--------------------------------------------------------------------------
    | RETENTION CHECK
    |--------------------------------------------------------------------------
    */

    public function isWithinRetention(): bool
    {
        return $this->isArchived()
            && $this->archive_expires_at
            && $this->archive_expires_at->isFuture();
    }

    /*
    |--------------------------------------------------------------------------
    | RETENTION DAYS REMAINING
    |--------------------------------------------------------------------------
    */

    public function getRetentionDaysRemaining(): ?int
    {
        if (!$this->isWithinRetention()) {
            return null;
        }

        return (int) now()->diffInDays(
            $this->archive_expires_at,
            false
        );
    }
}
