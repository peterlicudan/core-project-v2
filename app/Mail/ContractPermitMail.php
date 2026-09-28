<?php

namespace App\Mail;

use App\Models\Contract;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContractPermitMail extends Mailable
{
    use Queueable, SerializesModels;

    public Contract $contract;

    /**
     * Create a new message instance.
     */
    public function __construct(Contract $contract)
    {
        $this->contract = $contract;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $contractType = $this->contract->type ?? 'Contract';

        $contractNumber =
            $this->contract->contract_no ?? 'Contract';

        return $this
            ->subject(
                "ALIBATON {$contractType} - {$contractNumber}"
            )
            ->view('emails.contract-permit');
    }
}
