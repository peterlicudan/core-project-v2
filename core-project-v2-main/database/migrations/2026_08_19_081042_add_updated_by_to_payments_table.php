<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('payments', 'updated_by')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->foreignId('updated_by')
                    ->nullable()
                    ->after('notes')
                    ->constrained('users')
                    ->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('payments', 'updated_by')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropForeign([
                    'updated_by',
                ]);

                $table->dropColumn('updated_by');
            });
        }
    }
};
