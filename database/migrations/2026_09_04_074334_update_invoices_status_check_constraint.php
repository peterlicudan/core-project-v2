<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Drop existing check constraint
        DB::statement('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;');

        // Recreate with new values including Approved and Rejected
        DB::statement(
            "ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
            CHECK (status IN ('Pending', 'Partial', 'Paid', 'Rejected', 'Overdue', 'Approved'));"
        );
    }

    public function down()
    {
        DB::statement('ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;');
    }
};
