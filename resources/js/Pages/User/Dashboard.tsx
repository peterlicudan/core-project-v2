import React, { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";

import {
    Activity,
    BarChart3,
    CalendarDays,
    CreditCard,
    FileCheck2,
    Receipt,
    Search,
    ShieldCheck,
    X,
    ChevronRight,
    Eye,
    FolderOpen,
    TrendingUp,
    ExternalLink,
    Layers,
} from "lucide-react";

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import UserLayout from "../../Layouts/UserLayout";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type DateRange =
    | "Today"
    | "Last 7 Days"
    | "Last 30 Days"
    | "Last 90 Days"
    | "Custom Range";

type OverviewType = "invoices" | "payments" | "contracts" | "compliances";

type User = {
    id?: number;
    name?: string;
    email?: string;
};

type InvoiceRecord = {
    id?: number | string;
    invoice_number?: string;
    invoice_no?: string;
    number?: string;
    client?: string;
    client_name?: string;
    client_email?: string;
    project?: string;
    project_name?: string;
    service?: string;
    description?: string;
    amount?: number | string;
    total_amount?: number | string;
    total?: number | string;
    amount_due?: number | string;
    status?: string;
    created_at?: string;
    updated_at?: string;
    invoice_date?: string;
    due_date?: string;
};

type PaymentRecord = {
    id?: number | string;
    payment_number?: string;
    payment_no?: string;
    reference?: string;
    invoice_number?: string;
    invoice_no?: string;
    client?: string;
    client_name?: string;
    client_email?: string;
    amount?: number | string;
    payment_amount?: number | string;
    total_amount?: number | string;
    payment_method?: string;
    method?: string;
    status?: string;
    payment_date?: string;
    partial_date?: string;
    due_date?: string;
    created_at?: string;
    updated_at?: string;
};

type ContractRecord = {
    id?: number | string;
    contract_number?: string;
    contract_no?: string;
    permit_number?: string;
    permit_no?: string;
    client?: string;
    client_name?: string;
    client_email?: string;
    project?: string;
    project_name?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
};

type ComplianceRecord = {
    id?: number | string;
    name?: string;
    title?: string;
    compliance_name?: string;
    certificate?: string;
    certificate_name?: string;
    client?: string;
    client_name?: string;
    client_email?: string;
    project?: string;
    project_name?: string;
    priority?: string;
    status?: string;
    due_date?: string;
    expiry_date?: string;
    created_at?: string;
    updated_at?: string;
};

type DashboardPageProps = {
    auth?: { user?: User };
    user?: User;
    invoices?: InvoiceRecord[];
    invoiceRecords?: InvoiceRecord[];
    payments?: PaymentRecord[];
    paymentRecords?: PaymentRecord[];
    contracts?: ContractRecord[];
    contractPermits?: ContractRecord[];
    contractRecords?: ContractRecord[];
    compliances?: ComplianceRecord[];
    complianceRecords?: ComplianceRecord[];
    complianceRecordsList?: ComplianceRecord[];
};

type ModuleRecord =
    | InvoiceRecord
    | PaymentRecord
    | ContractRecord
    | ComplianceRecord;

type ModuleRecordItem = {
    module: OverviewType;
    moduleLabel: string;
    record: ModuleRecord;
};

type ActivityItem = {
    id: string;
    title: string;
    description: string;
    module: string;
    date?: string;
    status?: string;
};

type DeadlineItem = {
    id: string;
    title: string;
    type: string;
    date: string;
    status?: string;
};

/*
|--------------------------------------------------------------------------
| MODULE MAPPING
|--------------------------------------------------------------------------
*/

const MODULE_ROUTES: Record<OverviewType, string> = {
    invoices: "/billing-invoicing",
    payments: "/payment-management",
    contracts: "/contract-permit",
    compliances: "/compliance",
};

const MODULE_SHOW_ROUTES: Record<OverviewType, string | null> = {
    invoices: "/billing-invoicing",
    payments: null,
    contracts: null,
    compliances: null,
};

const MODULE_LABELS: Record<OverviewType, string> = {
    invoices: "Billing & Invoicing",
    payments: "Payment Management",
    contracts: "Contract & Permit",
    compliances: "Regulatory Compliance",
};

const MODULE_COLORS: Record<OverviewType, string> = {
    invoices: "#facc15",
    payments: "#22c55e",
    contracts: "#38bdf8",
    compliances: "#a78bfa",
};

/* ✅ Show scrollbar kapag lagpas 4 records */
const SCROLL_RECORD_THRESHOLD = 4;

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

const getDate = (value?: string | Date | null): Date | null => {
    if (!value) return null;

    if (value instanceof Date) {
        const copy = new Date(value);
        return Number.isNaN(copy.getTime()) ? null : copy;
    }

    const normalized = String(value).trim();
    if (!normalized) return null;

    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]);
        const day = Number(dateOnlyMatch[3]);
        const localDate = new Date(year, month - 1, day);

        if (
            localDate.getFullYear() !== year ||
            localDate.getMonth() !== month - 1 ||
            localDate.getDate() !== day
        ) {
            return null;
        }

        return localDate;
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date): Date => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const endOfDay = (date: Date): Date => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
};

const addDays = (date: Date, amount: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
};

const getRangeStart = (range: DateRange, customStart?: string): Date => {
    const today = startOfDay(new Date());

    switch (range) {
        case "Today":
            return today;
        case "Last 7 Days":
            return addDays(today, -6);
        case "Last 30 Days":
            return addDays(today, -29);
        case "Last 90 Days":
            return addDays(today, -89);
        case "Custom Range": {
            const parsed = getDate(customStart);
            return parsed ? startOfDay(parsed) : today;
        }
        default:
            return today;
    }
};

const getRangeEnd = (range: DateRange, customEnd?: string): Date => {
    if (range === "Custom Range") {
        const parsed = getDate(customEnd);
        return parsed ? endOfDay(parsed) : endOfDay(new Date());
    }
    return endOfDay(new Date());
};

const isDateBetween = (date: Date | null, start: Date, end: Date): boolean => {
    if (!date) return false;
    return date >= start && date <= end;
};

/*
|--------------------------------------------------------------------------
| RECORD DATES
|--------------------------------------------------------------------------
*/

const getInvoiceRecordDate = (record: InvoiceRecord): Date | null =>
    getDate(record.created_at) ??
    getDate(record.invoice_date) ??
    getDate(record.updated_at);

const getPaymentRecordDate = (record: PaymentRecord): Date | null =>
    getDate(record.payment_date) ??
    getDate(record.partial_date) ??
    getDate(record.created_at) ??
    getDate(record.updated_at);

const getContractRecordDate = (record: ContractRecord): Date | null =>
    getDate(record.created_at) ??
    getDate(record.start_date) ??
    getDate(record.updated_at);

const getComplianceRecordDate = (record: ComplianceRecord): Date | null =>
    getDate(record.created_at) ?? getDate(record.updated_at);

