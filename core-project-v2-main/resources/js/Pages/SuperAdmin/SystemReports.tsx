import React, { useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock,
    Download,
    FileBarChart,
    FileSpreadsheet,
    FileText,
    Plus,
    Search,
    ShieldCheck,
    Users,
    Wallet,
    X,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type ReportStatus = "Completed" | "Processing" | "Failed";
type ReportFormat = "PDF" | "CSV" | "XLSX";
type ReportType =
    | "User Activity"
    | "Financial Summary"
    | "Document Compliance"
    | "Contract & Permit"
    | "System Health";

type GeneratedReport = {
    id: number;
    name: string;
    type: ReportType;
    format: ReportFormat;
    generatedBy: string;
    date: string;
    status: ReportStatus;
    size: string;
};

/*
|--------------------------------------------------------------------------
| SAMPLE DATA
|--------------------------------------------------------------------------
*/

const REPORT_TEMPLATES: {
    type: ReportType;
    description: string;
    icon: React.ReactNode;
    color: string;
}[] = [
    {
        type: "User Activity",
        description:
            "Sign-ins, account changes, invitations, and permission updates.",
        icon: <Users size={20} />,
        color: "amber",
    },
    {
        type: "Financial Summary",
        description:
            "Revenue, collections, receivables, and expense summaries.",
        icon: <Wallet size={20} />,
        color: "emerald",
    },
    {
        type: "Document Compliance",
        description:
            "Document validity, expiring permits, and compliance status.",
        icon: <ShieldCheck size={20} />,
        color: "blue",
    },
    {
        type: "Contract & Permit",
        description:
            "Active contracts, permits, renewals, and expirations.",
        icon: <FileText size={20} />,
        color: "purple",
    },
];

const REPORTS: GeneratedReport[] = [
    {
        id: 1,
        name: "October 2026 Financial Summary",
        type: "Financial Summary",
        format: "PDF",
        generatedBy: "Super Admin",
        date: "2026-11-01",
        status: "Completed",
        size: "1.8 MB",
    },
    {
        id: 2,
        name: "Q3 2026 User Activity Report",
        type: "User Activity",
        format: "CSV",
        generatedBy: "Super Admin",
        date: "2026-10-30",
        status: "Completed",
        size: "620 KB",
    },
    {
        id: 3,
        name: "Document Compliance Snapshot",
        type: "Document Compliance",
        format: "PDF",
        generatedBy: "Maria Santos",
        date: "2026-10-28",
        status: "Completed",
        size: "2.4 MB",
    },
    {
        id: 4,
        name: "Active Contracts & Permits",
        type: "Contract & Permit",
        format: "XLSX",
        generatedBy: "Jose Ramirez",
        date: "2026-10-25",
        status: "Completed",
        size: "980 KB",
    },
    {
        id: 5,
        name: "Weekly System Health Report",
        type: "System Health",
        format: "PDF",
        generatedBy: "System Scheduler",
        date: "2026-10-24",
        status: "Completed",
        size: "740 KB",
    },
    {
        id: 6,
        name: "September 2026 Financial Summary",
        type: "Financial Summary",
        format: "PDF",
        generatedBy: "Super Admin",
        date: "2026-10-02",
        status: "Completed",
        size: "1.6 MB",
    },
    {
        id: 7,
        name: "User Access Audit",
        type: "User Activity",
        format: "CSV",
        generatedBy: "Super Admin",
        date: "2026-09-29",
        status: "Completed",
        size: "540 KB",
    },
    {
        id: 8,
        name: "System Health - September",
        type: "System Health",
        format: "PDF",
        generatedBy: "System Scheduler",
        date: "2026-09-30",
        status: "Completed",
        size: "710 KB",
    },
];

const REPORT_VOLUME = [
    { month: "May", reports: 12 },
    { month: "Jun", reports: 18 },
    { month: "Jul", reports: 15 },
    { month: "Aug", reports: 22 },
    { month: "Sep", reports: 19 },
    { month: "Oct", reports: 27 },
];

const REPORT_TYPES: ReportType[] = [
    "User Activity",
    "Financial Summary",
    "Document Compliance",
    "Contract & Permit",
    "System Health",
];

const FORMATS: ReportFormat[] = ["PDF", "CSV", "XLSX"];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function statusClass(status: ReportStatus) {
    switch (status) {
        case "Completed":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "Processing":
            return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        default:
            return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    }
}

function templateColor(color: string) {
    const colors: Record<string, string> = {
        amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        emerald:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        blue: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        purple:
            "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    };

    return colors[color] ?? colors.amber;
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function SystemReports() {
    const [reports, setReports] = useState<GeneratedReport[]>(REPORTS);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [showGenerate, setShowGenerate] = useState(false);
    const [generated, setGenerated] = useState(false);

    const [formType, setFormType] = useState<ReportType>("User Activity");
    const [formFormat, setFormFormat] = useState<ReportFormat>("PDF");
    const [dateFrom, setDateFrom] = useState("2026-10-01");
    const [dateTo, setDateTo] = useState("2026-10-31");

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return reports.filter((report) => {
            const matchesSearch =
                !keyword ||
                [report.name, report.type, report.generatedBy, report.format]
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword);

            const matchesType =
                typeFilter === "All" || report.type === typeFilter;

            return matchesSearch && matchesType;
        });
    }, [reports, search, typeFilter]);

    const stats = useMemo(() => {
        return {
            total: reports.length,
            completed: reports.filter((report) => report.status === "Completed")
                .length,
            scheduled: 4,
            templates: REPORT_TEMPLATES.length,
        };
    }, [reports]);

    const handleGenerate = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextId =
            reports.reduce((max, report) => Math.max(max, report.id), 0) + 1;

        const newReport: GeneratedReport = {
            id: nextId,
            name: `${formType} · ${formatDate(dateFrom)} - ${formatDate(dateTo)}`,
            type: formType,
            format: formFormat,
            generatedBy: "Super Admin",
            date: new Date().toISOString().slice(0, 10),
            status: "Completed",
            size: formFormat === "PDF" ? "1.2 MB" : "480 KB",
        };

        setReports((current) => [newReport, ...current]);
        setShowGenerate(false);
        setGenerated(true);
        window.setTimeout(() => setGenerated(false), 4000);
    };

    return (
        <SuperAdminLayout>
            <Head title="System Reports" />

            <div className="space-y-6">
                {/* HEADER */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                            <BarChart3
                                size={24}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                System Reports
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Generate, download, and review system-wide reports
                                for operations and compliance.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowGenerate(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-400"
                    >
                        <Plus size={16} />
                        Generate Report
                    </button>
                </div>

                {generated && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={16} />
                        Report generated successfully.
                    </div>
                )}

                {/* STATS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        {
                            label: "Total Reports",
                            value: stats.total,
                            hint: "Generated records",
                            icon: <FileBarChart size={20} />,
                            tone: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        },
                        {
                            label: "Completed",
                            value: stats.completed,
                            hint: "Ready to download",
                            icon: <CheckCircle2 size={20} />,
                            tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        },
                        {
                            label: "Scheduled",
                            value: stats.scheduled,
                            hint: "Automated reports",
                            icon: <Clock size={20} />,
                            tone: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        },
                        {
                            label: "Report Templates",
                            value: stats.templates,
                            hint: "Available formats",
                            icon: <FileSpreadsheet size={20} />,
                            tone: "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                        {item.label}
                                    </p>
                                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                        {item.value}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.hint}
                                    </p>
                                </div>

                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.tone}`}
                                >
                                    {item.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* TEMPLATES + CHART */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D] xl:col-span-2">
                        <div className="mb-4">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                Report Templates
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Start with a pre-configured report for the most
                                common monitoring needs.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {REPORT_TEMPLATES.map((template) => (
                                <button
                                    key={template.type}
                                    type="button"
                                    onClick={() => {
                                        setFormType(template.type);
                                        setShowGenerate(true);
                                    }}
                                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-amber-500/40 hover:bg-amber-500/5 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-amber-500/40"
                                >
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${templateColor(
                                            template.color,
                                        )}`}
                                    >
                                        {template.icon}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {template.type}
                                        </p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                            {template.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Report Volume
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Reports generated per month.
                                </p>
                            </div>
                            <BarChart3
                                size={18}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>

                        <div className="h-[210px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={REPORT_VOLUME}
                                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#263244"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: "#94A3B8", fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fill: "#94A3B8", fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "rgba(148,163,184,0.08)" }}
                                        contentStyle={{
                                            backgroundColor: "#0A0F1D",
                                            border: "1px solid #334155",
                                            borderRadius: 12,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar dataKey="reports" radius={[6, 6, 0, 0]}>
                                        {REPORT_VOLUME.map((entry, index) => (
                                            <Cell
                                                key={entry.month}
                                                fill={
                                                    index === REPORT_VOLUME.length - 1
                                                        ? "#F59E0B"
                                                        : "#3B82F6"
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* REPORT LIST */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                Generated Reports
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Download or review previously generated reports.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative">
                                <Search
                                    size={15}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search reports..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white sm:w-60"
                                />
                            </div>

                            <select
                                value={typeFilter}
                                onChange={(event) => setTypeFilter(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                <option value="All">All Report Types</option>
                                {REPORT_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800/80">
                            <thead className="bg-slate-50 dark:bg-slate-900/60">
                                <tr>
                                    {[
                                        "Report",
                                        "Type",
                                        "Format",
                                        "Generated By",
                                        "Date",
                                        "Status",
                                        "",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                                {filtered.map((report) => (
                                    <tr
                                        key={report.id}
                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                                    >
                                        <td className="min-w-[240px] px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                                        {report.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {report.size}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {report.type}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                                {report.format}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {report.generatedBy}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {formatDate(report.date)}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                                    report.status,
                                                )}`}
                                            >
                                                <CheckCircle2 size={13} />
                                                {report.status}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:border-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
                                            >
                                                <Download size={14} />
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <FileBarChart
                                                size={30}
                                                className="mx-auto mb-2 text-slate-400 opacity-60"
                                            />
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                No reports match your filters.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* GENERATE MODAL */}
            {showGenerate && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowGenerate(false);
                        }
                    }}
                >
                    <form
                        onSubmit={handleGenerate}
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <FileBarChart size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Generate Report
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Choose a report type and date range.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowGenerate(false)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-white"
                                aria-label="Close generate report"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Report Type
                                </label>
                                <select
                                    value={formType}
                                    onChange={(event) =>
                                        setFormType(event.target.value as ReportType)
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                >
                                    {REPORT_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Date From
                                    </label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(event) =>
                                            setDateFrom(event.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Date To
                                    </label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(event) =>
                                            setDateTo(event.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    File Format
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {FORMATS.map((format) => (
                                        <button
                                            key={format}
                                            type="button"
                                            onClick={() => setFormFormat(format)}
                                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                                                formFormat === format
                                                    ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-500/30 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
                                            }`}
                                        >
                                            {format}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="submit"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
                            >
                                <CalendarDays size={16} />
                                Generate Report
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowGenerate(false)}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </SuperAdminLayout>
    );
}
