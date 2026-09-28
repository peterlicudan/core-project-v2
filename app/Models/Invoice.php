<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany; // <-- BAGO ITO

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_order_id',
        'user_id',
        'number',
        'client',
        'project',
        'amount',
        'payment_method',
        'status',
        'due_date',
        'client_email',
        'client_address',
        'description',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
    ];

    /*
    |--------------------------------------------------------------------------
    | STAFF / USER
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
    | CONTRACT PERMIT (BAGO ITO)
    |--------------------------------------------------------------------------
    */

    /**
     * Get the contract/permits associated with this invoice.
     */
    public function contractPermits(): HasMany
    {
        return $this->hasMany(ContractPermit::class, 'invoice_id');
    }

    /**
     * Check if invoice is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if invoice already has a contract.
     */
    public function hasContract(): bool
    {
        return $this->contractPermits()->exists();
    }

    /**
     * Check if invoice can be used for contract.
     */
    public function canBeUsedForContract(): bool
    {
        return $this->isApproved() && !$this->hasContract();
    }
}
