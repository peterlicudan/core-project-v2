<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_orders', function (Blueprint $table) {
            $table->id();

            $table->string('number')->unique();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('client');
            $table->string('client_email')->nullable();
            $table->string('client_contact')->nullable();
            $table->text('client_address')->nullable();

            $table->string('project');
            $table->string('location')->nullable();

            $table->string('equipment')->nullable();
            $table->string('operator')->nullable();

            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            $table->decimal('amount', 15, 2)->default(0);

            $table->text('description')->nullable();
            $table->text('notes')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Job Order Status
            |--------------------------------------------------------------------------
            |
            | Pending
            | Approved
            | Generated
            | Completed
            | Cancelled
            |
            */
            $table->string('status')->default('Pending');

            /*
            |--------------------------------------------------------------------------
            | Invoice generation tracking
            |--------------------------------------------------------------------------
            */
            $table->timestamp('generated_at')->nullable();

            $table->foreignId('generated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_orders');
    }
};
