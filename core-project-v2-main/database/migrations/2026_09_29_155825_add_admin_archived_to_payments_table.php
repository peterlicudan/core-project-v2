<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->boolean('admin_archived')
                ->default(false)
                ->after('delete_after');

            $table->timestamp('admin_archived_at')
                ->nullable()
                ->after('admin_archived');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'admin_archived',
                'admin_archived_at',
            ]);
        });
    }
};
