import React, { useState, useMemo, useEffect, useRef } from "react";
import { Head, usePage } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    Activity,
    Search,
    Filter,
    User,
    Trash2,
    Edit,
    Plus,
    LogIn,
    LogOut,
    Shield,
    KeyRound,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Clock,
    FileText,
    X,
    Loader2,
    Eye,
    RefreshCw,
    Radio,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type ActivityLog = {
    id: number;
    actor_id: number | null;
    actor_name: string | null;
    actor_email: string | null;
    actor_role: string | null;
    target_user_id: number | null;
    target_name: string | null;
    target_email: string | null;
    action: string;
    action_label: string;
    description: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    created_ago: string;
};

type Stats = {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
};

type Filters = {
    action: string | null;
    actor_role: string | null;
    date_from: string | null;
    date_to: string | null;
};

type PageProps = {
    logs: ActivityLog[];
    stats: Stats;
    filters: Filters;
    actions: string[];
    actor_roles: string[];
    flash?: {
        success?: string;
        error?: string;
    };
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getActionIcon(action: string): React.ReactNode {
    const map: Record<string, React.ReactNode> = {
        user_created: <Plus size={16} />,
        user_updated: <Edit size={16} />,
        user_deleted: <Trash2 size={16} />,
        user_restored: <RotateCcw size={16} />,
        user_force_deleted: <Trash2 size={16} />,
        user_deactivated: <AlertCircle size={16} />,
        user_reactivated: <CheckCircle size={16} />,
        staff_invited: <Plus size={16} />,
        staff_invitation_resent: <RefreshCw size={16} />,
        staff_invitation_cancelled: <X size={16} />,
        staff_deactivated: <AlertCircle size={16} />,
        staff_reactivated: <CheckCircle size={16} />,
        staff_deleted: <Trash2 size={16} />,
        staff_restored: <RotateCcw size={16} />,
        staff_force_deleted: <Trash2 size={16} />,
        admin_invited: <Shield size={16} />,
        admin_invitation_resent: <RefreshCw size={16} />,
        admin_invitation_cancelled: <X size={16} />,
        admin_deactivated: <AlertCircle size={16} />,
        admin_reactivated: <CheckCircle size={16} />,
        admin_deleted: <Trash2 size={16} />,
        admin_restored: <RotateCcw size={16} />,
        admin_force_deleted: <Trash2 size={16} />,
        login_success: <LogIn size={16} />,
        login_failed: <AlertCircle size={16} />,
        logout: <LogOut size={16} />,
        password_reset: <KeyRound size={16} />,
        account_fixed: <RotateCcw size={16} />,
    };
    return map[action] ?? <Activity size={16} />;
}

function getActionColor(action: string): string {
    if (action.includes("deleted") || action.includes("failed")) {
        return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
    }
    if (action.includes("created") || action.includes("invited") || action.includes("success")) {
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
    if (action.includes("updated") || action.includes("reactivated") || action.includes("restored")) {
        return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
    if (action.includes("login") || action.includes("logout")) {
        return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
    }
    return "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";
}

function getRoleBadgeColor(role: string | null): string {
    switch (role) {
        case "superadmin": return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30";
        case "admin": return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30";
        case "staff": return "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30";
        case "client": return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
        default: return "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30";
    }
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function ActivityLogs() {
    const props = usePage<any>().props as PageProps;
    const {
        logs: initialLogs = [],
        stats: initialStats = { total: 0, today: 0, this_week: 0, this_month: 0 },
        filters = { action: null, actor_role: null, date_from: null, date_to: null },
        actions = [],
        actor_roles = [],
        flash,
    } = props;

    // Real-time state
    const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
    const [stats, setStats] = useState<Stats>(initialStats);
    const [isLive, setIsLive] = useState(true);
    const [isPolling, setIsPolling] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [newLogCount, setNewLogCount] = useState(0);
    const latestLogIdRef = useRef<number>(initialLogs.length > 0 ? initialLogs[0].id : 0);

    // Filters + search
    const [search, setSearch] = useState("");
    const [selectedAction, setSelectedAction] = useState<string>(filters.action ?? "");
    const [selectedRole, setSelectedRole] = useState<string>(filters.actor_role ?? "");
    const [dateFrom, setDateFrom] = useState<string>(filters.date_from ?? "");
    const [dateTo, setDateTo] = useState<string>(filters.date_to ?? "");
    const [showFilters, setShowFilters] = useState(false);
    const [applying, setApplying] = useState(false);

    const [viewingLog, setViewingLog] = useState<ActivityLog | null>(null);

    const getRoute = (name: string, params?: any, fallback?: string) => {
        if (typeof window !== "undefined" && (window as any).route) {
            try { return (window as any).route(name, params); } catch { return fallback ?? ""; }
        }
        return fallback ?? "";
    };

    /*
    |--------------------------------------------------------------------------
    | FETCH LOGS (poll + manual refresh)
    |--------------------------------------------------------------------------
    */
    const fetchLogs = async () => {
        setIsPolling(true);
        try {
            const params = new URLSearchParams();
            if (selectedAction) params.set('action', selectedAction);
            if (selectedRole) params.set('actor_role', selectedRole);
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);

            const response = await fetch(
                getRoute("superadmin.logs.poll", {}, "/superadmin/logs/poll") + "?" + params.toString(),
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                }
            );

            if (!response.ok) throw new Error('Poll failed');

            const data = await response.json();
            const newLatestId = data.latest_id ?? 0;

            if (newLatestId > latestLogIdRef.current && latestLogIdRef.current > 0) {
                const diff = (data.logs?.length ?? 0) - logs.length;
                if (diff > 0) setNewLogCount(prev => prev + diff);
            }

            setLogs(data.logs ?? []);
            setStats(data.stats ?? initialStats);
            latestLogIdRef.current = newLatestId;
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Poll error:', err);
        } finally {
            setIsPolling(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | AUTO-POLL every 10s (only if isLive)
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(fetchLogs, 10000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLive, selectedAction, selectedRole, dateFrom, dateTo]);

    /*
    |--------------------------------------------------------------------------
    | FILTER ACTIONS
    |--------------------------------------------------------------------------
    */
    const applyFilters = () => {
        setApplying(true);
        setNewLogCount(0);
        fetchLogs().finally(() => setApplying(false));
    };

    const clearFilters = () => {
        setSelectedAction("");
        setSelectedRole("");
        setDateFrom("");
        setDateTo("");
        setSearch("");
        setNewLogCount(0);
        fetchLogs();
    };

    /*
    |--------------------------------------------------------------------------
    | CLIENT-SIDE SEARCH
    |--------------------------------------------------------------------------
    */
    const filteredLogs = useMemo(() => {
        const keyword = search.toLowerCase().trim();
        if (!keyword) return logs;

        return logs.filter((log) => {
            const searchable = [
                log.actor_name,
                log.actor_email,
                log.target_name,
                log.target_email,
                log.action_label,
                log.description,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(keyword);
        });
    }, [logs, search]);

    const activeFilterCount =
        (selectedAction ? 1 : 0) +
        (selectedRole ? 1 : 0) +
        (dateFrom ? 1 : 0) +
        (dateTo ? 1 : 0);

    return (
        <SuperAdminLayout>
            <Head title="Activity Logs" />

            {flash?.success && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={16} />
                    {flash.success}
                </div>
            )}

            {/* HEADER */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                        <Activity size={24} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Logs</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Track all admin, staff, and system activities in real-time.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setIsLive(!isLive)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-semibold transition ${
                            isLive
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] text-slate-600 dark:text-slate-400"
                        }`}
                    >
                        <Radio size={16} className={isLive ? "animate-pulse" : ""} />
                        {isLive ? "LIVE" : "Paused"}
                    </button>

                    <button
                        type="button"
                        onClick={fetchLogs}
                        disabled={isPolling}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isPolling ? "animate-spin" : ""} />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    >
                        <Filter size={16} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-[#0A0F1D]">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* LAST UPDATE */}
            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <Clock size={12} />
                    Last updated: {lastRefresh.toLocaleTimeString()}
                    {isLive && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">· Auto-refresh every 10s</span>}
                </div>
                {newLogCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        +{newLogCount} new log{newLogCount !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {/* STATS */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total" value={stats.total} icon={<Activity size={18} />} color="amber" />
                <StatCard label="Today" value={stats.today} icon={<Clock size={18} />} color="blue" />
                <StatCard label="This Week" value={stats.this_week} icon={<CheckCircle size={18} />} color="emerald" />
                <StatCard label="This Month" value={stats.this_month} icon={<FileText size={18} />} color="purple" />
            </div>

            {/* FILTERS PANEL */}
            {showFilters && (
                <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0A0F1D]/80 p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Action</label>
                            <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] py-2.5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/70">
                                <option value="">All Actions</option>
                                {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Actor Role</label>
                            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] py-2.5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/70">
                                <option value="">All Roles</option>
                                {actor_roles.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">From Date</label>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] py-2.5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/70" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">To Date</label>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] py-2.5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500/70" />
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={applyFilters} disabled={applying} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#0A0F1D] transition hover:bg-amber-400 disabled:opacity-50">
                            {applying ? <><Loader2 size={16} className="animate-spin" /> Applying...</> : <><Filter size={16} /> Apply Filters</>}
                        </button>
                        {activeFilterCount > 0 && (
                            <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* SEARCH */}
            <div className="mb-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, action, description..." className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50" />
                </div>
            </div>

            {/* ============================================================
                TABLE WITH SCROLL — Fixed height + sticky header
            ============================================================ */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0A0F1D]/80 overflow-hidden">

                {/* Table container — max height + scroll */}
                <div className="max-h-[600px] overflow-auto">

                    <table className="w-full">

                        {/* Sticky header */}
                        <thead className="sticky top-0 z-20 bg-white dark:bg-[#0A0F1D]">
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-5 py-4 text-left bg-white dark:bg-[#0A0F1D]">Action</th>
                                <th className="px-5 py-4 text-left bg-white dark:bg-[#0A0F1D]">Actor</th>
                                <th className="px-5 py-4 text-left bg-white dark:bg-[#0A0F1D]">Target</th>
                                <th className="px-5 py-4 text-left bg-white dark:bg-[#0A0F1D]">IP</th>
                                <th className="px-5 py-4 text-left bg-white dark:bg-[#0A0F1D]">When</th>
                                <th className="px-5 py-4 text-center bg-white dark:bg-[#0A0F1D]">Details</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center">
                                        <Activity size={40} className="mx-auto mb-3 text-slate-400 dark:text-slate-700" />
                                        <p className="text-sm font-medium text-slate-500">No activity logs yet.</p>
                                        <p className="mt-1 text-xs text-slate-600">System activities will appear here in real-time.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-200 dark:border-slate-800/60 transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{log.action_label}</p>
                                                    {log.description && <p className="text-xs text-slate-500 truncate max-w-[250px]">{log.description}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {log.actor_name ? (
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="shrink-0 text-slate-600" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm text-slate-900 dark:text-white">{log.actor_name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-slate-500 truncate">{log.actor_email}</span>
                                                            {log.actor_role && (
                                                                <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${getRoleBadgeColor(log.actor_role)}`}>{log.actor_role}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : <span className="text-xs text-slate-600 italic">System</span>}
                                        </td>
                                        <td className="px-5 py-4">
                                            {log.target_name ? (
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="shrink-0 text-slate-600" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm text-slate-900 dark:text-white">{log.target_name}</p>
                                                        <p className="text-[10px] text-slate-500 truncate">{log.target_email}</p>
                                                    </div>
                                                </div>
                                            ) : <span className="text-xs text-slate-600">—</span>}
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 font-mono">{log.ip_address ?? "—"}</td>
                                        <td className="px-5 py-4">
                                            <div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300">{log.created_at}</p>
                                                <p className="text-[10px] text-slate-500">{log.created_ago}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button type="button" onClick={() => setViewingLog(log)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer — log count */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white">{filteredLogs.length}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white">{logs.length}</strong> logs
                        {search && ` (filtered by "${search}")`}
                    </span>
                    <span>
                        {logs.length >= 200 && "Showing latest 200 logs only"}
                    </span>
                </div>
            </div>

            {/* DETAILS MODAL */}
            {viewingLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${getActionColor(viewingLog.action)}`}>
                                    {getActionIcon(viewingLog.action)}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">Activity Details</h2>
                                    <p className="text-xs text-slate-500">{viewingLog.action_label}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setViewingLog(null)} className="rounded-lg p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-5">
                            <div className="space-y-3">
                                <DetailRow label="Action" value={viewingLog.action_label} />
                                <DetailRow label="Action Code" value={<code className="text-xs text-amber-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">{viewingLog.action}</code>} />
                                {viewingLog.description && <DetailRow label="Description" value={viewingLog.description} />}
                                <DetailRow label="Actor" value={viewingLog.actor_name ? (
                                    <div>
                                        <p className="text-slate-900 dark:text-white">{viewingLog.actor_name}</p>
                                        <p className="text-xs text-slate-500">{viewingLog.actor_email}</p>
                                        {viewingLog.actor_role && <span className={`inline-block mt-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${getRoleBadgeColor(viewingLog.actor_role)}`}>{viewingLog.actor_role}</span>}
                                    </div>
                                ) : <span className="italic text-slate-500">System</span>} />
                                {viewingLog.target_name && <DetailRow label="Target" value={<div><p className="text-slate-900 dark:text-white">{viewingLog.target_name}</p><p className="text-xs text-slate-500">{viewingLog.target_email}</p></div>} />}
                                <DetailRow label="IP Address" value={<span className="font-mono text-xs">{viewingLog.ip_address ?? "—"}</span>} />
                                <DetailRow label="User Agent" value={<span className="text-xs break-all">{viewingLog.user_agent ?? "—"}</span>} />
                                <DetailRow label="When" value={<div><p className="text-slate-900 dark:text-white">{viewingLog.created_at}</p><p className="text-xs text-slate-500">{viewingLog.created_ago}</p></div>} />
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 px-5 py-4">
                            <button type="button" onClick={() => setViewingLog(null)} className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function StatCard({ label, value, icon, color = "amber" }: { label: string; value: number; icon: React.ReactNode; color?: "amber" | "blue" | "emerald" | "purple"; }) {
    const colors = {
        amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
        blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
        emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
        purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-600 dark:text-purple-400" },
    };
    const c = colors[color];

    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0A0F1D]/80 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${c.bg} ${c.border} ${c.text}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="border-b border-slate-200 dark:border-slate-800/50 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</p>
            <div className="text-sm text-slate-900 dark:text-white">{value}</div>
        </div>
    );
}