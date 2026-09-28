<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'due_date')) {
                $table->date('due_date')->nullable()->after('status');
            }

            if (!Schema::hasColumn('invoices', 'client_email')) {
                $table->string('client_email')->nullable()->after('due_date');
            }

            if (!Schema::hasColumn('invoices', 'client_address')) {
                $table->text('client_address')->nullable()->after('client_email');
            }

            if (!Schema::hasColumn('invoices', 'description')) {
                $table->text('description')->nullable()->after('client_address');
            }

            if (!Schema::hasColumn('invoices', 'notes')) {
                $table->text('notes')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $columns = [
                'due_date',
                'client_email',
                'client_address',
                'description',
                'notes',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('invoices', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
