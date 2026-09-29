import React, {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { Head } from "@inertiajs/react";
import AdminLayout from "../../Layouts/AdminLayout";

import {
    AlertTriangle,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Download,
    Eye,
    FileBarChart,
    FileText,
    MoreVertical,
    RefreshCw,
    Shield,
    Sparkles,
    Trash2,
    User,
    Users,
    X,
    Loader2,
} from "lucide-react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type ReportType =
    | "All"
    | "Operations"
    | "Compliance"
    | "Documents"
    | "Job Orders"
    | "Financial"
    | "Billing"
    | "Accounts Receivable";

type DateRangeOption =
    | "Last 6 Months"
    | "This Month"
    | "This Quarter"
    | "This Year"
    | "Last 30 Days";

type ReportRow = {
    id: number;
    name: string;
    type: string;
    report_type?: string;
    date_range: string;
    generated_on: string | null;
    created_by: string;
    owner_name?: string;
    owner_email?: string;
    ai_generated?: boolean;
    content?: string;
    client_name?: string | null;
    client?: string | null;
    project_name?: string | null;
    project?: string | null;
};

type QuickSummary = {
    total_reports: number;
    total_users: number;
    total_clients: number;
    total_ai_reports: number;
    reports_delta: number;
    users_delta: number;
    clients_delta: number;
};

type Toast = {
    id: number;
    type: "success" | "warning" | "error" | "info";
    title: string;
    message: string;
};

type RawReportPayload = {
    id?: number | string;
    name?: string;
    type?: string;
    report_type?: string;
    start_date?: string | null;
    end_date?: string | null;
    date_range?: string;
    generated_on?: string | null;
    created_at?: string | null;
    created_by?: string | null;
    ai_generated?: boolean;
    content?: string | Record<string, unknown> | unknown[] | null;
    client_name?: string | null;
    client?: string | null;
    project_name?: string | null;
    project?: string | null;
    owner_name?: string;
    owner_email?: string;
    user?: { name?: string; email?: string } | null;
};

/*
|--------------------------------------------------------------------------
| BASIC HELPERS
|--------------------------------------------------------------------------
*/

function numberValue(value: unknown): number {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value !== "string") return 0;
    const parsed = Number(value.replace(/,/g, "").replace(/[₱$]/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown): string {
    return new Intl.NumberFormat("en-PH", {
        maximumFractionDigits: 0,
    }).format(numberValue(value));
}

function formatCurrency(value: unknown): string {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numberValue(value));
}

function formatMonthYear(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-PH", {
        month: "short",
        year: "numeric",
    });
}

function formatDateRange(
    startDate?: string | null,
    endDate?: string | null,
    fallback?: string,
): string {
    if (fallback && !fallback.includes("T")) {
        return fallback;
    }

    if (startDate && endDate) {
        return `${formatMonthYear(startDate)} – ${formatMonthYear(endDate)}`;
    }

    if (startDate) return formatMonthYear(startDate);
    if (endDate) return formatMonthYear(endDate);

    return fallback ?? "—";
}

function dateToString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDateRangeValues(range: DateRangeOption) {
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (range) {
        case "This Month":
            start.setDate(1);
            break;
        case "This Quarter":
            start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
            break;
        case "This Year":
            start.setMonth(0, 1);
            break;
        case "Last 30 Days":
            start.setDate(start.getDate() - 29);
            break;
        case "Last 6 Months":
        default:
            start.setMonth(start.getMonth() - 6);
            break;
    }

    return {
        start_date: dateToString(start),
        end_date: dateToString(end),
    };
}

function formatDateDisplay(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function formatDateLong(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-PH", {
        dateStyle: "long",
    });
}

function getCsrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") ?? ""
    );
}

function humanizeKey(key: string): string {
    return key
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

function isCurrencyKey(key: string): boolean {
    const k = key
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isCountField =
        k.includes("count") ||
        k.includes("number") ||
        k.includes("quantity") ||
        k.includes("qty");
    if (isCountField) return false;

    const isNonCurrencyField =
        k === "id" ||
        k.endsWith(" id") ||
        k.includes("status") ||
        k.includes("date") ||
        k.includes("time") ||
        k.includes("percentage") ||
        k.includes("percent") ||
        k.includes("rate") ||
        k.includes("days") ||
        k.includes("duration");
    if (isNonCurrencyField) return false;

    return (
        k.includes("amount") ||
        k.includes("total") ||
        k.includes("revenue") ||
        k.includes("sales") ||
        k.includes("income") ||
        k.includes("outstanding") ||
        k.includes("receivable") ||
        k.includes("balance") ||
        k.includes("expense") ||
        k.includes("cost") ||
        k.includes("tax") ||
        k.includes("vat") ||
        k.includes("subtotal")
    );
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumericValue(value: unknown): boolean {
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "").replace(/[₱$]/g, "").trim();
        return cleaned !== "" && Number.isFinite(Number(cleaned));
    }
    return false;
}

function getObjectNumber(
    data: Record<string, unknown>,
    keys: string[],
): number | null {
    for (const key of keys) {
        if (key in data) return numberValue(data[key]);
    }
    return null;
}

function getInsensitiveValue(
    data: Record<string, unknown>,
    keys: string[],
): unknown {
    const entries = Object.entries(data);
    for (const wanted of keys) {
        const n = wanted.toLowerCase().replace(/[_-]+/g, " ").trim();
        const found = entries.find(
            ([k]) => k.toLowerCase().replace(/[_-]+/g, " ").trim() === n,
        );
        if (found) return found[1];
    }
    return undefined;
}

function extractClient(
    report: ReportRow,
    parsed: Record<string, unknown> | null,
): string | null {
    const rowCandidates = [report.client_name, report.client];
    for (const value of rowCandidates) {
        if (
            typeof value === "string" &&
            value.trim() &&
            value !== "All Clients"
        ) {
            return value.trim();
        }
    }

    if (parsed) {
        const keys = [
            "client_name",
            "client",
            "customer_name",
            "customer",
            "account_name",
            "company_name",
        ];
        const direct = getInsensitiveValue(parsed, keys);
        if (typeof direct === "string" && direct.trim()) return direct.trim();

        for (const value of Object.values(parsed)) {
            if (!isObject(value)) continue;
            const nested = getInsensitiveValue(value, keys);
            if (typeof nested === "string" && nested.trim())
                return nested.trim();
        }
    }

    return null;
}

function getProfessionalReportTitle(
    report: ReportRow,
    parsed: Record<string, unknown> | null,
): string {
    const client = extractClient(report, parsed);
    if (client) return client;
    if (report.name && report.name !== "Untitled Report") return report.name;
    return `${report.type} Report`;
}

function parseReportContent(
    raw?: string | Record<string, unknown> | null,
): Record<string, unknown> | null {
    if (!raw) return null;
    if (isObject(raw)) return raw;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
        const parsed = JSON.parse(trimmed);
        if (isObject(parsed)) return parsed;
        if (Array.isArray(parsed)) return { records: parsed };
    } catch {
        return null;
    }
    return null;
}

