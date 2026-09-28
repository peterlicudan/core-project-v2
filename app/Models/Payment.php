<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'invoice_id',

        'receipt_number',
        'receipt',

        'client',
        'client_email', // ✅ ADDED
        'invoice_number',

        'payment_method',
        'amount',
        'status',

        'payment_date',
        'partial_date',
        'due_date',

        'notes',

        /*
        |--------------------------------------------------------------------------
        | ARCHIVE
        |--------------------------------------------------------------------------
        */

        'archived',
        'archived_at',
        'archive_expires_at',
        'delete_after',

        /*
        |--------------------------------------------------------------------------
        | AUDIT
        |--------------------------------------------------------------------------
        */

        'edited_by',
        'edited_at',
        'updated_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',

        'payment_date' => 'date:Y-m-d',
        'partial_date' => 'date:Y-m-d',
        'due_date' => 'date:Y-m-d',

        /*
        |--------------------------------------------------------------------------
        | ARCHIVE
        |--------------------------------------------------------------------------
        */

        'archived' => 'boolean',
        'archived_at' => 'datetime',
        'archive_expires_at' => 'datetime',
        'delete_after' => 'datetime',

        /*
        |--------------------------------------------------------------------------
        | AUDIT
        |--------------------------------------------------------------------------
        */

        'edited_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | PAYMENT OWNER
    |--------------------------------------------------------------------------
    */

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'user_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LINKED INVOICE
    |--------------------------------------------------------------------------
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
    | ADMIN / USER WHO EDITED PAYMENT
    |--------------------------------------------------------------------------
    */

    public function editor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'edited_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | USER / ADMIN WHO LAST UPDATED PAYMENT
    |--------------------------------------------------------------------------
    */

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ARCHIVE STATUS
    |--------------------------------------------------------------------------
    */

    public function isArchived(): bool
    {
        return (bool) $this->archived;
    }

    /*
    |--------------------------------------------------------------------------
    | PARTIAL PAYMENT
    |--------------------------------------------------------------------------
    */

    public function isPartial(): bool
    {
        return strtolower(
            trim(
                (string) $this->status
            )
        ) === 'partial';
    }

    /*
    |--------------------------------------------------------------------------
    | FULLY PAID
    |--------------------------------------------------------------------------
    */

    public function isPaid(): bool
    {
        return strtolower(
            trim(
                (string) $this->status
            )
        ) === 'paid';
    }

    /*
    |--------------------------------------------------------------------------
    | 90-DAY ARCHIVE EXPIRATION
    |--------------------------------------------------------------------------
    */

    public function isArchiveExpired(): bool
    {
        if (!$this->archived) {
            return false;
        }

        if (!$this->archive_expires_at) {
            return false;
        }

        return now()->greaterThanOrEqualTo(
            $this->archive_expires_at
        );
    }

    /*
    |--------------------------------------------------------------------------
    | 1-YEAR PERMANENT DELETION
    |--------------------------------------------------------------------------
    */

    public function isReadyForDeletion(): bool
    {
        if (!$this->archived) {
            return false;
        }

        if (!$this->delete_after) {
            return false;
        }

        return now()->greaterThanOrEqualTo(
            $this->delete_after
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ARCHIVE PAYMENT
    |--------------------------------------------------------------------------
    */

    public function archivePayment(): void
    {
        $archivedAt = now();

        $this->update([
            'archived' => true,

            'archived_at' => $archivedAt,

            'archive_expires_at' =>
                $archivedAt->copy()->addDays(90),

            'delete_after' =>
                $archivedAt->copy()->addYear(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | RESTORE PAYMENT
    |--------------------------------------------------------------------------
    */

    public function unarchivePayment(): void
    {
        $this->update([
            'archived' => false,
            'archived_at' => null,
            'archive_expires_at' => null,
            'delete_after' => null,
        ]);
    }
}
