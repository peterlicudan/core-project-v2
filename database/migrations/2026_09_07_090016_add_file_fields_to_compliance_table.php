<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('compliances', function (Blueprint $table) {
            // ✅ Add file columns if not exists
            if (!Schema::hasColumn('compliances', 'file_path')) {
                $table->string('file_path')->nullable()->after('priority');
            }

            if (!Schema::hasColumn('compliances', 'file_name')) {
                $table->string('file_name')->nullable()->after('file_path');
            }

            if (!Schema::hasColumn('compliances', 'file_size')) {
                $table->bigInteger('file_size')->nullable()->after('file_name');
            }

            if (!Schema::hasColumn('compliances', 'mime_type')) {
                $table->string('mime_type')->nullable()->after('file_size');
            }
        });
    }

    public function down(): void
    {
        Schema::table('compliances', function (Blueprint $table) {
            $table->dropColumn([
                'file_path',
                'file_name',
                'file_size',
                'mime_type',
            ]);
        });
    }
};