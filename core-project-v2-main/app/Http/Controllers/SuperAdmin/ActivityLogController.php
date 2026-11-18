<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    /**
     * List all activity logs with filters (Inertia page).
     */
    public function index(Request $request): Response
    {
        $query = ActivityLog::query()->latest('created_at');

        /*
        |----------------------------------------------------------------------
        | FILTERS
        |----------------------------------------------------------------------
        */
        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('actor_role')) {
            $query->where('actor_role', $request->input('actor_role'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        /*
        |----------------------------------------------------------------------
        | LOGS
        |----------------------------------------------------------------------
        */
        $logs = $query->take(200)->get()->map(function ($log) {
            return $this->mapLog($log);
        })->values();

        /*
        |----------------------------------------------------------------------
        | STATS
        |----------------------------------------------------------------------
        */
        $stats = $this->buildStats();

        /*
        |----------------------------------------------------------------------
        | FILTER OPTIONS
        |----------------------------------------------------------------------
        */
        $actions = ActivityLog::query()
            ->distinct()
            ->pluck('action_label')
            ->filter()
            ->unique()
            ->values();

        $actorRoles = ActivityLog::query()
            ->distinct()
            ->pluck('actor_role')
            ->filter()
            ->unique()
            ->values();

        return Inertia::render('SuperAdmin/ActivityLogs', [
            'logs' => $logs,
            'stats' => $stats,
            'filters' => [
                'action' => $request->input('action'),
                'actor_role' => $request->input('actor_role'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
            ],
            'actions' => $actions,
            'actor_roles' => $actorRoles,
        ]);
    }

    /**
     * JSON poll endpoint — for real-time frontend updates.
     */
    public function poll(Request $request): JsonResponse
    {
        $query = ActivityLog::query()->latest('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('actor_role')) {
            $query->where('actor_role', $request->input('actor_role'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $logs = $query->take(200)->get()->map(function ($log) {
            return $this->mapLog($log);
        })->values();

        return response()->json([
            'logs' => $logs,
            'stats' => $this->buildStats(),
            'latest_id' => $logs->first()['id'] ?? 0,
        ]);
    }

    /**
     * Map a log entry into array.
     */
    private function mapLog(ActivityLog $log): array
    {
        return [
            'id' => $log->id,
            'actor_id' => $log->actor_id,
            'actor_name' => $log->actor_name,
            'actor_email' => $log->actor_email,
            'actor_role' => $log->actor_role,
            'target_user_id' => $log->target_user_id,
            'target_name' => $log->target_name,
            'target_email' => $log->target_email,
            'action' => $log->action,
            'action_label' => $log->action_label,
            'description' => $log->description,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'created_at' => $log->created_at?->format('M d, Y h:i A'),
            'created_ago' => $log->created_at?->diffForHumans(),
        ];
    }

    /**
     * Build stats block.
     */
    private function buildStats(): array
    {
        return [
            'total' => ActivityLog::count(),
            'today' => ActivityLog::whereDate('created_at', today())->count(),
            'this_week' => ActivityLog::where('created_at', '>=', now()->startOfWeek())->count(),
            'this_month' => ActivityLog::where('created_at', '>=', now()->startOfMonth())->count(),
        ];
    }
}