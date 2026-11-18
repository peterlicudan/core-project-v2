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
        Schema::table('invoices', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->string('rejected_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->string('approved_by')->nullable();
            $table->text('approval_notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->string('sent_by')->nullable();
        });

        Schema::table('job_orders', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'rejection_reason',
                'rejected_at',
                'rejected_by',
                'approved_at',
                'approved_by',
                'approval_notes',
                'sent_at',
                'sent_by',
            ]);
        });

        Schema::table('job_orders', function (Blueprint $table) {
            $table->dropColumn('rejection_reason');
        });
    }
};
