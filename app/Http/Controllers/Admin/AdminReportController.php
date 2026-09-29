<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AdminReportController extends Controller
{
    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /*
    |--------------------------------------------------------------------------
    | LIST — Admin's OWN reports only (Full Separation)
    |--------------------------------------------------------------------------
    |
    | ✅ FULL SEPARATION:
    | - Admin nakikita lang ang SARILING reports (created_by = Auth::id())
    | - Hindi kasama ang reports ng staff
    |
    */

    public function index(Request $request)
    {
        $startDate  = $request->query('start_date');
        $endDate    = $request->query('end_date');
        $reportType = $request->query('report_type', 'All');
        $client     = $request->query('client', 'All Clients');
        $owner      = $request->query('owner', 'All Users');

        // ✅ FULL SEPARATION — sariling reports lang ng admin
        $query = Report::query()
            ->where('created_by', Auth::id())
            ->with('user:id,name,email');

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay(),
            ]);
        }

        if ($reportType && $reportType !== 'All') {
            $query->where(function ($q) use ($reportType) {
                $q->where('type', $reportType)
                  ->orWhere('report_type', $reportType);
            });
        }

        if ($client && $client !== 'All Clients') {
            $query->where(function ($q) use ($client) {
                $q->where('client', $client)
                  ->orWhere('client_name', $client);
            });
        }

        if ($owner && $owner !== 'All Users') {
            $query->where('created_by', $owner);
        }

        $reports = $query->orderByDesc('created_at')->get();

        $mapped = $reports->map(function ($report) {
            $arr = $report->toArray();
            $arr['user'] = $report->user ? [
                'id'    => $report->user->id,
                'name'  => $report->user->name,
                'email' => $report->user->email,
            ] : null;
            $arr['owner_name']  = $report->user->name  ?? $report->created_by;
            $arr['owner_email'] = $report->user->email ?? null;
            return $arr;
        });

        return response()->json([
            'reports' => $mapped,
            'summary' => $this->computeCompanySummary($startDate, $endDate),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ADMIN'S OWN SUMMARY
    |--------------------------------------------------------------------------
    */

    private function computeCompanySummary(?string $startDate, ?string $endDate): array
    {
        // ✅ FULL SEPARATION — sariling reports lang
        $base = Report::query()
            ->where('created_by', Auth::id());

        if ($startDate && $endDate) {
            $base->whereBetween('created_at', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay(),
            ]);
        }

        $totalReports = (clone $base)->count();
        $totalUsers   = (clone $base)->whereNotNull('created_by')
                                     ->distinct('created_by')
                                     ->count('created_by');
        $totalClients = (clone $base)->whereNotNull('client')
                                     ->where('client', '!=', '')
                                     ->where('client', '!=', 'All Clients')
                                     ->distinct('client')
                                     ->count('client');
        $totalAiReports = (clone $base)->where('ai_generated', true)->count();

        $last30Start = now()->subDays(30);
        $prev30Start = now()->subDays(60);
        $prev30End   = now()->subDays(30);

        $last30 = Report::where('created_by', Auth::id())
            ->where('created_at', '>=', $last30Start)
            ->count();

        $prev30 = Report::where('created_by', Auth::id())
            ->whereBetween('created_at', [$prev30Start, $prev30End])
            ->count();

        $usersLast30 = Report::where('created_by', Auth::id())
            ->where('created_at', '>=', $last30Start)
            ->distinct('created_by')
            ->count('created_by');

        $usersPrev30 = Report::where('created_by', Auth::id())
            ->whereBetween('created_at', [$prev30Start, $prev30End])
            ->distinct('created_by')
            ->count('created_by');

        $clientsLast30 = Report::where('created_by', Auth::id())
            ->where('created_at', '>=', $last30Start)
            ->whereNotNull('client')
            ->distinct('client')
            ->count('client');

        $clientsPrev30 = Report::where('created_by', Auth::id())
            ->whereBetween('created_at', [$prev30Start, $prev30End])
            ->whereNotNull('client')
            ->distinct('client')
            ->count('client');

        return [
            'total_reports'    => $totalReports,
            'total_users'      => $totalUsers,
            'total_clients'    => $totalClients,
            'total_ai_reports' => $totalAiReports,
            'reports_delta'    => $last30 - $prev30,
            'users_delta'      => $usersLast30 - $usersPrev30,
            'clients_delta'    => $clientsLast30 - $clientsPrev30,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | FILTER OPTIONS — Admin's OWN reports only
    |--------------------------------------------------------------------------
    */

    public function filterOptions()
    {
        // ✅ FULL SEPARATION — sariling reports lang
        $clients = Report::where('created_by', Auth::id())
            ->whereNotNull('client')
            ->where('client', '!=', '')
            ->where('client', '!=', 'All Clients')
            ->distinct()
            ->pluck('client')
            ->filter()
            ->values();

        // ✅ Sarili lang ang owner
        $owners = User::select('id', 'name', 'email')
            ->where('id', Auth::id())
            ->get();

        return response()->json([
            'clients' => $clients,
            'owners'  => $owners,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SUMMARY BY USER — Admin's OWN reports only
    |--------------------------------------------------------------------------
    */

    public function summaryByUser(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        // ✅ FULL SEPARATION
        $query = Report::query()
            ->selectRaw('created_by, COUNT(*) as total_reports,
                SUM(CASE WHEN ai_generated = 1 THEN 1 ELSE 0 END) as ai_reports,
                MAX(created_at) as last_report_at')
            ->where('created_by', Auth::id())
            ->whereNotNull('created_by')
            ->groupBy('created_by');

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay(),
            ]);
        }

        $rows = $query->get()->map(function ($row) {
            $user = User::find($row->created_by);
            return [
                'user_id'        => $row->created_by,
                'user_name'      => $user->name  ?? 'Unknown',
                'user_email'     => $user->email ?? '',
                'total_reports'  => (int) $row->total_reports,
                'ai_reports'     => (int) $row->ai_reports,
                'manual_reports' => (int) $row->total_reports - (int) $row->ai_reports,
                'last_report_at' => $row->last_report_at,
            ];
        })->sortByDesc('total_reports')->values();

        return response()->json(['users' => $rows]);
    }

    /*
    |--------------------------------------------------------------------------
    | SUMMARY BY TYPE — Admin's OWN reports only
    |--------------------------------------------------------------------------
    */

    public function summaryByType(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        // ✅ FULL SEPARATION
        $query = Report::query()
            ->selectRaw('type, COUNT(*) as total')
            ->where('created_by', Auth::id())
            ->groupBy('type');

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay(),
            ]);
        }

        return response()->json(['types' => $query->get()]);
    }

    /*
    |--------------------------------------------------------------------------
    | SUMMARY BY CLIENT — Admin's OWN reports only
    |--------------------------------------------------------------------------
    */

    public function summaryByClient(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        // ✅ FULL SEPARATION
        $query = Report::query()
            ->selectRaw('client, COUNT(*) as total')
            ->where('created_by', Auth::id())
            ->whereNotNull('client')
            ->where('client', '!=', '')
            ->where('client', '!=', 'All Clients')
            ->groupBy('client');

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay(),
            ]);
        }

        return response()->json(['clients' => $query->get()]);
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE — Admin generates own reports (full separation)
    |--------------------------------------------------------------------------
    |
    | ✅ Gumagamit ng ReportService (existing) — consistent sa staff side
    | ✅ Walang ReportGeneratorService dependency
    |
    */

    public function save(Request $request)
    {
        $validated = $request->validate([
            'type'         => 'required|string',
            'report_type'  => 'required|string',
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'client'       => 'nullable|string',
            'client_name'  => 'nullable|string',
            'ai_generated' => 'boolean',
        ]);

        try {
            $client = $validated['client_name'] ?? $validated['client'] ?? null;

            // ✅ Gamitin ang ReportService (existing) — consistent sa staff side
            try {
                $content = $this->reportService->generate(
                    $validated['start_date'],
                    $validated['end_date'],
                    $validated['report_type'] ?? $validated['type'] ?? 'All',
                    $client
                );
            } catch (\Throwable $e) {
                report($e);

                // Fallback: minimal content
                $content = [
                    'summary' => [
                        'generated_by' => 'admin',
                        'admin_id'     => Auth::id(),
                        'type'         => $validated['type'],
                        'client'       => $client,
                        'date_range'   => [
                            'start' => $validated['start_date'],
                            'end'   => $validated['end_date'],
                        ],
                        'generated_at' => now()->toIso8601String(),
                    ],
                ];
            }

            $report = Report::create([
                'name'         => $this->buildReportName($validated, $client),
                'type'         => $validated['type'],
                'start_date'   => $validated['start_date'],
                'end_date'     => $validated['end_date'],
                'client'       => $client,
                'created_by'   => Auth::id(),
                'ai_generated' => $validated['ai_generated'] ?? false,
                'content'      => json_encode($content),
            ]);

            $report->load('user:id,name,email');

            $arr = $report->toArray();
            $arr['owner_name']  = $report->user->name  ?? null;
            $arr['owner_email'] = $report->user->email ?? null;

            return response()->json([
                'success' => true,
                'report'  => $arr,
            ]);
        } catch (\Exception $e) {
            Log::error('Admin report save failed', [
                'error'    => $e->getMessage(),
                'admin_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create report: ' . $e->getMessage(),
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE — Admin deletes OWN reports only (full separation)
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        // ✅ FULL SEPARATION — sariling reports lang
        $report = Report::where('id', $id)
            ->where('created_by', Auth::id())
            ->firstOrFail();

        Log::info('Admin deleted own report', [
            'report_id' => $report->id,
            'admin_id'  => Auth::id(),
            'name'      => $report->name,
        ]);

        $report->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report deleted successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | HELPERS
    |--------------------------------------------------------------------------
    */

    private function buildReportName(array $data, ?string $client): string
    {
        $clientLabel = $client ?? 'Overall Company';
        return "{$data['type']} Report — {$clientLabel}";
    }
}