<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Compliance extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'compliances';

    protected $fillable = [
        'title',
        'type',
        'status',
        'assigned_to',
        'due_date',
        'expiry_date',
        'description',
        'created_by',
        'regulatory_body',
        'reference_number',
        'priority',
        'progress_percentage',
        'completed_at',
        'monitoring_status',
        'last_reviewed_at',
        'reviewed_by',
        'notify_days_before',
        'reminder_sent_at',
        'archived_at',
        'archived_by',
        // ✅ IDAGDAG ANG FILE FIELDS
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
    ];

    protected $casts = [
        'due_date' => 'date',
        'expiry_date' => 'date',
        'completed_at' => 'datetime',
        'last_reviewed_at' => 'datetime',
        'archived_at' => 'datetime',
        'deleted_at' => 'datetime',
        'progress_percentage' => 'integer',
        'notify_days_before' => 'integer',
        'reminder_sent_at' => 'datetime',
        'file_size' => 'integer', // ✅ IDAGDAG ITO
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONSHIPS
    |--------------------------------------------------------------------------
    */

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function archiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    /*
    |--------------------------------------------------------------------------
    | CHECKERS
    |--------------------------------------------------------------------------
    */

    public function isForAllStaff(): bool
    {
        return is_null($this->assigned_to);
    }

    public function isAssignedTo(int $userId): bool
    {
        return !is_null($this->assigned_to) && (int) $this->assigned_to === $userId;
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESSORS (FILE)
    |--------------------------------------------------------------------------
    */

    /**
     * Get the full URL for the attached file.
     */
    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        return asset('storage/' . ltrim($this->file_path, '/'));
    }

    /**
     * Get the formatted file size.
     */
    public function getFormattedFileSizeAttribute(): ?string
    {
        if (!$this->file_size || $this->file_size <= 0) {
            return null;
        }

        $units = ['Bytes', 'KB', 'MB', 'GB'];
        $size = $this->file_size;
        $index = 0;

        while ($size >= 1024 && $index < count($units) - 1) {
            $size /= 1024;
            $index++;
        }

        return number_format($size, $index === 0 ? 0 : 1) . ' ' . $units[$index];
    }

    /**
     * Get the priority label with emoji.
     */
    public function getPriorityLabelAttribute(): string
    {
        return match ($this->priority) {
            'High' => '🔴 High',
            'Low' => '🟢 Low',
            default => '🟡 Medium',
        };
    }
}
