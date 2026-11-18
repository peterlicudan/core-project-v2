<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        /*
        |------------------------------------------------------------------
        | This migration is dated 2025 so it may run before the
        | create_otp_codes_table migration on a fresh install. The create
        | migration now includes the `purpose` column, so just skip here
        | when the table (or column) is not ready yet.
        |------------------------------------------------------------------
        */

        if (!Schema::hasTable('otp_codes')) {
            return;
        }

        if (Schema::hasColumn('otp_codes', 'purpose')) {
            return;
        }

        Schema::table('otp_codes', function (Blueprint $table) {
            /*
            |------------------------------------------------------------------
            | PURPOSE — Distinguish between:
            | - admin_login       (existing admin OTP)
            | - superadmin_login  (superadmin OTP)
            | - admin_invitation  (admin invitation verification)
            |------------------------------------------------------------------
            */
            $table->string('purpose', 50)
                ->default('admin_login')
                ->after('code');

            $table->index(['user_id', 'purpose', 'used_at'], 'otp_user_purpose_used_idx');
        });

        /*
        |----------------------------------------------------------------------
        | BACKFILL: Mark existing OTPs as admin_login
        |----------------------------------------------------------------------
        */
        DB::table('otp_codes')->update(['purpose' => 'admin_login']);
    }

    public function down(): void
    {
        if (!Schema::hasTable('otp_codes')) {
            return;
        }

        if (!Schema::hasColumn('otp_codes', 'purpose')) {
            return;
        }

        try {
            Schema::table('otp_codes', function (Blueprint $table) {
                $table->dropIndex('otp_user_purpose_used_idx');
                $table->dropColumn('purpose');
            });
        } catch (\Throwable $e) {
            // Index or column already removed by an earlier rollback.
        }
    }
};
