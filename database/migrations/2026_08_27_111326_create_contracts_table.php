<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();

            /*
            |--------------------------------------------------------------------------
            | BASIC INFORMATION
            |--------------------------------------------------------------------------
            */

            $table->string('contract_no')->unique();

            $table->string('client');

            $table->string('email')->nullable();

            $table->string('invoice')->nullable();

            $table->string('project');

            $table->string('location')->nullable();


            /*
            |--------------------------------------------------------------------------
            | CONTRACT / PERMIT INFORMATION
            |--------------------------------------------------------------------------
            */

            $table->string('type')
                ->default('Contract');

            $table->string('contract_type')
                ->nullable();

            $table->string('equipment')
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | DATES
            |--------------------------------------------------------------------------
            */

            $table->date('start_date');

            $table->date('end_date');


            /*
            |--------------------------------------------------------------------------
            | STATUS
            |--------------------------------------------------------------------------
            */

            $table->string('status')
                ->default('Active');


            /*
            |--------------------------------------------------------------------------
            | DOCUMENT INFORMATION
            |--------------------------------------------------------------------------
            */

            $table->unsignedInteger('documents')
                ->default(0);

            $table->text('description')
                ->nullable();

            $table->text('rejection_reason')
                ->nullable();


            /*
            |--------------------------------------------------------------------------
            | ARCHIVE
            |--------------------------------------------------------------------------
            */

            $table->boolean('archived')
                ->default(false);


            /*
            |--------------------------------------------------------------------------
            | CREATOR
            |--------------------------------------------------------------------------
            */

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();


            /*
            |--------------------------------------------------------------------------
            | TIMESTAMPS
            |--------------------------------------------------------------------------
            */

            $table->timestamps();


            /*
            |--------------------------------------------------------------------------
            | INDEXES
            |--------------------------------------------------------------------------
            */

            $table->index('status');

            $table->index('archived');

            $table->index('end_date');

            $table->index('type');

            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
