<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            /*
            |--------------------------------------------------------------------------
            | JOB ORDER REFERENCE
            |--------------------------------------------------------------------------
            |
            | A contract may optionally originate from a Job Order.
            | Contract does NOT depend on Invoice or Payment.
            |
            */

            $table->foreignId('job_order_id')
                ->nullable()
                ->after('id')
                ->constrained('job_orders')
                ->nullOnDelete();

            $table->index('job_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropForeign(['job_order_id']);
            $table->dropIndex(['job_order_id']);
            $table->dropColumn('job_order_id');
        });
    }
};
