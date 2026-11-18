<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('payments', 'partial_date')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->date('partial_date')
                    ->nullable()
                    ->after('payment_date');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payments', 'partial_date')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropColumn('partial_date');
            });
        }
    }
};
