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
        Schema::table('contracts', function (Blueprint $table) {
            // Check if columns don't exist before adding
            if (!Schema::hasColumn('contracts', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('archived');
            }

            if (!Schema::hasColumn('contracts', 'archive_expires_at')) {
                $table->timestamp('archive_expires_at')->nullable()->after('archived_at');
            }

            if (!Schema::hasColumn('contracts', 'retention_delete_at')) {
                $table->timestamp('retention_delete_at')->nullable()->after('archive_expires_at');
            }

            // Add soft deletes if not exists
            if (!Schema::hasColumn('contracts', 'deleted_at')) {
                $table->softDeletes()->after('retention_delete_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropColumn([
                'archived_at',
                'archive_expires_at',
                'retention_delete_at',
            ]);
            $table->dropSoftDeletes();
        });
    }
};
