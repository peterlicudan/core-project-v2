import React, {
    FormEvent,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { Head } from "@inertiajs/react";
import UserLayout from "../../Layouts/UserLayout";


import {
    AlertTriangle,
    Bot,
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
    Send,
    Sparkles,
    Trash2,
    User,
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
    ai_generated?: boolean;
    content?: string;
    client_name?: string | null;
    client?: string | null;
    project_name?: string | null;
    project?: string | null;
};

type QuickSummary = {
    total_reports: number;
    total_invoices: number;
    total_clients: number;
    reports_delta: number;
    invoices_delta: number;
    clients_delta: number;
};

type ChatMessage = {
    id: number;
    sender: "ai" | "user";
    message: string;
};

type Toast = {
    id: number;
    type: "success" | "warning" | "error" | "info";
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
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
    user?: { name?: string } | null;
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

    if (typeof value !== "string") {
        return 0;
    }

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
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function formatDateLong(value?: string | null): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

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

/*
|--------------------------------------------------------------------------
| ✅ Fresh CSRF — XSRF-TOKEN cookie (sine-set ng Laravel sa bawat response)
|--------------------------------------------------------------------------
*/

function getXsrfCookieToken(): string {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="));

    if (!cookie) return "";

    try {
        return decodeURIComponent(cookie.split("=").slice(1).join("="));
    } catch {
        return "";
    }
}

function humanizeKey(key: string): string {
    return key
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

/*
|--------------------------------------------------------------------------
| MONEY VS COUNT
|--------------------------------------------------------------------------
*/

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

    if (isCountField) {
        return false;
    }

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

    if (isNonCurrencyField) {
        return false;
    }

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
        k.includes("expenses") ||
        k.includes("cost") ||
        k.includes("tax") ||
        k.includes("vat") ||
        k.includes("subtotal") ||
        k.includes("net of vat") ||
        k.includes("withholding")
    );
}

/*
|--------------------------------------------------------------------------
| OBJECT HELPERS
|--------------------------------------------------------------------------
*/

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumericValue(value: unknown): boolean {
    if (typeof value === "number") {
        return Number.isFinite(value);
    }

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
        if (key in data) {
            return numberValue(data[key]);
        }
    }

    return null;
}

function getInsensitiveValue(
    data: Record<string, unknown>,
    keys: string[],
): unknown {
    const entries = Object.entries(data);

    for (const wanted of keys) {
        const normalizedWanted = wanted
            .toLowerCase()
            .replace(/[_-]+/g, " ")
            .trim();

        const found = entries.find(
            ([actualKey]) =>
                actualKey.toLowerCase().replace(/[_-]+/g, " ").trim() ===
                normalizedWanted,
        );

        if (found) {
            return found[1];
        }
    }

    return undefined;
}

/*
|--------------------------------------------------------------------------
| FIND CLIENT
|--------------------------------------------------------------------------
*/

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

        if (typeof direct === "string" && direct.trim()) {
            return direct.trim();
        }

        for (const value of Object.values(parsed)) {
            if (!isObject(value)) {
                continue;
            }

            const nested = getInsensitiveValue(value, keys);

            if (typeof nested === "string" && nested.trim()) {
                return nested.trim();
            }
        }
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| REPORT TITLE
|--------------------------------------------------------------------------
*/

function getProfessionalReportTitle(
    report: ReportRow,
    parsed: Record<string, unknown> | null,
): string {
    const client = extractClient(report, parsed);

    if (client) {
        return client;
    }

    if (report.name && report.name !== "Untitled Report") {
        return report.name;
    }

    return `${report.type} Report`;
}

/*
|--------------------------------------------------------------------------
| REPORT CONTENT PARSER
|--------------------------------------------------------------------------
*/

