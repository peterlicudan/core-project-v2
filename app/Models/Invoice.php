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
        'billing_number',
        'client',
        'project',
        'amount',
        'base_amount',
        'vat_rate',
        'vat_amount',
        'additional_charges',
        'payment_method',
        'status',
        'due_date',
        'client_email',
        'client_address',
        'description',
        'notes',
        'service_month',
        'billing_sequence',
        'verified_at',
        'verified_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'base_amount' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'additional_charges' => 'decimal:2',
        'due_date' => 'date',
        'billing_sequence' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',

        /*
        |----------------------------------------------------------------------
        | ✅ DATE TRACKING — dapat naka-cast bilang Carbon
        |----------------------------------------------------------------------
        |
        | Kung wala sa casts, mababasa ang raw string mula sa Postgres at
        | mag-e-error ang `->format()` (e.g. "Call to a member function
        | format() on string" sa AdminBillingController).
        |
        */

        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'sent_at' => 'datetime',
        'verified_at' => 'datetime',
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

    /*
    |--------------------------------------------------------------------------
    | BILLING BREAKDOWN
    |--------------------------------------------------------------------------
    */

    /**
     * Base amount = amount bago VAT + additional charges.
     * Para sa legacy invoices na walang base_amount, amount na lang ang base.
     */
    public function baseAmountValue(): float
    {
        return (float) ($this->base_amount > 0 ? $this->base_amount : $this->amount);
    }

    public function vatAmountValue(): float
    {
        return (float) ($this->vat_amount ?? 0);
    }

    public function additionalChargesValue(): float
    {
        return (float) ($this->additional_charges ?? 0);
    }

    public function hasVat(): bool
    {
        return $this->vatAmountValue() > 0;
    }

    public function hasAdditionalCharges(): bool
    {
        return $this->additionalChargesValue() > 0;
    }

    /**
     * Grand total = base + additional charges + VAT (= amount)
     */
    public function totalAmountValue(): float
    {
        return round(
            $this->baseAmountValue()
                + $this->additionalChargesValue()
                + $this->vatAmountValue(),
            2
        );
    }

    /**
     * ✅ Match check para sa admin verification.
     * Ihahambing yung BASE amount ng billing sa monthly amount ng Job Order
     * (excl. VAT at additional charges).
     */
    public function matchesJobOrder(): ?bool
    {
        $jobOrder = $this->jobOrder;
        if (! $jobOrder) {
            return null;
        }

        $expected = $jobOrder->monthlyAmount();
        if ($expected <= 0) {
            return null;
        }

        return abs($this->baseAmountValue() - $expected) < 0.01;
    }

    /**
     * ✅ Base amount − JO monthly amount.
     * Positibo = sobra ang billing, negatibo = kulang.
     */
    public function amountDifferenceValue(): ?float
    {
        $jobOrder = $this->jobOrder;
        if (! $jobOrder) {
            return null;
        }

        $expected = $jobOrder->monthlyAmount();
        if ($expected <= 0) {
            return null;
        }

        return round($this->baseAmountValue() - $expected, 2);
    }

    /**
     * ✅ Lock: may Pending billing ba na? (para hindi mag-create ng dalawa)
     */
    public static function jobOrderHasPendingBilling(int $jobOrderId): bool
    {
        return static::query()
            ->where('job_order_id', $jobOrderId)
            ->where('status', 'Pending')
            ->exists();
    }
}
