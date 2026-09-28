<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('contract_files')) {
            Schema::create('contract_files', function (Blueprint $table) {
                $table->id();

                $table->foreignId('contract_id')
                    ->constrained('contracts')
                    ->onDelete('cascade');

                $table->string('type')->nullable();

                $table->string('file_path');
                $table->string('file_name');
                $table->unsignedBigInteger('file_size')->nullable();
                $table->string('mime_type')->nullable();

                $table->foreignId('uploaded_by')
                    ->nullable()
                    ->constrained('users')
                    ->onDelete('set null');

                $table->timestamps();

                // Indexes para mabilis ang queries
                $table->index('contract_id');
                $table->index('type');
                $table->index('uploaded_by');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_files');
    }
};
