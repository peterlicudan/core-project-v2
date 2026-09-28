<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_permits', function (Blueprint $table) {
            $table->id();

            // ========== BASIC INFO ==========
            $table->string('title')->nullable();
            $table->string('name')->nullable();
            $table->string('type')->nullable(); // Contract, Permit, License, etc.
            $table->string('contract_type')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();

            // ========== CLIENT INFO ==========
            $table->string('client')->nullable();
            $table->string('client_name')->nullable();
            $table->string('client_email')->nullable();
            $table->string('email')->nullable();

            // ========== PROJECT INFO ==========
            $table->string('project')->nullable();
            $table->string('project_name')->nullable();
            $table->string('location')->nullable();

            // ========== REFERENCE NUMBERS ==========
            $table->string('contract_no')->nullable();
            $table->string('contract_number')->nullable();
            $table->string('reference_number')->nullable();
            $table->string('permit_number')->nullable();

            // ========== DATES ==========
            $table->date('start_date')->nullable();
            $table->date('issue_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('expiry_date')->nullable();

            // ========== STATUS ==========
            $table->string('status')->default('Pending');

            // ========== INVOICE CONNECTION (NEW) ==========
            $table->foreignId('invoice_id')
                  ->nullable()
                  ->constrained('invoices')
                  ->nullOnDelete();

            $table->boolean('is_invoice_approved')->default(false);
            $table->timestamp('invoice_approved_at')->nullable();
            $table->foreignId('invoice_approved_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // ========== STAFF ASSIGNMENT ==========
            $table->foreignId('assigned_to')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // ========== FILES ==========
            $table->string('file')->nullable();
            $table->string('file_path')->nullable();
            $table->string('document')->nullable();
            $table->string('contract_file_path')->nullable();
            $table->string('contract_file_name')->nullable();
            $table->string('signed_contract_path')->nullable();
            $table->string('signed_contract_file_name')->nullable();
            $table->string('prepared_contract_url')->nullable();
            $table->string('signed_contract_url')->nullable();

            // ========== OTHER ==========
            $table->string('equipment')->nullable();
            $table->integer('documents')->nullable();
            $table->text('rejection_reason')->nullable();

            // ========== WORKFLOW ==========
            $table->string('workflow_status')->nullable();
            $table->string('workflowStatus')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('submitted_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // ========== ARCHIVE ==========
            $table->boolean('archived')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->boolean('isArchived')->default(false);
            $table->timestamp('archive_expires_at')->nullable();
            $table->timestamp('archiveExpiresAt')->nullable();
            $table->timestamp('retention_delete_at')->nullable();

            // ========== DAYS UNTIL EXPIRY (for tracking) ==========
            $table->integer('days_until_expiry')->nullable();
            $table->integer('daysUntilExpiry')->nullable();

            // ========== CREATED BY ==========
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();

            // ========== INDEXES ==========
            $table->index('invoice_id');
            $table->index('is_invoice_approved');
            $table->index('status');
            $table->index('assigned_to');
            $table->index('archived');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_permits');
    }
};
