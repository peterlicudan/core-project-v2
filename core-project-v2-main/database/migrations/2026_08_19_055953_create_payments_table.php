<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Account owner
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            // Related invoice
            $table->foreignId('invoice_id')
                ->nullable()
                ->constrained('invoices')
                ->nullOnDelete();

            $table->string('receipt_number')->unique();

            $table->string('payment_method');

            $table->decimal('amount', 15, 2);

            $table->string('status')->default('Pending');

            $table->date('payment_date')->nullable();

            $table->date('due_date')->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('invoice_id');
            $table->index('payment_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
