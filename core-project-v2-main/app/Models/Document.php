<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    /*
    |--------------------------------------------------------------------------
    | TABLE
    |--------------------------------------------------------------------------
    */

    protected $table = 'documents';

    /*
    |--------------------------------------------------------------------------
    | MASS ASSIGNMENT
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'title',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'type',
        'description',
        'status',

        'uploaded_by',
        'assigned_to',

        'document_type',
        'is_locked',
        'granted_staff_ids',

        // ========== DOCUMENT LIFECYCLE ==========
        'expiry_date',
        'retention_period',
        'retention_start_date',
        'archived_at',
        'archived_by',

        // ========== REGULATORY COMPLIANCE ==========
        'regulatory_body',
        'reference_number',
        'review_date',
        'compliance_status',
    ];

    /*
    |--------------------------------------------------------------------------
    | CASTS
    |--------------------------------------------------------------------------
    */

    protected $casts = [
        'file_size' => 'integer',
        'uploaded_by' => 'integer',
        'assigned_to' => 'integer',

        'is_locked' => 'boolean',
        'granted_staff_ids' => 'array',

        'created_at' => 'datetime',
        'updated_at' => 'datetime',

        // ========== LIFECYCLE CASTS ==========
        'expiry_date' => 'date',
        'retention_start_date' => 'date',
        'archived_at' => 'datetime',
        'review_date' => 'date',
        'deleted_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | APPENDED ATTRIBUTES
    |--------------------------------------------------------------------------
    */

    protected $appends = [
        'file_url',
        'download_url',
        'file_exists',
        'formatted_file_size',

        // ========== LIFECYCLE APPENDS ==========
        'is_expired',
        'is_expiring_soon',
        'days_until_expiry',
        'retention_date',
        'is_retention_due',
        'compliance_status_badge',
        'can_be_archived',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function archiver()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function accessRequests()
    {
        return $this->hasMany(DocumentAccessRequest::class);
    }

    public function pendingAccessRequests()
    {
        return $this->hasMany(DocumentAccessRequest::class)
            ->where('status', 'pending');
    }

    /*
    |--------------------------------------------------------------------------
    | ========== ATTACHMENTS (MULTI-FILE UPLOAD) ==========
    |--------------------------------------------------------------------------
    |
    | Lahat ng file na na-upload para sa document na ito. Walang limit
    | sa bilang ng attachments.
    |
    */

    public function attachments()
    {
        return $this->hasMany(DocumentAttachment::class)->orderBy('id');
    }

    /**
     * Primary attachment (yung unang file / main file).
     */
    public function primaryAttachment()
    {
        return $this->hasOne(DocumentAttachment::class)
            ->where('is_primary', true);
    }

    /*
    |--------------------------------------------------------------------------
    | ========== FILE URL (PRIMARY) ==========
    |--------------------------------------------------------------------------
    */

    public function getFileUrlAttribute()
    {
        if (empty($this->file_path)) {
            return null;
        }

        if ($this->exists && $this->id) {
            return route('documents.view', ['document' => $this->id]);
        }

        return asset('storage/' . ltrim($this->file_path, '/'));
    }

    public function getDownloadUrlAttribute()
    {
        if (empty($this->file_path) || !$this->exists || !$this->id) {
            return null;
        }

        return route('documents.download', ['document' => $this->id]);
    }

    public function getFileExistsAttribute(): bool
    {
        return $this->fileExists();
    }

    /*
    |--------------------------------------------------------------------------
    | ========== FORMATTED FILE SIZE (PRIMARY) ==========
    |--------------------------------------------------------------------------
    */

    public function getFormattedFileSizeAttribute()
    {
        $bytes = (int) ($this->file_size ?? 0);

        if ($bytes <= 0) {
            return '0 KB';
        }

        if ($bytes < 1024) {
            return $bytes . ' B';
        }

        if ($bytes < 1024 * 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }

        if ($bytes < 1024 * 1024 * 1024) {
            return number_format($bytes / (1024 * 1024), 2) . ' MB';
        }

        return number_format($bytes / (1024 * 1024 * 1024), 2) . ' GB';
    }

    /*
    |--------------------------------------------------------------------------
    | ========== EXPIRATION ATTRIBUTES ==========
    |--------------------------------------------------------------------------
    */

    public function getIsExpiredAttribute(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }

        return Carbon::parse($this->expiry_date)->isPast();
    }

    public function getIsExpiringSoonAttribute(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }

        $days = Carbon::now()->diffInDays(Carbon::parse($this->expiry_date), false);

        return $days > 0 && $days <= 30;
    }

    public function getDaysUntilExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }

        $days = Carbon::now()->diffInDays(Carbon::parse($this->expiry_date), false);

        return (int) $days;
    }

    /*
    |--------------------------------------------------------------------------
    | ========== RETENTION ATTRIBUTES ==========
    |--------------------------------------------------------------------------
    */

    public function getRetentionDateAttribute(): ?string
    {
        if (!$this->retention_period || !$this->retention_start_date) {
            return null;
        }

        if ($this->retention_period === 'permanent') {
            return 'Permanent';
        }

        $start = Carbon::parse($this->retention_start_date);

        switch ($this->retention_period) {
            case '1 year':
                return $start->addYear()->toDateString();
            case '3 years':
                return $start->addYears(3)->toDateString();
            case '5 years':
                return $start->addYears(5)->toDateString();
            case '10 years':
                return $start->addYears(10)->toDateString();
            default:
                return null;
        }
    }

    public function getIsRetentionDueAttribute(): bool
    {
        $retentionDate = $this->retention_date;

        if (!$retentionDate || $retentionDate === 'Permanent') {
            return false;
        }

        return Carbon::parse($retentionDate)->isPast();
    }

    public function getCanBeArchivedAttribute(): bool
    {
        return !$this->isArchived() && (
            $this->is_expired ||
            $this->is_retention_due ||
            $this->status === 'Archived'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ========== COMPLIANCE STATUS BADGE ==========
    |--------------------------------------------------------------------------
    */

    public function getComplianceStatusBadgeAttribute(): string
    {
        if ($this->is_expired) {
            return 'Expired';
        }

        if ($this->is_expiring_soon) {
            return 'Expiring Soon';
        }

        if ($this->isArchived()) {
            return 'Archived';
        }

        return $this->compliance_status ?? 'Compliant';
    }

    /*
    |--------------------------------------------------------------------------
    | ========== SCOPES ==========
    |--------------------------------------------------------------------------
    */

    public function scopeExpired($query)
    {
        return $query->whereDate('expiry_date', '<', Carbon::today());
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query
            ->whereDate('expiry_date', '>=', Carbon::today())
            ->whereDate('expiry_date', '<=', Carbon::today()->addDays($days));
    }

    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }

    public function scopeClientDocuments($query)
    {
        return $query->where('document_type', 'client');
    }

    public function scopeCompanyDocuments($query)
    {
        return $query->where('document_type', 'company');
    }

    public function scopeLocked($query)
    {
        return $query->where('is_locked', true);
    }

    public function scopeUnlocked($query)
    {
        return $query->where('is_locked', false);
    }

    public function scopeAssignedTo($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->whereNull('assigned_to')
                ->orWhere('assigned_to', $userId);
        });
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /*
    |--------------------------------------------------------------------------
    | ========== RETENTION DUE SCOPE (PostgreSQL Compatible) ==========
    |--------------------------------------------------------------------------
    */

    public function scopeRetentionDue($query)
    {
        return $query->whereNotNull('retention_period')
            ->whereNotNull('retention_start_date')
            ->where('retention_period', '!=', 'permanent')
            ->whereRaw("
                (retention_start_date +
                    CASE retention_period
                        WHEN '1 year' THEN INTERVAL '1 year'
                        WHEN '3 years' THEN INTERVAL '3 years'
                        WHEN '5 years' THEN INTERVAL '5 years'
                        WHEN '10 years' THEN INTERVAL '10 years'
                    END
                ) <= ?
            ", [Carbon::today()]);
    }

    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('title', 'LIKE', "%{$search}%")
                ->orWhere('file_name', 'LIKE', "%{$search}%")
                ->orWhere('description', 'LIKE', "%{$search}%")
                ->orWhere('type', 'LIKE', "%{$search}%")
                ->orWhere('regulatory_body', 'LIKE', "%{$search}%")
                ->orWhere('reference_number', 'LIKE', "%{$search}%");
        });
    }

    /*
    |--------------------------------------------------------------------------
    | ========== ASSIGNMENT HELPERS ==========
    |--------------------------------------------------------------------------
    */

    public function isForAllStaff(): bool
    {
        return is_null($this->assigned_to);
    }

    public function isAssignedTo(int $userId): bool
    {
        return !is_null($this->assigned_to)
            && (int) $this->assigned_to === $userId;
    }

    /*
    |--------------------------------------------------------------------------
    | ========== DOCUMENT TYPE HELPERS ==========
    |--------------------------------------------------------------------------
    */

    public function isClientDocument(): bool
    {
        return $this->document_type === 'client';
    }

    public function isCompanyDocument(): bool
    {
        return $this->document_type === 'company';
    }

    /*
    |--------------------------------------------------------------------------
    | ========== LOCK HELPERS ==========
    |--------------------------------------------------------------------------
    */

    public function isLocked(): bool
    {
        return (bool) $this->is_locked;
    }

    /*
    |--------------------------------------------------------------------------
    | ========== ARCHIVE HELPERS ==========
    |--------------------------------------------------------------------------
    */

    public function isArchived(): bool
    {
        return !is_null($this->archived_at);
    }

    public function archive(int $userId): void
    {
        $this->status = 'Archived';
        $this->archived_at = Carbon::now();
        $this->archived_by = $userId;
        $this->save();
    }

    public function restoreFromArchive(): void
    {
        $this->status = 'Active';
        $this->archived_at = null;
        $this->archived_by = null;
        $this->save();
    }

    /*
    |--------------------------------------------------------------------------
    | ========== NORMALIZE GRANTED STAFF IDS ==========
    |--------------------------------------------------------------------------
    */

    public function getGrantedStaffIds(): array
    {
        $ids = $this->granted_staff_ids ?? [];

        if (!is_array($ids)) {
            return [];
        }

        return array_values(
            array_unique(
                array_map('intval', $ids)
            )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ========== CHECK USER ACCESS ==========
    |--------------------------------------------------------------------------
    */

    public function canBeAccessedBy(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        // ============================================================
        // ADMIN
        // ============================================================

        if ($user->role === 'admin') {
            return true;
        }

        // ============================================================
        // ONLY STAFF CAN ACCESS STAFF DOCUMENTS
        // ============================================================

        if ($user->role !== 'staff') {
            return false;
        }

        // ============================================================
        // COMPANY DOCUMENT
        // ============================================================

        if ($this->isCompanyDocument()) {

            // Unlocked company document = available to all staff
            if (!$this->isLocked()) {
                return true;
            }

            // Locked company document = only explicitly granted staff
            return $this->userHasPermission((int) $user->id);
        }

        // ============================================================
        // CLIENT DOCUMENT
        // ============================================================

        if ($this->isClientDocument()) {

            // No assigned staff = available to all staff
            if ($this->isForAllStaff()) {
                return true;
            }

            // Assigned staff = only that staff member
            return $this->isAssignedTo((int) $user->id);
        }

        // ============================================================
        // OTHER DOCUMENT TYPES
        // ============================================================

        if ($this->isForAllStaff()) {
            return true;
        }

        return $this->isAssignedTo((int) $user->id);
    }

    /*
    |--------------------------------------------------------------------------
    | ========== CHECK COMPANY DOCUMENT PERMISSION ==========
    |--------------------------------------------------------------------------
    */

    public function userHasPermission(int $userId): bool
    {
        // Non-company documents do not require company permission
        if (!$this->isCompanyDocument()) {
            return true;
        }

        // Unlocked company documents are available to all staff
        if (!$this->isLocked()) {
            return true;
        }

        // Locked company documents require explicit permission
        return in_array($userId, $this->getGrantedStaffIds(), true);
    }

    /*
    |--------------------------------------------------------------------------
    | ========== GRANT PERMISSION ==========
    |--------------------------------------------------------------------------
    */

    public function grantPermission(int $userId): void
    {
        if (!$this->isCompanyDocument()) {
            return;
        }

        $grantedIds = $this->getGrantedStaffIds();

        if (!in_array($userId, $grantedIds, true)) {
            $grantedIds[] = $userId;

            $this->granted_staff_ids = array_values(
                array_unique(
                    array_map('intval', $grantedIds)
                )
            );

            $this->save();
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ========== REVOKE PERMISSION ==========
    |--------------------------------------------------------------------------
    */

    public function revokePermission(int $userId): void
    {
        if (!$this->isCompanyDocument()) {
            return;
        }

        $grantedIds = $this->getGrantedStaffIds();

        $grantedIds = array_values(
            array_filter(
                $grantedIds,
                fn($id) => (int) $id !== (int) $userId
            )
        );

        $this->granted_staff_ids = $grantedIds;

        $this->save();
    }

    /*
    |--------------------------------------------------------------------------
    | ========== FILE HELPERS ==========
    |--------------------------------------------------------------------------
    */

    public function getResolvedFilePath(): ?string
    {
        if (empty($this->file_path)) {
            return null;
        }

        $raw = $this->file_path;

        if (file_exists($raw) && is_file($raw)) {
            return $raw;
        }

        $clean = ltrim($raw, '/\\');
        $clean = preg_replace('#^(public/|storage/)#i', '', $clean);

        $candidates = [
            Storage::disk('public')->path($raw),
            Storage::disk('public')->path($clean),
            storage_path('app/public/' . $clean),
            storage_path('app/' . $clean),
            storage_path('app/private/' . $clean),
            public_path('storage/' . $clean),
            public_path($clean),
            storage_path('app/public/documents/' . basename($clean)),
            public_path('documents/' . basename($clean)),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate && file_exists($candidate) && is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    public function fileExists(): bool
    {
        return $this->getResolvedFilePath() !== null;
    }

    public function getFileSizeInBytes(): int
    {
        return (int) ($this->file_size ?? 0);
    }

    public function getFileExtension(): ?string
    {
        if (empty($this->file_name)) {
            return null;
        }

        return pathinfo($this->file_name, PATHINFO_EXTENSION);
    }

    /*
    |--------------------------------------------------------------------------
    | ========== COMPLIANCE SUMMARY ==========
    |--------------------------------------------------------------------------
    */

    public function getComplianceSummary(): array
    {
        return [
            'status' => $this->compliance_status_badge,
            'is_expired' => $this->is_expired,
            'is_expiring_soon' => $this->is_expiring_soon,
            'days_until_expiry' => $this->days_until_expiry,
            'retention_date' => $this->retention_date,
            'is_retention_due' => $this->is_retention_due,
            'can_be_archived' => $this->can_be_archived,
            'regulatory_body' => $this->regulatory_body,
            'reference_number' => $this->reference_number,
            'review_date' => $this->review_date ? Carbon::parse($this->review_date)->toDateString() : null,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | ========== ACCESS REQUEST HELPERS ==========
    |--------------------------------------------------------------------------
    */

    public function hasPendingAccessRequestFrom(int $userId): bool
    {
        return $this->pendingAccessRequests()
            ->where('staff_id', $userId)
            ->exists();
    }

    public function hasAccessRequestFrom(int $userId): bool
    {
        return $this->accessRequests()
            ->where('staff_id', $userId)
            ->exists();
    }

    public function getAccessRequestStatus(int $userId): ?string
    {
        $request = $this->accessRequests()
            ->where('staff_id', $userId)
            ->first();

        return $request ? $request->status : null;
    }

    /*
    |--------------------------------------------------------------------------
    | ========== ATTACHMENT HELPERS (MULTI-FILE) ==========
    |--------------------------------------------------------------------------
    */

    /**
     * Total number of attachments.
     */
    public function getAttachmentCountAttribute(): int
    {
        return $this->attachments()->count();
    }

    /**
     * Delete all attachment files from storage (called before document delete).
     */
    public function deleteAllAttachmentFiles(): void
    {
        foreach ($this->attachments as $attachment) {
            if (
                $attachment->file_path &&
                Storage::disk('public')->exists($attachment->file_path)
            ) {
                Storage::disk('public')->delete($attachment->file_path);
            }
        }
    }

    /**
     * Sync the primary file_path/file_size/mime_type from the primary attachment.
     * Useful kung nag-reorder ka ng attachments.
     */
    public function syncPrimaryFileFromAttachment(): void
    {
        $primary = $this->attachments()
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->first();

        if ($primary) {
            $this->file_name = $primary->file_name;
            $this->file_path = $primary->file_path;
            $this->file_size = $primary->file_size;
            $this->mime_type = $primary->mime_type;
            $this->save();
        }
    }

    /*
    |--------------------------------------------------------------------------
    | ========== AUTOMATIC ARCHIVE COMMAND ==========
    |--------------------------------------------------------------------------
    |
    | This can be called from a scheduled command:
    | php artisan documents:auto-archive
    |
    */

    public static function autoArchiveRetentionDue(): int
    {
        $count = 0;

        $documents = self::retentionDue()
            ->whereNull('archived_at')
            ->get();

        foreach ($documents as $document) {
            $systemUserId = 1;

            $document->archive($systemUserId);
            $count++;
        }

        return $count;
    }

    public static function autoArchiveExpired(): int
    {
        $count = 0;

        $documents = self::expired()
            ->whereNull('archived_at')
            ->get();

        foreach ($documents as $document) {
            $systemUserId = 1;
            $document->archive($systemUserId);
            $count++;
        }

        return $count;
    }

    /*
    |--------------------------------------------------------------------------
    | ========== BOOT — CLEAN UP FILES ON DELETE ==========
    |--------------------------------------------------------------------------
    |
    | Kapag na-delete ang document (soft delete OR force delete),
    | siguraduhing nalilinis yung attachments.
    |
    */

    protected static function booted(): void
    {
        static::deleting(function (Document $document) {
            // Only hard-delete attachment files (not soft delete)
            if ($document->isForceDeleting()) {
                $document->deleteAllAttachmentFiles();
                $document->attachments()->delete();
            }
        });
    }
}