function parseReportContent(
    raw?: string | Record<string, unknown> | null,
): Record<string, unknown> | null {
    if (!raw) {
        return null;
    }

    if (isObject(raw)) {
        return raw;
    }

    if (typeof raw !== "string") {
        return null;
    }

    const trimmed = raw.trim();

    if (!trimmed) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed);

        if (isObject(parsed)) {
            return parsed;
        }

        if (Array.isArray(parsed)) {
            return { records: parsed };
        }
    } catch {
        return null;
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| REPORT SIGNATURE
|--------------------------------------------------------------------------
*/

function buildReportSignature(
    type: string,
    dateRange: string,
    client?: string | null,
): string {
    return [type, dateRange, client ?? ""]
        .map((s) =>
            String(s ?? "")
                .trim()
                .toLowerCase(),
        )
        .join("::");
}

/*
|--------------------------------------------------------------------------
| LOCAL AI RESPONSE — Smart Rule-Based Assistant
|--------------------------------------------------------------------------
|
| Ito yung AI brain ng chatbot mo. Sagot sa lahat ng posibleng tanong
| ng staff kahit wala yung backend AI service.
|
*/

function buildLocalAIResponse(
    question: string,
    context: {
        rows: ReportRow[];
        summary: QuickSummary;
        reportType: string;
        dateRange: string;
    },
): string {
    const q = question.toLowerCase().trim();
    const { rows, summary, reportType, dateRange } = context;

    /*
    |------------------------------------------------------------------
    | ALIBATON SUMMARY / OVERALL SUMMARY
    |------------------------------------------------------------------
    */
    if (
        q.includes("alibaton summary") ||
        q.includes("overall summary") ||
        q.includes("company summary") ||
        q === "summary" ||
        q === "alibaton"
    ) {
        const aiCount = rows.filter((row) => row.ai_generated).length;
        const manualCount = rows.length - aiCount;

        const typeBreakdown = rows.reduce<Record<string, number>>(
            (acc, row) => {
                acc[row.type] = (acc[row.type] ?? 0) + 1;
                return acc;
            },
            {},
        );

        return [
            "📊 ALIBATON Summary",
            "",
            `📁 Report Filter: ${reportType}`,
            `📅 Date Range: ${dateRange}`,
            "",
            "📋 Reports Overview:",
            `• Total reports: ${rows.length}`,
            `• AI-generated: ${aiCount}`,
            `• Manual: ${manualCount}`,
            "",
            "🗂 By Report Type:",
            ...(Object.entries(typeBreakdown).length > 0
                ? Object.entries(typeBreakdown).map(
                      ([key, value]) => `  • ${key}: ${value}`,
                  )
                : ["  • No reports in this filter"]),
            "",
            "💰 Quick Totals:",
            `• Total Reports: ${formatNumber(summary.total_reports)}`,
            `• Total Invoices: ${formatNumber(summary.total_invoices)}`,
            `• Total Clients: ${formatNumber(summary.total_clients)}`,
        ].join("\n");
    }

    /*
    |------------------------------------------------------------------
    | TOTAL RECORDS / COUNTS
    |------------------------------------------------------------------
    */
    if (
        q.includes("total records") ||
        q.includes("total count") ||
        q.includes("how many records") ||
        q.includes("show me my total")
    ) {
        return [
            "📊 Total Records Summary",
            "",
            `• Total Reports: ${formatNumber(summary.total_reports)}`,
            `• Total Invoices: ${formatNumber(summary.total_invoices)}`,
            `• Total Clients: ${formatNumber(summary.total_clients)}`,
            "",
            `📁 Current filter: ${reportType}`,
            `📅 Date range: ${dateRange}`,
        ].join("\n");
    }

    /*
    |------------------------------------------------------------------
    | SUMMARIZE REPORTS LIST
    |------------------------------------------------------------------
    */
    if (
        q.includes("summarize") ||
        q.includes("summary") ||
        q.includes("overview") ||
        q.includes("list of report") ||
        q.includes("my reports")
    ) {
        if (rows.length === 0) {
            return `No reports are currently available for the selected filter.\n\n💡 Try changing the Report Type or Date Range.`;
        }

        const typeBreakdown = rows.reduce<Record<string, number>>(
            (acc, row) => {
                acc[row.type] = (acc[row.type] ?? 0) + 1;
                return acc;
            },
            {},
        );

        const aiCount = rows.filter((row) => row.ai_generated).length;

        return [
            "📋 Your Reports Summary",
            "",
            `• Total reports: ${rows.length}`,
            `• AI-generated: ${aiCount}`,
            `• Manual: ${rows.length - aiCount}`,
            "",
            "🗂 By type:",
            ...Object.entries(typeBreakdown).map(
                ([key, value]) => `  • ${key}: ${value}`,
            ),
            "",
            "💡 Tip: Click any report in the table to view full details.",
        ].join("\n");
    }

    /*
    |------------------------------------------------------------------
    | GENERATE REPORT
    |------------------------------------------------------------------
    */
    if (
        q.includes("generate") ||
        q.includes("create report") ||
        q.includes("make a report") ||
        q.includes("new report")
    ) {
        return [
            "✨ How to Generate a Report:",
            "",
            "1️⃣ Select a Report Type (Operations, Compliance, etc.)",
            "2️⃣ Choose a Date Range",
            "3️⃣ Optionally select a specific Client",
            "4️⃣ Click the 'Generate Report' button",
            "",
            `📁 Current settings: ${reportType}`,
            `📅 Date range: ${dateRange}`,
            "",
            "The report will be saved and available in the reports list.",
        ].join("\n");
    }

    /*
    |------------------------------------------------------------------
    | AI-GENERATED REPORTS
    |------------------------------------------------------------------
    */
    if (
        q.includes("ai report") ||
        q.includes("ai-generated") ||
        q.includes("ai generated") ||
        q.includes("show ai")
    ) {
        const aiReports = rows.filter((row) => row.ai_generated);

        if (aiReports.length === 0) {
            return "There are currently no AI-generated reports in your records.";
        }

        return [
            `🤖 Your AI-Generated Reports (${aiReports.length})`,
            "",
            ...aiReports
                .slice(0, 5)
                .map(
                    (row, index) =>
                        `${index + 1}. ${row.name}\n   • Type: ${
                            row.type
                        }\n   • Generated: ${formatDateDisplay(
                            row.generated_on,
                        )}`,
                ),
        ].join("\n\n");
    }

    /*
    |------------------------------------------------------------------
    | FORECAST / PROJECTION
    |------------------------------------------------------------------
    */
    if (
        q.includes("forecast") ||
        q.includes("projection") ||
        q.includes("trend") ||
        q.includes("predict")
    ) {
        return [
            "📈 Forecasting & Predictions",
            "",
            "Forecasting is available in the Forecast Analytics section.",
            "It analyzes historical data (revenue, payments, invoices, contracts) to project future trends.",
            "",
            "⚠️ Future values are projections — not guaranteed results.",
            "📊 Forecast accuracy depends on historical data quality.",
            "",
            "💡 Tip: Go to 'Forecast Analytics' page for detailed charts and insights.",
        ].join("\n");
    }

    /*
    |------------------------------------------------------------------
    | CLIENT-SPECIFIC
    |------------------------------------------------------------------
    */
    if (q.includes("client") || q.includes("customer")) {
        const clientCount = summary.total_clients;
        const clientNames = Array.from(
            new Set(
                rows
                    .map((r) => r.client_name || r.client)
                    .filter((c): c is string => typeof c === "string"),
            ),
        );

        return [
            `👥 Clients (${clientCount} total)`,
            "",
            clientNames.length > 0
                ? `Active clients in current filter:\n${clientNames
                      .slice(0, 8)
                      .map((c) => `  • ${c}`)
                      .join("\n")}`
                : "No specific clients in the current filter.",
            "",
            "💡 Tip: Filter by specific client using the Client dropdown.",
        ].join("\n");
    }

    /*
    |------------------------------------------------------------------
    | HELP / WHAT CAN YOU DO
    |------------------------------------------------------------------
    */
    if (
        q.includes("help") ||
        q.includes("what can you") ||
        q.includes("how to use") ||
        q.includes("commands")
    ) {
        return [
            "🤖 I can help you with:",
            "",
            "📊 Reports:",
            '  • "Summarize my reports list"',
            '  • "Alibaton Summary"',
            '  • "Show me my AI-generated reports"',
            "",
            "💰 Records:",
            '  • "Show me my total records"',
            '  • "How many reports do I have?"',
            "",
            "📈 Analytics:",
            '  • "What is the forecast?"',
            '  • "Show me clients"',
            "",
            "✨ Actions:",
            '  • "How to generate a report?"',
        ].join("\n");
    }

    /*
    |------------------------------------------------------------------
    | DEFAULT / UNKNOWN — pero mas friendly
    |------------------------------------------------------------------
    */
    return [
        `🤖 I received your question: "${question}"`,
        "",
        "I'm not sure about that specific topic, but here's what I can do:",
        "",
        '  • "Alibaton Summary"',
        '  • "Summarize my reports list"',
        '  • "Show me my total records"',
        '  • "How to generate a report?"',
        '  • "Show me my AI-generated reports"',
        '  • "What is the forecast?"',
        "",
        "💡 Or just ask in your own words — I'll do my best to help!",
    ].join("\n");
}

/*
|--------------------------------------------------------------------------
| NORMALIZE BACKEND REPORT
|--------------------------------------------------------------------------
*/

function normalizeReportRow(
    item: RawReportPayload | null | undefined,
    index: number,
): ReportRow {
    const startDate = item?.start_date ?? null;
    const endDate = item?.end_date ?? null;

    const dateRange =
        item?.date_range ??
        (startDate && endDate ? `${startDate} – ${endDate}` : "—");

    const rawContent = item?.content;

    let content: string | undefined;

    if (typeof rawContent === "string") {
        content = rawContent;
    } else if (isObject(rawContent) || Array.isArray(rawContent)) {
        try {
            content = JSON.stringify(rawContent);
        } catch {
            content = undefined;
        }
    }

    let parsedContent: Record<string, unknown> | null = null;

    if (typeof rawContent === "string") {
        parsedContent = parseReportContent(rawContent);
    } else if (isObject(rawContent)) {
        parsedContent = rawContent;
    } else if (Array.isArray(rawContent)) {
        parsedContent = { records: rawContent };
    }

    const baseRow: ReportRow = {
        id: Number(item?.id ?? index),
        name: item?.name ?? "Untitled Report",
        type: item?.type ?? item?.report_type ?? "All",
        report_type: item?.report_type ?? item?.type ?? "All",
        date_range: dateRange,
        generated_on: item?.generated_on ?? item?.created_at ?? null,
        created_by: item?.created_by ?? item?.user?.name ?? "System",
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
| OKLCH → RGB CONVERTER (Property-Aware)
|--------------------------------------------------------------------------
*/

const OKLCH_CACHE = new Map<string, string>();

function oklchToRgb(oklchValue: string, property: string): string {
    const cacheKey = `${property}::${oklchValue}`;

    if (OKLCH_CACHE.has(cacheKey)) {
        return OKLCH_CACHE.get(cacheKey)!;
    }

    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.left = "-99999px";
    probe.style.top = "0";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";

    probe.style.setProperty(property, oklchValue);

    document.body.appendChild(probe);

    const computed = window.getComputedStyle(probe).getPropertyValue(property);

    document.body.removeChild(probe);

    let resolved: string;

    if (computed && !computed.includes("oklch")) {
        resolved = computed;
    } else {
        if (property.includes("background")) {
            resolved = "rgb(248, 250, 252)";
        } else if (property.includes("border")) {
            resolved = "rgb(226, 232, 240)";
        } else if (property.includes("shadow")) {
            resolved = "none";
        } else {
            resolved = "rgb(15, 23, 42)";
        }
    }

    OKLCH_CACHE.set(cacheKey, resolved);

    return resolved;
}

function replaceOklchTokens(value: string, property: string): string {
    if (!value || !value.includes("oklch")) {
        return value;
    }

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
                const converted = replaceOklchTokens(value, prop);
                node.style.setProperty(prop, converted, "important");
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
        const computed = window.getComputedStyle(node);
        const color = computed.getPropertyValue("color");

        if (!color || color.includes("oklch")) {
            node.style.setProperty("color", "#0f172a", "important");
        }
    });
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function Reports() {
    const [reportType, setReportType] = useState<ReportType>("All");
    const [dateRange, setDateRange] =
        useState<DateRangeOption>("Last 6 Months");
    const [client, setClient] = useState("All Clients");

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ReportRow[]>([]);

    const [summary, setSummary] = useState<QuickSummary>({
        total_reports: 0,
        total_invoices: 0,
        total_clients: 0,
        reports_delta: 0,
        invoices_delta: 0,
        clients_delta: 0,
    });

    const [clients, setClients] = useState<string[]>([]);

    const [viewingReport, setViewingReport] = useState<ReportRow | null>(null);
    const [deletingReport, setDeletingReport] = useState<ReportRow | null>(
        null,
    );

    const [downloadRequestId, setDownloadRequestId] = useState(0);

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{
        top: number;
        left: number;
    } | null>(null);

    const [toasts, setToasts] = useState<Toast[]>([]);

    const [aiOpen, setAiOpen] = useState(false);
    const [aiTyping, setAiTyping] = useState(false);
    const [aiInput, setAiInput] = useState("");

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 1,
            sender: "ai",
            message:
                "Hello! I'm ALIBATON AI — your Report Assistant.\n\nI can help you with:\n• Alibaton Summary\n• Summarize my reports list\n• Show me my total records\n• How to generate a report?\n• Show me my AI-generated reports\n\nWhat would you like to do?",
        },
    ]);

    const [hasNewReply, setHasNewReply] = useState(false);

    const chatEndRef = useRef<HTMLDivElement | null>(null);
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
            setToasts((current) =>
                current.filter((toastItem) => toastItem.id !== id),
            );
        }, ttl);
    }, []);

    const dismissToast = (id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    /*
    |--------------------------------------------------------------------------
    | CLOSE MENU
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (openMenuId === null) {
            return;
        }

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
    | AI PERSISTENCE
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        try {
            const savedMessages = localStorage.getItem(
                "alibaton_reports_ai_messages",
            );
            const savedInput = localStorage.getItem(
                "alibaton_reports_ai_input",
            );

            if (savedMessages) {
                const parsed = JSON.parse(savedMessages);

                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            }

            if (savedInput !== null) {
                setAiInput(savedInput);
            }
        } catch (exception) {
            console.error("Unable to restore Reports AI state.", exception);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(
            "alibaton_reports_ai_messages",
            JSON.stringify(messages),
        );
    }, [messages]);

    useEffect(() => {
        if (aiInput) {
            localStorage.setItem("alibaton_reports_ai_input", aiInput);
        } else {
            localStorage.removeItem("alibaton_reports_ai_input");
        }
    }, [aiInput]);

    useEffect(() => {
        if (aiOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setHasNewReply(false);
        }
    }, [messages, aiTyping, aiOpen]);

    /*
    |--------------------------------------------------------------------------
    | FILTER SIGNATURE
    |--------------------------------------------------------------------------
    */

    const currentSignature = useMemo(() => {
        const dates = getDateRangeValues(dateRange);

        return buildReportSignature(
            reportType,
            `${dates.start_date} – ${dates.end_date}`,
            client === "All Clients" ? null : client,
        );
    }, [reportType, dateRange, client]);

    const matchingRow = useMemo(() => {
        return rows.find((row) => {
            const parsed = parseReportContent(row.content);
            const rowClient = extractClient(row, parsed);

            const sig = buildReportSignature(
                row.type,
                row.date_range,
                rowClient,
            );

            return sig === currentSignature;
        });
    }, [rows, currentSignature]);

    const hasDuplicate = !!matchingRow;

    /*
    |--------------------------------------------------------------------------
    | FETCH REPORTS
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

            const response = await fetch(`/reports/list?${params.toString()}`, {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });

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

            const normalizedRows = list.map((item, index) =>
                normalizeReportRow(item, index),
            );

            setRows(normalizedRows);

            if (data?.summary) {
                setSummary({
                    total_reports: numberValue(data.summary.total_reports),
                    total_invoices: numberValue(data.summary.total_invoices),
                    total_clients: numberValue(data.summary.total_clients),
                    reports_delta: numberValue(data.summary.reports_delta),
                    invoices_delta: numberValue(data.summary.invoices_delta),
                    clients_delta: numberValue(data.summary.clients_delta),
                });
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);

            pushToast({
                type: "error",
                title: "Failed to load reports",
                message:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
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
    | CLIENT FILTER OPTIONS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        fetch("/reports/filter-options", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }

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
                ).sort((a: string, b: string) => a.localeCompare(b));

                setClients(uniqueSorted);
            })
            .catch((error) => {
                console.error("Client filter options failed:", error);
            });
    }, []);

    /*
    |--------------------------------------------------------------------------
    | GENERATE REPORT
    |--------------------------------------------------------------------------
    */

    const handleGenerate = async (event: FormEvent) => {
        event.preventDefault();

        if (loading) {
            return;
        }

        if (hasDuplicate) {
            pushToast({
                type: "warning",
                title: "Duplicate report exists",
                message: `"${matchingRow?.name}" with same type, client, and date range.`,
                action: matchingRow
                    ? {
                          label: "View existing",
                          onClick: () => handleView(matchingRow),
                      }
                    : undefined,
            });

            return;
        }

        setLoading(true);

        try {
            const dates = getDateRangeValues(dateRange);
            const selectedClient = client === "All Clients" ? null : client;

            const response = await fetch("/reports/save", {
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
                    type: reportType,
                    report_type: reportType,
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
                        `Request failed with status ${response.status}`,
                );
            }

            if (!body?.success) {
                throw new Error(
                    body?.message ?? "The report could not be created.",
                );
            }

            if (body?.report) {
                const generatedRow = normalizeReportRow(
                    body.report,
                    Number(body.report.id ?? Date.now()),
                );

                setRows((current) => {
                    const exists = current.some(
                        (row) => row.id === generatedRow.id,
                    );

                    if (exists) {
                        return current;
                    }

                    return [generatedRow, ...current];
                });

                setViewingReport(generatedRow);
            }

            pushToast({
                type: "success",
                title: "Report generated",
                message: `${
                    selectedClient ?? "All Clients"
                } report created successfully.`,
            });
        } catch (error) {
            console.error("Failed to generate report:", error);

            pushToast({
                type: "error",
                title: "Failed to generate report",
                message:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

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

        if (left < 8) {
            left = 8;
        }

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        let top =
            spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow
                ? rect.top - MENU_HEIGHT - GAP
                : rect.bottom + GAP;

        if (top + MENU_HEIGHT > window.innerHeight - 8) {
            top = window.innerHeight - MENU_HEIGHT - 8;
        }

        if (top < 8) {
            top = 8;
        }

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
    | DELETE CONFIRMATION
    |--------------------------------------------------------------------------
    */

    const confirmDelete = async () => {
        if (!deletingReport) {
            return;
        }

        try {
            const response = await fetch(`/reports/${deletingReport.id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });

            const body = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(body?.message ?? `Status ${response.status}`);
            }

            setRows((current) =>
                current.filter((row) => row.id !== deletingReport.id),
            );

            if (viewingReport?.id === deletingReport.id) {
                setViewingReport(null);
            }

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
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
            });
        } finally {
            setDeletingReport(null);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | AI CHAT
    |--------------------------------------------------------------------------
    */

    const askAI = useCallback(
        async (question: string) => {
            const clean = question.trim();

            if (!clean || aiTyping) {
                return;
            }

            setMessages((current) => [
                ...current,
                { id: Date.now(), sender: "user", message: clean },
            ]);

            setAiInput("");
            setAiTyping(true);

            let aiReplyText: string | null = null;

            try {
                const dates = getDateRangeValues(dateRange);

                const response = await fetch("/ai/alibaton/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        // ✅ Fresh token mula sa cookie; fallback sa meta tag
                        ...(getXsrfCookieToken()
                            ? { "X-XSRF-TOKEN": getXsrfCookieToken() }
                            : { "X-CSRF-TOKEN": getCsrfToken() }),
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({
                        message: clean,
                        context: {
                            page: "reports",
                            module: "reports",
                            date_range: dateRange,
                            start_date: dates.start_date,
                            end_date: dates.end_date,
                            report_type: reportType,
                            client,
                            actual_reports: rows,
                            quick_summary: summary,
                            requested_at: new Date().toISOString(),
                        },
                    }),
                });

                if (response.ok) {
                    const data = await response.json();

                    const text = String(
                        data?.message ??
                            data?.response ??
                            data?.answer ??
                            data?.summary ??
                            "",
                    ).trim();

                    if (text) {
                        aiReplyText = text;
                    }
                }
            } catch (exception) {
                console.warn("AI endpoint unavailable.", exception);
            }

            if (!aiReplyText) {
                aiReplyText = buildLocalAIResponse(clean, {
                    rows,
                    summary,
                    reportType,
                    dateRange,
                });
            }

            setMessages((current) => [
                ...current,
                { id: Date.now() + 1, sender: "ai", message: aiReplyText! },
            ]);

            setAiTyping(false);

            if (!aiOpen) {
                setHasNewReply(true);
            }
        },
        [aiTyping, dateRange, reportType, client, rows, summary, aiOpen],
    );

    const clearAI = () => {
        setMessages([
            {
                id: 1,
                sender: "ai",
                message:
                    "Hello! I'm ALIBATON AI — your Report Assistant.\n\nI can help you with:\n• Alibaton Summary\n• Summarize my reports list\n• Show me my total records\n• How to generate a report?\n• Show me my AI-generated reports\n\nWhat would you like to do?",
            },
        ]);

        setAiInput("");
        localStorage.removeItem("alibaton_reports_ai_messages");
        localStorage.removeItem("alibaton_reports_ai_input");
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="Reports" />

            <UserLayout>
                <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white">
                    <div className="mx-auto w-full max-w-[1600px] bg-gray-50 px-4 py-6 dark:bg-[#090000] sm:px-6 lg:px-8">
                        {/* HEADER */}
                        <section className="mb-6 rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-white via-white to-gray-100 dark:from-slate-900 dark:via-slate-900 dark:to-black shadow-2xl">
                            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/20">
                                        <FileBarChart size={24} />
                                    </div>

                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h1 className="text-xl font-black sm:text-2xl">
                                                Reports
                                            </h1>

                                            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                                                <Sparkles size={11} />
                                                AI Assisted
                                            </span>
                                        </div>

                                        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500 dark:text-slate-500 sm:text-sm">
                                            View and manage database-backed
                                            system reports across all
                                            operational modules.
                                        </p>
                                    </div>
                                </div>

                                {/* ✅ RIGHT SIDE: BELL + REFRESH */}
                                <div className="flex items-center gap-3">


                                    <button
                                        type="button"
                                        onClick={() => void fetchReports()}
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400 disabled:opacity-50"
                                    >
                                        <RefreshCw
                                            size={14}
                                            className={
                                                loading ? "animate-spin" : ""
                                            }
                                        />
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* FILTERS */}
                        <form
                            onSubmit={handleGenerate}
                            className="mb-6 rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl sm:p-5"
                        >
                            <div className="grid gap-4 lg:grid-cols-4">
                                <FilterField
                                    label="Report Type"
                                    value={reportType}
                                    onChange={(value) =>
                                        setReportType(value as ReportType)
                                    }
                                    options={[
                                        ["All", "All Reports"],
                                        [
                                            "Operations",
                                            "Operations (Contracts & Permits)",
                                        ],
                                        [
                                            "Compliance",
                                            "Compliance (Insurance, Permits)",
                                        ],
                                        [
                                            "Documents",
                                            "Documents (Company, Contracts)",
                                        ],
                                        ["Job Orders", "Job Orders"],
                                        ["Financial", "Financial Summary"],
                                        ["Billing", "Billing (Invoices)"],
                                        [
                                            "Accounts Receivable",
                                            "Accounts Receivable",
                                        ],
                                    ]}
                                />

                                <FilterField
                                    label="Date Range"
                                    value={dateRange}
                                    onChange={(value) =>
                                        setDateRange(value as DateRangeOption)
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
                                    value={client}
                                    onChange={setClient}
                                    options={[
                                        ["All Clients", "All Clients"],
                                        ...clients.map(
                                            (item) =>
                                                [item, item] as [
                                                    string,
                                                    string,
                                                ],
                                        ),
                                    ]}
                                    icon={<User size={14} />}
                                />

                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                                            hasDuplicate
                                                ? "border border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                                                : "bg-yellow-400 text-black hover:bg-yellow-300"
                                        } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                        {loading ? (
                                            <RefreshCw
                                                size={14}
                                                className="animate-spin"
                                            />
                                        ) : hasDuplicate ? (
                                            <AlertTriangle size={14} />
                                        ) : (
                                            <FileBarChart size={14} />
                                        )}

                                        {hasDuplicate
                                            ? "Already Exists"
                                            : "Generate Report"}
                                    </button>
                                </div>
                            </div>

                            {hasDuplicate && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
                                    <AlertTriangle
                                        size={13}
                                        className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                                    />

                                    <p className="text-[11px] leading-5 text-amber-700/80 dark:text-amber-200/80">
                                        An existing report{" "}
                                        <span className="font-bold text-amber-700 dark:text-amber-200">
                                            "{matchingRow?.name}"
                                        </span>{" "}
                                        already uses the same type, client, and
                                        date range.
                                    </p>
                                </div>
                            )}
                        </form>

                        {/* REPORTS */}
                        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <FileText
                                            size={16}
                                            className="text-yellow-600 dark:text-yellow-400"
                                        />
                                        <h2 className="text-sm font-black">
                                            All Reports
                                        </h2>
                                    </div>

                                    <span className="rounded-full border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-2.5 py-1 text-[9px] font-bold text-gray-500 dark:text-slate-500">
                                        {rows.length} reports
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[850px] text-left">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                                                {[
                                                    "Report Name",
                                                    "Client",
                                                    "Type",
                                                    "Date Range",
                                                    "Generated On",
                                                    "Actions",
                                                ].map((label) => (
                                                    <th
                                                        key={label}
                                                        className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500"
                                                    >
                                                        {label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-4 py-10 text-center text-xs text-gray-500 dark:text-slate-500"
                                                    >
                                                        <RefreshCw
                                                            size={18}
                                                            className="mx-auto mb-2 animate-spin text-yellow-600 dark:text-yellow-400"
                                                        />
                                                        Loading reports...
                                                    </td>
                                                </tr>
                                            ) : rows.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-4 py-10 text-center text-xs text-gray-500 dark:text-slate-500"
                                                    >
                                                        No reports found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                rows.map((row) => {
                                                    const parsed =
                                                        parseReportContent(
                                                            row.content,
                                                        );
                                                    const rowClient =
                                                        extractClient(
                                                            row,
                                                            parsed,
                                                        );

                                                    return (
                                                        <tr
                                                            key={row.id}
                                                            className="border-b border-gray-200 dark:border-slate-800/60 transition hover:bg-gray-50 dark:hover:bg-slate-950/60"
                                                        >
                                                            <td className="px-4 py-3 text-xs font-bold text-gray-800 dark:text-slate-200">
                                                                <div className="flex items-center gap-2">
                                                                    {row.ai_generated && (
                                                                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-yellow-400/15 text-yellow-600 dark:text-yellow-400">
                                                                            <Sparkles
                                                                                size={
                                                                                    10
                                                                                }
                                                                            />
                                                                        </span>
                                                                    )}

                                                                    <div className="min-w-0">
                                                                        <p className="truncate font-bold">
                                                                            {
                                                                                row.name
                                                                            }
                                                                        </p>

                                                                        {rowClient && (
                                                                            <p className="mt-0.5 truncate text-[9px] font-medium text-slate-600">
                                                                                {
                                                                                    rowClient
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                                                    <User
                                                                        size={
                                                                            12
                                                                        }
                                                                        className="text-yellow-600 dark:text-yellow-400"
                                                                    />
                                                                    {rowClient ||
                                                                        "All Clients"}
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                                                                {row.type ||
                                                                    row.report_type ||
                                                                    "All"}
                                                            </td>

                                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                                                                {row.date_range}
                                                            </td>

                                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
                                                                {formatDateDisplay(
                                                                    row.generated_on,
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleView(
                                                                                row,
                                                                            )
                                                                        }
                                                                        className="rounded-lg p-1.5 text-gray-500 dark:text-slate-500 hover:bg-yellow-400/10 hover:text-yellow-600 dark:hover:text-yellow-400"
                                                                        title="View"
                                                                    >
                                                                        <Eye
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleDownload(
                                                                                row,
                                                                            )
                                                                        }
                                                                        className="rounded-lg p-1.5 text-gray-500 dark:text-slate-500 hover:bg-yellow-400/10 hover:text-yellow-600 dark:hover:text-yellow-400"
                                                                        title="Download PDF"
                                                                    >
                                                                        <Download
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(
                                                                            event,
                                                                        ) =>
                                                                            openMenu(
                                                                                event,
                                                                                row.id,
                                                                            )
                                                                        }
                                                                        className="rounded-lg p-1.5 text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                                                        title="More"
                                                                    >
                                                                        <MoreVertical
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* SUMMARY */}
                            <aside className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl">
                                <h3 className="mb-4 text-sm font-black">
                                    About Reports
                                </h3>

                                <p className="text-xs leading-6 text-gray-500 dark:text-slate-400">
                                    This section provides a quick overview of
                                    the reports generated within the system.
                                    Reports may include financial, operational,
                                    billing, payment, contract, document, and
                                    compliance information based on the
                                    available system records.
                                </p>

                                <p className="mt-4 text-xs leading-6 text-gray-500 dark:text-slate-500">
                                    Generated reports can be reviewed, viewed,
                                    and downloaded from the reports table.
                                    AI-assisted reports may also provide
                                    summarized insights based on the selected
                                    report data.
                                </p>
                            </aside>
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

                {/* AI BUTTON */}
                <button
                    type="button"
                    onClick={() => setAiOpen(true)}
                    className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-black shadow-2xl shadow-yellow-400/40 transition hover:scale-105 hover:bg-yellow-300 ${
                        aiOpen ? "pointer-events-none opacity-0" : ""
                    }`}
                    title="Ask ALIBATON AI"
                >
                    <Bot size={24} />

                    {hasNewReply && (
                        <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-gray-200 dark:border-slate-950 bg-red-500" />
                    )}

                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-yellow-400/40" />
                </button>

                {/* AI OVERLAY */}
                <div
                    onClick={() => setAiOpen(false)}
                    className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${
                        aiOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                />

                {/* AI DRAWER */}
                <aside
                    className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col border-l border-yellow-400/20 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ${
                        aiOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    <div className="border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-yellow-400/[0.08] to-transparent p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-black">
                                    <Bot size={20} />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-black">
                                            ALIBATON AI
                                        </h2>
                                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    </div>

                                    <p className="text-[10px] text-slate-600">
                                        Report Assistant
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={clearAI}
                                    className="rounded-lg p-2 text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                    title="Clear chat"
                                >
                                    <X size={14} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAiOpen(false)}
                                    className="rounded-lg p-2 text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                >
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto p-4">
                        {messages.map((item) => (
                            <div
                                key={item.id}
                                className={
                                    item.sender === "user"
                                        ? "ml-6 rounded-2xl rounded-br-md bg-yellow-400 p-3 text-black"
                                        : "mr-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3"
                                }
                            >
                                <p
                                    className={
                                        item.sender === "user"
                                            ? "whitespace-pre-line text-xs leading-5"
                                            : "whitespace-pre-line text-xs leading-5 text-gray-500 dark:text-slate-400"
                                    }
                                >
                                    {item.message}
                                </p>
                            </div>
                        ))}

                        {aiTyping && (
                            <div className="mr-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-500">
                                    <Sparkles
                                        size={13}
                                        className="animate-pulse text-yellow-600 dark:text-yellow-400"
                                    />
                                    ALIBATON AI is analyzing your records...
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-800 p-4">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-600">
                            Quick Questions
                        </p>

                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {[
                                "Alibaton Summary",
                                "Summarize my reports list",
                                "Show me my AI-generated reports",
                                "What is the forecast?",
                            ].map((question) => (
                                <button
                                    key={question}
                                    type="button"
                                    disabled={aiTyping}
                                    onClick={() => void askAI(question)}
                                    className="rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-2.5 py-1.5 text-left text-[9px] font-bold text-gray-500 dark:text-slate-500 hover:border-yellow-400/30 hover:text-yellow-600 dark:hover:text-yellow-400 disabled:opacity-50"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void askAI(aiInput);
                            }}
                            className="rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 p-2"
                        >
                            <textarea
                                value={aiInput}
                                onChange={(event) =>
                                    setAiInput(event.target.value)
                                }
                                placeholder="Ask about your records..."
                                rows={3}
                                className="w-full resize-none bg-transparent px-2 py-1 text-xs text-gray-900 dark:text-white outline-none placeholder:text-slate-700"
                            />

                            <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800 pt-2">
                                <span className="px-2 text-[9px] text-slate-700">
                                    {reportType}
                                </span>

                                <button
                                    type="submit"
                                    disabled={!aiInput.trim() || aiTyping}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-3 py-2 text-[10px] font-black text-black hover:bg-yellow-300 disabled:opacity-40"
                                >
                                    <Send size={12} />
                                    Ask AI
                                </button>
                            </div>
                        </form>
                    </div>
                </aside>

                {/* ACTION MENU */}
                {openMenuId !== null &&
                    menuPosition &&
                    (() => {
                        const row = rows.find((item) => item.id === openMenuId);

                        if (!row) {
                            return null;
                        }

                        return (
                            <div
                                ref={menuRef}
                                style={{
                                    position: "fixed",
                                    top: menuPosition.top,
                                    left: menuPosition.left,
                                    zIndex: 100,
                                }}
                                className="w-44 overflow-hidden rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleView(row)}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                >
                                    <Eye
                                        size={13}
                                        className="text-yellow-600 dark:text-yellow-400"
                                    />
                                    View Report
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDownload(row)}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                                >
                                    <Download
                                        size={13}
                                        className="text-yellow-600 dark:text-yellow-400"
                                    />
                                    Download PDF
                                </button>

                                <div className="border-t border-gray-200 dark:border-slate-800" />

                                <button
                                    type="button"
                                    onClick={() => handleDelete(row)}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                >
                                    <Trash2 size={13} />
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
                                message: "Your report was saved as PDF.",
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
                    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
                            <div className="mb-4 flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                                    <Trash2 size={18} />
                                </div>

                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                        Delete Report
                                    </h3>

                                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-500">
                                        Are you sure you want to remove this
                                        report? This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="mb-5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                                <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                                    {deletingReport.name}
                                </p>

                                <p className="mt-1 text-[10px] text-slate-600">
                                    {deletingReport.type} •{" "}
                                    {deletingReport.date_range}
                                </p>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeletingReport(null)}
                                    className="rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void confirmDelete()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-black text-white hover:bg-red-400"
                                >
                                    <Trash2 size={13} />
                                    Delete Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </UserLayout>
        </>
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
        <label className="block">
            <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-600">
                {label}
            </span>

            <div className="relative">
                {icon && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600 dark:text-yellow-400">
                        {icon}
                    </span>
                )}

                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={`w-full appearance-none rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 py-2.5 pr-9 text-xs font-bold text-gray-700 dark:text-slate-300 outline-none transition focus:border-yellow-400/50 ${
                        icon ? "pl-9" : "pl-3"
                    }`}
                >
                    {options.map(([optionValue, optionLabel]) => (
                        <option
                            key={optionValue}
                            value={optionValue}
                            className="bg-gray-50 dark:bg-slate-950"
                        >
                            {optionLabel}
                        </option>
                    ))}
                </select>

                <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
            </div>
        </label>
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
                        clonedDoc.querySelector<HTMLElement>(
                            "[data-pdf-paper]",
                        );

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

            const safeFilename =
                `${reportTitle}-${report.type}-${report.date_range}`
                    .replace(/[<>:"/\\|?*]+/g, "")
                    .replace(/\s+/g, "-")
                    .slice(0, 120);

            pdf.save(`${safeFilename || "ALIBATON-Report"}.pdf`);

            onDownloadSuccess?.();
        } catch (error) {
            console.error("PDF generation failed:", error);

            if (sandbox && sandbox.parentNode) {
                document.body.removeChild(sandbox);
            }

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
        <div className="fixed inset-0 z-[160] overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
            <div className="mx-auto flex min-h-full max-w-6xl items-start justify-center py-4 sm:py-8">
                <div className="w-full overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-4 py-3 sm:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black">
                                <FileBarChart size={17} />
                            </div>

                            <div className="min-w-0">
                                <h2 className="truncate text-sm font-black text-gray-900 dark:text-white">
                                    Report Preview
                                </h2>

                                <p className="truncate text-[10px] text-slate-600">
                                    ALIBATON Report
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => void downloadPdf()}
                                disabled={downloading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-3 py-2 text-[10px] font-black text-black hover:bg-yellow-300 disabled:opacity-50"
                            >
                                {downloading ? (
                                    <Loader2
                                        size={13}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Download size={13} />
                                )}
                                {downloading ? "Generating..." : "PDF"}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl p-2 text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[calc(100vh-100px)] overflow-auto bg-slate-200 p-2 sm:p-5">
                        <div
                            ref={paperRef}
                            data-pdf-paper
                            className="mx-auto w-full max-w-[900px] bg-white text-slate-900 shadow-xl"
                        >
                            <div className="h-1.5 bg-yellow-400" />

                            <div className="p-7 sm:p-10">
                                <div className="mb-6 flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 dark:text-slate-400">
                                            ALIBATON
                                        </p>

                                        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                            {reportTitle}
                                        </h1>

                                        <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-slate-500">
                                            {report.type} Report
                                        </p>
                                    </div>

                                    <div className="text-left sm:text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">
                                            Report Date
                                        </p>

                                        <p className="mt-1 text-xs font-bold text-slate-800">
                                            {formatDateLong(
                                                report.generated_on,
                                            )}
                                        </p>

                                        <p className="mt-1 text-[10px] text-gray-500 dark:text-slate-500">
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
                                    <div className="flex flex-col justify-between gap-2 text-[9px] text-gray-500 dark:text-slate-400 sm:flex-row">
                                        <span>
                                            ALIBATON — Heavy Equipment &
                                            Logistics
                                        </span>
                                        <span>
                                            45 Riverside, Quezon City,
                                            Philippines
                                        </span>
                                    </div>

                                    <div className="mt-1 text-[9px] text-gray-500 dark:text-slate-400">
                                        info@alibaton.com
                                    </div>
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
| PAPER ENTITY META
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
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">
                    {label}
                </p>

                <p className="mt-0.5 text-xs font-bold text-slate-800">
                    {value}
                </p>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| REPORT DOCUMENT BODY — Dispatcher
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| DOCUMENT INTRO
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| REPORT SUMMARY CARDS
|--------------------------------------------------------------------------
*/

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

    if (total > 0) {
        cards.push({ label: "Total Records", value: formatNumber(total) });
    }

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

        if (value > 0) {
            cards.push({ label, value: formatNumber(value) });
        }
    }

    const moneyPairs: [string, string[]][] = [
        ["Invoice Total", ["invoice_total"]],
        ["Payment Total", ["payment_total"]],
        ["Job Order Total", ["job_order_total"]],
        ["Outstanding", ["outstanding"]],
    ];

    for (const [label, keys] of moneyPairs) {
        const value = getObjectNumber(financial, keys);

        if (value !== null && value > 0) {
            cards.push({ label, value: formatCurrency(value) });
        }
    }

    if (!cards.length) {
        return null;
    }

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

/*
|--------------------------------------------------------------------------
| REPORT MODULE BREAKDOWNS
|--------------------------------------------------------------------------
*/

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

    if (!blocks.length) {
        return null;
    }

    return (
        <section>
            <DocumentSectionTitle>Module Breakdown</DocumentSectionTitle>
            <div className="space-y-4">{blocks}</div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| MODULE BLOCK CARD
|--------------------------------------------------------------------------
*/

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
                        <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
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
                        <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
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

/*
|--------------------------------------------------------------------------
| REPORT FINANCIAL DETAILS
|--------------------------------------------------------------------------
*/

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
        if (value !== null && value > 0) {
            rows.push([label, formatCurrency(value)]);
        }
    }

    const collectionRate = getObjectNumber(financial, ["collection_rate"]);
    if (collectionRate !== null && collectionRate > 0) {
        rows.push(["Collection Rate", `${formatNumber(collectionRate)}%`]);
    }

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

    if (!rows.length && !hasBreakdowns) {
        return null;
    }

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
                                    <td className="w-1/2 bg-slate-50 px-4 py-3 text-[10px] font-black text-gray-500 dark:text-slate-500">
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

/*
|--------------------------------------------------------------------------
| REPORT RECORDS TABLES
|--------------------------------------------------------------------------
*/

function ReportRecordsTables({ parsed }: { parsed: Record<string, unknown> }) {
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

        if (!Array.isArray(rows) || rows.length === 0) {
            continue;
        }

        rendered.push(
            <div key={key}>
                <h4 className="mb-2 flex items-center justify-between text-xs font-black text-slate-800">
                    <span>{label}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-black text-gray-500 dark:text-slate-500">
                        {rows.length}
                    </span>
                </h4>
                <ProfessionalArrayTable rows={rows} />
            </div>,
        );
    }

    if (!rendered.length) {
        return null;
    }

    return (
        <section>
            <DocumentSectionTitle>Records</DocumentSectionTitle>
            <div className="space-y-5">{rendered}</div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| REPORT TRENDS
|--------------------------------------------------------------------------
*/

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

            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
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
                                    className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 first:text-left"
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

/*
|--------------------------------------------------------------------------
| REPORT PROJECTIONS
|--------------------------------------------------------------------------
*/

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
                <p className="mb-3 text-[10px] italic text-gray-500 dark:text-slate-500">
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
                                    className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 first:text-left"
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

/*
|--------------------------------------------------------------------------
| REPORT EXPIRATIONS
|--------------------------------------------------------------------------
*/

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

    if (!documents.length && !compliance.length && !contracts.length) {
        return null;
    }

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

/*
|--------------------------------------------------------------------------
| BREAKDOWN TABLE
|--------------------------------------------------------------------------
*/

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
                            <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                {title}
                            </th>
                            <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
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

/*
|--------------------------------------------------------------------------
| ARRAY TABLE
|--------------------------------------------------------------------------
*/

function ProfessionalArrayTable({ rows }: { rows: unknown[] }) {
    if (!rows.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-gray-500 dark:text-slate-500">
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
        if (allKeys.has(key) && columns.length < 8) {
            columns.push(key);
        }
    }
    for (const key of allKeys) {
        if (!columns.includes(key) && columns.length < 8) {
            columns.push(key);
        }
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                        {columns.map((column) => (
                            <th
                                key={column}
                                className="px-3 py-2.5 text-[8px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400"
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

/*
|--------------------------------------------------------------------------
| FORMATTED VALUE
|--------------------------------------------------------------------------
*/

function FormattedDocumentValue({
    value,
    fieldKey,
}: {
    value: unknown;
    fieldKey?: string;
}) {
    if (value === null || value === undefined || value === "") {
        return <>—</>;
    }

    if (typeof value === "boolean") {
        return <>{value ? "Yes" : "No"}</>;
    }

    if (typeof value === "object") {
        return (
            <span className="whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
            </span>
        );
    }

    if (fieldKey && isCurrencyKey(fieldKey) && isNumericValue(value)) {
        return <>{formatCurrency(value)}</>;
    }

    return <>{String(value)}</>;
}

/*
|--------------------------------------------------------------------------
| DOCUMENT SECTION TITLE
|--------------------------------------------------------------------------
*/

function DocumentSectionTitle({ children }: { children: ReactNode }) {
    return (
        <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-yellow-400" />

            <h3 className="text-sm font-black text-slate-900">{children}</h3>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PAPER META
|--------------------------------------------------------------------------
*/

function PaperMeta({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-[10px] font-bold text-slate-700">{value}</p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PAPER SUMMARY CARD
|--------------------------------------------------------------------------
*/

function PaperSummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-base font-black text-slate-900">{value}</p>
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
            <CheckCircle2
                size={15}
                className="text-emerald-600 dark:text-emerald-400"
            />
        ) : toast.type === "warning" ? (
            <AlertTriangle
                size={15}
                className="text-amber-600 dark:text-amber-400"
            />
        ) : toast.type === "error" ? (
            <AlertTriangle
                size={15}
                className="text-red-600 dark:text-red-400"
            />
        ) : (
            <Sparkles size={15} className="text-blue-600 dark:text-blue-400" />
        );

    return (
        <div className="pointer-events-auto rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xl">
            <div className="flex items-start gap-2.5">
                <div className="mt-0.5">{icon}</div>

                <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-gray-900 dark:text-white">
                        {toast.title}
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-gray-500 dark:text-slate-500">
                        {toast.message}
                    </p>

                    {toast.action && (
                        <button
                            type="button"
                            onClick={() => {
                                toast.action?.onClick();
                                onDismiss();
                            }}
                            className="mt-2 text-[10px] font-black text-yellow-600 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onDismiss}
                    className="rounded-lg p-1 text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| SUMMARY CARD
|--------------------------------------------------------------------------
*/

function SummaryCard({
    icon,
    label,
    value,
    delta,
    color,
}: {
    icon: ReactNode;
    label: string;
    value: number;
    delta: number;
    color: "yellow" | "blue" | "purple" | "green";
}) {
    const colorClasses: Record<string, string> = {
        yellow: "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 border-yellow-400/10",
        blue: "bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-400/10",
        purple: "bg-purple-400/10 text-purple-600 dark:text-purple-400 border-purple-400/10",
        green: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/10",
    };

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
            <div className="flex items-start justify-between gap-3">
                <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${colorClasses[color]}`}
                >
                    {icon}
                </div>

                {delta !== 0 && (
                    <span
                        className={`text-[9px] font-black ${
                            delta > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                        }`}
                    >
                        {delta > 0 ? "+" : ""}
                        {formatNumber(delta)}
                    </span>
                )}
            </div>

            <p className="mt-3 text-[9px] font-black uppercase tracking-wider text-slate-600">
                {label}
            </p>

            <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                {formatNumber(value)}
            </p>
        </div>
    );
}
