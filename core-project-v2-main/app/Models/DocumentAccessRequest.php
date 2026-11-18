<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class DocumentAccessRequest extends Model
{
    use HasFactory, SoftDeletes;

    /*
    |--------------------------------------------------------------------------
    | TABLE
    |--------------------------------------------------------------------------
    */

    protected $table = 'document_access_requests';

    /*
    |--------------------------------------------------------------------------
    | CONSTANTS
    |--------------------------------------------------------------------------
    */

    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_REVOKED = 'revoked';

    const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_REVOKED,
    ];

    /*
    |--------------------------------------------------------------------------
    | MASS ASSIGNMENT
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'document_id',
        'staff_id',
        'status',
        'requested_at',
        'responded_at',
        'responded_by',
        'remarks',
    ];

    /*
    |--------------------------------------------------------------------------
    | CASTS
    |--------------------------------------------------------------------------
    */

    protected $casts = [
        'requested_at' => 'datetime',
        'responded_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | APPENDED ATTRIBUTES
    |--------------------------------------------------------------------------
    */

    protected $appends = [
        'is_pending',
        'is_processed',
        'status_badge',
        'status_color',
        'requested_at_formatted',
        'responded_at_formatted',
        'document_title',
        'document_file_name',
        'staff_name',
        'staff_email',
        'responder_name',
        'processing_time',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    /*
    |--------------------------------------------------------------------------
    | ========== COMPUTED ATTRIBUTES ==========
    |--------------------------------------------------------------------------
    */

    public function getIsPendingAttribute(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function getIsProcessedAttribute(): bool
    {
        return in_array($this->status, [
            self::STATUS_APPROVED,
            self::STATUS_REJECTED,
            self::STATUS_REVOKED,
        ]);
    }

    public function getStatusBadgeAttribute(): string
    {
        $badges = [
            self::STATUS_PENDING => 'Pending',
            self::STATUS_APPROVED => 'Approved',
            self::STATUS_REJECTED => 'Rejected',
            self::STATUS_REVOKED => 'Revoked',
        ];

        return $badges[$this->status] ?? ucfirst($this->status);
    }

    public function getStatusColorAttribute(): string
    {
        $colors = [
            self::STATUS_PENDING => 'yellow',
            self::STATUS_APPROVED => 'green',
            self::STATUS_REJECTED => 'red',
            self::STATUS_REVOKED => 'gray',
        ];

        return $colors[$this->status] ?? 'gray';
    }

    public function getRequestedAtFormattedAttribute(): string
    {
        return $this->requested_at
            ? $this->requested_at->format('M d, Y h:i A')
            : '—';
    }

    public function getRespondedAtFormattedAttribute(): string
    {
        return $this->responded_at
            ? $this->responded_at->format('M d, Y h:i A')
            : '—';
    }

    public function getDocumentTitleAttribute(): ?string
    {
        return $this->document?->title;
    }

    public function getDocumentFileNameAttribute(): ?string
    {
        return $this->document?->file_name;
    }

    public function getStaffNameAttribute(): ?string
    {
        return $this->staff?->name;
    }

    public function getStaffEmailAttribute(): ?string
    {
        return $this->staff?->email;
    }

    public function getResponderNameAttribute(): ?string
    {
        return $this->responder?->name;
    }

    public function getProcessingTimeAttribute(): ?string
    {
        if (!$this->requested_at || !$this->responded_at) {
            return null;
        }

        $diff = $this->requested_at->diff($this->responded_at);

        if ($diff->days > 0) {
            return $diff->days . ' day' . ($diff->days > 1 ? 's' : '');
        }

        if ($diff->h > 0) {
            return $diff->h . ' hour' . ($diff->h > 1 ? 's' : '');
        }

        if ($diff->i > 0) {
            return $diff->i . ' minute' . ($diff->i > 1 ? 's' : '');
        }

        return 'Less than a minute';
    }

    /*
    |--------------------------------------------------------------------------
    | ========== SCOPES ==========
    |--------------------------------------------------------------------------
    */

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    public function scopeRevoked($query)
    {
        return $query->where('status', self::STATUS_REVOKED);
    }

    public function scopeProcessed($query)
    {
        return $query->whereIn('status', [
            self::STATUS_APPROVED,
            self::STATUS_REJECTED,
            self::STATUS_REVOKED,
        ]);
    }

    public function scopeUnprocessed($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeForDocument($query, int $documentId)
    {
        return $query->where('document_id', $documentId);
    }

    public function scopeForStaff($query, int $staffId)
    {
        return $query->where('staff_id', $staffId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', Carbon::today());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('created_at', [
            Carbon::now()->startOfWeek(),
            Carbon::now()->endOfWeek(),
        ]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereBetween('created_at', [
            Carbon::now()->startOfMonth(),
            Carbon::now()->endOfMonth(),
        ]);
    }

    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->whereHas('document', function ($doc) use ($search) {
                $doc->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('file_name', 'LIKE', "%{$search}%");
            })->orWhereHas('staff', function ($staff) use ($search) {
                $staff->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%");
            })->orWhere('status', 'LIKE', "%{$search}%");
        });
    }

    /*
    |--------------------------------------------------------------------------
    | ========== HELPER METHODS ==========
    |--------------------------------------------------------------------------
    */

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isRevoked(): bool
    {
        return $this->status === self::STATUS_REVOKED;
    }

    public function isProcessed(): bool
    {
        return $this->isApproved() || $this->isRejected() || $this->isRevoked();
    }

    public function canBeProcessed(): bool
    {
        return $this->isPending();
    }

    public function canBeApproved(): bool
    {
        return $this->isPending();
    }

    public function canBeRejected(): bool
    {
        return $this->isPending();
    }

    public function canBeRevoked(): bool
    {
        return $this->isApproved();
    }

    /*
    |--------------------------------------------------------------------------
    | ========== ACTION METHODS ==========
    |--------------------------------------------------------------------------
    */

    /**
     * Approve the access request
     *
     * @param int $responderId
     * @param string|null $remarks
     * @throws \Exception
     */
    public function approve(int $responderId, ?string $remarks = null): void
    {
        if (!$this->canBeApproved()) {
            throw new \Exception('This request cannot be approved because it is not pending.');
        }

        $this->status = self::STATUS_APPROVED;
        $this->responded_at = Carbon::now();
        $this->responded_by = $responderId;
        $this->remarks = $remarks ?? $this->remarks;

        $this->save();

        // Automatically grant permission to the staff
        $this->document->grantPermission($this->staff_id);
    }

    /**
     * Reject the access request
     *
     * @param int $responderId
     * @param string|null $remarks
     * @throws \Exception
     */
    public function reject(int $responderId, ?string $remarks = null): void
    {
        if (!$this->canBeRejected()) {
            throw new \Exception('This request cannot be rejected because it is not pending.');
        }

        $this->status = self::STATUS_REJECTED;
        $this->responded_at = Carbon::now();
        $this->responded_by = $responderId;
        $this->remarks = $remarks ?? $this->remarks;

        $this->save();
    }

    /**
     * Revoke an approved access request
     *
     * @param int $responderId
     * @param string|null $remarks
     * @throws \Exception
     */
    public function revoke(int $responderId, ?string $remarks = null): void
    {
        if (!$this->canBeRevoked()) {
            throw new \Exception('This request cannot be revoked because it is not approved.');
        }

        $this->status = self::STATUS_REVOKED;
        $this->responded_at = Carbon::now();
        $this->responded_by = $responderId;
        $this->remarks = $remarks ?? $this->remarks;

        $this->save();

        // Revoke permission from the staff
        $this->document->revokePermission($this->staff_id);
    }

    /*
    |--------------------------------------------------------------------------
    | ========== FACTORY METHOD ==========
    |--------------------------------------------------------------------------
    */

    /**
     * Create a new access request
     *
     * @param int $documentId
     * @param int $staffId
     * @return self
     */
    public static function createRequest(int $documentId, int $staffId): self
    {
        return self::create([
            'document_id' => $documentId,
            'staff_id' => $staffId,
            'status' => self::STATUS_PENDING,
            'requested_at' => Carbon::now(),
        ]);
    }

    /**
     * Check if a staff member already has a pending request for a document
     *
     * @param int $documentId
     * @param int $staffId
     * @return bool
     */
    public static function hasPendingRequest(int $documentId, int $staffId): bool
    {
        return self::forDocument($documentId)
            ->forStaff($staffId)
            ->pending()
            ->exists();
    }

    /**
     * Get the pending request for a staff member and document
     *
     * @param int $documentId
     * @param int $staffId
     * @return self|null
     */
    public static function getPendingRequest(int $documentId, int $staffId): ?self
    {
        return self::forDocument($documentId)
            ->forStaff($staffId)
            ->pending()
            ->first();
    }

    /*
    |--------------------------------------------------------------------------
    | ========== STATISTICS ==========
    |--------------------------------------------------------------------------
    */

    /**
     * Get statistics for all access requests
     *
     * @return array
     */
    public static function getStatistics(): array
    {
        return [
            'total' => self::count(),
            'pending' => self::pending()->count(),
            'approved' => self::approved()->count(),
            'rejected' => self::rejected()->count(),
            'revoked' => self::revoked()->count(),
            'processed' => self::processed()->count(),
            'today' => self::today()->count(),
            'this_week' => self::thisWeek()->count(),
            'this_month' => self::thisMonth()->count(),
        ];
    }

    /**
     * Get statistics for a specific document
     *
     * @param int $documentId
     * @return array
     */
    public static function getStatisticsForDocument(int $documentId): array
    {
        return [
            'total' => self::forDocument($documentId)->count(),
            'pending' => self::forDocument($documentId)->pending()->count(),
            'approved' => self::forDocument($documentId)->approved()->count(),
            'rejected' => self::forDocument($documentId)->rejected()->count(),
            'revoked' => self::forDocument($documentId)->revoked()->count(),
        ];
    }

    /**
     * Get statistics for a specific staff member
     *
     * @param int $staffId
     * @return array
     */
    public static function getStatisticsForStaff(int $staffId): array
    {
        return [
            'total' => self::forStaff($staffId)->count(),
            'pending' => self::forStaff($staffId)->pending()->count(),
            'approved' => self::forStaff($staffId)->approved()->count(),
            'rejected' => self::forStaff($staffId)->rejected()->count(),
            'revoked' => self::forStaff($staffId)->revoked()->count(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | ========== QUERY HELPERS ==========
    |--------------------------------------------------------------------------
    */

    /**
     * Get all pending requests with eager loading
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getPendingRequestsWithDetails()
    {
        return self::with(['document', 'staff', 'responder'])
            ->pending()
            ->orderBy('created_at', 'asc')
            ->get();
    }

    /**
     * Get all requests for a document with eager loading
     *
     * @param int $documentId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getRequestsForDocument(int $documentId)
    {
        return self::with(['staff', 'responder'])
            ->forDocument($documentId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get all requests for a staff member with eager loading
     *
     * @param int $staffId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getRequestsForStaff(int $staffId)
    {
        return self::with(['document', 'responder'])
            ->forStaff($staffId)
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
