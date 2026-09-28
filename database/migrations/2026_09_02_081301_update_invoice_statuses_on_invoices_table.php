<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Remove the old PostgreSQL CHECK constraint
        |--------------------------------------------------------------------------
        |
        | The original invoices.status only allowed:
        | Paid, Pending, Overdue
        |
        | We need:
        | Pending, Partial, Paid, Rejected, Overdue
        |
        */

        DB::statement(
            'ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check'
        );

        /*
        |--------------------------------------------------------------------------
        | Make status a normal VARCHAR
        |--------------------------------------------------------------------------
        */

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('status', 30)
                ->default('Pending')
                ->change();
        });

        /*
        |--------------------------------------------------------------------------
        | Add the new status validation
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
        /*
        |--------------------------------------------------------------------------
        | Remove expanded status constraint
        |--------------------------------------------------------------------------
        */

        DB::statement(
            'ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check'
        );

        /*
        |--------------------------------------------------------------------------
        | Convert existing Partial / Rejected records
        |--------------------------------------------------------------------------
        |
        | They cannot exist in the old schema, so convert them before
        | restoring the old constraint.
        |
        */

        DB::table('invoices')
            ->whereIn('status', ['Partial', 'Rejected'])
            ->update([
                'status' => 'Pending',
            ]);

        DB::statement("
            ALTER TABLE invoices
            ADD CONSTRAINT invoices_status_check
            CHECK (
                status IN (
                    'Paid',
                    'Pending',
                    'Overdue'
                )
            )
        ");
    }
};
