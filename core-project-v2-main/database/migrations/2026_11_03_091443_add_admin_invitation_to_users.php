<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('admin_invitation_token', 64)
                ->nullable()
                ->unique()
                ->after('password');

            $table->timestamp('admin_invitation_expires_at')
                ->nullable()
                ->after('admin_invitation_token');

            $table->foreignId('invited_by')
                ->nullable()
                ->after('admin_invitation_expires_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['invited_by']);
            $table->dropColumn([
                'admin_invitation_token',
                'admin_invitation_expires_at',
                'invited_by',
            ]);
        });
    }
};
