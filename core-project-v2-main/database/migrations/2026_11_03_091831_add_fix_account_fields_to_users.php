<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('fix_account_pin_hash')->nullable()->after('delete_reason');
            $table->timestamp('fix_account_pin_expires_at')->nullable()->after('fix_account_pin_hash');
            $table->unsignedTinyInteger('fix_account_pin_attempts')->default(0)->after('fix_account_pin_expires_at');
            $table->foreignId('fix_requested_by')->nullable()->after('fix_account_pin_attempts')
                ->constrained('users')->nullOnDelete();
            $table->text('fix_request_reason')->nullable()->after('fix_requested_by');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['fix_requested_by']);
            $table->dropColumn([
                'fix_account_pin_hash',
                'fix_account_pin_expires_at',
                'fix_account_pin_attempts',
                'fix_requested_by',
                'fix_request_reason',
            ]);
        });
    }
};
