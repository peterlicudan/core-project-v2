<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'quotation_total',
        'billing_months',
        'description',
        'notes',
        'status',
        'generated_at',
        'generated_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'quotation_total' => 'decimal:2',
        'billing_months' => 'integer',
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
    | MONTHLY BILLINGS (INVOICES)
    |--------------------------------------------------------------------------
    |
    | Isang Job Order ay maaaring may maraming billing record — isang
    | invoice kada buwan base sa na-approve na quotation.
    |
    */

    public function invoices(): HasMany
    {
        return $this->hasMany(
            Invoice::class,
            'job_order_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | APPROVED QUOTATION HELPERS
    |--------------------------------------------------------------------------
    */

    /**
     * Total ng na-approve na quotation. Falls back sa `amount`
     * para sa mga lumang Job Order na walang `quotation_total`.
     */
    public function quotationTotal(): float
    {
        return (float) ($this->quotation_total ?? $this->amount ?? 0);
    }

    /**
     * Ilang buwan ang saklaw ng quotation (3 = quarterly billing).
     */
    public function billingMonths(): int
    {
        return (int) ($this->billing_months ?? 0);
    }

    /**
     * Monthly amount = quotation total ÷ months.
     */
    public function monthlyAmount(): float
    {
        $months = $this->billingMonths();

        if ($months < 1) {
            return 0.0;
        }

        return round($this->quotationTotal() / $months, 2);
    }

    /**
     * Ilang buwan ang nai-bill na.
     */
    public function billedMonthsCount(): int
    {
        return $this->invoices()
            ->whereNotNull('service_month')
            ->distinct()
            ->count('service_month');
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

    /*
    |--------------------------------------------------------------------------
    | BILLING STATUS HELPERS
    |--------------------------------------------------------------------------
    |
    | Ang JO status ay hango sa billing records:
    |
    |   Pending   → walang pa billing record
    |   Created   → may billing record (naghihintay ng admin verification)
    |   Rejected  → may na-reject na billing (kailangang ayusin ng staff)
    |   Completed → na-bill na lahat ng buwan at na-approve lahat
    |
    */

    public function pendingBillingsCount(): int
    {
        return $this->invoices()->where('status', 'Pending')->count();
    }

    public function rejectedBillingsCount(): int
    {
        return $this->invoices()->where('status', 'Rejected')->count();
    }

    public function approvedBillingsCount(): int
    {
        return $this->invoices()->where('status', 'Approved')->count();
    }

    public function billingRecordsCount(): int
    {
        return $this->invoices()->count();
    }

    /**
     * ✅ Lock logic: hindi makapag-create ng billing kapag may Pending pa
     * (hindi pa na-verify ng admin) o kapag fully billed na.
     */
    public function canCreateBilling(): bool
    {
        if ($this->isFullyBilled()) {
            return false;
        }

        return ! Invoice::jobOrderHasPendingBilling($this->id);
    }

    public function isFullyBilled(): bool
    {
        $months = $this->billingMonths();
        if ($months < 1) {
            return false;
        }

        return $this->billedMonthsCount() >= $months;
    }

    public function isFullyCompleted(): bool
    {
        $months = $this->billingMonths();
        if ($months < 1) {
            return false;
        }

        return $this->approvedBillingsCount() >= $months;
    }

    /**
     * ✅ May billing record ba na naghihintay pa ng correction ng staff?
     *
     * Kapag may Rejected na pero may bago nang Pending (correction),
     * mas nauunawa kasi ang staff na may hinahawakan pa.
     */
    public function hasRejectedBilling(): bool
    {
        return $this->invoices()
            ->where('status', 'Rejected')
            ->exists();
    }

    /**
     * ✅ Mga buwan na nai-bill na at hindi pa na-reject.
     *
     * Ang Rejected ay ibinabalang "bake" pa — kaya puwedeng
     * mag-create ng corrected billing para sa parehong buwan.
     */
    public function billedMonths(): array
    {
        return $this->invoices()
            ->whereNotNull('service_month')
            ->where('status', '!=', 'Rejected')
            ->distinct()
            ->pluck('service_month')
            ->filter()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * ✅ Computed status para sa UI.
     *
     * Precedence:
     *   Completed → na-approve na lahat ng buwan
     *   Created   → may Pending (naghihintay ng verification) o may billing na
     *   Rejected  → may na-reject at WALANG pending (kailangan ng staff action)
     *   Pending   → walang pa billing record
     */
    public function billingStatus(): string
    {
        if ($this->isFullyCompleted()) {
            return 'Completed';
        }

        /*
        | May bago nang Pending (correction) → naghihintay pa ng verification,
        | kaysa sa lumang Rejected record.
        */
        if ($this->pendingBillingsCount() > 0) {
            return 'Created';
        }

        if ($this->hasRejectedBilling()) {
            return 'Rejected';
        }

        if ($this->billingRecordsCount() > 0) {
            return 'Created';
        }

        return 'Pending';
    }

    /**
     * ✅ I-synchronize yung DB status sa computed billing status.
     */
    public function syncBillingStatus(): self
    {
        $status = $this->billingStatus();

        if ($this->status !== $status) {
            $this->status = $status;
            $this->save();
        }

        return $this;
    }
}
