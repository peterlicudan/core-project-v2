<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->string('location')
                ->nullable()
                ->after('project');

            $table->string('type')
                ->default('Contract')
                ->after('location');

            $table->string('contract_type')
                ->nullable()
                ->after('type');

            $table->string('equipment')
                ->nullable()
                ->after('contract_type');

            $table->unsignedInteger('documents')
                ->default(0)
                ->after('status');

            $table->text('rejection_reason')
                ->nullable()
                ->after('description');

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex(['type']);

            $table->dropColumn([
                'location',
                'type',
                'contract_type',
                'equipment',
                'documents',
                'rejection_reason',
            ]);
        });
    }
};
