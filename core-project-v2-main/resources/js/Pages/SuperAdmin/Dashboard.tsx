import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";

import {
    Users,
    FileText,
    DollarSign,
    Shield,
    TrendingUp,
    Clock,
    ArrowRight,
    UserCog,
    Activity,
    LayoutDashboard,
    AlertTriangle,
    CheckCircle2,
    BriefcaseBusiness,
} from "lucide-react";

import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";

/* ==========================================================================
   TYPES
   ========================================================================== */

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type UserListItem = {
    id: number;
    name: string;
    email: string;
};

type RecentUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    last_login_at: string | null;
};

type RecentJobOrder = {
    id: number;
    number: string;
    client: string;
    status: string;
    amount: number;
    created_at: string;
};

type RecentPayment = {
    id: number;
    receipt_number: string;
    client: string;
    amount: number;
    status: string;
    created_at: string;
};

type Stats = {
    users: {
        total: number;
        admins: number;
        staff: number;
        clients: number;
        superadmins: number;
        active: number;
    };
    job_orders: {
        total: number;
        pending: number;
        ongoing: number;
        completed: number;
    };
    financial: {
        total_revenue: number;
        outstanding: number;
        monthly_revenue: number;
    };
    contracts: {
        active: number;
    };
    alerts: {
        expiring_compliance: number;
        overdue_compliance: number;
        expiring_documents: number;
    };
};

type UserLists = {
    admins: UserListItem[];
    staff: UserListItem[];
    clients: UserListItem[];
    superadmins: UserListItem[];
};

type DashboardProps = {
    stats: Stats;
    recentUsers: RecentUser[];
    recentJobOrders: RecentJobOrder[];
    recentPayments: RecentPayment[];
    userLists: UserLists;
    generatedAt: string;
};

/* ==========================================================================
   CHART COLORS
   ========================================================================== */

const CHART_COLORS = {
    amber: "#F59E0B",
    blue: "#3B82F6",
    purple: "#A78BFA",
    emerald: "#10B981",
    rose: "#F43F5E",
    cyan: "#06B6D4",
    grid: "#263244",
    text: "#94A3B8",
};

/* ==========================================================================
   MAIN DASHBOARD
   ========================================================================== */