function normalizeReportRow(
    item: RawReportPayload | null | undefined,
    index: number,
): ReportRow {
    const startDate = item?.start_date ?? null;
    const endDate = item?.end_date ?? null;

    const dateRange = formatDateRange(startDate, endDate, item?.date_range);

    const rawContent = item?.content;
    let content: string | undefined;

    if (typeof rawContent === "string") content = rawContent;
    else if (isObject(rawContent) || Array.isArray(rawContent)) {
        try {
            content = JSON.stringify(rawContent);
        } catch {
            content = undefined;
        }
    }

    let parsedContent: Record<string, unknown> | null = null;
    if (typeof rawContent === "string")
        parsedContent = parseReportContent(rawContent);
    else if (isObject(rawContent)) parsedContent = rawContent;
    else if (Array.isArray(rawContent)) parsedContent = { records: rawContent };

    const baseRow: ReportRow = {
        id: Number(item?.id ?? index),
        name: item?.name ?? "Untitled Report",
        type: item?.type ?? item?.report_type ?? "All",
        report_type: item?.report_type ?? item?.type ?? "All",
        date_range: dateRange,
        generated_on: item?.generated_on ?? item?.created_at ?? null,
        created_by: item?.created_by ?? item?.user?.name ?? "System",
        owner_name:
            item?.owner_name ?? item?.user?.name ?? item?.created_by ?? "System",
        owner_email: item?.owner_email ?? item?.user?.email,
        content,
        client_name: item?.client_name ?? item?.client ?? null,
        client: item?.client ?? item?.client_name ?? null,
        project_name: item?.project_name ?? null,
        project: item?.project ?? null,
        ai_generated: Boolean(item?.ai_generated),
    };

    const clientFromContent = parsedContent
        ? extractClient(baseRow, parsedContent)
        : null;

    if (clientFromContent) {
        baseRow.client_name = baseRow.client_name ?? clientFromContent;
        baseRow.client = baseRow.client ?? clientFromContent;
    }

    return baseRow;
}

/*
|--------------------------------------------------------------------------
| OKLCH → RGB
|--------------------------------------------------------------------------
*/

const OKLCH_CACHE = new Map<string, string>();

function oklchToRgb(oklchValue: string, property: string): string {
    const cacheKey = `${property}::${oklchValue}`;
    if (OKLCH_CACHE.has(cacheKey)) return OKLCH_CACHE.get(cacheKey)!;

    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.left = "-99999px";
    probe.style.visibility = "hidden";
    probe.style.setProperty(property, oklchValue);
    document.body.appendChild(probe);

    const computed = window.getComputedStyle(probe).getPropertyValue(property);
    document.body.removeChild(probe);

    let resolved: string;
    if (computed && !computed.includes("oklch")) resolved = computed;
    else if (property.includes("background")) resolved = "rgb(248, 250, 252)";
    else if (property.includes("border")) resolved = "rgb(226, 232, 240)";
    else if (property.includes("shadow")) resolved = "none";
    else resolved = "rgb(15, 23, 42)";

    OKLCH_CACHE.set(cacheKey, resolved);
    return resolved;
}

function replaceOklchTokens(value: string, property: string): string {
    if (!value || !value.includes("oklch")) return value;
    return value.replace(/oklch\([^)]*\)/g, (match) =>
        oklchToRgb(match, property),
    );
}

function sanitizeOklchColors(root: HTMLElement): void {
    const all = root.querySelectorAll<HTMLElement>("*");
    const colorProps = [
        "color",
        "background-color",
        "background-image",
        "border-top-color",
        "border-right-color",
        "border-bottom-color",
        "border-left-color",
        "border-color",
        "outline-color",
        "text-decoration-color",
        "caret-color",
        "column-rule-color",
        "fill",
        "stroke",
        "box-shadow",
        "text-shadow",
    ];

    all.forEach((node) => {
        const computed = window.getComputedStyle(node);
        colorProps.forEach((prop) => {
            const value = computed.getPropertyValue(prop);
            if (value && value.includes("oklch")) {
                node.style.setProperty(
                    prop,
                    replaceOklchTokens(value, prop),
                    "important",
                );
            }
        });

        for (let i = node.style.length - 1; i >= 0; i--) {
            const prop = node.style[i];
            const inlineValue = node.style.getPropertyValue(prop);
            if (inlineValue && inlineValue.includes("oklch")) {
                node.style.setProperty(
                    prop,
                    replaceOklchTokens(inlineValue, prop),
                    "important",
                );
            }
        }
    });

    root.querySelectorAll<HTMLElement>(
        "p, h1, h2, h3, h4, h5, h6, span, td, th, li, label, strong, em, small, div",
    ).forEach((node) => {
        const color = window.getComputedStyle(node).getPropertyValue("color");
        if (!color || color.includes("oklch")) {
            node.style.setProperty("color", "#0f172a", "important");
        }
    });
}

