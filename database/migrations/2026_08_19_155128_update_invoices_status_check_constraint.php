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
