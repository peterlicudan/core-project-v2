<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ✅ INVOICE NUMBER IS ASSIGNED ONLY WHEN THE ADMIN APPROVES THE BILLING.
 *
 * Ang `number` ay dating required at naka-generate agad sa pag-create ng
 * billing. Pero ang requirement:
 *
 *   - Sa BILLING RECORDS: Billing No. + Job Order No. lang — WALANG invoice number.
 *   - Sa SERVICE INVOICE: pag APPROVED na ng admin, dun lamang gumagawa ang
 *     invoice, at doon na lumalabas ang Invoice No. (kasama ang Billing No.
 *     at Job Order No.)
 *
 | Kaya kailangan ng NULLABLE na `number` para may "hindi pa mayroon" na
 | estado ang bago pa ma-approve.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('invoices', 'number')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('number')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('invoices', 'number')) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | BACK-FILL BEFORE RESTORING NOT NULL
        |--------------------------------------------------------------------------
        |
        | Puwedeng may record na walang number (halimbawa Pending/Rejected na
        | ginawa bago ang migration), kaya punan muna bago ipatong ang NOT NULL.
        |
        */

        $rows = DB::table('invoices')
            ->whereNull('number')
            ->orWhere('number', '')
            ->orderBy('id')
            ->get(['id']);

        $sequence = 0;

        foreach ($rows as $row) {
            $sequence++;
            DB::table('invoices')
                ->where('id', $row->id)
                ->update([
                    'number' => sprintf('INV-%s-%04d', now()->year, $sequence),
                ]);
        }

        Schema::table('invoices', function (Blueprint $table) {
            $table->string('number')->nullable(false)->change();
        });
    }
};
