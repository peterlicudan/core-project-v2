<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('job_orders', 'approved_at')) {
                $table->timestamp('approved_at')
                    ->nullable()
                    ->after('generated_by');
            }
            if (!Schema::hasColumn('job_orders', 'approved_by')) {
                $table->foreignId('approved_by')
                    ->nullable()
                    ->after('approved_at')
                    ->constrained('users')
                    ->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('job_orders', function (Blueprint $table) {
            if (Schema::hasColumn('job_orders', 'approved_by')) {
                $table->dropForeign(['approved_by']);
                $table->dropColumn('approved_by');
            }
            if (Schema::hasColumn('job_orders', 'approved_at')) {
                $table->dropColumn('approved_at');
            }
        });
    }
};
