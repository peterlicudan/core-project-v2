<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email_verification_pin_hash')) {
                $table->string('email_verification_pin_hash')->nullable();
            }

            if (!Schema::hasColumn('users', 'email_verification_pin_expires_at')) {
                $table->timestamp('email_verification_pin_expires_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'email_verification_pin_hash')) {
                $table->dropColumn('email_verification_pin_hash');
            }

            if (Schema::hasColumn('users', 'email_verification_pin_expires_at')) {
                $table->dropColumn('email_verification_pin_expires_at');
            }
        });
    }
};
