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
        Schema::table('compliances', function (Blueprint $table) {
            // ============================================================
            // REGULATORY FIELDS
            // ============================================================
            $table->string('regulatory_body')->nullable()->after('description');
            $table->string('reference_number')->nullable()->after('regulatory_body');

            // ============================================================
            // PRIORITY
            // ============================================================
            $table->enum('priority', ['High', 'Medium', 'Low'])->default('Medium')->after('reference_number');

            // ============================================================
            // PROGRESS TRACKING
            // ============================================================
            $table->integer('progress_percentage')->default(0)->after('priority');
            $table->timestamp('completed_at')->nullable()->after('progress_percentage');

            // ============================================================
            // MONITORING STATUS
            // ============================================================
            $table->enum('monitoring_status', ['On Track', 'At Risk', 'Behind', 'Completed'])->nullable()->after('completed_at');
            $table->timestamp('last_reviewed_at')->nullable()->after('monitoring_status');
            $table->unsignedBigInteger('reviewed_by')->nullable()->after('last_reviewed_at');

            // ============================================================
            // NOTIFICATIONS
            // ============================================================
            $table->integer('notify_days_before')->default(30)->after('reviewed_by');
            $table->timestamp('reminder_sent_at')->nullable()->after('notify_days_before');

            // ============================================================
            // ARCHIVE
            // ============================================================
            $table->timestamp('archived_at')->nullable()->after('reminder_sent_at');
            $table->unsignedBigInteger('archived_by')->nullable()->after('archived_at');

            // ============================================================
            // FOREIGN KEYS
            // ============================================================
            $table->foreign('reviewed_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('archived_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            // ============================================================
            // INDEXES FOR PERFORMANCE
            // ============================================================
            $table->index('priority');
            $table->index('monitoring_status');
            $table->index('last_reviewed_at');
            $table->index('archived_at');
            $table->index('reminder_sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compliances', function (Blueprint $table) {
            // Drop foreign keys first
            $table->dropForeign(['reviewed_by']);
            $table->dropForeign(['archived_by']);

            // Drop columns
            $table->dropColumn([
                // Regulatory
                'regulatory_body',
                'reference_number',

                // Priority
                'priority',

                // Progress
                'progress_percentage',
                'completed_at',

                // Monitoring
                'monitoring_status',
                'last_reviewed_at',
                'reviewed_by',

                // Notifications
                'notify_days_before',
                'reminder_sent_at',

                // Archive
                'archived_at',
                'archived_by',
            ]);

            // Drop indexes
            $table->dropIndex(['priority']);
            $table->dropIndex(['monitoring_status']);
            $table->dropIndex(['last_reviewed_at']);
            $table->dropIndex(['archived_at']);
            $table->dropIndex(['reminder_sent_at']);
        });
    }
};
