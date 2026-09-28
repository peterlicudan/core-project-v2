<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            /*
            |--------------------------------------------------------------------------
            | CONTRACT WORKFLOW
            |--------------------------------------------------------------------------
            */

            $table->string('workflow_status')
                ->default('Pending')
                ->after('status');

            /*
            |--------------------------------------------------------------------------
            | ORIGINAL / PREPARED CONTRACT FILE
            |--------------------------------------------------------------------------
            */

            $table->string('contract_file_path')
                ->nullable()
                ->after('workflow_status');

            $table->string('contract_file_name')
                ->nullable()
                ->after('contract_file_path');

            /*
            |--------------------------------------------------------------------------
            | SIGNED CONTRACT FILE
            |--------------------------------------------------------------------------
            */

            $table->string('signed_contract_path')
                ->nullable()
                ->after('contract_file_name');

            $table->string('signed_contract_file_name')
                ->nullable()
                ->after('signed_contract_path');

            /*
            |--------------------------------------------------------------------------
            | CLIENT SENDING
            |--------------------------------------------------------------------------
            */

            $table->timestamp('sent_at')
                ->nullable()
                ->after('signed_contract_file_name');

            /*
            |--------------------------------------------------------------------------
            | STAFF SUBMISSION
            |--------------------------------------------------------------------------
            */

            $table->timestamp('submitted_at')
                ->nullable()
                ->after('sent_at');

            $table->foreignId('submitted_by')
                ->nullable()
                ->after('submitted_at')
                ->constrained('users')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | ADMIN REVIEW
            |--------------------------------------------------------------------------
            */

            $table->timestamp('reviewed_at')
                ->nullable()
                ->after('submitted_by');

            $table->foreignId('reviewed_by')
                ->nullable()
                ->after('reviewed_at')
                ->constrained('users')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | INDEXES
            |--------------------------------------------------------------------------
            */

            $table->index('workflow_status');
            $table->index('submitted_by');
            $table->index('reviewed_by');
        });

        /*
        |--------------------------------------------------------------------------
        | EXISTING RECORDS
        |--------------------------------------------------------------------------
        |
        | Existing contracts that are already Active should remain Active
        | in the new workflow instead of being incorrectly marked Pending.
        |
        */

        DB::table('contracts')
            ->where('status', 'Active')
            ->update([
                'workflow_status' => 'Active',
            ]);
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropForeign(['submitted_by']);
            $table->dropForeign(['reviewed_by']);

            $table->dropIndex(['workflow_status']);
            $table->dropIndex(['submitted_by']);
            $table->dropIndex(['reviewed_by']);

            $table->dropColumn([
                'workflow_status',
                'contract_file_path',
                'contract_file_name',
                'signed_contract_path',
                'signed_contract_file_name',
                'sent_at',
                'submitted_at',
                'submitted_by',
                'reviewed_at',
                'reviewed_by',
            ]);
        });
    }
};
