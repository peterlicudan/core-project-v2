<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JobOrder extends Model
{
    use HasFactory;

    protected $table = 'job_orders';

    protected $fillable = [
        'number',
        'user_id',
        'client',
        'client_email',
        'client_contact',
        'client_address',
        'project',
        'location',
        'equipment',
        'operator',
        'start_date',
        'end_date',
        'amount',
        'description',
        'notes',
        'status',
        'generated_at',
        'generated_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'generated_at' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | CREATED / ASSIGNED USER
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
    | USER WHO GENERATED / APPROVED THE JOB ORDER
    |--------------------------------------------------------------------------
    */

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'generated_by'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICE
    |--------------------------------------------------------------------------
    */

    public function invoice(): HasOne
    {
        return $this->hasOne(
            Invoice::class,
            'job_order_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CONTRACT
    |--------------------------------------------------------------------------
    */

    /**
     * Contract associated with this Job Order.
     *
     * A Contract is optional and does not depend on
     * Invoice approval or Payment.
     */
    public function contract(): HasOne
    {
        return $this->hasOne(
            Contract::class,
            'job_order_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | HELPER - INVOICE
    |--------------------------------------------------------------------------
    */

    public function hasInvoice(): bool
    {
        return $this->invoice()->exists();
    }

    /*
    |--------------------------------------------------------------------------
    | HELPER - CONTRACT
    |--------------------------------------------------------------------------
    */

    public function hasContract(): bool
    {
        return $this->contract()->exists();
    }
}