/*
|--------------------------------------------------------------------------
| MAIN ADMIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function AdminReportManagement() {
    // Existing: filter for the LIST view
    const [reportType, setReportType] = useState<ReportType>("All");
    const [dateRange, setDateRange] = useState<DateRangeOption>("Last 6 Months");
    const [client, setClient] = useState("All Clients");

    // ✅ NEW: state for the GENERATE form
    const [generateReportType, setGenerateReportType] = useState<ReportType>("All");
    const [generateDateRange, setGenerateDateRange] = useState<DateRangeOption>("Last 6 Months");
    const [generateClient, setGenerateClient] = useState("All Clients");
    const [generating, setGenerating] = useState(false);

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ReportRow[]>([]);

    const [summary, setSummary] = useState<QuickSummary>({
        total_reports: 0,
        total_users: 0,
        total_clients: 0,
        total_ai_reports: 0,
        reports_delta: 0,
        users_delta: 0,
        clients_delta: 0,
    });

    const [clients, setClients] = useState<string[]>([]);

    const [viewingReport, setViewingReport] = useState<ReportRow | null>(null);
    const [deletingReport, setDeletingReport] = useState<ReportRow | null>(null);

    const [downloadRequestId, setDownloadRequestId] = useState(0);

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{
        top: number;
        left: number;
    } | null>(null);

    const [toasts, setToasts] = useState<Toast[]>([]);

    const menuRef = useRef<HTMLDivElement | null>(null);

    /*
    |--------------------------------------------------------------------------
    | TOAST
    |--------------------------------------------------------------------------
    */

    const pushToast = useCallback((toast: Omit<Toast, "id">) => {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current, { ...toast, id }]);
        const ttl = toast.type === "error" ? 8000 : 5000;
        window.setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== id));
        }, ttl);
    }, []);

    const dismissToast = (id: number) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    };

    /*
    |--------------------------------------------------------------------------
    | CLOSE MENU
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (openMenuId === null) return;

        const closeMenu = () => {
            setOpenMenuId(null);
            setMenuPosition(null);
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                closeMenu();
            }
        };

        document.addEventListener("click", handleClickOutside);
        window.addEventListener("scroll", closeMenu, true);
        window.addEventListener("resize", closeMenu);

        return () => {
            document.removeEventListener("click", handleClickOutside);
            window.removeEventListener("scroll", closeMenu, true);
            window.removeEventListener("resize", closeMenu);
        };
    }, [openMenuId]);

    /*
    |--------------------------------------------------------------------------
    | FETCH REPORTS (LIST)
    |--------------------------------------------------------------------------
    */

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const dates = getDateRangeValues(dateRange);
            const params = new URLSearchParams({
                start_date: dates.start_date,
                end_date: dates.end_date,
                report_type: reportType,
                client: client,
            });

            const response = await fetch(
                `/admin/reports/list?${params.toString()}`,
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                },
            );

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                throw new Error(
                    errorBody?.message ?? `Request failed: ${response.status}`,
                );
            }

            const data = await response.json();

            const list: RawReportPayload[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.reports)
                  ? data.reports
                  : Array.isArray(data?.data)
                    ? data.data
                    : [];

            setRows(list.map((item, index) => normalizeReportRow(item, index)));

            if (data?.summary) {
                setSummary({
                    total_reports: numberValue(data.summary.total_reports),
                    total_users: numberValue(data.summary.total_users),
                    total_clients: numberValue(data.summary.total_clients),
                    total_ai_reports: numberValue(data.summary.total_ai_reports),
                    reports_delta: numberValue(data.summary.reports_delta),
                    users_delta: numberValue(data.summary.users_delta),
                    clients_delta: numberValue(data.summary.clients_delta),
                });
            }
        } catch (error) {
            console.error("Failed to fetch admin reports:", error);
            pushToast({
                type: "error",
                title: "Failed to load reports",
                message:
                    error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setLoading(false);
        }
    }, [reportType, dateRange, client, pushToast]);

    useEffect(() => {
        void fetchReports();
    }, [fetchReports]);

    /*
    |--------------------------------------------------------------------------
    | ✅ GENERATE REPORT — Admin creates own report
    |--------------------------------------------------------------------------
    */

    const handleGenerate = async (event: React.FormEvent) => {
        event.preventDefault();

        if (generating) return;

        setGenerating(true);

        try {
            const dates = getDateRangeValues(generateDateRange);
            const selectedClient =
                generateClient === "All Clients" ? null : generateClient;

            const response = await fetch("/admin/reports/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    name: null,
                    type: generateReportType,
                    report_type: generateReportType,
                    start_date: dates.start_date,
                    end_date: dates.end_date,
                    client: selectedClient,
                    client_name: selectedClient,
                    ai_generated: false,
                }),
            });

            const body = await response.json().catch(() => null);

            if (!response.ok) {
                const validationMessage = body?.errors
                    ? Object.values(body.errors).flat().join(" ")
                    : null;

                throw new Error(
                    validationMessage ??
                        body?.message ??
                        `Request failed: ${response.status}`,
                );
            }

            if (!body?.success) {
                throw new Error(
                    body?.message ?? "Report could not be created.",
                );
            }

            pushToast({
                type: "success",
                title: "Report generated",
                message: `${
                    selectedClient ?? "All Clients"
                } report created successfully.`,
            });

            // Refresh the list so the new report appears
            await fetchReports();
        } catch (error) {
            console.error("Failed to generate admin report:", error);
            pushToast({
                type: "error",
                title: "Failed to generate report",
                message:
                    error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setGenerating(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | FILTER OPTIONS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        fetch("/admin/reports/filter-options", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((response) => {
                if (!response.ok)
                    throw new Error(`Request failed: ${response.status}`);
                return response.json();
            })
            .then((data) => {
                const values = Array.isArray(data?.clients)
                    ? data.clients
                          .filter(
                              (value: unknown) =>
                                  typeof value === "string" && value.trim(),
                          )
                          .map((value: string) => value.trim())
                    : [];

                const uniqueSorted: string[] = Array.from(
                    new Set<string>(values),
                ).sort((a, b) => a.localeCompare(b));

                setClients(uniqueSorted);
            })
            .catch((error) => {
                console.error("Admin filter options failed:", error);
            });
    }, []);

    /*
    |--------------------------------------------------------------------------
    | ROW ACTIONS
    |--------------------------------------------------------------------------
    */

    const openMenu = (
        event: React.MouseEvent<HTMLButtonElement>,
        rowId: number,
    ) => {
        event.stopPropagation();

        if (openMenuId === rowId) {
            setOpenMenuId(null);
            setMenuPosition(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const MENU_WIDTH = 176;
        const MENU_HEIGHT = 150;
        const GAP = 6;

        let left = rect.right - MENU_WIDTH;
        if (left < 8) left = 8;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        let top =
            spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow
                ? rect.top - MENU_HEIGHT - GAP
                : rect.bottom + GAP;

        if (top + MENU_HEIGHT > window.innerHeight - 8)
            top = window.innerHeight - MENU_HEIGHT - 8;
        if (top < 8) top = 8;

        setMenuPosition({ top, left });
        setOpenMenuId(rowId);
    };

    const handleView = (row: ReportRow) => {
        setViewingReport(row);
        setOpenMenuId(null);
        setMenuPosition(null);
    };

    const handleDownload = (row: ReportRow) => {
        setViewingReport(row);
        setOpenMenuId(null);
        setMenuPosition(null);
        setDownloadRequestId((id) => id + 1);
    };

    const handleDelete = (row: ReportRow) => {
        setDeletingReport(row);
        setOpenMenuId(null);
        setMenuPosition(null);
    };

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */

    const confirmDelete = async () => {
        if (!deletingReport) return;

        try {
            const response = await fetch(
                `/admin/reports/${deletingReport.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": getCsrfToken(),
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                },
            );

            const body = await response.json().catch(() => null);
            if (!response.ok)
                throw new Error(body?.message ?? `Status ${response.status}`);

            setRows((current) =>
                current.filter((row) => row.id !== deletingReport.id),
            );

            if (viewingReport?.id === deletingReport.id) setViewingReport(null);

            pushToast({
                type: "success",
                title: "Report deleted",
                message: "Report removed successfully.",
            });

            await fetchReports();
        } catch (error) {
            pushToast({
                type: "error",
                title: "Failed to delete",
                message:
                    error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setDeletingReport(null);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <AdminLayout>
            <Head title="Admin — Reports" />

            <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#050505] text-white">
                <div className="mx-auto w-full max-w-[1600px] px-2 pb-10 sm:px-3 lg:px-5">
                    {/* HEADER */}
                    <div className="mb-6 flex min-w-0 flex-col gap-4 border-b border-white/5 pb-6 pt-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                                Administration
                            </p>

                            <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
                                Admin — Reports
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                                Generate your own admin reports and manage them here.
                                Reports are private to your admin account.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/15 bg-yellow-400/[0.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-yellow-400">
                                <Sparkles size={12} />
                                Admin Only
                            </span>

                            <button
                                type="button"
                                onClick={() => void fetchReports()}
                                disabled={loading}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-yellow-400/30 hover:bg-white/[0.07] hover:text-yellow-400 disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={15}
                                    className={loading ? "animate-spin" : ""}
                                />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* ✅ GENERATE REPORT FORM */}
                    <form
                        onSubmit={handleGenerate}
                        className="mb-6 rounded-3xl border border-yellow-400/10 bg-yellow-400/[0.02] p-4 shadow-xl sm:p-5"
                    >
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black">
                                <FileBarChart size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white">
                                    Generate Admin Report
                                </h2>
                                <p className="text-[10px] text-zinc-600">
                                    Create a private report based on selected filters. Only you can see this.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-4">
                            <FilterField
                                label="Report Type"
                                value={generateReportType}
                                onChange={(value) =>
                                    setGenerateReportType(value as ReportType)
                                }
                                options={[
                                    ["All", "All Reports"],
                                    ["Operations", "Operations"],
                                    ["Compliance", "Compliance"],
                                    ["Documents", "Documents"],
                                    ["Job Orders", "Job Orders"],
                                    ["Financial", "Financial"],
                                    ["Billing", "Billing"],
                                    ["Accounts Receivable", "Accounts Receivable"],
                                ]}
                            />

                            <FilterField
                                label="Date Range"
                                value={generateDateRange}
                                onChange={(value) =>
                                    setGenerateDateRange(value as DateRangeOption)
                                }
                                options={[
                                    ["Last 6 Months", "Last 6 Months"],
                                    ["This Month", "This Month"],
                                    ["This Quarter", "This Quarter"],
                                    ["This Year", "This Year"],
                                    ["Last 30 Days", "Last 30 Days"],
                                ]}
                                icon={<CalendarDays size={14} />}
                            />

                            <FilterField
                                label="Client"
                                value={generateClient}
                                onChange={setGenerateClient}
                                options={[
                                    ["All Clients", "All Clients"],
                                    ...clients.map(
                                        (item) =>
                                            [item, item] as [string, string],
                                    ),
                                ]}
                                icon={<User size={14} />}
                            />

                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={generating}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {generating ? (
                                        <RefreshCw
                                            size={14}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <FileBarChart size={14} />
                                    )}
                                    {generating ? "Generating..." : "Generate Report"}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* STATS — 2 Full-Width Cards */}
                    <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatCard
                            label="Total Reports"
                            value={summary.total_reports}
                            delta={summary.reports_delta}
                            icon={<FileBarChart size={18} />}
                            tone="yellow"
                        />
                        <StatCard
                            label="Active Users"
                            value={summary.total_users}
                            delta={summary.users_delta}
                            icon={<Users size={18} />}
                            tone="blue"
                        />
                    </div>

                    {/* RECORDS */}
                    <div className="min-w-0">
                        <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-black text-white">
                                    My Admin Reports
                                </h2>

                                <p className="mt-1 text-xs text-zinc-600">
                                    These reports belong to your admin account only.
                                </p>
                            </div>

                            <span className="text-xs font-bold text-zinc-600">
                                {rows.length} record
                                {rows.length === 1 ? "" : "s"}
                            </span>
                        </div>

                        {loading ? (
                            <div className="rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-20 text-center">
                                <RefreshCw
                                    size={32}
                                    className="mx-auto mb-4 animate-spin text-yellow-400"
                                />

                                <p className="text-sm font-bold text-zinc-400">
                                    Loading reports...
                                </p>
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-20 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-600">
                                    <FileText size={25} />
                                </div>

                                <h3 className="mt-4 text-lg font-black text-zinc-300">
                                    No reports found
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                                    Generate your first admin report above.
                                </p>
                            </div>
                        ) : (
                            <div className="min-w-0 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.025]">
                                <table className="w-full min-w-[1000px] text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            {[
                                                "Report Name",
                                                "Generated By",
                                                "Client",
                                                "Type",
                                                "Date Range",
                                                "Generated On",
                                                "Actions",
                                            ].map((label) => (
                                                <th
                                                    key={label}
                                                    className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500"
                                                >
                                                    {label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rows.map((row) => {
                                            const parsed = parseReportContent(
                                                row.content,
                                            );
                                            const rowClient = extractClient(
                                                row,
                                                parsed,
                                            );

                                            return (
                                                <tr
                                                    key={row.id}
                                                    className="border-b border-white/5 transition hover:bg-white/[0.02]"
                                                >
                                                    <td className="px-5 py-4 text-xs font-bold text-zinc-200">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            {row.ai_generated && (
                                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-yellow-400/15 bg-yellow-400/[0.07] text-yellow-400">
                                                                    <Sparkles
                                                                        size={11}
                                                                    />
                                                                </span>
                                                            )}

                                                            <div className="min-w-0">
                                                                <p className="truncate font-bold">
                                                                    {row.name}
                                                                </p>

                                                                {rowClient && (
                                                                    <p className="mt-0.5 truncate text-[10px] font-medium text-zinc-600">
                                                                        {rowClient}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-yellow-400/10 bg-yellow-400/[0.05] text-yellow-400">
                                                                <Shield size={12} />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p className="truncate font-bold text-zinc-300">
                                                                    {row.owner_name ??
                                                                        row.created_by ??
                                                                        "System"}
                                                                </p>

                                                                {row.owner_email && (
                                                                    <p className="mt-0.5 truncate text-[10px] text-zinc-600">
                                                                        {row.owner_email}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                                                            <Building2
                                                                size={13}
                                                                className="text-yellow-400"
                                                            />
                                                            {rowClient || "All Clients"}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-zinc-400">
                                                            {row.type || row.report_type || "All"}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 text-xs text-zinc-400">
                                                        {row.date_range}
                                                    </td>

                                                    <td className="px-5 py-4 text-xs text-zinc-400">
                                                        {formatDateDisplay(row.generated_on)}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleView(row)}
                                                                className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-zinc-500 transition hover:border-yellow-400/30 hover:bg-yellow-400/[0.07] hover:text-yellow-400"
                                                                title="View"
                                                            >
                                                                <Eye size={14} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDownload(row)}
                                                                className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-zinc-500 transition hover:border-yellow-400/30 hover:bg-yellow-400/[0.07] hover:text-yellow-400"
                                                                title="Download PDF"
                                                            >
                                                                <Download size={14} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={(event) =>
                                                                    openMenu(event, row.id)
                                                                }
                                                                className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                                                                title="More"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TOASTS */}
            <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-full max-w-[360px] flex-col gap-2 sm:right-6 sm:top-6">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => dismissToast(toast.id)}
                    />
                ))}
            </div>

            {/* ACTION MENU */}
            {openMenuId !== null &&
                menuPosition &&
                (() => {
                    const row = rows.find((item) => item.id === openMenuId);
                    if (!row) return null;

                    return (
                        <div
                            ref={menuRef}
                            style={{
                                position: "fixed",
                                top: menuPosition.top,
                                left: menuPosition.left,
                                zIndex: 100,
                            }}
                            className="w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black"
                        >
                            <button
                                type="button"
                                onClick={() => handleView(row)}
                                className="flex w-full items-center gap-2 border-b border-white/5 px-4 py-3 text-left text-xs font-bold text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                            >
                                <Eye size={14} className="text-yellow-400" />
                                View Report
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDownload(row)}
                                className="flex w-full items-center gap-2 border-b border-white/5 px-4 py-3 text-left text-xs font-bold text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                            >
                                <Download size={14} className="text-yellow-400" />
                                Download PDF
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-red-400 transition hover:bg-red-400/[0.07]"
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    );
                })()}

            {/* PROFESSIONAL VIEW */}
            {viewingReport && (
                <ProfessionalReportModal
                    report={viewingReport}
                    onClose={() => setViewingReport(null)}
                    downloadRequestId={downloadRequestId}
                    onDownloadSuccess={() => {
                        pushToast({
                            type: "success",
                            title: "PDF downloaded",
                            message: "Admin report saved as PDF.",
                        });
                    }}
                    onDownloadError={(message) => {
                        pushToast({
                            type: "error",
                            title: "Failed to download",
                            message,
                        });
                    }}
                />
            )}

            {/* DELETE CONFIRMATION */}
            {deletingReport && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6">
                    <div className="my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black">
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-400">
                                    <Trash2 size={18} />
                                </div>

                                <div className="min-w-0">
                                    <h2 className="break-words text-lg font-black text-white">
                                        Delete Report
                                    </h2>

                                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setDeletingReport(null)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.04] p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle
                                        size={20}
                                        className="mt-0.5 shrink-0 text-red-400"
                                    />

                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-red-300">
                                            Permanent deletion
                                        </p>

                                        <p className="mt-1 break-words text-xs leading-5 text-red-300/60">
                                            This will permanently remove the report
                                            owned by{" "}
                                            <strong className="text-red-300">
                                                {deletingReport.owner_name ??
                                                    deletingReport.created_by}
                                            </strong>
                                            .
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-red-300/50">
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                                <p className="text-xs font-bold text-zinc-300">
                                    {deletingReport.name}
                                </p>

                                <p className="mt-1 text-[10px] text-zinc-600">
                                    {deletingReport.type} •{" "}
                                    {deletingReport.date_range}
                                </p>
                            </div>

                            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setDeletingReport(null)}
                                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.08]"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void confirmDelete()}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400"
                                >
                                    <Trash2 size={16} />
                                    Delete Permanently
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
    label,
    value,
    delta,
    icon,
    tone,
}: {
    label: string;
    value: number;
    delta: number;
    icon: ReactNode;
    tone: "yellow" | "blue" | "purple" | "green";
}) {
    const toneClasses: Record<string, { icon: string; text: string }> = {
        yellow: {
            icon: "border-yellow-400/15 bg-yellow-400/[0.07] text-yellow-400",
            text: "text-yellow-400",
        },
        blue: {
            icon: "border-blue-400/15 bg-blue-400/[0.07] text-blue-400",
            text: "text-blue-400",
        },
        purple: {
            icon: "border-purple-400/15 bg-purple-400/[0.07] text-purple-400",
            text: "text-purple-400",
        },
        green: {
            icon: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-400",
            text: "text-emerald-400",
        },
    };

    const c = toneClasses[tone];

    return (
        <div className="group min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045]">
            <div className="flex items-center justify-between gap-2">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${c.icon}`}
                >
                    {icon}
                </div>

                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-2xl font-black text-white">
                        {formatNumber(value)}
                    </span>

                    {delta !== 0 && (
                        <span
                            className={`text-[10px] font-black ${
                                delta > 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                        >
                            {delta > 0 ? "+" : ""}
                            {formatNumber(delta)}
                        </span>
                    )}
                </div>
            </div>

            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-zinc-600">
                {label}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| FILTER FIELD
|--------------------------------------------------------------------------
*/

function FilterField({
    label,
    value,
    onChange,
    options,
    icon,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: [string, string][];
    icon?: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                {label}
            </label>

            <div className="relative">
                {icon && (
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400">
                        {icon}
                    </span>
                )}

                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={`w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] py-3 pr-10 text-sm font-bold text-white outline-none transition focus:border-yellow-400/60 ${
                        icon ? "pl-11" : "pl-4"
                    }`}
                >
                    {options.map(([optionValue, optionLabel]) => (
                        <option
                            key={optionValue}
                            value={optionValue}
                            className="bg-zinc-900"
                        >
                            {optionLabel}
                        </option>
                    ))}
                </select>

                <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600"
                />
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| TOAST ITEM
|--------------------------------------------------------------------------
*/

function ToastItem({
    toast,
    onDismiss,
}: {
    toast: Toast;
    onDismiss: () => void;
}) {
    const icon =
        toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400" />
        ) : toast.type === "warning" ? (
            <AlertTriangle size={18} className="text-amber-400" />
        ) : toast.type === "error" ? (
            <AlertTriangle size={18} className="text-red-400" />
        ) : (
            <Sparkles size={18} className="text-blue-400" />
        );

    return (
        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] px-5 py-4 shadow-2xl shadow-black">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{icon}</div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white">
                        {toast.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {toast.message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-white"
                >
                    <X size={15} />
                </button>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PROFESSIONAL REPORT MODAL
|--------------------------------------------------------------------------
*/

function ProfessionalReportModal({
    report,
    onClose,
    downloadRequestId = 0,
    onDownloadSuccess,
    onDownloadError,
}: {
    report: ReportRow;
    onClose: () => void;
    downloadRequestId?: number;
    onDownloadSuccess?: () => void;
    onDownloadError?: (message: string) => void;
}) {
    const paperRef = useRef<HTMLDivElement | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [hasTriggeredInitialDownload, setHasTriggeredInitialDownload] =
        useState(false);

    const parsed = useMemo(
        () => parseReportContent(report.content),
        [report.content],
    );

    const clientName = extractClient(report, parsed);
    const reportTitle = getProfessionalReportTitle(report, parsed);

    const downloadPdf = useCallback(async () => {
        if (downloading) return;
        if (!paperRef.current) {
            onDownloadError?.("Report preview is not ready yet.");
            return;
        }

        setDownloading(true);
        let sandbox: HTMLDivElement | null = null;

        try {
            const original = paperRef.current;
            original.style.backgroundColor = "#ffffff";
            original.style.color = "#0f172a";

            const clone = original.cloneNode(true) as HTMLElement;

            sandbox = document.createElement("div");
            sandbox.style.position = "fixed";
            sandbox.style.left = "-99999px";
            sandbox.style.top = "0";
            sandbox.style.width = `${original.offsetWidth}px`;
            sandbox.style.background = "#ffffff";
            sandbox.style.color = "#0f172a";
            sandbox.style.zIndex = "-1";

            sandbox.appendChild(clone);
            document.body.appendChild(sandbox);

            sanitizeOklchColors(sandbox);

            clone.style.backgroundColor = "#ffffff";
            clone.style.color = "#0f172a";

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                windowWidth: clone.scrollWidth,
                windowHeight: clone.scrollHeight,
                onclone: (clonedDoc) => {
                    const clonedPaper =
                        clonedDoc.querySelector<HTMLElement>("[data-pdf-paper]");
                    if (clonedPaper) {
                        sanitizeOklchColors(clonedPaper);
                        clonedPaper.style.backgroundColor = "#ffffff";
                        clonedPaper.style.color = "#0f172a";
                    }
                },
            });

            if (sandbox && sandbox.parentNode) {
                document.body.removeChild(sandbox);
                sandbox = null;
            }

            const imageData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const margin = 8;
            const usableWidth = pageWidth - margin * 2;
            const usableHeight = pageHeight - margin * 2;

            const imageHeight = (canvas.height * usableWidth) / canvas.width;

            let heightLeft = imageHeight;
            let position = margin;

            pdf.addImage(
                imageData,
                "PNG",
                margin,
                position,
                usableWidth,
                imageHeight,
                undefined,
                "FAST",
            );

            heightLeft -= usableHeight;

            while (heightLeft > 0) {
                position = margin - (imageHeight - heightLeft);
                pdf.addPage();
                pdf.addImage(
                    imageData,
                    "PNG",
                    margin,
                    position,
                    usableWidth,
                    imageHeight,
                    undefined,
                    "FAST",
                );
                heightLeft -= usableHeight;
            }

            const safeFilename = `${reportTitle}-${report.type}-${report.date_range}`
                .replace(/[<>:"/\\|?*]+/g, "")
                .replace(/\s+/g, "-")
                .slice(0, 120);

            pdf.save(`${safeFilename || "ALIBATON-Report"}.pdf`);
            onDownloadSuccess?.();
        } catch (error) {
            console.error("PDF generation failed:", error);
            if (sandbox && sandbox.parentNode)
                document.body.removeChild(sandbox);
            onDownloadError?.(
                error instanceof Error
                    ? error.message
                    : "Unable to generate PDF.",
            );
        } finally {
            setDownloading(false);
        }
    }, [
        downloading,
        reportTitle,
        report.type,
        report.date_range,
        onDownloadSuccess,
        onDownloadError,
    ]);

    useEffect(() => {
        if (downloadRequestId === 0) return;
        if (hasTriggeredInitialDownload) return;

        let cancelled = false;
        const run = () => {
            if (cancelled) return;
            if (!paperRef.current) {
                requestAnimationFrame(run);
                return;
            }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (cancelled) return;
                    setHasTriggeredInitialDownload(true);
                    void downloadPdf();
                });
            });
        };

        requestAnimationFrame(run);
        return () => {
            cancelled = true;
        };
    }, [downloadRequestId, hasTriggeredInitialDownload, downloadPdf]);

    useEffect(() => {
        const handler = () => {
            void downloadPdf();
        };
        window.addEventListener("alibaton-download-report", handler);
        return () => {
            window.removeEventListener("alibaton-download-report", handler);
        };
    }, [downloadPdf]);

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6">
            <div className="my-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black">
                            <FileBarChart size={18} />
                        </div>

                        <div className="min-w-0">
                            <h2 className="break-words text-lg font-black text-white">
                                Report Preview
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-zinc-600">
                                ALIBATON Report
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void downloadPdf()}
                            disabled={downloading}
                            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
                        >
                            {downloading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Download size={14} />
                            )}
                            {downloading ? "Generating..." : "PDF"}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                <div className="max-h-[calc(100vh-140px)] overflow-auto bg-black/40 p-3 sm:p-5">
                    <div
                        ref={paperRef}
                        data-pdf-paper
                        className="mx-auto w-full max-w-[900px] bg-white text-slate-900 shadow-xl"
                    >
                        <div className="h-1.5 bg-yellow-400" />

                        <div className="p-7 sm:p-10">
                            <div className="mb-6 flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                        ALIBATON
                                    </p>

                                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                        {reportTitle}
                                    </h1>

                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {report.type} Report
                                    </p>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        Report Date
                                    </p>

                                    <p className="mt-1 text-xs font-bold text-slate-800">
                                        {formatDateLong(report.generated_on)}
                                    </p>

                                    <p className="mt-1 text-[10px] text-slate-500">
                                        {report.date_range}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6 border border-slate-200 bg-slate-50">
                                <PaperEntityMeta
                                    icon={<Building2 size={13} />}
                                    label="Client"
                                    value={clientName ?? "All Clients"}
                                />
                            </div>

                            <ReportDocumentBody
                                report={report}
                                parsed={parsed}
                                clientName={clientName}
                            />

                            <div className="mt-10 border-t border-slate-200 pt-5">
                                <div className="flex flex-col justify-between gap-2 text-[9px] text-slate-400 sm:flex-row">
                                    <span>
                                        ALIBATON — Heavy Equipment & Logistics
                                    </span>

                                    <span>
                                        45 Riverside, Quezon City, Philippines
                                    </span>
                                </div>

                                <div className="mt-1 text-[9px] text-slate-400">
                                    info@alibaton.com
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| SHARED PDF COMPONENTS
|--------------------------------------------------------------------------
*/

function PaperEntityMeta({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="text-yellow-600">{icon}</div>

            <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                    {label}
                </p>

                <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {value}
                </p>
            </div>
        </div>
    );
}

function ReportDocumentBody({
    report,
    parsed,
    clientName,
}: {
    report: ReportRow;
    parsed: Record<string, unknown> | null;
    clientName: string | null;
}) {
    if (!parsed) {
        return (
            <div>
                <DocumentIntro report={report} clientName={clientName} />

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                    This report does not contain structured report data.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            <DocumentIntro report={report} clientName={clientName} />
            <ReportSummaryCards parsed={parsed} />
            <ReportModuleBreakdowns parsed={parsed} />
            <ReportFinancialDetails parsed={parsed} />
            <ReportRecordsTables parsed={parsed} />
            <ReportTrends parsed={parsed} />
            <ReportProjections parsed={parsed} />
            <ReportExpirations parsed={parsed} />
        </div>
    );
}

function DocumentIntro({
    report,
    clientName,
}: {
    report: ReportRow;
    clientName: string | null;
}) {
    return (
        <section>
            <DocumentSectionTitle>Executive Overview</DocumentSectionTitle>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-black text-slate-900">
                    {clientName ?? "Executive Report"}
                </h2>

                <p className="mt-2 text-xs leading-6 text-slate-600">
                    This report provides a database-backed overview of ALIBATON
                    records for the selected client/account and reporting
                    period, using the latest available records from the system.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <PaperMeta label="Report Type" value={report.type} />

                    <PaperMeta
                        label="Reporting Period"
                        value={report.date_range}
                    />

                    <PaperMeta
                        label="Generated"
                        value={formatDateLong(report.generated_on)}
                    />
                </div>
            </div>
        </section>
    );
}

function ReportSummaryCards({ parsed }: { parsed: Record<string, unknown> }) {
    const summary = isObject(parsed.summary) ? parsed.summary : {};
    const financial = isObject(parsed.financial) ? parsed.financial : {};
    const recordCounts = isObject(parsed.record_counts)
        ? parsed.record_counts
        : {};
    const summaryCounts = isObject(summary.counts) ? summary.counts : {};
    const cards: { label: string; value: string }[] = [];

    const total =
        getObjectNumber(recordCounts, ["total"]) ??
        getObjectNumber(summaryCounts, ["total_records"]) ??
        0;

    if (total > 0)
        cards.push({ label: "Total Records", value: formatNumber(total) });

    const countPairs: [string, string[]][] = [
        ["Invoices", ["invoices"]],
        ["Payments", ["payments"]],
        ["Job Orders", ["job_orders"]],
        ["Contracts", ["contracts"]],
        ["Compliance", ["compliance", "compliances"]],
        ["Documents", ["documents"]],
    ];

    for (const [label, keys] of countPairs) {
        const value =
            getObjectNumber(recordCounts, keys) ??
            getObjectNumber(summaryCounts, keys) ??
            0;

        if (value > 0) cards.push({ label, value: formatNumber(value) });
    }

    const moneyPairs: [string, string[]][] = [
        ["Invoice Total", ["invoice_total"]],
        ["Payment Total", ["payment_total"]],
        ["Job Order Total", ["job_order_total"]],
        ["Outstanding", ["outstanding"]],
    ];

    for (const [label, keys] of moneyPairs) {
        const value = getObjectNumber(financial, keys);

        if (value !== null && value > 0)
            cards.push({ label, value: formatCurrency(value) });
    }

    if (!cards.length) return null;

    return (
        <section>
            <DocumentSectionTitle>Executive Summary</DocumentSectionTitle>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <PaperSummaryCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                    />
                ))}
            </div>
        </section>
    );
}

function ReportModuleBreakdowns({
    parsed,
}: {
    parsed: Record<string, unknown>;
}) {
    const operational = isObject(parsed.operational) ? parsed.operational : {};
    const summary = isObject(parsed.summary) ? parsed.summary : {};
    const blocks: ReactNode[] = [];

    const moduleMap: { key: string; label: string }[] = [
        { key: "contracts", label: "Contracts" },
        { key: "compliance", label: "Compliance" },
        { key: "documents", label: "Documents" },
        { key: "job_orders", label: "Job Orders" },
    ];

    for (const { key, label } of moduleMap) {
        const fromOperational = operational[key];
        const fromSummary = summary[key];
        const block = isObject(fromOperational)
            ? fromOperational
            : isObject(fromSummary)
              ? fromSummary
              : null;

        if (!block) continue;

        const total = getObjectNumber(block, ["total"]) ?? 0;
        const statuses = isObject(block.statuses) ? block.statuses : null;
        const types = isObject(block.types) ? block.types : null;
        const locked = getObjectNumber(block, ["locked"]);

        const hasContent =
            total > 0 ||
            (statuses && Object.keys(statuses).length > 0) ||
            (types && Object.keys(types).length > 0) ||
            (locked !== null && locked > 0);

        if (!hasContent) continue;

        blocks.push(
            <ModuleBlockCard
                key={key}
                label={label}
                total={total}
                statuses={statuses}
                types={types}
                locked={locked}
            />,
        );
    }

    if (!blocks.length) return null;

    return (
        <section>
            <DocumentSectionTitle>Module Breakdown</DocumentSectionTitle>

            <div className="space-y-4">{blocks}</div>
        </section>
    );
}

function ModuleBlockCard({
    label,
    total,
    statuses,
    types,
    locked,
}: {
    label: string;
    total: number;
    statuses: Record<string, unknown> | null;
    types: Record<string, unknown> | null;
    locked: number | null;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h4 className="text-xs font-black text-slate-800">{label}</h4>

                <div className="flex items-center gap-2">
                    {locked !== null && locked > 0 && (
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-700">
                            Locked: {formatNumber(locked)}
                        </span>
                    )}

                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-700">
                        Total: {formatNumber(total)}
                    </span>
                </div>
            </div>

            <div className="grid gap-0 sm:grid-cols-2">
                {statuses && Object.keys(statuses).length > 0 && (
                    <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Status
                        </p>

                        <ul className="space-y-1.5">
                            {Object.entries(statuses).map(([status, count]) => (
                                <li
                                    key={status}
                                    className="flex items-center justify-between text-xs"
                                >
                                    <span className="font-semibold text-slate-600">
                                        {humanizeKey(status)}
                                    </span>

                                    <span className="font-black text-slate-900">
                                        {formatNumber(count)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {types && Object.keys(types).length > 0 && (
                    <div className="p-4">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Type
                        </p>

                        <ul className="space-y-1.5">
                            {Object.entries(types).map(([type, count]) => (
                                <li
                                    key={type}
                                    className="flex items-center justify-between text-xs"
                                >
                                    <span className="font-semibold text-slate-600">
                                        {humanizeKey(type)}
                                    </span>

                                    <span className="font-black text-slate-900">
                                        {formatNumber(count)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function ReportFinancialDetails({
    parsed,
}: {
    parsed: Record<string, unknown>;
}) {
    const financial = isObject(parsed.financial) ? parsed.financial : {};
    const summary = isObject(parsed.summary) ? parsed.summary : {};
    const rows: [string, string][] = [];

    const moneyRows: [string, string[]][] = [
        ["Invoice Total", ["invoice_total"]],
        ["Payment Total", ["payment_total"]],
        ["Job Order Total", ["job_order_total"]],
        ["Outstanding", ["outstanding"]],
    ];

    for (const [label, keys] of moneyRows) {
        const value = getObjectNumber(financial, keys);

        if (value !== null && value > 0)
            rows.push([label, formatCurrency(value)]);
    }

    const collectionRate = getObjectNumber(financial, ["collection_rate"]);

    if (collectionRate !== null && collectionRate > 0)
        rows.push(["Collection Rate", `${formatNumber(collectionRate)}%`]);

    const invoiceStatuses = isObject(summary.invoice_statuses)
        ? summary.invoice_statuses
        : null;

    const paymentStatuses = isObject(summary.payment_statuses)
        ? summary.payment_statuses
        : null;

    const paymentMethods = isObject(summary.payment_methods)
        ? summary.payment_methods
        : null;

    const hasBreakdowns =
        (invoiceStatuses && Object.keys(invoiceStatuses).length > 0) ||
        (paymentStatuses && Object.keys(paymentStatuses).length > 0) ||
        (paymentMethods && Object.keys(paymentMethods).length > 0);

    if (!rows.length && !hasBreakdowns) return null;

    return (
        <section>
            <DocumentSectionTitle>Financial Details</DocumentSectionTitle>

            {rows.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left">
                        <tbody>
                            {rows.map(([label, value]) => (
                                <tr
                                    key={label}
                                    className="border-b border-slate-100 last:border-0"
                                >
                                    <td className="w-1/2 bg-slate-50 px-4 py-3 text-[10px] font-black text-slate-500">
                                        {label}
                                    </td>

                                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                        {value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {hasBreakdowns && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {invoiceStatuses &&
                        Object.keys(invoiceStatuses).length > 0 && (
                            <BreakdownTable
                                title="Invoice Status"
                                data={invoiceStatuses}
                            />
                        )}

                    {paymentStatuses &&
                        Object.keys(paymentStatuses).length > 0 && (
                            <BreakdownTable
                                title="Payment Status"
                                data={paymentStatuses}
                            />
                        )}

                    {paymentMethods &&
                        Object.keys(paymentMethods).length > 0 && (
                            <BreakdownTable
                                title="Payment Method"
                                data={paymentMethods}
                            />
                        )}
                </div>
            )}
        </section>
    );
}

function ReportRecordsTables({
    parsed,
}: {
    parsed: Record<string, unknown>;
}) {
    const records = isObject(parsed.records) ? parsed.records : {};

    const labels: Record<string, string> = {
        invoices: "Invoices",
        payments: "Payments",
        job_orders: "Job Orders",
        contracts: "Contracts",
        compliance: "Compliance",
        documents: "Documents",
    };

    const rendered: ReactNode[] = [];

    for (const [key, label] of Object.entries(labels)) {
        const rows = records[key];

        if (!Array.isArray(rows) || rows.length === 0) continue;

        rendered.push(
            <div key={key}>
                <h4 className="mb-2 flex items-center justify-between text-xs font-black text-slate-800">
                    <span>{label}</span>

                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-black text-slate-500">
                        {rows.length}
                    </span>
                </h4>

                <ProfessionalArrayTable rows={rows} />
            </div>,
        );
    }

    if (!rendered.length) return null;

    return (
        <section>
            <DocumentSectionTitle>Records</DocumentSectionTitle>

            <div className="space-y-5">{rendered}</div>
        </section>
    );
}

function ReportTrends({ parsed }: { parsed: Record<string, unknown> }) {
    const trends = isObject(parsed.trends) ? parsed.trends : {};
    const months = Array.isArray(trends.months) ? trends.months : [];

    if (!months.length) return null;

    const meaningful = months.filter((month) => {
        if (!isObject(month)) return false;

        return (
            numberValue(month.invoices) > 0 ||
            numberValue(month.payments) > 0 ||
            numberValue(month.job_orders) > 0 ||
            numberValue(month.contracts) > 0 ||
            numberValue(month.compliances) > 0 ||
            numberValue(month.documents) > 0 ||
            numberValue(month.invoice_amount) > 0 ||
            numberValue(month.payment_amount) > 0 ||
            numberValue(month.job_order_amount) > 0
        );
    });

    if (!meaningful.length) return null;

    const direction = String(trends.direction ?? "stable");

    return (
        <section>
            <DocumentSectionTitle>Monthly Trends</DocumentSectionTitle>

            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Direction:</span>

                <span
                    className={
                        direction === "up"
                            ? "text-emerald-600"
                            : direction === "down"
                              ? "text-red-600"
                              : "text-slate-700"
                    }
                >
                    {direction}
                </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[640px] text-left">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            {[
                                "Month",
                                "Records",
                                "Invoices",
                                "Payments",
                                "Job Orders",
                            ].map((label) => (
                                <th
                                    key={label}
                                    className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-slate-400 first:text-left"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {meaningful.map((month, index) => {
                            if (!isObject(month)) return null;

                            const totalRecords =
                                numberValue(month.invoices) +
                                numberValue(month.payments) +
                                numberValue(month.job_orders) +
                                numberValue(month.contracts) +
                                numberValue(month.compliances) +
                                numberValue(month.documents);

                            return (
                                <tr
                                    key={index}
                                    className="border-b border-slate-100 last:border-0"
                                >
                                    <td className="px-3 py-2.5 text-xs font-bold text-slate-800">
                                        {String(
                                            month.label ?? month.month ?? "—",
                                        )}
                                    </td>

                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {formatNumber(totalRecords)}
                                    </td>

                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {formatCurrency(
                                            month.invoice_amount ?? 0,
                                        )}
                                    </td>

                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {formatCurrency(
                                            month.payment_amount ?? 0,
                                        )}
                                    </td>

                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {formatCurrency(
                                            month.job_order_amount ?? 0,
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function ReportProjections({ parsed }: { parsed: Record<string, unknown> }) {
    const projections = isObject(parsed.projections) ? parsed.projections : {};

    if (projections.available !== true) return null;

    const nextMonth = isObject(projections.next_month)
        ? projections.next_month
        : null;

    const next3 = Array.isArray(projections.next_3_months)
        ? projections.next_3_months
        : [];

    const rows = nextMonth ? [nextMonth, ...next3.slice(1)] : next3;

    if (!rows.length) return null;

    return (
        <section>
            <DocumentSectionTitle>Projections</DocumentSectionTitle>

            {typeof projections.note === "string" && (
                <p className="mb-3 text-[10px] italic text-slate-500">
                    {projections.note}
                </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-left">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            {[
                                "Month",
                                "Projected Invoices",
                                "Projected Payments",
                                "Projected Job Orders",
                            ].map((label) => (
                                <th
                                    key={label}
                                    className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-slate-400 first:text-left"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, index) => {
                            if (!isObject(row)) return null;

                            return (
                                <tr
                                    key={index}
                                    className="border-b border-slate-100 last:border-0"
                                >
                                    <td className="px-3 py-2.5 text-xs font-bold text-slate-800">
                                        {String(row.label ?? row.month ?? "—")}
                                    </td>

                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {formatCurrency(
                                            row.invoice_amount ?? 0,
                                        )}
                                    </td>

                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {formatCurrency(
                                            row.payment_amount ?? 0,
                                        )}
                                    </td>

                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        {formatCurrency(
                                            row.job_order_amount ?? 0,
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function ReportExpirations({ parsed }: { parsed: Record<string, unknown> }) {
    const expirations = isObject(parsed.expirations) ? parsed.expirations : {};

    const documents = Array.isArray(expirations.documents)
        ? expirations.documents
        : [];

    const compliance = Array.isArray(expirations.compliance)
        ? expirations.compliance
        : [];

    const contracts = Array.isArray(expirations.contracts)
        ? expirations.contracts
        : [];

    if (!documents.length && !compliance.length && !contracts.length)
        return null;

    const days = getObjectNumber(expirations, ["days"]) ?? 30;

    return (
        <section>
            <DocumentSectionTitle>
                Upcoming Expirations ({formatNumber(days)} days)
            </DocumentSectionTitle>

            <div className="space-y-5">
                {documents.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-black text-slate-800">
                            Documents
                        </h4>

                        <ProfessionalArrayTable rows={documents} />
                    </div>
                )}

                {compliance.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-black text-slate-800">
                            Compliance
                        </h4>

                        <ProfessionalArrayTable rows={compliance} />
                    </div>
                )}

                {contracts.length > 0 && (
                    <div>
                        <h4 className="mb-2 text-xs font-black text-slate-800">
                            Contracts
                        </h4>

                        <ProfessionalArrayTable rows={contracts} />
                    </div>
                )}
            </div>
        </section>
    );
}

function BreakdownTable({
    title,
    data,
}: {
    title: string;
    data: Record<string, unknown>;
}) {
    const entries = Object.entries(data).filter(
        ([, v]) => v !== null && v !== undefined,
    );

    if (!entries.length) return null;

    return (
        <div>
            <h4 className="mb-2 text-xs font-black text-slate-800">{title}</h4>

            <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                {title}
                            </th>

                            <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-slate-400">
                                Count
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {entries.map(([key, value]) => (
                            <tr
                                key={key}
                                className="border-b border-slate-100 last:border-0"
                            >
                                <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">
                                    {humanizeKey(key)}
                                </td>

                                <td className="px-4 py-2.5 text-right text-xs font-black text-slate-900">
                                    {isNumericValue(value)
                                        ? formatNumber(value)
                                        : String(value)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProfessionalArrayTable({ rows }: { rows: unknown[] }) {
    if (!rows.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                No records available.
            </div>
        );
    }

    const objects = rows.filter(isObject) as Record<string, unknown>[];

    if (!objects.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-2">
                    {rows.map((value, index) => (
                        <div
                            key={index}
                            className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-700"
                        >
                            <FormattedDocumentValue value={value} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const preferredOrder = [
        "id",
        "number",
        "title",
        "client",
        "reference_number",
        "contract_no",
        "type",
        "status",
        "priority",
        "amount",
        "payment_method",
        "due_date",
        "expiry_date",
        "start_date",
        "end_date",
        "payment_date",
        "created_at",
    ];

    const allKeys = new Set<string>();
    objects.forEach((obj) =>
        Object.keys(obj).forEach((key) => allKeys.add(key)),
    );

    const columns: string[] = [];
    for (const key of preferredOrder) {
        if (allKeys.has(key) && columns.length < 8) columns.push(key);
    }
    for (const key of allKeys) {
        if (!columns.includes(key) && columns.length < 8) columns.push(key);
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                        {columns.map((column) => (
                            <th
                                key={column}
                                className="px-3 py-2.5 text-[8px] font-black uppercase tracking-wider text-slate-400"
                            >
                                {humanizeKey(column)}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {objects.map((object, index) => (
                        <tr
                            key={index}
                            className="border-b border-slate-100 last:border-0"
                        >
                            {columns.map((column) => (
                                <td
                                    key={column}
                                    className="px-3 py-2.5 text-[10px] font-semibold text-slate-700"
                                >
                                    <FormattedDocumentValue
                                        value={object[column]}
                                        fieldKey={column}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function FormattedDocumentValue({
    value,
    fieldKey,
}: {
    value: unknown;
    fieldKey?: string;
}) {
    if (value === null || value === undefined || value === "") return <>—</>;

    if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;

    if (typeof value === "object") {
        return (
            <span className="whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
            </span>
        );
    }

    if (fieldKey && isCurrencyKey(fieldKey) && isNumericValue(value))
        return <>{formatCurrency(value)}</>;

    return <>{String(value)}</>;
}

function DocumentSectionTitle({ children }: { children: ReactNode }) {
    return (
        <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-yellow-400" />

            <h3 className="text-sm font-black text-slate-900">{children}</h3>
        </div>
    );
}

function PaperMeta({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-[10px] font-bold text-slate-700">{value}</p>
        </div>
    );
}

function PaperSummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-base font-black text-slate-900">{value}</p>
        </div>
    );
}