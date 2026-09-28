<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AdminReportController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | LIST — Company-wide reports (all users, all clients)
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $startDate  = $request->query('start_date');
        $endDate    = $request->query('end_date');
        $reportType = $request->query('report_type', 'All');
        $client     = $request->query('client', 'All Clients');
        $owner      = $request->query('owner', 'All Users');

        $query = Report::query()->with('user:id,name,email');

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

        // Map to include owner name
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
    | COMPANY-WIDE SUMMARY
    |--------------------------------------------------------------------------
    */

    private function computeCompanySummary(?string $startDate, ?string $endDate): array
    {
        $base = Report::query();

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

        // Deltas — last 30 days vs previous 30 days
        $last30Start = now()->subDays(30);
        $prev30Start = now()->subDays(60);
        $prev30End   = now()->subDays(30);

        $last30 = Report::where('created_at', '>=', $last30Start)->count();
        $prev30 = Report::whereBetween('created_at', [$prev30Start, $prev30End])->count();

        $usersLast30 = Report::where('created_at', '>=', $last30Start)
            ->distinct('created_by')->count('created_by');
        $usersPrev30 = Report::whereBetween('created_at', [$prev30Start, $prev30End])
            ->distinct('created_by')->count('created_by');

        $clientsLast30 = Report::where('created_at', '>=', $last30Start)
            ->whereNotNull('client')
            ->distinct('client')->count('client');
        $clientsPrev30 = Report::whereBetween('created_at', [$prev30Start, $prev30End])
            ->whereNotNull('client')
            ->distinct('client')->count('client');

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
    | FILTER OPTIONS
    |--------------------------------------------------------------------------
    */

    public function filterOptions()
    {
        $clients = Report::whereNotNull('client')
            ->where('client', '!=', '')
            ->where('client', '!=', 'All Clients')
            ->distinct()
            ->pluck('client')
            ->filter()
            ->values();

        $owners = User::select('id', 'name', 'email')
            ->whereIn('id', Report::whereNotNull('created_by')
                                    ->distinct()
                                    ->pluck('created_by'))
            ->orderBy('name')
            ->get();

        return response()->json([
            'clients' => $clients,
            'owners'  => $owners,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SUMMARY BY USER
    |--------------------------------------------------------------------------
    */

    public function summaryByUser(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        $query = Report::query()
            ->selectRaw('created_by, COUNT(*) as total_reports,
                SUM(CASE WHEN ai_generated = 1 THEN 1 ELSE 0 END) as ai_reports,
                MAX(created_at) as last_report_at')
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
    | SUMMARY BY TYPE
    |--------------------------------------------------------------------------
    */

    public function summaryByType(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        $query = Report::query()
            ->selectRaw('type, COUNT(*) as total')
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
    | SUMMARY BY CLIENT
    |--------------------------------------------------------------------------
    */

    public function summaryByClient(Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        $query = Report::query()
            ->selectRaw('client, COUNT(*) as total')
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
    | SAVE — Admin can generate company-wide reports
    |--------------------------------------------------------------------------
    |
    | Note: Reuses the SAME /reports/save logic pattern. Since Report model
    | already exists, we just call the same Report creation.
    |--------------------------------------------------------------------------
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

            // Try to reuse existing ReportGeneratorService if it exists
            $content = [];
            if (class_exists(\App\Services\ReportGeneratorService::class)) {
                $content = app(\App\Services\ReportGeneratorService::class)
                    ->generateCompanyReport($validated);
            }

            $report = Report::create([
                'name'         => $this->buildReportName($validated, $client),
                'type'         => $validated['type'],
                'start_date'   => $validated['start_date'],
                'end_date'     => $validated['end_date'],
                'client'       => $client,
                'created_by'   => Auth::id(),           // ← FK to User
                'ai_generated' => $validated['ai_generated'] ?? false,
                'content'      => json_encode($content),
            ]);

            // Reload with user relationship
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
    | DELETE — Admin override
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        $report = Report::findOrFail($id);

        Log::info('Admin deleted report', [
            'report_id'   => $report->id,
            'owner_id'    => $report->created_by,
            'admin_id'    => Auth::id(),
            'report_name' => $report->name,
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