const getModuleRecordDate = (
    module: OverviewType,
    record: ModuleRecord,
): Date | null => {
    switch (module) {
        case "invoices":
            return getInvoiceRecordDate(record as InvoiceRecord);
        case "payments":
            return getPaymentRecordDate(record as PaymentRecord);
        case "contracts":
            return getContractRecordDate(record as ContractRecord);
        case "compliances":
            return getComplianceRecordDate(record as ComplianceRecord);
        default:
            return null;
    }
};

/*
|--------------------------------------------------------------------------
| RECORD LABELS
|--------------------------------------------------------------------------
*/

const getRecordNumber = (
    module: OverviewType,
    record: ModuleRecord,
): string => {
    const r = record as any;

    if (module === "invoices") {
        return (
            r.invoice_number ??
            r.invoice_no ??
            r.number ??
            `Invoice #${r.id ?? ""}`
        );
    }

    if (module === "payments") {
        return (
            r.payment_number ??
            r.payment_no ??
            r.reference ??
            `Payment #${r.id ?? ""}`
        );
    }

    if (module === "contracts") {
        return (
            r.contract_number ??
            r.contract_no ??
            r.permit_number ??
            r.permit_no ??
            `Contract #${r.id ?? ""}`
        );
    }

    return (
        r.compliance_name ??
        r.name ??
        r.title ??
        r.certificate ??
        r.certificate_name ??
        `Compliance #${r.id ?? ""}`
    );
};

const getRecordClient = (
    module: OverviewType,
    record: ModuleRecord,
): string => {
    const r = record as any;
    return r.client_name ?? r.client ?? r.client_email ?? "No client";
};

const getRecordAmount = (
    module: OverviewType,
    record: ModuleRecord,
): number | null => {
    const r = record as any;

    if (module === "invoices") {
        return Number(
            r.total_amount ?? r.total ?? r.amount_due ?? r.amount ?? 0,
        );
    }

    if (module === "payments") {
        return Number(r.payment_amount ?? r.total_amount ?? r.amount ?? 0);
    }

    return null;
};

/*
|--------------------------------------------------------------------------
| FORMATTING
|--------------------------------------------------------------------------
*/

