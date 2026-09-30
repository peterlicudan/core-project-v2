import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import UserLayout from "../../Layouts/UserLayout";

import {
    AlertCircle,
    BriefcaseBusiness,
    CalendarDays,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    EyeOff,
    FileText,
    MapPin,
    MoreVertical,
    Printer,
    Receipt,
    RefreshCw,
    Search,
    UserRound,
    X,
    Mail,
    Phone,
    Wallet,
    StickyNote,
    Ban,
    RotateCcw,
    AlertTriangle,
    Send,
    Percent,
    Calculator,
    CreditCard,
    Plus,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type InvoiceStatus =
    | "Pending"
    | "Partial"
    | "Paid"
    | "Rejected"
    | "Overdue"
    | "Approved";

type InvoiceItem = {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
};

type Invoice = {
    id: number;
    /** Invoice No. — NULL hanggang APPROVED ng admin */
    number: string;
    /* ✅ May Invoice No. na? (false = billing record pa lang) */
    hasInvoiceNumber?: boolean;
    /* ✅ BILLING NUMBER (ipinapakita sa Billing Records) */
    billingNumber?: string | null;
    client: string;
    clientEmail: string;
    clientAddress: string;
    clientContact: string;
    project: string;
    items: InvoiceItem[];
    taxRate: number;
    amount: number;
    /* ✅ VAT + ADDITIONAL CHARGES BREAKDOWN */
    baseAmount?: number;
    vatRate?: number;
    vatAmount?: number;
    additionalCharges?: number;
    totalAmount?: number;
    hasVat?: boolean;
    hasAdditionalCharges?: boolean;
    status: InvoiceStatus;
    dueDate: string;
    createdAt: string;
    notes: string;
    description?: string;
    jobOrderId?: number | null;
    staffId?: number;
    staffName?: string;
    rejectionReason?: string | null;
    rejectedAt?: string | null;
    approvedAt?: string | null;
    approvedBy?: string | null;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    sentAt?: string | null;
    sentBy?: string | null;
    withholdingTax?: number;
    totalAmountDue?: number;
    paymentMethod?: string | null;
    serviceMonth?: string | null;
    billingSequence?: number | null;
    jobOrderNumber?: string | null;
    matchesJobOrder?: boolean | null;
};

type JobOrderBilling = {
    id: number;
    number: string;
    billingNumber?: string | null;
    serviceMonth: string | null;
    billingSequence: number | null;
    amount: number;
    baseAmount?: number;
    vatAmount?: number;
    additionalCharges?: number;
    totalAmount?: number;
    matchesJobOrder?: boolean | null;
    status: string;
    dueDate: string | null;
    createdAt: string | null;
};

type JobOrder = {
    id: number;
    number?: string | null;
    userId?: number | null;
    client?: string | null;
    clientEmail?: string | null;
    clientContact?: string | null;
    clientAddress?: string | null;
    project?: string | null;
    location?: string | null;
    equipment?: string | null;
    operator?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    amount?: number | string | null;
    description?: string | null;
    notes?: string | null;
    status?: string | null;
    generatedAt?: string | null;
    generatedBy?: { id: number; name: string; email?: string | null } | null;
    hasInvoice?: boolean;
    invoiceId?: number | null;
    invoiceNumber?: string | null;
    invoice?: {
        id?: number;
        jobOrderId?: number;
        number?: string;
        status?: string;
        amount?: number | string;
        dueDate?: string | null;
    } | null;
    rejectionReason?: string | null;

    /* ✅ APPROVED QUOTATION + MONTHLY BILLING */
    quotationTotal?: number | null;
    billingMonths?: number | null;
    monthlyAmount?: number | null;
    billedCount?: number | null;
    approvedCount?: number | null;
    rejectedCount?: number | null;
    pendingCount?: number | null;
    totalBilled?: number | null;
    remainingAmount?: number | null;
    billings?: JobOrderBilling[] | null;

    /* ✅ LOCK LOGIC (admin verification) */
    canCreateBilling?: boolean;
    isFullyBilled?: boolean;
    isFullyCompleted?: boolean;
    billingStatus?: string | null;
};

type PageProps = {
    invoices?: Invoice[];
    jobOrders?: JobOrder[];
    records?: JobOrder[];
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

const VAT_RATE = 0.12;

const money = (
    value: number | string | null | undefined,
    hideAmount = false,
) => {
    if (hideAmount) return "₱ ••••••";
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
};

const maskEmail = (email: string | null | undefined) => {
    if (!email) return "—";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
        return `${name[0]}*@${domain}`;
    }
    const maskedName =
        name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
    return `${maskedName}@${domain}`;
};

const displayClientEmail = (
    email: string | null | undefined,
    status?: string | null,
) => {
    if (!email) return "—";
    if (String(status ?? "").toLowerCase() === "approved") {
        return email;
    }
    return maskEmail(email);
};

const formatDate = (value: string | null | undefined, fallback = "—") => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const formatDateTime = (value: string | null | undefined, fallback = "—") => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

/*
|--------------------------------------------------------------------------
| MONTH HELPERS (Service Date = monthly)
|--------------------------------------------------------------------------
*/

const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

/** "2026-09" → "Sep 2026" */
const formatMonth = (value: string | null | undefined, fallback = "—") => {
    if (!value) return fallback;
    const match = /^(\d{4})-(\d{2})$/.exec(String(value).trim());
    if (!match) return String(value);
    const year = match[1];
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) return String(value);
    return `${MONTH_NAMES[monthIndex]} ${year}`;
};

/** Date → "2026-09" */
const toMonthKey = (value: string | Date | null | undefined) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

