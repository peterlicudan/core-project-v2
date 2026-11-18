import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    CircleDollarSign,
    Clock,
    CreditCard,
    Download,
    Eye,
    Mail,
    Pencil,
    Receipt,
    Search,
    TrendingUp,
    Wallet,
    X,
} from "lucide-react";
import {
    Area,
    AreaChart,
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

type Payment = {
    id: number;
    reference: string;
    receipt_number: string | null;
    receipt: string | null;
    client: string;
    client_email: string | null;
    invoice_number: string | null;
    billing_number: string | null;
    job_order_number: string | null;
    invoice_id: number | null;
    payment_method: string;
    amount: number;
    invoice_amount: number;
    total_paid: number;
    remaining_balance: number;
    status: string;
    payment_date: string | null;
    partial_date: string | null;
    due_date: string | null;
    notes: string | null;
    superadmin_verified: boolean;
    superadmin_verified_at: string | null;
    superadmin_rejected: boolean;
    superadmin_rejected_at: string | null;
    superadmin_rejection_reason: string | null;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    user_role: string | null;
    edited_by: string | null;
    edited_at: string | null;
    created_at: string;
    updated_at: string;
};

type Stats = {
    revenue: number;
    collected: number;
    pending: number;
    overdue: number;
    overdueCount: number;
    count: number;
    verified: number;
    rejected: number;
    pendingVerification: number;
};

type MonthlyPoint = {
    month: string;
    count: number;
    revenue: number;
    collected: number;
};

type Bucket = { count: number; amount: number };

type Filters = {
    status: string | null;
    method: string | null;
    verified: string | null;
    rejected: string | null;
    date_from: string | null;
    date_to: string | null;
    search: string | null;
};

type Props = {
    payments: Payment[];
    stats: Stats;
    monthlyTrend: MonthlyPoint[];
    byStatus: Record<string, Bucket>;
    paymentStatuses: string[];
    paymentMethods: string[];
    filters: Filters;
    flash: { success?: string | null; error?: string | null };
};

type ConfirmAction =
    | { type: "verify"; payment: Payment }
    | { type: "mark-partial"; payment: Payment }
    | { type: "mark-paid"; payment: Payment }
    | null;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
}

function formatDate(value: string | null) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function statusClass(status: string) {
    switch ((status || "").toLowerCase()) {
        case "paid":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "partial":
            return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        case "rejected":
            return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
        default:
            return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    }
}

function statusIcon(status: string) {
    switch ((status || "").toLowerCase()) {
        case "paid":
            return <CheckCircle2 size={13} />;
        case "partial":
            return <CircleDollarSign size={13} />;
        case "rejected":
            return <AlertTriangle size={13} />;
        default:
            return <Clock size={13} />;
    }
}

