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
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();

            // Link sa user
            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('cascade');

            // Hashed OTP code (hindi plaintext — for security)
            $table->string('code');

            // Expiry time (5 minutes from generation)
            $table->timestamp('expires_at');

            // Attempts counter (max 3)
            $table->integer('attempts')->default(0);

            // Resend counter (max 3)
            $table->integer('resend_count')->default(0);

            // Last sent timestamp (for 60s cooldown)
            $table->timestamp('last_sent_at')->nullable();

            // Used timestamp (kung nagamit na)
            $table->timestamp('used_at')->nullable();

            $table->timestamps();

            // Indexes for performance
            $table->index(['user_id', 'used_at']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
    }
};
