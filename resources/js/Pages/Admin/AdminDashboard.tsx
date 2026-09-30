import React, { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";

import {
    Activity,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Clock3,
    CreditCard,
    FileCheck2,
    FileText,
    FolderOpen,
    Pin,
    PinOff,
    Receipt,
    ShieldCheck,
    TrendingUp,
    Users,
    X,
} from "lucide-react";

import AdminLayout from "../../Layouts/AdminLayout";

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    RadialBar,
    RadialBarChart,
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

type RecordItem = {
    id: number;
    [key: string]: any;
};

type DashboardStats = {
    staff: number;
    clients: number;
    invoices: number;
    payments: number;
    payment_total: number;
    invoice_total: number;
    job_orders: number;
    contracts: number;
    contract_permits: number;
    documents: number;
    compliance: number;
    online_staff: number;
    overdue_invoices: number;
    expiring_documents: number;
    expired_documents: number;
    overdue_compliance: number;
};

type DashboardDetails = {
    staff: RecordItem[];
    clients: RecordItem[];
    invoices: RecordItem[];
    payments: RecordItem[];
    job_orders: RecordItem[];
    contracts: RecordItem[];
    contract_permits: RecordItem[];
    documents: RecordItem[];
    compliance: RecordItem[];
};

type PageProps = {
    stats: DashboardStats;
    details: DashboardDetails;
    generatedAt?: string;
};

type ModuleKey =
    | "staff"
    | "clients"
    | "invoices"
    | "payments"
    | "job_orders"
    | "contracts"
    | "contract_permits"
    | "documents"
    | "compliance";

type ModuleConfig = {
    key: ModuleKey;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    count: number;
    description: string;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatNumber(value: unknown) {
    return Number(value ?? 0).toLocaleString("en-PH");
}

function formatCurrency(value: unknown) {
    return `₱${Number(value ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatDateTime(value: unknown) {
    if (!value) return "—";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatDate(value: unknown) {
    if (!value) return "—";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function normalizeStatus(value: unknown) {
    if (!value) return "Unknown";
    return String(value)
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClass(status: unknown) {
    const normalized = String(status ?? "")
        .toLowerCase()
        .replace(/[_-]+/g, " ");

    if (
        normalized.includes("paid") ||
        normalized.includes("approved") ||
        normalized.includes("active") ||
        normalized.includes("complete") ||
        normalized.includes("verified") ||
        normalized.includes("compliant")
    ) {
        return "border-green-400/15 bg-green-400/10 text-green-700 dark:text-green-300";
    }
    if (
        normalized.includes("pending") ||
        normalized.includes("partial") ||
        normalized.includes("processing") ||
        normalized.includes("expiring") ||
        normalized.includes("submitted") ||
        normalized.includes("review")
    ) {
        return "border-yellow-400/15 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300";
    }
    if (
        normalized.includes("reject") ||
        normalized.includes("overdue") ||
        normalized.includes("expired") ||
        normalized.includes("non compliant") ||
        normalized.includes("non-compliant")
    ) {
        return "border-red-400/15 bg-red-400/10 text-red-700 dark:text-red-300";
    }
    return "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-white/45";
}

/*
|--------------------------------------------------------------------------
| CHART COLORS
|--------------------------------------------------------------------------
*/

const CHART_COLORS = [
    "#FACC15",
    "#EAB308",
    "#CA8A04",
    "#A16207",
    "#854D0E",
    "#713F12",
    "#FDE047",
    "#F59E0B",
    "#D97706",
];

const CHART_TEXT = "rgba(255,255,255,0.4)";
const CHART_GRID = "rgba(255,255,255,0.05)";

/*
|--------------------------------------------------------------------------
| RECORD META RESOLVERS
|--------------------------------------------------------------------------
*/

function getRecordTitle(moduleKey: ModuleKey, record: RecordItem): string {
    if (moduleKey === "staff" || moduleKey === "clients")
        return record.name || `Record #${record.id}`;
    if (moduleKey === "invoices")
        return record.number || `Invoice #${record.id}`;
    if (moduleKey === "payments")
        return record.receipt_number || `Payment #${record.id}`;
    if (moduleKey === "job_orders")
        return record.number || `Job Order #${record.id}`;
    if (moduleKey === "contracts")
        return record.contract_no || record.number || `Contract #${record.id}`;
    if (moduleKey === "contract_permits")
        return record.number || `Permit #${record.id}`;
    if (moduleKey === "documents")
        return record.title || record.file_name || `Document #${record.id}`;
    if (moduleKey === "compliance")
        return record.title || `Compliance #${record.id}`;
    return `Record #${record.id}`;
}

function getRecordSubtitle(moduleKey: ModuleKey, record: RecordItem): string {
    if (moduleKey === "staff" || moduleKey === "clients")
        return record.email || "No email";
    if (
        moduleKey === "invoices" ||
        moduleKey === "payments" ||
        moduleKey === "job_orders"
    )
        return record.client || "No client";
    if (moduleKey === "contracts" || moduleKey === "contract_permits")
        return record.client || "No client";
    if (moduleKey === "documents") return record.file_name || "No file name";
    if (moduleKey === "compliance") return record.type || "Compliance record";
    return "";
}

/*
|--------------------------------------------------------------------------
| RECORDS LIST BODY — shared between hover tooltip & pinned card
|--------------------------------------------------------------------------
*/

function RecordsListBody({
    moduleKey,
    records,
    maxHeight = "max-h-[260px]",
}: {
    moduleKey: ModuleKey;
    records: RecordItem[];
    maxHeight?: string;
}) {
    if (records.length === 0) {
        return (
            <div className="m-2 rounded-lg border border-dashed border-gray-200 dark:border-white/10 bg-white/[0.015] px-3 py-3 text-center">
                <p className="text-[10px] text-gray-500 dark:text-white/35">
                    No underlying records available
                </p>
            </div>
        );
    }

    return (
        <div
            className={`admin-tooltip-scroll ${maxHeight} space-y-1 overflow-y-auto p-2`}
            onWheel={(e) => e.stopPropagation()}
        >
            {records.map((record, index) => (
                <div
                    key={`${record.id}-${index}`}
                    className="rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-2 py-1.5 transition hover:border-gray-200 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/[0.04]"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-bold text-gray-600 dark:text-white/85">
                                {getRecordTitle(moduleKey, record)}
                            </p>
                            <p className="truncate text-[8px] text-gray-500 dark:text-white/35">
                                {getRecordSubtitle(moduleKey, record)}
                            </p>
                        </div>
                        {record.status && (
                            <span
                                className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${getStatusClass(
                                    record.status,
                                )}`}
                            >
                                {normalizeStatus(record.status)}
                            </span>
                        )}
                    </div>

                    {(record.amount != null || record.created_at) && (
                        <div className="mt-1 flex items-center justify-between gap-2 text-[8px] text-gray-400 dark:text-white/30">
                            <span className="truncate">
                                {record.amount != null
                                    ? formatCurrency(record.amount)
                                    : ""}
                            </span>
                            {record.created_at && (
                                <span className="shrink-0">
                                    {formatDate(record.created_at)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| RICH TOOLTIP — hover preview that renders OUTSIDE all clipping
|--------------------------------------------------------------------------
| Recharts renders the tooltip inside the chart's own wrapper, which
| frequently has overflow issues. To guarantee the tooltip is never
| hidden/clipped, we render it via a portal-like fixed positioning that
| tracks the chart element's bounding box.
|--------------------------------------------------------------------------
*/

function RichTooltip({
    active,
    payload,
    label,
    moduleKey,
    coordinate,
    containerRect,
}: {
    active?: boolean;
    payload?: any[];
    label?: string;
    moduleKey: ModuleKey;
    coordinate?: { x: number; y: number };
    containerRect?: DOMRect | null;
}) {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0]?.payload ?? {};
    const records: RecordItem[] = Array.isArray(point.records)
        ? point.records
        : [];
    const total = Number(
        point.value ?? payload[0]?.value ?? records.length ?? 0,
    );

    // Compute a fixed screen position for the tooltip based on the chart's
    // bounding rect + the data point's local coordinates. This guarantees
    // the tooltip escapes ANY parent `overflow-hidden` or stacking context.
    let left: number | undefined;
    let top: number | undefined;

    if (containerRect && coordinate) {
        const TOOLTIP_WIDTH = 320;
        const OFFSET = 16;

        let computedLeft =
            containerRect.left + coordinate.x + OFFSET;
        let computedTop =
            containerRect.top + coordinate.y + OFFSET;

        // If it would overflow the right side of the viewport, flip to the left
        if (computedLeft + TOOLTIP_WIDTH > window.innerWidth - 8) {
            computedLeft = containerRect.left + coordinate.x - TOOLTIP_WIDTH - OFFSET;
        }
        if (computedLeft < 8) computedLeft = 8;

        // If it would overflow the bottom, flip above the point
        const ESTIMATED_HEIGHT = 340;
        if (computedTop + ESTIMATED_HEIGHT > window.innerHeight - 8) {
            computedTop = containerRect.top + coordinate.y - ESTIMATED_HEIGHT - OFFSET;
        }
        if (computedTop < 8) computedTop = 8;

        left = computedLeft;
        top = computedTop;
    }

    return (
        <div
            className="pointer-events-auto fixed z-[300] w-[300px] overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0b0b0b]/98 shadow-2xl backdrop-blur-xl sm:w-[320px]"
            style={
                left !== undefined && top !== undefined
                    ? { left, top }
                    : { left: "50%", top: 80, transform: "translateX(-50%)" }
            }
        >
            {/* HEADER */}
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                        {label || point.name || "Data"}
                    </p>
                    <p className="mt-0.5 text-[9px] text-gray-500 dark:text-white/35">
                        {records.length > 0
                            ? `${records.length} record${
                                  records.length !== 1 ? "s" : ""
                              } · click to pin & scroll`
                            : "No records attached"}
                    </p>
                </div>
                <div className="rounded-md border border-yellow-400/20 bg-yellow-400/10 px-2 py-1">
                    <span className="text-[11px] font-black text-yellow-700 dark:text-yellow-300">
                        {formatNumber(total)}
                    </span>
                </div>
            </div>

            <RecordsListBody moduleKey={moduleKey} records={records} />

            {/* FOOTER HINT */}
            <div className="border-t border-white/[0.07] px-3 py-1.5 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/25">
                    Click the chart point to pin 📌
                </p>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PINNED RECORDS PANEL — fixed at the chart position, click to pin
|--------------------------------------------------------------------------
*/

function PinnedRecordsPanel({
    moduleKey,
    records,
    label,
    total,
    onClose,
    align = "right",
}: {
    moduleKey: ModuleKey;
    records: RecordItem[];
    label: string;
    total: number;
    onClose: () => void;
    align?: "left" | "right" | "center";
}) {
    const positionClass =
        align === "left"
            ? "left-2 top-2"
            : align === "center"
              ? "left-1/2 top-2 -translate-x-1/2"
              : "right-2 top-2";

    return (
        <div
            className={`absolute z-40 w-[300px] overflow-hidden rounded-xl border border-yellow-400/40 bg-white dark:bg-[#0b0b0b]/98 shadow-2xl ring-2 ring-yellow-400/20 backdrop-blur-xl sm:w-[320px] ${positionClass}`}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* HEADER */}
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <Pin className="h-2.5 w-2.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                        <p className="truncate text-[10px] font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                            {label || "Data"}
                        </p>
                    </div>
                    <p className="mt-0.5 text-[9px] text-gray-500 dark:text-white/35">
                        {records.length} record
                        {records.length !== 1 ? "s" : ""} · pinned
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <div className="rounded-md border border-yellow-400/20 bg-yellow-400/10 px-2 py-1">
                        <span className="text-[11px] font-black text-yellow-700 dark:text-yellow-300">
                            {formatNumber(total)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-500 dark:text-white/50 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-700 dark:hover:text-red-300"
                        title="Unpin (Esc)"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <RecordsListBody moduleKey={moduleKey} records={records} />

            {/* FOOTER HINT */}
            <div className="border-t border-white/[0.07] px-3 py-1.5 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-yellow-600/70 dark:text-yellow-400/70">
                    📌 Pinned — click ✕ or press Esc to unpin
                </p>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| DATA BUILDERS — records attached to each data point
|--------------------------------------------------------------------------
*/

function getStatusBreakdownWithRecords(records: RecordItem[]) {
    const buckets: Record<string, RecordItem[]> = {};

    records.forEach((r) => {
        const status = normalizeStatus(r.status);
        if (!buckets[status]) buckets[status] = [];
        buckets[status].push(r);
    });

    return Object.entries(buckets).map(([name, items]) => ({
        name,
        value: items.length,
        records: items,
    }));
}

function getMonthlyTrendWithRecords(records: RecordItem[]) {
    const buckets: Record<string, RecordItem[]> = {};

    records.forEach((r) => {
        const raw = r.created_at;
        if (!raw) return;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return;

        const key = date.toLocaleDateString("en-PH", {
            month: "short",
            year: "numeric",
        });

        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(r);
    });

    const sortedKeys = Object.keys(buckets).sort((a, b) => {
        const da = new Date(a);
        const db = new Date(b);
        return da.getTime() - db.getTime();
    });

    return sortedKeys.map((m) => ({
        name: m,
        Records: buckets[m].length,
        value: buckets[m].length,
        records: buckets[m],
    }));
}

/*
|--------------------------------------------------------------------------
| PIN CONTROLLER HOOK
|--------------------------------------------------------------------------
*/

function usePinnedChart() {
    const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

    const togglePin = (index: number | null) => {
        if (index === null || index === undefined) {
            setPinnedIndex(null);
            return;
        }
        setPinnedIndex((prev) => (prev === index ? null : index));
    };

    const clearPin = () => setPinnedIndex(null);

    return { pinnedIndex, togglePin, clearPin, isPinned: pinnedIndex !== null };
}

/*
|--------------------------------------------------------------------------
| ESC-TO-UNPIN HOOK
|--------------------------------------------------------------------------
*/

function useEscToClear(clearPin: () => void) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") clearPin();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [clearPin]);
}

/*
|--------------------------------------------------------------------------
| CONTAINER RECT HOOK — measures the chart wrapper for fixed tooltips
|--------------------------------------------------------------------------
*/

function useContainerRect<T extends HTMLElement>() {
    const ref = React.useRef<T | null>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const update = () => {
            if (ref.current) {
                setRect(ref.current.getBoundingClientRect());
            }
        };
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, []);

    return { ref, rect };
}

/*
|--------------------------------------------------------------------------
| MODULE CHART — per module chart with pin-to-lock tooltips
|--------------------------------------------------------------------------
*/

function ModuleChart({
    moduleKey,
    records,
    stats,
}: {
    moduleKey: ModuleKey;
    records: RecordItem[];
    stats: DashboardStats;
}) {
    const { pinnedIndex, togglePin, clearPin, isPinned } = usePinnedChart();
    useEscToClear(clearPin);
    const { ref: containerRef, rect: containerRect } =
        useContainerRect<HTMLDivElement>();

    /*
    |--------------------------------------------------------------------------
    | STAFF — Stacked Column
    |--------------------------------------------------------------------------
    */
    if (moduleKey === "staff") {
        const online = records.filter((r) => r.is_online || r.online);
        const offline = records.filter((r) => !(r.is_online || r.online));

        const data = [
            {
                name: "Staff",
                Online: online.length || stats.online_staff,
                Offline:
                    offline.length ||
                    Math.max(0, stats.staff - stats.online_staff),
                records: records,
            },
        ];

        return (
            <div className="relative" ref={containerRef}>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                            <CartesianGrid stroke={CHART_GRID} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={
                                    <RichTooltip
                                        moduleKey={moduleKey}
                                        containerRect={containerRect}
                                    />
                                }
                                allowEscapeViewBox={{ x: true, y: true }}
                                offset={15}
                                active={isPinned ? false : undefined}
                                wrapperStyle={{
                                    zIndex: 300,
                                    pointerEvents: "auto",
                                }}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: 9, color: CHART_TEXT }}
                                iconType="circle"
                            />
                            <Bar
                                dataKey="Online"
                                stackId="a"
                                fill="#4ADE80"
                                onClick={() => togglePin(0)}
                                cursor="pointer"
                            />
                            <Bar
                                dataKey="Offline"
                                stackId="a"
                                fill="#FACC15"
                                radius={[5, 5, 0, 0]}
                                onClick={() => togglePin(0)}
                                cursor="pointer"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {isPinned && (
                    <PinnedRecordsPanel
                        moduleKey={moduleKey}
                        records={records}
                        label="Staff"
                        total={records.length}
                        onClose={clearPin}
                    />
                )}
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INVOICES / COMPLIANCE — Pie
    |--------------------------------------------------------------------------
    */
    if (moduleKey === "invoices" || moduleKey === "compliance") {
        const breakdown = getStatusBreakdownWithRecords(records);
        const data = breakdown.length
            ? breakdown
            : [{ name: "No data", value: 1, records: [] }];

        const pinnedPoint =
            isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

        return (
            <div className="relative" ref={containerRef}>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="46%"
                                innerRadius={38}
                                outerRadius={68}
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((_, index) => (
                                    <Cell
                                        key={`pie-${index}`}
                                        fill={
                                            CHART_COLORS[
                                                index % CHART_COLORS.length
                                            ]
                                        }
                                        onClick={() =>
                                            togglePin(
                                                pinnedIndex === index
                                                    ? null
                                                    : index,
                                            )
                                        }
                                        cursor="pointer"
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                content={
                                    <RichTooltip
                                        moduleKey={moduleKey}
                                        containerRect={containerRect}
                                    />
                                }
                                allowEscapeViewBox={{ x: true, y: true }}
                                offset={15}
                                active={isPinned ? false : undefined}
                                wrapperStyle={{
                                    zIndex: 300,
                                    pointerEvents: "auto",
                                }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                iconType="circle"
                                formatter={(value) => (
                                    <span className="text-[9px] text-gray-500 dark:text-white/50">
                                        {value}
                                    </span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {pinnedPoint && (
                    <PinnedRecordsPanel
                        moduleKey={moduleKey}
                        records={pinnedPoint.records}
                        label={pinnedPoint.name}
                        total={pinnedPoint.value}
                        onClose={clearPin}
                    />
                )}
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENTS — Line
    |--------------------------------------------------------------------------
    */
    if (moduleKey === "payments") {
        const trend = getMonthlyTrendWithRecords(records);
        const data = trend.length
            ? trend
            : [{ name: "No data", Records: 0, value: 0, records: [] }];

        const pinnedPoint =
            isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

        return (
            <div className="relative" ref={containerRef}>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                            <CartesianGrid stroke={CHART_GRID} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={
                                    <RichTooltip
                                        moduleKey={moduleKey}
                                        containerRect={containerRect}
                                    />
                                }
                                allowEscapeViewBox={{ x: true, y: true }}
                                offset={15}
                                active={isPinned ? false : undefined}
                                wrapperStyle={{
                                    zIndex: 300,
                                    pointerEvents: "auto",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Records"
                                stroke="#FACC15"
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: "#FACC15" }}
                                activeDot={{
                                    r: 6,
                                    fill: "#FDE047",
                                    cursor: "pointer",
                                    onClick: (_: any, payload: any) =>
                                        togglePin(payload?.index ?? null),
                                }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {pinnedPoint && (
                    <PinnedRecordsPanel
                        moduleKey={moduleKey}
                        records={pinnedPoint.records}
                        label={pinnedPoint.name}
                        total={pinnedPoint.value}
                        onClose={clearPin}
                    />
                )}
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | JOB ORDERS / CLIENTS — Bar
    |--------------------------------------------------------------------------
    */
    if (moduleKey === "job_orders" || moduleKey === "clients") {
        const trend = getMonthlyTrendWithRecords(records);
        const data = trend.length
            ? trend
            : [{ name: "No data", Records: 0, value: 0, records: [] }];

        const pinnedPoint =
            isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

        return (
            <div className="relative" ref={containerRef}>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                            <CartesianGrid stroke={CHART_GRID} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={
                                    <RichTooltip
                                        moduleKey={moduleKey}
                                        containerRect={containerRect}
                                    />
                                }
                                allowEscapeViewBox={{ x: true, y: true }}
                                offset={15}
                                active={isPinned ? false : undefined}
                                wrapperStyle={{
                                    zIndex: 300,
                                    pointerEvents: "auto",
                                }}
                            />
                            <Bar
                                dataKey="Records"
                                fill="#FACC15"
                                radius={[5, 5, 0, 0]}
                                barSize={24}
                                cursor="pointer"
                                onClick={(_: any, index: number) =>
                                    togglePin(index)
                                }
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {pinnedPoint && (
                    <PinnedRecordsPanel
                        moduleKey={moduleKey}
                        records={pinnedPoint.records}
                        label={pinnedPoint.name}
                        total={pinnedPoint.value}
                        onClose={clearPin}
                    />
                )}
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CONTRACTS / PERMITS — Area
    |--------------------------------------------------------------------------
    */
    if (moduleKey === "contracts" || moduleKey === "contract_permits") {
        const trend = getMonthlyTrendWithRecords(records);
        const data = trend.length
            ? trend
            : [{ name: "No data", Records: 0, value: 0, records: [] }];

        const pinnedPoint =
            isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

        return (
            <div className="relative" ref={containerRef}>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                            onClick={(state: any) => {
                                if (
                                    state &&
                                    state.activeTooltipIndex !== undefined &&
                                    state.activeTooltipIndex !== null
                                ) {
                                    togglePin(state.activeTooltipIndex);
                                }
                            }}
                        >
                            <defs>
                                <linearGradient
                                    id="contractStackedGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#FACC15"
                                        stopOpacity={0.6}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="#FACC15"
                                        stopOpacity={0.05}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke={CHART_GRID} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={
                                    <RichTooltip
                                        moduleKey={moduleKey}
                                        containerRect={containerRect}
                                    />
                                }
                                allowEscapeViewBox={{ x: true, y: true }}
                                offset={15}
                                active={isPinned ? false : undefined}
                                wrapperStyle={{
                                    zIndex: 300,
                                    pointerEvents: "auto",
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Records"
                                stroke="#FACC15"
                                strokeWidth={2.5}
                                fill="url(#contractStackedGradient)"
                                activeDot={{
                                    r: 6,
                                    fill: "#FDE047",
                                    cursor: "pointer",
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                {pinnedPoint && (
                    <PinnedRecordsPanel
                        moduleKey={moduleKey}
                        records={pinnedPoint.records}
                        label={pinnedPoint.name}
                        total={pinnedPoint.value}
                        onClose={clearPin}
                    />
                )}
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DOCUMENTS — Composed
    |--------------------------------------------------------------------------
    */
    if (moduleKey === "documents") {
        const trend = getMonthlyTrendWithRecords(records);
        const data = trend.length
            ? trend
            : [{ name: "No data", Records: 0, value: 0, records: [] }];

        const pinnedPoint =
            isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

        return (
            <div className="relative" ref={containerRef}>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                            <CartesianGrid stroke={CHART_GRID} vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                yAxisId="left"
                                allowDecimals={false}
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                allowDecimals={false}
                                tick={{ fill: CHART_TEXT, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={
                                    <RichTooltip
                                        moduleKey={moduleKey}
                                        containerRect={containerRect}
                                    />
                                }
                                allowEscapeViewBox={{ x: true, y: true }}
                                offset={15}
                                active={isPinned ? false : undefined}
                                wrapperStyle={{
                                    zIndex: 300,
                                    pointerEvents: "auto",
                                }}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: 9, color: CHART_TEXT }}
                                iconType="circle"
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="Records"
                                fill="#FACC15"
                                radius={[5, 5, 0, 0]}
                                barSize={24}
                                cursor="pointer"
                                onClick={(_: any, index: number) =>
                                    togglePin(index)
                                }
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="Records"
                                stroke="#F97316"
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: "#F97316" }}
                                activeDot={{
                                    r: 6,
                                    fill: "#FDE047",
                                    cursor: "pointer",
                                    onClick: (_: any, payload: any) =>
                                        togglePin(payload?.index ?? null),
                                }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                {pinnedPoint && (
                    <PinnedRecordsPanel
                        moduleKey={moduleKey}
                        records={pinnedPoint.records}
                        label={pinnedPoint.name}
                        total={pinnedPoint.value}
                        onClose={clearPin}
                    />
                )}
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DEFAULT
    |--------------------------------------------------------------------------
    */
    const trend = getMonthlyTrendWithRecords(records);
    const data = trend.length
        ? trend
        : [{ name: "No data", Records: 0, value: 0, records: [] }];

    const pinnedPoint =
        isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

    return (
        <div className="relative" ref={containerRef}>
            <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                        <CartesianGrid stroke={CHART_GRID} vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: CHART_TEXT, fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fill: CHART_TEXT, fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            content={
                                <RichTooltip
                                    moduleKey={moduleKey}
                                    containerRect={containerRect}
                                />
                            }
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={15}
                            active={isPinned ? false : undefined}
                            wrapperStyle={{
                                zIndex: 300,
                                pointerEvents: "auto",
                            }}
                        />
                        <Bar
                            dataKey="Records"
                            fill="#FACC15"
                            radius={[5, 5, 0, 0]}
                            barSize={24}
                            cursor="pointer"
                            onClick={(_: any, index: number) => togglePin(index)}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {pinnedPoint && (
                <PinnedRecordsPanel
                    moduleKey={moduleKey}
                    records={pinnedPoint.records}
                    label={pinnedPoint.name}
                    total={pinnedPoint.value}
                    onClose={clearPin}
                />
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| COMPACT RECORD ROW (used in modal)
|--------------------------------------------------------------------------
*/

function CompactRecordRow({
    module,
    record,
}: {
    module: ModuleKey;
    record: RecordItem;
}) {
    if (module === "staff" || module === "clients") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-gray-600 dark:text-white/80">
                        {record.name || "Unnamed"}
                    </p>
                    <p className="truncate text-[9px] text-gray-400 dark:text-white/30">
                        {record.email || "No email"}
                    </p>
                </div>
                <span className="shrink-0 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-gray-500 dark:text-white/35">
                    {normalizeStatus(record.role)}
                </span>
            </div>
        );
    }

    if (module === "invoices") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-gray-600 dark:text-white/80">
                        {record.number || `Invoice #${record.id}`}
                    </p>
                    <p className="truncate text-[9px] text-gray-400 dark:text-white/30">
                        {record.client || "No client"}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <span
                        className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${getStatusClass(
                            record.status,
                        )}`}
                    >
                        {normalizeStatus(record.status)}
                    </span>
                    <span className="text-[10px] font-black text-yellow-700 dark:text-yellow-300">
                        {formatCurrency(record.amount)}
                    </span>
                </div>
            </div>
        );
    }

    if (module === "payments") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-gray-600 dark:text-white/80">
                        {record.receipt_number || `Payment #${record.id}`}
                    </p>
                    <p className="truncate text-[9px] text-gray-400 dark:text-white/30">
                        {record.client || "No client"}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <span
                        className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${getStatusClass(
                            record.status,
                        )}`}
                    >
                        {normalizeStatus(record.status)}
                    </span>
                    <span className="text-[10px] font-black text-yellow-700 dark:text-yellow-300">
                        {formatCurrency(record.amount)}
                    </span>
                </div>
            </div>
        );
    }

    if (module === "job_orders") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-gray-600 dark:text-white/80">
                        {record.number || `Job Order #${record.id}`}
                    </p>
                    <p className="truncate text-[9px] text-gray-400 dark:text-white/30">
                        {record.client || "No client"}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <span
                        className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${getStatusClass(
                            record.status,
                        )}`}
                    >
                        {normalizeStatus(record.status)}
                    </span>
                    <span className="text-[10px] font-black text-yellow-700 dark:text-yellow-300">
                        {formatCurrency(record.amount)}
                    </span>
                </div>
            </div>
        );
    }

    if (module === "contracts" || module === "contract_permits") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-gray-600 dark:text-white/80">
                        {record.contract_no ||
                            record.number ||
                            `Record #${record.id}`}
                    </p>
                    <p className="truncate text-[9px] text-gray-400 dark:text-white/30">
                        {record.client || "No client"}
                    </p>
                </div>
                {record.status && (
                    <span
                        className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${getStatusClass(
                            record.status,
                        )}`}
                    >
                        {normalizeStatus(record.status)}
                    </span>
                )}
            </div>
        );
    }

    if (module === "documents") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-gray-600 dark:text-white/80">
                        {record.title ||
                            record.file_name ||
                            `Document #${record.id}`}
                    </p>
                    <p className="truncate text-[9px] text-gray-400 dark:text-white/30">
                        {record.file_name || "No file name"}
                    </p>
                </div>
                <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${getStatusClass(
                        record.status,
                    )}`}
                >
                    {normalizeStatus(record.status)}
                </span>
            </div>
        );
    }

    if (module === "compliance") {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white dark:bg-white/[0.02] px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-gray-600 dark:text-white/80">
                        {record.title || `Compliance #${record.id}`}
                    </p>
                    <p className="truncate text-[9px] text-gray-400 dark:text-white/30">
                        {record.type || "Compliance record"}
                    </p>
                </div>
                <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${getStatusClass(
                        record.status,
                    )}`}
                >
                    {normalizeStatus(record.status)}
                </span>
            </div>
        );
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| MODULE DETAILS MODAL
|--------------------------------------------------------------------------
*/

function ModuleDetails({
    selectedModule,
    records,
    stats,
    onClose,
}: {
    selectedModule: ModuleConfig | null;
    records: RecordItem[];
    stats: DashboardStats;
    onClose: () => void;
}) {
    if (!selectedModule) return null;

    const Icon = selectedModule.icon;

    const chartTitle: Record<ModuleKey, string> = {
        staff: "Staff Online vs Offline",
        clients: "Client Records per Month",
        invoices: "Invoice Status Breakdown",
        payments: "Payments Monthly Trend",
        job_orders: "Job Orders per Month",
        contracts: "Contracts Monthly Trend",
        contract_permits: "Permits Monthly Trend",
        documents: "Documents Monthly Trend",
        compliance: "Compliance Status Breakdown",
    };

    const visibleRecords = records.slice(0, 5);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-visible rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0b0b0b] shadow-2xl shadow-black/50">
                {/* HEADER */}
                <div className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-white/[0.07] px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10">
                            <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-yellow-600 dark:text-yellow-400">
                                Database Records
                            </p>
                            <h2 className="truncate text-sm font-black text-gray-900 dark:text-white sm:text-base">
                                {selectedModule.label}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-gray-500 dark:text-white/45 transition hover:border-gray-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                        {/* LEFT — DATA */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-white/[0.06] bg-white dark:bg-white/[0.025] p-2.5">
                                    <p className="text-[8px] font-black uppercase tracking-wider text-gray-400 dark:text-white/25">
                                        Total
                                    </p>
                                    <p className="mt-0.5 text-lg font-black text-gray-900 dark:text-white">
                                        {formatNumber(selectedModule.count)}
                                    </p>
                                </div>

                                {selectedModule.key === "staff" && (
                                    <div className="rounded-lg border border-green-400/10 bg-green-400/[0.025] p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-green-600/60 dark:text-green-400/60">
                                            Online
                                        </p>
                                        <p className="mt-0.5 text-lg font-black text-green-700 dark:text-green-300">
                                            {formatNumber(stats.online_staff)}
                                        </p>
                                    </div>
                                )}

                                {selectedModule.key === "invoices" && (
                                    <div className="rounded-lg border border-yellow-400/10 bg-yellow-400/[0.025] p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-yellow-600/60 dark:text-yellow-400/60">
                                            Value
                                        </p>
                                        <p className="mt-0.5 truncate text-sm font-black text-yellow-700 dark:text-yellow-300">
                                            {formatCurrency(stats.invoice_total)}
                                        </p>
                                    </div>
                                )}

                                {selectedModule.key === "payments" && (
                                    <div className="rounded-lg border border-yellow-400/10 bg-yellow-400/[0.025] p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-yellow-600/60 dark:text-yellow-400/60">
                                            Value
                                        </p>
                                        <p className="mt-0.5 truncate text-sm font-black text-yellow-700 dark:text-yellow-300">
                                            {formatCurrency(stats.payment_total)}
                                        </p>
                                    </div>
                                )}

                                {selectedModule.key === "documents" && (
                                    <div className="rounded-lg border border-red-400/10 bg-red-400/[0.025] p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-red-600/60 dark:text-red-400/60">
                                            Expired
                                        </p>
                                        <p className="mt-0.5 text-lg font-black text-red-700 dark:text-red-300">
                                            {formatNumber(
                                                stats.expired_documents,
                                            )}
                                        </p>
                                    </div>
                                )}

                                {selectedModule.key === "compliance" && (
                                    <div className="rounded-lg border border-red-400/10 bg-red-400/[0.025] p-2.5">
                                        <p className="text-[8px] font-black uppercase tracking-wider text-red-600/60 dark:text-red-400/60">
                                            Overdue
                                        </p>
                                        <p className="mt-0.5 text-lg font-black text-red-700 dark:text-red-300">
                                            {formatNumber(
                                                stats.overdue_compliance,
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-white/40">
                                        Records ({records.length})
                                    </p>
                                    {records.length > 5 && (
                                        <p className="text-[9px] text-gray-400 dark:text-white/25">
                                            Showing 5 of {records.length}
                                        </p>
                                    )}
                                </div>

                                {visibleRecords.length === 0 ? (
                                    <div className="flex min-h-[80px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-white/10 bg-white/[0.015] px-4 text-center">
                                        <FolderOpen className="h-4 w-4 text-gray-400 dark:text-white/25" />
                                        <p className="mt-1.5 text-[10px] font-bold text-gray-500 dark:text-white/50">
                                            No records
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {visibleRecords.map((record, index) => (
                                            <CompactRecordRow
                                                key={`${selectedModule.key}-${
                                                    record.id ?? index
                                                }`}
                                                module={selectedModule.key}
                                                record={record}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT — CHART */}
                        <div>
                            <div className="mb-1.5 flex items-center gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                                <p className="text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-white/40">
                                    {chartTitle[selectedModule.key]}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/[0.06] bg-white dark:bg-white/[0.02] p-2.5">
                                <ModuleChart
                                    moduleKey={selectedModule.key}
                                    records={records}
                                    stats={stats}
                                />
                            </div>
                            <p className="mt-2 text-center text-[9px] text-gray-400 dark:text-white/25">
                                💡 Hover to preview · Click a point to pin the
                                records list here
                            </p>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-b-3xl border-t border-white/[0.07] px-4 py-2.5">
                    <p className="text-[9px] text-gray-400 dark:text-white/25">
                        Showing {visibleRecords.length} of{" "}
                        {formatNumber(selectedModule.count)} records
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold text-gray-500 dark:text-white/55 transition hover:border-yellow-400/20 hover:bg-yellow-400/[0.05] hover:text-gray-900 dark:hover:text-white"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
    module,
    onClick,
}: {
    module: ModuleConfig;
    onClick: () => void;
}) {
    const Icon = module.icon;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white dark:bg-white/[0.025] p-3.5 text-left shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-400/25 hover:bg-yellow-400/[0.035] focus:outline-none focus:ring-2 focus:ring-yellow-400/30 sm:p-4"
        >
            <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-yellow-400/[0.045] blur-3xl transition group-hover:bg-yellow-400/[0.09]" />
            <div className="relative flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-yellow-400/10 bg-yellow-400/[0.08]">
                    <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-white/15 transition group-hover:translate-x-0.5 group-hover:text-yellow-600/60 dark:group-hover:text-yellow-400/60" />
            </div>
            <p className="relative mt-4 truncate text-[9px] font-black uppercase tracking-[0.14em] text-gray-400 dark:text-white/30">
                {module.shortLabel}
            </p>
            <p className="relative mt-1 truncate text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                {formatNumber(module.count)}
            </p>
            <p className="relative mt-1 truncate text-[10px] text-gray-400 dark:text-white/25">
                {module.description}
            </p>
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| ACTIVITY ROW
|--------------------------------------------------------------------------
*/

function ActivityRow({
    icon: Icon,
    title,
    type,
    date,
}: {
    icon: React.ElementType;
    title: string;
    type: string;
    date: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10">
                <Icon className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-gray-600 dark:text-white/70">
                    {title}
                </p>
                <p className="mt-0.5 truncate text-[9px] text-gray-400 dark:text-white/25">
                    {type}
                </p>
            </div>
            <span className="shrink-0 text-[9px] text-gray-400 dark:text-white/20">{date}</span>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| DASHBOARD AREA CHART — pin records at chart position
|--------------------------------------------------------------------------
*/

function DashboardAreaChart({ data }: { data: any[] }) {
    const { pinnedIndex, togglePin, clearPin, isPinned } = usePinnedChart();
    useEscToClear(clearPin);
    const { ref: containerRef, rect: containerRect } =
        useContainerRect<HTMLDivElement>();

    const pinnedPoint =
        isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

    return (
        <div
            ref={containerRef}
            className="relative rounded-3xl border border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5"
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10">
                    <BarChart3 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-gray-900 dark:text-white">
                        Database Records
                    </h2>
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/25">
                        Hover a point to preview · click to pin
                    </p>
                </div>
            </div>

            <div className="relative h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 8,
                            right: 5,
                            left: -20,
                            bottom: 0,
                        }}
                        onClick={(state: any) => {
                            if (
                                state &&
                                state.activeTooltipIndex !== undefined &&
                                state.activeTooltipIndex !== null
                            ) {
                                togglePin(state.activeTooltipIndex);
                            }
                        }}
                    >
                        <defs>
                            <linearGradient
                                id="adminOverviewGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="#FACC15"
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="#FACC15"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            tick={{
                                fill: "rgba(255,255,255,0.3)",
                                fontSize: 9,
                            }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{
                                fill: "rgba(255,255,255,0.2)",
                                fontSize: 9,
                            }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            content={
                                <RichTooltip
                                    moduleKey="staff"
                                    containerRect={containerRect}
                                />
                            }
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={15}
                            active={isPinned ? false : undefined}
                            wrapperStyle={{
                                zIndex: 300,
                                pointerEvents: "auto",
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="Records"
                            stroke="#FACC15"
                            strokeWidth={2.5}
                            fill="url(#adminOverviewGradient)"
                            activeDot={{
                                r: 6,
                                fill: "#FDE047",
                                cursor: "pointer",
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {pinnedPoint && (
                <PinnedRecordsPanel
                    moduleKey="staff"
                    records={pinnedPoint.records ?? []}
                    label={pinnedPoint.name}
                    total={pinnedPoint.value ?? pinnedPoint.Records ?? 0}
                    onClose={clearPin}
                />
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MODULE DISTRIBUTION PIE — hover preview + click to pin
|--------------------------------------------------------------------------
*/

function ModuleDistributionPie({
    data,
    totalRecords,
}: {
    data: { name: string; value: number; records: RecordItem[] }[];
    totalRecords: number;
}) {
    const { pinnedIndex, togglePin, clearPin, isPinned } = usePinnedChart();
    useEscToClear(clearPin);
    const { ref: containerRef, rect: containerRect } =
        useContainerRect<HTMLDivElement>();

    const pinnedPoint =
        isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

    return (
        <div
            ref={containerRef}
            className="relative rounded-3xl border border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10">
                    <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-gray-900 dark:text-white">
                        Module Distribution
                    </h2>
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/25">
                        Hover a slice — click to pin
                    </p>
                </div>
            </div>

            <div className="relative mt-1 h-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="46%"
                            innerRadius={62}
                            outerRadius={88}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`admin-pie-${index}`}
                                    fill={
                                        CHART_COLORS[
                                            index % CHART_COLORS.length
                                        ]
                                    }
                                    cursor="pointer"
                                    onClick={() =>
                                        togglePin(
                                            pinnedIndex === index
                                                ? null
                                                : index,
                                        )
                                    }
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            content={
                                <RichTooltip
                                    moduleKey="staff"
                                    containerRect={containerRect}
                                />
                            }
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={15}
                            active={isPinned ? false : undefined}
                            wrapperStyle={{
                                zIndex: 300,
                                pointerEvents: "auto",
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            formatter={(value) => (
                                <span className="text-[9px] text-gray-500 dark:text-white/40">
                                    {value}
                                </span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {formatNumber(totalRecords)}
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-wider text-gray-400 dark:text-white/20">
                        Records
                    </p>
                </div>
            </div>

            {pinnedPoint && (
                <PinnedRecordsPanel
                    moduleKey="staff"
                    records={pinnedPoint.records ?? []}
                    label={pinnedPoint.name}
                    total={pinnedPoint.value}
                    onClose={clearPin}
                />
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| STATUS BREAKDOWN STACKED BAR — hover preview + click to pin
|--------------------------------------------------------------------------
*/

function StatusBreakdownChart({ data }: { data: any[] }) {
    const { pinnedIndex, togglePin, clearPin, isPinned } = usePinnedChart();
    useEscToClear(clearPin);
    const { ref: containerRef, rect: containerRect } =
        useContainerRect<HTMLDivElement>();

    const pinnedPoint =
        isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

    const pinnedModule: ModuleKey =
        pinnedPoint?.name === "Docs"
            ? "documents"
            : pinnedPoint?.name === "Payments"
              ? "payments"
              : pinnedPoint?.name === "Jobs"
                ? "job_orders"
                : "invoices";

    return (
        <div
            ref={containerRef}
            className="relative rounded-3xl border border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5"
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10">
                    <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-gray-900 dark:text-white">
                        Status Breakdown
                    </h2>
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/25">
                        Paid vs Overdue vs Valid vs Expired — hover to inspect,
                        click to pin
                    </p>
                </div>
            </div>

            <div className="relative h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 8,
                            right: 5,
                            left: -20,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid
                            stroke="rgba(255,255,255,0.05)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            tick={{
                                fill: "rgba(255,255,255,0.3)",
                                fontSize: 10,
                            }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{
                                fill: "rgba(255,255,255,0.2)",
                                fontSize: 10,
                            }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            content={
                                <RichTooltip
                                    moduleKey="invoices"
                                    containerRect={containerRect}
                                />
                            }
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={15}
                            active={isPinned ? false : undefined}
                            wrapperStyle={{
                                zIndex: 300,
                                pointerEvents: "auto",
                            }}
                        />
                        <Legend
                            wrapperStyle={{
                                fontSize: 10,
                                color: CHART_TEXT,
                            }}
                            iconType="circle"
                        />
                        <Bar
                            dataKey="Paid"
                            stackId="a"
                            fill="#4ADE80"
                            cursor="pointer"
                            onClick={(_: any, index: number) =>
                                togglePin(index)
                            }
                        />
                        <Bar
                            dataKey="Valid"
                            stackId="a"
                            fill="#4ADE80"
                            cursor="pointer"
                            onClick={(_: any, index: number) =>
                                togglePin(index)
                            }
                        />
                        <Bar
                            dataKey="Expiring"
                            stackId="a"
                            fill="#FACC15"
                            cursor="pointer"
                            onClick={(_: any, index: number) =>
                                togglePin(index)
                            }
                        />
                        <Bar
                            dataKey="Overdue"
                            stackId="a"
                            fill="#F87171"
                            cursor="pointer"
                            onClick={(_: any, index: number) =>
                                togglePin(index)
                            }
                        />
                        <Bar
                            dataKey="Expired"
                            stackId="a"
                            fill="#DC2626"
                            radius={[5, 5, 0, 0]}
                            cursor="pointer"
                            onClick={(_: any, index: number) =>
                                togglePin(index)
                            }
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {pinnedPoint && (
                <PinnedRecordsPanel
                    moduleKey={pinnedModule}
                    records={pinnedPoint.records ?? []}
                    label={pinnedPoint.name}
                    total={
                        Number(pinnedPoint.Paid ?? 0) +
                        Number(pinnedPoint.Valid ?? 0) +
                        Number(pinnedPoint.Expiring ?? 0) +
                        Number(pinnedPoint.Overdue ?? 0) +
                        Number(pinnedPoint.Expired ?? 0)
                    }
                    onClose={clearPin}
                />
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MODULE PROGRESS RADIAL — hover preview + click to pin
|--------------------------------------------------------------------------
*/

function ModuleProgressRadial({ data }: { data: any[] }) {
    const { pinnedIndex, togglePin, clearPin, isPinned } = usePinnedChart();
    useEscToClear(clearPin);
    const { ref: containerRef, rect: containerRect } =
        useContainerRect<HTMLDivElement>();

    const pinnedPoint =
        isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

    return (
        <div
            ref={containerRef}
            className="relative rounded-3xl border border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10">
                    <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-gray-900 dark:text-white">
                        Module Progress
                    </h2>
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/25">
                        Radial view per module — hover to see records, click to
                        pin
                    </p>
                </div>
            </div>

            <div className="relative h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="20%"
                        outerRadius="90%"
                        barSize={10}
                        data={data}
                    >
                        <RadialBar
                            background={{
                                fill: "rgba(255,255,255,0.03)",
                            }}
                            dataKey="value"
                            cornerRadius={6}
                            cursor="pointer"
                            onClick={(_: any, index: number) =>
                                togglePin(index)
                            }
                        />
                        <Tooltip
                            content={
                                <RichTooltip
                                    moduleKey="staff"
                                    containerRect={containerRect}
                                />
                            }
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={15}
                            active={isPinned ? false : undefined}
                            wrapperStyle={{
                                zIndex: 300,
                                pointerEvents: "auto",
                            }}
                        />
                        <Legend
                            iconSize={8}
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{
                                fontSize: 10,
                                color: CHART_TEXT,
                            }}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>

            {pinnedPoint && (
                <PinnedRecordsPanel
                    moduleKey="staff"
                    records={pinnedPoint.records ?? []}
                    label={pinnedPoint.name}
                    total={pinnedPoint.value}
                    onClose={clearPin}
                />
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| COMPLIANCE RADIAL — hover preview + click to pin
|--------------------------------------------------------------------------
*/

function ComplianceRadial({ data }: { data: any[] }) {
    const { pinnedIndex, togglePin, clearPin, isPinned } = usePinnedChart();
    useEscToClear(clearPin);
    const { ref: containerRef, rect: containerRect } =
        useContainerRect<HTMLDivElement>();

    const pinnedPoint =
        isPinned && pinnedIndex !== null ? data[pinnedIndex] : null;

    return (
        <div
            ref={containerRef}
            className="relative rounded-3xl border border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10">
                    <ShieldCheck className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-gray-900 dark:text-white">
                        Compliance Health
                    </h2>
                    <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/25">
                        Compliant vs Overdue — hover to inspect, click to pin
                    </p>
                </div>
            </div>

            <div className="relative h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="90%"
                        barSize={20}
                        data={data}
                    >
                        <RadialBar
                            background={{
                                fill: "rgba(255,255,255,0.03)",
                            }}
                            dataKey="value"
                            cornerRadius={8}
                            cursor="pointer"
                            onClick={(_: any, index: number) =>
                                togglePin(index)
                            }
                        />
                        <Tooltip
                            content={
                                <RichTooltip
                                    moduleKey="compliance"
                                    containerRect={containerRect}
                                />
                            }
                            allowEscapeViewBox={{ x: true, y: true }}
                            offset={15}
                            active={isPinned ? false : undefined}
                            wrapperStyle={{
                                zIndex: 300,
                                pointerEvents: "auto",
                            }}
                        />
                        <Legend
                            iconSize={10}
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{
                                fontSize: 10,
                                color: CHART_TEXT,
                            }}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>

            {pinnedPoint && (
                <PinnedRecordsPanel
                    moduleKey="compliance"
                    records={pinnedPoint.records ?? []}
                    label={pinnedPoint.name}
                    total={pinnedPoint.value}
                    onClose={clearPin}
                />
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
|--------------------------------------------------------------------------
*/

export default function AdminDashboard() {
    const { stats, details } = usePage<PageProps>().props;

    const [selectedModuleKey, setSelectedModuleKey] =
        useState<ModuleKey | null>(null);

    const safeStats: DashboardStats = {
        staff: Number(stats?.staff ?? 0),
        clients: Number(stats?.clients ?? 0),
        invoices: Number(stats?.invoices ?? 0),
        payments: Number(stats?.payments ?? 0),
        payment_total: Number(stats?.payment_total ?? 0),
        invoice_total: Number(stats?.invoice_total ?? 0),
        job_orders: Number(stats?.job_orders ?? 0),
        contracts: Number(stats?.contracts ?? 0),
        contract_permits: Number(stats?.contract_permits ?? 0),
        documents: Number(stats?.documents ?? 0),
        compliance: Number(stats?.compliance ?? 0),
        online_staff: Number(stats?.online_staff ?? 0),
        overdue_invoices: Number(stats?.overdue_invoices ?? 0),
        expiring_documents: Number(stats?.expiring_documents ?? 0),
        expired_documents: Number(stats?.expired_documents ?? 0),
        overdue_compliance: Number(stats?.overdue_compliance ?? 0),
    };

    const safeDetails: DashboardDetails = {
        staff: Array.isArray(details?.staff) ? details.staff : [],
        clients: Array.isArray(details?.clients) ? details.clients : [],
        invoices: Array.isArray(details?.invoices) ? details.invoices : [],
        payments: Array.isArray(details?.payments) ? details.payments : [],
        job_orders: Array.isArray(details?.job_orders)
            ? details.job_orders
            : [],
        contracts: Array.isArray(details?.contracts) ? details.contracts : [],
        contract_permits: Array.isArray(details?.contract_permits)
            ? details.contract_permits
            : [],
        documents: Array.isArray(details?.documents) ? details.documents : [],
        compliance: Array.isArray(details?.compliance)
            ? details.compliance
            : [],
    };

    const modules: ModuleConfig[] = [
        {
            key: "staff",
            label: "Staff Accounts",
            shortLabel: "Staff",
            icon: Users,
            count: safeStats.staff,
            description: "Registered staff",
        },
        {
            key: "invoices",
            label: "Invoices",
            shortLabel: "Invoices",
            icon: Receipt,
            count: safeStats.invoices,
            description: "Invoice records",
        },
        {
            key: "payments",
            label: "Payments",
            shortLabel: "Payments",
            icon: CreditCard,
            count: safeStats.payments,
            description: "Payment records",
        },
        {
            key: "job_orders",
            label: "Job Orders",
            shortLabel: "Job Orders",
            icon: FileCheck2,
            count: safeStats.job_orders,
            description: "Job order records",
        },
        {
            key: "contracts",
            label: "Contracts",
            shortLabel: "Contracts",
            icon: FileCheck2,
            count: safeStats.contracts,
            description: "Contract records",
        },
        {
            key: "documents",
            label: "Documents",
            shortLabel: "Documents",
            icon: FileText,
            count: safeStats.documents,
            description: "Document records",
        },
        {
            key: "compliance",
            label: "Compliance",
            shortLabel: "Compliance",
            icon: ShieldCheck,
            count: safeStats.compliance,
            description: "Compliance records",
        },
    ];

    const selectedModule =
        modules.find((module) => module.key === selectedModuleKey) ?? null;

    const selectedRecords = useMemo(() => {
        switch (selectedModuleKey) {
            case "staff":
                return safeDetails.staff;
            case "clients":
                return safeDetails.clients;
            case "invoices":
                return safeDetails.invoices;
            case "payments":
                return safeDetails.payments;
            case "job_orders":
                return safeDetails.job_orders;
            case "contracts":
                return safeDetails.contracts;
            case "contract_permits":
                return safeDetails.contract_permits;
            case "documents":
                return safeDetails.documents;
            case "compliance":
                return safeDetails.compliance;
            default:
                return [];
        }
    }, [
        selectedModuleKey,
        safeDetails.staff,
        safeDetails.clients,
        safeDetails.invoices,
        safeDetails.payments,
        safeDetails.job_orders,
        safeDetails.contracts,
        safeDetails.contract_permits,
        safeDetails.documents,
        safeDetails.compliance,
    ]);

    const totalRecords =
        safeStats.staff +
        safeStats.clients +
        safeStats.invoices +
        safeStats.payments +
        safeStats.job_orders +
        safeStats.contracts +
        safeStats.contract_permits +
        safeStats.documents +
        safeStats.compliance;

    const overviewData = useMemo(
        () => [
            {
                name: "Staff",
                Records: safeStats.staff,
                value: safeStats.staff,
                records: safeDetails.staff,
            },
            {
                name: "Clients",
                Records: safeStats.clients,
                value: safeStats.clients,
                records: safeDetails.clients,
            },
            {
                name: "Invoices",
                Records: safeStats.invoices,
                value: safeStats.invoices,
                records: safeDetails.invoices,
            },
            {
                name: "Payments",
                Records: safeStats.payments,
                value: safeStats.payments,
                records: safeDetails.payments,
            },
            {
                name: "Jobs",
                Records: safeStats.job_orders,
                value: safeStats.job_orders,
                records: safeDetails.job_orders,
            },
            {
                name: "Contracts",
                Records: safeStats.contracts,
                value: safeStats.contracts,
                records: safeDetails.contracts,
            },
            {
                name: "Permits",
                Records: safeStats.contract_permits,
                value: safeStats.contract_permits,
                records: safeDetails.contract_permits,
            },
            {
                name: "Docs",
                Records: safeStats.documents,
                value: safeStats.documents,
                records: safeDetails.documents,
            },
            {
                name: "Compliance",
                Records: safeStats.compliance,
                value: safeStats.compliance,
                records: safeDetails.compliance,
            },
        ],
        [safeStats, safeDetails],
    );

    const distributionData = [
        { name: "Staff", value: safeStats.staff, records: safeDetails.staff },
        {
            name: "Clients",
            value: safeStats.clients,
            records: safeDetails.clients,
        },
        {
            name: "Invoices",
            value: safeStats.invoices,
            records: safeDetails.invoices,
        },
        {
            name: "Payments",
            value: safeStats.payments,
            records: safeDetails.payments,
        },
        {
            name: "Jobs",
            value: safeStats.job_orders,
            records: safeDetails.job_orders,
        },
        {
            name: "Contracts",
            value: safeStats.contracts,
            records: safeDetails.contracts,
        },
        {
            name: "Permits",
            value: safeStats.contract_permits,
            records: safeDetails.contract_permits,
        },
        {
            name: "Docs",
            value: safeStats.documents,
            records: safeDetails.documents,
        },
        {
            name: "Compliance",
            value: safeStats.compliance,
            records: safeDetails.compliance,
        },
    ];

    const radialData = modules.map((module, index) => ({
        name: module.shortLabel,
        value: module.count,
        fill: CHART_COLORS[index % CHART_COLORS.length],
        records: (safeDetails as any)[module.key] ?? [],
    }));

    const overdueInvoiceRecords = safeDetails.invoices.filter((r) =>
        String(r.status ?? "").toLowerCase().includes("overdue"),
    );
    const paidInvoiceRecords = safeDetails.invoices.filter(
        (r) => !String(r.status ?? "").toLowerCase().includes("overdue"),
    );

    const expiringDocs = safeDetails.documents.filter((r) =>
        String(r.status ?? "").toLowerCase().includes("expiring"),
    );
    const expiredDocs = safeDetails.documents.filter((r) =>
        String(r.status ?? "").toLowerCase().includes("expired"),
    );
    const validDocs = safeDetails.documents.filter((r) => {
        const s = String(r.status ?? "").toLowerCase();
        return !s.includes("expiring") && !s.includes("expired");
    });

    const stackedBarData = [
        {
            name: "Invoices",
            Paid:
                paidInvoiceRecords.length ||
                safeStats.invoices - safeStats.overdue_invoices,
            Overdue:
                overdueInvoiceRecords.length || safeStats.overdue_invoices,
            records: safeDetails.invoices,
        },
        {
            name: "Payments",
            Paid: safeStats.payments,
            Overdue: 0,
            records: safeDetails.payments,
        },
        {
            name: "Jobs",
            Paid: safeStats.job_orders,
            Overdue: 0,
            records: safeDetails.job_orders,
        },
        {
            name: "Docs",
            Valid: validDocs.length,
            Expiring: expiringDocs.length,
            Expired: expiredDocs.length,
            records: safeDetails.documents,
        },
    ];

    const overdueComplianceRecords = safeDetails.compliance.filter((r) =>
        String(r.status ?? "").toLowerCase().includes("overdue"),
    );
    const compliantRecords = safeDetails.compliance.filter(
        (r) => !String(r.status ?? "").toLowerCase().includes("overdue"),
    );

    const complianceRadial = [
        {
            name: "Compliant",
            value:
                compliantRecords.length ||
                Math.max(
                    0,
                    safeStats.compliance - safeStats.overdue_compliance,
                ),
            fill: "#4ADE80",
            records: compliantRecords,
        },
        {
            name: "Overdue",
            value:
                overdueComplianceRecords.length ||
                safeStats.overdue_compliance,
            fill: "#F87171",
            records: overdueComplianceRecords,
        },
    ];

    const activities = useMemo(() => {
        const result: {
            dateValue: number;
            icon: React.ElementType;
            title: string;
            type: string;
            date: string;
        }[] = [];

        const addActivity = (
            record: RecordItem,
            icon: React.ElementType,
            title: string,
            type: string,
        ) => {
            const value = record.created_at
                ? new Date(record.created_at).getTime()
                : 0;
            result.push({
                dateValue: value,
                icon,
                title,
                type,
                date: formatDateTime(record.created_at),
            });
        };

        safeDetails.staff.forEach((record) => {
            addActivity(
                record,
                Users,
                `${record.name || "Staff account"} added`,
                "Staff Management",
            );
        });
        safeDetails.clients.forEach((record) => {
            addActivity(
                record,
                Users,
                `${record.name || "Client account"} added`,
                "Client Management",
            );
        });
        safeDetails.invoices.forEach((record) => {
            addActivity(
                record,
                Receipt,
                `${record.number || `Invoice #${record.id}`} recorded`,
                "Billing & Invoicing",
            );
        });
        safeDetails.payments.forEach((record) => {
            addActivity(
                record,
                CreditCard,
                `${record.receipt_number || `Payment #${record.id}`} recorded`,
                "Payment Management",
            );
        });
        safeDetails.job_orders.forEach((record) => {
            addActivity(
                record,
                FileCheck2,
                `${record.number || `Job Order #${record.id}`} created`,
                "Job Order Management",
            );
        });
        safeDetails.contracts.forEach((record) => {
            addActivity(
                record,
                FileCheck2,
                `${record.contract_no || `Contract #${record.id}`} recorded`,
                "Contract Management",
            );
        });
        safeDetails.contract_permits.forEach((record) => {
            addActivity(
                record,
                FolderOpen,
                `${record.number || `Permit #${record.id}`} recorded`,
                "Contract & Permit Management",
            );
        });
        safeDetails.documents.forEach((record) => {
            addActivity(
                record,
                FileText,
                `${
                    record.title || record.file_name || `Document #${record.id}`
                } added`,
                "Document Management",
            );
        });
        safeDetails.compliance.forEach((record) => {
            addActivity(
                record,
                ShieldCheck,
                `${record.title || `Compliance #${record.id}`} added`,
                "Regulatory Compliance",
            );
        });

        return result.sort((a, b) => b.dateValue - a.dateValue).slice(0, 8);
    }, [safeDetails]);

    return (
        <AdminLayout title="Admin Dashboard | ALIBATON">
            <div className="min-h-screen p-4 pb-8 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
                <div className="mx-auto max-w-[1500px]">
                    {/* HEADER */}
                    <header className="mb-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-600 dark:text-yellow-400 sm:text-[10px]">
                                        ALIBATON Administration
                                    </p>
                                </div>
                                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                                    Admin Dashboard
                                </h1>
                                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-gray-400 dark:text-white/30 sm:text-sm">
                                    Centralized database overview for ALIBATON
                                    Heavy Equipment & Logistics. Hover any
                                    chart to preview records — click a point to
                                    pin the records list right there and scroll
                                    through every entry.
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* TOP SUMMARY */}
                    <section className="mb-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/[0.07] bg-white dark:bg-white/[0.02] p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-white/25">
                                        Total System Records
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                                        {formatNumber(totalRecords)}
                                    </p>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10">
                                    <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-green-400/10 bg-green-400/[0.025] p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-green-600/60 dark:text-green-400/60">
                                        Online Staff
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-green-700 dark:text-green-300">
                                        {formatNumber(safeStats.online_staff)}
                                    </p>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-400/10">
                                    <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.025] p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-red-600/60 dark:text-red-400/60">
                                        Attention Required
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-red-700 dark:text-red-300">
                                        {formatNumber(
                                            safeStats.overdue_invoices +
                                                safeStats.expired_documents +
                                                safeStats.overdue_compliance,
                                        )}
                                    </p>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-400/10">
                                    <ShieldCheck className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SYSTEM OVERVIEW */}
                    <section>
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-black text-gray-900 dark:text-white">
                                    System Overview
                                </h2>
                                <p className="mt-1 text-[10px] text-gray-400 dark:text-white/25">
                                    Click any module to view its data and chart.
                                    Hover on chart points for records — click to
                                    pin.
                                </p>
                            </div>
                            <span className="hidden text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-white/20 sm:block">
                                {modules.length} Modules
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {modules.map((module) => (
                                <StatCard
                                    key={module.key}
                                    module={module}
                                    onClick={() =>
                                        setSelectedModuleKey(module.key)
                                    }
                                />
                            ))}
                        </div>
                    </section>

                    {/* CHARTS ROW 1 — AREA + PIE */}
                    <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                        <DashboardAreaChart data={overviewData} />
                        <ModuleDistributionPie
                            data={distributionData}
                            totalRecords={totalRecords}
                        />
                    </section>

                    {/* CHARTS ROW 2 — STACKED BAR + RADIAL BAR */}
                    <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                        <StatusBreakdownChart data={stackedBarData} />
                        <ModuleProgressRadial data={radialData} />
                    </section>

                    {/* CHARTS ROW 3 — COMPLIANCE RADIAL + RECENT ACTIVITY */}
                    <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.25fr]">
                        <ComplianceRadial data={complianceRadial} />

                        <div className="rounded-3xl border border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10">
                                        <Clock3 className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black text-gray-900 dark:text-white">
                                            Recent Activity
                                        </h2>
                                        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/25">
                                            Latest database records
                                        </p>
                                    </div>
                                </div>
                                <Activity className="h-4 w-4 text-gray-400 dark:text-white/15" />
                            </div>

                            <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                                {activities.length > 0 ? (
                                    activities.map((activity, index) => (
                                        <ActivityRow
                                            key={`${activity.type}-${index}`}
                                            {...activity}
                                        />
                                    ))
                                ) : (
                                    <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                                        <div className="text-center">
                                            <Clock3 className="mx-auto h-5 w-5 text-gray-400 dark:text-white/15" />
                                            <p className="mt-2 text-xs font-bold text-gray-500 dark:text-white/35">
                                                No recent activity
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* FOOTER */}
                    <section className="mt-5 rounded-2xl border border-green-400/10 bg-green-400/[0.018] p-3.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-400/10">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-gray-600 dark:text-white/70">
                                        ALIBATON Administration System
                                    </p>
                                    <p className="mt-0.5 text-[9px] text-gray-400 dark:text-white/20">
                                        Dashboard values are loaded from the
                                        current database. Hover on charts to
                                        preview records — click to pin.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                                <span className="text-[9px] font-black uppercase tracking-wider text-green-700 dark:text-green-300">
                                    Operational
                                </span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <ModuleDetails
                selectedModule={selectedModule}
                records={selectedRecords}
                stats={safeStats}
                onClose={() => setSelectedModuleKey(null)}
            />
        </AdminLayout>
    );
}