const formatDate = (value?: string | Date | null): string => {
    if (!value) return "No date";
    const date = getDate(value);
    if (!date) return String(value);

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const formatDateTime = (value?: string | Date | null): string => {
    if (!value) return "No date";
    const date = getDate(value);
    if (!date) return String(value);

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const formatCurrency = (value?: number | string | null): string => {
    const number = Number(value ?? 0);
    if (!Number.isFinite(number)) return "₱0.00";

    return number.toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const getStatusClass = (status?: string): string => {
    const normalized = status?.toLowerCase().trim() ?? "";

    if (
        normalized.includes("paid") ||
        normalized.includes("approved") ||
        normalized.includes("active") ||
        normalized.includes("completed") ||
        normalized.includes("verified") ||
        normalized.includes("compliant")
    ) {
        return "border-emerald-400/20 bg-emerald-400/10 text-emerald-400";
    }

    if (
        normalized.includes("pending") ||
        normalized.includes("review") ||
        normalized.includes("partial") ||
        normalized.includes("expiring")
    ) {
        return "border-yellow-400/20 bg-yellow-400/10 text-yellow-400";
    }

    if (
        normalized.includes("rejected") ||
        normalized.includes("expired") ||
        normalized.includes("overdue")
    ) {
        return "border-red-400/20 bg-red-400/10 text-red-400";
    }

    return "border-slate-700 bg-slate-800 text-slate-300";
};

const uniqueRecords = <T extends { id?: number | string }>(
    records: T[],
): T[] => {
    const seen = new Set<string>();

    return records.filter((record, index) => {
        const key =
            record.id !== undefined && record.id !== null
                ? String(record.id)
                : `fallback-${index}-${JSON.stringify(record)}`;

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const buildRecordUrl = (module: OverviewType, record: ModuleRecord): string => {
    const showBase = MODULE_SHOW_ROUTES[module];
    const indexBase = MODULE_ROUTES[module];

    if (!showBase) return indexBase;

    const recordId = record.id;

    if (recordId === undefined || recordId === null || recordId === "") {
        return indexBase;
    }

    return `${showBase}/${recordId}`;
};

/*
|--------------------------------------------------------------------------
| DETAILED TOOLTIP — SCROLLABLE
|--------------------------------------------------------------------------
*/

type TooltipRecord = {
    module: OverviewType;
    label: string;
    client: string;
    amount: number | null;
    status?: string;
};

function DetailedTooltipContent({
    label,
    records,
    totalLabel,
}: {
    label?: string;
    records: TooltipRecord[];
    totalLabel?: string;
}) {
    return (
        <div className="w-[320px] max-w-[90vw] rounded-2xl border border-slate-700 bg-[#111827]/98 shadow-2xl backdrop-blur-xl">
            {label && (
                <div className="border-b border-slate-800 px-4 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {label}
                    </p>
                </div>
            )}

            {records.length === 0 ? (
                <div className="px-4 py-4">
                    <p className="text-xs text-slate-500">No records</p>
                </div>
            ) : (
                <div className="max-h-[300px] overflow-y-auto px-3 py-3 [scrollbar-width:thin] [scrollbar-color:rgba(250,204,21,0.4)_transparent]">
                    <div className="space-y-2">
                        {records.map((record, index) => (
                            <div
                                key={`${record.label}-${index}`}
                                className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span
                                        className="text-[9px] font-black uppercase tracking-wider"
                                        style={{
                                            color: MODULE_COLORS[record.module],
                                        }}
                                    >
                                        {MODULE_LABELS[record.module]}
                                    </span>

                                    {record.status && (
                                        <span
                                            className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${getStatusClass(
                                                record.status,
                                            )}`}
                                        >
                                            {record.status}
                                        </span>
                                    )}
                                </div>

                                <p className="mt-1 truncate text-xs font-bold text-white">
                                    {record.label}
                                </p>

                                <div className="mt-1 flex items-center justify-between gap-3">
                                    <span className="truncate text-[10px] text-slate-400">
                                        {record.client}
                                    </span>

                                    {record.amount !== null && (
                                        <span className="shrink-0 text-[10px] font-bold text-yellow-300">
                                            {formatCurrency(record.amount)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {totalLabel && (
                <div className="border-t border-slate-800 px-4 py-2">
                    <p className="text-[10px] font-bold text-white">
                        {totalLabel}
                    </p>
                </div>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| SYSTEM OVERVIEW
|--------------------------------------------------------------------------
*/

function SystemOverview({
    stats,
    onSelect,
}: {
    stats: {
        invoices: number;
        payments: number;
        contracts: number;
        compliances: number;
    };
    onSelect: (type: OverviewType) => void;
}) {
    const items = [
        {
            key: "invoices" as OverviewType,
            label: "Billing & Invoicing",
            value: stats.invoices,
            description: "Actual invoice records",
            icon: Receipt,
        },
        {
            key: "payments" as OverviewType,
            label: "Payment Management",
            value: stats.payments,
            description: "Actual payment records",
            icon: CreditCard,
        },
        {
            key: "contracts" as OverviewType,
            label: "Contract & Permit",
            value: stats.contracts,
            description: "Actual contract records",
            icon: FileCheck2,
        },
        {
            key: "compliances" as OverviewType,
            label: "Regulatory Compliance",
            value: stats.compliances,
            description: "Actual compliance records",
            icon: ShieldCheck,
        },
    ];

    return (
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-7">
            <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                        <BarChart3 size={20} className="text-yellow-400" />
                    </div>

                    <h2 className="text-xl font-bold text-white">
                        System Overview
                    </h2>
                </div>

                <p className="text-sm text-slate-400">
                    Select a module to view its actual records.
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onSelect(item.key)}
                            className="group text-left"
                        >
                            <div className="h-full rounded-2xl border border-slate-800 bg-slate-950/50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-yellow-400/30 hover:bg-slate-950 hover:shadow-lg hover:shadow-yellow-400/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-slate-500">
                                            {item.label}
                                        </p>

                                        <p className="mt-2 text-3xl font-bold text-white">
                                            {item.value.toLocaleString()}
                                        </p>

                                        <p className="mt-1 truncate text-xs text-slate-500">
                                            {item.description}
                                        </p>
                                    </div>

                                    <div
                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                                        style={{
                                            backgroundColor: `${MODULE_COLORS[item.key]}15`,
                                        }}
                                    >
                                        <Icon
                                            size={22}
                                            style={{
                                                color: MODULE_COLORS[item.key],
                                            }}
                                            className="transition-transform duration-200 group-hover:scale-110"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                                    <span className="text-[11px] font-medium text-slate-500">
                                        View records
                                    </span>

                                    <ChevronRight
                                        size={16}
                                        className="text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-yellow-400"
                                    />
                                </div>

                                <Link
                                    href={MODULE_ROUTES[item.key]}
                                    onClick={(event) => event.stopPropagation()}
                                    className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-yellow-400 transition hover:text-yellow-300"
                                >
                                    <ExternalLink size={11} />
                                    Open module page
                                </Link>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| RECORD DRAWER
|--------------------------------------------------------------------------
*/

function RecordDrawer({
    type,
    onClose,
    invoices,
    payments,
    contracts,
    compliances,
}: {
    type: OverviewType | null;
    onClose: () => void;
    invoices: InvoiceRecord[];
    payments: PaymentRecord[];
    contracts: ContractRecord[];
    compliances: ComplianceRecord[];
}) {
    const [search, setSearch] = useState("");

    if (!type) return null;

    const config = {
        invoices: {
            title: "Billing & Invoicing Records",
            description: "Actual invoice records from the system.",
            icon: Receipt,
            records: invoices,
        },
        payments: {
            title: "Payment Records",
            description: "Actual payment records from the system.",
            icon: CreditCard,
            records: payments,
        },
        contracts: {
            title: "Contract & Permit Records",
            description: "Actual contract and permit records from the system.",
            icon: FileCheck2,
            records: contracts,
        },
        compliances: {
            title: "Compliance Records",
            description: "Actual compliance records from the system.",
            icon: ShieldCheck,
            records: compliances,
        },
    }[type];

    const Icon = config.icon;

    const searchValue = search.trim().toLowerCase();

    const filteredRecords = config.records.filter((record: ModuleRecord) => {
        if (!searchValue) return true;
        return JSON.stringify(record).toLowerCase().includes(searchValue);
    });

    const handleOpenRecord = (record: ModuleRecord) => {
        const url = buildRecordUrl(type, record);
        onClose();
        router.visit(url);
    };

    return (
        <div className="fixed inset-0 z-[100]">
            <button
                type="button"
                aria-label="Close records"
                onClick={onClose}
                className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
            />

            <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-[#0a0a0a] shadow-2xl">
                <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                                style={{
                                    backgroundColor: `${MODULE_COLORS[type]}15`,
                                }}
                            >
                                <Icon
                                    size={20}
                                    style={{ color: MODULE_COLORS[type] }}
                                />
                            </div>

                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-bold text-white">
                                    {config.title}
                                </h2>

                                <p className="mt-1 text-sm text-slate-400">
                                    {config.description}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/50 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                        >
                            <X size={19} />
                        </button>
                    </div>

                    <div className="relative mt-5">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search records..."
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/50 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-yellow-400/30 focus:ring-1 focus:ring-yellow-400/20"
                        />
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-3 sm:px-6">
                    <p className="text-xs font-medium text-slate-500">
                        {filteredRecords.length.toLocaleString()} record
                        {filteredRecords.length === 1 ? "" : "s"} found
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Eye size={14} />
                        <span>Click a record to open it</span>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    {filteredRecords.length === 0 ? (
                        <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-6 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400/10">
                                <FolderOpen
                                    size={25}
                                    className="text-yellow-400"
                                />
                            </div>

                            <h3 className="text-sm font-semibold text-white">
                                No records found
                            </h3>

                            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                                No records are currently available for this
                                module.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRecords.map(
                                (record: ModuleRecord, index) => (
                                    <RecordCard
                                        key={record.id ?? `${type}-${index}`}
                                        type={type}
                                        record={record}
                                        onClick={() => handleOpenRecord(record)}
                                    />
                                ),
                            )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-5 py-4 sm:px-6">
                    <Link
                        href={MODULE_ROUTES[type]}
                        onClick={onClose}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-400 transition hover:bg-yellow-400/20"
                    >
                        <FolderOpen size={16} />
                        View all {type}
                        <ChevronRight size={15} />
                    </Link>
                </div>
            </aside>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| RECORD CARD
|--------------------------------------------------------------------------
*/

function RecordCard({
    type,
    record,
    onClick,
}: {
    type: OverviewType;
    record: ModuleRecord;
    onClick?: () => void;
}) {
    const number = getRecordNumber(type, record);
    const client = getRecordClient(type, record);
    const amount = getRecordAmount(type, record);

    if (type === "invoices") {
        const invoice = record as InvoiceRecord;

        const project =
            invoice.project_name ??
            invoice.project ??
            invoice.service ??
            invoice.description ??
            "No project";

        return (
            <RecordContainer onClick={onClick}>
                <RecordHeader
                    title={number}
                    subtitle={client}
                    extra={project}
                    status={invoice.status}
                />

                <RecordFooter>
                    <RecordValue
                        label="Amount"
                        value={formatCurrency(amount ?? 0)}
                    />

                    <RecordValue
                        label="Due date"
                        value={formatDate(invoice.due_date)}
                        align="right"
                    />
                </RecordFooter>
            </RecordContainer>
        );
    }

    if (type === "payments") {
        const payment = record as PaymentRecord;

        const method =
            payment.payment_method ??
            payment.method ??
            "Payment method not specified";

        return (
            <RecordContainer onClick={onClick}>
                <RecordHeader
                    title={number}
                    subtitle={client}
                    extra={method}
                    status={payment.status}
                />

                <RecordFooter>
                    <RecordValue
                        label="Payment amount"
                        value={formatCurrency(amount ?? 0)}
                    />

                    <RecordValue
                        label="Payment date"
                        value={formatDate(
                            payment.payment_date ??
                                payment.partial_date ??
                                payment.created_at,
                        )}
                        align="right"
                    />
                </RecordFooter>
            </RecordContainer>
        );
    }

    if (type === "contracts") {
        const contract = record as ContractRecord;

        const project =
            contract.project_name ?? contract.project ?? "No project";

        return (
            <RecordContainer onClick={onClick}>
                <RecordHeader
                    title={number}
                    subtitle={client}
                    extra={project}
                    status={contract.status}
                />

                <RecordFooter>
                    <RecordValue
                        label="Start"
                        value={formatDate(contract.start_date)}
                    />

                    <RecordValue
                        label="End"
                        value={formatDate(contract.end_date)}
                        align="right"
                    />
                </RecordFooter>
            </RecordContainer>
        );
    }

    const compliance = record as ComplianceRecord;

    return (
        <RecordContainer onClick={onClick}>
            <RecordHeader
                title={number}
                subtitle={client}
                extra={`Priority: ${compliance.priority ?? "Not specified"}`}
                status={compliance.status}
            />

            <RecordFooter>
                <RecordValue
                    label="Due date"
                    value={formatDate(compliance.due_date)}
                />

                <RecordValue
                    label="Expiry"
                    value={formatDate(compliance.expiry_date)}
                    align="right"
                />
            </RecordFooter>
        </RecordContainer>
    );
}

function RecordContainer({
    children,
    onClick,
}: {
    children: React.ReactNode;
    onClick?: () => void;
}) {
    const interactive = typeof onClick === "function";

    return (
        <div
            onClick={onClick}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={(event) => {
                if (!interactive) return;
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick?.();
                }
            }}
            className={`group rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition ${
                interactive
                    ? "cursor-pointer hover:border-yellow-400/30 hover:bg-slate-950 hover:shadow-lg hover:shadow-yellow-400/5"
                    : "hover:border-slate-700"
            }`}
        >
            {children}

            {interactive && (
                <div className="mt-3 flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-600 transition group-hover:text-yellow-400">
                    <span>Open record</span>
                    <ChevronRight
                        size={12}
                        className="transition group-hover:translate-x-0.5"
                    />
                </div>
            )}
        </div>
    );
}

function RecordHeader({
    title,
    subtitle,
    extra,
    status,
}: {
    title: string;
    subtitle: string;
    extra: string;
    status?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="truncate font-semibold text-white">{title}</p>

                <p className="mt-1 truncate text-sm text-slate-400">
                    {subtitle}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">{extra}</p>
            </div>

            {status && <StatusBadge status={status} />}
        </div>
    );
}

function RecordFooter({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-800 pt-3">
            {children}
        </div>
    );
}

function RecordValue({
    label,
    value,
    align,
}: {
    label: string;
    value: string;
    align?: "right";
}) {
    return (
        <div className={align === "right" ? "text-right" : ""}>
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="mt-1 truncate text-xs text-slate-300">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;

    return (
        <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(
                status,
            )}`}
        >
            {status}
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| ACTIVITY TREND CHART
|--------------------------------------------------------------------------
*/

function ActivityTrendChart({
    data,
    range,
    allModuleRecords,
}: {
    data: Array<{ label: string; value: number }>;
    range: string;
    allModuleRecords: ModuleRecordItem[];
}) {
    const getRecordsForLabel = (label: string): TooltipRecord[] => {
        return allModuleRecords
            .filter((item) => {
                const date = getModuleRecordDate(item.module, item.record);
                if (!date) return false;

                const formatted = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                });

                return formatted === label;
            })
            .map((item) => ({
                module: item.module,
                label: getRecordNumber(item.module, item.record),
                client: getRecordClient(item.module, item.record),
                amount: getRecordAmount(item.module, item.record),
                status: (item.record as any).status,
            }));
    };

    const ActivityTooltip = ({
        active,
        payload,
        label,
    }: {
        active?: boolean;
        payload?: Array<{ value?: number }>;
        label?: string;
    }) => {
        if (!active || !payload?.length || !label) return null;

        const records = getRecordsForLabel(label);
        const total = payload[0]?.value ?? 0;

        return (
            <DetailedTooltipContent
                label={label}
                records={records}
                totalLabel={`Total: ${total} record${total === 1 ? "" : "s"}`}
            />
        );
    };

    return (
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                            <TrendingUp size={20} className="text-yellow-400" />
                        </div>

                        <h2 className="text-xl font-bold text-white">
                            Module Activity Trends
                        </h2>
                    </div>

                    <p className="text-sm text-slate-400">
                        Actual records recorded across your ALIBATON modules.
                        Hover to see the records.
                    </p>
                </div>

                <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400">
                    {range}
                </span>
            </div>

            <div className="h-[340px] w-full">
                {data.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyState
                            icon={<TrendingUp size={28} />}
                            text="No activity in this period"
                        />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <defs>
                                <linearGradient
                                    id="activityGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#facc15"
                                        stopOpacity={0.35}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="#facc15"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#1e293b"
                            />

                            <XAxis
                                dataKey="label"
                                tick={{
                                    fill: "#94a3b8",
                                    fontSize: 11,
                                }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={20}
                            />

                            <YAxis
                                allowDecimals={false}
                                tick={{
                                    fill: "#94a3b8",
                                    fontSize: 12,
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                content={<ActivityTooltip />}
                                cursor={{
                                    stroke: "#facc15",
                                    strokeWidth: 1,
                                    strokeDasharray: "3 3",
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#facc15"
                                strokeWidth={3}
                                fill="url(#activityGradient)"
                                dot={false}
                                activeDot={{
                                    r: 6,
                                    fill: "#facc15",
                                    stroke: "#111827",
                                    strokeWidth: 3,
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| 7 DAY MODULE DISTRIBUTION — MAY SCROLLABLE TOOLTIP
|--------------------------------------------------------------------------
*/

function SevenDayModuleDistributionChart({
    data,
    allModuleRecords,
}: {
    data: Array<{ name: string; value: number }>;
    allModuleRecords: ModuleRecordItem[];
}) {
    const chartData = data.filter((item) => item.value > 0);

    const totalRecords = chartData.reduce(
        (total, item) => total + item.value,
        0,
    );

    const getRecordsForModule = (moduleName: string): TooltipRecord[] => {
        const moduleKey = Object.entries(MODULE_LABELS).find(
            ([, label]) => label === moduleName,
        )?.[0] as OverviewType | undefined;

        if (!moduleKey) return [];

        return allModuleRecords
            .filter((item) => item.module === moduleKey)
            .map((item) => ({
                module: item.module,
                label: getRecordNumber(item.module, item.record),
                client: getRecordClient(item.module, item.record),
                amount: getRecordAmount(item.module, item.record),
                status: (item.record as any).status,
            }));
    };

    const DistributionTooltip = ({
        active,
        payload,
    }: {
        active?: boolean;
        payload?: Array<{ name?: string; value?: number }>;
    }) => {
        if (!active || !payload?.length) return null;

        const moduleName = payload[0]?.name ?? "";
        const records = getRecordsForModule(moduleName);

        return (
            <DetailedTooltipContent
                label={moduleName}
                records={records}
                totalLabel={`Total: ${records.length} record${
                    records.length === 1 ? "" : "s"
                }`}
            />
        );
    };

    return (
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                            <BarChart3 size={20} className="text-yellow-400" />
                        </div>

                        <h2 className="text-xl font-bold text-white">
                            7-Day Module Distribution
                        </h2>
                    </div>

                    <p className="text-sm text-slate-400">
                        Actual records grouped by module during the last 7 days.
                        Hover to see the records.
                    </p>
                </div>

                <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400">
                    Last 7 Days
                </span>
            </div>

            {chartData.length === 0 ? (
                <div className="flex min-h-[340px] items-center justify-center">
                    <EmptyState
                        icon={<BarChart3 size={28} />}
                        text="No module activity during the last 7 days"
                    />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                    <div className="relative h-[420px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={110}
                                    outerRadius={160}
                                    paddingAngle={3}
                                    stroke="#0f172a"
                                    strokeWidth={3}
                                >
                                    {chartData.map((item, index) => {
                                        const moduleKey = Object.entries(
                                            MODULE_LABELS,
                                        ).find(
                                            ([, label]) => label === item.name,
                                        )?.[0] as
                                            | OverviewType
                                            | undefined;

                                        return (
                                            <Cell
                                                key={`${item.name}-${index}`}
                                                fill={
                                                    moduleKey
                                                        ? MODULE_COLORS[
                                                              moduleKey
                                                          ]
                                                        : "#facc15"
                                                }
                                            />
                                        );
                                    })}
                                </Pie>

                                <Tooltip content={<DistributionTooltip />} />

                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => (
                                        <span className="text-xs text-slate-300">
                                            {value}
                                        </span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-white">
                                {totalRecords}
                            </span>

                            <span className="mt-1 text-xs font-medium text-slate-500">
                                Total Records
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {chartData.map((item, index) => {
                            const percentage =
                                totalRecords > 0
                                    ? (item.value / totalRecords) * 100
                                    : 0;

                            const moduleKey = Object.entries(MODULE_LABELS).find(
                                ([, label]) => label === item.name,
                            )?.[0] as OverviewType | undefined;

                            const color = moduleKey
                                ? MODULE_COLORS[moduleKey]
                                : "#facc15";

                            return (
                                <div
                                    key={item.name}
                                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className="h-3 w-3 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            />

                                            <span className="truncate text-sm font-medium text-slate-300">
                                                {item.name}
                                            </span>
                                        </div>

                                        <span className="text-sm font-bold text-white">
                                            {item.value}
                                        </span>
                                    </div>

                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: color,
                                            }}
                                        />
                                    </div>

                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[11px] text-slate-500">
                                            Actual records
                                        </span>

                                        <span className="text-[11px] font-semibold text-slate-400">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| STACKED MODULE CHART
|--------------------------------------------------------------------------
*/

function StackedModuleChart({
    data,
    range,
    allModuleRecords,
    dateRange,
}: {
    data: Array<{
        label: string;
        invoices: number;
        payments: number;
        contracts: number;
        compliances: number;
        total: number;
    }>;
    range: string;
    allModuleRecords: ModuleRecordItem[];
    dateRange: DateRange;
}) {
    const getRecordsForLabelAndModule = (
        label: string,
        module: OverviewType,
    ): TooltipRecord[] => {
        return allModuleRecords
            .filter((item) => {
                if (item.module !== module) return false;

                const date = getModuleRecordDate(item.module, item.record);
                if (!date) return false;

                const formatted = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                });

                return formatted === label;
            })
            .map((item) => ({
                module: item.module,
                label: getRecordNumber(item.module, item.record),
                client: getRecordClient(item.module, item.record),
                amount: getRecordAmount(item.module, item.record),
                status: (item.record as any).status,
            }));
    };

    const StackedTooltip = ({
        active,
        payload,
        label,
    }: {
        active?: boolean;
        payload?: Array<{ name?: string; value?: number; dataKey?: string }>;
        label?: string;
    }) => {
        if (!active || !payload?.length || !label) return null;

        const allRecords: TooltipRecord[] = [];

        (["invoices", "payments", "contracts", "compliances"] as OverviewType[])
            .forEach((module) => {
                const records = getRecordsForLabelAndModule(label, module);
                allRecords.push(...records);
            });

        const total = payload.reduce(
            (sum, item) => sum + Number(item.value ?? 0),
            0,
        );

        return (
            <DetailedTooltipContent
                label={label}
                records={allRecords}
                totalLabel={`Total: ${total} record${total === 1 ? "" : "s"}`}
            />
        );
    };

    const hasData = data.some((item) => item.total > 0);

    return (
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-7">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                            <Layers size={20} className="text-yellow-400" />
                        </div>

                        <h2 className="text-xl font-bold text-white">
                            Records by Module Over Time
                        </h2>
                    </div>

                    <p className="text-sm text-slate-400">
                        Nakikita kung anong module ang may pinakamaraming
                        records sa bawat panahon. Hover to see the records.
                    </p>
                </div>

                <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400">
                    {range}
                </span>
            </div>

            <div className="h-[380px] w-full">
                {!hasData ? (
                    <EmptyState
                        icon={<Layers size={28} />}
                        text={`No module activity during ${range.toLowerCase()}`}
                    />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#1e293b"
                            />

                            <XAxis
                                dataKey="label"
                                tick={{
                                    fill: "#94a3b8",
                                    fontSize: 11,
                                }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={20}
                            />

                            <YAxis
                                allowDecimals={false}
                                tick={{
                                    fill: "#94a3b8",
                                    fontSize: 12,
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                content={<StackedTooltip />}
                                cursor={{
                                    fill: "rgba(250, 204, 21, 0.05)",
                                }}
                            />

                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => (
                                    <span className="text-xs text-slate-300">
                                        {value}
                                    </span>
                                )}
                            />

                            <Bar
                                dataKey="invoices"
                                stackId="records"
                                fill={MODULE_COLORS.invoices}
                                name={MODULE_LABELS.invoices}
                            />

                            <Bar
                                dataKey="payments"
                                stackId="records"
                                fill={MODULE_COLORS.payments}
                                name={MODULE_LABELS.payments}
                            />

                            <Bar
                                dataKey="contracts"
                                stackId="records"
                                fill={MODULE_COLORS.contracts}
                                name={MODULE_LABELS.contracts}
                            />

                            <Bar
                                dataKey="compliances"
                                stackId="records"
                                fill={MODULE_COLORS.compliances}
                                name={MODULE_LABELS.compliances}
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| RECENT ACTIVITY — MAY SCROLL BAR KAPAG > 4 RECORDS
|--------------------------------------------------------------------------
*/

function RecentActivitySection({
    activities,
    onOpen,
}: {
    activities: ActivityItem[];
    onOpen?: (activity: ActivityItem) => void;
}) {
    /* ✅ Scrollbar kapag lagpas 4 records */
    const shouldScroll = activities.length > SCROLL_RECORD_THRESHOLD;

    return (
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-7">
            <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                        <Activity size={20} className="text-yellow-400" />
                    </div>

                    <h2 className="text-xl font-bold text-white">
                        Recent Activity
                    </h2>

                    {activities.length > 0 && (
                        <span className="ml-1 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                            {activities.length}
                        </span>
                    )}
                </div>

                <p className="text-sm text-slate-400">
                    Latest actual records from your modules.
                    {shouldScroll && (
                        <span className="ml-1 text-yellow-400/70">
                            (scroll to view more)
                        </span>
                    )}
                </p>
            </div>

            {activities.length === 0 ? (
                <EmptyState
                    icon={<Activity size={28} />}
                    text="No recent activity"
                />
            ) : (
                <div
                    className={`alibaton-dashboard-scroll space-y-3 ${
                        shouldScroll
                            ? "max-h-[420px] overflow-y-auto pr-2"
                            : ""
                    }`}
                >
                    {activities.map((activity) => (
                        <button
                            key={activity.id}
                            type="button"
                            onClick={() => onOpen?.(activity)}
                            className="group flex w-full items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-left transition hover:border-yellow-400/30 hover:bg-slate-950"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                <Activity
                                    size={18}
                                    className="text-yellow-400"
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-white">
                                        {activity.title}
                                    </p>

                                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[9px] font-medium text-slate-400">
                                        {activity.module}
                                    </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-400">
                                    {activity.description}
                                </p>

                                {activity.date && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        {formatDateTime(activity.date)}
                                    </p>
                                )}
                            </div>

                            {activity.status && (
                                <StatusBadge status={activity.status} />
                            )}

                            <ChevronRight
                                size={15}
                                className="mt-3 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-yellow-400"
                            />
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| UPCOMING DEADLINES — MAY SCROLL BAR KAPAG > 4 RECORDS
|--------------------------------------------------------------------------
*/

function UpcomingDeadlinesSection({
    deadlines,
    onOpen,
}: {
    deadlines: DeadlineItem[];
    onOpen?: (deadline: DeadlineItem) => void;
}) {
    /* ✅ Scrollbar kapag lagpas 4 records */
    const shouldScroll = deadlines.length > SCROLL_RECORD_THRESHOLD;

    return (
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-7">
            <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10">
                        <CalendarDays size={20} className="text-yellow-400" />
                    </div>

                    <h2 className="text-xl font-bold text-white">
                        Upcoming Deadlines
                    </h2>

                    {deadlines.length > 0 && (
                        <span className="ml-1 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                            {deadlines.length}
                        </span>
                    )}
                </div>

                <p className="text-sm text-slate-400">
                    Actual upcoming due, expiry, and contract end dates.
                    {shouldScroll && (
                        <span className="ml-1 text-yellow-400/70">
                            (scroll to view more)
                        </span>
                    )}
                </p>
            </div>

            {deadlines.length === 0 ? (
                <EmptyState
                    icon={<CalendarDays size={28} />}
                    text="No upcoming deadlines"
                />
            ) : (
                <div
                    className={`alibaton-dashboard-scroll space-y-3 ${
                        shouldScroll
                            ? "max-h-[420px] overflow-y-auto pr-2"
                            : ""
                    }`}
                >
                    {deadlines.map((deadline) => (
                        <button
                            key={deadline.id}
                            type="button"
                            onClick={() => onOpen?.(deadline)}
                            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-left transition hover:border-yellow-400/30 hover:bg-slate-950"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                <CalendarDays
                                    size={18}
                                    className="text-yellow-400"
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-white">
                                    {deadline.title}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {deadline.type}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-sm font-semibold text-yellow-400">
                                    {formatDate(deadline.date)}
                                </p>

                                {deadline.status && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        {deadline.status}
                                    </p>
                                )}
                            </div>

                            <ChevronRight
                                size={15}
                                className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-yellow-400"
                            />
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| EMPTY STATE
|--------------------------------------------------------------------------
*/

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex justify-center text-slate-600">
                {icon}
            </div>

            <p className="text-sm font-medium text-slate-400">{text}</p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MAIN DASHBOARD
|--------------------------------------------------------------------------
*/

export default function Dashboard() {
    const { props } = usePage<DashboardPageProps>();

    const [dateRange, setDateRange] = useState<DateRange>("Today");

    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");

    const [selectedOverview, setSelectedOverview] =
        useState<OverviewType | null>(null);

    const user = props.auth?.user ?? props.user ?? {};

    const invoices = useMemo(
        () => uniqueRecords(props.invoices ?? props.invoiceRecords ?? []),
        [props.invoices, props.invoiceRecords],
    );

    const payments = useMemo(
        () => uniqueRecords(props.payments ?? props.paymentRecords ?? []),
        [props.payments, props.paymentRecords],
    );

    const contracts = useMemo(
        () =>
            uniqueRecords([
                ...(props.contracts ?? []),
                ...(props.contractPermits ?? []),
                ...(props.contractRecords ?? []),
            ]),
        [props.contracts, props.contractPermits, props.contractRecords],
    );

    const compliances = useMemo(
        () =>
            uniqueRecords(
                props.compliances ??
                    props.complianceRecords ??
                    props.complianceRecordsList ??
                    [],
            ),
        [
            props.compliances,
            props.complianceRecords,
            props.complianceRecordsList,
        ],
    );

    const dashboardStats = useMemo(
        () => ({
            invoices: invoices.length,
            payments: payments.length,
            contracts: contracts.length,
            compliances: compliances.length,
        }),
        [
            invoices.length,
            payments.length,
            contracts.length,
            compliances.length,
        ],
    );

    const allModuleRecords = useMemo<ModuleRecordItem[]>(
        () => [
            ...invoices.map((record) => ({
                module: "invoices" as const,
                moduleLabel: MODULE_LABELS.invoices,
                record,
            })),
            ...payments.map((record) => ({
                module: "payments" as const,
                moduleLabel: MODULE_LABELS.payments,
                record,
            })),
            ...contracts.map((record) => ({
                module: "contracts" as const,
                moduleLabel: MODULE_LABELS.contracts,
                record,
            })),
            ...compliances.map((record) => ({
                module: "compliances" as const,
                moduleLabel: MODULE_LABELS.compliances,
                record,
            })),
        ],
        [invoices, payments, contracts, compliances],
    );

    const rangeRecords = useMemo<ModuleRecordItem[]>(() => {
        const start = getRangeStart(dateRange, customStartDate);
        const end = getRangeEnd(dateRange, customEndDate);

        if (start > end) return [];

        return allModuleRecords.filter(({ module, record }) => {
            const recordDate = getModuleRecordDate(module, record);
            return isDateBetween(recordDate, start, end);
        });
    }, [allModuleRecords, dateRange, customStartDate, customEndDate]);

    const activityTrendData = useMemo<
        Array<{ label: string; value: number }>
    >(() => {
        const start = getRangeStart(dateRange, customStartDate);
        const end = getRangeEnd(dateRange, customEndDate);

        if (start > end) return [];

        const numberOfDays =
            Math.floor(
                (startOfDay(end).getTime() - startOfDay(start).getTime()) /
                    (1000 * 60 * 60 * 24),
            ) + 1;

        const points: Array<{ label: string; value: number }> = [];

        for (let index = 0; index < numberOfDays; index++) {
            const current = addDays(start, index);
            const dayStart = startOfDay(current);
            const dayEnd = endOfDay(current);

            const value = allModuleRecords.filter(({ module, record }) => {
                const recordDate = getModuleRecordDate(module, record);
                return isDateBetween(recordDate, dayStart, dayEnd);
            }).length;

            points.push({
                label: current.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                value,
            });
        }

        return points;
    }, [allModuleRecords, dateRange, customStartDate, customEndDate]);

    const stackedModuleData = useMemo(() => {
        const start = getRangeStart(dateRange, customStartDate);
        const end = getRangeEnd(dateRange, customEndDate);

        if (start > end) return [];

        const numberOfDays =
            Math.floor(
                (startOfDay(end).getTime() - startOfDay(start).getTime()) /
                    (1000 * 60 * 60 * 24),
            ) + 1;

        const points: Array<{
            label: string;
            invoices: number;
            payments: number;
            contracts: number;
            compliances: number;
            total: number;
        }> = [];

        for (let index = 0; index < numberOfDays; index++) {
            const current = addDays(start, index);
            const dayStart = startOfDay(current);
            const dayEnd = endOfDay(current);

            const countByModule = (module: OverviewType) =>
                allModuleRecords.filter((item) => {
                    if (item.module !== module) return false;
                    const recordDate = getModuleRecordDate(
                        item.module,
                        item.record,
                    );
                    return isDateBetween(recordDate, dayStart, dayEnd);
                }).length;

            const invoiceCount = countByModule("invoices");
            const paymentCount = countByModule("payments");
            const contractCount = countByModule("contracts");
            const complianceCount = countByModule("compliances");

            points.push({
                label: current.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                invoices: invoiceCount,
                payments: paymentCount,
                contracts: contractCount,
                compliances: complianceCount,
                total:
                    invoiceCount +
                    paymentCount +
                    contractCount +
                    complianceCount,
            });
        }

        return points;
    }, [allModuleRecords, dateRange, customStartDate, customEndDate]);

    const moduleActivityData = useMemo(() => {
        const countByModule = (module: OverviewType) =>
            rangeRecords.filter((item) => item.module === module).length;

        return [
            { name: MODULE_LABELS.invoices, value: countByModule("invoices") },
            { name: MODULE_LABELS.payments, value: countByModule("payments") },
            { name: MODULE_LABELS.contracts, value: countByModule("contracts") },
            {
                name: MODULE_LABELS.compliances,
                value: countByModule("compliances"),
            },
        ];
    }, [rangeRecords]);

    /* ✅ Recent Activity — pinapakita lahat (scroll na ang bahala) */
    const recentActivities = useMemo<ActivityItem[]>(() => {
        return [...allModuleRecords]
            .sort((a, b) => {
                const aDate =
                    getModuleRecordDate(a.module, a.record)?.getTime() ?? 0;
                const bDate =
                    getModuleRecordDate(b.module, b.record)?.getTime() ?? 0;
                return bDate - aDate;
            })
            .slice(0, 12)
            .map((item, index) => {
                const record = item.record as any;
                const recordId = record.id ?? index;

                const title = getRecordNumber(item.module, item.record);
                const client = getRecordClient(item.module, item.record);

                let description = client;

                if (item.module === "payments") {
                    description =
                        record.payment_method ?? record.method ?? client;
                }

                if (item.module === "compliances") {
                    description = record.status ?? client;
                }

                const recordDate = getModuleRecordDate(
                    item.module,
                    item.record,
                );

                return {
                    id: `${item.module}-${recordId}`,
                    title,
                    description,
                    module: item.moduleLabel,
                    date: recordDate?.toISOString(),
                    status: record.status,
                };
            });
    }, [allModuleRecords]);

    /* ✅ Upcoming Deadlines — pinapakita lahat (scroll na ang bahala) */
    const upcomingDeadlines = useMemo<DeadlineItem[]>(() => {
        const today = startOfDay(new Date());
        const futureLimit = endOfDay(addDays(today, 90));

        const deadlines: DeadlineItem[] = [];

        const addDeadline = (
            record: any,
            module: string,
            field: string,
            title: string,
        ) => {
            const rawValue = record[field];
            const date = getDate(rawValue);

            if (!date) return;
            if (date < today || date > futureLimit) return;

            deadlines.push({
                id: `${module}-${record.id ?? title}-${field}`,
                title,
                type: module,
                date: String(rawValue),
                status: record.status,
            });
        };

        invoices.forEach((record) => {
            addDeadline(
                record,
                MODULE_LABELS.invoices,
                "due_date",
                getRecordNumber("invoices", record),
            );
        });

        payments.forEach((record) => {
            addDeadline(
                record,
                MODULE_LABELS.payments,
                "due_date",
                getRecordNumber("payments", record),
            );
        });

        contracts.forEach((record) => {
            addDeadline(
                record,
                MODULE_LABELS.contracts,
                "end_date",
                getRecordNumber("contracts", record),
            );
        });

        compliances.forEach((record) => {
            const title = getRecordNumber("compliances", record);

            addDeadline(
                record,
                MODULE_LABELS.compliances,
                "due_date",
                title,
            );

            addDeadline(
                record,
                MODULE_LABELS.compliances,
                "expiry_date",
                title,
            );
        });

        return deadlines
            .sort(
                (a, b) =>
                    (getDate(a.date)?.getTime() ?? 0) -
                    (getDate(b.date)?.getTime() ?? 0),
            )
            .slice(0, 12);
    }, [invoices, payments, contracts, compliances]);

    const userName = user.name?.trim() || "User";

    const filters: DateRange[] = [
        "Today",
        "Last 7 Days",
        "Last 30 Days",
        "Last 90 Days",
    ];

    const handleDateRangeChange = (range: DateRange) => {
        if (range !== "Custom Range") {
            setDateRange(range);
            return;
        }

        const today = new Date();
        const defaultStart = addDays(today, -29);

        if (!customStartDate) {
            setCustomStartDate(
                `${defaultStart.getFullYear()}-${String(
                    defaultStart.getMonth() + 1,
                ).padStart(2, "0")}-${String(defaultStart.getDate()).padStart(
                    2,
                    "0",
                )}`,
            );
        }

        if (!customEndDate) {
            setCustomEndDate(
                `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
                    2,
                    "0",
                )}-${String(today.getDate()).padStart(2, "0")}`,
            );
        }

        setDateRange("Custom Range");
    };

    const customRangeInvalid =
        dateRange === "Custom Range" &&
        !!customStartDate &&
        !!customEndDate &&
        getRangeStart("Custom Range", customStartDate) >
            getRangeEnd("Custom Range", customEndDate);

    const activeRangeLabel =
        dateRange === "Custom Range"
            ? customStartDate && customEndDate
                ? `${formatDate(customStartDate)} – ${formatDate(
                      customEndDate,
                  )}`
                : "Custom Range"
            : dateRange;

    const handleOpenActivity = (activity: ActivityItem) => {
        const modules: OverviewType[] = [
            "invoices",
            "payments",
            "contracts",
            "compliances",
        ];

        const matchedModule = modules.find((m) =>
            activity.id.startsWith(`${m}-`),
        );

        if (!matchedModule) return;

        const recordId = activity.id.slice(matchedModule.length + 1);
        const showBase = MODULE_SHOW_ROUTES[matchedModule];

        if (!showBase || !recordId) {
            router.visit(MODULE_ROUTES[matchedModule]);
            return;
        }

        router.visit(`${showBase}/${recordId}`);
    };

    const handleOpenDeadline = (deadline: DeadlineItem) => {
        const labelToModule: Record<string, OverviewType> = {
            [MODULE_LABELS.invoices]: "invoices",
            [MODULE_LABELS.payments]: "payments",
            [MODULE_LABELS.contracts]: "contracts",
            [MODULE_LABELS.compliances]: "compliances",
        };

        const module = labelToModule[deadline.type];

        if (!module) return;
        router.visit(MODULE_ROUTES[module]);
    };

    return (
        <UserLayout>
            <Head title="Dashboard" />

            <style>{`
                .alibaton-dashboard-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(250, 204, 21, 0.45) transparent;
                }
                .alibaton-dashboard-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .alibaton-dashboard-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 999px;
                }
                .alibaton-dashboard-scroll::-webkit-scrollbar-thumb {
                    background: rgba(250, 204, 21, 0.45);
                    border-radius: 999px;
                }
                .alibaton-dashboard-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(250, 204, 21, 0.7);
                }
            `}</style>

            <div className="min-w-0 flex-1 bg-[#000000] px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-8">
                <div className="mx-auto w-full max-w-[1600px]">
                    <div className="mb-5">
                        <div className="mb-4">
                            <div>
                                <div className="mb-2 flex items-center gap-2"></div>

                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    Welcome back, {userName}!
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                                    Monitor your actual module records,
                                    activity, and upcoming deadlines from one
                                    place.
                                </p>
                            </div>
                        </div>
                    </div>

                    <SystemOverview
                        stats={dashboardStats}
                        onSelect={setSelectedOverview}
                    />

                    <div className="mb-6 w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-2 shadow-xl">
                        <div className="flex w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
                            {filters.map((filter) => {
                                const active = dateRange === filter;

                                return (
                                    <button
                                        key={filter}
                                        type="button"
                                        onClick={() =>
                                            handleDateRangeChange(filter)
                                        }
                                        className={`shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                                            active
                                                ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                        }`}
                                    >
                                        {filter}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() =>
                                    handleDateRangeChange("Custom Range")
                                }
                                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all sm:px-4 sm:text-sm ${
                                    dateRange === "Custom Range"
                                        ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                                <CalendarDays size={14} />
                                Custom Range
                            </button>

                            {dateRange === "Custom Range" && (
                                <div className="flex shrink-0 items-center gap-2 pl-1">
                                    <label className="flex h-[42px] shrink-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            From
                                        </span>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(event) => {
                                                setCustomStartDate(
                                                    event.target.value,
                                                );
                                                setDateRange("Custom Range");
                                            }}
                                            className="min-w-[128px] bg-transparent text-xs font-medium text-white outline-none [color-scheme:dark]"
                                        />
                                    </label>

                                    <label className="flex h-[42px] shrink-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            To
                                        </span>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(event) => {
                                                setCustomEndDate(
                                                    event.target.value,
                                                );
                                                setDateRange("Custom Range");
                                            }}
                                            className="min-w-[128px] bg-transparent text-xs font-medium text-white outline-none [color-scheme:dark]"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        {customRangeInvalid && (
                            <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-red-400">
                                The start date must be on or before the end
                                date.
                            </p>
                        )}
                    </div>

                    <ActivityTrendChart
                        data={activityTrendData}
                        range={activeRangeLabel}
                        allModuleRecords={allModuleRecords}
                    />

                    {dateRange === "Last 7 Days" && (
                        <SevenDayModuleDistributionChart
                            data={moduleActivityData}
                            allModuleRecords={rangeRecords}
                        />
                    )}

                    {(dateRange === "Last 30 Days" ||
                        dateRange === "Last 90 Days" ||
                        dateRange === "Custom Range") && (
                        <StackedModuleChart
                            data={stackedModuleData}
                            range={activeRangeLabel}
                            allModuleRecords={allModuleRecords}
                            dateRange={dateRange}
                        />
                    )}

                    <div className="grid gap-6 xl:grid-cols-2">
                        <RecentActivitySection
                            activities={recentActivities}
                            onOpen={handleOpenActivity}
                        />

                        <UpcomingDeadlinesSection
                            deadlines={upcomingDeadlines}
                            onOpen={handleOpenDeadline}
                        />
                    </div>

                    <div className="mt-8 flex flex-col gap-2 border-t border-slate-800 pt-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            © {new Date().getFullYear()} ALIBATON Heavy
                            Equipment & Logistics
                        </p>

                        <div className="flex items-center gap-2">
                            <FileCheck2 size={13} />
                            <span>Dashboard synced with ALIBATON system</span>
                        </div>
                    </div>
                </div>
            </div>

            <RecordDrawer
                type={selectedOverview}
                onClose={() => setSelectedOverview(null)}
                invoices={invoices}
                payments={payments}
                contracts={contracts}
                compliances={compliances}
            />
        </UserLayout>
    );
}