const EXPENSE_COLORS = ["#F59E0B", "#3B82F6", "#10B981", "#A78BFA", "#EC4899"];

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
    label,
    value,
    hint,
    trend,
    icon,
    tone,
}: {
    label: string;
    value: string;
    hint: string;
    trend?: "up" | "down";
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
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 truncate text-2xl font-bold text-slate-900 dark:text-white">
                        {value}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                        {trend === "up" && (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <ArrowUpRight size={13} />
                            </span>
                        )}
                        {trend === "down" && (
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                                <ArrowDownRight size={13} />
                            </span>
                        )}
                        <span className="text-slate-500">{hint}</span>
                    </div>
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

export default function FinancialMonitoring({
    payments,
    stats,
    monthlyTrend,
    byStatus,
    paymentStatuses,
    paymentMethods,
    filters,
    flash,
}: Props) {
    const { props } = usePage<any>();

    const [search, setSearch] = useState(filters.search ?? "");
    const [processing, setProcessing] = useState(false);

    // Modals
    const [viewing, setViewing] = useState<Payment | null>(null);
    const [editing, setEditing] = useState<Payment | null>(null);
    const [rejecting, setRejecting] = useState<Payment | null>(null);
    const [emailing, setEmailing] = useState<Payment | null>(null);

    // ✅ Generic confirmation modal (verify / mark-partial / mark-paid)
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    // Edit form
    const [editForm, setEditForm] = useState({
        payment_method: "Bank Transfer",
        payment_date: "",
        partial_date: "",
        due_date: "",
        notes: "",
    });

    // Reject form
    const [rejectReason, setRejectReason] = useState("");

    // Email form
    const [emailForm, setEmailForm] = useState({
        email: "",
        subject: "",
        message: "",
    });

    /*
    |----------------------------------------------------------------------
    | FILTER HELPER
    |----------------------------------------------------------------------
    */
    const applyFilters = (next: Partial<Filters>) => {
        router.get(
            "/superadmin/financial",
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    /*
    |----------------------------------------------------------------------
    | ACTIONS
    |----------------------------------------------------------------------
    */
    const verify = (p: Payment) => {
        setConfirmAction({ type: "verify", payment: p });
    };

    const markPartial = (p: Payment) => {
        setConfirmAction({ type: "mark-partial", payment: p });
    };

    const markPaid = (p: Payment) => {
        setConfirmAction({ type: "mark-paid", payment: p });
    };

    const downloadReceipt = (p: Payment) => {
        window.open(
            `/superadmin/financial/payments/${p.id}/receipt`,
            "_blank"
        );
    };

    const openEdit = (p: Payment) => {
        setEditing(p);
        setEditForm({
            payment_method: p.payment_method || "Bank Transfer",
            payment_date: p.payment_date || "",
            partial_date: p.partial_date || "",
            due_date: p.due_date || "",
            notes: p.notes || "",
        });
    };

    const submitEdit = () => {
        if (!editing) return;
        setProcessing(true);
        router.put(
            `/superadmin/financial/payments/${editing.id}`,
            editForm,
            {
                onFinish: () => {
                    setProcessing(false);
                    setEditing(null);
                },
            }
        );
    };

    const openReject = (p: Payment) => {
        setRejecting(p);
        setRejectReason("");
    };

    const submitReject = () => {
        if (!rejecting || !rejectReason.trim()) {
            alert("Please provide a reason.");
            return;
        }
        setProcessing(true);
        router.post(
            `/superadmin/financial/payments/${rejecting.id}/reject`,
            { reason: rejectReason },
            {
                onFinish: () => {
                    setProcessing(false);
                    setRejecting(null);
                },
            }
        );
    };

    const openEmail = (p: Payment) => {
        setEmailing(p);
        setEmailForm({
            email: p.client_email || "",
            subject: `ALIBATON Payment Update - ${p.reference}`,
            message: `Hello ${p.client},\n\nRegarding your payment ${p.reference} (Invoice: ${p.invoice_number || "N/A"}).\n\nAmount: ${formatCurrency(p.amount)}\nStatus: ${p.status}\n\nIf you have any questions, please contact us.\n\nThank you,\nALIBATON`,
        });
    };

    const submitEmail = () => {
        if (!emailing) return;
        setProcessing(true);
        router.post(
            `/superadmin/financial/payments/${emailing.id}/send-email`,
            emailForm,
            {
                onFinish: () => {
                    setProcessing(false);
                    setEmailing(null);
                },
            }
        );
    };

    /*
    |----------------------------------------------------------------------
    | CONFIRMATION MODAL HELPERS
    |----------------------------------------------------------------------
    */
    const closeConfirm = () => {
        if (!processing) setConfirmAction(null);
    };

    const submitConfirm = () => {
        if (!confirmAction) return;

        const { type, payment } = confirmAction;
        setProcessing(true);

        const url =
            type === "verify"
                ? `/superadmin/financial/payments/${payment.id}/verify`
                : type === "mark-partial"
                ? `/superadmin/financial/payments/${payment.id}/mark-partial`
                : `/superadmin/financial/payments/${payment.id}/mark-paid`;

        router.post(url, {}, {
            onFinish: () => {
                setProcessing(false);
                setConfirmAction(null);
            },
        });
    };

    const getConfirmConfig = () => {
        if (!confirmAction) return null;

        const { type, payment } = confirmAction;

        switch (type) {
            case "verify":
                return {
                    title: "Verify this payment?",
                    message: `You are about to verify ${payment.reference} as a superadmin. This will confirm the payment is legitimate and notify the admin and the payment owner.`,
                    confirmLabel: "Yes, Verify",
                    confirmClass: "bg-emerald-600 hover:bg-emerald-700",
                    iconColor: "text-emerald-500 dark:text-emerald-400",
                    iconBg: "bg-emerald-500/10 border-emerald-500/30",
                };
            case "mark-partial":
                return {
                    title: "Mark as Partial (50%)?",
                    message: `This will set ${payment.reference} to Partial and adjust the amount to 50% of the invoice total. The owner will be notified.`,
                    confirmLabel: "Yes, Mark Partial",
                    confirmClass: "bg-amber-600 hover:bg-amber-700",
                    iconColor: "text-amber-500 dark:text-amber-400",
                    iconBg: "bg-amber-500/10 border-amber-500/30",
                };
            case "mark-paid":
                return {
                    title: "Mark as Fully Paid?",
                    message: `This will set ${payment.reference} to Fully Paid, using the full invoice amount, and mark the invoice as Paid. The owner will be notified.`,
                    confirmLabel: "Yes, Mark Paid",
                    confirmClass: "bg-blue-600 hover:bg-blue-700",
                    iconColor: "text-blue-500 dark:text-blue-400",
                    iconBg: "bg-blue-500/10 border-blue-500/30",
                };
            default:
                return null;
        }
    };

    const confirmConfig = getConfirmConfig();

    /*
    |----------------------------------------------------------------------
    | CHARTS DATA
    |----------------------------------------------------------------------
    */
    const chartData = useMemo(() => {
        if (monthlyTrend.length === 0) {
            return Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (5 - i));
                const ym = d.toISOString().slice(0, 7);
                return { month: ym, revenue: 0, collected: 0, count: 0 };
            });
        }
        return monthlyTrend.map((m) => ({
            month: m.month.slice(5),
            revenue: m.revenue,
            collected: m.collected,
            count: m.count,
        }));
    }, [monthlyTrend]);

    const statusChartData = useMemo(() => {
        return Object.entries(byStatus).map(([status, b], idx) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: b.amount,
            count: b.count,
            color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
        }));
    }, [byStatus]);

    /*
    |----------------------------------------------------------------------
    | RENDER
    |----------------------------------------------------------------------
    */
    return (
        <SuperAdminLayout>
            <Head title="Financial Monitoring" />

            <div className="space-y-6">
                {/* HEADER — wala nang Export Report button */}
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                        <CircleDollarSign
                            size={24}
                            className="text-amber-600 dark:text-amber-400"
                        />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Financial Monitoring
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Full oversight of all payments — verify, edit, reject, email, and download receipts.
                        </p>
                    </div>
                </div>

                {/* FLASH */}
                {flash?.success && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        {flash.success}
                    </div>
                )}
                {(flash?.error || props?.errors?.payment || props?.errors?.email) && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                        {flash?.error || props?.errors?.payment || props?.errors?.email}
                    </div>
                )}

                {/* STATS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total Invoiced"
                        value={formatCurrency(stats.revenue)}
                        hint={`${stats.count} payments`}
                        icon={<Receipt size={20} />}
                        tone="amber"
                    />
                    <StatCard
                        label="Collected"
                        value={formatCurrency(stats.collected)}
                        hint="paid payments"
                        trend="up"
                        icon={<Wallet size={20} />}
                        tone="emerald"
                    />
                    <StatCard
                        label="Outstanding"
                        value={formatCurrency(stats.pending)}
                        hint="pending & partial"
                        icon={<Clock size={20} />}
                        tone="blue"
                    />
                    <StatCard
                        label="Overdue"
                        value={formatCurrency(stats.overdue)}
                        hint={`${stats.overdueCount} overdue`}
                        trend="down"
                        icon={<AlertTriangle size={20} />}
                        tone="rose"
                    />
                </div>

                {/* SUPERADMIN KPI */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Pending Verification
                        </p>
                        <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.pendingVerification}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Verified
                        </p>
                        <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.verified}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Rejected
                        </p>
                        <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                            {stats.rejected}
                        </p>
                    </div>
                </div>

                {/* CHARTS */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D] xl:col-span-2">
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Revenue vs. Collections
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Monthly invoiced amount vs. collected amount.
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                <TrendingUp size={12} />
                                Last 12 months
                            </span>
                        </div>

                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" stroke="#263244" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `₱${Number(v) / 1000}K`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#0A0F1D",
                                            border: "1px solid #334155",
                                            borderRadius: 12,
                                            fontSize: 12,
                                        }}
                                        labelStyle={{ color: "#fff" }}
                                        formatter={(v: any) => formatCurrency(Number(v))}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#F59E0B"
                                        strokeWidth={2.5}
                                        fill="url(#revenueFill)"
                                        name="Invoiced"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="collected"
                                        stroke="#10B981"
                                        strokeWidth={2.5}
                                        fill="url(#collectedFill)"
                                        name="Collected"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        <div className="mb-5">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                By Status
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Payment amounts grouped by status.
                            </p>
                        </div>

                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={statusChartData}
                                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#263244" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: "#94A3B8", fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: "#94A3B8", fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `${Number(v) / 1000}K`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "rgba(148,163,184,0.08)" }}
                                        contentStyle={{
                                            backgroundColor: "#0A0F1D",
                                            border: "1px solid #334155",
                                            borderRadius: 12,
                                            fontSize: 12,
                                        }}
                                        formatter={(v: any) => formatCurrency(Number(v))}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {statusChartData.map((item) => (
                                            <Cell key={item.name} fill={item.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 space-y-2">
                            {statusChartData.map((item) => (
                                <div
                                    key={item.name}
                                    className="flex items-center justify-between text-xs"
                                >
                                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        {item.name}
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {item.count} · {formatCurrency(item.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PAYMENTS TABLE */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                Payments Management
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                {payments.length} payments — all staff and admin records.
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
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && applyFilters({ search })
                                    }
                                    placeholder="Search receipt / invoice / client..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white sm:w-64"
                                />
                            </div>

                            <select
                                value={filters.status ?? ""}
                                onChange={(e) =>
                                    applyFilters({ status: e.target.value || null })
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                <option value="">All Statuses</option>
                                {paymentStatuses.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filters.method ?? ""}
                                onChange={(e) =>
                                    applyFilters({ method: e.target.value || null })
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                <option value="">All Methods</option>
                                {paymentMethods.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filters.verified ?? ""}
                                onChange={(e) =>
                                    applyFilters({ verified: e.target.value || null })
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                <option value="">Any SA Status</option>
                                <option value="1">Verified</option>
                                <option value="0">Not Verified</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => router.get("/superadmin/financial")}
                                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800/80">
                            <thead className="bg-slate-50 dark:bg-slate-900/60">
                                <tr>
                                    {[
                                        "Reference",
                                        "Client",
                                        "Invoice",
                                        "Amount",
                                        "Method",
                                        "Status",
                                        "Superadmin",
                                        "Actions",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                                {payments.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
                                            <Receipt
                                                size={30}
                                                className="mx-auto mb-2 text-slate-400 opacity-60"
                                            />
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                No payments match your filters.
                                            </p>
                                        </td>
                                    </tr>
                                )}

                                {payments.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                                    >
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {p.reference}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {p.created_at}
                                            </p>
                                        </td>

                                        <td className="min-w-[180px] px-4 py-3">
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {p.client}
                                            </p>
                                            {p.client_email && (
                                                <p className="truncate text-xs text-slate-500">
                                                    {p.client_email}
                                                </p>
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <p className="text-slate-700 dark:text-slate-300">
                                                {p.invoice_number ?? "—"}
                                            </p>
                                            {p.billing_number && (
                                                <p className="text-xs text-slate-500">
                                                    Bill: {p.billing_number}
                                                </p>
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                            {formatCurrency(p.amount)}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                            <span className="inline-flex items-center gap-1.5">
                                                <CreditCard size={13} />
                                                {p.payment_method}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                                    p.status
                                                )}`}
                                            >
                                                {statusIcon(p.status)}
                                                {p.status}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            {p.superadmin_verified && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                    ✓ Verified
                                                </span>
                                            )}
                                            {p.superadmin_rejected && (
                                                <span
                                                    title={p.superadmin_rejection_reason ?? ""}
                                                    className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300"
                                                >
                                                    ✕ Rejected
                                                </span>
                                            )}
                                            {!p.superadmin_verified && !p.superadmin_rejected && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                                    ⏳ Awaiting
                                                </span>
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <div className="flex flex-wrap justify-end gap-1">
                                                {!p.superadmin_verified &&
                                                    !p.superadmin_rejected &&
                                                    ["paid", "partial"].includes(
                                                        (p.status || "").toLowerCase()
                                                    ) && (
                                                        <button
                                                            onClick={() => verify(p)}
                                                            disabled={processing}
                                                            className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                                            title="Verify"
                                                        >
                                                            <CheckCircle2 size={13} />
                                                        </button>
                                                    )}

                                                {!p.superadmin_verified &&
                                                    !p.superadmin_rejected &&
                                                    (p.status || "").toLowerCase() !== "paid" && (
                                                        <>
                                                            <button
                                                                onClick={() => markPartial(p)}
                                                                disabled={processing}
                                                                className="rounded-lg bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                                                title="Mark Partial"
                                                            >
                                                                <CircleDollarSign size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => markPaid(p)}
                                                                disabled={processing}
                                                                className="rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                                                title="Mark Fully Paid"
                                                            >
                                                                <Wallet size={13} />
                                                            </button>
                                                        </>
                                                    )}

                                                {!p.superadmin_verified &&
                                                    !p.superadmin_rejected &&
                                                    (p.status || "").toLowerCase() !== "paid" && (
                                                        <button
                                                            onClick={() => openReject(p)}
                                                            disabled={processing}
                                                            className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                                                            title="Reject"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    )}

                                                {!p.superadmin_rejected && (
                                                    <button
                                                        onClick={() => openEdit(p)}
                                                        disabled={processing}
                                                        className="rounded-lg bg-slate-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => openEmail(p)}
                                                    disabled={processing || !p.client_email}
                                                    className="rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                                    title="Send Email"
                                                >
                                                    <Mail size={13} />
                                                </button>

                                                {/* ✅ Download Receipt button */}
                                                <button
                                                    onClick={() => downloadReceipt(p)}
                                                    className="rounded-lg bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-700"
                                                    title="Download Receipt"
                                                >
                                                    <Download size={13} />
                                                </button>

                                                <button
                                                    onClick={() => setViewing(p)}
                                                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:border-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
                                                    title="View"
                                                >
                                                    <Eye size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* VIEW MODAL */}
            {viewing && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setViewing(null);
                    }}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
                                    Payment Details
                                </p>
                                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                    {viewing.reference}
                                </h2>
                                <p className="text-xs text-slate-500">{viewing.client}</p>
                            </div>
                            <button
                                onClick={() => setViewing(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Amount
                            </p>
                            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(viewing.amount)}
                            </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {[
                                { label: "Status", value: viewing.status },
                                { label: "Method", value: viewing.payment_method },
                                { label: "Invoice", value: viewing.invoice_number ?? "—" },
                                { label: "Billing No.", value: viewing.billing_number ?? "—" },
                                { label: "Payment Date", value: formatDate(viewing.payment_date) },
                                { label: "Partial Date", value: formatDate(viewing.partial_date) },
                                { label: "Due Date", value: formatDate(viewing.due_date) },
                                { label: "Invoice Total", value: formatCurrency(viewing.invoice_amount) },
                                { label: "Total Paid", value: formatCurrency(viewing.total_paid) },
                                { label: "Remaining", value: formatCurrency(viewing.remaining_balance) },
                                { label: "Submitted By", value: viewing.user_name ?? "—" },
                                { label: "Submitted Role", value: viewing.user_role ?? "—" },
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

                        {viewing.notes && (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Notes
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                                    {viewing.notes}
                                </p>
                            </div>
                        )}

                        {viewing.superadmin_rejected && viewing.superadmin_rejection_reason && (
                            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                    Superadmin Rejection
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-rose-700 dark:text-rose-300">
                                    {viewing.superadmin_rejection_reason}
                                </p>
                                <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">
                                    {viewing.superadmin_rejected_at}
                                </p>
                            </div>
                        )}

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => downloadReceipt(viewing)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                            >
                                <Download size={16} />
                                Download Receipt
                            </button>
                            <button
                                onClick={() => setViewing(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editing && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setEditing(null);
                    }}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Edit Payment
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {editing.reference} — {editing.client}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditing(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Payment Method
                                </label>
                                <select
                                    value={editForm.payment_method}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, payment_method: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                >
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Payment Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.payment_date}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, payment_date: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Partial Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.partial_date}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, partial_date: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.due_date}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, due_date: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Notes
                                </label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, notes: e.target.value })
                                    }
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setEditing(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitEdit}
                                disabled={processing}
                                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECT MODAL */}
            {rejecting && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setRejecting(null);
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Reject Payment
                        </h2>
                        <p className="text-xs text-slate-500">
                            {rejecting.reference} — {rejecting.client}
                        </p>

                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection (required)"
                            rows={4}
                            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                        />

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setRejecting(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitReject}
                                disabled={processing || !rejectReason.trim()}
                                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EMAIL MODAL */}
            {emailing && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setEmailing(null);
                    }}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Send Email to Client
                        </h2>
                        <p className="text-xs text-slate-500">
                            {emailing.reference} — {emailing.client}
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    To
                                </label>
                                <input
                                    type="email"
                                    value={emailForm.email}
                                    onChange={(e) =>
                                        setEmailForm({ ...emailForm, email: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={emailForm.subject}
                                    onChange={(e) =>
                                        setEmailForm({ ...emailForm, subject: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Message
                                </label>
                                <textarea
                                    value={emailForm.message}
                                    onChange={(e) =>
                                        setEmailForm({ ...emailForm, message: e.target.value })
                                    }
                                    rows={6}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setEmailing(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitEmail}
                                disabled={processing || !emailForm.email || !emailForm.subject}
                                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL — Verify / Mark Partial / Mark Paid */}
            {confirmAction && confirmConfig && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeConfirm();
                    }}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`flex h-14 w-14 items-center justify-center rounded-full border mb-4 ${confirmConfig.iconBg}`}
                            >
                                {confirmAction.type === "verify" && (
                                    <CheckCircle2
                                        size={24}
                                        className={confirmConfig.iconColor}
                                    />
                                )}
                                {confirmAction.type === "mark-partial" && (
                                    <CircleDollarSign
                                        size={24}
                                        className={confirmConfig.iconColor}
                                    />
                                )}
                                {confirmAction.type === "mark-paid" && (
                                    <Wallet
                                        size={24}
                                        className={confirmConfig.iconColor}
                                    />
                                )}
                            </div>

                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {confirmConfig.title}
                            </h2>

                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                {confirmConfig.message}
                            </p>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <button
                                type="button"
                                onClick={closeConfirm}
                                disabled={processing}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitConfirm}
                                disabled={processing}
                                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${confirmConfig.confirmClass}`}
                            >
                                {processing ? "Processing..." : confirmConfig.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}