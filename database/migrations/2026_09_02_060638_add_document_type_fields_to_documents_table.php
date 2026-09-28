<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->enum('document_type', ['client', 'company'])
                  ->nullable()
                  ->after('type');

            $table->boolean('is_locked')
                  ->default(false)
                  ->after('document_type');

            $table->json('granted_staff_ids')
                  ->nullable()
                  ->after('is_locked');
        });
    }

    public function down()
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['document_type', 'is_locked', 'granted_staff_ids']);
        });
    }
};
