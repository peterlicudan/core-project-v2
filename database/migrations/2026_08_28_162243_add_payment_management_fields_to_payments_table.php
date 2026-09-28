<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {

            /*
            |--------------------------------------------------------------------------
            | PARTIAL DATE
            |--------------------------------------------------------------------------
            */

            if (!Schema::hasColumn('payments', 'partial_date')) {
                $table->date('partial_date')->nullable();
            }

            /*
            |--------------------------------------------------------------------------
            | ARCHIVE
            |--------------------------------------------------------------------------
            */

            if (!Schema::hasColumn('payments', 'archived')) {
                $table->boolean('archived')
                    ->default(false)
                    ->index();
            }

            if (!Schema::hasColumn('payments', 'archived_at')) {
                $table->timestamp('archived_at')->nullable();
            }

            if (!Schema::hasColumn('payments', 'archive_expires_at')) {
                $table->timestamp('archive_expires_at')->nullable();
            }

            if (!Schema::hasColumn('payments', 'delete_after')) {
                $table->timestamp('delete_after')->nullable();
            }

            /*
            |--------------------------------------------------------------------------
            | AUDIT
            |--------------------------------------------------------------------------
            */

            if (!Schema::hasColumn('payments', 'edited_by')) {
                $table->foreignId('edited_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('payments', 'edited_at')) {
                $table->timestamp('edited_at')->nullable();
            }

            if (!Schema::hasColumn('payments', 'updated_by')) {
                $table->foreignId('updated_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {

            /*
            |--------------------------------------------------------------------------
            | DROP FOREIGN KEYS FIRST
            |--------------------------------------------------------------------------
            */

            if (Schema::hasColumn('payments', 'edited_by')) {
                $table->dropForeign(['edited_by']);
            }

            if (Schema::hasColumn('payments', 'updated_by')) {
                $table->dropForeign(['updated_by']);
            }

            /*
            |--------------------------------------------------------------------------
            | DROP COLUMNS
            |--------------------------------------------------------------------------
            */

            $columns = [];

            foreach ([
                'partial_date',
                'archived',
                'archived_at',
                'archive_expires_at',
                'delete_after',
                'edited_by',
                'edited_at',
                'updated_by',
            ] as $column) {
                if (Schema::hasColumn('payments', $column)) {
                    $columns[] = $column;
                }
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
