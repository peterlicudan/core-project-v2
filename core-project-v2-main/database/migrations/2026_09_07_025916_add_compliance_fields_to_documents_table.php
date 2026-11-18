<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('documents', function (Blueprint $table) {
            // Expiration
            $table->date('expiry_date')->nullable()->after('status');

            // Retention
            $table->enum('retention_period', ['1 year', '3 years', '5 years', '10 years', 'permanent'])->nullable()->after('expiry_date');
            $table->date('retention_start_date')->nullable()->after('retention_period');

            // Archive
            $table->timestamp('archived_at')->nullable()->after('retention_start_date');
            $table->unsignedBigInteger('archived_by')->nullable()->after('archived_at');
            $table->foreign('archived_by')->references('id')->on('users')->onDelete('set null');

            // Regulatory
            $table->string('regulatory_body')->nullable()->after('archived_by');
            $table->string('reference_number')->nullable()->after('regulatory_body');
            $table->date('review_date')->nullable()->after('reference_number');
            $table->enum('compliance_status', ['Compliant', 'Non-Compliant', 'Under Review', 'Pending'])->default('Pending')->after('review_date');

            // Soft Delete
            $table->softDeletes()->after('updated_at');
        });
    }

    public function down()
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['archived_by']);
            $table->dropColumn([
                'expiry_date',
                'retention_period',
                'retention_start_date',
                'archived_at',
                'archived_by',
                'regulatory_body',
                'reference_number',
                'review_date',
                'compliance_status',
                'deleted_at',
            ]);
        });
    }
};
