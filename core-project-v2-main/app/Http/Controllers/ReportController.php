<?php

namespace App\Http\Controllers;

use App\Models\Compliance;
use App\Models\Contract;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\JobOrder;
use App\Models\Payment;
use App\Models\Report;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    protected ReportService $reportService;

    protected array $columnCache = [];

    protected array $clientColumnMap = [
        'invoices'    => 'client',
        'payments'    => 'client',
        'job_orders'  => 'client',
        'contracts'   => 'client',
        'compliances' => null,
        'documents'   => null,
    ];

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        return inertia('User/Reports');
    }

    /*
    |--------------------------------------------------------------------------
    | LIVE REPORT DATA
    |--------------------------------------------------------------------------
    */

    public function data(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date'  => ['nullable', 'date'],
            'end_date'    => ['nullable', 'date'],
            'report_type' => ['nullable', 'string', 'max:100'],
            'client'      => ['nullable', 'string', 'max:255'],
        ]);

        $startDate = $validated['start_date']
            ?? now()->startOfMonth()->toDateString();

        $endDate = $validated['end_date']
            ?? now()->endOfDay()->toDateString();

        $reportType = $this->normalizeReportType(
            $validated['report_type'] ?? 'All'
        );

        $client = $this->normalizeClient(
            $validated['client'] ?? null
        );

        $data = $this->reportService->generate(
            $startDate,
            $endDate,
            $reportType,
            $client
        );

        return response()->json([
            'success'       => true,
            'data'          => $data,
            'records'       => $data['records']       ?? [],
            'record_counts' => $data['record_counts'] ?? [],
            'summary'       => $data['summary']       ?? [],
            'financial'     => $data['financial']     ?? [],
            'operational'   => $data['operational']   ?? [],
            'trends'        => $data['trends']        ?? [],
            'projections'   => $data['projections']   ?? [],
            'expirations'   => $data['expirations']   ?? [],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE REPORT (no save)
    |--------------------------------------------------------------------------
    */

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date'  => ['required', 'date'],
            'end_date'    => ['required', 'date'],
            'report_type' => ['nullable', 'string', 'max:100'],
            'type'        => ['nullable', 'string', 'max:100'],
            'client'      => ['nullable', 'string', 'max:255'],
        ]);

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate   = Carbon::parse($validated['end_date'])->endOfDay();

        $reportType = $this->normalizeReportType(
            $validated['report_type']
            ?? $validated['type']
            ?? 'All'
        );

        $client = $this->normalizeClient(
            $validated['client'] ?? null
        );

        $data = $this->reportService->generate(
            $startDate->toDateString(),
            $endDate->toDateString(),
            $reportType,
            $client
        );

        return response()->json([
            'success'       => true,
            'message'       => 'Report generated successfully.',
            'data'          => $data,
            'records'       => $data['records']       ?? [],
            'record_counts' => $data['record_counts'] ?? [],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE REPORT
    |--------------------------------------------------------------------------
    */

    public function save(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => ['nullable', 'string', 'max:255'],
            'type'         => ['nullable', 'string', 'max:100'],
            'report_type'  => ['nullable', 'string', 'max:100'],
            'start_date'   => ['required', 'date'],
            'end_date'     => ['required', 'date'],
            'client'       => ['nullable', 'string', 'max:255'],
            'ai_generated' => ['nullable', 'boolean'],
        ]);

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate   = Carbon::parse($validated['end_date'])->endOfDay();

        if ($startDate->gt($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
            $startDate = $startDate->copy()->startOfDay();
            $endDate   = $endDate->copy()->endOfDay();
        }

        $reportType = $this->normalizeReportType(
            $validated['type']
            ?? $validated['report_type']
            ?? 'All'
        );

        $client = $this->normalizeClient(
            $validated['client'] ?? null
        );

        $generatedData = $this->reportService->generate(
            $startDate->toDateString(),
            $endDate->toDateString(),
            $reportType,
            $client
        );

        $clientName = $client ?? 'All Clients';

        $reportName = trim((string) ($validated['name'] ?? ''));

        if ($reportName === '') {
            $reportName = "{$clientName} report";
        }

        $report = Report::create([
            'name'         => $reportName,
            'type'         => $reportType,
            'start_date'   => $startDate->toDateString(),
            'end_date'     => $endDate->toDateString(),
            'client'       => $clientName,
            'created_by'   => Auth::id(),
            'ai_generated' => (bool) ($validated['ai_generated'] ?? false),
            'content'      => json_encode(
                $generatedData,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
        ]);

        $report->load('user');

        $reportPayload = $this->mapSavedReport($report, $generatedData);

        return response()->json([
            'success'       => true,
            'message'       => "{$reportName} created successfully.",
            'report'        => $reportPayload,
            'records'       => $generatedData['records']       ?? [],
            'record_counts' => $generatedData['record_counts'] ?? [],
            'summary'       => $generatedData['summary']       ?? [],
            'financial'     => $generatedData['financial']     ?? [],
            'operational'   => $generatedData['operational']   ?? [],
            'trends'        => $generatedData['trends']        ?? [],
            'projections'   => $generatedData['projections']   ?? [],
            'expirations'   => $generatedData['expirations']   ?? [],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | MONTHLY TRENDS
    |--------------------------------------------------------------------------
    */

    public function monthly(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date'   => ['nullable', 'date'],
            'client'     => ['nullable', 'string', 'max:255'],
        ]);

        $startDate = Carbon::parse(
            $validated['start_date']
            ?? now()->subMonths(5)->startOfMonth()->toDateString()
        )->startOfDay();

        $endDate = Carbon::parse(
            $validated['end_date']
            ?? now()->endOfDay()->toDateString()
        )->endOfDay();

        $client = $this->normalizeClient($validated['client'] ?? null);

        $data = $this->reportService->generate(
            $startDate->toDateString(),
            $endDate->toDateString(),
            'All',
            $client
        );

        return response()->json([
            'success'     => true,
            'months'      => $data['trends']['months']       ?? [],
            'direction'   => $data['trends']['direction']    ?? 'stable',
            'projections' => $data['projections']            ?? [],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | EXPIRATIONS
    |--------------------------------------------------------------------------
    */

    public function expirations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days'   => ['nullable', 'integer', 'min:1', 'max:365'],
            'client' => ['nullable', 'string', 'max:255'],
        ]);

        $days = (int) ($validated['days'] ?? 30);

        $client = $this->normalizeClient($validated['client'] ?? null);

        $data = $this->reportService->generate(
            now()->startOfMonth()->toDateString(),
            now()->endOfDay()->toDateString(),
            'All',
            $client
        );

        $expirations = $data['expirations'] ?? [];
        $expirations['days'] = $days;

        return response()->json([
            'success'     => true,
            'data'        => $expirations,
            'expirations' => $expirations,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | AI SUMMARY DATA
    |--------------------------------------------------------------------------
    */

    public function aiSummaryData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date'  => ['nullable', 'date'],
            'end_date'    => ['nullable', 'date'],
            'report_type' => ['nullable', 'string', 'max:100'],
            'client'      => ['nullable', 'string', 'max:255'],
        ]);

        $startDate = $validated['start_date']
            ?? now()->startOfMonth()->toDateString();

        $endDate = $validated['end_date']
            ?? now()->endOfDay()->toDateString();

        $reportType = $this->normalizeReportType(
            $validated['report_type'] ?? 'All'
        );

        $client = $this->normalizeClient($validated['client'] ?? null);

        $data = $this->reportService->generate(
            $startDate,
            $endDate,
            $reportType,
            $client
        );

        return response()->json([
            'success'       => true,
            'summary'       => $data['summary']       ?? [],
            'financial'     => $data['financial']     ?? [],
            'operational'   => $data['operational']   ?? [],
            'trends'        => $data['trends']        ?? [],
            'projections'   => $data['projections']   ?? [],
            'record_counts' => $data['record_counts'] ?? [],
            'records'       => $data['records']       ?? [],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | FILTER OPTIONS
    |--------------------------------------------------------------------------
    */

    public function filterOptions(): JsonResponse
    {
        $clients = collect();

        $clients = $clients->merge(
            Invoice::query()
                ->whereNotNull('client')
                ->pluck('client')
        );

        $clients = $clients->merge(
            Payment::query()
                ->whereNotNull('client')
                ->pluck('client')
        );

        $clients = $clients->merge(
            JobOrder::query()
                ->whereNotNull('client')
                ->pluck('client')
        );

        $clients = $clients->merge(
            Contract::query()
                ->whereNotNull('client')
                ->pluck('client')
        );

        if ($this->hasColumn('compliances', 'client')) {
            $clients = $clients->merge(
                Compliance::query()
                    ->whereNotNull('client')
                    ->pluck('client')
            );
        }

        if ($this->hasColumn('documents', 'client')) {
            $clients = $clients->merge(
                Document::query()
                    ->whereNotNull('client')
                    ->pluck('client')
            );
        }

        $clients = $clients
            ->map(fn ($client) => trim((string) $client))
            ->filter(fn ($client) => $client !== '')
            ->unique(fn ($client) => strtolower($client))
            ->sort(fn ($a, $b) => strcasecmp($a, $b))
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'clients' => $clients,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | LIST SAVED REPORTS — FILTERED BY CURRENT USER
    |--------------------------------------------------------------------------
    |
    | Ang staff ay makikita lang ang SARILING reports (created_by = Auth::id()).
    | Hindi makikita ang reports ng ibang staff o ng admin.
    |
    */

    public function list(Request $request): JsonResponse
    {
        // ✅ FILTERED BY CURRENT USER — sarili lang ni staff ang makikita
        $query = Report::query()
            ->where('created_by', Auth::id())
            ->with('user')
            ->latest('created_at');

        $requestedClient = $this->normalizeClient(
            $request->input('client')
        );

        if ($requestedClient) {
            $query->whereRaw(
                'LOWER(TRIM(client)) = LOWER(TRIM(?))',
                [$requestedClient]
            );
        }

        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');

        if ($startDate) {
            try {
                $startDate = Carbon::parse($startDate)->toDateString();
                $query->whereDate('start_date', '>=', $startDate);
            } catch (\Throwable) {
                // Ignore invalid optional date.
            }
        }

        if ($endDate) {
            try {
                $endDate = Carbon::parse($endDate)->toDateString();
                $query->whereDate('end_date', '<=', $endDate);
            } catch (\Throwable) {
                // Ignore invalid optional date.
            }
        }

        $reports = $query
            ->get()
            ->map(function (Report $report) {
                $content = $this->decodeContent($report->content);
                return $this->mapSavedReport($report, $content);
            })
            ->values();

        return response()->json([
            'success' => true,
            'reports' => $reports,
            'data'    => $reports,
            'total'   => $reports->count(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | VIEW SINGLE REPORT — WITH OWNER CHECK
    |--------------------------------------------------------------------------
    */

    public function show(Report $report): JsonResponse
    {
        // ✅ OWNER CHECK — sariling report lang pwedeng i-view
        if ((int) $report->created_by !== (int) Auth::id()) {
            abort(403, 'You can only view your own reports.');
        }

        $content = $this->decodeContent($report->content);

        $client = $this->normalizeClient($report->client);

        $liveData = $this->reportService->generate(
            $report->start_date?->toDateString(),
            $report->end_date?->toDateString(),
            $report->type ?? 'All',
            $client
        );

        return response()->json([
            'success'       => true,
            'report'        => $this->mapSavedReport($report, $content, $liveData),
            'records'       => $liveData['records']       ?? [],
            'record_counts' => $liveData['record_counts'] ?? [],
            'summary'       => $liveData['summary']       ?? [],
            'financial'     => $liveData['financial']     ?? [],
            'operational'   => $liveData['operational']   ?? [],
            'trends'        => $liveData['trends']        ?? [],
            'projections'   => $liveData['projections']   ?? [],
            'expirations'   => $liveData['expirations']   ?? [],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD SAVED REPORT — WITH OWNER CHECK
    |--------------------------------------------------------------------------
    */

    public function downloadSaved(Report $report)
    {
        // ✅ OWNER CHECK — sariling report lang pwedeng i-download
        if ((int) $report->created_by !== (int) Auth::id()) {
            abort(403, 'You can only download your own reports.');
        }

        $content = $this->decodeContent($report->content);

        $filename = $this->safeFilename($report->name) . '.json';

        return response()->streamDownload(
            function () use ($content) {
                echo json_encode(
                    $content,
                    JSON_PRETTY_PRINT
                    | JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                );
            },
            $filename,
            ['Content-Type' => 'application/json']
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE — WITH OWNER CHECK
    |--------------------------------------------------------------------------
    */

    public function destroy(Report $report): JsonResponse
    {
        // ✅ OWNER CHECK — sariling report lang pwedeng i-delete
        if ((int) $report->created_by !== (int) Auth::id()) {
            abort(403, 'You can only delete your own reports.');
        }

        $report->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report deleted successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | EXPORT CSV
    |--------------------------------------------------------------------------
    */

    public function exportCsv(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'start_date'  => ['required', 'date'],
            'end_date'    => ['required', 'date'],
            'report_type' => ['nullable', 'string', 'max:100'],
            'client'      => ['nullable', 'string', 'max:255'],
        ]);

        $data = $this->reportService->generate(
            $validated['start_date'],
            $validated['end_date'],
            $this->normalizeReportType($validated['report_type'] ?? 'All'),
            $this->normalizeClient($validated['client'] ?? null)
        );

        $filename = 'alibaton-report-' . now()->format('Y-m-d-His') . '.csv';

        return response()->streamDownload(
            function () use ($data) {
                $handle = fopen('php://output', 'w');

                fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

                fputcsv($handle, [
                    'Module',
                    'ID',
                    'Client',
                    'Reference',
                    'Amount',
                    'Status',
                    'Date',
                ]);

                foreach (($data['records']['invoices'] ?? []) as $invoice) {
                    fputcsv($handle, [
                        'Invoice',
                        $invoice['id']     ?? '',
                        $invoice['client'] ?? '',
                        $invoice['number'] ?? '',
                        $invoice['amount'] ?? 0,
                        $invoice['status'] ?? '',
                        $invoice['created_at'] ?? '',
                    ]);
                }

                foreach (($data['records']['payments'] ?? []) as $payment) {
                    fputcsv($handle, [
                        'Payment',
                        $payment['id']     ?? '',
                        $payment['client'] ?? '',
                        $payment['invoice_number'] ?? '',
                        $payment['amount'] ?? 0,
                        $payment['status'] ?? '',
                        $payment['payment_date']
                            ?? $payment['created_at']
                            ?? '',
                    ]);
                }

                foreach (($data['records']['job_orders'] ?? []) as $jobOrder) {
                    fputcsv($handle, [
                        'Job Order',
                        $jobOrder['id']     ?? '',
                        $jobOrder['client'] ?? '',
                        $jobOrder['number'] ?? '',
                        $jobOrder['amount'] ?? 0,
                        $jobOrder['status'] ?? '',
                        $jobOrder['start_date']
                            ?? $jobOrder['created_at']
                            ?? '',
                    ]);
                }

                foreach (($data['records']['contracts'] ?? []) as $contract) {
                    fputcsv($handle, [
                        'Contract',
                        $contract['id']          ?? '',
                        $contract['client']      ?? '',
                        $contract['contract_no'] ?? '',
                        '',
                        $contract['status']      ?? '',
                        $contract['start_date']  ?? '',
                    ]);
                }

                foreach (($data['records']['compliance'] ?? []) as $item) {
                    fputcsv($handle, [
                        'Compliance',
                        $item['id'] ?? '',
                        '',
                        $item['reference_number'] ?? '',
                        '',
                        $item['status']   ?? '',
                        $item['due_date'] ?? '',
                    ]);
                }

                foreach (($data['records']['documents'] ?? []) as $document) {
                    fputcsv($handle, [
                        'Document',
                        $document['id'] ?? '',
                        '',
                        $document['reference_number'] ?? '',
                        '',
                        $document['status']     ?? '',
                        $document['created_at'] ?? '',
                    ]);
                }

                fclose($handle);
            },
            $filename,
            ['Content-Type' => 'text/csv; charset=UTF-8']
        );
    }

    /*
    |--------------------------------------------------------------------------
    | EXPORT PDF
    |--------------------------------------------------------------------------
    */

    public function exportPdf(Request $request)
    {
        $validated = $request->validate([
            'start_date'  => ['required', 'date'],
            'end_date'    => ['required', 'date'],
            'report_type' => ['nullable', 'string', 'max:100'],
            'client'      => ['nullable', 'string', 'max:255'],
        ]);

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate   = Carbon::parse($validated['end_date'])->endOfDay();

        $reportType = $this->normalizeReportType(
            $validated['report_type'] ?? 'All'
        );

        $client = $this->normalizeClient($validated['client'] ?? null);

        $data = $this->reportService->generate(
            $startDate->toDateString(),
            $endDate->toDateString(),
            $reportType,
            $client
        );

        $title = $this->buildReportTitle($reportType, $client);

        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.pdf', [
                'title'     => $title,
                'data'      => $data,
                'startDate' => $startDate,
                'endDate'   => $endDate,
                'client'    => $client,
            ]);

            return $pdf->download($this->safeFilename($title) . '.pdf');
        }

        $html = $this->buildPrintableHtml(
            $title,
            $data,
            $startDate,
            $endDate,
            $client
        );

        return response($html, 200, [
            'Content-Type'        => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'
                . $this->safeFilename($title)
                . '.html"',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | EXPORT EXCEL — Native CSV (walang external package)
    |--------------------------------------------------------------------------
    */

    public function exportExcel(Request $request)
    {
        $validated = $request->validate([
            'start_date'  => ['required', 'date'],
            'end_date'    => ['required', 'date'],
            'report_type' => ['nullable', 'string', 'max:100'],
            'client'      => ['nullable', 'string', 'max:255'],
        ]);

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate   = Carbon::parse($validated['end_date'])->endOfDay();

        $reportType = $this->normalizeReportType(
            $validated['report_type'] ?? 'All'
        );

        $client = $this->normalizeClient($validated['client'] ?? null);

        $data = $this->reportService->generate(
            $startDate->toDateString(),
            $endDate->toDateString(),
            $reportType,
            $client
        );

        $filename = 'alibaton-report-' . now()->format('Y-m-d-His') . '.csv';

        return response()->streamDownload(
            function () use ($data) {
                $handle = fopen('php://output', 'w');

                fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

                fputcsv($handle, [
                    'Module',
                    'ID',
                    'Client',
                    'Reference',
                    'Amount',
                    'Status',
                    'Date',
                ]);

                foreach (($data['records']['invoices'] ?? []) as $invoice) {
                    fputcsv($handle, [
                        'Invoice',
                        $invoice['id']     ?? '',
                        $invoice['client'] ?? '',
                        $invoice['number'] ?? '',
                        $invoice['amount'] ?? 0,
                        $invoice['status'] ?? '',
                        $invoice['created_at'] ?? '',
                    ]);
                }

                foreach (($data['records']['payments'] ?? []) as $payment) {
                    fputcsv($handle, [
                        'Payment',
                        $payment['id']     ?? '',
                        $payment['client'] ?? '',
                        $payment['invoice_number'] ?? '',
                        $payment['amount'] ?? 0,
                        $payment['status'] ?? '',
                        $payment['payment_date']
                            ?? $payment['created_at']
                            ?? '',
                    ]);
                }

                foreach (($data['records']['job_orders'] ?? []) as $jobOrder) {
                    fputcsv($handle, [
                        'Job Order',
                        $jobOrder['id']     ?? '',
                        $jobOrder['client'] ?? '',
                        $jobOrder['number'] ?? '',
                        $jobOrder['amount'] ?? 0,
                        $jobOrder['status'] ?? '',
                        $jobOrder['start_date']
                            ?? $jobOrder['created_at']
                            ?? '',
                    ]);
                }

                foreach (($data['records']['contracts'] ?? []) as $contract) {
                    fputcsv($handle, [
                        'Contract',
                        $contract['id']          ?? '',
                        $contract['client']      ?? '',
                        $contract['contract_no'] ?? '',
                        '',
                        $contract['status']      ?? '',
                        $contract['start_date']  ?? '',
                    ]);
                }

                foreach (($data['records']['compliance'] ?? []) as $item) {
                    fputcsv($handle, [
                        'Compliance',
                        $item['id'] ?? '',
                        '',
                        $item['reference_number'] ?? '',
                        '',
                        $item['status']   ?? '',
                        $item['due_date'] ?? '',
                    ]);
                }

                foreach (($data['records']['documents'] ?? []) as $document) {
                    fputcsv($handle, [
                        'Document',
                        $document['id'] ?? '',
                        '',
                        $document['reference_number'] ?? '',
                        '',
                        $document['status']     ?? '',
                        $document['created_at'] ?? '',
                    ]);
                }

                fclose($handle);
            },
            $filename,
            ['Content-Type' => 'text/csv; charset=UTF-8']
        );
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    protected function mapSavedReport(
        Report $report,
        array $content = [],
        ?array $liveData = null
    ): array {
        $displayData = $liveData ?? $content;

        return [
            'id'           => $report->id,
            'name'         => $report->name,
            'type'         => $report->type,
            'date_range'   => $report->date_range,
            'start_date'   => $report->start_date?->toDateString(),
            'end_date'     => $report->end_date?->toDateString(),
            'generated_on' => $report->created_at?->toIso8601String(),
            'created_by'   => $report->user?->name ?? 'System',
            'ai_generated' => (bool) $report->ai_generated,
            'client'       => $report->client,
            'client_name'  => $report->client,

            'content'       => $displayData,
            'records'       => $displayData['records']       ?? [],
            'record_counts' => $displayData['record_counts'] ?? [],
            'summary'       => $displayData['summary']       ?? [],
            'financial'     => $displayData['financial']     ?? [],
            'operational'   => $displayData['operational']   ?? [],
            'trends'        => $displayData['trends']        ?? [],
            'projections'   => $displayData['projections']   ?? [],
            'expirations'   => $displayData['expirations']   ?? [],

            'report_meta' => [
                'client_name' => $this->normalizeClient($report->client),
                'report_type' => $report->type,
                'start_date'  => $report->start_date?->toDateString(),
                'end_date'    => $report->end_date?->toDateString(),
            ],
        ];
    }

    protected function decodeContent(mixed $content): array
    {
        if (is_array($content)) {
            return $content;
        }

        if (is_object($content)) {
            return json_decode(json_encode($content), true) ?? [];
        }

        if (is_string($content) && trim($content) !== '') {
            $decoded = json_decode($content, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    protected function normalizeClient(mixed $client): ?string
    {
        if ($client === null || !is_string($client)) {
            return null;
        }

        $client = trim($client);

        if ($client === '') {
            return null;
        }

        $genericValues = [
            'all',
            'all clients',
            'all client',
            'multiple clients',
            'client',
            'n/a',
            'na',
            'none',
            'null',
            'undefined',
        ];

        if (in_array(strtolower($client), $genericValues, true)) {
            return null;
        }

        return $client;
    }

    protected function normalizeReportType(mixed $type): string
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

        $value = trim((string) $type);

        foreach ($allowed as $allowedType) {
            if (strcasecmp($value, $allowedType) === 0) {
                return $allowedType;
            }
        }

        $aliases = [
            'contracts'  => 'Operations',
            'contract'   => 'Operations',
            'permits'    => 'Operations',
            'permit'     => 'Operations',
            'operational'=> 'Operations',
            'job order'  => 'Job Orders',
            'job_orders' => 'Job Orders',
            'document'   => 'Documents',
            'invoice'    => 'Billing',
            'invoices'   => 'Billing',
            'billing'    => 'Billing',
        ];

        $lower = strtolower($value);

        if (isset($aliases[$lower])) {
            return $aliases[$lower];
        }

        return 'All';
    }

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

        $this->columnCache[$key] = $exists;

        return $exists;
    }

    protected function clientColumnFor(string $table): ?string
    {
        $column = $this->clientColumnMap[$table] ?? null;

        if ($column === null) {
            return null;
        }

        if (!$this->hasColumn($table, $column)) {
            return null;
        }

        return $column;
    }

    protected function buildReportTitle(
        string $reportType,
        ?string $client
    ): string {
        $clientName = $client ?? 'All Clients';

        return $clientName . ' - ' . $reportType . ' Report';
    }

    protected function safeFilename(string $name): string
    {
        $filename = Str::slug($name);

        return $filename !== '' ? $filename : 'alibaton-report';
    }

    protected function buildPrintableHtml(
        string $title,
        array $data,
        Carbon $startDate,
        Carbon $endDate,
        ?string $client
    ): string {
        $records      = $data['records']       ?? [];
        $recordCounts = $data['record_counts'] ?? [];

        $escape = fn ($value) => e((string) ($value ?? ''));

        $countBoxes = [
            'Invoices'   => $recordCounts['invoices']   ?? 0,
            'Payments'   => $recordCounts['payments']   ?? 0,
            'Job Orders' => $recordCounts['job_orders'] ?? 0,
            'Contracts'  => $recordCounts['contracts']  ?? 0,
            'Compliance' => $recordCounts['compliance'] ?? 0,
            'Documents'  => $recordCounts['documents']  ?? 0,
        ];

        $html = '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>' . $escape($title) . '</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
h1 { margin-bottom: 5px; }
.meta { color: #555; margin-bottom: 25px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; }
.box { border: 1px solid #ddd; padding: 14px; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th, td { border: 1px solid #ddd; padding: 7px; text-align: left; }
th { background: #f5f5f5; }
</style>
</head>
<body>

<h1>' . $escape($title) . '</h1>

<div class="meta">
Period: ' . $escape($startDate->toDateString()) . ' to ' . $escape($endDate->toDateString()) . '<br>
Client: ' . $escape($client ?? 'All Clients') . '
</div>

<div class="grid">';

        foreach ($countBoxes as $label => $value) {
            $html .= '<div class="box"><strong>' . $escape($label) . '</strong><br>'
                . $escape($value) . '</div>';
        }

        $html .= '</div><h2>Records</h2>';

        if (!empty($records['invoices'] ?? [])) {
            $html .= '<h3>Invoices</h3><table>
<tr><th>ID</th><th>Number</th><th>Client</th><th>Amount</th><th>Status</th></tr>';

            foreach ($records['invoices'] as $invoice) {
                $html .= '<tr>'
                    . '<td>' . $escape($invoice['id']     ?? '') . '</td>'
                    . '<td>' . $escape($invoice['number'] ?? '') . '</td>'
                    . '<td>' . $escape($invoice['client'] ?? '') . '</td>'
                    . '<td>' . $escape($invoice['amount'] ?? 0)  . '</td>'
                    . '<td>' . $escape($invoice['status'] ?? '') . '</td>'
                    . '</tr>';
            }

            $html .= '</table>';
        }

        if (!empty($records['payments'] ?? [])) {
            $html .= '<h3>Payments</h3><table>
<tr><th>ID</th><th>Client</th><th>Invoice</th><th>Amount</th><th>Status</th></tr>';

            foreach ($records['payments'] as $payment) {
                $html .= '<tr>'
                    . '<td>' . $escape($payment['id']     ?? '') . '</td>'
                    . '<td>' . $escape($payment['client'] ?? '') . '</td>'
                    . '<td>' . $escape($payment['invoice_number'] ?? '') . '</td>'
                    . '<td>' . $escape($payment['amount'] ?? 0)  . '</td>'
                    . '<td>' . $escape($payment['status'] ?? '') . '</td>'
                    . '</tr>';
            }

            $html .= '</table>';
        }

        if (!empty($records['job_orders'] ?? [])) {
            $html .= '<h3>Job Orders</h3><table>
<tr><th>ID</th><th>Number</th><th>Client</th><th>Amount</th><th>Status</th></tr>';

            foreach ($records['job_orders'] as $jobOrder) {
                $html .= '<tr>'
                    . '<td>' . $escape($jobOrder['id']     ?? '') . '</td>'
                    . '<td>' . $escape($jobOrder['number'] ?? '') . '</td>'
                    . '<td>' . $escape($jobOrder['client'] ?? '') . '</td>'
                    . '<td>' . $escape($jobOrder['amount'] ?? 0)  . '</td>'
                    . '<td>' . $escape($jobOrder['status'] ?? '') . '</td>'
                    . '</tr>';
            }

            $html .= '</table>';
        }

        $hasRecords =
            !empty($records['invoices']   ?? [])
            || !empty($records['payments']   ?? [])
            || !empty($records['job_orders'] ?? [])
            || !empty($records['contracts']  ?? [])
            || !empty($records['compliance'] ?? [])
            || !empty($records['documents']  ?? []);

        if (!$hasRecords) {
            $html .= '<p><strong>No records found for the selected filters and date range.</strong></p>';
        }

        $html .= '</body></html>';

        return $html;
    }
}