export default function Dashboard({
    stats,
    recentUsers,
    recentJobOrders,
    recentPayments,
    userLists,
    generatedAt,
}: DashboardProps) {
    const { auth } = usePage<{ auth: { user: User } }>().props;
    const user = auth?.user;

    const getRoute = (name: string, fallback: string) => {
        if (
            typeof window !== "undefined" &&
            typeof (window as any).route === "function"
        ) {
            try {
                return (window as any).route(name);
            } catch {
                return fallback;
            }
        }

        return fallback;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Number(amount) || 0);
    };

    const totalAlerts =
        stats.alerts.expiring_compliance +
        stats.alerts.overdue_compliance +
        stats.alerts.expiring_documents;

    /*
    |--------------------------------------------------------------------------
    | USER DISTRIBUTION CHART DATA
    |--------------------------------------------------------------------------
    */

    const userChartData = [
        {
            name: "Admins",
            value: stats.users.admins,
            color: CHART_COLORS.blue,
            users: userLists?.admins ?? [],
        },
        {
            name: "Staff",
            value: stats.users.staff,
            color: CHART_COLORS.purple,
            users: userLists?.staff ?? [],
        },
        {
            name: "Clients",
            value: stats.users.clients,
            color: CHART_COLORS.emerald,
            users: userLists?.clients ?? [],
        },
        {
            name: "Super Admins",
            value: stats.users.superadmins,
            color: CHART_COLORS.amber,
            users: userLists?.superadmins ?? [],
        },
    ].filter((item) => item.value > 0);

    /*
    |--------------------------------------------------------------------------
    | JOB ORDER CHART DATA
    |--------------------------------------------------------------------------
    */

    const jobOrderChartData = [
        {
            name: "Pending",
            count: stats.job_orders.pending,
            fill: CHART_COLORS.amber,
        },
        {
            name: "Ongoing",
            count: stats.job_orders.ongoing,
            fill: CHART_COLORS.blue,
        },
        {
            name: "Completed",
            count: stats.job_orders.completed,
            fill: CHART_COLORS.emerald,
        },
    ];

    /*
    |--------------------------------------------------------------------------
    | FINANCIAL CHART DATA
    |--------------------------------------------------------------------------
    */

    const financialChartData = [
        {
            name: "Total Revenue",
            amount: stats.financial.total_revenue,
            fill: CHART_COLORS.emerald,
        },
        {
            name: "Monthly Revenue",
            amount: stats.financial.monthly_revenue,
            fill: CHART_COLORS.amber,
        },
        {
            name: "Outstanding",
            amount: stats.financial.outstanding,
            fill: CHART_COLORS.rose,
        },
    ];

    return (
        <SuperAdminLayout>
            <Head title="Super Admin Dashboard" />

            <div className="space-y-7">
                {/* ======================================================
                    WELCOME HEADER
                ====================================================== */}

                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <LayoutDashboard
                                    size={16}
                                    className="text-amber-400"
                                />
                            </div>

                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400">
                                Executive Overview
                            </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                            Welcome back, {user?.name ?? "Super Admin"}
                        </h2>

                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
                            Monitor your ALIBATON operations, manage accounts,
                            track financial performance, and oversee system
                            activities.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#0A0F1D] border border-slate-200 dark:border-slate-800/80">
                        <Clock size={14} className="text-amber-400" />

                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">
                                Last Updated
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                                {generatedAt}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ======================================================
                    PRIMARY KPI CARDS
                ====================================================== */}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <KpiCard
                        icon={<Users size={20} />}
                        label="Total Users"
                        value={stats.users.total.toLocaleString()}
                        hint={`${stats.users.admins} admins · ${stats.users.staff} staff · ${stats.users.clients} clients`}
                        color="amber"
                    />

                    <KpiCard
                        icon={<BriefcaseBusiness size={20} />}
                        label="Job Orders"
                        value={stats.job_orders.total.toLocaleString()}
                        hint={`${stats.job_orders.pending} pending · ${stats.job_orders.ongoing} ongoing`}
                        color="blue"
                    />

                    <KpiCard
                        icon={<DollarSign size={20} />}
                        label="Total Revenue"
                        value={formatCurrency(stats.financial.total_revenue)}
                        hint={`Outstanding: ${formatCurrency(stats.financial.outstanding)}`}
                        color="emerald"
                    />

                    <KpiCard
                        icon={<Shield size={20} />}
                        label="Compliance Alerts"
                        value={totalAlerts.toLocaleString()}
                        hint={`${stats.alerts.expiring_compliance} expiring · ${stats.alerts.overdue_compliance} overdue`}
                        color={totalAlerts > 0 ? "rose" : "emerald"}
                    />
                </div>

                {/* ======================================================
                    SECONDARY KPI CARDS
                ====================================================== */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <MiniKpi
                        icon={<TrendingUp size={17} />}
                        label="Monthly Revenue"
                        value={formatCurrency(stats.financial.monthly_revenue)}
                    />

                    <MiniKpi
                        icon={<FileText size={17} />}
                        label="Active Contracts"
                        value={stats.contracts.active.toLocaleString()}
                    />

                    <MiniKpi
                        icon={<Users size={17} />}
                        label="Active Users (30d)"
                        value={stats.users.active.toLocaleString()}
                    />
                </div>

                {/* ======================================================
                    ANALYTICS SECTION
                ====================================================== */}

                <div>
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                System Analytics
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Overview of users, job orders, and financial
                                performance
                            </p>
                        </div>

                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                            Live Dashboard Data
                        </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        {/* USER DISTRIBUTION DONUT CHART */}

                        <ChartCard
                            title="User Distribution"
                            subtitle="Hover to see accounts · Breakdown of registered accounts by role"
                            icon={<Users size={17} />}
                        >
                            <div className="h-[280px] w-full">
                                {userChartData.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <PieChart>
                                            <Pie
                                                data={userChartData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="48%"
                                                innerRadius={72}
                                                outerRadius={105}
                                                paddingAngle={4}
                                                stroke="none"
                                            >
                                                {userChartData.map((entry) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={entry.color}
                                                    />
                                                ))}
                                            </Pie>

                                            <Tooltip
                                                content={<UserDistributionTooltip />}
                                            />

                                            <Legend
                                                verticalAlign="bottom"
                                                iconType="circle"
                                                formatter={(value) => (
                                                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                                                        {value}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyChart message="No user data available" />
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                                {userChartData.map((item) => (
                                    <div
                                        key={item.name}
                                        className="rounded-xl bg-slate-100 dark:bg-slate-900/60 p-3"
                                    >
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{
                                                    backgroundColor: item.color,
                                                }}
                                            />
                                            <span className="text-[10px] text-slate-500 truncate">
                                                {item.name}
                                            </span>
                                        </div>

                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {item.value.toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>

                        {/* JOB ORDER BAR CHART */}

                        <ChartCard
                            title="Job Order Overview"
                            subtitle="Current status of all job orders"
                            icon={<BriefcaseBusiness size={17} />}
                        >
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={jobOrderChartData}
                                        margin={{
                                            top: 20,
                                            right: 10,
                                            left: -15,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={CHART_COLORS.grid}
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="name"
                                            tick={{
                                                fill: CHART_COLORS.text,
                                                fontSize: 11,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            allowDecimals={false}
                                            tick={{
                                                fill: CHART_COLORS.text,
                                                fontSize: 11,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Tooltip
                                            cursor={{
                                                fill: "rgba(148,163,184,0.06)",
                                            }}
                                            contentStyle={{
                                                backgroundColor: "#0A0F1D",
                                                border: "1px solid #334155",
                                                borderRadius: "12px",
                                                color: "#fff",
                                            }}
                                        />

                                        <Bar
                                            dataKey="count"
                                            name="Job Orders"
                                            radius={[8, 8, 0, 0]}
                                            maxBarSize={65}
                                        >
                                            {jobOrderChartData.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.fill}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-3">
                                <StatusSummary
                                    label="Pending"
                                    value={stats.job_orders.pending}
                                    color="amber"
                                />

                                <StatusSummary
                                    label="Ongoing"
                                    value={stats.job_orders.ongoing}
                                    color="blue"
                                />

                                <StatusSummary
                                    label="Completed"
                                    value={stats.job_orders.completed}
                                    color="emerald"
                                />
                            </div>
                        </ChartCard>

                        {/* FINANCIAL BAR CHART */}

                        <div className="xl:col-span-2">
                            <ChartCard
                                title="Financial Overview"
                                subtitle="Revenue and outstanding balance snapshot"
                                icon={<DollarSign size={17} />}
                            >
                                <div className="h-[320px] w-full">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={financialChartData}
                                            margin={{
                                                top: 20,
                                                right: 20,
                                                left: 10,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke={CHART_COLORS.grid}
                                                vertical={false}
                                            />

                                            <XAxis
                                                dataKey="name"
                                                tick={{
                                                    fill: CHART_COLORS.text,
                                                    fontSize: 11,
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />

                                            <YAxis
                                                tickFormatter={(value) =>
                                                    `₱${Number(
                                                        value,
                                                    ).toLocaleString("en-PH", {
                                                        notation: "compact",
                                                        maximumFractionDigits: 1,
                                                    })}`
                                                }
                                                tick={{
                                                    fill: CHART_COLORS.text,
                                                    fontSize: 10,
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={75}
                                            />

                                            <Tooltip
                                                cursor={{
                                                    fill: "rgba(148,163,184,0.06)",
                                                }}
                                                contentStyle={{
                                                    backgroundColor: "#0A0F1D",
                                                    border: "1px solid #334155",
                                                    borderRadius: "12px",
                                                    color: "#fff",
                                                }}
                                                formatter={(value) => [
                                                    formatCurrency(
                                                        Number(value ?? 0),
                                                    ),
                                                    "Amount",
                                                ]}
                                            />

                                            <Bar
                                                dataKey="amount"
                                                name="Amount"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={100}
                                            >
                                                {financialChartData.map(
                                                    (entry) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={entry.fill}
                                                        />
                                                    ),
                                                )}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                    <FinancialSummary
                                        label="Total Revenue"
                                        value={formatCurrency(
                                            stats.financial.total_revenue,
                                        )}
                                        color="emerald"
                                    />

                                    <FinancialSummary
                                        label="Monthly Revenue"
                                        value={formatCurrency(
                                            stats.financial.monthly_revenue,
                                        )}
                                        color="amber"
                                    />

                                    <FinancialSummary
                                        label="Outstanding Balance"
                                        value={formatCurrency(
                                            stats.financial.outstanding,
                                        )}
                                        color="rose"
                                    />
                                </div>

                                <p className="text-[10px] text-slate-500 mt-3">
                                    Note: Financial figures are aggregate values
                                    supplied by the dashboard. They are not a
                                    month-by-month revenue trend.
                                </p>
                            </ChartCard>
                        </div>
                    </div>
                </div>

                {/* ======================================================
                    QUICK ACTIONS
                ====================================================== */}

                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Quick Actions
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Frequently used administration tools
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ActionCard
                            icon={<UserCog size={20} />}
                            title="Manage Admins"
                            description="Create, edit, and manage admin accounts"
                            href={getRoute(
                                "superadmin.admins.index",
                                "/superadmin/admins",
                            )}
                        />

                        <ActionCard
                            icon={<Activity size={20} />}
                            title="Activity Logs"
                            description="Review system activities and user actions"
                            href={getRoute(
                                "superadmin.logs.index",
                                "/superadmin/logs",
                            )}
                        />

                        <ActionCard
                            icon={<LayoutDashboard size={20} />}
                            title="System Settings"
                            description="Configure platform settings"
                            href={getRoute(
                                "superadmin.settings",
                                "/superadmin/settings",
                            )}
                        />
                    </div>
                </div>

                {/* ======================================================
                    RECENT ACTIVITY
                ====================================================== */}

                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Recent System Activity
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Latest account logins and operational records
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        {/* RECENT USERS */}

                        <div className="bg-white/90 dark:bg-[#0A0F1D]/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users
                                        size={16}
                                        className="text-amber-400"
                                    />
                                    Recent Logins
                                </h3>
                            </div>

                            <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
                                {recentUsers.length === 0 ? (
                                    <p className="px-5 py-8 text-center text-sm text-slate-500">
                                        No recent logins
                                    </p>
                                ) : (
                                    recentUsers.map((u) => (
                                        <div
                                            key={u.id}
                                            className="px-5 py-3 flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {u.name}
                                                </p>

                                                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                                    {u.email}
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getRoleBadgeColor(
                                                        u.role,
                                                    )}`}
                                                >
                                                    {u.role}
                                                </span>

                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    {u.last_login_at ?? "—"}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* RECENT JOB ORDERS */}

                        <div className="bg-white/90 dark:bg-[#0A0F1D]/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/60">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText
                                        size={16}
                                        className="text-amber-400"
                                    />
                                    Recent Job Orders
                                </h3>
                            </div>

                            <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
                                {recentJobOrders.length === 0 ? (
                                    <p className="px-5 py-8 text-center text-sm text-slate-500">
                                        No job orders yet
                                    </p>
                                ) : (
                                    recentJobOrders.map((jo) => (
                                        <div
                                            key={jo.id}
                                            className="px-5 py-3 flex items-center justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {jo.number}
                                                </p>

                                                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                                    {jo.client}
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-semibold text-amber-400">
                                                    {formatCurrency(jo.amount)}
                                                </p>

                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    {jo.created_at}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ======================================================
                    RECENT PAYMENTS
                ====================================================== */}

                <div className="bg-white/90 dark:bg-[#0A0F1D]/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <DollarSign
                                size={16}
                                className="text-emerald-400"
                            />
                            Recent Payments
                        </h3>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
                        {recentPayments.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-slate-500">
                                No payments yet
                            </p>
                        ) : (
                            recentPayments.map((p) => (
                                <div
                                    key={p.id}
                                    className="px-5 py-3 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                            {p.receipt_number}
                                        </p>

                                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                            {p.client}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-emerald-400">
                                            {formatCurrency(p.amount)}
                                        </p>

                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {p.status}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ======================================================
                    COMPLIANCE ALERTS
                ====================================================== */}

                <div className="bg-white/90 dark:bg-[#0A0F1D]/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={17} className="text-amber-400" />

                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Compliance & Document Alerts
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <AlertSummary
                            label="Expiring Compliance"
                            value={stats.alerts.expiring_compliance}
                            color="amber"
                        />

                        <AlertSummary
                            label="Overdue Compliance"
                            value={stats.alerts.overdue_compliance}
                            color="rose"
                        />

                        <AlertSummary
                            label="Expiring Documents"
                            value={stats.alerts.expiring_documents}
                            color="blue"
                        />
                    </div>

                    {totalAlerts === 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
                            <CheckCircle2 size={15} />
                            No current compliance or document alerts.
                        </div>
                    )}
                </div>
            </div>
        </SuperAdminLayout>
    );
}

/* ==========================================================================
   USER DISTRIBUTION TOOLTIP — shows list of users on hover
   ========================================================================== */

function UserDistributionTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const users: UserListItem[] = data.users || [];
    const displayLimit = 5;
    const displayUsers = users.slice(0, displayLimit);
    const remaining = users.length - displayLimit;

    return (
        <div className="bg-white dark:bg-[#0A0F1D] border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-2xl shadow-black/60 min-w-[220px] max-w-[300px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-300 dark:border-slate-700">
                <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: data.color }}
                />
                <p className="text-xs font-bold text-slate-900 dark:text-white">{data.name}</p>
                <span className="ml-auto text-[10px] text-amber-400 font-bold">
                    {data.value} total
                </span>
            </div>

            {displayUsers.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">
                    No accounts
                </p>
            ) : (
                <div className="space-y-1.5">
                    {displayUsers.map((u: UserListItem) => (
                        <div key={u.id} className="flex items-start gap-1.5">
                            <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">
                                •
                            </span>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-900 dark:text-white truncate font-medium">
                                    {u.name}
                                </p>
                                <p className="text-[9px] text-slate-500 truncate">
                                    {u.email}
                                </p>
                            </div>
                        </div>
                    ))}
                    {remaining > 0 && (
                        <p className="text-[10px] text-amber-400 italic mt-2 pl-3">
                            +{remaining} more...
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ==========================================================================
   REUSABLE COMPONENTS
   ========================================================================== */

function ChartCard({
    title,
    subtitle,
    icon,
    children,
}: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0 bg-white/90 dark:bg-[#0A0F1D]/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    {icon}
                </div>

                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>

                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                </div>
            </div>

            {children}
        </div>
    );
}

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Activity size={28} className="mb-2 opacity-50" />
            <p className="text-xs">{message}</p>
        </div>
    );
}

function StatusSummary({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: "amber" | "blue" | "emerald";
}) {
    const colors = {
        amber: "text-amber-400 bg-amber-500/10",
        blue: "text-blue-400 bg-blue-500/10",
        emerald: "text-emerald-400 bg-emerald-500/10",
    };

    return (
        <div className={`rounded-xl p-3 ${colors[color]}`}>
            <p className="text-[10px] opacity-80">{label}</p>
            <p className="text-lg font-bold mt-1">{value.toLocaleString()}</p>
        </div>
    );
}

function FinancialSummary({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color: "emerald" | "amber" | "rose";
}) {
    const colors = {
        emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
        amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
        rose: "border-rose-500/20 bg-rose-500/5 text-rose-400",
    };

    return (
        <div className={`rounded-xl border p-3 ${colors[color]}`}>
            <p className="text-[10px] opacity-80">{label}</p>
            <p className="text-base font-bold mt-1 break-words">{value}</p>
        </div>
    );
}

function AlertSummary({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: "amber" | "rose" | "blue";
}) {
    const colors = {
        amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
        rose: "border-rose-500/20 bg-rose-500/5 text-rose-400",
        blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    };

    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <p className="text-xs opacity-80">{label}</p>
            <p className="text-2xl font-bold mt-2">{value.toLocaleString()}</p>
        </div>
    );
}

function getRoleBadgeColor(role: string): string {
    switch (role) {
        case "superadmin":
            return "bg-amber-500/20 text-amber-300 border border-amber-500/30";

        case "admin":
            return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30";

        case "staff":
            return "bg-purple-500/20 text-purple-300 border border-purple-500/30";

        case "client":
            return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";

        default:
            return "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30";
    }
}

function KpiCard({
    icon,
    label,
    value,
    hint,
    color = "amber",
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint: string;
    color?: "amber" | "blue" | "emerald" | "rose";
}) {
    const colors = {
        amber: {
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            text: "text-amber-400",
        },
        blue: {
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            text: "text-blue-400",
        },
        emerald: {
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            text: "text-emerald-400",
        },
        rose: {
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
            text: "text-rose-400",
        },
    };

    const c = colors[color];

    return (
        <div className="bg-white/90 dark:bg-[#0A0F1D]/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/30 transition-colors">
            <div
                className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.text} mb-4`}
            >
                {icon}
            </div>

            <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</p>

            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{label}</p>

            <p className="text-xs text-slate-500 mt-1 truncate">{hint}</p>
        </div>
    );
}

function MiniKpi({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-white/90 dark:bg-[#0A0F1D]/60 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-amber-400 shrink-0">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    {label}
                </p>

                <p className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {value}
                </p>
            </div>
        </div>
    );
}

function ActionCard({
    icon,
    title,
    description,
    href,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="group bg-white/90 dark:bg-[#0A0F1D]/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 hover:border-amber-500/40 hover:bg-slate-50 dark:hover:bg-[#0A0F1D] transition-all block"
        >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                {icon}
            </div>

            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                {title}
                <ArrowRight
                    size={13}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{description}</p>
        </Link>
    );
}