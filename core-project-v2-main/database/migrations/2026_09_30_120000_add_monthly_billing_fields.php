<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
        |----------------------------------------------------------------------
        | INVOICES - MONTHLY BILLING
        |----------------------------------------------------------------------
        |
        | service_month     -> "YYYY-MM" na binibigyan ng bayad (Service Date)
        | billing_sequence  -> Month 1, 2, 3 ... ng approved quotation
        |
        */

        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'service_month')) {
                $table->string('service_month', 7)
                    ->nullable()
                    ->after('due_date');
            }

            if (! Schema::hasColumn('invoices', 'billing_sequence')) {
                $table->unsignedSmallInteger('billing_sequence')
                    ->nullable()
                    ->after('service_month');
            }
        });

        /*
        |----------------------------------------------------------------------
        | JOB ORDERS - APPROVED QUOTATION
        |----------------------------------------------------------------------
        |
        | quotation_total -> kabuuang halaga ng na-approve na quotation
        | billing_months  -> ilang buwan ang saklaw ng quotation (3 = quarterly)
        |
        */

        Schema::table('job_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('job_orders', 'quotation_total')) {
                $table->decimal('quotation_total', 15, 2)
                    ->nullable()
                    ->after('amount');
            }

            if (! Schema::hasColumn('job_orders', 'billing_months')) {
                $table->unsignedSmallInteger('billing_months')
                    ->nullable()
                    ->after('quotation_total');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['service_month', 'billing_sequence'],
                fn (string $column) => Schema::hasColumn('invoices', $column)
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });

        Schema::table('job_orders', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['quotation_total', 'billing_months'],
                fn (string $column) => Schema::hasColumn('job_orders', $column)
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
