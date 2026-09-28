<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_access_requests', function (Blueprint $table) {
            $table->text('remarks')->nullable()->after('responded_at');
        });
    }

    public function down(): void
    {
        Schema::table('document_access_requests', function (Blueprint $table) {
            $table->dropColumn('remarks');
        });
    }
};