/** "2026-09" + 2 → "2026-11" */
const addMonths = (monthKey: string, offset: number) => {
    const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
    if (!match) return monthKey;
    const date = new Date(Number(match[1]), Number(match[2]) - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

/** Bilang ng buwan between two dates (inclusive-ish, para sa quotation). */
const monthsBetween = (
    start: string | null | undefined,
    end: string | null | undefined,
) => {
    const from = start ? new Date(start) : null;
    const to = end ? new Date(end) : null;
    if (
        !from ||
        !to ||
        Number.isNaN(from.getTime()) ||
        Number.isNaN(to.getTime())
    ) {
        return 0;
    }
    if (to < from) return 0;
    const months =
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth());
    return months <= 0 ? 1 : months;
};

const normalizeInvoice = (raw: any): Invoice => {
    const amount = Number(raw?.amount ?? raw?.total ?? 0);
    let status: InvoiceStatus = "Pending";
    const statusMap: Record<string, InvoiceStatus> = {
        Partial: "Partial",
        Paid: "Paid",
        Rejected: "Rejected",
        Overdue: "Overdue",
        Approved: "Approved",
    };
    status = statusMap[raw?.status] || "Pending";

    const rawItems = Array.isArray(raw?.items) ? raw.items : [];
    const items: InvoiceItem[] =
        rawItems.length > 0
            ? rawItems.map((item: any, index: number) => ({
                  id: Number(item?.id ?? index + 1),
                  description: String(
                      item?.description ??
                          "Heavy Equipment & Logistics Service",
                  ),
                  quantity: Number(item?.quantity ?? 1),
                  unitPrice: Number(
                      item?.unitPrice ?? item?.unit_price ?? amount,
                  ),
              }))
            : [
                  {
                      id: Number(raw?.id ?? 1),
                      description: String(
                          raw?.description ??
                              "Heavy Equipment & Logistics Service",
                      ),
                      quantity: 1,
                      unitPrice: amount,
                  },
              ];

    const num = (v: any, fallback = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    /*
    |--------------------------------------------------------------------------
    | ✅ REAL BREAKDOWN (mula sa DB) — hindi na computed na assumed
    | base + additional charges + VAT = amount (grand total)
    |--------------------------------------------------------------------------
    */
    const baseAmount = num(raw?.baseAmount ?? raw?.base_amount, amount);
    const vatAmount = num(raw?.vatAmount ?? raw?.vat_amount);
    const additionalCharges = num(
        raw?.additionalCharges ?? raw?.additional_charges,
    );
    const totalAmount = baseAmount + additionalCharges + vatAmount;

    return {
        id: Number(raw?.id ?? 0),
        /* Invoice No. — empty string kapag wala pa (bago ma-approve) */
        number: String(raw?.number ?? "") || "",
        hasInvoiceNumber: Boolean(
            raw?.hasInvoiceNumber ?? raw?.has_invoice_number ?? raw?.number,
        ),
        billingNumber:
            (raw?.billingNumber ?? raw?.billing_number ?? null) || null,
        baseAmount,
        vatRate: num(raw?.vatRate ?? raw?.vat_rate),
        vatAmount,
        additionalCharges,
        totalAmount,
        hasVat: vatAmount > 0,
        hasAdditionalCharges: additionalCharges > 0,
        matchesJobOrder: raw?.matchesJobOrder ?? raw?.matches_job_order ?? null,
        verifiedAt: raw?.verifiedAt ?? raw?.verified_at ?? null,
        verifiedBy: raw?.verifiedBy ?? raw?.verified_by ?? null,
        client: String(raw?.client ?? raw?.clientName ?? "—"),
        clientEmail: String(raw?.clientEmail ?? raw?.client_email ?? ""),
        clientAddress: String(raw?.clientAddress ?? raw?.client_address ?? ""),
        clientContact: String(raw?.clientContact ?? raw?.client_contact ?? ""),
        project: String(raw?.project ?? "—"),
        items,
        taxRate: VAT_RATE * 100,
        amount,
        status,
        dueDate: String(raw?.dueDate ?? raw?.due_date ?? ""),
        createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
        notes: String(raw?.notes ?? ""),
        description: raw?.description ?? "",
        jobOrderId:
            raw?.jobOrderId ?? raw?.job_order_id ?? raw?.jobOrder?.id ?? null,
        serviceMonth: raw?.serviceMonth ?? raw?.service_month ?? null,
        billingSequence: (() => {
            const seq = raw?.billingSequence ?? raw?.billing_sequence;
            const parsed = Number(seq);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        })(),
        jobOrderNumber: raw?.jobOrderNumber ?? raw?.job_order_number ?? null,
        staffId: raw?.staffId ?? raw?.userId ?? raw?.user_id ?? undefined,
        staffName: raw?.staffName ?? raw?.user?.name ?? undefined,
        rejectionReason: raw?.rejectionReason ?? raw?.rejection_reason ?? null,
        rejectedAt: raw?.rejectedAt ?? raw?.rejected_at ?? null,
        approvedAt: raw?.approvedAt ?? raw?.approved_at ?? null,
        approvedBy: raw?.approvedBy ?? raw?.approved_by ?? null,
        sentAt: raw?.sentAt ?? raw?.sent_at ?? null,
        sentBy: raw?.sentBy ?? raw?.sent_by ?? null,
        withholdingTax: 0,
        totalAmountDue: totalAmount,
        paymentMethod:
            raw?.paymentMethod ?? raw?.payment_method ?? "Bank Transfer",
    };
};

const getJobOrderNumber = (jobOrder: JobOrder) =>
    jobOrder.number ?? `JO-${jobOrder.id}`;
const getJobOrderAmount = (jobOrder: JobOrder) => Number(jobOrder.amount ?? 0);

/*
|--------------------------------------------------------------------------
| APPROVED QUOTATION + MONTHLY BILLING HELPERS
|--------------------------------------------------------------------------
*/

const getJobOrderBillings = (jobOrder: JobOrder): JobOrderBilling[] =>
    Array.isArray(jobOrder.billings) ? jobOrder.billings : [];

/** Kabuuang halaga ng na-approve na quotation. */
const getQuotationTotal = (jobOrder: JobOrder) =>
    Number(jobOrder.quotationTotal ?? jobOrder.amount ?? 0);

/** Ilang buwan ang saklaw ng quotation (3 = quarterly). 0 = hindi pa alam. */
const getBillingMonths = (jobOrder: JobOrder) =>
    Number(jobOrder.billingMonths ?? 0) > 0
        ? Number(jobOrder.billingMonths)
        : monthsBetween(jobOrder.startDate, jobOrder.endDate);

const getMonthlyAmount = (jobOrder: JobOrder) => {
    const months = getBillingMonths(jobOrder);
    if (months < 1) return 0;
    return getQuotationTotal(jobOrder) / months;
};

/** Ilang buwan na ang nai-bill (Rejected hindi kasama). */
const getBilledCount = (jobOrder: JobOrder) => {
    if (jobOrder.billedCount != null && jobOrder.rejectedCount) {
        /* May rejected record — dili na sigurado, i-recompute */
        return getBilledMonths(jobOrder).length;
    }
    if (jobOrder.billedCount != null) return Number(jobOrder.billedCount);
    return getBilledMonths(jobOrder).length;
};

const getTotalBilled = (jobOrder: JobOrder) => {
    if (jobOrder.totalBilled != null) return Number(jobOrder.totalBilled);
    return getJobOrderBillings(jobOrder).reduce(
        (sum, billing) => sum + Number(billing.amount ?? 0),
        0,
    );
};

/**
 * Mga buwan na nai-bill na (sorted).
 *
 * ✅ Ang Rejected ay HINDI kasama — para makapag-create pa rin
 * ng corrected billing para sa parehong buwan.
 */
const getBilledMonths = (jobOrder: JobOrder) => {
    const months = getJobOrderBillings(jobOrder)
        .filter((billing) => billing.status !== "Rejected")
        .map((billing) => billing.serviceMonth)
        .filter((month): month is string => Boolean(month));

    return Array.from(new Set(months)).sort();
};

/**
 * Unang buwan na puwedeng i-bill.
 * - Kung may nai-bill na → susunod sa huli
 * - Kung wala → startDate month, o current month
 */
const getNextBillableMonth = (jobOrder: JobOrder) => {
    const billed = getBilledMonths(jobOrder);
    if (billed.length > 0) {
        return addMonths(billed[billed.length - 1], 1);
    }
    return toMonthKey(jobOrder.startDate) ?? toMonthKey(new Date()) ?? "";
};

/** Nakalimutan na ba ang lahat ng buwan ng quotation? */
const isFullyBilled = (jobOrder: JobOrder) => {
    const months = getBillingMonths(jobOrder);
    if (months < 1) return false;
    return getBilledCount(jobOrder) >= months;
};

const SCROLL_THRESHOLD = 5;
const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 56;

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function BillingInvoicing() {
    const page = usePage<PageProps>();
    const url = page.url;
    const backendInvoices = page.props.invoices ?? [];
    const backendJobOrders = page.props.jobOrders ?? page.props.records ?? [];

    const [invoices, setInvoices] = useState<Invoice[]>(
        backendInvoices.map(normalizeInvoice),
    );
    const [jobOrders, setJobOrders] = useState<JobOrder[]>(backendJobOrders);

    const [activeTab, setActiveTab] = useState<
        "job-orders" | "billing-records" | "service-invoice"
    >("job-orders");
    const [search, setSearch] = useState("");
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
        "All" | InvoiceStatus
    >("All");

    const [hideAmount, setHideAmount] = useState(true);

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        null,
    );
    const [selectedJobOrder, setSelectedJobOrder] = useState<JobOrder | null>(
        null,
    );
    const [showInvoiceView, setShowInvoiceView] = useState(false);
    const [showJobOrderView, setShowJobOrderView] = useState(false);
    const [showInvoicePrint, setShowInvoicePrint] = useState(false);

    const [showSendEmailModal, setShowSendEmailModal] = useState(false);
    const [billingJobOrder, setBillingJobOrder] = useState<JobOrder | null>(
        null,
    );
    const [showCreateJobOrder, setShowCreateJobOrder] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        variant: "warning" | "info" | "danger" | "success";
        onConfirm: () => void;
    }>({
        open: false,
        title: "",
        message: "",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        variant: "warning",
        onConfirm: () => {},
    });

    const [successMessage, setSuccessMessage] = useState("");
    const [isCreatingBilling, setIsCreatingBilling] = useState(false);
    const [isCreatingJobOrder, setIsCreatingJobOrder] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const [sendEmailData, setSendEmailData] = useState({
        email: "",
        subject: "",
        message: "",
        invoiceId: null as number | null,
    });

    const printRef = useRef<HTMLDivElement | null>(null);
    const flashSuccess = page.props.flash?.success;
    const flashError = page.props.flash?.error;

    useEffect(() => {
        setInvoices(backendInvoices.map(normalizeInvoice));
    }, [page.props.invoices]);

    useEffect(() => {
        setJobOrders(backendJobOrders);
    }, [page.props.jobOrders, page.props.records]);

    useEffect(() => {
        if (!flashSuccess) return;
        setSuccessMessage(String(flashSuccess));
        const timer = window.setTimeout(() => setSuccessMessage(""), 8000);
        return () => window.clearTimeout(timer);
    }, [flashSuccess]);

    /* ------------------------------------------------------------------ */
    /* ✅ NEW: Auto-open Job Order from notification (?job_order_id=X)    */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        const params = new URLSearchParams(url.split("?")[1] || "");
        const jobOrderIdFromUrl = params.get("job_order_id");

        if (!jobOrderIdFromUrl) return;

        const target = jobOrders.find(
            (jo) => jo.id === Number(jobOrderIdFromUrl),
        );

        if (target) {
            // Switch sa Job Orders tab
            setActiveTab("job-orders");

            // Auto-open yung Job Order details modal
            setSelectedJobOrder(target);
            setShowJobOrderView(true);

            // Clear URL param (para hindi mag-loop)
            window.history.replaceState({}, "", "/billing-invoicing");
        }
    }, [url, jobOrders]);

    const filteredJobOrders = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return jobOrders;
        return jobOrders.filter((jobOrder) => {
            const values = [
                jobOrder.number,
                jobOrder.client,
                jobOrder.project,
                jobOrder.location,
                jobOrder.equipment,
                jobOrder.operator,
                jobOrder.status,
                jobOrder.invoiceNumber,
                jobOrder.invoice?.number,
            ];
            return values
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword));
        });
    }, [jobOrders, search]);

    /*
    |----------------------------------------------------------------------
    | CATEGORIES: Job Order | Billing Records | Service Invoice
    |----------------------------------------------------------------------
    |
    | Billing Records = lahat ng billing na ginawa ng staff (Pending,
    |                  Approved, Rejected). Keyed sa BILLING NO. +
    |                  JOB ORDER NO. — WALANG invoice number dito.
    |
    | Service Invoice = APPROVED NA lang. Pag approve ng admin, doon na
    |                  gumagawa ang invoice kaya mayroon nang Invoice No.
    |                  (kasama pa rin ang Billing No. at Job Order No.)
    |
    */

    const billingRecords = useMemo(
        () => invoices.filter((invoice) => Boolean(invoice.jobOrderId)),
        [invoices],
    );

    const serviceInvoices = useMemo(
        () => invoices.filter((invoice) => invoice.status === "Approved"),
        [invoices],
    );

    const filterInvoiceList = (list: Invoice[]) => {
        const keyword = search.trim().toLowerCase();

        return list.filter((invoice) => {
            const matchesSearch =
                !keyword ||
                [
                    invoice.number,
                    invoice.billingNumber,
                    invoice.jobOrderNumber,
                    invoice.client,
                    invoice.project,
                    invoice.clientEmail,
                    invoice.status,
                    invoice.serviceMonth
                        ? formatMonth(invoice.serviceMonth)
                        : "",
                ]
                    .filter(Boolean)
                    .some((value) =>
                        String(value).toLowerCase().includes(keyword),
                    );
            const matchesStatus =
                invoiceStatusFilter === "All" ||
                invoice.status === invoiceStatusFilter;
            return matchesSearch && matchesStatus;
        });
    };

    const filteredBillingRecords = useMemo(
        () => filterInvoiceList(billingRecords),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [billingRecords, search, invoiceStatusFilter],
    );

    const filteredServiceInvoices = useMemo(
        () => filterInvoiceList(serviceInvoices),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [serviceInvoices, search, invoiceStatusFilter],
    );

    const countStatuses = (list: Invoice[]) => ({
        pending: list.filter((i) => i.status === "Pending").length,
        partial: list.filter((i) => i.status === "Partial").length,
        paid: list.filter((i) => i.status === "Paid").length,
        overdue: list.filter((i) => i.status === "Overdue").length,
        rejected: list.filter((i) => i.status === "Rejected").length,
        approved: list.filter((i) => i.status === "Approved").length,
    });

    const activeInvoiceList =
        activeTab === "billing-records" ? billingRecords : serviceInvoices;
    const activeFilteredInvoices =
        activeTab === "billing-records"
            ? filteredBillingRecords
            : filteredServiceInvoices;
    const activeCounts = countStatuses(activeInvoiceList);

    const jobOrderShouldScroll = filteredJobOrders.length >= SCROLL_THRESHOLD;
    const invoiceShouldScroll =
        activeFilteredInvoices.length >= SCROLL_THRESHOLD;
    const jobOrderMaxHeight = jobOrderShouldScroll
        ? HEADER_HEIGHT + SCROLL_THRESHOLD * ROW_HEIGHT
        : undefined;
    const invoiceMaxHeight = invoiceShouldScroll
        ? HEADER_HEIGHT + SCROLL_THRESHOLD * ROW_HEIGHT
        : undefined;

    const handleSummaryCardClick = (status: InvoiceStatus) => {
        if (invoiceStatusFilter === status) {
            setInvoiceStatusFilter("All");
        } else {
            setInvoiceStatusFilter(status);
        }
    };

    const refreshData = () => {
        setIsRefreshing(true);
        router.reload({
            only: ["invoices", "jobOrders", "records", "flash"],
            onFinish: () => setIsRefreshing(false),
        });
    };
    const openConfirm = (options: {
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        variant?: "warning" | "info" | "danger" | "success";
        onConfirm: () => void;
    }) => {
        setConfirmDialog({
            open: true,
            title: options.title,
            message: options.message,
            confirmLabel: options.confirmLabel ?? "Confirm",
            cancelLabel: options.cancelLabel ?? "Cancel",
            variant: options.variant ?? "warning",
            onConfirm: options.onConfirm,
        });
    };

    const closeConfirm = () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
    };

    const openJobOrder = (jobOrder: JobOrder) => {
        setSelectedJobOrder(jobOrder);
        setShowJobOrderView(true);
    };

    /*
    |----------------------------------------------------------------------
    | ✅ OPEN CREATE BILLING
    |----------------------------------------------------------------------
    */

    const openCreateBilling = (jobOrder: JobOrder) => {
        setSelectedJobOrder(null);
        setShowJobOrderView(false);
        setBillingJobOrder(jobOrder);
    };

    const closeCreateBilling = () => {
        setBillingJobOrder(null);
    };

    /*
    |----------------------------------------------------------------------
    | ✅ CREATE JOB ORDER (demo — walang integration pa)
    |----------------------------------------------------------------------
    */

    const submitCreateJobOrder = (payload: {
        client: string;
        clientEmail: string;
        clientContact: string;
        clientAddress: string;
        project: string;
        location: string;
        equipment: string;
        operator: string;
        startDate: string;
        endDate: string;
        quotationTotal: number;
        billingMonths: number;
        description: string;
        notes: string;
    }) => {
        if (isCreatingJobOrder) return;

        setIsCreatingJobOrder(true);
        setSuccessMessage("");

        /* Empty string → undefined para hindi ma-trigger ang backend rules */
        const opt = (value: string) =>
            value.trim() ? value.trim() : undefined;

        router.post(
            "/job-orders",
            {
                client: payload.client,
                client_email: opt(payload.clientEmail),
                client_contact: opt(payload.clientContact),
                client_address: opt(payload.clientAddress),
                project: payload.project,
                location: opt(payload.location),
                equipment: opt(payload.equipment),
                operator: opt(payload.operator),
                start_date: opt(payload.startDate),
                end_date: opt(payload.endDate),
                amount: payload.quotationTotal,
                quotation_total: payload.quotationTotal,
                billing_months: payload.billingMonths,
                description: opt(payload.description),
                notes: opt(payload.notes),
                return_to: "billing.invoicing",
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreatingJobOrder(false);
                    setSuccessMessage(
                        `Job Order for ${payload.client} has been created and is ready for monthly billing.`,
                    );
                    setShowCreateJobOrder(false);
                    setSearch("");
                    setInvoiceStatusFilter("All");
                    refreshData();
                },
                onError: (errors) => {
                    setIsCreatingJobOrder(false);
                    console.error("CREATE JOB ORDER ERROR:", errors);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to create the Job Order. Please try again.",
                    );
                },
                onFinish: () => setIsCreatingJobOrder(false),
            },
        );
    };

    /*
    |----------------------------------------------------------------------
    | ✅ SUBMIT CREATE BILLING
    |----------------------------------------------------------------------
    */

    const submitCreateBilling = (payload: {
        serviceMonth: string;
        billingSequence: number | null;
        baseAmount: number;
        applyVat: boolean;
        vatRate: number;
        applyAdditionalCharges: boolean;
        additionalCharges: number;
        totalAmount: number;
        dueDate: string;
        description: string;
        notes: string;
        quotationTotal: number;
        billingMonths: number;
    }) => {
        const jobOrder = billingJobOrder;
        if (!jobOrder || isCreatingBilling) return;

        const number = getJobOrderNumber(jobOrder);
        setIsCreatingBilling(true);
        setSuccessMessage("");

        router.post(
            "/billing-invoicing",
            {
                job_order_id: jobOrder.id,
                client: jobOrder.client ?? "",
                project: jobOrder.project ?? "",
                client_email: jobOrder.clientEmail ?? null,
                client_address: jobOrder.clientAddress ?? null,
                /* ✅ Grand total (base + charges + VAT) */
                amount: payload.totalAmount,
                base_amount: payload.baseAmount,
                apply_vat: payload.applyVat,
                vat_rate: payload.vatRate,
                apply_additional_charges: payload.applyAdditionalCharges,
                additional_charges: payload.additionalCharges,
                due_date: payload.dueDate || null,
                description: payload.description || null,
                notes: payload.notes || null,
                service_month: payload.serviceMonth,
                billing_sequence: payload.billingSequence,
                quotation_total: payload.quotationTotal,
                billing_months: payload.billingMonths,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCreatingBilling(false);
                    setSuccessMessage(
                        `Billing record for ${formatMonth(payload.serviceMonth)} has been created for Job Order ${number}.`,
                    );
                    setBillingJobOrder(null);
                    setSearch("");
                    setInvoiceStatusFilter("All");
                    refreshData();
                },
                onError: (errors) => {
                    setIsCreatingBilling(false);
                    console.error("CREATE BILLING ERROR:", errors);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : `Failed to create the billing record for Job Order ${number}. Please try again.`,
                    );
                },
                onFinish: () => setIsCreatingBilling(false),
            },
        );
    };

    const openInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setShowInvoiceView(true);
    };

    /** ✅ Reference label: Invoice No. kung approved, else Billing No. */
    const refOf = (invoice: Invoice) =>
        invoice.status === "Approved"
            ? (invoice.number ?? invoice.billingNumber ?? `#${invoice.id}`)
            : (invoice.billingNumber ?? `#${invoice.id}`);

    const resubmitInvoice = (invoice: Invoice) => {
        if (!invoice || isResubmitting) return;

        openConfirm({
            title: "Resubmit Billing Record",
            message: `Resubmit billing record ${refOf(invoice)}?\n\nThis will set the status back to PENDING for Admin review.`,
            confirmLabel: "Resubmit",
            cancelLabel: "Cancel",
            variant: "info",
            onConfirm: () => {
                setIsResubmitting(true);
                setSuccessMessage("");

                router.post(
                    `/billing-invoicing/${invoice.id}/resubmit`,
                    {},
                    {
                        preserveScroll: true,
                        onStart: () => setIsResubmitting(true),
                        onSuccess: () => {
                            setIsResubmitting(false);
                            setSuccessMessage(
                                `Billing record ${refOf(invoice)} has been resubmitted and is now PENDING for review.`,
                            );
                            setShowInvoiceView(false);
                        },
                        onError: (errors) => {
                            setIsResubmitting(false);
                            console.error("RESUBMIT ERROR:", errors);
                            const firstError = Object.values(errors ?? {})[0];
                            alert(
                                firstError
                                    ? String(firstError)
                                    : "Failed to resubmit the invoice. Please try again.",
                            );
                        },
                        onFinish: () => setIsResubmitting(false),
                    },
                );
            },
        });
    };

    const openSendEmailModal = (invoice: Invoice) => {
        const statusMessage =
            invoice.status === "Rejected"
                ? `\n\nRejection Reason: ${invoice.rejectionReason || "N/A"}\n\nPlease review the feedback and make the necessary adjustments.`
                : "";

        const isApprovedInvoice = invoice.status === "Approved";
        const ref = refOf(invoice);
        const docLabel = isApprovedInvoice
            ? "Service Invoice"
            : "Billing Record";

        setSendEmailData({
            email: invoice.clientEmail || "",
            subject: `${docLabel} ${ref} - ${invoice.status}`,
            message: `Dear ${invoice.client},\n\nPlease find attached the ${docLabel.toLowerCase()} ${ref} for your reference.\n\nStatus: ${invoice.status}\nAmount: ${money(invoice.amount, hideAmount)}\nDue Date: ${formatDate(invoice.dueDate)}${statusMessage}\n\nThank you,\nALIBATON Team`,
            invoiceId: invoice.id,
        });
        setShowSendEmailModal(true);
    };

    const submitSendEmail = () => {
        if (!sendEmailData.email.trim()) {
            alert("Please enter the client email.");
            return;
        }

        if (!sendEmailData.invoiceId) {
            alert("No invoice selected.");
            return;
        }

        setIsSendingEmail(true);
        setSuccessMessage("");

        router.post(
            `/billing-invoicing/${sendEmailData.invoiceId}/send-email`,
            {
                email: sendEmailData.email.trim(),
                subject: sendEmailData.subject.trim(),
                message: sendEmailData.message.trim(),
            },
            {
                preserveScroll: true,
                onStart: () => setIsSendingEmail(true),
                onSuccess: () => {
                    setIsSendingEmail(false);
                    setShowSendEmailModal(false);
                    setSuccessMessage(
                        `Invoice has been sent to ${sendEmailData.email}.`,
                    );
                    refreshData();
                },
                onError: (errors) => {
                    setIsSendingEmail(false);
                    console.error("SEND EMAIL ERROR:", errors);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to send invoice email. Please try again.",
                    );
                },
                onFinish: () => setIsSendingEmail(false),
            },
        );
    };

    const openPrintInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setShowInvoicePrint(true);
    };

    const printInvoice = () => {
        window.print();
    };

    const downloadInvoicePDF = async (invoice: Invoice) => {
        try {
            const html2canvas = (await import("html2canvas")).default;
            const { jsPDF } = await import("jspdf");

            setSelectedInvoice(invoice);

            const printElement = document.createElement("div");
            printElement.style.position = "fixed";
            printElement.style.left = "-9999px";
            printElement.style.top = "0";
            printElement.style.width = "210mm";
            printElement.style.backgroundColor = "white";
            printElement.style.padding = "20px";
            printElement.style.zIndex = "-1";

            const printContent = document.createElement("div");
            printContent.innerHTML = buildInvoiceHTML(invoice);
            printElement.appendChild(printContent);
            document.body.appendChild(printElement);

            await new Promise((resolve) => setTimeout(resolve, 300));

            const canvas = await html2canvas(printElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });

            document.body.removeChild(printElement);

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            /* Filename: Invoice No. kung approved, else Billing No. */
            pdf.save(
                `${
                    invoice.status === "Approved"
                        ? (invoice.number ?? invoice.billingNumber ?? "invoice")
                        : (invoice.billingNumber ?? "billing-record")
                }.pdf`,
            );
        } catch (error) {
            console.error("PDF DOWNLOAD ERROR:", error);
            alert(
                "Failed to generate PDF. Please try again or use the Print option.",
            );
        }
    };

    const buildInvoiceHTML = (invoice: Invoice): string => {
        const itemsHTML = invoice.items
            .map(
                (item) => `
            <tr>
                <td style="border-bottom:1px solid #ddd;padding:12px 8px;font-size:13px;">${item.description}</td>
                <td style="border-bottom:1px solid #ddd;padding:12px 8px;text-align:center;font-size:13px;">${item.quantity}</td>
                <td style="border-bottom:1px solid #ddd;padding:12px 8px;text-align:right;font-size:13px;">${money(item.unitPrice, hideAmount)}</td>
                <td style="border-bottom:1px solid #ddd;padding:12px 8px;text-align:right;font-size:13px;font-weight:bold;">${money(item.quantity * item.unitPrice, hideAmount)}</td>
            </tr>
        `,
            )
            .join("");

        const totalSales = invoice.amount;
        const vatAmount = totalSales * VAT_RATE;
        const netOfVAT = totalSales;
        const withholdingTax = 0;
        const totalAmountDue = netOfVAT + vatAmount;

        return `
            <div style="font-family:Arial,Helvetica,sans-serif;padding:20px;max-width:800px;margin:0 auto;">
                <div style="border-bottom:4px solid #1a1a2e;padding-bottom:20px;margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <h1 style="font-size:28px;font-weight:900;margin:0;color:#1a1a2e;">ALIBATON</h1>
                            <p style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:#666;margin:5px 0 0 0;">Heavy Equipment & Logistics</p>
                            <p style="font-size:11px;color:#999;margin:8px 0 0 0;">Quezon City, Metro Manila</p>
                            <p style="font-size:11px;color:#999;margin:2px 0 0 0;">VAT Reg. TIN: 123-456-789-000</p>
                        </div>
                        <div style="text-align:right;">
                            ${
                                invoice.status === "Approved"
                                    ? `<p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0;">Service Invoice</p>
                            <p style="font-size:22px;font-weight:900;margin:5px 0 0 0;color:#1a1a2e;">${invoice.number ?? ""}</p>`
                                    : `<p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0;">Billing Record</p>
                            <p style="font-size:22px;font-weight:900;margin:5px 0 0 0;color:#1a1a2e;">${invoice.billingNumber ?? ""}</p>`
                            }
                            <p style="font-size:11px;color:#999;margin:8px 0 0 0;">Date: ${formatDate(invoice.createdAt)}</p>
                            <p style="font-size:11px;color:#999;margin:2px 0 0 0;">Due: ${formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                </div>

                <div style="display:flex;gap:40px;margin-bottom:30px;">
                    <div style="flex:1;">
                        <p style="font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0 0 8px 0;">Bill To</p>
                        <p style="font-size:16px;font-weight:bold;margin:0;color:#1a1a2e;">${invoice.client}</p>
                        ${invoice.clientAddress ? `<p style="font-size:13px;color:#666;margin:5px 0 0 0;white-space:pre-line;">${invoice.clientAddress}</p>` : ""}
                        ${invoice.clientEmail ? `<p style="font-size:13px;color:#666;margin:5px 0 0 0;">${displayClientEmail(invoice.clientEmail, invoice.status)}</p>` : ""}
                        ${invoice.clientContact ? `<p style="font-size:13px;color:#666;margin:5px 0 0 0;">${invoice.clientContact}</p>` : ""}
                    </div>
                    <div style="flex:1;text-align:right;">
                        <p style="font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0 0 8px 0;">Reference</p>
                        <p style="font-size:13px;font-weight:bold;margin:0;color:#1a1a2e;">Job Order: ${invoice.jobOrderId ? `JO-${invoice.jobOrderId}` : "—"}</p>
                        <p style="font-size:13px;color:#666;margin:5px 0 0 0;">Project: ${invoice.project}</p>
                        <p style="font-size:13px;color:#666;margin:5px 0 0 0;">Payment Method: ${invoice.paymentMethod || "Bank Transfer"}</p>
                    </div>
                </div>

                <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;margin-bottom:20px;">
                    <thead>
                        <tr style="background:#f5f5f5;">
                            <th style="border-bottom:2px solid #ddd;padding:12px 8px;text-align:left;font-size:10px;text-transform:uppercase;font-weight:bold;color:#666;">Qty</th>
                            <th style="border-bottom:2px solid #ddd;padding:12px 8px;text-align:left;font-size:10px;text-transform:uppercase;font-weight:bold;color:#666;">Particulars / Description</th>
                            <th style="border-bottom:2px solid #ddd;padding:12px 8px;text-align:right;font-size:10px;text-transform:uppercase;font-weight:bold;color:#666;">Unit Price</th>
                            <th style="border-bottom:2px solid #ddd;padding:12px 8px;text-align:right;font-size:10px;text-transform:uppercase;font-weight:bold;color:#666;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHTML}</tbody>
                </table>

                <div style="display:flex;justify-content:flex-end;margin-top:10px;">
                    <div style="width:350px;">
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:13px;">
                            <span style="font-weight:600;color:#666;">Total Sales</span>
                            <span style="font-weight:bold;">${money(totalSales, hideAmount)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:13px;">
                            <span style="font-weight:600;color:#666;">VAT (12%)</span>
                            <span style="font-weight:bold;">${money(vatAmount, hideAmount)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:13px;">
                            <span style="font-weight:600;color:#666;">Net of VAT</span>
                            <span style="font-weight:bold;">${money(netOfVAT, hideAmount)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd;font-size:13px;">
                            <span style="font-weight:600;color:#666;">Withholding Tax</span>
                            <span style="font-weight:bold;">${money(withholdingTax, hideAmount)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:15px 0;font-size:20px;border-top:3px double #1a1a2e;">
                            <span style="font-weight:900;text-transform:uppercase;color:#1a1a2e;">Total Amount Due</span>
                            <span style="font-weight:900;color:#1a1a2e;">${money(totalAmountDue, hideAmount)}</span>
                        </div>
                    </div>
                </div>

                ${
                    invoice.description
                        ? `
                    <div style="border-top:1px solid #ddd;padding-top:15px;margin-top:20px;">
                        <p style="font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0 0 5px 0;">Description</p>
                        <p style="font-size:13px;line-height:1.6;color:#666;white-space:pre-line;margin:0;">${invoice.description}</p>
                    </div>
                `
                        : ""
                }

                ${
                    invoice.notes
                        ? `
                    <div style="margin-top:15px;">
                        <p style="font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0 0 5px 0;">Notes</p>
                        <p style="font-size:13px;line-height:1.6;color:#666;white-space:pre-line;margin:0;">${invoice.notes}</p>
                    </div>
                `
                        : ""
                }

                <div style="border-top:2px solid #1a1a2e;padding-top:15px;margin-top:30px;display:flex;justify-content:space-between;align-items:flex-end;">
                    <div>
                        <p style="font-size:11px;font-weight:bold;margin:0;color:#1a1a2e;">ALIBATON</p>
                        <p style="font-size:9px;color:#999;margin:5px 0 0 0;">Heavy Equipment & Logistics Management System</p>
                    </div>
                    <div style="text-align:right;">
                        <p style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0;">Status</p>
                        <p style="font-size:12px;font-weight:bold;text-transform:uppercase;margin:5px 0 0 0;color:#1a1a2e;">${invoice.status}</p>
                    </div>
                </div>
            </div>
        `;
    };

    return (
        <>
            <Head title="Billing & Invoicing" />

            <style>{`
                .billing-scroll::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .billing-scroll::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 999px;
                }
                .billing-scroll::-webkit-scrollbar-thumb {
                    background: rgba(250, 204, 21, 0.4);
                    border-radius: 999px;
                    border: 1px solid rgba(250, 204, 21, 0.2);
                }
                .billing-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(250, 204, 21, 0.7);
                }
                .billing-scroll::-webkit-scrollbar-corner {
                    background: transparent;
                }
                .billing-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(250, 204, 21, 0.5) rgba(15, 23, 42, 0.5);
                }
                @keyframes confirm-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes confirm-scale-in {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .confirm-overlay {
                    animation: confirm-fade-in 0.2s ease-out;
                }
                .confirm-card {
                    animation: confirm-scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes notif-pop {
                    from { opacity: 0; transform: translateY(-6px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .notif-pop {
                    animation: notif-pop 0.2s ease-out;
                }
            `}</style>

            <UserLayout>
                <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
                    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                        {/* HEADER */}
                        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                        <Receipt size={25} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black uppercase tracking-wide text-gray-900 dark:text-white sm:text-3xl">
                                            Billing & Invoicing
                                        </h1>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                                            ALIBATON Heavy Equipment & Logistics
                                            Management System
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SUCCESS */}
                        {(flashSuccess || successMessage) && (
                            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 shadow-lg shadow-emerald-950/20">
                                <CheckCircle2
                                    size={22}
                                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                                        Success
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-emerald-600/80 dark:text-emerald-400/80">
                                        {successMessage || flashSuccess}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSuccessMessage("")}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-400/10 hover:text-emerald-600 dark:hover:text-emerald-300"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        )}

                        {/* ERROR */}
                        {flashError && (
                            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm text-red-600 dark:text-red-300">
                                <AlertCircle
                                    size={20}
                                    className="mt-0.5 shrink-0"
                                />
                                <span>{flashError}</span>
                            </div>
                        )}

                        {/* TABS */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <TabCard
                                active={activeTab === "job-orders"}
                                icon={<BriefcaseBusiness size={27} />}
                                title="Job Order"
                                count={jobOrders.length}
                                subtitle="Approved quotations ready for monthly billing"
                                onClick={() => {
                                    setActiveTab("job-orders");
                                    setSearch("");
                                    setInvoiceStatusFilter("All");
                                }}
                            />
                            <TabCard
                                active={activeTab === "billing-records"}
                                icon={<Wallet size={27} />}
                                title="Billing Records"
                                count={billingRecords.length}
                                subtitle="Monthly billing per Job Order"
                                onClick={() => {
                                    setActiveTab("billing-records");
                                    setSearch("");
                                    setInvoiceStatusFilter("All");
                                }}
                            />
                            <TabCard
                                active={activeTab === "service-invoice"}
                                icon={<FileText size={27} />}
                                title="Service Invoice"
                                count={serviceInvoices.length}
                                subtitle="One-off invoices without a Job Order"
                                onClick={() => {
                                    setActiveTab("service-invoice");
                                    setSearch("");
                                    setInvoiceStatusFilter("All");
                                }}
                            />
                        </div>

                        {/* JOB ORDERS */}
                        {activeTab === "job-orders" && (
                            <section className="mt-6 overflow-hidden rounded-3xl border border-yellow-400/10 bg-white dark:bg-slate-900/80 shadow-2xl shadow-black/30">
                                <div className="border-b border-gray-200 dark:border-slate-800 p-5 sm:p-6">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <BriefcaseBusiness
                                                    size={20}
                                                    className="text-yellow-600 dark:text-yellow-400"
                                                />
                                                <h2 className="text-lg font-black uppercase tracking-wide">
                                                    Job Orders
                                                </h2>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
                                                Create a billing record per
                                                month based on the approved
                                                quotation.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            {/* ✅ HIDE / SHOW MONEY */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setHideAmount((v) => !v)
                                                }
                                                aria-label={
                                                    hideAmount
                                                        ? "Show amounts"
                                                        : "Hide amounts"
                                                }
                                                title={
                                                    hideAmount
                                                        ? "Show amounts"
                                                        : "Hide amounts"
                                                }
                                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                                            >
                                                {hideAmount ? (
                                                    <EyeOff size={17} />
                                                ) : (
                                                    <Eye size={17} />
                                                )}
                                            </button>

                                            <div className="relative min-w-0 sm:w-72">
                                                <Search
                                                    size={18}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500"
                                                />
                                                <input
                                                    value={search}
                                                    onChange={(event) =>
                                                        setSearch(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Search Job Order..."
                                                    className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 py-3 pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                                />
                                            </div>

                                            {/* ✅ CREATE JOB ORDER */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowCreateJobOrder(true)
                                                }
                                                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-xs font-black uppercase tracking-wide text-black transition hover:bg-yellow-300"
                                            >
                                                <Plus size={16} />
                                                Create Job Order
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="billing-scroll"
                                    style={{
                                        maxHeight:
                                            jobOrderShouldScroll &&
                                            jobOrderMaxHeight
                                                ? `${jobOrderMaxHeight}px`
                                                : undefined,
                                        overflowY: jobOrderShouldScroll
                                            ? "auto"
                                            : "visible",
                                    }}
                                >
                                    <JobOrderTable
                                        jobOrders={filteredJobOrders}
                                        onView={openJobOrder}
                                        onCreateBilling={openCreateBilling}
                                        hideAmount={hideAmount}
                                    />
                                </div>
                            </section>
                        )}

                        {/* BILLING RECORDS / SERVICE INVOICE */}
                        {(activeTab === "billing-records" ||
                            activeTab === "service-invoice") && (
                            <section className="mt-6">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <SummaryCard
                                        icon={<Clock size={20} />}
                                        label="Pending"
                                        value={activeCounts.pending}
                                        active={
                                            invoiceStatusFilter === "Pending"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Pending")
                                        }
                                        color="yellow"
                                    />
                                    <SummaryCard
                                        icon={<CheckCircle2 size={20} />}
                                        label="Approved"
                                        value={activeCounts.approved}
                                        active={
                                            invoiceStatusFilter === "Approved"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Approved")
                                        }
                                        color="emerald"
                                    />
                                    <SummaryCard
                                        icon={<Ban size={20} />}
                                        label="Rejected"
                                        value={activeCounts.rejected}
                                        active={
                                            invoiceStatusFilter === "Rejected"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Rejected")
                                        }
                                        color="red"
                                    />
                                </div>

                                <section className="mt-5 overflow-hidden rounded-3xl border border-yellow-400/10 bg-white dark:bg-slate-900/80 shadow-2xl shadow-black/30">
                                    <div className="border-b border-gray-200 dark:border-slate-800 p-5 sm:p-6">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {activeTab ===
                                                    "billing-records" ? (
                                                        <Wallet
                                                            size={20}
                                                            className="text-yellow-600 dark:text-yellow-400"
                                                        />
                                                    ) : (
                                                        <FileText
                                                            size={20}
                                                            className="text-yellow-600 dark:text-yellow-400"
                                                        />
                                                    )}
                                                    <h2 className="text-lg font-black uppercase tracking-wide">
                                                        {activeTab ===
                                                        "billing-records"
                                                            ? "Billing Records"
                                                            : "Service Invoice"}
                                                    </h2>
                                                </div>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
                                                    {activeTab ===
                                                    "billing-records"
                                                        ? "Monthly billing records from Job Orders. Billing No. + Job Order No. — walang invoice number hangga't hindi na-approve."
                                                        : "Approved na billing, naging Service Invoice. May Invoice No., Billing No., at Job Order No."}
                                                    {invoiceShouldScroll && (
                                                        <span className="ml-2 text-yellow-600/60 dark:text-yellow-400/60">
                                                            (scroll to view
                                                            more)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <div className="relative min-w-0 sm:w-80">
                                                    <Search
                                                        size={18}
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500"
                                                    />
                                                    <input
                                                        value={search}
                                                        onChange={(event) =>
                                                            setSearch(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder={
                                                            activeTab ===
                                                            "billing-records"
                                                                ? "Search billing record..."
                                                                : "Search invoice..."
                                                        }
                                                        className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 py-3 pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                                    />
                                                </div>
                                                <select
                                                    value={invoiceStatusFilter}
                                                    onChange={(event) =>
                                                        setInvoiceStatusFilter(
                                                            event.target
                                                                .value as
                                                                | "All"
                                                                | InvoiceStatus,
                                                        )
                                                    }
                                                    className="rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-slate-200 outline-none focus:border-yellow-400/50"
                                                >
                                                    <option value="All">
                                                        All Status
                                                    </option>
                                                    <option value="Pending">
                                                        Pending
                                                    </option>
                                                    <option value="Approved">
                                                        Approved
                                                    </option>
                                                    <option value="Rejected">
                                                        Rejected
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="billing-scroll"
                                        style={{
                                            maxHeight:
                                                invoiceShouldScroll &&
                                                invoiceMaxHeight
                                                    ? `${invoiceMaxHeight}px`
                                                    : undefined,
                                            overflowY: invoiceShouldScroll
                                                ? "auto"
                                                : "visible",
                                        }}
                                    >
                                        <InvoiceTable
                                            invoices={activeFilteredInvoices}
                                            showServiceMonth={
                                                activeTab === "billing-records"
                                            }
                                            onView={openInvoice}
                                            onPrint={openPrintInvoice}
                                            onDownload={downloadInvoicePDF}
                                            onSendEmail={openSendEmailModal}
                                            isSendingEmail={isSendingEmail}
                                            hideAmount={hideAmount}
                                            onToggleHideAmount={() =>
                                                setHideAmount((v) => !v)
                                            }
                                        />
                                    </div>
                                </section>
                            </section>
                        )}
                    </div>
                </div>
            </UserLayout>

            {/* JOB ORDER VIEW */}
            {showJobOrderView && selectedJobOrder && (
                <Modal
                    title="Job Order Details"
                    onClose={() => setShowJobOrderView(false)}
                    size="lg"
                >
                    <JobOrderDetails
                        jobOrder={selectedJobOrder}
                        hideAmount={hideAmount}
                    />
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setShowJobOrderView(false)}
                            className="rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                            Close
                        </button>
                        {isFullyBilled(selectedJobOrder) ? (
                            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-5 py-3 text-sm font-black text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={17} /> Completed
                            </span>
                        ) : selectedJobOrder.canCreateBilling === false ? (
                            /* 🔒 LOCKED — may Pending billing na */
                            <span
                                title="May billing record na naghihintay ng admin verification. Hindi ka makapag-create hanggang ma-approve o ma-reject ng admin."
                                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/5 px-5 py-3 text-sm font-black text-yellow-600 dark:text-yellow-400"
                            >
                                <Clock size={17} /> Awaiting Verification
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    openCreateBilling(selectedJobOrder)
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
                            >
                                <Wallet size={17} />
                                {(selectedJobOrder.rejectedCount ?? 0) > 0
                                    ? "Re-create Billing"
                                    : "Create Billing"}
                            </button>
                        )}
                    </div>
                </Modal>
            )}

            {/* CREATE BILLING */}
            {billingJobOrder && (
                <CreateBillingModal
                    jobOrder={billingJobOrder}
                    hideAmount={hideAmount}
                    isSubmitting={isCreatingBilling}
                    onClose={closeCreateBilling}
                    onSubmit={submitCreateBilling}
                />
            )}

            {/* ✅ CREATE JOB ORDER */}
            {showCreateJobOrder && (
                <CreateJobOrderModal
                    isSubmitting={isCreatingJobOrder}
                    onClose={() => setShowCreateJobOrder(false)}
                    onSubmit={submitCreateJobOrder}
                />
            )}

            {/* INVOICE VIEW */}
            {showInvoiceView && selectedInvoice && (
                <Modal
                    title={
                        selectedInvoice.status === "Approved"
                            ? `Service Invoice ${selectedInvoice.number ?? ""}`
                            : `Billing Record ${selectedInvoice.billingNumber ?? ""}`
                    }
                    onClose={() => setShowInvoiceView(false)}
                    size="lg"
                >
                    <InvoiceDetails
                        invoice={selectedInvoice}
                        onResubmit={
                            selectedInvoice.status === "Rejected"
                                ? resubmitInvoice
                                : undefined
                        }
                        isResubmitting={isResubmitting}
                        onSendEmail={
                            selectedInvoice.status === "Approved" ||
                            selectedInvoice.status === "Rejected"
                                ? openSendEmailModal
                                : undefined
                        }
                        isSendingEmail={isSendingEmail}
                        hideAmount={hideAmount}
                    />
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setShowInvoiceView(false)}
                            className="rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                            Close
                        </button>
                        {selectedInvoice.status === "Rejected" && (
                            <button
                                type="button"
                                onClick={() => resubmitInvoice(selectedInvoice)}
                                disabled={isResubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RotateCcw
                                    size={17}
                                    className={
                                        isResubmitting ? "animate-spin" : ""
                                    }
                                />
                                {isResubmitting
                                    ? "Resubmitting..."
                                    : "Resubmit for Review"}
                            </button>
                        )}
                        {(selectedInvoice.status === "Approved" ||
                            selectedInvoice.status === "Rejected") && (
                            <button
                                type="button"
                                onClick={() =>
                                    openSendEmailModal(selectedInvoice)
                                }
                                disabled={isSendingEmail}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSendingEmail ? (
                                    <>
                                        <RefreshCw
                                            size={17}
                                            className="animate-spin"
                                        />{" "}
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={17} /> Send to Client
                                    </>
                                )}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setShowInvoiceView(false);
                                openPrintInvoice(selectedInvoice);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black hover:bg-yellow-300"
                        >
                            <Printer size={17} /> Print
                        </button>
                    </div>
                </Modal>
            )}

            {/* SEND EMAIL MODAL */}
            {showSendEmailModal && (
                <Modal
                    title="Send Invoice to Client"
                    onClose={() => {
                        if (!isSendingEmail) setShowSendEmailModal(false);
                    }}
                    size="lg"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            submitSendEmail();
                        }}
                        className="space-y-5"
                    >
                        <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4">
                            <div className="flex items-center gap-3">
                                <Send
                                    size={24}
                                    className="text-blue-600 dark:text-blue-400"
                                />
                                <div>
                                    <p className="font-bold text-blue-600 dark:text-blue-400">
                                        Send Invoice Email
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">
                                        The client will receive this invoice via
                                        email.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Client Email{" "}
                                <span className="text-red-600 dark:text-red-400">
                                    *
                                </span>
                            </label>
                            <input
                                type="email"
                                value={sendEmailData.email}
                                onChange={(e) =>
                                    setSendEmailData((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                placeholder="client@example.com"
                                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10"
                                disabled={isSendingEmail}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Subject
                            </label>
                            <input
                                type="text"
                                value={sendEmailData.subject}
                                onChange={(e) =>
                                    setSendEmailData((prev) => ({
                                        ...prev,
                                        subject: e.target.value,
                                    }))
                                }
                                placeholder="Invoice subject"
                                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10"
                                disabled={isSendingEmail}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Message
                            </label>
                            <textarea
                                rows={8}
                                value={sendEmailData.message}
                                onChange={(e) =>
                                    setSendEmailData((prev) => ({
                                        ...prev,
                                        message: e.target.value,
                                    }))
                                }
                                placeholder="Write your message to the client..."
                                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 resize-y"
                                disabled={isSendingEmail}
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowSendEmailModal(false)}
                                disabled={isSendingEmail}
                                className="rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    isSendingEmail ||
                                    !sendEmailData.email.trim()
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSendingEmail ? (
                                    <>
                                        <RefreshCw
                                            size={17}
                                            className="animate-spin"
                                        />{" "}
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={17} /> Send Invoice
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* CUSTOM CONFIRM DIALOG */}
            {confirmDialog.open && (
                <div
                    className="confirm-overlay fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    onClick={closeConfirm}
                >
                    <div
                        className="confirm-card w-full max-w-md overflow-hidden rounded-3xl border border-yellow-400/20 bg-white dark:bg-slate-900 shadow-[0_25px_80px_-20px_rgba(250,204,21,0.25)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={[
                                "relative flex items-start gap-4 border-b p-6",
                                confirmDialog.variant === "warning"
                                    ? "border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-transparent"
                                    : confirmDialog.variant === "danger"
                                      ? "border-red-400/20 bg-gradient-to-br from-red-400/10 to-transparent"
                                      : confirmDialog.variant === "success"
                                        ? "border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-transparent"
                                        : "border-blue-400/20 bg-gradient-to-br from-blue-400/10 to-transparent",
                            ].join(" ")}
                        >
                            <div
                                className={[
                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                                    confirmDialog.variant === "warning"
                                        ? "border-yellow-400/30 bg-yellow-400/15 text-yellow-600 dark:text-yellow-400"
                                        : confirmDialog.variant === "danger"
                                          ? "border-red-400/30 bg-red-400/15 text-red-600 dark:text-red-400"
                                          : confirmDialog.variant === "success"
                                            ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-600 dark:text-emerald-400"
                                            : "border-blue-400/30 bg-blue-400/15 text-blue-600 dark:text-blue-400",
                                ].join(" ")}
                            >
                                {confirmDialog.variant === "warning" ? (
                                    <AlertTriangle size={24} />
                                ) : confirmDialog.variant === "danger" ? (
                                    <AlertCircle size={24} />
                                ) : confirmDialog.variant === "success" ? (
                                    <CheckCircle2 size={24} />
                                ) : (
                                    <AlertCircle size={24} />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                    {confirmDialog.title}
                                </h3>
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                    {confirmDialog.variant === "warning"
                                        ? "Action Required"
                                        : confirmDialog.variant === "danger"
                                          ? "Dangerous Action"
                                          : confirmDialog.variant === "success"
                                            ? "Confirmation"
                                            : "Please Confirm"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeConfirm}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 dark:text-slate-500 transition hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-slate-300">
                                {confirmDialog.message}
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 p-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeConfirm}
                                className="rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                            >
                                {confirmDialog.cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    confirmDialog.onConfirm();
                                    closeConfirm();
                                }}
                                className={[
                                    "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition",
                                    confirmDialog.variant === "warning"
                                        ? "bg-yellow-400 text-black hover:bg-yellow-300"
                                        : confirmDialog.variant === "danger"
                                          ? "bg-red-500 text-white hover:bg-red-400"
                                          : confirmDialog.variant === "success"
                                            ? "bg-emerald-500 text-white hover:bg-emerald-400"
                                            : "bg-blue-500 text-white hover:bg-blue-400",
                                ].join(" ")}
                            >
                                {confirmDialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT */}
            {showInvoicePrint && selectedInvoice && (
                <div className="fixed inset-0 z-[100] overflow-auto bg-black/90 p-4 print:static print:bg-white print:p-0">
                    <div className="mx-auto flex min-h-full max-w-[900px] items-start justify-center py-6 print:block print:max-w-none print:py-0">
                        <div
                            ref={printRef}
                            className="w-full bg-white text-slate-900 shadow-2xl print:shadow-none"
                        >
                            <PrintPreview
                                invoice={selectedInvoice}
                                hideAmount={hideAmount}
                            />
                        </div>
                    </div>

                    <div className="fixed bottom-5 left-1/2 z-[110] flex -translate-x-1/2 gap-2 rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950/95 p-2 shadow-2xl print:hidden">
                        <button
                            type="button"
                            onClick={printInvoice}
                            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black hover:bg-yellow-300"
                        >
                            <Printer size={17} /> Print
                        </button>
                        <button
                            type="button"
                            onClick={() => downloadInvoicePDF(selectedInvoice)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                        >
                            <Download size={17} /> PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowInvoicePrint(false)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                            <X size={17} /> Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

/*
|--------------------------------------------------------------------------
| COMPONENTS
|--------------------------------------------------------------------------
*/

function TabCard({
    active,
    icon,
    title,
    count,
    subtitle,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    title: string;
    count: number;
    subtitle: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "group relative overflow-hidden rounded-3xl border p-5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 sm:p-6",
                active
                    ? "border-yellow-400/70 bg-yellow-400/10 shadow-[0_0_35px_rgba(250,204,21,0.10)]"
                    : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-yellow-400/40 hover:bg-white dark:hover:bg-slate-900",
            ].join(" ")}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                    <div
                        className={[
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition",
                            active
                                ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                                : "border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 group-hover:border-yellow-400/30 group-hover:text-yellow-600 dark:group-hover:text-yellow-400",
                        ].join(" ")}
                    >
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p
                            className={[
                                "text-lg font-black uppercase tracking-wider",
                                active
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-gray-900 dark:text-white",
                            ].join(" ")}
                        >
                            {title}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p
                        className={[
                            "text-2xl font-black sm:text-3xl",
                            active
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-gray-900 dark:text-white",
                        ].join(" ")}
                    >
                        {count}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        {count === 1 ? "record" : "records"}
                    </p>
                </div>
            </div>
            {active && (
                <>
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400" />
                </>
            )}
        </button>
    );
}

function SummaryCard({
    icon,
    label,
    value,
    active,
    onClick,
    color = "slate",
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
    color?: "slate" | "yellow" | "orange" | "emerald" | "red" | "blue";
}) {
    const colorMap = {
        slate: {
            base: "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-gray-300 dark:hover:border-slate-700",
            active: "border-slate-400/40 bg-slate-400/[0.08] shadow-lg shadow-slate-400/5",
            iconBase: "text-gray-500 dark:text-slate-500",
            iconActive: "text-gray-800 dark:text-slate-200",
            valueBase: "text-gray-900 dark:text-white",
            valueActive: "text-gray-900 dark:text-slate-100",
            dot: "bg-slate-400",
        },
        yellow: {
            base: "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-yellow-400/40",
            active: "border-yellow-400/50 bg-yellow-400/[0.08] shadow-lg shadow-yellow-400/5",
            iconBase: "text-gray-500 dark:text-slate-500",
            iconActive: "text-yellow-600 dark:text-yellow-400",
            valueBase: "text-gray-900 dark:text-white",
            valueActive: "text-yellow-600 dark:text-yellow-300",
            dot: "bg-yellow-400",
        },
        orange: {
            base: "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-orange-400/40",
            active: "border-orange-400/50 bg-orange-400/[0.08] shadow-lg shadow-orange-400/5",
            iconBase: "text-gray-500 dark:text-slate-500",
            iconActive: "text-orange-600 dark:text-orange-400",
            valueBase: "text-gray-900 dark:text-white",
            valueActive: "text-orange-600 dark:text-orange-300",
            dot: "bg-orange-400",
        },
        emerald: {
            base: "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-emerald-400/40",
            active: "border-emerald-400/50 bg-emerald-400/[0.08] shadow-lg shadow-emerald-400/5",
            iconBase: "text-gray-500 dark:text-slate-500",
            iconActive: "text-emerald-600 dark:text-emerald-400",
            valueBase: "text-gray-900 dark:text-white",
            valueActive: "text-emerald-600 dark:text-emerald-300",
            dot: "bg-emerald-400",
        },
        red: {
            base: "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-red-400/40",
            active: "border-red-400/50 bg-red-400/[0.08] shadow-lg shadow-red-400/5",
            iconBase: "text-gray-500 dark:text-slate-500",
            iconActive: "text-red-600 dark:text-red-400",
            valueBase: "text-gray-900 dark:text-white",
            valueActive: "text-red-600 dark:text-red-300",
            dot: "bg-red-400",
        },
        blue: {
            base: "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-400/40",
            active: "border-blue-400/50 bg-blue-400/[0.08] shadow-lg shadow-blue-400/5",
            iconBase: "text-gray-500 dark:text-slate-500",
            iconActive: "text-blue-600 dark:text-blue-400",
            valueBase: "text-gray-900 dark:text-white",
            valueActive: "text-blue-600 dark:text-blue-300",
            dot: "bg-blue-400",
        },
    };

    const c = colorMap[color];

    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-yellow-400/30",
                active ? c.active : c.base,
            ].join(" ")}
            aria-pressed={active}
        >
            <div className="flex items-center justify-between gap-3">
                <div
                    className={[
                        "transition-colors",
                        active ? c.iconActive : c.iconBase,
                    ].join(" ")}
                >
                    {icon}
                </div>
                <span
                    className={[
                        "text-2xl font-black transition-colors",
                        active ? c.valueActive : c.valueBase,
                    ].join(" ")}
                >
                    {value}
                </span>
            </div>
            <p
                className={[
                    "mt-3 text-xs font-bold uppercase tracking-wider transition-colors",
                    active
                        ? "text-gray-700 dark:text-slate-300"
                        : "text-gray-500 dark:text-slate-500",
                ].join(" ")}
            >
                {label}
            </p>

            {active && (
                <span
                    className={[
                        "absolute bottom-0 left-0 right-0 h-0.5",
                        c.dot,
                    ].join(" ")}
                />
            )}
        </button>
    );
}

function JobOrderTable({
    jobOrders,
    onView,
    onCreateBilling,
    hideAmount,
}: {
    jobOrders: JobOrder[];
    onView: (jobOrder: JobOrder) => void;
    onCreateBilling: (jobOrder: JobOrder) => void;
    hideAmount: boolean;
}) {
    if (jobOrders.length === 0) {
        return (
            <EmptyState
                icon={<BriefcaseBusiness size={28} />}
                title="No Job Orders Found"
                description="There are no Job Orders matching your search."
            />
        );
    }

    return (
        <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/70">
                    <th className="w-[11%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Job Order
                    </th>
                    <th className="w-[15%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Client
                    </th>
                    <th className="w-[14%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Project
                    </th>
                    <th className="w-[13%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Equipment
                    </th>
                    <th className="w-[13%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Service Date
                    </th>
                    <th className="w-[9%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Amount
                    </th>
                    <th className="w-[9%] px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Status
                    </th>
                    <th className="w-[16%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Action
                    </th>
                </tr>
            </thead>
            <tbody>
                {jobOrders.map((jobOrder) => {
                    const billedCount = getBilledCount(jobOrder);
                    const billingMonths = getBillingMonths(jobOrder);
                    const fullyBilled = isFullyBilled(jobOrder);
                    const nextMonth = getNextBillableMonth(jobOrder);

                    /* ✅ LOCK: isang Pending billing lang kada JO */
                    const pendingCount = jobOrder.pendingCount ?? 0;
                    const rejectedCount = jobOrder.rejectedCount ?? 0;
                    const awaitingVerification =
                        pendingCount > 0 && jobOrder.canCreateBilling === false;
                    const canCreate = jobOrder.canCreateBilling ?? !fullyBilled;

                    return (
                        <tr
                            key={jobOrder.id}
                            className="border-b border-gray-200 dark:border-slate-800/70 transition hover:bg-yellow-400/[0.025]"
                        >
                            <td className="px-3 py-3 align-top">
                                <button
                                    type="button"
                                    onClick={() => onView(jobOrder)}
                                    className="text-left"
                                >
                                    <p className="truncate text-xs font-black text-gray-900 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400">
                                        {getJobOrderNumber(jobOrder)}
                                    </p>
                                    {rejectedCount > 0 && (
                                        <p className="mt-0.5 truncate text-[10px] font-bold text-red-600 dark:text-red-400">
                                            Billing rejected
                                        </p>
                                    )}
                                </button>
                            </td>

                            <td className="px-3 py-3 align-top">
                                <div className="flex items-start gap-1.5">
                                    <UserRound
                                        size={12}
                                        className="mt-0.5 shrink-0 text-slate-600"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] font-semibold text-gray-800 dark:text-slate-200">
                                            {jobOrder.client ?? "—"}
                                        </p>
                                        {jobOrder.clientEmail && (
                                            <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                                {maskEmail(
                                                    jobOrder.clientEmail,
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>

                            <td className="px-3 py-3 align-top">
                                <p className="truncate text-[11px] text-gray-700 dark:text-slate-300">
                                    {jobOrder.project ?? "—"}
                                </p>
                                {jobOrder.location && (
                                    <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-600">
                                        <MapPin
                                            size={10}
                                            className="shrink-0"
                                        />
                                        <span className="truncate">
                                            {jobOrder.location}
                                        </span>
                                    </p>
                                )}
                            </td>

                            <td className="px-3 py-3 align-top">
                                <p className="truncate text-[11px] text-gray-700 dark:text-slate-300">
                                    {jobOrder.equipment ?? "—"}
                                </p>
                                {jobOrder.operator && (
                                    <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                        Operator: {jobOrder.operator}
                                    </p>
                                )}
                            </td>

                            {/* ✅ SERVICE DATE = MONTHLY */}
                            <td className="px-3 py-3 align-top">
                                <div className="flex items-start gap-1.5">
                                    <CalendarDays
                                        size={12}
                                        className={[
                                            "mt-0.5 shrink-0",
                                            fullyBilled
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-slate-600",
                                        ].join(" ")}
                                    />
                                    <div className="min-w-0">
                                        <p
                                            className={[
                                                "truncate text-[11px] font-semibold",
                                                fullyBilled
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-gray-700 dark:text-slate-300",
                                            ].join(" ")}
                                        >
                                            {fullyBilled
                                                ? "Fully Billed"
                                                : formatMonth(nextMonth)}
                                        </p>
                                        <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                            {billingMonths > 0
                                                ? `${billedCount} of ${billingMonths} month${
                                                      billingMonths > 1
                                                          ? "s"
                                                          : ""
                                                  } billed`
                                                : billedCount > 0
                                                  ? `${billedCount} month${
                                                        billedCount > 1
                                                            ? "s"
                                                            : ""
                                                    } billed`
                                                  : "Not yet billed"}
                                        </p>
                                    </div>
                                </div>
                            </td>

                            <td className="px-3 py-3 align-top">
                                <p className="truncate text-right text-xs font-black text-gray-900 dark:text-white">
                                    {money(
                                        getJobOrderAmount(jobOrder),
                                        hideAmount,
                                    )}
                                </p>
                            </td>

                            <td className="px-3 py-3 text-center align-top">
                                <StatusBadge
                                    status={
                                        jobOrder.billingStatus ??
                                        jobOrder.status ??
                                        "Pending"
                                    }
                                />
                                {awaitingVerification && (
                                    <p className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-yellow-600 dark:text-yellow-400">
                                        Awaiting
                                        <br />
                                        Verification
                                    </p>
                                )}
                            </td>

                            <td className="px-3 py-3 align-top">
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onView(jobOrder)}
                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-gray-300 dark:border-slate-700 px-2 text-[10px] font-bold text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/40 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-yellow-600 dark:hover:text-yellow-400"
                                    >
                                        <Eye size={12} />
                                        View
                                    </button>

                                    {fullyBilled ? (
                                        <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={12} />
                                            Completed
                                        </span>
                                    ) : awaitingVerification ? (
                                        /* 🔒 LOCKED — hintayin ang admin */
                                        <span
                                            title="May billing record na naghihintay ng admin verification. Hindi ka makakapag-create hanggang ma-approve o ma-reject."
                                            className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg border border-yellow-400/25 bg-yellow-400/5 px-2 text-[10px] font-bold text-yellow-600 dark:text-yellow-400"
                                        >
                                            <Clock size={12} />
                                            Created
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onCreateBilling(jobOrder)
                                            }
                                            title={
                                                rejectedCount > 0
                                                    ? `May na-reject na billing. Gumawa ng corrected billing para sa ${formatMonth(
                                                          nextMonth,
                                                      )}.`
                                                    : `Create billing record for ${formatMonth(
                                                          nextMonth,
                                                      )}`
                                            }
                                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-yellow-400 px-2 text-[10px] font-black text-black transition hover:bg-yellow-300"
                                        >
                                            <Wallet size={12} />
                                            {rejectedCount > 0
                                                ? "Re-create"
                                                : "Create Billing"}
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function InvoiceTable({
    invoices,
    showServiceMonth = false,
    onView,
    onPrint,
    onDownload,
    onSendEmail,
    isSendingEmail,
    hideAmount,
    onToggleHideAmount,
}: {
    invoices: Invoice[];
    showServiceMonth?: boolean;
    onView: (invoice: Invoice) => void;
    onPrint: (invoice: Invoice) => void;
    onDownload: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
    isSendingEmail: boolean;
    hideAmount: boolean;
    onToggleHideAmount: () => void;
}) {
    if (invoices.length === 0) {
        return (
            <EmptyState
                icon={
                    showServiceMonth ? (
                        <Wallet size={28} />
                    ) : (
                        <FileText size={28} />
                    )
                }
                title={
                    showServiceMonth
                        ? "No Billing Records Found"
                        : "No Approved Billing Yet"
                }
                description={
                    showServiceMonth
                        ? "Create a billing record from a Job Order to bill a specific month."
                        : "Lalabas lang dito pag na-approve na ng admin ang billing. Doon na nabubuo ang Invoice No."
                }
            />
        );
    }

    return (
        <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/70">
                    {/*
                    |------------------------------------------------------------------
                    | ✅ Billing Records: Billing No. + Job Order No. — WALANG invoice.
                    | ✅ Service Invoice: Invoice No. (may JO No. at Billing No. sa ilalim)
                    */}
                    <th className="w-[14%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        {showServiceMonth ? "Billing No." : "Invoice No."}
                    </th>
                    <th className="w-[10%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Job Order
                    </th>
                    <th className="w-[15%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Client
                    </th>
                    <th className="w-[14%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Project
                    </th>
                    {showServiceMonth && (
                        <th className="w-[11%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                            Service Date
                        </th>
                    )}
                    <th className="w-[11%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Amount
                    </th>
                    <th className="w-[10%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Due Date
                    </th>
                    <th className="w-[10%] px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Status
                    </th>
                    <th className="w-[17%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody>
                {invoices.map((invoice) => {
                    const hasBreakdown =
                        (invoice.vatAmount ?? 0) > 0 ||
                        (invoice.additionalCharges ?? 0) > 0;

                    return (
                        <tr
                            key={invoice.id}
                            className="border-b border-gray-200 dark:border-slate-800/70 transition hover:bg-yellow-400/[0.025]"
                        >
                            <td className="px-3 py-3 align-top">
                                <button
                                    type="button"
                                    onClick={() => onView(invoice)}
                                    className="text-left"
                                >
                                    {/*
                                    |--------------------------------------------------------------
                                    | SERVICE INVOICE (approved) → Invoice No. ang pangunahing
                                    | numero, at Billing No. + Job Order No. sa ilalim.
                                    |
                                    | BILLING RECORDS → Billing No. lang. Walang invoice number
                                    | hangga't hindi na-approve ng admin.
                                    */}
                                    <p className="truncate text-xs font-black text-gray-900 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400">
                                        {showServiceMonth
                                            ? (invoice.billingNumber ?? "—")
                                            : (invoice.number ??
                                              invoice.billingNumber ??
                                              "—")}
                                    </p>
                                    {showServiceMonth ? (
                                        <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                            {formatDate(invoice.createdAt)}
                                        </p>
                                    ) : (
                                        invoice.billingNumber && (
                                            <p className="mt-0.5 truncate text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                                                {invoice.billingNumber}
                                            </p>
                                        )
                                    )}
                                </button>
                            </td>

                            <td className="px-3 py-3 align-top">
                                {invoice.jobOrderNumber ? (
                                    <span className="inline-flex truncate rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-2 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                                        {invoice.jobOrderNumber}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-600">
                                        —
                                    </span>
                                )}
                            </td>

                            <td className="px-3 py-3 align-top">
                                <p className="truncate text-[11px] font-semibold text-gray-800 dark:text-slate-200">
                                    {invoice.client}
                                </p>
                                {invoice.clientEmail && (
                                    <p
                                        className={[
                                            "mt-0.5 truncate text-[10px]",
                                            invoice.status === "Approved"
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-slate-600",
                                        ].join(" ")}
                                        title={
                                            invoice.status === "Approved"
                                                ? invoice.clientEmail
                                                : undefined
                                        }
                                    >
                                        {displayClientEmail(
                                            invoice.clientEmail,
                                            invoice.status,
                                        )}
                                    </p>
                                )}
                            </td>

                            <td className="px-3 py-3 align-top">
                                <p className="truncate text-[11px] text-gray-700 dark:text-slate-300">
                                    {invoice.project}
                                </p>
                            </td>

                            {/* ✅ SERVICE DATE = MONTHLY (billing records) */}
                            {showServiceMonth && (
                                <td className="px-3 py-3 align-top">
                                    {invoice.serviceMonth ? (
                                        <div className="flex items-start gap-1.5">
                                            <CalendarDays
                                                size={12}
                                                className="mt-0.5 shrink-0 text-slate-600"
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate text-[11px] font-semibold text-gray-800 dark:text-slate-200">
                                                    {formatMonth(
                                                        invoice.serviceMonth,
                                                    )}
                                                </p>
                                                {invoice.billingSequence && (
                                                    <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                                        Month{" "}
                                                        {
                                                            invoice.billingSequence
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-600">
                                            —
                                        </span>
                                    )}
                                </td>
                            )}

                            <td className="px-3 py-3 align-top">
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={onToggleHideAmount}
                                        aria-label={
                                            hideAmount
                                                ? "Show amounts"
                                                : "Hide amounts"
                                        }
                                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-500 dark:text-slate-500 transition hover:text-yellow-600 dark:hover:text-yellow-400"
                                    >
                                        {hideAmount ? (
                                            <EyeOff size={12} />
                                        ) : (
                                            <Eye size={12} />
                                        )}
                                    </button>
                                    <div className="min-w-0 text-right">
                                        <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                                            {money(invoice.amount, hideAmount)}
                                        </p>
                                        {hasBreakdown && (
                                            <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                                base{" "}
                                                {money(
                                                    invoice.baseAmount ?? 0,
                                                    hideAmount,
                                                )}
                                                {(invoice.additionalCharges ??
                                                    0) > 0 && (
                                                    <>
                                                        {" + "}
                                                        {money(
                                                            invoice.additionalCharges ??
                                                                0,
                                                            hideAmount,
                                                        )}
                                                    </>
                                                )}
                                                {(invoice.vatAmount ?? 0) >
                                                    0 && (
                                                    <>
                                                        {" + VAT "}
                                                        {money(
                                                            invoice.vatAmount ??
                                                                0,
                                                            hideAmount,
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>

                            <td className="px-3 py-3 align-top">
                                <p className="truncate text-[11px] text-gray-700 dark:text-slate-300">
                                    {formatDate(invoice.dueDate)}
                                </p>
                            </td>

                            <td className="px-3 py-3 text-center align-top">
                                <StatusBadge status={invoice.status} />
                            </td>

                            <td className="px-3 py-3 align-top">
                                <InvoiceActions
                                    invoice={invoice}
                                    onView={onView}
                                    onPrint={onPrint}
                                    onDownload={onDownload}
                                    onSendEmail={onSendEmail}
                                    isSendingEmail={isSendingEmail}
                                />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function InvoiceActions({
    invoice,
    onView,
    onPrint,
    onDownload,
    onSendEmail,
    isSendingEmail,
}: {
    invoice: Invoice;
    onView: (invoice: Invoice) => void;
    onPrint: (invoice: Invoice) => void;
    onDownload: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
    isSendingEmail: boolean;
}) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const updateMenuPosition = () => {
        if (!buttonRef.current || !menuRef.current) return;
        const button = buttonRef.current.getBoundingClientRect();
        const menu = menuRef.current.getBoundingClientRect();
        const spacing = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - button.bottom;
        const spaceAbove = button.top;
        const openAbove =
            spaceBelow < menu.height + spacing && spaceAbove > spaceBelow;

        let left = button.right - menu.width;
        if (left < spacing) left = spacing;
        if (left + menu.width > viewportWidth - spacing)
            left = viewportWidth - menu.width - spacing;

        let top = openAbove
            ? button.top - menu.height - spacing
            : button.bottom + spacing;
        if (top < spacing) top = spacing;
        if (top + menu.height > viewportHeight - spacing)
            top = Math.max(spacing, viewportHeight - menu.height - spacing);

        setMenuPosition({ top, left });
    };

    useEffect(() => {
        if (!open) return;
        const frame = window.requestAnimationFrame(updateMenuPosition);
        const handleViewportChange = updateMenuPosition;
        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("scroll", handleViewportChange, true);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("scroll", handleViewportChange, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                buttonRef.current?.contains(target) ||
                menuRef.current?.contains(target)
            )
                return;
            setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const action = (callback: () => void) => {
        setOpen(false);
        callback();
    };

    const canSendEmail =
        invoice.status === "Approved" || invoice.status === "Rejected";

    return (
        <>
            <div className="flex justify-end">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setOpen((current) => !current)}
                    aria-label={`Actions for ${
                        invoice.status === "Approved"
                            ? (invoice.number ??
                              invoice.billingNumber ??
                              invoice.id)
                            : (invoice.billingNumber ?? invoice.id)
                    }`}
                    aria-expanded={open}
                    className={[
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                        "border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400",
                        "transition-all duration-200",
                        "hover:border-yellow-400/40 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-yellow-600 dark:hover:text-yellow-400",
                        open
                            ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                            : "",
                    ].join(" ")}
                >
                    <MoreVertical size={14} />
                </button>
            </div>
            {open && (
                <div
                    ref={menuRef}
                    className="fixed z-[9999] w-48 overflow-hidden rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 shadow-2xl shadow-black/50"
                    style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                    }}
                >
                    <div className="border-b border-gray-200 dark:border-slate-800 px-4 py-2.5">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
                            Invoice Actions
                        </p>
                    </div>
                    <ActionItem
                        icon={<Eye size={16} />}
                        label="View"
                        onClick={() => action(() => onView(invoice))}
                    />
                    <ActionItem
                        icon={<Printer size={16} />}
                        label="Print"
                        onClick={() => action(() => onPrint(invoice))}
                    />
                    <ActionItem
                        icon={<Download size={16} />}
                        label="Download PDF"
                        onClick={() => action(() => onDownload(invoice))}
                    />
                    {canSendEmail && (
                        <ActionItem
                            icon={<Send size={16} />}
                            label={
                                isSendingEmail ? "Sending..." : "Send to Client"
                            }
                            onClick={() => action(() => onSendEmail(invoice))}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-400/10"
                            disabled={isSendingEmail}
                        />
                    )}
                </div>
            )}
        </>
    );
}

function ActionItem({
    icon,
    label,
    onClick,
    className = "",
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 transition hover:bg-yellow-400/10 hover:text-yellow-600 dark:hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            ].join(" ")}
        >
            {icon} {label}
        </button>
    );
}

function StatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();
    let classes =
        "border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300";

    const statusMap: Record<string, string> = {
        pending:
            "border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400",
        partial:
            "border-orange-400/20 bg-orange-400/10 text-orange-600 dark:text-orange-400",
        paid: "border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        overdue:
            "border-red-400/20 bg-red-400/10 text-red-600 dark:text-red-400",
        rejected:
            "border-red-400/20 bg-red-400/10 text-red-600 dark:text-red-400",
        approved:
            "border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        generated:
            "border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        /* ✅ BILLING STATUS */
        created:
            "border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400",
        completed:
            "border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        "pending admin approval":
            "border-emerald-400/20 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    };

    classes = statusMap[normalized] || classes;

    const displayStatus =
        normalized === "pending admin approval"
            ? "Generated"
            : status || "Pending";

    return (
        <span
            className={[
                "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                classes,
            ].join(" ")}
        >
            {displayStatus}
        </span>
    );
}

function JobOrderDetails({
    jobOrder,
    hideAmount,
}: {
    jobOrder: JobOrder;
    hideAmount: boolean;
}) {
    const quotationTotal = getQuotationTotal(jobOrder);
    const billingMonths = getBillingMonths(jobOrder);
    const monthlyAmount = getMonthlyAmount(jobOrder);
    const billedCount = getBilledCount(jobOrder);
    const totalBilled = getTotalBilled(jobOrder);
    const remainingAmount = Math.max(0, quotationTotal - totalBilled);
    const billings = getJobOrderBillings(jobOrder);
    const progress =
        billingMonths > 0
            ? Math.min(100, Math.round((billedCount / billingMonths) * 100))
            : 0;
    const fullyBilled = isFullyBilled(jobOrder);

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-yellow-400/10 bg-gray-50 dark:bg-slate-950/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                            Job Order Number
                        </p>
                        <p className="mt-1 text-2xl font-black text-yellow-600 dark:text-yellow-400">
                            {getJobOrderNumber(jobOrder)}
                        </p>
                    </div>
                    <StatusBadge status={jobOrder.status ?? "Pending"} />
                </div>
            </div>

            {/* ✅ APPROVED QUOTATION — monthly billing basis */}
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.06] p-5">
                <div className="flex items-center gap-2">
                    <StickyNote
                        size={18}
                        className="text-yellow-600 dark:text-yellow-400"
                    />
                    <p className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                        Approved Quotation
                    </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Total Amount
                        </p>
                        <p className="mt-1 text-base font-black text-gray-900 dark:text-white">
                            {money(quotationTotal, hideAmount)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Months
                        </p>
                        <p className="mt-1 text-base font-black text-gray-900 dark:text-white">
                            {billingMonths > 0
                                ? `${billingMonths} month${
                                      billingMonths > 1 ? "s" : ""
                                  }`
                                : "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Monthly Amount
                        </p>
                        <p className="mt-1 text-base font-black text-yellow-600 dark:text-yellow-400">
                            {monthlyAmount > 0
                                ? money(monthlyAmount, hideAmount)
                                : "—"}
                        </p>
                    </div>
                </div>

                {billingMonths > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-gray-700 dark:text-slate-300">
                                {billedCount} of {billingMonths} month
                                {billingMonths > 1 ? "s" : ""} billed
                            </span>
                            <span
                                className={[
                                    "font-black",
                                    fullyBilled
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-yellow-600 dark:text-yellow-400",
                                ].join(" ")}
                            >
                                {fullyBilled
                                    ? "Completed"
                                    : `${formatMonth(
                                          getNextBillableMonth(jobOrder),
                                      )} — next`}
                            </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                            <div
                                className={[
                                    "h-full rounded-full transition-all",
                                    fullyBilled
                                        ? "bg-emerald-500"
                                        : "bg-yellow-400",
                                ].join(" ")}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-slate-600">
                            <span>
                                Total Billed:{" "}
                                <span className="font-black text-gray-800 dark:text-slate-200">
                                    {money(totalBilled, hideAmount)}
                                </span>
                            </span>
                            <span>
                                Remaining:{" "}
                                <span className="font-black text-gray-800 dark:text-slate-200">
                                    {money(remainingAmount, hideAmount)}
                                </span>
                            </span>
                        </div>

                        {/* ✅ VERIFICATION COUNTS */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/25 bg-yellow-400/5 px-2 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                                Pending: {jobOrder.pendingCount ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Approved: {jobOrder.approvedCount ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-red-400/25 bg-red-400/5 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                Rejected: {jobOrder.rejectedCount ?? 0}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <DetailBox label="Client" value={jobOrder.client ?? "—"} />
                <DetailBox label="Project" value={jobOrder.project ?? "—"} />
                <DetailBox
                    label="Client Email"
                    value={maskEmail(jobOrder.clientEmail)}
                />
                <DetailBox
                    label="Client Contact"
                    value={jobOrder.clientContact ?? "—"}
                />
                <DetailBox
                    label="Address"
                    value={jobOrder.clientAddress ?? "—"}
                />
                <DetailBox label="Location" value={jobOrder.location ?? "—"} />
                <DetailBox
                    label="Equipment"
                    value={jobOrder.equipment ?? "—"}
                />
                <DetailBox label="Operator" value={jobOrder.operator ?? "—"} />
                <DetailBox
                    label="Start Date"
                    value={formatDate(jobOrder.startDate)}
                />
                <DetailBox
                    label="End Date"
                    value={formatDate(jobOrder.endDate)}
                />
            </div>

            {/* ✅ MONTHLY BILLING HISTORY */}
            {billings.length > 0 && (
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60">
                    <div className="border-b border-gray-200 dark:border-slate-800 px-5 py-4">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                            Monthly Billing History
                        </p>
                    </div>
                    <ul className="divide-y divide-gray-200 dark:divide-slate-800">
                        {billings.map((billing) => (
                            <li
                                key={billing.id}
                                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <CalendarDays
                                        size={15}
                                        className="shrink-0 text-slate-600"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                                            {formatMonth(billing.serviceMonth)}
                                        </p>
                                        <p className="truncate text-[10px] text-slate-600">
                                            {billing.billingNumber ??
                                                `#${billing.id}`}
                                            {billing.billingSequence
                                                ? ` · Month ${billing.billingSequence}`
                                                : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="text-xs font-black text-gray-900 dark:text-white">
                                            {money(
                                                billing.totalAmount ??
                                                    billing.amount,
                                                hideAmount,
                                            )}
                                        </span>
                                        {(billing.vatAmount ?? 0) > 0 &&
                                            (billing.additionalCharges ?? 0) >
                                                0 && (
                                                <span className="block text-[10px] text-slate-600">
                                                    base{" "}
                                                    {money(
                                                        billing.baseAmount ?? 0,
                                                        hideAmount,
                                                    )}
                                                </span>
                                            )}
                                    </div>
                                    <StatusBadge status={billing.status} />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {jobOrder.rejectionReason && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <Ban
                            size={20}
                            className="mt-0.5 text-red-600 dark:text-red-400"
                        />
                        <div>
                            <p className="font-bold text-red-600 dark:text-red-400">
                                Rejection Reason
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">
                                {jobOrder.rejectionReason}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {jobOrder.description && (
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                        {jobOrder.description}
                    </p>
                </div>
            )}

            {jobOrder.notes && (
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                        {jobOrder.notes}
                    </p>
                </div>
            )}

            {jobOrder.generatedAt && (
                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <CheckCircle2
                            size={20}
                            className="mt-0.5 text-emerald-600 dark:text-emerald-400"
                        />
                        <div>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                Job Order Submitted
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                                Submitted on{" "}
                                {formatDateTime(jobOrder.generatedAt)}
                            </p>
                            {jobOrder.generatedBy?.name && (
                                <p className="mt-1 text-xs text-slate-600">
                                    By {jobOrder.generatedBy.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InvoiceDetails({
    invoice,
    onResubmit,
    isResubmitting,
    onSendEmail,
    isSendingEmail,
    hideAmount,
}: {
    invoice: Invoice;
    onResubmit?: (invoice: Invoice) => void;
    isResubmitting?: boolean;
    onSendEmail?: (invoice: Invoice) => void;
    isSendingEmail?: boolean;
    hideAmount: boolean;
}) {
    const hasBreakdown =
        (invoice.vatAmount ?? 0) > 0 || (invoice.additionalCharges ?? 0) > 0;
    const baseAmount = invoice.baseAmount ?? invoice.amount;
    const vatAmount = invoice.vatAmount ?? 0;
    const additionalCharges = invoice.additionalCharges ?? 0;
    const totalSales = invoice.amount;
    const withholdingTax = 0;
    const totalAmountDue = invoice.totalAmount ?? invoice.amount;

    const isApproved = invoice.status === "Approved";

    /* Para sa items table lang (Billing Record vs Service Invoice) */
    const itemLabel = isApproved ? "Service Invoice Items" : "Billing Items";

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-yellow-400/10 bg-gray-50 dark:bg-slate-950/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        {/*
                        |--------------------------------------------------------------
                        | ✅ WALANG "Invoice" label sa taas ng Billing Record.
                        | Billing Record  → "Billing Record" + Billing No.
                        | Service Invoice → "Service Invoice" + Invoice No.
                        |--------------------------------------------------------------
                        */}
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                            {isApproved ? "Service Invoice" : "Billing Record"}
                        </p>

                        {isApproved ? (
                            <>
                                <p className="mt-1 text-2xl font-black text-yellow-600 dark:text-yellow-400">
                                    {invoice.number ?? "—"}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                                    {invoice.billingNumber && (
                                        <span>
                                            Billing No.:{" "}
                                            <span className="font-bold text-gray-700 dark:text-slate-300">
                                                {invoice.billingNumber}
                                            </span>
                                        </span>
                                    )}
                                    {invoice.jobOrderNumber && (
                                        <span>
                                            Job Order:{" "}
                                            <span className="font-bold text-gray-700 dark:text-slate-300">
                                                {invoice.jobOrderNumber}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="mt-1 text-2xl font-black text-yellow-600 dark:text-yellow-400">
                                    {invoice.billingNumber ?? "—"}
                                </p>
                                {invoice.jobOrderNumber && (
                                    <p className="mt-1 text-[11px] text-slate-600">
                                        Job Order:{" "}
                                        <span className="font-bold text-gray-700 dark:text-slate-300">
                                            {invoice.jobOrderNumber}
                                        </span>
                                    </p>
                                )}
                                <p className="mt-2 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.06] px-2.5 py-1.5 text-[11px] text-slate-600">
                                    Walang invoice number pa. Magigigawa ito pag
                                    na-approve ng admin.
                                </p>
                            </>
                        )}
                    </div>
                    <StatusBadge status={invoice.status} />
                </div>
            </div>

            {/* ✅ BILLING BREAKDOWN */}
            {hasBreakdown && (
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-5">
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-600">
                        Billing Breakdown
                    </p>
                    <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-slate-600">Base Amount</dt>
                            <dd className="font-bold text-gray-900 dark:text-white">
                                {money(baseAmount, hideAmount)}
                            </dd>
                        </div>
                        {additionalCharges > 0 && (
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-slate-600">
                                    Additional Charges
                                </dt>
                                <dd className="font-bold text-blue-600 dark:text-blue-400">
                                    + {money(additionalCharges, hideAmount)}
                                </dd>
                            </div>
                        )}
                        {vatAmount > 0 && (
                            <div className="flex items-center justify-between gap-3">
                                <dt className="text-slate-600">
                                    VAT ({invoice.vatRate ?? 12}%)
                                </dt>
                                <dd className="font-bold text-emerald-600 dark:text-emerald-400">
                                    + {money(vatAmount, hideAmount)}
                                </dd>
                            </div>
                        )}
                    </dl>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-200 dark:border-slate-800 pt-3">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                            Grand Total
                        </span>
                        <span className="text-lg font-black text-yellow-600 dark:text-yellow-400">
                            {money(totalSales, hideAmount)}
                        </span>
                    </div>
                </div>
            )}

            {/* ✅ SERVICE DATE (monthly) + MONTH SEQUENCE */}
            {invoice.serviceMonth && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.06] px-5 py-4">
                    <CalendarDays
                        size={18}
                        className="shrink-0 text-yellow-600 dark:text-yellow-400"
                    />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Service Date
                        </p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                            {formatMonth(invoice.serviceMonth)}
                            {invoice.billingSequence
                                ? ` · Month ${invoice.billingSequence}`
                                : ""}
                        </p>
                    </div>
                </div>
            )}

            {invoice.sentAt && (
                <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <Mail
                            size={20}
                            className="mt-0.5 text-blue-600 dark:text-blue-400"
                        />
                        <div>
                            <p className="font-bold text-blue-600 dark:text-blue-400">
                                Sent to Client
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                                Sent on {formatDateTime(invoice.sentAt)}
                            </p>
                            {invoice.sentBy && (
                                <p className="mt-1 text-xs text-slate-600">
                                    By {invoice.sentBy}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {invoice.status === "Rejected" && invoice.rejectionReason && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <Ban
                            size={20}
                            className="mt-0.5 text-red-600 dark:text-red-400"
                        />
                        <div>
                            <p className="font-bold text-red-600 dark:text-red-400">
                                Rejection Reason
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">
                                {invoice.rejectionReason}
                            </p>
                            {invoice.rejectedAt && (
                                <p className="mt-2 text-xs text-slate-600">
                                    Rejected on{" "}
                                    {formatDateTime(invoice.rejectedAt)}
                                </p>
                            )}
                            {invoice.status === "Rejected" && onResubmit && (
                                <button
                                    type="button"
                                    onClick={() => onResubmit(invoice)}
                                    disabled={isResubmitting}
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <RotateCcw
                                        size={15}
                                        className={
                                            isResubmitting ? "animate-spin" : ""
                                        }
                                    />
                                    {isResubmitting
                                        ? "Resubmitting..."
                                        : "Resubmit Invoice"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {invoice.status === "Approved" && invoice.approvedAt && (
                <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <CheckCircle2
                            size={20}
                            className="mt-0.5 text-blue-600 dark:text-blue-400"
                        />
                        <div>
                            <p className="font-bold text-blue-600 dark:text-blue-400">
                                Invoice Approved
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                                Approved on {formatDateTime(invoice.approvedAt)}
                            </p>
                            {invoice.approvedBy && (
                                <p className="mt-1 text-xs text-slate-600">
                                    By {invoice.approvedBy}
                                </p>
                            )}
                            {onSendEmail && (
                                <button
                                    type="button"
                                    onClick={() => onSendEmail(invoice)}
                                    disabled={isSendingEmail}
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSendingEmail ? (
                                        <>
                                            <RefreshCw
                                                size={14}
                                                className="animate-spin"
                                            />{" "}
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} /> Send to Client
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <DetailBox label="Client" value={invoice.client} />
                <DetailBox label="Project" value={invoice.project} />
                <DetailBox
                    label="Client Email"
                    value={displayClientEmail(
                        invoice.clientEmail,
                        invoice.status,
                    )}
                    highlight={isApproved}
                />
                <DetailBox
                    label="Client Contact"
                    value={invoice.clientContact || "—"}
                />
                <DetailBox
                    label="Invoice Date"
                    value={formatDate(invoice.createdAt)}
                />
                <DetailBox
                    label="Due Date"
                    value={formatDate(invoice.dueDate)}
                />
                <DetailBox
                    label="Job Order"
                    value={
                        invoice.jobOrderId ? `JO-${invoice.jobOrderId}` : "—"
                    }
                />
                <DetailBox label="VAT Rate" value="12%" highlight />
                <DetailBox
                    label="Payment Method"
                    value={invoice.paymentMethod || "Bank Transfer"}
                    highlight
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800">
                <div className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        {itemLabel}
                    </p>
                </div>

                <div className="grid grid-cols-12 gap-2 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-5">
                        {isApproved ? "Description" : "Particulars"}
                    </div>
                    <div className="col-span-2 text-right">
                        {isApproved ? "Unit Cost" : "Unit Price"}
                    </div>
                    <div className="col-span-4 text-right">Amount</div>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-slate-800">
                    {invoice.items.map((item) => (
                        <div
                            key={item.id}
                            className="grid grid-cols-12 gap-2 px-5 py-4"
                        >
                            <div className="col-span-1 font-semibold text-gray-700 dark:text-slate-300">
                                {item.quantity}
                            </div>
                            <div className="col-span-5 text-gray-800 dark:text-slate-200">
                                {item.description}
                            </div>
                            <div className="col-span-2 text-right text-gray-700 dark:text-slate-300">
                                {money(item.unitPrice, hideAmount)}
                            </div>
                            <div className="col-span-4 text-right font-bold text-gray-900 dark:text-white">
                                {money(
                                    item.quantity * item.unitPrice,
                                    hideAmount,
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 px-5 py-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                                Base Amount
                            </span>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {money(baseAmount, hideAmount)}
                            </span>
                        </div>

                        {additionalCharges > 0 && (
                            <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800/50 pt-3">
                                <span className="font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                                    Additional Charges
                                </span>
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    + {money(additionalCharges, hideAmount)}
                                </span>
                            </div>
                        )}

                        <div
                            className={[
                                "flex items-center justify-between border-t border-gray-200 dark:border-slate-800/50 pt-3",
                                vatAmount > 0 ? "" : "opacity-40",
                            ].join(" ")}
                        >
                            <div className="flex items-center gap-2">
                                <Percent
                                    size={16}
                                    className="text-yellow-600 dark:text-yellow-400"
                                />
                                <span className="font-bold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
                                    VAT ({invoice.vatRate ?? 12}%)
                                </span>
                            </div>
                            <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                {vatAmount > 0
                                    ? `+ ${money(vatAmount, hideAmount)}`
                                    : "—"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800/50 pt-3">
                            <div className="flex items-center gap-2">
                                <Calculator
                                    size={16}
                                    className="text-gray-500 dark:text-slate-400"
                                />
                                <span className="font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                                    Total Sales
                                </span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {money(totalSales, hideAmount)}
                            </span>
                        </div>

                        {withholdingTax > 0 && (
                            <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800/50 pt-3">
                                <span className="font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                                    Withholding Tax
                                </span>
                                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    - {money(withholdingTax, hideAmount)}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t-2 border-yellow-400/30 pt-4">
                            <span className="text-xl font-black uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
                                Total Amount Due
                            </span>
                            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
                                {money(totalAmountDue, hideAmount)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {invoice.description && (
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                        {invoice.description}
                    </p>
                </div>
            )}

            {invoice.notes && (
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                        {invoice.notes}
                    </p>
                </div>
            )}
        </div>
    );
}

function DetailBox({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                {label}
            </p>
            <p
                className={[
                    "mt-2 break-words text-sm font-semibold",
                    highlight
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-gray-800 dark:text-slate-200",
                ].join(" ")}
            >
                {value}
            </p>
        </div>
    );
}

function EmptyState({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-slate-600">
                {icon}
            </div>
            <h3 className="mt-5 text-lg font-black uppercase tracking-wide text-gray-700 dark:text-slate-300">
                {title}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                {description}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| CREATE BILLING MODAL
|--------------------------------------------------------------------------
|
| Isang billing record kada buwan base sa approved quotation.
| Halimbawa: quotation ₱90,000 para sa 3 buwan → ₱30,000 kada buwan.
|
*/

function CreateBillingModal({
    jobOrder,
    hideAmount,
    isSubmitting,
    onClose,
    onSubmit,
}: {
    jobOrder: JobOrder;
    hideAmount: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        serviceMonth: string;
        billingSequence: number | null;
        baseAmount: number;
        applyVat: boolean;
        vatRate: number;
        applyAdditionalCharges: boolean;
        additionalCharges: number;
        totalAmount: number;
        dueDate: string;
        description: string;
        notes: string;
        quotationTotal: number;
        billingMonths: number;
    }) => void;
}) {
    const existingMonths = getBillingMonths(jobOrder);
    const billedMonths = getBilledMonths(jobOrder);

    /*
    |----------------------------------------------------------------------
    | ✅ READ-ONLY: galing ito sa ibang department (Sales/Contract)
    |----------------------------------------------------------------------
    */

    const total = getQuotationTotal(jobOrder) || getJobOrderAmount(jobOrder);
    const months = existingMonths > 0 ? existingMonths : 1;

    const [serviceMonth, setServiceMonth] = useState<string>(() =>
        getNextBillableMonth(jobOrder),
    );
    const [amount, setAmount] = useState<string>(() => {
        const m = existingMonths > 0 ? existingMonths : 1;
        const t = getQuotationTotal(jobOrder) || getJobOrderAmount(jobOrder);
        return (t / m).toFixed(2);
    });
    const [dueDate, setDueDate] = useState<string>(() => {
        const month = getNextBillableMonth(jobOrder);
        if (!month) return "";
        /* 15th of the FOLLOWING month (UTC-based para walang timezone shift) */
        const [year, mon] = month.split("-").map(Number);
        const nextMonthIndex = mon; // mon is 1-based → next month
        const dueYear = year + Math.floor(nextMonthIndex / 12);
        const dueMonth = ((nextMonthIndex % 12) + 12) % 12;
        return `${dueYear}-${String(dueMonth).padStart(2, "0")}-15`;
    });
    const [description, setDescription] = useState<string>(() => {
        const month = getNextBillableMonth(jobOrder);
        return `Monthly Service — ${formatMonth(month)} — ${
            jobOrder.project ?? "Service"
        }`;
    });
    const [notes, setNotes] = useState<string>("");
    const [amountTouched, setAmountTouched] = useState(false);

    /* ✅ VAT + ADDITIONAL CHARGES (checkboxes) */
    const [applyVat, setApplyVat] = useState(false);
    const [vatRate, setVatRate] = useState("12");
    const [applyAdditionalCharges, setApplyAdditionalCharges] = useState(false);
    const [additionalCharges, setAdditionalCharges] = useState("");

    /* Fallback auto-compute kung walang months mula sa ibang dept */
    useEffect(() => {
        if (amountTouched) return;
        if (existingMonths > 0) return;
        const t = getQuotationTotal(jobOrder) || getJobOrderAmount(jobOrder);
        if (!Number.isFinite(t) || t < 0) return;
        setAmount(t.toFixed(2));
    }, [existingMonths, amountTouched, jobOrder]);

    /* I-update ang default description pag nagpalit ng Service Date */
    useEffect(() => {
        setDescription(
            `Monthly Service — ${formatMonth(serviceMonth)} — ${
                jobOrder.project ?? "Service"
            }`,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceMonth]);

    const baseAmount = Number(amount);

    /* ✅ LIVE BREAKDOWN — visible habang ginagawa ang billing */
    const chargeAmount = applyAdditionalCharges
        ? Number(additionalCharges) || 0
        : 0;
    const rate = applyVat ? Number(vatRate) || 0 : 0;
    const vatAmount = ((baseAmount + chargeAmount) * rate) / 100;
    const grandTotal = baseAmount + chargeAmount + vatAmount;

    const isDuplicateMonth =
        Boolean(serviceMonth) && billedMonths.includes(serviceMonth);
    const isAmountInvalid = !Number.isFinite(baseAmount) || baseAmount < 0;
    const isChargeInvalid =
        applyAdditionalCharges &&
        (!Number.isFinite(chargeAmount) || chargeAmount < 0);
    const isVatInvalid =
        applyVat && (!Number.isFinite(rate) || rate < 0 || rate > 100);
    const canSubmit =
        Boolean(serviceMonth) &&
        !isDuplicateMonth &&
        !isAmountInvalid &&
        !isChargeInvalid &&
        !isVatInvalid &&
        !isSubmitting;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({
            serviceMonth,
            billingSequence: billedMonths.length + 1,
            baseAmount,
            applyVat,
            vatRate: rate,
            applyAdditionalCharges,
            additionalCharges: chargeAmount,
            totalAmount: grandTotal,
            dueDate,
            description,
            notes,
            quotationTotal: total,
            billingMonths: months,
        });
    };

    const fieldClass =
        "w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10";
    const labelClass =
        "mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600";

    return (
        <Modal
            title={`Create Billing — ${getJobOrderNumber(jobOrder)}`}
            onClose={onClose}
            size="lg"
        >
            <div className="space-y-6">
                {/* CLIENT INFO */}
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Client
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                            {jobOrder.client ?? "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            Project
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
                            {jobOrder.project ?? "—"}
                        </p>
                    </div>
                </div>

                {/* ✅ APPROVED QUOTATION — READ ONLY (galing sa ibang dept) */}
                <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.06] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                            Approved Quotation
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            <StickyNote size={10} />
                            from Sales
                        </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                Total Amount
                            </p>
                            <p className="mt-1 text-base font-black text-gray-900 dark:text-white">
                                {money(total, hideAmount)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                Months
                            </p>
                            <p className="mt-1 text-base font-black text-gray-900 dark:text-white">
                                {existingMonths > 0
                                    ? `${existingMonths} month${
                                          existingMonths > 1 ? "s" : ""
                                      }`
                                    : "—"}
                            </p>
                        </div>
                        <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/[0.08] p-3">
                            <label
                                htmlFor="cb-amount"
                                className="text-[10px] font-bold uppercase tracking-wider text-slate-600"
                            >
                                Monthly Amount
                            </label>
                            <input
                                id="cb-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(event) => {
                                    setAmountTouched(true);
                                    setAmount(event.target.value);
                                }}
                                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-base font-black text-yellow-600 dark:text-yellow-400 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                            />
                        </div>
                    </div>

                    {existingMonths > 0 && (
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Calculator size={12} />
                            Auto-computed: {money(total, hideAmount)} ÷ {months}{" "}
                            month{months > 1 ? "s" : ""} ={" "}
                            <span className="font-black text-gray-800 dark:text-slate-200">
                                {money(total / months, hideAmount)}
                            </span>
                            . Puwede mong i-adjust ang Monthly Amount.
                        </p>
                    )}
                </div>

                {/* ✅ VAT + ADDITIONAL CHARGES (checkboxes) */}
                <div className="grid gap-3 sm:grid-cols-2">
                    {/* VAT */}
                    <div
                        className={[
                            "rounded-2xl border p-4 transition",
                            applyVat
                                ? "border-emerald-400/40 bg-emerald-400/[0.06]"
                                : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60",
                        ].join(" ")}
                    >
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={applyVat}
                                onChange={(event) =>
                                    setApplyVat(event.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
                            />
                            <span className="min-w-0">
                                <span className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                                    Apply VAT
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-600">
                                    {applyVat
                                        ? `+ ${money(vatAmount, hideAmount)}`
                                        : "Hindi kasama sa total"}
                                </span>
                            </span>
                        </label>

                        {applyVat && (
                            <div className="mt-3 flex items-center gap-2">
                                <label
                                    htmlFor="cb-vat-rate"
                                    className="text-[10px] font-bold uppercase tracking-wider text-slate-600"
                                >
                                    Rate
                                </label>
                                <div className="relative w-24">
                                    <input
                                        id="cb-vat-rate"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={vatRate}
                                        onChange={(event) =>
                                            setVatRate(event.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 pr-6 text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                                        %
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ADDITIONAL CHARGES */}
                    <div
                        className={[
                            "rounded-2xl border p-4 transition",
                            applyAdditionalCharges
                                ? "border-blue-400/40 bg-blue-400/[0.06]"
                                : "border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60",
                        ].join(" ")}
                    >
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={applyAdditionalCharges}
                                onChange={(event) =>
                                    setApplyAdditionalCharges(
                                        event.target.checked,
                                    )
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-500"
                            />
                            <span className="min-w-0">
                                <span className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                                    Additional Charges
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-600">
                                    {applyAdditionalCharges
                                        ? `+ ${money(chargeAmount, hideAmount)}`
                                        : "Hindi kasama sa total"}
                                </span>
                            </span>
                        </label>

                        {applyAdditionalCharges && (
                            <div className="mt-3 flex items-center gap-2">
                                <label
                                    htmlFor="cb-additional"
                                    className="text-[10px] font-bold uppercase tracking-wider text-slate-600"
                                >
                                    Amount
                                </label>
                                <div className="relative flex-1">
                                    <input
                                        id="cb-additional"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={additionalCharges}
                                        onChange={(event) =>
                                            setAdditionalCharges(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="0.00"
                                        className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 pr-8 text-sm font-black text-blue-600 dark:text-blue-400 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10"
                                    />
                                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">
                                        ₱
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ✅ LIVE BREAKDOWN — visible habang ginagawa ang billing */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                        Billing Breakdown
                    </p>

                    <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <dt className="text-slate-600">
                                Monthly Amount (base)
                            </dt>
                            <dd className="font-bold text-gray-900 dark:text-white">
                                {money(baseAmount, hideAmount)}
                            </dd>
                        </div>

                        <div
                            className={[
                                "flex items-center justify-between gap-3",
                                !applyAdditionalCharges ? "opacity-40" : "",
                            ].join(" ")}
                        >
                            <dt className="text-slate-600">
                                Additional Charges
                            </dt>
                            <dd className="font-bold text-blue-600 dark:text-blue-400">
                                {applyAdditionalCharges
                                    ? `+ ${money(chargeAmount, hideAmount)}`
                                    : "—"}
                            </dd>
                        </div>

                        <div
                            className={[
                                "flex items-center justify-between gap-3",
                                !applyVat ? "opacity-40" : "",
                            ].join(" ")}
                        >
                            <dt className="text-slate-600">
                                VAT {applyVat ? `(${rate}%)` : ""}
                            </dt>
                            <dd className="font-bold text-emerald-600 dark:text-emerald-400">
                                {applyVat
                                    ? `+ ${money(vatAmount, hideAmount)}`
                                    : "—"}
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-200 dark:border-slate-800 pt-3">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                            Grand Total
                        </span>
                        <span className="text-xl font-black text-yellow-600 dark:text-yellow-400">
                            {money(grandTotal, hideAmount)}
                        </span>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-600">
                        Ang admin ang mag-v-verify:{" "}
                        <span className="font-bold">
                            {money(baseAmount, hideAmount)}
                        </span>{" "}
                        ang ihihambing sa monthly amount ng Job Order (hindi
                        kasama ang VAT at charges).
                    </p>
                </div>

                {/* SERVICE DATE (MONTHLY) */}
                <div>
                    <label htmlFor="cb-service-month" className={labelClass}>
                        Service Date (Month)
                    </label>
                    <input
                        id="cb-service-month"
                        type="month"
                        value={serviceMonth}
                        onChange={(event) =>
                            setServiceMonth(event.target.value)
                        }
                        className={fieldClass}
                    />
                    {isDuplicateMonth && (
                        <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300">
                            <AlertTriangle
                                size={13}
                                className="mt-0.5 shrink-0"
                            />
                            May billing record na para sa{" "}
                            {formatMonth(serviceMonth)}. Pumili ng ibang buwan.
                        </p>
                    )}
                    {billedMonths.length > 0 && (
                        <div className="mt-3">
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                Already Billed
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {billedMonths.map((month) => (
                                    <span
                                        key={month}
                                        className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                                    >
                                        {formatMonth(month)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* DUE DATE */}
                <div>
                    <label htmlFor="cb-due" className={labelClass}>
                        Due Date
                    </label>
                    <input
                        id="cb-due"
                        type="date"
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                        className={fieldClass}
                    />
                </div>

                {/* DESCRIPTION */}
                <div>
                    <label htmlFor="cb-desc" className={labelClass}>
                        Description
                    </label>
                    <input
                        id="cb-desc"
                        type="text"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className={fieldClass}
                    />
                </div>

                {/* NOTES */}
                <div>
                    <label htmlFor="cb-notes" className={labelClass}>
                        Notes (optional)
                    </label>
                    <textarea
                        id="cb-notes"
                        rows={3}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="e.g. 50% downpayment, adjustments, ..."
                        className={[fieldClass, "resize-none"].join(" ")}
                    />
                </div>

                {/* TOTAL PREVIEW */}
                <div className="flex items-center justify-between rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.06] px-5 py-4">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                        Total Amount to Bill
                    </span>
                    <span className="text-lg font-black text-yellow-600 dark:text-yellow-400">
                        {money(grandTotal, hideAmount)}
                    </span>
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:bg-gray-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Wallet size={16} /> Create Billing
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/*
|--------------------------------------------------------------------------
| CREATE JOB ORDER MODAL
|--------------------------------------------------------------------------
|
| Pansamantala — para pa lang sa demo dahil wala pang integration sa
| ibang department (Sales / Contract). Kapag may integration na, mawawala
| na itong button.
|
*/

function CreateJobOrderModal({
    isSubmitting,
    onClose,
    onSubmit,
}: {
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        client: string;
        clientEmail: string;
        clientContact: string;
        clientAddress: string;
        project: string;
        location: string;
        equipment: string;
        operator: string;
        startDate: string;
        endDate: string;
        quotationTotal: number;
        billingMonths: number;
        description: string;
        notes: string;
    }) => void;
}) {
    /* Local "today" — hindi UTC, kasi 12 AM–8 AM PH ay maling araw */
    const today = useMemo(() => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
            now.getDate(),
        )}`;
    }, []);

    const [client, setClient] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientContact, setClientContact] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [project, setProject] = useState("");
    const [location, setLocation] = useState("");
    const [equipment, setEquipment] = useState("");
    const [operator, setOperator] = useState("");
    const [startDate, setStartDate] = useState(today);
    const [billingMonths, setBillingMonths] = useState("3");
    const [quotationTotal, setQuotationTotal] = useState("");
    const [description, setDescription] = useState("");
    const [notes, setNotes] = useState("");

    const total = Number(quotationTotal);
    const months = Number(billingMonths);
    const monthly = months > 0 ? total / months : 0;
    /* UTC-based para hindi ma-off-by-one sa timezone (PH = UTC+8) */
    const endDate = useMemo(() => {
        if (!startDate || !Number.isFinite(months) || months < 1) return "";
        const [year, month, day] = startDate.split("-").map(Number);
        if (!year || !month || !day) return "";

        const targetMonthIndex = month - 1 + months;
        const targetYear = year + Math.floor(targetMonthIndex / 12);
        const targetMonth = (((targetMonthIndex % 12) + 12) % 12) + 1;

        /* Clamp sa last day ng target month (Jan 31 + 1 month = Feb 28) */
        const lastDay = new Date(
            Date.UTC(targetYear, targetMonth, 0),
        ).getUTCDate();

        const pad = (n: number) => String(n).padStart(2, "0");
        return `${targetYear}-${pad(targetMonth)}-${pad(
            Math.min(day, lastDay),
        )}`;
    }, [startDate, months]);

    const isTotalValid = Number.isFinite(total) && total > 0;
    const isMonthsValid = Number.isFinite(months) && months >= 1;
    const canSubmit =
        client.trim().length > 0 &&
        project.trim().length > 0 &&
        isTotalValid &&
        isMonthsValid &&
        !isSubmitting;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({
            client: client.trim(),
            clientEmail: clientEmail.trim(),
            clientContact: clientContact.trim(),
            clientAddress: clientAddress.trim(),
            project: project.trim(),
            location: location.trim(),
            equipment: equipment.trim(),
            operator: operator.trim(),
            startDate,
            endDate,
            quotationTotal: total,
            billingMonths: months,
            description: description.trim(),
            notes: notes.trim(),
        });
    };

    const fieldClass =
        "w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10";
    const labelClass =
        "mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-600";

    return (
        <Modal title="Create Job Order" onClose={onClose} size="lg">
            <div className="space-y-6">
                {/* CLIENT */}
                <div>
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                        Client Details
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="cjo-client" className={labelClass}>
                                Client <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="cjo-client"
                                type="text"
                                value={client}
                                onChange={(event) =>
                                    setClient(event.target.value)
                                }
                                placeholder="e.g. San Miguel Corporation"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="cjo-client-email"
                                className={labelClass}
                            >
                                Client Email
                            </label>
                            <input
                                id="cjo-client-email"
                                type="email"
                                value={clientEmail}
                                onChange={(event) =>
                                    setClientEmail(event.target.value)
                                }
                                placeholder="client@company.com"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="cjo-client-contact"
                                className={labelClass}
                            >
                                Client Contact
                            </label>
                            <input
                                id="cjo-client-contact"
                                type="text"
                                value={clientContact}
                                onChange={(event) =>
                                    setClientContact(event.target.value)
                                }
                                placeholder="e.g. 0917 123 4567"
                                className={fieldClass}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label
                                htmlFor="cjo-client-address"
                                className={labelClass}
                            >
                                Address
                            </label>
                            <input
                                id="cjo-client-address"
                                type="text"
                                value={clientAddress}
                                onChange={(event) =>
                                    setClientAddress(event.target.value)
                                }
                                placeholder="Quezon City, Metro Manila"
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </div>

                {/* PROJECT */}
                <div>
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                        Project
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="cjo-project" className={labelClass}>
                                Project Name{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="cjo-project"
                                type="text"
                                value={project}
                                onChange={(event) =>
                                    setProject(event.target.value)
                                }
                                placeholder="e.g. Road Construction Project"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="cjo-location"
                                className={labelClass}
                            >
                                Location
                            </label>
                            <input
                                id="cjo-location"
                                type="text"
                                value={location}
                                onChange={(event) =>
                                    setLocation(event.target.value)
                                }
                                placeholder="e.g. Batangas City"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="cjo-equipment"
                                className={labelClass}
                            >
                                Equipment
                            </label>
                            <input
                                id="cjo-equipment"
                                type="text"
                                value={equipment}
                                onChange={(event) =>
                                    setEquipment(event.target.value)
                                }
                                placeholder="e.g. 2x Dump Truck, 1x Backhoe"
                                className={fieldClass}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label
                                htmlFor="cjo-operator"
                                className={labelClass}
                            >
                                Operator
                            </label>
                            <input
                                id="cjo-operator"
                                type="text"
                                value={operator}
                                onChange={(event) =>
                                    setOperator(event.target.value)
                                }
                                placeholder="e.g. J. Dela Cruz"
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </div>

                {/* ✅ APPROVED QUOTATION */}
                <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.06] p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                        Approved Quotation
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                            <label htmlFor="cjo-total" className={labelClass}>
                                Total Amount{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="cjo-total"
                                type="number"
                                min="0"
                                step="0.01"
                                value={quotationTotal}
                                onChange={(event) =>
                                    setQuotationTotal(event.target.value)
                                }
                                placeholder="90000.00"
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="cjo-months" className={labelClass}>
                                Number of Months{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="cjo-months"
                                type="number"
                                min="1"
                                max="120"
                                value={billingMonths}
                                onChange={(event) =>
                                    setBillingMonths(event.target.value)
                                }
                                className={fieldClass}
                            />
                        </div>
                        <div>
                            <p className={labelClass}>Monthly Amount</p>
                            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-black text-yellow-600 dark:text-yellow-400">
                                {monthly > 0 ? money(monthly, false) : "—"}
                            </div>
                        </div>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
                        <CalendarDays size={12} />
                        {startDate
                            ? `${formatDate(startDate)} — ${formatDate(endDate)}`
                            : "Walang start date"}{" "}
                        · {months || 0} monthly billing record
                        {months > 1 ? "s" : ""}
                    </p>
                </div>

                {/* DESCRIPTION */}
                <div>
                    <label htmlFor="cjo-desc" className={labelClass}>
                        Description
                    </label>
                    <textarea
                        id="cjo-desc"
                        rows={3}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Scope of work, deliverables, ..."
                        className={[fieldClass, "resize-none"].join(" ")}
                    />
                </div>

                {/* NOTES */}
                <div>
                    <label htmlFor="cjo-notes" className={labelClass}>
                        Notes (optional)
                    </label>
                    <textarea
                        id="cjo-notes"
                        rows={2}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className={[fieldClass, "resize-none"].join(" ")}
                    />
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:bg-gray-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus size={16} /> Create Job Order
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function Modal({
    title,
    children,
    onClose,
    size = "md",
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    size?: "sm" | "md" | "lg";
}) {
    const sizeClass =
        size === "sm" ? "max-w-md" : size === "lg" ? "max-w-4xl" : "max-w-2xl";

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div
                className={[
                    "w-full overflow-hidden rounded-3xl border border-yellow-400/10 bg-white dark:bg-slate-900 shadow-2xl",
                    sizeClass,
                ].join(" ")}
            >
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-5 py-4 sm:px-6">
                    <h2 className="text-lg font-black uppercase tracking-wide text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function PrintPreview({
    invoice,
    hideAmount,
}: {
    invoice: Invoice;
    hideAmount: boolean;
}) {
    const totalSales = invoice.amount;
    const vatAmount = totalSales * VAT_RATE;
    const netOfVAT = totalSales;
    const withholdingTax = 0;
    const totalAmountDue = netOfVAT + vatAmount;

    const isApproved = invoice.status === "Approved";

    return (
        <div className="bg-white p-8 text-slate-900 sm:p-12">
            <div className="border-b-4 border-gray-200 dark:border-slate-900 pb-6">
                <div className="flex items-start justify-between gap-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-wide">
                            ALIBATON
                        </h1>
                        <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-600">
                            Heavy Equipment & Logistics
                        </p>
                        <p className="mt-3 text-xs text-gray-500 dark:text-slate-500">
                            Quezon City, Metro Manila
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                            VAT Reg. TIN: 123-456-789-000
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                            {isApproved ? "Service Invoice" : "Billing Record"}
                        </p>
                        <p className="mt-1 text-2xl font-black">
                            {isApproved
                                ? (invoice.number ?? "—")
                                : (invoice.billingNumber ?? "—")}
                        </p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-slate-500">
                            Date: {formatDate(invoice.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                            Due: {formatDate(invoice.dueDate)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-8">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Bill To
                    </p>
                    <p className="mt-2 text-lg font-black">{invoice.client}</p>
                    {invoice.clientAddress && (
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                            {invoice.clientAddress}
                        </p>
                    )}
                    {invoice.clientEmail && (
                        <p className="mt-1 text-sm text-slate-600">
                            {displayClientEmail(
                                invoice.clientEmail,
                                invoice.status,
                            )}
                        </p>
                    )}
                    {invoice.clientContact && (
                        <p className="mt-1 text-sm text-slate-600">
                            {invoice.clientContact}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Reference
                    </p>
                    <p className="mt-2 text-sm font-bold">
                        Job Order:{" "}
                        {invoice.jobOrderId ? `JO-${invoice.jobOrderId}` : "—"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Project: {invoice.project}
                    </p>
                </div>
            </div>

            <div className="mt-10 overflow-hidden border border-slate-300">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border-b border-slate-300 px-4 py-3 text-left text-xs font-black uppercase">
                                Qty
                            </th>
                            <th className="border-b border-slate-300 px-4 py-3 text-left text-xs font-black uppercase">
                                Particulars / Description
                            </th>
                            <th className="border-b border-slate-300 px-4 py-3 text-right text-xs font-black uppercase">
                                Unit Price
                            </th>
                            <th className="border-b border-slate-300 px-4 py-3 text-right text-xs font-black uppercase">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item) => (
                            <tr key={item.id}>
                                <td className="border-b border-slate-200 px-4 py-4 text-sm">
                                    {item.quantity}
                                </td>
                                <td className="border-b border-slate-200 px-4 py-4 text-sm">
                                    {item.description}
                                </td>
                                <td className="border-b border-slate-200 px-4 py-4 text-right text-sm">
                                    {money(item.unitPrice, hideAmount)}
                                </td>
                                <td className="border-b border-slate-200 px-4 py-4 text-right text-sm font-bold">
                                    {money(
                                        item.quantity * item.unitPrice,
                                        hideAmount,
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm">
                    <div className="flex justify-between border-b border-slate-200 py-3 text-sm">
                        <span className="font-semibold text-slate-600">
                            Total Sales
                        </span>
                        <span className="font-bold">
                            {money(totalSales, hideAmount)}
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 py-3 text-sm">
                        <span className="font-semibold text-slate-600">
                            VAT (12%)
                        </span>
                        <span className="font-bold text-slate-800">
                            {money(vatAmount, hideAmount)}
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 py-3 text-sm">
                        <span className="font-semibold text-slate-600">
                            Net of VAT
                        </span>
                        <span className="font-bold">
                            {money(netOfVAT, hideAmount)}
                        </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 py-3 text-sm">
                        <span className="font-semibold text-slate-600">
                            Withholding Tax
                        </span>
                        <span className="font-bold">
                            {money(withholdingTax, hideAmount)}
                        </span>
                    </div>
                    <div className="flex justify-between py-4 border-t-2 border-gray-200 dark:border-slate-900">
                        <span className="text-lg font-black uppercase">
                            Total Amount Due
                        </span>
                        <span className="text-2xl font-black">
                            {money(totalAmountDue, hideAmount)}
                        </span>
                    </div>
                </div>
            </div>

            {invoice.description && (
                <div className="mt-8 border-t border-slate-300 pt-5">
                    <p className="text-xs font-black uppercase tracking-wider">
                        Description
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {invoice.description}
                    </p>
                </div>
            )}

            {invoice.notes && (
                <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-wider">
                        Notes
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {invoice.notes}
                    </p>
                </div>
            )}

            <div className="mt-12 border-t-2 border-gray-200 dark:border-slate-900 pt-5">
                <div className="flex items-end justify-between gap-8">
                    <div>
                        <p className="text-xs font-bold">ALIBATON</p>
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-500">
                            Heavy Equipment & Logistics Management System
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-500">
                            Status
                        </p>
                        <p className="mt-1 text-sm font-black uppercase">
                            {invoice.status}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
