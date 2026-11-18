<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->boolean('superadmin_verified')->default(false)->after('status');
            $table->timestamp('superadmin_verified_at')->nullable()->after('superadmin_verified');
            $table->foreignId('superadmin_verified_by')->nullable()->after('superadmin_verified_at')
                  ->constrained('users')->nullOnDelete();

            $table->boolean('superadmin_rejected')->default(false)->after('superadmin_verified_by');
            $table->timestamp('superadmin_rejected_at')->nullable()->after('superadmin_rejected');
            $table->foreignId('superadmin_rejected_by')->nullable()->after('superadmin_rejected_at')
                  ->constrained('users')->nullOnDelete();
            $table->text('superadmin_rejection_reason')->nullable()->after('superadmin_rejected_by');

            $table->index('superadmin_verified');
            $table->index('superadmin_rejected');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['superadmin_verified_by']);
            $table->dropForeign(['superadmin_rejected_by']);
            $table->dropIndex(['superadmin_verified']);
            $table->dropIndex(['superadmin_rejected']);

            $table->dropColumn([
                'superadmin_verified',
                'superadmin_verified_at',
                'superadmin_verified_by',
                'superadmin_rejected',
                'superadmin_rejected_at',
                'superadmin_rejected_by',
                'superadmin_rejection_reason',
            ]);
        });
    }
};
