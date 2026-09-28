import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import {
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    RefreshCw,
    Shield,
    Sparkles,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import AdminLayout from "../../Layouts/AdminLayout";

/* ============================================================
| TYPES
============================================================ */

type ForecastType = "revenue" | "payments" | "invoices" | "contracts";
type ForecastPeriod = "3" | "6" | "12";
type TrendDirection = "up" | "down" | "stable";
type ConfidenceLevel = "high" | "medium" | "low";

type ForecastRow = {
    date?: string;
    month: string;
    label: string;
    actual: number | null;
    forecast: number | null;
    is_forecast: boolean;
};

type ConfidenceData = {
    score: number;
    label: string;
    level: ConfidenceLevel;
    message: string;
};

type BacktestData = {
    mae: number;
    rmse: number;
    wape: number;
    smape: number;
    folds: number;
};

type ForecastMetric = {
    historical: ForecastRow[];
    forecast: ForecastRow[];
    data: ForecastRow[];
    latest_actual: number;
    projected_total: number;
    average_forecast: number;
    growth: number;
    trend: TrendDirection;
    slope: number;
    r_squared: number;
    confidence: ConfidenceData;
    format: "currency" | "number";
    historical_count: number;
    model: string;
    model_description: string;
    backtest: BacktestData;
};

type ForecastInsight = {
    type: "positive" | "warning" | "neutral" | "info";
    metric: string;
    title: string;
    message: string;
    value: number;
};

type ForecastRisk = {
    severity: "high" | "medium" | "low";
    type: string;
    title: string;
    message: string;
};

type DataQuality = {
    historical_months_available: number;
    has_sufficient_history: boolean;
    message: string;
};

type ForecastResponse = {
    generated_at: string;
    period: number;
    history_months: number;
    history_start: string | null;
    history_end: string | null;
    requested_type: string;
    revenue: ForecastMetric | null;
    payments: ForecastMetric | null;
    invoices: ForecastMetric | null;
    contracts: ForecastMetric | null;
    summary: {
        projected_revenue: number;
        projected_payments: number;
        projected_invoices: number;
        projected_contracts: number;
        revenue_growth: number;
        payment_growth: number;
        invoice_growth: number;
        contract_growth: number;
    };
    insights: ForecastInsight[];
    risks: ForecastRisk[];
    data_quality: DataQuality;
};

type BackendForecastRow = {
    date?: string;
    month?: string;
    label?: string;
    actual?: number | null;
    forecast?: number | null;
    is_forecast?: boolean;
    isForecast?: boolean;
};

type BackendForecastResponse = {
    type?: ForecastType;
    period?: number;
    forecast_period?: number;
    forecastMonths?: number;
    generated_at?: string;
    generatedAt?: string;
    last_updated_at?: string;
    lastUpdatedAt?: string;
    historical?: BackendForecastRow[];
    history?: BackendForecastRow[];
    actuals?: BackendForecastRow[];
    forecast?: BackendForecastRow[];
    forecasted_period?: BackendForecastRow[];
    forecastedPeriod?: BackendForecastRow[];
    data?: BackendForecastRow[];
    chart_data?: BackendForecastRow[];
    chartData?: BackendForecastRow[];
    latest_actual?: {
        date?: string;
        month?: string;
        value?: number;
    } | null;
    latestActual?: {
        date?: string;
        month?: string;
        value?: number;
    } | null;
    projected_total?: number;
    projectedTotal?: number;
    forecast_total?: number;
    forecastTotal?: number;
    average_forecast?: number;
    averageForecast?: number;
    growth?: number;
    trend?: TrendDirection;
    trend_direction?: TrendDirection;
    trendDirection?: TrendDirection;
    model?: string;
    model_name?: string;
    modelName?: string;
    model_description?: string;
    modelDescription?: string;
    backtest?: Partial<BacktestData>;
    backtest_results?: Partial<BacktestData>;
    backtestResults?: Partial<BacktestData>;
    mae?: number;
    rmse?: number;
    wape?: number;
    smape?: number;
    r_squared?: number;
    rSquared?: number;
    confidence?: ConfidenceLevel;
    confidence_score?: number;
    confidenceScore?: number;
    forecast_quality?: {
        score?: number;
        confidence?: ConfidenceLevel;
        historical_months?: number;
        active_months?: number;
        inactive_months?: number;
        backtest_smape?: number;
        backtest_wape?: number;
        backtest_mae?: number;
        message?: string;
    };
    data_quality?: {
        score?: number;
        confidence?: ConfidenceLevel;
        historical_months?: number;
        active_months?: number;
        inactive_months?: number;
        backtest_smape?: number;
        backtest_wape?: number;
        backtest_mae?: number;
        message?: string;
    };
    insights?: string[];
    forecast_insights?: string[];
    forecastInsights?: string[];
    risks?: string[];
    forecast_risks?: string[];
    forecastRisks?: string[];
};

type ForecastApiResponse = BackendForecastResponse & {
    success?: boolean;
    message?: string;
    data?: unknown;
};

type PageProps = {
    forecasting?: BackendForecastResponse;
};

/* ============================================================
| HELPERS
============================================================ */

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const formatNumber = (value: number): string =>
    new Intl.NumberFormat("en-PH").format(Number(value) || 0);

const formatCompactValue = (value: number): string => {
    const safeValue = Number(value) || 0;

    if (safeValue >= 1_000_000) {
        return `₱${(safeValue / 1_000_000).toFixed(1)}M`;
    }

    if (safeValue >= 1_000) {
        return `₱${(safeValue / 1_000).toFixed(0)}K`;
    }

    return safeValue.toString();
};

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

const createEmptyMetric = (
    format: "currency" | "number",
): ForecastMetric => ({
    historical: [],
    forecast: [],
    data: [],
    latest_actual: 0,
    projected_total: 0,
    average_forecast: 0,
    growth: 0,
    trend: "stable",
    slope: 0,
    r_squared: 0,
    confidence: {
        score: 0,
        label: "Insufficient data",
        level: "low",
        message:
            "No completed historical activity is currently available.",
    },
    format,
    historical_count: 0,
    model: "Insufficient Data",
    model_description:
        "There is not enough completed historical data to train a forecasting model.",
    backtest: {
        mae: 0,
        rmse: 0,
        wape: 0,
        smape: 0,
        folds: 0,
    },
});

const emptyForecastResponse = (): ForecastResponse => ({
    generated_at: new Date().toISOString(),
    period: 6,
    history_months: 0,
    history_start: null,
    history_end: null,
    requested_type: "revenue",
    revenue: createEmptyMetric("currency"),
    payments: createEmptyMetric("currency"),
    invoices: createEmptyMetric("number"),
    contracts: createEmptyMetric("number"),
    summary: {
        projected_revenue: 0,
        projected_payments: 0,
        projected_invoices: 0,
        projected_contracts: 0,
        revenue_growth: 0,
        payment_growth: 0,
        invoice_growth: 0,
        contract_growth: 0,
    },
    insights: [],
    risks: [],
    data_quality: {
        historical_months_available: 0,
        has_sufficient_history: false,
        message: "No forecasting data is currently available.",
    },
});

const normalizeRow = (
    row: BackendForecastRow,
    defaultForecast: boolean,
): ForecastRow => {
    const actual =
        row.actual !== null &&
        row.actual !== undefined &&
        Number.isFinite(Number(row.actual))
            ? Number(row.actual)
            : null;

    const forecast =
        row.forecast !== null &&
        row.forecast !== undefined &&
        Number.isFinite(Number(row.forecast))
            ? Number(row.forecast)
            : null;

    const isForecastFlag =
        row.is_forecast !== undefined
            ? Boolean(row.is_forecast)
            : row.isForecast !== undefined
              ? Boolean(row.isForecast)
              : defaultForecast;

    return {
        date: row.date,
        month: row.month ?? row.label ?? "",
        label: row.label ?? row.month ?? "",
        actual,
        forecast,
        is_forecast: isForecastFlag,
    };
};

const normalizeBackendForecast = (
    raw: BackendForecastResponse,
): ForecastResponse => {
    const historicalSource =
        raw.historical ?? raw.history ?? raw.actuals ?? [];

    const forecastSource =
        raw.forecast ??
        raw.forecasted_period ??
        raw.forecastedPeriod ??
        [];

    const historical = historicalSource.map((row) =>
        normalizeRow(row, false),
    );

    const forecast = forecastSource.map((row) =>
        normalizeRow(row, true),
    );

    const combinedSource =
        raw.data ??
        raw.chart_data ??
        raw.chartData ??
        [...historical, ...forecast];

    const combined = combinedSource.map((row) => {
        const isForecast =
            row.is_forecast !== undefined
                ? Boolean(row.is_forecast)
                : row.isForecast !== undefined
                  ? Boolean(row.isForecast)
                  : false;

        return normalizeRow(row, isForecast);
    });

    const quality = raw.forecast_quality ?? raw.data_quality ?? {};

    const score = clamp(
        Number(
            raw.confidence_score ??
                raw.confidenceScore ??
                quality.score ??
                0,
        ),
        0,
        100,
    );

    const level: ConfidenceLevel =
        raw.confidence === "high" ||
        raw.confidence === "medium" ||
        raw.confidence === "low"
            ? raw.confidence
            : quality.confidence === "high" ||
                quality.confidence === "medium" ||
                quality.confidence === "low"
              ? quality.confidence
              : score >= 75
                ? "high"
                : score >= 50
                  ? "medium"
                  : "low";

    const historicalCount = Number(
        quality.historical_months ?? historical.length ?? 0,
    );

    const activeCount = Number(
        quality.active_months ??
            historical.filter(
                (row) => Number(row.actual ?? 0) > 0,
            ).length,
    );

    const historyStart =
        historical[0]?.date ?? historical[0]?.month ?? null;

    const historyEnd =
        historical[historical.length - 1]?.date ??
        historical[historical.length - 1]?.month ??
        null;

    const type = raw.type ?? "revenue";

    const backtestSource: Partial<BacktestData> =
        raw.backtest ??
        raw.backtest_results ??
        raw.backtestResults ??
        {};

    const latestActual =
        raw.latest_actual ?? raw.latestActual ?? null;

    const metric: ForecastMetric = {
        historical,
        forecast,
        data: combined,

        latest_actual: Number(
            latestActual?.value ??
                historical
                    .filter(
                        (row) =>
                            row.actual !== null &&
                            row.actual !== undefined,
                    )
                    .slice(-1)[0]?.actual ??
                0,
        ),

        projected_total: Number(
            raw.projected_total ??
                raw.projectedTotal ??
                raw.forecast_total ??
                raw.forecastTotal ??
                0,
        ),

        average_forecast: Number(
            raw.average_forecast ??
                raw.averageForecast ??
                0,
        ),

        growth: Number(raw.growth ?? 0),

        trend:
            raw.trend ??
            raw.trend_direction ??
            raw.trendDirection ??
            "stable",

        slope: 0,

        r_squared: Number(
            raw.r_squared ??
                raw.rSquared ??
                0,
        ),

        confidence: {
            score,

            label:
                level === "high"
                    ? "High confidence"
                    : level === "medium"
                      ? "Moderate confidence"
                      : "Limited historical data",

            level,

            message:
                quality.message ??
                "Confidence is based on historical coverage and rolling-backtest error.",
        },

        format:
            type === "invoices" ||
            type === "contracts"
                ? "number"
                : "currency",

        historical_count: historicalCount,

        model:
            raw.model ??
            raw.model_name ??
            raw.modelName ??
            "Forecast Model",

        model_description:
            raw.model_description ??
            raw.modelDescription ??
            "Data-driven forecasting model.",

        backtest: {
            mae: Number(
                backtestSource.mae ??
                    raw.mae ??
                    quality.backtest_mae ??
                    0,
            ),

            rmse: Number(
                backtestSource.rmse ??
                    raw.rmse ??
                    0,
            ),

            wape: Number(
                backtestSource.wape ??
                    raw.wape ??
                    quality.backtest_wape ??
                    0,
            ),

            smape: Number(
                backtestSource.smape ??
                    raw.smape ??
                    quality.backtest_smape ??
                    0,
            ),

            folds: Number(
                backtestSource.folds ??
                    0,
            ),
        },
    };

    const insightMessages =
        raw.insights ??
        raw.forecast_insights ??
        raw.forecastInsights ??
        [];

    const riskMessages =
        raw.risks ??
        raw.forecast_risks ??
        raw.forecastRisks ??
        [];

    return {
        generated_at:
            raw.generated_at ??
            raw.generatedAt ??
            raw.last_updated_at ??
            raw.lastUpdatedAt ??
            new Date().toISOString(),

        period: Number(
            raw.period ??
                raw.forecast_period ??
                raw.forecastMonths ??
                6,
        ),

        history_months: historicalCount,

        history_start: historyStart,

        history_end: historyEnd,

        requested_type: type,

        revenue:
            type === "revenue"
                ? metric
                : null,

        payments:
            type === "payments"
                ? metric
                : null,

        invoices:
            type === "invoices"
                ? metric
                : null,

        contracts:
            type === "contracts"
                ? metric
                : null,

        summary: {
            projected_revenue:
                type === "revenue"
                    ? metric.projected_total
                    : 0,

            projected_payments:
                type === "payments"
                    ? metric.projected_total
                    : 0,

            projected_invoices:
                type === "invoices"
                    ? metric.projected_total
                    : 0,

            projected_contracts:
                type === "contracts"
                    ? metric.projected_total
                    : 0,

            revenue_growth:
                type === "revenue"
                    ? metric.growth
                    : 0,

            payment_growth:
                type === "payments"
                    ? metric.growth
                    : 0,

            invoice_growth:
                type === "invoices"
                    ? metric.growth
                    : 0,

            contract_growth:
                type === "contracts"
                    ? metric.growth
                    : 0,
        },

        insights: insightMessages.map(
            (message, index) => ({
                type: "info" as const,
                metric: type,
                title:
                    index === 0
                        ? "Forecast Insight"
                        : "Historical Analysis",
                message,
                value: metric.growth,
            }),
        ),

        risks: riskMessages.map(
            (message, index) => ({
                severity:
                    level === "low"
                        ? "high"
                        : level === "medium"
                          ? "medium"
                          : "low",

                type: "forecast",

                title:
                    index === 0
                        ? "Forecast Risk"
                        : "Data Consideration",

                message,
            }),
        ),

        data_quality: {
            historical_months_available:
                historicalCount,

            has_sufficient_history:
                historicalCount >= 6,

            message:
                quality.message ??
                (activeCount > 0
                    ? `${activeCount} active historical months were analyzed.`
                    : "No active historical months are currently available."),
        },
    };
};

/* ============================================================
| TOOLTIPS
============================================================ */

type TooltipPayload = {
    dataKey?: string;
    value?: number | string | null;
};

function ForecastTooltip(props: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
    isCurrency?: boolean;
}) {
    const {
        active,
        payload,
        label,
        isCurrency,
    } = props;

    if (
        !active ||
        !payload ||
        payload.length === 0
    ) {
        return null;
    }

    const actual = payload.find(
        (item) => item.dataKey === "actual",
    );

    const forecast = payload.find(
        (item) => item.dataKey === "forecast",
    );

    const actualValue = actual?.value ?? null;
    const forecastValue = forecast?.value ?? null;

    return (
        <div className="min-w-[200px] rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {label}
            </p>

            {actualValue !== null &&
                actualValue !== undefined && (
                    <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm bg-blue-500" />

                            <span className="text-[11px] text-slate-400">
                                Actual
                            </span>
                        </div>

                        <span className="text-xs font-bold text-white">
                            {isCurrency
                                ? formatCurrency(
                                      Number(actualValue),
                                  )
                                : formatNumber(
                                      Number(actualValue),
                                  )}
                        </span>
                    </div>
                )}

            {forecastValue !== null &&
                forecastValue !== undefined && (
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm bg-emerald-400" />

                            <span className="text-[11px] text-slate-400">
                                Forecast
                            </span>
                        </div>

                        <span className="text-xs font-bold text-emerald-400">
                            {isCurrency
                                ? formatCurrency(
                                      Number(forecastValue),
                                  )
                                : formatNumber(
                                      Number(forecastValue),
                                  )}
                        </span>
                    </div>
                )}
        </div>
    );
}

