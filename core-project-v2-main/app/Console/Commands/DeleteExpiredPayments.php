<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Illuminate\Console\Command;

class DeleteExpiredPayments extends Command
{
    protected $signature = 'payments:delete-expired';

    protected $description =
        'Permanently delete payment records whose archive retention period has expired.';

    public function handle(): int
    {
        $deleted = Payment::query()
            ->where('archived', true)
            ->whereNotNull('delete_after')
            ->where(
                'delete_after',
                '<=',
                now()
            )
            ->delete();

        $this->info(
            "Deleted {$deleted} expired payment record(s)."
        );

        return self::SUCCESS;
    }
}
