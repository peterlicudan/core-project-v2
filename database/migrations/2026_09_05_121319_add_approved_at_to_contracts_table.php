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
            | APPROVAL DATE
            |--------------------------------------------------------------------------
            |
            | This records the exact date/time when Admin gives final approval.
            |
            */

            $table->timestamp('approved_at')
                ->nullable()
                ->after('reviewed_by');

            /*
            |--------------------------------------------------------------------------
            | CONTRACT VALIDITY
            |--------------------------------------------------------------------------
            |
            | A contract does not become valid until Admin approves it.
            |
            */

            $table->date('start_date')
                ->nullable()
                ->change();

            $table->date('end_date')
                ->nullable()
                ->change();

            /*
            |--------------------------------------------------------------------------
            | INDEX
            |--------------------------------------------------------------------------
            */

            $table->index('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex(['approved_at']);

            $table->dropColumn('approved_at');

            /*
            |--------------------------------------------------------------------------
            | Restore original NOT NULL dates
            |--------------------------------------------------------------------------
            |
            | Existing NULL values must be handled before rollback.
            |
            */

            $table->date('start_date')
                ->nullable(false)
                ->change();

            $table->date('end_date')
                ->nullable(false)
                ->change();
        });
    }
};
