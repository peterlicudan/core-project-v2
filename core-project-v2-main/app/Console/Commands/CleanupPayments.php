<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Illuminate\Console\Command;

class CleanupPayments extends Command
{
    protected $signature = 'payments:cleanup';

    protected $description =
        'Delete payment records that reached their automatic deletion date.';

    public function handle(): int
    {
        $payments = Payment::query()
            ->where('archived', true)
            ->whereNotNull('delete_after')
            ->where(
                'delete_after',
                '<=',
                now()
            )
            ->get();

        $count = 0;

        foreach ($payments as $payment) {
            $payment->delete();

            $count++;
        }

        $this->info(
            "Deleted {$count} expired payment record(s)."
        );

        return self::SUCCESS;
    }
}
