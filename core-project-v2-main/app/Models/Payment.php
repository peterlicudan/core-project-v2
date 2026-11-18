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
        'client_email',
        'invoice_number',
        /* ✅ REFERENCE — Billing No. (BILL-YYYY-NNN) */
        'billing_number',

        'payment_method',
        'amount',
        'status',

        'payment_date',
        'partial_date',
        'due_date',

        'notes',

        /*
        |--------------------------------------------------------------------------
        | USER-SIDE ARCHIVE (existing — hindi natin gagalawin)
        |--------------------------------------------------------------------------
        */

        'archived',
        'archived_at',
        'archive_expires_at',
        'delete_after',

        /*
        |--------------------------------------------------------------------------
        | ✅ ADMIN-SIDE ARCHIVE (BAGO)
        |--------------------------------------------------------------------------
        | Hiwalay sa user-side archive. Ito lang ang ginagamit ng admin.
        | Kapag nag-archive ang admin, `admin_archived = true` — HINDI
        | naapektuhan ang `archived` (user side).
        */

        'admin_archived',
        'admin_archived_at',

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
        | USER-SIDE ARCHIVE
        |--------------------------------------------------------------------------
        */

        'archived' => 'boolean',
        'archived_at' => 'datetime',
        'archive_expires_at' => 'datetime',
        'delete_after' => 'datetime',

        /*
        |--------------------------------------------------------------------------
        | ✅ ADMIN-SIDE ARCHIVE (BAGO)
        |--------------------------------------------------------------------------
        */

        'admin_archived' => 'boolean',
        'admin_archived_at' => 'datetime',

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
    | USER-SIDE ARCHIVE STATUS
    |--------------------------------------------------------------------------
    */

    public function isArchived(): bool
    {
        return (bool) $this->archived;
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ ADMIN-SIDE ARCHIVE STATUS (BAGO)
    |--------------------------------------------------------------------------
    */

    public function isAdminArchived(): bool
    {
        return (bool) $this->admin_archived;
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
    | 90-DAY ARCHIVE EXPIRATION (user-side)
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
    | 1-YEAR PERMANENT DELETION (user-side)
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
    | USER-SIDE ARCHIVE
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
    | USER-SIDE RESTORE
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

    /*
    |--------------------------------------------------------------------------
    | ✅ ADMIN-SIDE ARCHIVE (BAGO)
    |--------------------------------------------------------------------------
    | Hiwalay ito sa user-side archive. Gumagamit ng `admin_archived` column.
    */

    public function archiveForAdmin(): void
    {
        $this->update([
            'admin_archived' => true,
            'admin_archived_at' => now(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ✅ ADMIN-SIDE RESTORE (BAGO)
    |--------------------------------------------------------------------------
    */

    public function unarchiveForAdmin(): void
    {
        $this->update([
            'admin_archived' => false,
            'admin_archived_at' => null,
        ]);
    }
}
