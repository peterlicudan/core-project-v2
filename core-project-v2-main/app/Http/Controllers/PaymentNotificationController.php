<?php

namespace App\Http\Controllers;

use App\Mail\PaymentStatusMail;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class PaymentNotificationController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | SEND PAYMENT EMAIL
    |--------------------------------------------------------------------------
    |
    | ADMIN:
    | Can send email for any payment.
    |
    | STAFF / CLIENT:
    | Can only send email for their own payment.
    |
    */

    public function send(Request $request, Payment $payment)
    {
        abort_unless(
            Auth::check(),
            401,
            'You must be logged in.'
        );

        $user = Auth::user();

        /*
        |--------------------------------------------------------------------------
        | STAFF / CLIENT OWNERSHIP PROTECTION
        |--------------------------------------------------------------------------
        */

        if ($user->role !== 'admin') {

            abort_unless(
                (int) $payment->user_id === (int) $user->id,
                403,
                'You can only send email for your own payment.'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
            ],

            'subject' => [
                'required',
                'string',
                'max:255',
            ],

            'message' => [
                'required',
                'string',
                'max:10000',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | LOAD PAYMENT DATA
        |--------------------------------------------------------------------------
        */

        $payment->load([
            'user',
            'invoice',
        ]);

        /*
        |--------------------------------------------------------------------------
        | SEND EMAIL
        |--------------------------------------------------------------------------
        */

        try {

            Mail::to(
                $validated['email']
            )->send(
                new PaymentStatusMail(
                    $payment,
                    $validated['subject'],
                    $validated['message']
                )
            );

        } catch (\Throwable $e) {

            report($e);

            return back()
                ->withErrors([
                    'email' =>
                        'Email could not be sent. Please check your mail configuration.',
                ])
                ->withInput();
        }

        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        return back()->with(
            'success',
            'Payment notification email sent successfully.'
        );
    }
}
