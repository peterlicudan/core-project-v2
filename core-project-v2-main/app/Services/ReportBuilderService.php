<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\JobOrder;
use App\Models\Contract;
use App\Models\ContractPermit;
use App\Models\Report;
use Carbon\Carbon;

class ReportBuilderService
{
    /*
    |--------------------------------------------------------------------------
    | MAIN BUILDER — dispatch base sa report type
    |--------------------------------------------------------------------------
    */

    public function build(string $type, Carbon $start, Carbon $end): array
    {
        return match ($type) {
            'Financial'           => $this->financial($start, $end),
            'Billing'             => $this->billing($start, $end),
            'Project'             => $this->project($start, $end),
            'Accounts Receivable' => $this->accountsReceivable($start, $end),
            'Compliance'          => $this->compliance($start, $end),
            default               => $this->all($start, $end),
        };
    }

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL REPORT
    |--------------------------------------------------------------------------
    */

    public function financial(Carbon $start, Carbon $end): array
    {
        $invoiceQuery = Invoice::whereBetween('created_at', [$start, $end]);
        $paymentQuery = Payment::whereBetween('created_at', [$start, $end]);

        $invoiceTotal = (float) (clone $invoiceQuery)->sum('amount');
        $paymentTotal = (float) (clone $paymentQuery)->sum('amount');

        return [
            'invoice_total' => $invoiceTotal,
            'invoice_count' => (clone $invoiceQuery)->count(),

            'payment_total' => $paymentTotal,
            'payment_count' => (clone $paymentQuery)->count(),

            'job_order_total' => (float) JobOrder::whereBetween('created_at', [$start, $end])->sum('amount'),
            'job_order_count' => JobOrder::whereBetween('created_at', [$start, $end])->count(),

            'outstanding' => $invoiceTotal - $paymentTotal,

            'paid_payment_total'    => (float) Payment::whereRaw('LOWER(status) = ?', ['paid'])
                ->whereBetween('created_at', [$start, $end])->sum('amount'),
            'partial_payment_total' => (float) Payment::whereRaw('LOWER(status) = ?', ['partial'])
                ->whereBetween('created_at', [$start, $end])->sum('amount'),
            'pending_payment_total' => (float) Payment::whereRaw('LOWER(status) = ?', ['pending'])
                ->whereBetween('created_at', [$start, $end])->sum('amount'),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | BILLING REPORT
    |--------------------------------------------------------------------------
    */

    public function billing(Carbon $start, Carbon $end): array
    {
        $query = Invoice::whereBetween('created_at', [$start, $end]);

        return [
            'invoice_count'  => (clone $query)->count(),
            'invoice_total'  => (float) (clone $query)->sum('amount'),
            'approved_count' => (clone $query)->whereRaw('LOWER(status) = ?', ['approved'])->count(),
            'paid_count'     => (clone $query)->whereRaw('LOWER(status) = ?', ['paid'])->count(),
            'partial_count'  => (clone $query)->whereRaw('LOWER(status) = ?', ['partial'])->count(),
            'pending_count'  => (clone $query)->whereRaw('LOWER(status) = ?', ['pending'])->count(),
            'overdue_count'  => (clone $query)->whereRaw('LOWER(status) = ?', ['overdue'])->count(),
            'overdue_total'  => (float) (clone $query)->whereRaw('LOWER(status) = ?', ['overdue'])->sum('amount'),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | PROJECT REPORT
    |--------------------------------------------------------------------------
    */

    public function project(Carbon $start, Carbon $end): array
    {
        $joQuery = JobOrder::whereBetween('created_at', [$start, $end]);

        $projects = (clone $joQuery)->distinct('project')->pluck('project')->filter()->count();

        return [
            'project_count'   => $projects,
            'job_order_count' => (clone $joQuery)->count(),
            'job_order_total' => (float) (clone $joQuery)->sum('amount'),

            'approved_orders'  => (clone $joQuery)->whereRaw('LOWER(status) = ?', ['approved'])->count(),
            'pending_orders'   => (clone $joQuery)->whereRaw('LOWER(status) = ?', ['pending'])->count(),
            'completed_orders' => (clone $joQuery)->whereRaw('LOWER(status) = ?', ['completed'])->count(),

            'active_contracts' => Contract::active()->count(),
            'total_permits'    => ContractPermit::count(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | ACCOUNTS RECEIVABLE
    |--------------------------------------------------------------------------
    */

    public function accountsReceivable(Carbon $start, Carbon $end): array
    {
        return [
            'total_receivable' => (float) Invoice::whereRaw('LOWER(status) IN (?, ?, ?)', ['pending', 'partial', 'overdue'])
                ->whereBetween('created_at', [$start, $end])
                ->sum('amount'),

            'current' => (float) Invoice::whereRaw('LOWER(status) IN (?, ?)', ['pending', 'partial'])
                ->where('due_date', '>', now())
                ->sum('amount'),

            'overdue_30' => (float) Invoice::whereRaw('LOWER(status) = ?', ['overdue'])
                ->where('due_date', '>=', now()->subDays(30))
                ->sum('amount'),

            'overdue_60' => (float) Invoice::whereRaw('LOWER(status) = ?', ['overdue'])
                ->whereBetween('due_date', [now()->subDays(60), now()->subDays(30)])
                ->sum('amount'),

            'overdue_90_plus' => (float) Invoice::whereRaw('LOWER(status) = ?', ['overdue'])
                ->where('due_date', '<', now()->subDays(60))
                ->sum('amount'),

            'total_clients' => Invoice::distinct('client')->pluck('client')->filter()->count(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | COMPLIANCE REPORT
    |--------------------------------------------------------------------------
    */

    public function compliance(Carbon $start, Carbon $end): array
    {
        $activeContracts   = Contract::active()->count();
        $expiringContracts = Contract::active()
            ->whereBetween('end_date', [now(), now()->addDays(30)])
            ->count();
        $expiredContracts  = Contract::where('end_date', '<', now())->count();

        $activePermits   = ContractPermit::active()->count();
        $expiringPermits = ContractPermit::active()
            ->whereBetween('expiry_date', [now(), now()->addDays(30)])
            ->count();
        $expiredPermits  = ContractPermit::where('expiry_date', '<', now())->count();

        $totalCompliance = $activeContracts + $activePermits;
        $compliant       = $activeContracts + $activePermits;
        $nonCompliant    = $expiredContracts + $expiredPermits;

        return [
            'total'           => $totalCompliance,
            'compliant'       => $compliant,
            'non_compliant'   => $nonCompliant,
            'compliance_rate' => $totalCompliance > 0
                ? round(($compliant / $totalCompliance) * 100, 2)
                : 0,

            'active_contracts'   => $activeContracts,
            'expiring_contracts' => $expiringContracts,
            'expired_contracts'  => $expiredContracts,

            'active_permits'   => $activePermits,
            'expiring_permits' => $expiringPermits,
            'expired_permits'  => $expiredPermits,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | ALL REPORT — lahat ng modules
    |--------------------------------------------------------------------------
    */

    public function all(Carbon $start, Carbon $end): array
    {
        return [
            'financial'  => $this->financial($start, $end),
            'billing'    => $this->billing($start, $end),
            'project'    => $this->project($start, $end),
            'ar'         => $this->accountsReceivable($start, $end),
            'compliance' => $this->compliance($start, $end),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | QUICK SUMMARY — para sa right sidebar
    |--------------------------------------------------------------------------
    */

    public function quickSummary(): array
    {
        $monthStart = Carbon::now()->startOfMonth();

        return [
            'total_reports'  => Report::count(),
            'total_invoices' => Invoice::count(),
            'total_clients'  => Invoice::distinct('client')->pluck('client')->filter()->count(),
            'total_projects' => JobOrder::distinct('project')->pluck('project')->filter()->count(),

            'reports_delta'  => Report::where('created_at', '>=', $monthStart)->count(),
            'invoices_delta' => Invoice::where('created_at', '>=', $monthStart)->count(),
            'clients_delta'  => Invoice::where('created_at', '>=', $monthStart)
                ->distinct('client')->pluck('client')->filter()->count(),
            'projects_delta' => JobOrder::where('created_at', '>=', $monthStart)
                ->distinct('project')->pluck('project')->filter()->count(),
        ];
    }
}