function SimpleValueTooltip(props: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
    isCurrency?: boolean;
}) {
    const {
        active,
        payload,
        label,
        isCurrency,
    } = props;

    if (
        !active ||
        !payload ||
        payload.length === 0
    ) {
        return null;
    }

    const value = payload[0]?.value ?? 0;

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 shadow-2xl">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {label}
            </p>

            <p className="text-xs font-bold text-emerald-400">
                {isCurrency
                    ? formatCurrency(Number(value))
                    : formatNumber(Number(value))}
            </p>
        </div>
    );
}

/* ============================================================
| ADMIN FORECASTING PAGE
============================================================ */

function AdminForecasting() {
    const page = usePage<PageProps>();

    const initialForecast =
        page.props.forecasting;

    const [forecastType, setForecastType] =
        useState<ForecastType>("revenue");

    const [forecastPeriod, setForecastPeriod] =
        useState<ForecastPeriod>("6");

    const [forecastData, setForecastData] =
        useState<ForecastResponse>(() =>
            initialForecast
                ? normalizeBackendForecast(
                      initialForecast,
                  )
                : emptyForecastResponse(),
        );

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [lastRefreshed, setLastRefreshed] =
        useState<Date>(new Date());

    const loadForecast = useCallback(
        async (
            type: ForecastType,
            period: ForecastPeriod,
        ) => {
            setLoading(true);
            setError(null);

            try {
                const params =
                    new URLSearchParams();

                params.set("type", type);
                params.set("period", period);
                params.set(
                    "_ts",
                    Date.now().toString(),
                );

                const response = await fetch(
                    `/admin/forecasting/data?${params.toString()}`,
                    {
                        method: "GET",

                        headers: {
                            Accept:
                                "application/json",

                            "X-Requested-With":
                                "XMLHttpRequest",

                            "Cache-Control":
                                "no-cache, no-store, max-age=0",
                        },

                        credentials:
                            "same-origin",

                        cache: "no-store",
                    },
                );

                if (!response.ok) {
                    let serverMessage = "";

                    try {
                        const body =
                            await response.json();

                        serverMessage =
                            body?.message ?? "";
                    } catch {}

                    throw new Error(
                        serverMessage ||
                            `Forecast request failed with status ${response.status}.`,
                    );
                }

                const result =
                    (await response.json()) as ForecastApiResponse;

                if (
                    !result ||
                    typeof result !== "object"
                ) {
                    throw new Error(
                        "The forecasting server returned an invalid response.",
                    );
                }

                if (
                    result.success === false
                ) {
                    throw new Error(
                        result.message ??
                            "The forecasting server could not generate the forecast.",
                    );
                }

                const payload =
                    result.data &&
                    typeof result.data ===
                        "object" &&
                    !Array.isArray(
                        result.data,
                    )
                        ? {
                              ...(result.data as BackendForecastResponse),

                              type:
                                  (
                                      result.data as BackendForecastResponse
                                  ).type ??
                                  result.type,

                              period:
                                  (
                                      result.data as BackendForecastResponse
                                  ).period ??
                                  result.period,
                          }
                        : result;

                const normalized =
                    normalizeBackendForecast(
                        payload,
                    );

                if (
                    normalized.requested_type !==
                    type
                ) {
                    normalized.requested_type =
                        type;
                }

                setForecastData(
                    normalized,
                );

                setLastRefreshed(
                    new Date(),
                );
            } catch (err) {
                console.error(
                    "Admin forecasting error:",
                    err,
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load forecasting data.",
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        loadForecast(
            forecastType,
            forecastPeriod,
        );
    }, [
        forecastType,
        forecastPeriod,
        loadForecast,
    ]);

    useEffect(() => {
        const interval =
            window.setInterval(() => {
                loadForecast(
                    forecastType,
                    forecastPeriod,
                );
            }, 30_000);

        return () =>
            window.clearInterval(
                interval,
            );
    }, [
        forecastType,
        forecastPeriod,
        loadForecast,
    ]);

    const handleGenerate = () =>
        loadForecast(
            forecastType,
            forecastPeriod,
        );

    const activeMetric =
        useMemo<ForecastMetric>(() => {
            const metric =
                forecastType === "revenue"
                    ? forecastData.revenue
                    : forecastType ===
                        "payments"
                      ? forecastData.payments
                      : forecastType ===
                          "invoices"
                        ? forecastData.invoices
                        : forecastData.contracts;

            return (
                metric ??
                createEmptyMetric(
                    forecastType ===
                        "revenue" ||
                        forecastType ===
                            "payments"
                        ? "currency"
                        : "number",
                )
            );
        }, [
            forecastData,
            forecastType,
        ]);

    const forecastLabel =
        forecastType === "revenue"
            ? "Revenue"
            : forecastType === "payments"
              ? "Payments"
              : forecastType === "invoices"
                ? "Invoices"
                : "Contracts";

    const isCurrency =
        forecastType === "revenue" ||
        forecastType === "payments";

    const chartData = useMemo(() => {
        const rows =
            activeMetric.data ?? [];

        if (!rows.length) {
            return [];
        }

        return rows.map((item) => ({
            ...item,

            actual:
                item.actual !== null &&
                item.actual !== undefined
                    ? Number(item.actual)
                    : undefined,

            forecast:
                item.forecast !== null &&
                item.forecast !== undefined
                    ? Number(item.forecast)
                    : undefined,
        }));
    }, [activeMetric]);

    const projectedValues =
        useMemo(() => {
            return (
                activeMetric.forecast ?? []
            )
                .filter(
                    (item) =>
                        item.forecast !==
                            null &&
                        item.forecast !==
                            undefined,
                )
                .slice(
                    0,
                    Number(
                        forecastPeriod,
                    ),
                );
        }, [
            activeMetric,
            forecastPeriod,
        ]);

    const latestActual =
        Number(
            activeMetric.latest_actual,
        ) || 0;

    const dataQuality =
        forecastData.data_quality ??
        emptyForecastResponse()
            .data_quality;

    const insights =
        forecastData.insights ?? [];

    const formatYAxis = (
        value: number,
    ) =>
        isCurrency
            ? formatCompactValue(value)
            : formatNumber(value);

    const actualCount =
        activeMetric.historical.filter(
            (item) =>
                Number(
                    item.actual ?? 0,
                ) > 0,
        ).length;

    const mainChartData =
        chartData;

    const historicalBarData =
        activeMetric.historical
            .slice(-12)
            .map((item) => ({
                label: item.label,
                actual:
                    Number(
                        item.actual,
                    ) || 0,
            }));

    const monthOverMonthData =
        projectedValues.map(
            (item, index) => {
                const prev =
                    index === 0
                        ? latestActual
                        : Number(
                              projectedValues[
                                  index - 1
                              ].forecast,
                          ) || 0;

                const current =
                    Number(
                        item.forecast,
                    ) || 0;

                const change =
                    prev > 0
                        ? ((current - prev) /
                              prev) *
                          100
                        : 0;

                return {
                    label: item.label,
                    change: Number(
                        change.toFixed(2),
                    ),
                };
            },
        );

    return (
        <>
            <Head title="Admin — Forecast Analytics" />

            <AdminLayout>
                <div className="min-h-screen bg-black p-4 font-sans text-white sm:p-6">
                    <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" />

                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                                    ALIBATON ADMIN ANALYTICS
                                </span>
                            </div>

                            <h1 className="text-2xl font-black tracking-tight text-white">
                                Forecast Analytics
                            </h1>

                            <p className="mt-1 max-w-2xl text-sm text-slate-400">
                                Company-wide predictive
                                insights based on live
                                financial, payment,
                                invoice, and contract
                                records across all
                                users and clients.
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-400">
                                    <Shield size={11} />
                                    Admin View
                                </span>

                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <BarChart3
                                        size={11}
                                    />
                                    Overall Company
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden text-right text-[10px] text-slate-500 sm:block">
                                <p>
                                    Last updated:{" "}
                                    {lastRefreshed.toLocaleTimeString(
                                        "en-PH",
                                    )}
                                </p>

                                <p className="flex items-center justify-end gap-1">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    Auto-refresh 30s
                                </p>
                            </div>

                            <button
                                onClick={
                                    handleGenerate
                                }
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400 px-5 py-2.5 text-sm font-black text-black shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={16}
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                {loading
                                    ? "Updating..."
                                    : "Run Forecast"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-900/70 bg-red-950/40 p-4">
                            <AlertTriangle
                                size={18}
                                className="mt-0.5 shrink-0 text-red-400"
                            />

                            <div className="min-w-0">
                                <p className="text-sm font-bold text-red-300">
                                    Forecasting data
                                    could not be
                                    loaded
                                </p>

                                <p className="mt-1 break-words text-xs text-red-400">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Forecast Type
                                </label>

                                <select
                                    value={
                                        forecastType
                                    }
                                    onChange={(e) =>
                                        setForecastType(
                                            e.target
                                                .value as ForecastType,
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white outline-none transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/40"
                                >
                                    <option value="revenue">
                                        Revenue
                                        Forecast
                                    </option>

                                    <option value="payments">
                                        Payments
                                        Forecast
                                    </option>

                                    <option value="invoices">
                                        Invoices
                                        Forecast
                                    </option>

                                    <option value="contracts">
                                        Contracts
                                        Forecast
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Period
                                </label>

                                <select
                                    value={
                                        forecastPeriod
                                    }
                                    onChange={(e) =>
                                        setForecastPeriod(
                                            e.target
                                                .value as ForecastPeriod,
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white outline-none transition focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/40"
                                >
                                    <option value="3">
                                        Next 3 Months
                                    </option>

                                    <option value="6">
                                        Next 6 Months
                                    </option>

                                    <option value="12">
                                        Next 12 Months
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Scope
                                </label>

                                <select
                                    disabled
                                    className="w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-600"
                                >
                                    <option>
                                        Overall Company
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Users
                                </label>

                                <select
                                    disabled
                                    className="w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-600"
                                >
                                    <option>
                                        All Users
                                    </option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                        <div className="col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl xl:col-span-2">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-black text-white">
                                        Company-Wide{" "}
                                        {
                                            forecastLabel
                                        }{" "}
                                        Forecast
                                    </h2>

                                    <p className="mt-0.5 text-[10px] text-slate-500">
                                        Historical actuals
                                        vs model forecast
                                        — aggregated
                                        across all users
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 text-[10px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-sm bg-blue-500" />

                                        <span className="text-slate-400">
                                            Actual
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-sm bg-emerald-400" />

                                        <span className="text-slate-400">
                                            Forecast
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[280px] w-full">
                                {mainChartData.length ===
                                0 ? (
                                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800">
                                        <div className="text-center">
                                            <AlertTriangle
                                                size={22}
                                                className="mx-auto mb-2 text-slate-600"
                                            />

                                            <p className="text-xs font-semibold text-slate-500">
                                                No historical
                                                data
                                                available.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <ComposedChart
                                            data={
                                                mainChartData
                                            }
                                            margin={{
                                                top: 10,
                                                right: 10,
                                                left: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                stroke="#1e293b"
                                                vertical={
                                                    false
                                                }
                                            />

                                            <XAxis
                                                dataKey="label"
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 10,
                                                }}
                                                dy={8}
                                            />

                                            <YAxis
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 10,
                                                }}
                                                tickFormatter={
                                                    formatYAxis
                                                }
                                                width={70}
                                            />

                                            <Tooltip
                                                content={
                                                    <ForecastTooltip
                                                        isCurrency={
                                                            isCurrency
                                                        }
                                                    />
                                                }
                                            />

                                            <Bar
                                                dataKey="actual"
                                                fill="#3b82f6"
                                                barSize={
                                                    26
                                                }
                                                radius={[
                                                    3,
                                                    3,
                                                    0,
                                                    0,
                                                ]}
                                                name="Actual"
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="forecast"
                                                stroke="#34d399"
                                                strokeWidth={
                                                    2
                                                }
                                                dot={{
                                                    r: 3,
                                                    fill: "#34d399",
                                                    strokeWidth: 1.5,
                                                    stroke: "#020617",
                                                }}
                                                activeDot={{
                                                    r: 5,
                                                }}
                                                name="Forecast"
                                                connectNulls
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-black text-white">
                                <Sparkles
                                    size={14}
                                    className="text-yellow-400"
                                />
                                Key Forecast
                                Insights
                            </h2>

                            <div className="space-y-3">
                                {insights.length >
                                0 ? (
                                    insights
                                        .slice(
                                            0,
                                            4,
                                        )
                                        .map(
                                            (
                                                insight,
                                                idx,
                                            ) => (
                                                <div
                                                    key={
                                                        idx
                                                    }
                                                    className="flex gap-2"
                                                >
                                                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-400/10 text-yellow-400">
                                                        <ArrowUpRight
                                                            size={
                                                                11
                                                            }
                                                        />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-bold leading-tight text-white">
                                                            {
                                                                insight.title
                                                            }
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                                                            {
                                                                insight.message
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            ),
                                        )
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                                                <ArrowUpRight
                                                    size={
                                                        11
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-bold leading-tight text-white">
                                                    Company
                                                    forecast
                                                    generated
                                                </p>

                                                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                                                    Based
                                                    on all
                                                    live
                                                    database
                                                    records
                                                    across
                                                    users.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-400/10 text-blue-400">
                                                <BarChart3
                                                    size={
                                                        11
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-bold leading-tight text-white">
                                                    Historical
                                                    coverage
                                                </p>

                                                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                                                    {
                                                        actualCount
                                                    }{" "}
                                                    active
                                                    historical
                                                    periods
                                                    analyzed.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                            <h3 className="mb-4 text-xs font-black text-white">
                                Historical Activity
                                (Last 12 Months)
                            </h3>

                            <div className="h-[180px] w-full">
                                {historicalBarData.length ===
                                0 ? (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-xs text-slate-600">
                                            No historical
                                            data.
                                        </p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={
                                                historicalBarData
                                            }
                                            margin={{
                                                top: 5,
                                                right: 5,
                                                left: -20,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                stroke="#1e293b"
                                                vertical={
                                                    false
                                                }
                                            />

                                            <XAxis
                                                dataKey="label"
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 9,
                                                }}
                                            />

                                            <YAxis
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 10,
                                                }}
                                                tickFormatter={
                                                    formatYAxis
                                                }
                                            />

                                            <Tooltip
                                                content={
                                                    <SimpleValueTooltip
                                                        isCurrency={
                                                            isCurrency
                                                        }
                                                    />
                                                }
                                            />

                                            <Bar
                                                dataKey="actual"
                                                fill="#3b82f6"
                                                radius={[
                                                    4,
                                                    4,
                                                    0,
                                                    0,
                                                ]}
                                                name="Actual"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <div className="mt-auto border-t border-slate-800 pt-3 text-center text-[10px] text-slate-600">
                                {
                                    historicalBarData.length
                                }{" "}
                                historical periods
                            </div>
                        </div>

                        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                            <h3 className="mb-4 text-xs font-black text-white">
                                Month-over-Month
                                Change (%)
                            </h3>

                            <div className="h-[180px] w-full">
                                {monthOverMonthData.length ===
                                0 ? (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-xs text-slate-600">
                                            No MoM data.
                                        </p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <LineChart
                                            data={
                                                monthOverMonthData
                                            }
                                            margin={{
                                                top: 5,
                                                right: 5,
                                                left: -20,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                stroke="#1e293b"
                                                vertical={
                                                    false
                                                }
                                            />

                                            <XAxis
                                                dataKey="label"
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 9,
                                                }}
                                            />

                                            <YAxis
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 10,
                                                }}
                                                tickFormatter={(
                                                    v,
                                                ) =>
                                                    `${v}%`
                                                }
                                            />

                                            <Tooltip
                                                content={({
                                                    active,
                                                    payload,
                                                    label,
                                                }) => {
                                                    if (
                                                        !active ||
                                                        !payload ||
                                                        payload.length ===
                                                            0
                                                    ) {
                                                        return null;
                                                    }

                                                    const value =
                                                        Number(
                                                            payload[0]
                                                                ?.value ??
                                                                0,
                                                        );

                                                    return (
                                                        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 shadow-2xl">
                                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                {
                                                                    label
                                                                }
                                                            </p>

                                                            <p className="text-xs font-bold text-yellow-400">
                                                                {value.toFixed(
                                                                    2,
                                                                )}
                                                                %
                                                            </p>
                                                        </div>
                                                    );
                                                }}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="change"
                                                stroke="#facc15"
                                                strokeWidth={
                                                    2
                                                }
                                                dot={{
                                                    r: 3,
                                                    fill: "#facc15",
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            <div className="mt-auto border-t border-slate-800 pt-3 text-center text-[10px] text-slate-600">
                                {
                                    monthOverMonthData.length
                                }{" "}
                                forecast periods
                            </div>
                        </div>

                        {/* =====================================================
                            STATIC NOTES — REPLACED RISK ASSESSMENT
                        ====================================================== */}

                        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                            <h3 className="mb-4 flex items-center gap-2 text-xs font-black text-white">
                                <BarChart3
                                    size={14}
                                    className="text-yellow-400"
                                />
                                Notes
                            </h3>

                            <div className="flex-1 space-y-3">
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                                    <p className="text-[11px] font-semibold text-white">
                                        Forecast data
                                    </p>

                                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                        Forecasts are
                                        generated from
                                        historical
                                        ALIBATON
                                        financial,
                                        payment,
                                        invoice, and
                                        contract
                                        records.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                                    <p className="text-[11px] font-semibold text-white">
                                        Prediction
                                        guidance
                                    </p>

                                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                        Forecast values
                                        are estimates
                                        and may change
                                        as new records
                                        are added to the
                                        system.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                                    <p className="text-[11px] font-semibold text-white">
                                        Data coverage
                                    </p>

                                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                                        More complete
                                        historical
                                        records can
                                        improve the
                                        reliability of
                                        future forecasts.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-slate-800 pt-3 text-center text-[10px] text-slate-600">
                                Updated automatically
                                every 30 seconds
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-xl">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                        dataQuality.has_sufficient_history
                                            ? "bg-emerald-400/10 text-emerald-400"
                                            : "bg-amber-400/10 text-amber-400"
                                    }`}
                                >
                                    <CheckCircle2
                                        size={13}
                                    />
                                </div>

                                <div>
                                    <p className="text-[11px] font-semibold text-white">
                                        {loading
                                            ? "Updating system data..."
                                            : "Connected to ALIBATON live database"}
                                    </p>

                                    <p className="text-[10px] text-slate-500">
                                        {
                                            dataQuality.message
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-[9px] text-slate-600">
                                <span>
                                    Source: Live DB
                                    (Company-Wide)
                                </span>

                                <span>
                                    Last generated:{" "}
                                    {forecastData.generated_at
                                        ? new Date(
                                              forecastData.generated_at,
                                          ).toLocaleString(
                                              "en-PH",
                                          )
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        </>
    );
}

export default AdminForecasting;
