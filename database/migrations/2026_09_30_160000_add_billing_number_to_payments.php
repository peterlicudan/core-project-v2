<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ✅ BILLING NUMBER SA PAYMENTS (durable snapshot).
 *
 * Ang reference number ng billing (BILL-YYYY-NNN) ay naka-save na sa
 * payment record — tulad ng invoice_number — para hindi mawala kapag
 * na-delete ang invoice. Ito ang hinahanap ng staff sa Payment Management.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('payments', 'billing_number')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('billing_number', 50)->nullable()->after('invoice_number');
            });
        }

        /*
        |--------------------------------------------------------------------------
        | BACK-FILL mula sa linked invoice
        |--------------------------------------------------------------------------
        */

        \Illuminate\Support\Facades\DB::statement(
            'UPDATE payments p SET billing_number = i.billing_number
             FROM invoices i
             WHERE i.id = p.invoice_id
               AND p.billing_number IS NULL
               AND i.billing_number IS NOT NULL'
        );
    }

    public function down(): void
    {
        if (Schema::hasColumn('payments', 'billing_number')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropColumn('billing_number');
            });
        }
    }
};