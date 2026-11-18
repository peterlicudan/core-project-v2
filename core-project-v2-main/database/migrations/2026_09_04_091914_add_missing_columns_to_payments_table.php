<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('payments', 'invoice_number')) {
                $table->string('invoice_number')->nullable();
            }

            if (!Schema::hasColumn('payments', 'client')) {
                $table->string('client')->nullable();
            }

            if (!Schema::hasColumn('payments', 'amount')) {
                $table->decimal('amount', 15, 2)->nullable();
            }

            if (!Schema::hasColumn('payments', 'status')) {
                $table->string('status')->default('Pending');
            }

            if (!Schema::hasColumn('payments', 'due_date')) {
                $table->timestamp('due_date')->nullable();
            }

            if (!Schema::hasColumn('payments', 'payment_date')) {
                $table->timestamp('payment_date')->nullable();
            }

            if (!Schema::hasColumn('payments', 'receipt_number')) {
                $table->string('receipt_number')->nullable();
            }

            if (!Schema::hasColumn('payments', 'receipt')) {
                $table->string('receipt')->nullable();
            }

            if (!Schema::hasColumn('payments', 'payment_method')) {
                $table->string('payment_method')->nullable();
            }

            if (!Schema::hasColumn('payments', 'notes')) {
                $table->text('notes')->nullable();
            }

            if (!Schema::hasColumn('payments', 'archived')) {
                $table->boolean('archived')->default(false);
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['client', 'receipt'],
                fn (string $column) => Schema::hasColumn('payments', $column)
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
