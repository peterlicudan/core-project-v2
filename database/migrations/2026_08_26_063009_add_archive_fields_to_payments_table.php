<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | ADD ARCHIVE COLUMNS
        |--------------------------------------------------------------------------
        */

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'archived')) {
                $table->boolean('archived')
                    ->default(false)
                    ->index();
            }

            if (!Schema::hasColumn('payments', 'archived_at')) {
                $table->timestamp('archived_at')
                    ->nullable()
                    ->index();
            }

            if (!Schema::hasColumn('payments', 'archive_expires_at')) {
                $table->timestamp('archive_expires_at')
                    ->nullable()
                    ->index();
            }

            if (!Schema::hasColumn('payments', 'delete_after')) {
                $table->timestamp('delete_after')
                    ->nullable()
                    ->index();
            }
        });

        /*
        |--------------------------------------------------------------------------
        | PAYMENT METHOD
        |--------------------------------------------------------------------------
        |
        | ALIBATON accepts ONLY:
        |
        | Bank Transfer
        | Cheque
        |
        |--------------------------------------------------------------------------
        */

        /*
         * Remove an existing PostgreSQL check constraint if present.
         */
        DB::statement(
            'ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check'
        );

        DB::statement(
            "ALTER TABLE payments
             ADD CONSTRAINT payments_payment_method_check
             CHECK (payment_method IN ('Bank Transfer', 'Cheque'))"
        );

        /*
        |--------------------------------------------------------------------------
        | PAYMENT STATUS
        |--------------------------------------------------------------------------
        |
        | Staff:
        | Pending
        | Due
        |
        | Admin:
        | Pending
        | Paid
        | Partial
        | Rejected
        | Due
        |
        |--------------------------------------------------------------------------
        */

        DB::statement(
            'ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check'
        );

        DB::statement(
            "ALTER TABLE payments
             ADD CONSTRAINT payments_status_check
             CHECK (
                status IN (
                    'Pending',
                    'Paid',
                    'Partial',
                    'Rejected',
                    'Due'
                )
             )"
        );
    }

    public function down(): void
    {
        DB::statement(
            'ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check'
        );

        DB::statement(
            'ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check'
        );

        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'delete_after')) {
                $table->dropColumn('delete_after');
            }

            if (Schema::hasColumn('payments', 'archive_expires_at')) {
                $table->dropColumn('archive_expires_at');
            }

            if (Schema::hasColumn('payments', 'archived_at')) {
                $table->dropColumn('archived_at');
            }

            if (Schema::hasColumn('payments', 'archived')) {
                $table->dropColumn('archived');
            }
        });
    }
};
