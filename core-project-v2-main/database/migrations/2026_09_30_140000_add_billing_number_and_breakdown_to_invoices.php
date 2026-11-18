<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            /* ✅ BILLING NUMBER — ipinapakita sa Billing Records (wala nang Invoice #) */
            if (! Schema::hasColumn('invoices', 'billing_number')) {
                $table->string('billing_number', 50)->nullable()->after('number');
            }

            /*
            | ✅ BILLING BREAKDOWN
            | amount = GRAND TOTAL (kinala ng payment/reports)
            | base_amount = amount bago VAT + additional charges (ito ang ihihambing sa JO)
            */
            if (! Schema::hasColumn('invoices', 'base_amount')) {
                $table->decimal('base_amount', 15, 2)->default(0)->after('amount');
            }

            if (! Schema::hasColumn('invoices', 'vat_rate')) {
                $table->decimal('vat_rate', 5, 2)->default(0)->after('base_amount');
            }

            if (! Schema::hasColumn('invoices', 'vat_amount')) {
                $table->decimal('vat_amount', 15, 2)->default(0)->after('vat_rate');
            }

            if (! Schema::hasColumn('invoices', 'additional_charges')) {
                $table->decimal('additional_charges', 15, 2)->default(0)->after('vat_amount');
            }

            /* ✅ VERIFICATION (admin) */
            if (! Schema::hasColumn('invoices', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('additional_charges');
            }

            if (! Schema::hasColumn('invoices', 'verified_by')) {
                $table->string('verified_by', 255)->nullable()->after('verified_at');
            }
        });

        /* Backfill: lahat ng existing invoice ay base = amount (walang pa VAT/charges) */
        DB::table('invoices')->whereNull('base_amount')->orWhere('base_amount', 0)->update([
            'base_amount' => DB::raw('amount'),
        ]);

        /* Backfill: dagdagan ang JO status na may invoice na "Created" */
        DB::table('job_orders')
            ->whereIn('id', DB::table('invoices')->whereNotNull('job_order_id')->distinct()->pluck('job_order_id'))
            ->where('status', 'Pending')
            ->update(['status' => 'Created']);
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $columns = array_filter([
                'billing_number',
                'base_amount',
                'vat_rate',
                'vat_amount',
                'additional_charges',
                'verified_at',
                'verified_by',
            ], fn ($c) => Schema::hasColumn('invoices', $c));

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
