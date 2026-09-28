<?php

use App\Models\Payment;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(
        Inspiring::quote()
    );
})->purpose(
    'Display an inspiring quote'
);

/*
|--------------------------------------------------------------------------
| DELETE EXPIRED PAYMENTS
|--------------------------------------------------------------------------
|
| Payments are permanently deleted only when their delete_after
| date has been reached.
|
*/

Artisan::command(
    'payments:delete-expired',
    function () {

        $this->info(
            'Checking for expired archived payments...'
        );

        $payments = Payment::query()
            ->where('archived', true)
            ->whereNotNull('delete_after')
            ->where(
                'delete_after',
                '<=',
                now()
            )
            ->get();

        if ($payments->isEmpty()) {

            $this->info(
                'No expired archived payments found.'
            );

            return self::SUCCESS;
        }

        $count = 0;

        foreach ($payments as $payment) {

            $this->line(
                "Deleting payment #{$payment->id} " .
                "({$payment->receipt_number})"
            );

            $payment->delete();

            $count++;
        }

        $this->info(
            "{$count} expired payment(s) permanently deleted."
        );

        return self::SUCCESS;
    }
)->purpose(
    'Permanently delete payments after their archive retention period'
);
