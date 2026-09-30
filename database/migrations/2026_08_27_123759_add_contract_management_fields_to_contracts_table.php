<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            if (! Schema::hasColumn('contracts', 'location')) {
                $table->string('location')->nullable();
            }

            if (! Schema::hasColumn('contracts', 'type')) {
                $table->string('type')->default('Contract');
            }

            if (! Schema::hasColumn('contracts', 'contract_type')) {
                $table->string('contract_type')->nullable();
            }

            if (! Schema::hasColumn('contracts', 'equipment')) {
                $table->string('equipment')->nullable();
            }

            if (! Schema::hasColumn('contracts', 'documents')) {
                $table->unsignedInteger('documents')->default(0);
            }

            if (! Schema::hasColumn('contracts', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable();
            }
        });

        if (! Schema::hasIndex('contracts', ['type'])) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->index('type');
            });
        }
    }

    public function down(): void
    {
    }
};
