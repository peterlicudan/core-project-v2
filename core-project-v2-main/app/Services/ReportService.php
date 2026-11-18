<?php

namespace App\Services;

use App\Models\Compliance;
use App\Models\Contract;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\JobOrder;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ReportService
{
    /**
     * Memoized schema column existence cache (per request).
     *
     * @var array<string, bool>
     */
    protected array $columnCache = [];

    /**
     * Generate a complete database-backed report.
     *
     * Scope: date range + report type + client.
     * Project is NOT used as a report filter.
     */
    public function generate(
        ?string $startDate = null,
        ?string $endDate = null,
        string $reportType = 'All',
        ?string $client = null
    ): array {
        [$start, $end] = $this->normalizeDateRange($startDate, $endDate);

        $reportType = $this->normalizeReportType($reportType);
        $client     = $this->normalizeClient($client);

        try {
            $summary     = $this->summary($start, $end, $reportType, $client);
            $financial   = $this->financialAnalytics($start, $end, $client);
            $operational = $this->operationalAnalytics($start, $end, $client);
            $trends      = $this->historicalTrends($start, $end, $client);
            $projections = $this->futureProjections($trends);
            $expirations = $this->upcomingExpirations($client);
            $records     = $this->records($start, $end, $reportType, $client);

            $recordCounts = [
                'invoices'   => count($records['invoices']   ?? []),
                'payments'   => count($records['payments']   ?? []),
                'job_orders' => count($records['job_orders'] ?? []),
                'contracts'  => count($records['contracts']  ?? []),
                'compliance' => count($records['compliance'] ?? []),
                'documents'  => count($records['documents']  ?? []),
            ];

            $recordCounts['total'] = array_sum($recordCounts);

            return [
                'filters' => [
                    'start_date'  => $start->toDateString(),
                    'end_date'    => $end->toDateString(),
                    'report_type' => $reportType,
                    'client'      => $client,
                ],

                'generated_at'  => now()->toIso8601String(),
                'summary'       => $summary,
                'financial'     => $financial,
                'operational'   => $operational,
                'trends'        => $trends,
                'projections'   => $projections,
                'expirations'   => $expirations,
                'records'       => $records,
                'record_counts' => $recordCounts,
            ];
        } catch (\Throwable $e) {
            Log::error('ReportService generation failed.', [
                'message'     => $e->getMessage(),
                'start_date'  => $start->toDateString(),
                'end_date'    => $end->toDateString(),
                'report_type' => $reportType,
                'client'      => $client,
                'trace'       => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | DATE / FILTER NORMALIZATION
    |--------------------------------------------------------------------------
    */

    protected function normalizeDateRange(
        ?string $startDate,
        ?string $endDate
    ): array {
        try {
            $start = $startDate
                ? Carbon::parse($startDate)->startOfDay()
                : now()->startOfMonth();

            $end = $endDate
                ? Carbon::parse($endDate)->endOfDay()
                : now()->endOfDay();

            if ($start->gt($end)) {
                [$start, $end] = [$end, $start];
                $start = $start->copy()->startOfDay();
                $end   = $end->copy()->endOfDay();
            }

            return [$start, $end];
        } catch (\Throwable) {
            return [now()->startOfMonth(), now()->endOfDay()];
        }
    }

    protected function normalizeReportType(string $reportType): string
    {
        $allowed = [
            'All',
            'Operations',
            'Compliance',
            'Documents',
            'Job Orders',
            'Financial',
            'Billing',
            'Accounts Receivable',
            'Project',
        ];

        $value = trim($reportType);

        foreach ($allowed as $type) {
            if (strcasecmp($value, $type) === 0) {
                return $type;
            }
        }

        $aliases = [
            'contracts'   => 'Operations',
            'contract'    => 'Operations',
            'permits'     => 'Operations',
            'permit'      => 'Operations',
            'operational' => 'Operations',
            'job order'   => 'Job Orders',
            'job_orders'  => 'Job Orders',
            'document'    => 'Documents',
            'invoice'     => 'Billing',
            'invoices'    => 'Billing',
        ];

        $lower = strtolower($value);

        return $aliases[$lower] ?? 'All';
    }

    protected function normalizeClient(?string $client): ?string
    {
        if ($client === null) {
            return null;
        }

        $client = trim($client);

        if ($client === '') {
            return null;
        }

        $genericValues = [
            'all', 'all clients', 'all client',
            'multiple clients', 'client',
            'n/a', 'na', 'none', 'null', 'undefined',
        ];

        if (in_array(strtolower($client), $genericValues, true)) {
            return null;
        }

        return $client;
    }

    /*
    |--------------------------------------------------------------------------
    | SCHEMA HELPERS
    |--------------------------------------------------------------------------
    */

    /**
     * Memoized check for a column's existence in a table.
     */
    protected function hasColumn(string $table, string $column): bool
    {
        $key = "{$table}.{$column}";

        if (array_key_exists($key, $this->columnCache)) {
            return $this->columnCache[$key];
        }

        try {
            $exists = Schema::hasColumn($table, $column);
        } catch (\Throwable) {
            $exists = false;
        }

        return $this->columnCache[$key] = $exists;
    }

    /*
    |--------------------------------------------------------------------------
    | CLIENT FILTER
    |--------------------------------------------------------------------------
    */

    /**
     * Apply the client filter only when the target table supports it.
     *
     * The caller MUST pass the table name so we can check the schema.
     */
    protected function applyClientFilter(
        Builder $query,
        ?string $client,
        string $table
    ): Builder {
        $client = $this->normalizeClient($client);

        if (!$client) {
            return $query;
        }

        // 🔑 CRITICAL FIX: skip tables with no `client` column
        if (!$this->hasColumn($table, 'client')) {
            return $query;
        }

        return $query->whereRaw(
            'LOWER(TRIM(client)) = LOWER(TRIM(?))',
            [$client]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    protected function summary(
        Carbon $start,
        Carbon $end,
        string $reportType,
        ?string $client
    ): array {
        $invoices    = $this->invoiceQuery($start, $end, $client)->get();
        $payments    = $this->paymentQuery($start, $end, $client)->get();
        $jobOrders   = $this->jobOrderQuery($start, $end, $client)->get();
        $contracts   = $this->contractQuery($start, $end, $client)->get();
        $compliances = $this->complianceQuery($start, $end, $client)->get();
        $documents   = $this->documentQuery($start, $end, $client)->get();

        /* ---------- INVOICES ---------- */

        $invoiceTotal = (float) $invoices->sum(
            fn ($invoice) => $this->numericValue($invoice->amount ?? 0)
        );

        $invoicePaid = (float) $invoices
            ->filter(fn ($invoice) =>
                strtolower(trim((string) ($invoice->status ?? ''))) === 'paid'
            )
            ->sum(fn ($invoice) => $this->numericValue($invoice->amount ?? 0));

        $invoicePending = (float) $invoices
            ->filter(fn ($invoice) =>
                in_array(
                    strtolower(trim((string) ($invoice->status ?? ''))),
                    ['pending', 'received', 'partial'],
                    true
                )
            )
            ->sum(fn ($invoice) => $this->numericValue($invoice->amount ?? 0));

        /* ---------- PAYMENTS ---------- */

        $paymentTotal = (float) $payments->sum(
            fn ($payment) => $this->numericValue($payment->amount ?? 0)
        );

        $paymentPaid = (float) $payments
            ->filter(fn ($payment) =>
                strtolower(trim((string) ($payment->status ?? ''))) === 'paid'
            )
            ->sum(fn ($payment) => $this->numericValue($payment->amount ?? 0));

        $paymentPartial = (float) $payments
            ->filter(fn ($payment) =>
                strtolower(trim((string) ($payment->status ?? ''))) === 'partial'
            )
            ->sum(fn ($payment) => $this->numericValue($payment->amount ?? 0));

        $paymentPending = (float) $payments
            ->filter(fn ($payment) =>
                in_array(
                    strtolower(trim((string) ($payment->status ?? ''))),
                    ['pending', 'due', 'unpaid'],
                    true
                )
            )
            ->sum(fn ($payment) => $this->numericValue($payment->amount ?? 0));

        /* ---------- OUTSTANDING ---------- */

        $outstanding = max(0, $invoiceTotal - $paymentTotal);

        /* ---------- CONTRACTS ---------- */

        $contractStatusCounts = $this->statusCounts($contracts);

        $activeContracts = $contracts
            ->filter(fn ($contract) =>
                strtolower(trim((string) ($contract->status ?? ''))) === 'active'
            )
            ->count();

        $expiredContracts = $contracts
            ->filter(fn ($contract) =>
                strtolower(trim((string) ($contract->status ?? ''))) === 'expired'
            )
            ->count();

        $expiringContracts = $contracts
            ->filter(function ($contract) {
                $expiry = $this->resolveContractEndDate($contract);

                return $expiry
                    && $expiry->isFuture()
                    && $expiry->lte(now()->copy()->addDays(30));
            })
            ->count();

        /* ---------- COMPLIANCE ---------- */

        $complianceStatusCounts = $this->statusCounts($compliances);

        $complianceExpired = $compliances
            ->filter(fn ($item) =>
                strtolower(trim((string) ($item->status ?? ''))) === 'expired'
            )
            ->count();

        $complianceOverdue = $compliances
            ->filter(function ($item) {
                $dueDate = $this->resolveDate($item->due_date ?? null);

                if (!$dueDate) {
                    return false;
                }

                return $dueDate->lt(now())
                    && !in_array(
                        strtolower(trim((string) ($item->status ?? ''))),
                        ['completed', 'verified', 'compliant'],
                        true
                    );
            })
            ->count();

        $complianceExpiring = $compliances
            ->filter(function ($item) {
                $expiry = $this->resolveExpiryDate($item);

                return $expiry
                    && $expiry->isFuture()
                    && $expiry->lte(now()->copy()->addDays(30));
            })
            ->count();

        /* ---------- DOCUMENTS ---------- */

        $documentStatusCounts = $this->statusCounts($documents);

        $activeDocuments = $documents
            ->filter(fn ($document) =>
                strtolower(trim((string) ($document->status ?? ''))) === 'active'
            )
            ->count();

        $archivedDocuments = $documents
            ->filter(fn ($document) =>
                strtolower(trim((string) ($document->status ?? ''))) === 'archived'
                || !empty($document->archived_at)
            )
            ->count();

        $expiredDocuments = $documents
            ->filter(function ($document) {
                $expiry = $this->resolveExpiryDate($document);
                return $expiry && $expiry->lt(now());
            })
            ->count();

        $expiringDocuments = $documents
            ->filter(function ($document) {
                $expiry = $this->resolveExpiryDate($document);

                return $expiry
                    && $expiry->isFuture()
                    && $expiry->lte(now()->copy()->addDays(30));
            })
            ->count();

        $lockedDocuments = $documents
            ->filter(fn ($document) => (bool) ($document->is_locked ?? false))
            ->count();

        /* ---------- JOB ORDERS ---------- */

        $jobOrderAmount = (float) $jobOrders->sum(
            fn ($jobOrder) => $this->numericValue($jobOrder->amount ?? 0)
        );

        $jobOrderStatusCounts = $this->statusCounts($jobOrders);

        /* ---------- TOTAL ---------- */

        $totalRecords =
            $invoices->count()
            + $payments->count()
            + $jobOrders->count()
            + $contracts->count()
            + $compliances->count()
            + $documents->count();

        return [
            'report_type' => $reportType,
            'client'      => $client,

            'date_range' => [
                'start_date' => $start->toDateString(),
                'end_date'   => $end->toDateString(),
            ],

            'counts' => [
                'invoices'      => $invoices->count(),
                'payments'      => $payments->count(),
                'job_orders'    => $jobOrders->count(),
                'contracts'     => $contracts->count(),
                'compliances'   => $compliances->count(),
                'documents'     => $documents->count(),
                'total_records' => $totalRecords,
            ],

            'financial' => [
                'invoice_total'    => round($invoiceTotal, 2),
                'payment_total'    => round($paymentTotal, 2),
                'job_order_total'  => round($jobOrderAmount, 2),
                'outstanding'      => round($outstanding, 2),
                'invoice_paid'     => round($invoicePaid, 2),
                'invoice_pending'  => round($invoicePending, 2),
                'payment_paid'     => round($paymentPaid, 2),
                'payment_partial'  => round($paymentPartial, 2),
                'payment_pending'  => round($paymentPending, 2),
            ],

            'contracts' => [
                'total'    => $contracts->count(),
                'active'   => $activeContracts,
                'expiring' => $expiringContracts,
                'expired'  => $expiredContracts,
                'statuses' => $contractStatusCounts,
            ],

            'compliance' => [
                'total'    => $compliances->count(),
                'expired'  => $complianceExpired,
                'overdue'  => $complianceOverdue,
                'expiring' => $complianceExpiring,
                'statuses' => $complianceStatusCounts,
            ],

            'documents' => [
                'total'    => $documents->count(),
                'active'   => $activeDocuments,
                'archived' => $archivedDocuments,
                'expired'  => $expiredDocuments,
                'expiring' => $expiringDocuments,
                'locked'   => $lockedDocuments,
                'unlocked' => max(0, $documents->count() - $lockedDocuments),
                'statuses' => $documentStatusCounts,
            ],

            'job_orders' => [
                'total'    => $jobOrders->count(),
                'amount'   => round($jobOrderAmount, 2),
                'statuses' => $jobOrderStatusCounts,
            ],

            'invoice_statuses' => $this->statusCounts($invoices),
            'payment_statuses' => $this->statusCounts($payments),
            'payment_methods'  => $this->valueCounts($payments, 'payment_method'),
            'contract_types'   => $this->valueCounts($contracts, 'type', 'contract_type'),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL ANALYTICS
    |--------------------------------------------------------------------------
    */

    protected function financialAnalytics(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        $invoices  = $this->invoiceQuery($start, $end, $client)->get();
        $payments  = $this->paymentQuery($start, $end, $client)->get();
        $jobOrders = $this->jobOrderQuery($start, $end, $client)->get();

        $invoiceTotal = (float) $invoices->sum(
            fn ($invoice) => $this->numericValue($invoice->amount ?? 0)
        );

        $paymentTotal = (float) $payments->sum(
            fn ($payment) => $this->numericValue($payment->amount ?? 0)
        );

        $jobOrderTotal = (float) $jobOrders->sum(
            fn ($jobOrder) => $this->numericValue($jobOrder->amount ?? 0)
        );

        $outstanding = max(0, $invoiceTotal - $paymentTotal);

        return [
            'invoice_total'   => round($invoiceTotal, 2),
            'payment_total'   => round($paymentTotal, 2),
            'job_order_total' => round($jobOrderTotal, 2),
            'outstanding'     => round($outstanding, 2),

            'collection_rate' => $invoiceTotal > 0
                ? round(min(100, ($paymentTotal / $invoiceTotal) * 100), 2)
                : 0,

            'invoice_count'    => $invoices->count(),
            'payment_count'    => $payments->count(),
            'job_order_count'  => $jobOrders->count(),

            'invoice_statuses' => $this->statusCounts($invoices),
            'payment_statuses' => $this->statusCounts($payments),
            'payment_methods'  => $this->valueCounts($payments, 'payment_method'),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | OPERATIONAL ANALYTICS
    |--------------------------------------------------------------------------
    */

    protected function operationalAnalytics(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        $contracts   = $this->contractQuery($start, $end, $client)->get();
        $compliances = $this->complianceQuery($start, $end, $client)->get();
        $documents   = $this->documentQuery($start, $end, $client)->get();
        $jobOrders   = $this->jobOrderQuery($start, $end, $client)->get();

        return [
            'contracts' => [
                'total'    => $contracts->count(),
                'statuses' => $this->statusCounts($contracts),
                'types'    => $this->valueCounts($contracts, 'type', 'contract_type'),
            ],

            'compliance' => [
                'total'    => $compliances->count(),
                'statuses' => $this->statusCounts($compliances),
                'types'    => $this->valueCounts($compliances, 'type'),
            ],

            'documents' => [
                'total'    => $documents->count(),
                'statuses' => $this->statusCounts($documents),
                'types'    => $this->valueCounts($documents, 'type', 'document_type'),
                'locked'   => $documents
                    ->filter(fn ($document) => (bool) ($document->is_locked ?? false))
                    ->count(),
            ],

            'job_orders' => [
                'total'    => $jobOrders->count(),
                'statuses' => $this->statusCounts($jobOrders),
            ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | HISTORICAL TRENDS
    |--------------------------------------------------------------------------
    */

    protected function historicalTrends(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        $months = [];

        $cursor    = $start->copy()->startOfMonth();
        $lastMonth = $end->copy()->startOfMonth();

        while ($cursor->lte($lastMonth)) {
            $monthStart = $cursor->copy()->startOfMonth();
            $monthEnd   = $cursor->copy()->endOfMonth();

            if ($monthStart->lt($start)) {
                $monthStart = $start->copy();
            }

            if ($monthEnd->gt($end)) {
                $monthEnd = $end->copy();
            }

            $invoices    = $this->invoiceQuery($monthStart, $monthEnd, $client)->get();
            $payments    = $this->paymentQuery($monthStart, $monthEnd, $client)->get();
            $jobOrders   = $this->jobOrderQuery($monthStart, $monthEnd, $client)->get();
            $contracts   = $this->contractQuery($monthStart, $monthEnd, $client)->get();
            $compliances = $this->complianceQuery($monthStart, $monthEnd, $client)->get();
            $documents   = $this->documentQuery($monthStart, $monthEnd, $client)->get();

            $invoiceAmount = (float) $invoices->sum(
                fn ($invoice) => $this->numericValue($invoice->amount ?? 0)
            );

            $paymentAmount = (float) $payments->sum(
                fn ($payment) => $this->numericValue($payment->amount ?? 0)
            );

            $jobOrderAmount = (float) $jobOrders->sum(
                fn ($jobOrder) => $this->numericValue($jobOrder->amount ?? 0)
            );

            $months[] = [
                'month'            => $cursor->format('Y-m'),
                'label'            => $cursor->format('M Y'),
                'invoices'         => $invoices->count(),
                'payments'         => $payments->count(),
                'job_orders'       => $jobOrders->count(),
                'contracts'        => $contracts->count(),
                'compliances'      => $compliances->count(),
                'documents'        => $documents->count(),
                'invoice_amount'   => round($invoiceAmount, 2),
                'payment_amount'   => round($paymentAmount, 2),
                'job_order_amount' => round($jobOrderAmount, 2),
            ];

            $cursor->addMonth();
        }

        $paymentValues = collect($months)
            ->pluck('payment_amount')
            ->map(fn ($value) => (float) $value)
            ->values();

        $direction = 'stable';

        if ($paymentValues->count() >= 2) {
            $latest   = (float) $paymentValues->last();
            $previous = (float) $paymentValues[$paymentValues->count() - 2];

            if ($latest > $previous) {
                $direction = 'up';
            } elseif ($latest < $previous) {
                $direction = 'down';
            }
        }

        return [
            'months'       => $months,
            'direction'    => $direction,
            'months_count' => count($months),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | FUTURE PROJECTIONS
    |--------------------------------------------------------------------------
    */

    protected function futureProjections(array $trends): array
    {
        $months = collect($trends['months'] ?? []);

        if ($months->count() < 2) {
            return [
                'available'     => false,
                'reason'        => 'Not enough historical data.',
                'next_month'    => null,
                'next_3_months' => [],
            ];
        }

        $paymentHistory = $months
            ->pluck('payment_amount')
            ->map(fn ($value) => (float) $value)
            ->values();

        $invoiceHistory = $months
            ->pluck('invoice_amount')
            ->map(fn ($value) => (float) $value)
            ->values();

        $jobOrderHistory = $months
            ->pluck('job_order_amount')
            ->map(fn ($value) => (float) $value)
            ->values();

        $nextPayment  = $this->projectNextValue($paymentHistory);
        $nextInvoice  = $this->projectNextValue($invoiceHistory);
        $nextJobOrder = $this->projectNextValue($jobOrderHistory);

        $lastMonth     = $months->last();
        $nextMonthDate = Carbon::createFromFormat('Y-m', $lastMonth['month'])->addMonth();

        $nextThreeMonths = [];

        for ($i = 1; $i <= 3; $i++) {
            $month = $nextMonthDate->copy()->addMonths($i - 1);

            $nextThreeMonths[] = [
                'month'            => $month->format('Y-m'),
                'label'            => $month->format('M Y'),
                'payment_amount'   => round($nextPayment, 2),
                'invoice_amount'   => round($nextInvoice, 2),
                'job_order_amount' => round($nextJobOrder, 2),
            ];
        }

        return [
            'available' => true,
            'method'    => 'Historical weighted projection',
            'note'      => 'Projection based on historical database records. Future values are estimates, not guaranteed results.',

            'next_month' => [
                'month'            => $nextMonthDate->format('Y-m'),
                'label'            => $nextMonthDate->format('M Y'),
                'payment_amount'   => round($nextPayment, 2),
                'invoice_amount'   => round($nextInvoice, 2),
                'job_order_amount' => round($nextJobOrder, 2),
            ],

            'next_3_months' => $nextThreeMonths,
        ];
    }

    protected function projectNextValue(Collection $values): float
    {
        $values = $values
            ->map(fn ($value) => (float) $value)
            ->values();

        if ($values->isEmpty()) {
            return 0;
        }

        $average = (float) $values->avg();
        $latest  = (float) $values->last();

        return max(0, ($average * 0.40) + ($latest * 0.60));
    }

    /*
    |--------------------------------------------------------------------------
    | UPCOMING EXPIRATIONS
    |--------------------------------------------------------------------------
    */

    protected function upcomingExpirations(
        ?string $client = null,
        int $days = 30
    ): array {
        $now   = now();
        $until = $now->copy()->addDays($days);

        /* ---------- DOCUMENTS ---------- */

        $documentsQuery = Document::query()
            ->whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [
                $now->copy()->startOfDay(),
                $until->copy()->endOfDay(),
            ]);

        $this->applyClientFilter($documentsQuery, $client, 'documents');

        $documents = $documentsQuery->get();

        /* ---------- COMPLIANCE ---------- */

        $complianceQuery = Compliance::query()
            ->where(function ($query) use ($now, $until) {
                $query
                    ->whereBetween('expiry_date', [
                        $now->copy()->startOfDay(),
                        $until->copy()->endOfDay(),
                    ])
                    ->orWhereBetween('due_date', [
                        $now->copy()->startOfDay(),
                        $until->copy()->endOfDay(),
                    ]);
            });

        $this->applyClientFilter($complianceQuery, $client, 'compliances');

        $compliances = $complianceQuery->get();

        /* ---------- CONTRACTS ---------- */

        $contractsQuery = Contract::query()
            ->whereNotNull('end_date')
            ->whereBetween('end_date', [
                $now->copy()->startOfDay(),
                $until->copy()->endOfDay(),
            ]);

        $this->applyClientFilter($contractsQuery, $client, 'contracts');

        $contracts = $contractsQuery->orderBy('end_date')->get();

        return [
            'days'   => $days,
            'client' => $client,

            'documents' => $documents
                ->map(fn ($document) => [
                    'id'          => $document->id,
                    'title'       => $document->title
                        ?? $document->file_name
                        ?? 'Document',
                    'expiry_date' => $this->formatDate($document->expiry_date ?? null),
                    'status'      => $document->status
                        ?? $document->compliance_status
                        ?? null,
                ])
                ->values()
                ->all(),

            'compliance' => $compliances
                ->map(fn ($item) => [
                    'id'          => $item->id,
                    'title'       => $item->title ?? 'Compliance Record',
                    'due_date'    => $this->formatDate($item->due_date ?? null),
                    'expiry_date' => $this->formatDate($item->expiry_date ?? null),
                    'status'      => $item->status ?? null,
                ])
                ->values()
                ->all(),

            'contracts' => $contracts
                ->map(fn ($contract) => [
                    'id'          => $contract->id,
                    'client'      => $contract->client ?? null,
                    'contract_no' => $contract->contract_no
                        ?? $contract->contract_number
                        ?? null,
                    'type'        => $contract->type
                        ?? $contract->contract_type
                        ?? null,
                    'start_date'  => $this->formatDate($contract->start_date ?? null),
                    'end_date'    => $this->formatDate($contract->end_date ?? null),
                    'expiry_date' => $this->formatDate($contract->end_date ?? null),
                    'status'      => $contract->status ?? null,
                ])
                ->values()
                ->all(),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | RECORDS
    |--------------------------------------------------------------------------
    */

    protected function records(
        Carbon $start,
        Carbon $end,
        string $reportType,
        ?string $client
    ): array {
        return match ($reportType) {
            'Financial' => [
                'invoices' => $this->invoiceRecords($start, $end, $client),
                'payments' => $this->paymentRecords($start, $end, $client),
            ],

            'Billing' => [
                'invoices' => $this->invoiceRecords($start, $end, $client),
            ],

            'Project' => [
                'job_orders' => $this->jobOrderRecords($start, $end, $client),
            ],

            'Accounts Receivable' => [
                'invoices' => $this->invoiceRecords($start, $end, $client),
                'payments' => $this->paymentRecords($start, $end, $client),
            ],

            'Compliance' => [
                'compliance' => $this->complianceRecords($start, $end, $client),
                'documents'  => $this->documentRecords($start, $end, $client),
            ],

            'Operations' => [
                'contracts' => $this->contractRecords($start, $end, $client),
                'job_orders' => $this->jobOrderRecords($start, $end, $client),
            ],

            'Documents' => [
                'documents' => $this->documentRecords($start, $end, $client),
            ],

            'Job Orders' => [
                'job_orders' => $this->jobOrderRecords($start, $end, $client),
            ],

            default => [
                'invoices'   => $this->invoiceRecords($start, $end, $client),
                'payments'   => $this->paymentRecords($start, $end, $client),
                'job_orders' => $this->jobOrderRecords($start, $end, $client),
                'contracts'  => $this->contractRecords($start, $end, $client),
                'compliance' => $this->complianceRecords($start, $end, $client),
                'documents'  => $this->documentRecords($start, $end, $client),
            ],
        };
    }

    /*
    |--------------------------------------------------------------------------
    | RECORD MAPPERS
    |--------------------------------------------------------------------------
    */

    protected function invoiceRecords(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        return $this->invoiceQuery($start, $end, $client)
            ->latest('created_at')
            ->get()
            ->map(fn ($invoice) => [
                'id'           => $invoice->id,
                'number'       => $invoice->number ?? $invoice->invoice_number ?? null,
                'client'       => $invoice->client ?? null,
                'client_email' => $invoice->client_email ?? null,
                'project'      => $invoice->project ?? null,
                'amount'       => round($this->numericValue($invoice->amount ?? 0), 2),
                'status'       => $invoice->status ?? null,
                'due_date'     => $this->formatDate($invoice->due_date ?? null),
                'created_at'   => $this->formatDateTime($invoice->created_at ?? null),
            ])
            ->values()
            ->all();
    }

    protected function paymentRecords(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        return $this->paymentQuery($start, $end, $client)
            ->latest('created_at')
            ->get()
            ->map(fn ($payment) => [
                'id'             => $payment->id,
                'client'         => $payment->client ?? null,
                'invoice_number' => $payment->invoice_number ?? null,
                'amount'         => round($this->numericValue($payment->amount ?? 0), 2),
                'payment_method' => $payment->payment_method ?? null,
                'status'         => $payment->status ?? null,
                'payment_date'   => $this->formatDate($payment->payment_date ?? null),
                'partial_date'   => $this->formatDate($payment->partial_date ?? null),
                'created_at'     => $this->formatDateTime($payment->created_at ?? null),
            ])
            ->values()
            ->all();
    }

    protected function jobOrderRecords(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        return $this->jobOrderQuery($start, $end, $client)
            ->latest('created_at')
            ->get()
            ->map(fn ($jobOrder) => [
                'id'         => $jobOrder->id,
                'number'     => $jobOrder->number ?? $jobOrder->job_order_number ?? null,
                'client'     => $jobOrder->client ?? null,
                'project'    => $jobOrder->project ?? null,
                'location'   => $jobOrder->location ?? null,
                'equipment'  => $jobOrder->equipment ?? null,
                'operator'   => $jobOrder->operator ?? null,
                'start_date' => $this->formatDate($jobOrder->start_date ?? null),
                'end_date'   => $this->formatDate($jobOrder->end_date ?? null),
                'amount'     => round($this->numericValue($jobOrder->amount ?? 0), 2),
                'status'     => $jobOrder->status ?? null,
                'created_at' => $this->formatDateTime($jobOrder->created_at ?? null),
            ])
            ->values()
            ->all();
    }

    protected function contractRecords(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        return $this->contractQuery($start, $end, $client)
            ->latest('created_at')
            ->get()
            ->map(fn ($contract) => [
                'id'                  => $contract->id,
                'client'              => $contract->client ?? null,
                'contract_no'         => $contract->contract_no
                    ?? $contract->contract_number
                    ?? null,
                'type'                => $contract->type
                    ?? $contract->contract_type
                    ?? null,
                'project'             => $contract->project ?? null,
                'location'            => $contract->location ?? null,
                'equipment'           => $contract->equipment ?? null,
                'start_date'          => $this->formatDate($contract->start_date ?? null),
                'end_date'            => $this->formatDate($contract->end_date ?? null),
                'status'              => $contract->status ?? null,
                'workflow_status'     => $contract->workflow_status ?? null,
                'is_invoice_approved' => (bool) ($contract->is_invoice_approved ?? false),
                'created_at'          => $this->formatDateTime($contract->created_at ?? null),
            ])
            ->values()
            ->all();
    }

    protected function complianceRecords(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        return $this->complianceQuery($start, $end, $client)
            ->latest('created_at')
            ->get()
            ->map(fn ($item) => [
                'id'                  => $item->id,
                'title'               => $item->title ?? null,
                'type'                => $item->type ?? null,
                'status'              => $item->status ?? null,
                'priority'            => $item->priority ?? null,
                'progress_percentage' => $this->numericValue($item->progress_percentage ?? 0),
                'due_date'            => $this->formatDate($item->due_date ?? null),
                'expiry_date'         => $this->formatDate($item->expiry_date ?? null),
                'regulatory_body'     => $item->regulatory_body ?? null,
                'reference_number'    => $item->reference_number ?? null,
                'monitoring_status'   => $item->monitoring_status ?? null,
                'created_at'          => $this->formatDateTime($item->created_at ?? null),
            ])
            ->values()
            ->all();
    }

    protected function documentRecords(
        Carbon $start,
        Carbon $end,
        ?string $client
    ): array {
        return $this->documentQuery($start, $end, $client)
            ->latest('created_at')
            ->get()
            ->map(fn ($document) => [
                'id'                => $document->id,
                'title'             => $document->title ?? null,
                'file_name'         => $document->file_name ?? null,
                'type'              => $document->type
                    ?? $document->document_type
                    ?? null,
                'status'            => $document->status ?? null,
                'compliance_status' => $document->compliance_status ?? null,
                'is_locked'         => (bool) ($document->is_locked ?? false),
                'expiry_date'       => $this->formatDate($document->expiry_date ?? null),
                'review_date'       => $this->formatDate($document->review_date ?? null),
                'retention_period'  => $document->retention_period ?? null,
                'retention_date'    => $this->formatDate($document->retention_date ?? null),
                'regulatory_body'   => $document->regulatory_body ?? null,
                'reference_number'  => $document->reference_number ?? null,
                'created_at'        => $this->formatDateTime($document->created_at ?? null),
            ])
            ->values()
            ->all();
    }

    /*
    |--------------------------------------------------------------------------
    | DATABASE QUERIES
    |--------------------------------------------------------------------------
    */

    protected function invoiceQuery(
        Carbon $start,
        Carbon $end,
        ?string $client = null
    ): Builder {
        $query = Invoice::query()
            ->whereBetween('created_at', [$start, $end]);

        return $this->applyClientFilter($query, $client, 'invoices');
    }

    protected function paymentQuery(
        Carbon $start,
        Carbon $end,
        ?string $client = null
    ): Builder {
        $query = Payment::query()
            ->where(function ($q) use ($start, $end) {
                $q
                    ->whereBetween('payment_date', [$start, $end])
                    ->orWhereBetween('partial_date', [$start, $end])
                    ->orWhere(function ($sub) use ($start, $end) {
                        $sub
                            ->whereNull('payment_date')
                            ->whereNull('partial_date')
                            ->whereBetween('created_at', [$start, $end]);
                    });
            });

        return $this->applyClientFilter($query, $client, 'payments');
    }

    protected function contractQuery(
        Carbon $start,
        Carbon $end,
        ?string $client = null
    ): Builder {
        $query = Contract::query()
            ->where(function ($q) use ($start, $end) {
                $q
                    ->where(function ($sub) use ($start, $end) {
                        $sub
                            ->whereNotNull('start_date')
                            ->whereNotNull('end_date')
                            ->where('start_date', '<=', $end)
                            ->where('end_date', '>=', $start);
                    })
                    ->orWhereBetween('created_at', [$start, $end]);
            });

        return $this->applyClientFilter($query, $client, 'contracts');
    }

    protected function complianceQuery(
        Carbon $start,
        Carbon $end,
        ?string $client = null
    ): Builder {
        $query = Compliance::query()
            ->where(function ($q) use ($start, $end) {
                $q
                    ->whereBetween('created_at', [$start, $end])
                    ->orWhereBetween('due_date', [$start, $end])
                    ->orWhereBetween('expiry_date', [$start, $end]);
            });

        // 🔑 SAFE: compliances has no `client` column — filter is skipped automatically
        return $this->applyClientFilter($query, $client, 'compliances');
    }

    protected function documentQuery(
        Carbon $start,
        Carbon $end,
        ?string $client = null
    ): Builder {
        $query = Document::query()
            ->where(function ($q) use ($start, $end) {
                $q
                    ->whereBetween('created_at', [$start, $end])
                    ->orWhereBetween('expiry_date', [$start, $end])
                    ->orWhereBetween('review_date', [$start, $end]);
            });

        // 🔑 SAFE: documents has no `client` column — filter is skipped automatically
        return $this->applyClientFilter($query, $client, 'documents');
    }

    protected function jobOrderQuery(
        Carbon $start,
        Carbon $end,
        ?string $client = null
    ): Builder {
        $query = JobOrder::query()
            ->where(function ($q) use ($start, $end) {
                $q
                    ->where(function ($sub) use ($start, $end) {
                        $sub
                            ->whereNotNull('start_date')
                            ->whereNotNull('end_date')
                            ->where('start_date', '<=', $end)
                            ->where('end_date', '>=', $start);
                    })
                    ->orWhereBetween('created_at', [$start, $end]);
            });

        return $this->applyClientFilter($query, $client, 'job_orders');
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS / VALUE HELPERS
    |--------------------------------------------------------------------------
    */

    protected function statusCounts(Collection $collection): array
    {
        return $collection
            ->groupBy(fn ($item) =>
                trim((string) ($item->status ?? 'Unknown')) ?: 'Unknown'
            )
            ->map(fn ($items) => $items->count())
            ->sortDesc()
            ->toArray();
    }

    protected function valueCounts(
        Collection $collection,
        string $primaryField,
        ?string $fallbackField = null
    ): array {
        return $collection
            ->map(function ($item) use ($primaryField, $fallbackField) {
                $value = $item->{$primaryField} ?? null;

                if (($value === null || $value === '') && $fallbackField) {
                    $value = $item->{$fallbackField} ?? null;
                }

                return trim((string) ($value ?: 'Unknown'));
            })
            ->groupBy(fn ($value) => $value)
            ->map(fn ($items) => $items->count())
            ->sortDesc()
            ->toArray();
    }

    /*
    |--------------------------------------------------------------------------
    | NUMERIC / DATE HELPERS
    |--------------------------------------------------------------------------
    */

    protected function numericValue(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        $clean = preg_replace('/[^0-9.\-]/', '', (string) $value);

        return is_numeric($clean) ? (float) $clean : 0;
    }

    protected function resolveDate(mixed $value): ?Carbon
    {
        if (!$value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    protected function resolveExpiryDate(mixed $model): ?Carbon
    {
        if (!$model) {
            return null;
        }

        foreach (['expiry_date', 'due_date'] as $field) {
            if (isset($model->{$field}) && $model->{$field}) {
                $date = $this->resolveDate($model->{$field});

                if ($date) {
                    return $date;
                }
            }
        }

        return null;
    }

    protected function resolveContractEndDate(mixed $contract): ?Carbon
    {
        if (!$contract) {
            return null;
        }

        return $this->resolveDate($contract->end_date ?? null);
    }

    protected function formatDate(mixed $value): ?string
    {
        return $this->resolveDate($value)?->toDateString();
    }

    protected function formatDateTime(mixed $value): ?string
    {
        return $this->resolveDate($value)?->toDateTimeString();
    }
}
