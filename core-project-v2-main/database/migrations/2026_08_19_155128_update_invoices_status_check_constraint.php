<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // PostgreSQL-specific CHECK constraint. SQLite (used by the test
        // suite) does not support ALTER TABLE ... DROP CONSTRAINT.
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Remove old status constraint
        |--------------------------------------------------------------------------
        */

        DB::statement(
            'ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check'
        );

        /*
        |--------------------------------------------------------------------------
        | Add new status constraint
        |--------------------------------------------------------------------------
        */

        DB::statement("
            ALTER TABLE invoices
            ADD CONSTRAINT invoices_status_check
            CHECK (
                status IN (
                    'Pending',
                    'Partial',
                    'Paid',
                    'Rejected',
                    'Overdue'
                )
            )
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement(
            'ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check'
        );

        DB::statement("
            ALTER TABLE invoices
            ADD CONSTRAINT invoices_status_check
            CHECK (
                status IN (
                    'Pending',
                    'Paid'
                )
            )
        ");
    }
};
