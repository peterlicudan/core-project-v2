import React, { useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    AlertTriangle,
    Building2,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Eye,
    FileCheck2,
    Search,
    ShieldCheck,
    X,
    XCircle,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type ComplianceStatus = "Compliant" | "Due Soon" | "Overdue" | "Under Review";

type ComplianceRecord = {
    id: number;
    requirement: string;
    reference: string;
    agency: string;
    category: string;
    owner: string;
    dueDate: string;
    lastReviewed: string;
    status: ComplianceStatus;
    notes: string;
};

/*
|--------------------------------------------------------------------------
| SAMPLE DATA
|--------------------------------------------------------------------------
*/

const COMPLIANCE_RECORDS: ComplianceRecord[] = [
    {
        id: 1,
        requirement: "Annual Business Permit Renewal",
        reference: "CMP-2026-0081",
        agency: "City Government",
        category: "Business Permit",
        owner: "Maria Santos",
        dueDate: "2026-12-31",
        lastReviewed: "2026-10-20",
        status: "Compliant",
        notes: "Renewal documents submitted and acknowledged.",
    },
    {
        id: 2,
        requirement: "DOLE Occupational Safety Report",
        reference: "CMP-2026-0077",
        agency: "Department of Labor and Employment",
        category: "Labor & Safety",
        owner: "Ana Villanueva",
        dueDate: "2026-11-10",
        lastReviewed: "2026-10-28",
        status: "Due Soon",
        notes: "Awaiting final sign-off from the safety officer.",
    },
    {
        id: 3,
        requirement: "Environmental Compliance Certificate",
        reference: "CMP-2026-0072",
        agency: "DENR",
        category: "Environment",
        owner: "Ana Villanueva",
        dueDate: "2026-10-31",
        lastReviewed: "2026-09-15",
        status: "Overdue",
        notes: "Monitoring report for Q3 is still missing.",
    },
    {
        id: 4,
        requirement: "BIR Withholding Tax Filing",
        reference: "CMP-2026-0069",
        agency: "Bureau of Internal Revenue",
        category: "Tax",
        owner: "Finance Team",
        dueDate: "2026-11-15",
        lastReviewed: "2026-10-30",
        status: "Compliant",
        notes: "Filed electronically on October 30, 2026.",
    },
    {
        id: 5,
        requirement: "SSS Employer Contribution Remittance",
        reference: "CMP-2026-0065",
        agency: "Social Security System",
        category: "Employment",
        owner: "HR Department",
        dueDate: "2026-11-30",
        lastReviewed: "2026-10-25",
        status: "Compliant",
        notes: "October remittance posted successfully.",
    },
    {
        id: 6,
        requirement: "Heavy Equipment Safety Inspection",
        reference: "CMP-2026-0061",
        agency: "DOLE",
        category: "Labor & Safety",
        owner: "Jose Ramirez",
        dueDate: "2026-11-08",
        lastReviewed: "2026-10-18",
        status: "Due Soon",
        notes: "Inspection scheduled with the certified safety inspector.",
    },
    {
        id: 7,
        requirement: "Fire Safety Inspection Certificate",
        reference: "CMP-2026-0057",
        agency: "Bureau of Fire Protection",
        category: "Safety",
        owner: "Facilities Team",
        dueDate: "2026-12-15",
        lastReviewed: "2026-10-12",
        status: "Compliant",
        notes: "Certificate valid until December 2027.",
    },
    {
        id: 8,
        requirement: "Wastewater Discharge Permit",
        reference: "CMP-2026-0053",
        agency: "DENR",
        category: "Environment",
        owner: "Facilities Team",
        dueDate: "2026-10-20",
        lastReviewed: "2026-09-01",
        status: "Overdue",
        notes: "Permit renewal application needs supporting lab results.",
    },
    {
        id: 9,
        requirement: "PhilHealth Employer Compliance",
        reference: "CMP-2026-0049",
        agency: "PhilHealth",
        category: "Employment",
        owner: "HR Department",
        dueDate: "2026-11-25",
        lastReviewed: "2026-10-22",
        status: "Compliant",
        notes: "All employee contributions are up to date.",
    },
    {
        id: 10,
        requirement: "Data Privacy Registration Update",
        reference: "CMP-2026-0044",
        agency: "National Privacy Commission",
        category: "Data Privacy",
        owner: "IT Department",
        dueDate: "2026-11-20",
        lastReviewed: "2026-10-29",
        status: "Under Review",
        notes: "Awaiting approval of the updated privacy manual.",
    },
];

const CATEGORY_SUMMARY = [
    { category: "Labor & Safety", total: 12, compliant: 9, color: "#F59E0B" },
    { category: "Environment", total: 8, compliant: 5, color: "#10B981" },
    { category: "Tax & Finance", total: 10, compliant: 9, color: "#3B82F6" },
    { category: "Employment", total: 14, compliant: 12, color: "#A78BFA" },
];

const CATEGORIES = [
    "All",
    "Business Permit",
    "Labor & Safety",
    "Environment",
    "Tax",
    "Employment",
    "Safety",
    "Data Privacy",
];

const STATUSES = ["All", "Compliant", "Due Soon", "Overdue", "Under Review"];

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

function statusClass(status: ComplianceStatus) {
    switch (status) {
        case "Compliant":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "Due Soon":
            return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        case "Overdue":
            return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
        default:
            return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    }
}

function statusIcon(status: ComplianceStatus) {
    switch (status) {
        case "Compliant":
            return <CheckCircle2 size={13} />;
        case "Due Soon":
            return <AlertTriangle size={13} />;
        case "Overdue":
            return <XCircle size={13} />;
        default:
            return <FileCheck2 size={13} />;
    }
}

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
    label,
    value,
    hint,
    icon,
    tone,
}: {
    label: string;
    value: number | string;
    hint: string;
    icon: React.ReactNode;
    tone: "amber" | "emerald" | "rose" | "blue";
}) {
    const tones = {
        amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        emerald:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        rose: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        blue: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{hint}</p>
                </div>

                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function ComplianceMonitoring() {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selected, setSelected] = useState<ComplianceRecord | null>(null);

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return COMPLIANCE_RECORDS.filter((record) => {
            const matchesSearch =
                !keyword ||
                [
                    record.requirement,
                    record.reference,
                    record.agency,
                    record.owner,
                    record.category,
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword);

            const matchesCategory =
                categoryFilter === "All" || record.category === categoryFilter;
            const matchesStatus =
                statusFilter === "All" || record.status === statusFilter;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [search, categoryFilter, statusFilter]);

    const stats = useMemo(() => {
        return {
            total: COMPLIANCE_RECORDS.length,
            compliant: COMPLIANCE_RECORDS.filter(
                (record) => record.status === "Compliant",
            ).length,
            dueSoon: COMPLIANCE_RECORDS.filter(
                (record) => record.status === "Due Soon",
            ).length,
            overdue: COMPLIANCE_RECORDS.filter(
                (record) => record.status === "Overdue",
            ).length,
        };
    }, []);

    const complianceRate = Math.round((stats.compliant / stats.total) * 100);

    return (
        <SuperAdminLayout>
            <Head title="Compliance Monitoring" />

            <div className="space-y-6">
                {/* HEADER */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                            <ShieldCheck
                                size={24}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Compliance Monitoring
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Track regulatory requirements, review schedules,
                                and compliance status across all departments.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Overall Compliance
                        </p>
                        <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {complianceRate}%
                        </p>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total Requirements"
                        value={stats.total}
                        hint="Active monitoring items"
                        icon={<ClipboardCheck size={20} />}
                        tone="amber"
                    />
                    <StatCard
                        label="Compliant"
                        value={stats.compliant}
                        hint="Fully submitted and verified"
                        icon={<CheckCircle2 size={20} />}
                        tone="emerald"
                    />
                    <StatCard
                        label="Due Soon"
                        value={stats.dueSoon}
                        hint="Needs attention this month"
                        icon={<AlertTriangle size={20} />}
                        tone="blue"
                    />
                    <StatCard
                        label="Overdue"
                        value={stats.overdue}
                        hint="Immediate action required"
                        icon={<XCircle size={20} />}
                        tone="rose"
                    />
                </div>

                {/* CATEGORY PROGRESS */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                Compliance by Category
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Percentage of verified requirements per category.
                            </p>
                        </div>
                        <ShieldCheck
                            size={18}
                            className="text-amber-600 dark:text-amber-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {CATEGORY_SUMMARY.map((item) => {
                            const percentage = Math.round(
                                (item.compliant / item.total) * 100,
                            );

                            return (
                                <div
                                    key={item.category}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                                >
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {item.category}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {percentage}%
                                        </span>
                                    </div>

                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: item.color,
                                            }}
                                        />
                                    </div>

                                    <p className="mt-1.5 text-[11px] text-slate-500">
                                        {item.compliant} of {item.total} requirements
                                        compliant
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* FILTERS */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search requirement, agency, or owner..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                {CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                        {category === "All" ? "All Categories" : category}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                {STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {status === "All" ? "All Statuses" : status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                        Showing {filtered.length} of {COMPLIANCE_RECORDS.length}{" "}
                        requirements
                    </p>
                </div>

                {/* TABLE */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800/80">
                            <thead className="bg-slate-50 dark:bg-slate-900/60">
                                <tr>
                                    {[
                                        "Requirement",
                                        "Agency",
                                        "Category",
                                        "Owner",
                                        "Due Date",
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
                                {filtered.map((record) => (
                                    <tr
                                        key={record.id}
                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                                    >
                                        <td className="min-w-[250px] px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                    <ShieldCheck size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                                        {record.requirement}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {record.reference}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="min-w-[180px] px-4 py-3">
                                            <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                                                <Building2 size={13} />
                                                {record.agency}
                                            </p>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {record.category}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {record.owner}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                <CalendarDays size={13} />
                                                {formatDate(record.dueDate)}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                                    record.status,
                                                )}`}
                                            >
                                                {statusIcon(record.status)}
                                                {record.status}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setSelected(record)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:border-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
                                            >
                                                <Eye size={14} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <ShieldCheck
                                                size={30}
                                                className="mx-auto mb-2 text-slate-400 opacity-60"
                                            />
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                No compliance items match your
                                                filters.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {selected && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelected(null);
                        }
                    }}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <ClipboardCheck size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {selected.requirement}
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {selected.reference} · {selected.category}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-white"
                                aria-label="Close compliance details"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                                { label: "Agency", value: selected.agency },
                                { label: "Category", value: selected.category },
                                { label: "Owner", value: selected.owner },
                                { label: "Due Date", value: formatDate(selected.dueDate) },
                                {
                                    label: "Last Reviewed",
                                    value: formatDate(selected.lastReviewed),
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                                >
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Review Notes
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                {selected.notes}
                            </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                Current Status
                            </span>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                    selected.status,
                                )}`}
                            >
                                {statusIcon(selected.status)}
                                {selected.status}
                            </span>
                        </div>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
                            >
                                <CheckCircle2 size={16} />
                                Mark as Reviewed
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}
