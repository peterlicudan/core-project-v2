<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Make receipt_number nullable
            $table->string('receipt_number')->nullable()->change();

            // Also make receipt nullable if not already
            if (Schema::hasColumn('payments', 'receipt')) {
                $table->string('receipt')->nullable()->change();
            }

            // Make payment_method nullable if not already
            if (Schema::hasColumn('payments', 'payment_method')) {
                $table->string('payment_method')->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('receipt_number')->nullable(false)->change();
        });
    }
};
