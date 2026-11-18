<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            // Add invoice connection fields
            $table->foreignId('invoice_id')
                  ->nullable()
                  ->after('job_order_id')
                  ->constrained('invoices')
                  ->nullOnDelete();

            $table->boolean('is_invoice_approved')
                  ->default(false)
                  ->after('invoice_id');

            $table->timestamp('invoice_approved_at')
                  ->nullable()
                  ->after('is_invoice_approved');

            $table->foreignId('invoice_approved_by')
                  ->nullable()
                  ->after('invoice_approved_at')
                  ->constrained('users')
                  ->nullOnDelete();

            // Add indexes
            $table->index('invoice_id');
            $table->index('is_invoice_approved');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropForeign(['invoice_id']);
            $table->dropForeign(['invoice_approved_by']);
            $table->dropColumn([
                'invoice_id',
                'is_invoice_approved',
                'invoice_approved_at',
                'invoice_approved_by',
            ]);
        });
    }
};
