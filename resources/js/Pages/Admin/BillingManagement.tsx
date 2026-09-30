import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AdminLayout from "../../Layouts/AdminLayout";

import {
    AlertCircle,
    Bell,
    BellRing,
    Ban,
    Check,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    FileText,
    Mail,
    MoreVertical,
    Receipt,
    RefreshCw,
    Search,
    X,
    AlertTriangle,
    LayoutGrid,
    List,
    ExternalLink,
    Edit3,
    Save,
    FilePenLine,
    CalendarDays,
    BriefcaseBusiness,
    UserRound,
    Wallet,
    StickyNote,
    Percent,
    Calculator,
    Printer,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type InvoiceStatus =
    "Pending" | "Partial" | "Paid" | "Rejected" | "Overdue" | "Approved";

type InvoiceItem = {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
};

type Invoice = {
    id: number;
    /* Invoice No. — NULL hanggang APPROVED */
    number: string;
    /* May Invoice No. na? (false = billing record pa lang) */
    hasInvoiceNumber?: boolean;
    /* OK BILLING NUMBER */
    billingNumber?: string | null;
    client: string;
    clientEmail: string;
    clientAddress: string;
    clientContact: string;
    project: string;
    items: InvoiceItem[];
    taxRate: number;
    amount: number;
    /* OK VERIFICATION DATA — billing vs job order */
    baseAmount?: number;
    vatRate?: number;
    vatAmount?: number;
    additionalCharges?: number;
    totalAmount?: number;
    jobOrderNumber?: string | null;
    jobOrderStatus?: string | null;
    quotationTotal?: number;
    billingMonths?: number;
    monthlyAmount?: number;
    expectedAmount?: number;
    amountDifference?: number;
    matchesJobOrder?: boolean | null;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    serviceMonth?: string | null;
    billingSequence?: number | null;
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
    withholdingTax?: number;
    totalAmountDue?: number;
    paymentMethod?: string | null;
    supportingDocuments?: {
        quotation?: string | null;
        purchaseOrder?: string | null;
        contract?: string | null;
    };
};

type PendingJobOrder = {
    id: number;
    number: string;
    client: string;
    clientEmail?: string | null;
    clientContact?: string | null;
    clientAddress?: string | null;
    project: string;
    location?: string | null;
    equipment?: string | null;
    operator?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    amount: number;
    /* OK APPROVED QUOTATION */
    quotationTotal?: number;
    billingMonths?: number;
    monthlyAmount?: number;
    billingStatus?: string | null;
    pendingCount?: number;
    approvedCount?: number;
    rejectedCount?: number;
    billings?: {
        id: number;
        billingNumber?: string | null;
        serviceMonth?: string | null;
        status?: string;
        baseAmount?: number;
        totalAmount?: number;
    }[];
    description?: string | null;
    notes?: string | null;
    status: string;
    generatedAt?: string | null;
    generatedByName?: string | null;
    staffName?: string | null;
};

type Notification = {
    id: number | string;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    read: boolean;
    createdAt?: string;
    created_at?: string;
    link?: string;
    invoiceId?: number;
};

type AdminStats = {
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
    overdue: number;
    partial: number;
    total?: number;
    pendingJobOrders?: number;
    mismatched?: number;
};

type PageProps = {
    invoices?: Invoice[];
    pendingInvoices?: Invoice[];
    allInvoices?: Invoice[];
    pendingJobOrders?: PendingJobOrder[];
    jobOrders?: PendingJobOrder[];
    stats?: AdminStats;
    notifications?: Notification[];
    flash?: { success?: string; error?: string };
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

/** "2026-01" -> "Jan 2026" (Service Date) */
const formatMonthLabel = (value: string | null | undefined) => {
    if (!value) return "—";
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return value;
    const date = new Date(Date.UTC(year, month - 1, 1));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        timeZone: "UTC",
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

const normalizeDateForInput = (value: string | null | undefined) => {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const computeVAT = (amount: number) => {
    const vatAmount = amount * VAT_RATE;
    const netAmount = amount;
    const totalAmountDue = netAmount + vatAmount;
    return { vatAmount, netAmount, totalAmountDue };
};

const escapeHtml = (value: unknown) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

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
    | OK REAL BREAKDOWN + VERIFICATION DATA (mula sa DB)
    |--------------------------------------------------------------------------
    */
    const baseAmount = num(raw?.baseAmount ?? raw?.base_amount, amount);
    const vatAmount = num(raw?.vatAmount ?? raw?.vat_amount);
    const additionalCharges = num(
        raw?.additionalCharges ?? raw?.additional_charges,
    );
    const monthlyAmount = num(raw?.monthlyAmount ?? raw?.monthly_amount);
    const expectedAmount = num(
        raw?.expectedAmount ?? raw?.expected_amount,
        monthlyAmount,
    );

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
        totalAmount: baseAmount + additionalCharges + vatAmount,
        jobOrderNumber: raw?.jobOrderNumber ?? raw?.job_order_number ?? null,
        jobOrderStatus: raw?.jobOrderStatus ?? raw?.job_order_status ?? null,
        quotationTotal: num(raw?.quotationTotal ?? raw?.quotation_total),
        billingMonths: num(raw?.billingMonths ?? raw?.billing_months),
        monthlyAmount,
        expectedAmount,
        amountDifference: num(
            raw?.amountDifference ?? raw?.amount_difference,
            baseAmount - expectedAmount,
        ),
        matchesJobOrder: raw?.matchesJobOrder ?? raw?.matches_job_order ?? null,
        verifiedAt: raw?.verifiedAt ?? raw?.verified_at ?? null,
        verifiedBy: raw?.verifiedBy ?? raw?.verified_by ?? null,
        serviceMonth: raw?.serviceMonth ?? raw?.service_month ?? null,
        billingSequence:
            num(raw?.billingSequence ?? raw?.billing_sequence) || null,
        client: String(raw?.client ?? raw?.clientName ?? "—"),
        clientEmail: String(raw?.clientEmail ?? raw?.client_email ?? ""),
        clientAddress: String(raw?.clientAddress ?? raw?.client_address ?? ""),
        clientContact: String(raw?.clientContact ?? raw?.client_contact ?? ""),
        project: String(raw?.project ?? "—"),
        items,
        taxRate: num(raw?.vatRate ?? raw?.vat_rate),
        amount,
        status,
        dueDate: String(raw?.dueDate ?? raw?.due_date ?? ""),
        createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
        notes: String(raw?.notes ?? ""),
        description: raw?.description ?? "",
        jobOrderId:
            raw?.jobOrderId ?? raw?.job_order_id ?? raw?.jobOrder?.id ?? null,
        staffId: raw?.staffId ?? raw?.userId ?? raw?.user_id ?? undefined,
        staffName: raw?.staffName ?? raw?.user?.name ?? undefined,
        rejectionReason: raw?.rejectionReason ?? raw?.rejection_reason ?? null,
        rejectedAt: raw?.rejectedAt ?? raw?.rejected_at ?? null,
        approvedAt: raw?.approvedAt ?? raw?.approved_at ?? null,
        approvedBy: raw?.approvedBy ?? raw?.approved_by ?? null,
        withholdingTax: 0,
        totalAmountDue: baseAmount + additionalCharges + vatAmount,
        paymentMethod:
            raw?.paymentMethod ?? raw?.payment_method ?? "Bank Transfer",
        supportingDocuments: {
            quotation:
                raw?.quotation ?? raw?.supporting_documents?.quotation ?? null,
            purchaseOrder:
                raw?.purchaseOrder ??
                raw?.purchase_order ??
                raw?.supporting_documents?.purchaseOrder ??
                null,
            contract:
                raw?.contract ?? raw?.supporting_documents?.contract ?? null,
        },
    };
};

const normalizeNotification = (raw: any): Notification => ({
    id: raw?.id ?? 0,
    type: raw?.type ?? "info",
    title: raw?.title ?? "Notification",
    message: raw?.message ?? "",
    read: Boolean(raw?.read),
    createdAt: raw?.createdAt ?? raw?.created_at ?? "",
    link: raw?.link,
    invoiceId: raw?.invoiceId,
});

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function BillingManagement() {
    const page = usePage<PageProps>();

    const backendInvoices = page.props.invoices ?? page.props.allInvoices ?? [];
    const backendPendingInvoices = page.props.pendingInvoices ?? [];
    /* OK Job Orders = reference ng admin para sa verification (hindi na "pending approval") */
    const backendPendingJobOrders =
        page.props.jobOrders ?? page.props.pendingJobOrders ?? [];
    const backendStats = page.props.stats ?? {
        pending: 0,
        approved: 0,
        rejected: 0,
        paid: 0,
        overdue: 0,
        partial: 0,
        total: 0,
        pendingJobOrders: 0,
    };
    const backendNotifications = (page.props.notifications ?? []).map(
        normalizeNotification,
    );

    const [invoices, setInvoices] = useState<Invoice[]>(
        backendInvoices.map(normalizeInvoice),
    );
    const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>(
        backendPendingInvoices.map(normalizeInvoice),
    );
    const [pendingJobOrders, setPendingJobOrders] = useState<PendingJobOrder[]>(
        backendPendingJobOrders,
    );
    const [stats, setStats] = useState<AdminStats>(backendStats);
    const [notifications, setNotifications] =
        useState<Notification[]>(backendNotifications);
    const [unreadCount, setUnreadCount] = useState<number>(
        backendNotifications.filter((n) => !n.read).length,
    );

    /* Alias — para ma-clear ang pangalan ng tab (reference data lang) */
    const jobOrders = pendingJobOrders;

    const [activeTab, setActiveTab] = useState<
        "pending" | "all" | "job-orders"
    >("pending");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"All" | InvoiceStatus>(
        "All",
    );
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    const [hideAmount, setHideAmount] = useState(true);

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
        null,
    );
    const [showInvoiceView, setShowInvoiceView] = useState(false);
    const [showInvoiceEdit, setShowInvoiceEdit] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);

    const [rejectionReason, setRejectionReason] = useState("");
    const [approvalNotes, setApprovalNotes] = useState("");
    const [isSavingInvoice, setIsSavingInvoice] = useState(false);

    const [editingInvoice, setEditingInvoice] = useState({
        number: "",
        client: "",
        project: "",
        amount: "",
        dueDate: "",
        description: "",
        notes: "",
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const [successMessage, setSuccessMessage] = useState("");
    const flashSuccess = page.props.flash?.success;
    const flashError = page.props.flash?.error;

    /*
    |--------------------------------------------------------------------------
    | SYNC PROPS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        setInvoices(backendInvoices.map(normalizeInvoice));
        setPendingInvoices(backendPendingInvoices.map(normalizeInvoice));
        setPendingJobOrders(backendPendingJobOrders);
        setStats(backendStats);
    }, [
        page.props.invoices,
        page.props.allInvoices,
        page.props.pendingInvoices,
        page.props.pendingJobOrders,
        page.props.stats,
    ]);

    useEffect(() => {
        setNotifications(backendNotifications);
        setUnreadCount(backendNotifications.filter((n) => !n.read).length);
    }, [page.props.notifications]);

    /*
    |--------------------------------------------------------------------------
    | SUCCESS / ERROR
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!flashSuccess) return;
        setSuccessMessage(String(flashSuccess));
        const timer = window.setTimeout(() => setSuccessMessage(""), 8000);
        return () => window.clearTimeout(timer);
    }, [flashSuccess]);

    /*
    |--------------------------------------------------------------------------
    | SEARCH & FILTER
    |--------------------------------------------------------------------------
    */

    const filteredInvoices = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        let filtered = [...invoices];

        if (keyword) {
            filtered = filtered.filter((invoice) =>
                [
                    invoice.number,
                    invoice.client,
                    invoice.project,
                    invoice.clientEmail,
                    invoice.status,
                ]
                    .filter(Boolean)
                    .some((value) =>
                        String(value).toLowerCase().includes(keyword),
                    ),
            );
        }

        if (statusFilter !== "All") {
            filtered = filtered.filter(
                (invoice) => invoice.status === statusFilter,
            );
        }

        return filtered;
    }, [invoices, search, statusFilter]);

    const filteredPending = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return pendingInvoices;
        return pendingInvoices.filter((invoice) =>
            [invoice.number, invoice.client, invoice.project]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword)),
        );
    }, [pendingInvoices, search]);

    const filteredPendingJobOrders = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return pendingJobOrders;
        return pendingJobOrders.filter((jobOrder) =>
            [jobOrder.number, jobOrder.client, jobOrder.project]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword)),
        );
    }, [pendingJobOrders, search]);

    /*
    |--------------------------------------------------------------------------
    | REFRESH
    |--------------------------------------------------------------------------
    */

    const refreshData = () => {
        setIsRefreshing(true);
        const scrollY = window.scrollY;

        router.reload({
            only: [
                "invoices",
                "pendingInvoices",
                "allInvoices",
                "pendingJobOrders",
                "stats",
                "notifications",
                "flash",
            ],
            onSuccess: () => {
                window.requestAnimationFrame(() => {
                    window.scrollTo({
                        top: scrollY,
                        behavior: "instant" as ScrollBehavior,
                    });
                });
            },
            onFinish: () => setIsRefreshing(false),
        });
    };

    /*
    |--------------------------------------------------------------------------
    | VIEW / EDIT INVOICE
    |--------------------------------------------------------------------------
    */

    const openInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setShowInvoiceView(true);
    };

    const openEditInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setEditingInvoice({
            number: invoice.number,
            client: invoice.client === "—" ? "" : invoice.client,
            project: invoice.project === "—" ? "" : invoice.project,
            amount: String(invoice.amount),
            dueDate: normalizeDateForInput(invoice.dueDate),
            description: invoice.description ?? "",
            notes: invoice.notes ?? "",
        });
        setShowInvoiceEdit(true);
    };

    const submitInvoiceEdit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedInvoice || isSavingInvoice) return;

        const number = editingInvoice.number.trim();
        const client = editingInvoice.client.trim();
        const project = editingInvoice.project.trim();
        const amount = Number(editingInvoice.amount);

        if (!number) {
            alert("Please enter the invoice number.");
            return;
        }
        if (!client) {
            alert("Please enter the client name.");
            return;
        }
        if (!project) {
            alert("Please enter the project name.");
            return;
        }
        if (!editingInvoice.amount || !Number.isFinite(amount)) {
            alert("Please enter a valid invoice amount.");
            return;
        }
        if (amount < 0) {
            alert("Invoice amount cannot be negative.");
            return;
        }

        setIsSavingInvoice(true);
        setSuccessMessage("");

        router.put(
            `/admin/billing/${selectedInvoice.id}`,
            {
                number,
                client,
                project,
                amount: editingInvoice.amount,
                due_date: editingInvoice.dueDate || null,
                description: editingInvoice.description.trim(),
                notes: editingInvoice.notes.trim(),
            },
            {
                preserveScroll: true,
                onStart: () => setIsSavingInvoice(true),
                onSuccess: () => {
                    setIsSavingInvoice(false);
                    setShowInvoiceEdit(false);
                    setSuccessMessage(
                        `Invoice ${number} was successfully updated.`,
                    );
                    refreshData();
                },
                onError: (errors) => {
                    setIsSavingInvoice(false);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to update the invoice.",
                    );
                },
                onFinish: () => setIsSavingInvoice(false),
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | APPROVE / REJECT INVOICE
    |--------------------------------------------------------------------------
    */

    const openApproveModal = (invoice: Invoice) => {
        /*
        |--------------------------------------------------------------------------
        | ✅ VERIFICATION GATE — hindi puwedeng i-approve ang mismatch
        |--------------------------------------------------------------------------
        |
        | Ang `null` (walang approved quotation data sa JO) ay "Review" —
        | manual pa rin ang beripikasyon ng admin, kaya pinapayagan.
        |
        */
        if (invoice.jobOrderId && invoice.matchesJobOrder === false) {
            setSuccessMessage(
                `Hindi tugma ang billing at job order (difference: ${money(
                    Math.abs(invoice.amountDifference ?? 0),
                    false,
                )}). I-reject para makita ng staff ang problema.`,
            );
            return;
        }

        setSelectedInvoice(invoice);
        setApprovalNotes("");
        setShowApproveModal(true);
    };

    const approveInvoice = () => {
        if (!selectedInvoice || isProcessing) return;

        setIsProcessing(true);
        setSuccessMessage("");

        router.post(
            `/admin/billing/${selectedInvoice.id}/approve`,
            { notes: approvalNotes.trim() || null },
            {
                preserveScroll: true,
                onStart: () => setIsProcessing(true),
                onSuccess: () => {
                    setIsProcessing(false);
                    setShowApproveModal(false);
                    setSuccessMessage(
                        `Invoice ${selectedInvoice.number} has been APPROVED successfully.`,
                    );
                    refreshData();
                },
                onError: (errors) => {
                    setIsProcessing(false);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to approve invoice.",
                    );
                },
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    const openRejectModal = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setRejectionReason("");
        setShowRejectModal(true);
    };

    const rejectInvoice = () => {
        if (!selectedInvoice || isProcessing) return;

        if (!rejectionReason.trim()) {
            alert("Please provide a reason for rejection.");
            return;
        }

        setIsProcessing(true);
        setSuccessMessage("");

        router.post(
            `/admin/billing/${selectedInvoice.id}/reject`,
            { reason: rejectionReason.trim() },
            {
                preserveScroll: true,
                onStart: () => setIsProcessing(true),
                onSuccess: () => {
                    setIsProcessing(false);
                    setShowRejectModal(false);
                    setSuccessMessage(
                        `Invoice ${selectedInvoice.number} has been REJECTED.`,
                    );
                    refreshData();
                },
                onError: (errors) => {
                    setIsProcessing(false);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to reject invoice.",
                    );
                },
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | APPROVE / REJECT JOB ORDER
    |--------------------------------------------------------------------------
    */

    const approveJobOrder = (jobOrder: PendingJobOrder) => {
        if (isProcessing) return;

        const confirmed = window.confirm(
            `Approve Job Order ${jobOrder.number}?\n\nAn invoice will be automatically created.`,
        );
        if (!confirmed) return;

        setIsProcessing(true);
        setSuccessMessage("");

        router.post(
            `/admin/job-orders/${jobOrder.id}/approve`,
            {},
            {
                preserveScroll: true,
                onStart: () => setIsProcessing(true),
                onSuccess: () => {
                    setIsProcessing(false);
                    setSuccessMessage(
                        `Job Order ${jobOrder.number} approved. Invoice has been created.`,
                    );
                    refreshData();
                },
                onError: (errors) => {
                    setIsProcessing(false);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to approve Job Order.",
                    );
                },
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    const rejectJobOrder = (jobOrder: PendingJobOrder) => {
        if (isProcessing) return;

        const reason = window.prompt(
            `Reject Job Order ${jobOrder.number}?\n\nPlease provide a reason:`,
        );
        if (!reason || !reason.trim()) return;

        setIsProcessing(true);
        setSuccessMessage("");

        router.post(
            `/admin/job-orders/${jobOrder.id}/reject`,
            { reason: reason.trim() },
            {
                preserveScroll: true,
                onStart: () => setIsProcessing(true),
                onSuccess: () => {
                    setIsProcessing(false);
                    setSuccessMessage(
                        `Job Order ${jobOrder.number} rejected. Staff has been notified.`,
                    );
                    refreshData();
                },
                onError: (errors) => {
                    setIsProcessing(false);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to reject Job Order.",
                    );
                },
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | SEND INVOICE TO CLIENT
    |--------------------------------------------------------------------------
    */

    const sendInvoiceToClient = (invoice: Invoice) => {
        if (!invoice || isSendingEmail) return;

        const confirmed = window.confirm(
            `Send invoice ${invoice.number} to ${invoice.client}?\n\nThe invoice will be sent via email.`,
        );
        if (!confirmed) return;

        setIsSendingEmail(true);

        router.post(
            `/admin/billing/${invoice.id}/send-email`,
            {},
            {
                preserveScroll: true,
                onStart: () => setIsSendingEmail(true),
                onSuccess: () => {
                    setIsSendingEmail(false);
                    setSuccessMessage(
                        `Invoice ${invoice.number} has been sent to ${invoice.client}.`,
                    );
                },
                onError: (errors) => {
                    setIsSendingEmail(false);
                    const firstError = Object.values(errors ?? {})[0];
                    alert(
                        firstError
                            ? String(firstError)
                            : "Failed to send invoice email.",
                    );
                },
                onFinish: () => setIsSendingEmail(false),
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | PRINT INVOICE
    |--------------------------------------------------------------------------
    */

    const printInvoice = (invoice: Invoice) => {
        if (!invoice) return;

        const totalSales = invoice.amount;
        const vatAmount = totalSales * VAT_RATE;
        const netOfVAT = totalSales;
        const totalAmountDue = netOfVAT + vatAmount;

        const itemsRows = invoice.items
            .map(
                (item) => `
                    <tr>
                        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${escapeHtml(item.quantity)}</td>
                        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(item.description)}</td>
                        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${escapeHtml(money(item.unitPrice, false))}</td>
                        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${escapeHtml(money(item.quantity * item.unitPrice, false))}</td>
                    </tr>
                `,
            )
            .join("");

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Invoice ${escapeHtml(invoice.number)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #111;
                        padding: 40px;
                        max-width: 900px;
                        margin: 0 auto;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 3px solid #facc15;
                        padding-bottom: 20px;
                        margin-bottom: 24px;
                        gap: 20px;
                    }
                    .company h1 {
                        font-size: 22px;
                        font-weight: 900;
                        margin: 0;
                        letter-spacing: 1px;
                    }
                    .company p {
                        margin: 4px 0 0;
                        font-size: 12px;
                        color: #666;
                    }
                    .invoice-title h2 {
                        font-size: 32px;
                        font-weight: 900;
                        margin: 0;
                        text-align: right;
                        color: #facc15;
                        letter-spacing: 2px;
                    }
                    .invoice-title p {
                        margin: 4px 0 0;
                        font-size: 14px;
                        text-align: right;
                        font-weight: 700;
                    }
                    .meta {
                        display: flex;
                        justify-content: space-between;
                        gap: 30px;
                        margin-bottom: 24px;
                        flex-wrap: wrap;
                    }
                    .meta-box { flex: 1; min-width: 200px; }
                    .meta-box h3 {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #999;
                        margin: 0 0 6px;
                    }
                    .meta-box p { margin: 2px 0; font-size: 13px; }
                    .status {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 999px;
                        font-size: 11px;
                        font-weight: 900;
                        text-transform: uppercase;
                        background: #fef3c7;
                        color: #92400e;
                    }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    thead th {
                        background: #111;
                        color: #fff;
                        padding: 10px;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        border: 1px solid #111;
                    }
                    .totals { width: 320px; margin-left: auto; }
                    .totals tr td {
                        padding: 8px 12px;
                        font-size: 13px;
                        border-bottom: 1px solid #eee;
                    }
                    .totals tr td:last-child { text-align: right; font-weight: 700; }
                    .totals tr.grand td {
                        border-top: 2px solid #facc15;
                        border-bottom: 2px solid #facc15;
                        font-size: 16px;
                        font-weight: 900;
                        color: #b45309;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 16px;
                        border-top: 1px solid #ddd;
                        font-size: 11px;
                        color: #999;
                        text-align: center;
                    }
                    .section { margin-bottom: 20px; }
                    .section h3 {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #999;
                        margin: 0 0 6px;
                    }
                    .section p {
                        margin: 0;
                        font-size: 13px;
                        white-space: pre-wrap;
                        line-height: 1.6;
                    }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company">
                        <h1>YOUR COMPANY NAME</h1>
                        <p>Heavy Equipment &amp; Logistics Services</p>
                        <p>123 Business Address, Philippines</p>
                        <p>contact@yourcompany.com | +63 900 000 0000</p>
                    </div>
                    <div class="invoice-title">
                        <h2>INVOICE</h2>
                        <p>${escapeHtml(invoice.number)}</p>
                    </div>
                </div>

                <div class="meta">
                    <div class="meta-box">
                        <h3>Billed To</h3>
                        <p><strong>${escapeHtml(invoice.client)}</strong></p>
                        ${invoice.clientEmail ? `<p>${escapeHtml(invoice.clientEmail)}</p>` : ""}
                        ${invoice.clientContact ? `<p>${escapeHtml(invoice.clientContact)}</p>` : ""}
                        ${invoice.clientAddress ? `<p>${escapeHtml(invoice.clientAddress)}</p>` : ""}
                    </div>
                    <div class="meta-box">
                        <h3>Invoice Details</h3>
                        <p><strong>Invoice #:</strong> ${escapeHtml(invoice.number)}</p>
                        <p><strong>Invoice Date:</strong> ${escapeHtml(formatDate(invoice.createdAt))}</p>
                        <p><strong>Due Date:</strong> ${escapeHtml(formatDate(invoice.dueDate))}</p>
                        ${invoice.jobOrderId ? `<p><strong>Job Order:</strong> JO-${escapeHtml(invoice.jobOrderId)}</p>` : ""}
                        <p><strong>Status:</strong> <span class="status">${escapeHtml(invoice.status)}</span></p>
                    </div>
                    <div class="meta-box">
                        <h3>Project</h3>
                        <p><strong>${escapeHtml(invoice.project)}</strong></p>
                        ${invoice.paymentMethod ? `<p style="margin-top:8px;"><strong>Payment Method:</strong> ${escapeHtml(invoice.paymentMethod)}</p>` : ""}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width:8%;">Qty</th>
                            <th style="text-align:left;">Description</th>
                            <th style="width:18%;text-align:right;">Unit Price</th>
                            <th style="width:18%;text-align:right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>

                <table class="totals">
                    <tr><td>Total Sales</td><td>${escapeHtml(money(totalSales, false))}</td></tr>
                    <tr><td>VAT (12%)</td><td>${escapeHtml(money(vatAmount, false))}</td></tr>
                    <tr><td>Net of VAT</td><td>${escapeHtml(money(netOfVAT, false))}</td></tr>
                    <tr><td>Withholding Tax</td><td>${escapeHtml(money(0, false))}</td></tr>
                    <tr class="grand"><td>Total Amount Due</td><td>${escapeHtml(money(totalAmountDue, false))}</td></tr>
                </table>

                ${
                    invoice.description
                        ? `<div class="section"><h3>Description</h3><p>${escapeHtml(invoice.description)}</p></div>`
                        : ""
                }
                ${
                    invoice.notes
                        ? `<div class="section"><h3>Notes</h3><p>${escapeHtml(invoice.notes)}</p></div>`
                        : ""
                }

                <div class="footer">
                    Thank you for your business! This is a computer-generated invoice.
                </div>

                <script>
                    window.onload = function () {
                        setTimeout(function () { window.print(); }, 300);
                    };
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) {
            alert("Please allow pop-ups to print the invoice.");
            return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    /*
    |--------------------------------------------------------------------------
    | NOTIFICATIONS
    |--------------------------------------------------------------------------
    */

    const markAsRead = (notificationId: number | string) => {
        router.post(
            `/admin/notifications/${notificationId}/read`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNotifications((prev) =>
                        prev.map((n) =>
                            n.id === notificationId ? { ...n, read: true } : n,
                        ),
                    );
                    setUnreadCount((prev) => Math.max(0, prev - 1));
                },
            },
        );
    };

    const markAllAsRead = () => {
        router.post(
            "/admin/notifications/mark-all-read",
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNotifications((prev) =>
                        prev.map((n) => ({ ...n, read: true })),
                    );
                    setUnreadCount(0);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <AdminLayout title="Admin - Billing & Invoicing">
            <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
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
                                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                                        Review, approve, and manage all invoices
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* NOTIFICATION BELL + REFRESH */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNotificationPanel((v) => !v)
                                    }
                                    className={[
                                        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white dark:bg-black text-gray-600 dark:text-slate-400 transition",
                                        showNotificationPanel
                                            ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                                            : "border-gray-200 dark:border-slate-700 hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400",
                                    ].join(" ")}
                                    aria-label="Notifications"
                                >
                                    {unreadCount > 0 ? (
                                        <BellRing size={18} />
                                    ) : (
                                        <Bell size={18} />
                                    )}
                                    {unreadCount > 0 && (
                                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                                            {unreadCount > 99
                                                ? "99+"
                                                : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotificationPanel && (
                                    <NotificationPanel
                                        notifications={notifications}
                                        onClose={() =>
                                            setShowNotificationPanel(false)
                                        }
                                        onMarkAllRead={markAllAsRead}
                                        onMarkAsRead={markAsRead}
                                    />
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={refreshData}
                                disabled={isRefreshing}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black px-4 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={16}
                                    className={
                                        isRefreshing ? "animate-spin" : ""
                                    }
                                />
                                {isRefreshing ? "Refreshing..." : "Refresh"}
                            </button>
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
                                <p className="font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                    Success
                                </p>
                                <p className="mt-1 text-sm leading-6 text-emerald-600/80 dark:text-emerald-400/80">
                                    {successMessage || flashSuccess}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSuccessMessage("")}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-400/10 hover:text-emerald-700 dark:hover:text-emerald-300"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    )}

                    {/* ERROR */}
                    {flashError && (
                        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm text-red-700 dark:text-red-300">
                            <AlertCircle
                                size={20}
                                className="mt-0.5 shrink-0"
                            />
                            <span>{flashError}</span>
                        </div>
                    )}

                    {/* STATS */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <StatCard
                            icon={<Clock size={18} />}
                            label="Pending"
                            value={stats.pending}
                            color="yellow"
                            active={statusFilter === "Pending"}
                            onClick={() => {
                                setActiveTab("all");
                                setStatusFilter(
                                    statusFilter === "Pending"
                                        ? "All"
                                        : "Pending",
                                );
                            }}
                        />
                        <StatCard
                            icon={<CheckCircle2 size={18} />}
                            label="Approved"
                            value={stats.approved}
                            color="blue"
                            active={statusFilter === "Approved"}
                            onClick={() => {
                                setActiveTab("all");
                                setStatusFilter(
                                    statusFilter === "Approved"
                                        ? "All"
                                        : "Approved",
                                );
                            }}
                        />
                        <StatCard
                            icon={<Percent size={18} />}
                            label="Partial"
                            value={stats.partial}
                            color="orange"
                            active={statusFilter === "Partial"}
                            onClick={() => {
                                setActiveTab("all");
                                setStatusFilter(
                                    statusFilter === "Partial"
                                        ? "All"
                                        : "Partial",
                                );
                            }}
                        />
                        <StatCard
                            icon={<CheckCircle2 size={18} />}
                            label="Paid"
                            value={stats.paid}
                            color="green"
                            active={statusFilter === "Paid"}
                            onClick={() => {
                                setActiveTab("all");
                                setStatusFilter(
                                    statusFilter === "Paid" ? "All" : "Paid",
                                );
                            }}
                        />
                        <StatCard
                            icon={<AlertTriangle size={18} />}
                            label="Overdue"
                            value={stats.overdue}
                            color="red"
                            active={statusFilter === "Overdue"}
                            onClick={() => {
                                setActiveTab("all");
                                setStatusFilter(
                                    statusFilter === "Overdue"
                                        ? "All"
                                        : "Overdue",
                                );
                            }}
                        />
                        <StatCard
                            icon={<Ban size={18} />}
                            label="Rejected"
                            value={stats.rejected}
                            color="red"
                            active={statusFilter === "Rejected"}
                            onClick={() => {
                                setActiveTab("all");
                                setStatusFilter(
                                    statusFilter === "Rejected"
                                        ? "All"
                                        : "Rejected",
                                );
                            }}
                        />
                    </div>

                    {/* TABS */}
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            <TabButton
                                active={activeTab === "job-orders"}
                                onClick={() => {
                                    setActiveTab("job-orders");
                                    setSearch("");
                                    setStatusFilter("All");
                                }}
                                icon={<BriefcaseBusiness size={18} />}
                                label="Job Orders (Reference)"
                                count={jobOrders.length}
                            />
                            <TabButton
                                active={activeTab === "pending"}
                                onClick={() => {
                                    setActiveTab("pending");
                                    setSearch("");
                                    setStatusFilter("All");
                                }}
                                icon={<Clock size={18} />}
                                label="Billing Verification"
                                count={stats.pending}
                            />
                            <TabButton
                                active={activeTab === "all"}
                                onClick={() => {
                                    setActiveTab("all");
                                    setSearch("");
                                }}
                                icon={<FileText size={18} />}
                                label="All Billing Records"
                                count={invoices.length}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search
                                    size={17}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500"
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={
                                        activeTab === "job-orders"
                                            ? "Search job orders..."
                                            : "Search invoices..."
                                    }
                                    className="w-48 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white outline-none transition placeholder:text-gray-600 dark:placeholder:text-slate-600 focus:border-yellow-400/50 sm:w-60"
                                />
                            </div>

                            {activeTab === "all" && (
                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(
                                            e.target.value as
                                                "All" | InvoiceStatus,
                                        )
                                    }
                                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black px-3 py-2.5 text-sm text-gray-800 dark:text-slate-200 outline-none focus:border-yellow-400/50"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                    <option value="Partial">Partial</option>
                                </select>
                            )}

                            <button
                                type="button"
                                onClick={() => setHideAmount((v) => !v)}
                                aria-label={
                                    hideAmount ? "Show amounts" : "Hide amounts"
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                            >
                                {hideAmount ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setViewMode(
                                        viewMode === "list" ? "grid" : "list",
                                    )
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                            >
                                {viewMode === "list" ? (
                                    <LayoutGrid size={18} />
                                ) : (
                                    <List size={18} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* CONTENT */}
                    {activeTab === "job-orders" ? (
                        <PendingJobOrdersList
                            jobOrders={filteredPendingJobOrders}
                            hideAmount={hideAmount}
                        />
                    ) : activeTab === "pending" ? (
                        <PendingInvoicesList
                            invoices={filteredPending}
                            onView={openInvoice}
                            onApprove={openApproveModal}
                            onReject={openRejectModal}
                            isProcessing={isProcessing}
                            hideAmount={hideAmount}
                        />
                    ) : (
                        <AllInvoicesList
                            invoices={filteredInvoices}
                            onView={openInvoice}
                            onEdit={openEditInvoice}
                            onApprove={openApproveModal}
                            onReject={openRejectModal}
                            onSendEmail={sendInvoiceToClient}
                            onPrint={printInvoice}
                            viewMode={viewMode}
                            isProcessing={isProcessing}
                            isSendingEmail={isSendingEmail}
                            hideAmount={hideAmount}
                        />
                    )}
                </div>
            </div>

            {/* INVOICE VIEW MODAL */}
            {showInvoiceView && selectedInvoice && (
                <AdminInvoiceViewModal
                    invoice={selectedInvoice}
                    onClose={() => setShowInvoiceView(false)}
                    onApprove={() => {
                        setShowInvoiceView(false);
                        openApproveModal(selectedInvoice);
                    }}
                    onReject={() => {
                        setShowInvoiceView(false);
                        openRejectModal(selectedInvoice);
                    }}
                    onSendEmail={() => {
                        setShowInvoiceView(false);
                        sendInvoiceToClient(selectedInvoice);
                    }}
                    onPrint={() => printInvoice(selectedInvoice)}
                    isProcessing={isProcessing}
                    isSendingEmail={isSendingEmail}
                    hideAmount={hideAmount}
                />
            )}

            {/* EDIT INVOICE MODAL */}
            {showInvoiceEdit && selectedInvoice && (
                <Modal
                    title="Edit Invoice"
                    onClose={() => {
                        if (!isSavingInvoice) setShowInvoiceEdit(false);
                    }}
                    size="lg"
                >
                    <form onSubmit={submitInvoiceEdit} className="space-y-6">
                        <div className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.10] via-black to-black p-5 sm:p-6">
                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-3xl" />
                            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 shadow-lg shadow-yellow-950/20">
                                        <FilePenLine size={26} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600/70 dark:text-yellow-400/70">
                                            Invoice Editor
                                        </p>
                                        <h3 className="mt-1 truncate text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
                                            {selectedInvoice.number}
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                                            Update invoice information and
                                            billing details.
                                        </p>
                                    </div>
                                </div>
                                <AdminStatusBadge
                                    status={selectedInvoice.status}
                                />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <EditInfoCard
                                icon={<FileText size={17} />}
                                label="Invoice Number"
                                value={selectedInvoice.number}
                            />
                            <EditInfoCard
                                icon={<BriefcaseBusiness size={17} />}
                                label="Job Order"
                                value={
                                    selectedInvoice.jobOrderId
                                        ? `JO-${selectedInvoice.jobOrderId}`
                                        : "—"
                                }
                            />
                            <EditInfoCard
                                icon={<CalendarDays size={17} />}
                                label="Invoice Date"
                                value={formatDate(selectedInvoice.createdAt)}
                            />
                        </div>

                        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                    <FileText size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                        Invoice Number
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-600">
                                        Auto-generated invoice reference
                                    </p>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={editingInvoice.number}
                                onChange={(event) =>
                                    setEditingInvoice((current) => ({
                                        ...current,
                                        number: event.target.value,
                                    }))
                                }
                                placeholder="Invoice number"
                                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                disabled={isSavingInvoice}
                            />
                        </div>

                        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                    <UserRound size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                        Billing Information
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-600">
                                        Client and project information
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                <BeautifulFormField
                                    label="Client"
                                    required
                                    icon={<UserRound size={16} />}
                                >
                                    <input
                                        type="text"
                                        value={editingInvoice.client}
                                        onChange={(event) =>
                                            setEditingInvoice((current) => ({
                                                ...current,
                                                client: event.target.value,
                                            }))
                                        }
                                        placeholder="Enter client name"
                                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                        disabled={isSavingInvoice}
                                    />
                                </BeautifulFormField>
                                <BeautifulFormField
                                    label="Project"
                                    required
                                    icon={<BriefcaseBusiness size={16} />}
                                >
                                    <input
                                        type="text"
                                        value={editingInvoice.project}
                                        onChange={(event) =>
                                            setEditingInvoice((current) => ({
                                                ...current,
                                                project: event.target.value,
                                            }))
                                        }
                                        placeholder="Enter project name"
                                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                        disabled={isSavingInvoice}
                                    />
                                </BeautifulFormField>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                    <Wallet size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                        Payment Details
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-600">
                                        Amount and payment deadline
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                <BeautifulFormField
                                    label="Invoice Amount"
                                    required
                                    icon={<Wallet size={16} />}
                                >
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-yellow-600 dark:text-yellow-400">
                                            ₱
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editingInvoice.amount}
                                            onChange={(event) =>
                                                setEditingInvoice(
                                                    (current) => ({
                                                        ...current,
                                                        amount: event.target
                                                            .value,
                                                    }),
                                                )
                                            }
                                            placeholder="0.00"
                                            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 pl-10 pr-4 text-lg font-black text-yellow-600 dark:text-yellow-400 placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                            disabled={isSavingInvoice}
                                        />
                                    </div>
                                </BeautifulFormField>
                                <BeautifulFormField
                                    label="Due Date"
                                    icon={<CalendarDays size={16} />}
                                >
                                    <div className="relative">
                                        <CalendarDays
                                            size={17}
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-slate-600"
                                        />
                                        <input
                                            type="date"
                                            value={editingInvoice.dueDate}
                                            onChange={(event) =>
                                                setEditingInvoice(
                                                    (current) => ({
                                                        ...current,
                                                        dueDate:
                                                            event.target.value,
                                                    }),
                                                )
                                            }
                                            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                            disabled={isSavingInvoice}
                                        />
                                    </div>
                                </BeautifulFormField>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                    <FileText size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                        Invoice Description
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-600">
                                        Add service or billing details
                                    </p>
                                </div>
                            </div>
                            <textarea
                                rows={5}
                                maxLength={2000}
                                value={editingInvoice.description}
                                onChange={(event) =>
                                    setEditingInvoice((current) => ({
                                        ...current,
                                        description: event.target.value,
                                    }))
                                }
                                placeholder="Describe the equipment, service, work performed, or other invoice details..."
                                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                                disabled={isSavingInvoice}
                            />
                        </div>

                        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                    <StickyNote size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                        Internal Notes
                                    </h3>
                                    <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-600">
                                        Optional notes for this invoice
                                    </p>
                                </div>
                            </div>
                            <textarea
                                rows={4}
                                maxLength={2000}
                                value={editingInvoice.notes}
                                onChange={(event) =>
                                    setEditingInvoice((current) => ({
                                        ...current,
                                        notes: event.target.value,
                                    }))
                                }
                                placeholder="Add notes, reminders, payment instructions..."
                                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                                disabled={isSavingInvoice}
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 dark:border-slate-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={isSavingInvoice}
                                onClick={() => setShowInvoiceEdit(false)}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black px-6 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-900 hover:text-gray-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={17} /> Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingInvoice}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-7 text-sm font-black text-black shadow-lg shadow-yellow-950/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSavingInvoice ? (
                                    <>
                                        <RefreshCw
                                            size={17}
                                            className="animate-spin"
                                        />{" "}
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save size={17} /> Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* APPROVE MODAL */}
            {showApproveModal && selectedInvoice && (
                <ApproveModal
                    invoice={selectedInvoice}
                    notes={approvalNotes}
                    setNotes={setApprovalNotes}
                    onConfirm={approveInvoice}
                    onCancel={() => setShowApproveModal(false)}
                    isProcessing={isProcessing}
                    hideAmount={hideAmount}
                />
            )}

            {/* REJECT MODAL */}
            {showRejectModal && selectedInvoice && (
                <RejectModal
                    invoice={selectedInvoice}
                    reason={rejectionReason}
                    setReason={setRejectionReason}
                    onConfirm={rejectInvoice}
                    onCancel={() => setShowRejectModal(false)}
                    isProcessing={isProcessing}
                    hideAmount={hideAmount}
                />
            )}
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| JOB ORDERS LIST (reference para sa verification)
|--------------------------------------------------------------------------
|
| Hindi na ito "pending approval" — ang BILLING na ang ina-verify ng admin.
| Ito lang ang reference para makita kung tugma ang billing.
|
*/

function PendingJobOrdersList({
    jobOrders,
    hideAmount,
}: {
    jobOrders: PendingJobOrder[];
    hideAmount: boolean;
}) {
    if (jobOrders.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-600">
                    <BriefcaseBusiness size={40} />
                </div>
                <h3 className="mt-5 text-xl font-black text-gray-900 dark:text-white">
                    Walang Job Order
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                    Wala pang job order na na-create ng staff.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-white dark:bg-black shadow-2xl shadow-black/30">
            <div className="border-b border-gray-200 dark:border-slate-800 bg-yellow-400/[0.06] px-5 py-3">
                <p className="text-xs text-gray-700 dark:text-slate-300">
                    <span className="font-black">Reference only.</span> Ito ang
                    approved quotations na batayan ng billing verification.
                    Hindi na ito ina-approve dito — ang{" "}
                    <span className="font-black">Billing Verification</span> tab
                    ang may Approve/Reject.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-black/70">
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Job Order
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Client
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Project
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Approved Quotation
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Monthly
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Billing Progress
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Staff
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobOrders.map((jobOrder) => {
                            const billings = jobOrder.billings ?? [];
                            const months = jobOrder.billingMonths ?? 0;

                            return (
                                <tr
                                    key={jobOrder.id}
                                    className="border-b border-gray-200 dark:border-slate-800/70 transition-colors hover:bg-yellow-400/[0.025]"
                                >
                                    <td className="px-5 py-5">
                                        <p className="font-black text-gray-900 dark:text-white">
                                            {jobOrder.number}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                            {jobOrder.billingStatus ??
                                                jobOrder.status}
                                        </p>
                                    </td>
                                    <td className="px-5 py-5">
                                        <p className="font-semibold text-gray-800 dark:text-slate-200">
                                            {jobOrder.client}
                                        </p>
                                        {jobOrder.clientEmail && (
                                            <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                                {jobOrder.clientEmail}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-5">
                                        <p className="text-sm text-gray-700 dark:text-slate-300">
                                            {jobOrder.project}
                                        </p>
                                        {jobOrder.location && (
                                            <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                                {jobOrder.location}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-5 text-right">
                                        <p className="font-black text-yellow-600 dark:text-yellow-400">
                                            {money(
                                                jobOrder.quotationTotal ??
                                                    jobOrder.amount,
                                                hideAmount,
                                            )}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                            {months > 0
                                                ? `${months} month${
                                                      months > 1 ? "s" : ""
                                                  }`
                                                : "Walang months"}
                                        </p>
                                    </td>
                                    <td className="px-5 py-5 text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {money(
                                                jobOrder.monthlyAmount,
                                                hideAmount,
                                            )}
                                        </p>
                                        <p className="mt-1 text-[10px] text-gray-600 dark:text-slate-600">
                                            ito ang ihihambing
                                        </p>
                                    </td>
                                    <td className="px-5 py-5">
                                        {billings.length === 0 ? (
                                            <span className="text-xs text-gray-500 dark:text-slate-500">
                                                Walang billing
                                            </span>
                                        ) : (
                                            <div className="space-y-1">
                                                {billings.map((billing) => (
                                                    <div
                                                        key={billing.id}
                                                        className="flex items-center gap-2 text-[11px]"
                                                    >
                                                        <span className="font-bold text-gray-800 dark:text-slate-200">
                                                            {billing.billingNumber ??
                                                                `#${billing.id}`}
                                                        </span>
                                                        <span className="text-gray-600 dark:text-slate-600">
                                                            {billing.serviceMonth
                                                                ? formatMonthLabel(
                                                                      billing.serviceMonth,
                                                                  )
                                                                : "—"}
                                                        </span>
                                                        <AdminStatusBadge
                                                            status={
                                                                billing.status ??
                                                                "Pending"
                                                            }
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            <span className="rounded border border-yellow-400/25 bg-yellow-400/5 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                                                P: {jobOrder.pendingCount ?? 0}
                                            </span>
                                            <span className="rounded border border-emerald-400/25 bg-emerald-400/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                A: {jobOrder.approvedCount ?? 0}
                                            </span>
                                            <span className="rounded border border-red-400/25 bg-red-400/5 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                                R: {jobOrder.rejectedCount ?? 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-5">
                                        <p className="text-sm text-gray-700 dark:text-slate-300">
                                            {jobOrder.staffName || "—"}
                                        </p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| NOTIFICATION PANEL
|--------------------------------------------------------------------------
*/

function NotificationPanel({
    notifications,
    onClose,
    onMarkAllRead,
    onMarkAsRead,
}: {
    notifications: Notification[];
    onClose: () => void;
    onMarkAllRead: () => void;
    onMarkAsRead: (id: number | string) => void;
}) {
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="absolute right-0 top-full z-[80] mt-3 w-80 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black/95 shadow-2xl backdrop-blur-md sm:w-96">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Bell
                        size={16}
                        className="text-yellow-600 dark:text-yellow-400"
                    />
                    <p className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">
                        Notifications
                    </p>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-black text-yellow-600 dark:text-yellow-400">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 transition hover:bg-yellow-400/10"
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 dark:text-slate-400 transition hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                        <Bell size={28} className="text-slate-700" />
                        <p className="mt-3 text-sm font-bold text-gray-600 dark:text-slate-400">
                            No notifications
                        </p>
                        <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                            You're all caught up.
                        </p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                                if (!notification.read) {
                                    onMarkAsRead(notification.id);
                                }
                                if (notification.link) {
                                    router.visit(notification.link);
                                }
                            }}
                            className={[
                                "flex w-full items-start gap-3 border-b border-gray-200 dark:border-slate-800/70 px-4 py-3 text-left transition hover:bg-gray-100 dark:hover:bg-slate-800/40",
                                !notification.read
                                    ? "bg-yellow-400/[0.04]"
                                    : "",
                            ].join(" ")}
                        >
                            <div
                                className={[
                                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    notification.type === "success"
                                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                                        : notification.type === "error"
                                          ? "bg-red-400/10 text-red-600 dark:text-red-400"
                                          : notification.type === "warning"
                                            ? "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                                            : "bg-blue-400/10 text-blue-600 dark:text-blue-400",
                                ].join(" ")}
                            >
                                {notification.type === "success" ? (
                                    <CheckCircle2 size={16} />
                                ) : notification.type === "error" ? (
                                    <AlertCircle size={16} />
                                ) : notification.type === "warning" ? (
                                    <AlertTriangle size={16} />
                                ) : (
                                    <Bell size={16} />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                        {notification.title}
                                    </p>
                                    {!notification.read && (
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-400" />
                                    )}
                                </div>
                                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-slate-400">
                                    {notification.message}
                                </p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-600">
                                    {formatDateTime(
                                        notification.createdAt ??
                                            notification.created_at,
                                    )}
                                </p>
                            </div>
                        </button>
                    ))
                )}
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
    icon,
    label,
    value,
    color,
    onClick,
    active = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: "yellow" | "blue" | "red" | "green" | "orange";
    onClick?: () => void;
    active?: boolean;
}) {
    const colorMap = {
        yellow: "border-yellow-400/20 bg-yellow-400/5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10",
        blue: "border-blue-400/20 bg-blue-400/5 text-blue-600 dark:text-blue-400 hover:bg-blue-400/10",
        red: "border-red-400/20 bg-red-400/5 text-red-600 dark:text-red-400 hover:bg-red-400/10",
        green: "border-emerald-400/20 bg-emerald-400/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/10",
        orange: "border-orange-400/20 bg-orange-400/5 text-orange-600 dark:text-orange-400 hover:bg-orange-400/10",
    };

    const activeRingMap = {
        yellow: "ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-950/30",
        blue: "ring-2 ring-blue-400/60 shadow-lg shadow-blue-950/30",
        red: "ring-2 ring-red-400/60 shadow-lg shadow-red-950/30",
        green: "ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-950/30",
        orange: "ring-2 ring-orange-400/60 shadow-lg shadow-orange-950/30",
    };

    return (
        <div
            onClick={onClick}
            className={[
                "rounded-2xl border p-4 cursor-pointer transition-colors duration-150 shadow-md",
                colorMap[color],
                active ? activeRingMap[color] : "",
            ].join(" ")}
        >
            <div className="flex items-center justify-between">
                <div className="opacity-80">{icon}</div>
                <span className="text-2xl font-black">{value}</span>
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider opacity-80">
                {label}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| TAB BUTTON
|--------------------------------------------------------------------------
*/

function TabButton({
    active,
    onClick,
    icon,
    label,
    count,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
                active
                    ? "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30"
                    : "border border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-400 hover:border-yellow-400/30 hover:text-yellow-600 dark:hover:text-yellow-400",
            ].join(" ")}
        >
            {icon}
            {label}
            {count > 0 && (
                <span
                    className={[
                        "ml-1 rounded-full px-2 py-0.5 text-xs",
                        active
                            ? "bg-yellow-400/20 text-yellow-600 dark:text-yellow-400"
                            : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400",
                    ].join(" ")}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| OK VERIFICATION BADGE — billing vs job order
|--------------------------------------------------------------------------
|
| Ang admin ang nag-v-verify. Ihahambing ang BASE amount ng billing
| (excl. VAT at additional charges) sa monthly amount ng approved
| quotation ng Job Order.
|
*/

function VerificationBadge({
    invoice,
    hideAmount,
}: {
    invoice: Invoice;
    hideAmount: boolean;
}) {
    /* Walang Job Order -> hindi mavalidate */
    if (!invoice.jobOrderId) {
        return (
            <span className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/60 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-gray-600 dark:text-slate-400">
                <AlertCircle size={11} />
                No JO
            </span>
        );
    }

    /* Walang quotation data -> manual review */
    if (
        invoice.matchesJobOrder === null ||
        invoice.matchesJobOrder === undefined
    ) {
        return (
            <span
                title="Walang approved quotation data sa job order. Manual review."
                className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/25 bg-yellow-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-yellow-600 dark:text-yellow-400"
            >
                <AlertTriangle size={11} />
                Review
            </span>
        );
    }

    if (invoice.matchesJobOrder) {
        return (
            <span
                title={`Base amount ${money(invoice.baseAmount, hideAmount)} = monthly amount ng job order`}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400"
            >
                <CheckCircle2 size={11} />
                Match
            </span>
        );
    }

    const diff = Math.abs(invoice.amountDifference ?? 0);

    return (
        <span
            title={`Hindi tugma! Billing base ${money(invoice.baseAmount, hideAmount)} vs JO monthly ${money(invoice.expectedAmount, hideAmount)} (diff ${money(diff, hideAmount)}). I-reject para makita ng staff.`}
            className="inline-flex flex-col items-center gap-0.5"
        >
            <span className="inline-flex items-center gap-1 rounded-lg border border-red-400/25 bg-red-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-600 dark:text-red-400">
                <X size={11} />
                Mismatch
            </span>
            <span className="text-[10px] font-bold text-red-500 dark:text-red-400">
                ±{money(diff, hideAmount)}
            </span>
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| PENDING INVOICES LIST
|--------------------------------------------------------------------------
*/

function PendingInvoicesList({
    invoices,
    onView,
    onApprove,
    onReject,
    isProcessing,
    hideAmount,
}: {
    invoices: Invoice[];
    onView: (invoice: Invoice) => void;
    onApprove: (invoice: Invoice) => void;
    onReject: (invoice: Invoice) => void;
    isProcessing: boolean;
    hideAmount: boolean;
}) {
    if (invoices.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-600">
                    <CheckCircle2
                        size={40}
                        className="text-emerald-600 dark:text-emerald-400"
                    />
                </div>
                <h3 className="mt-5 text-xl font-black text-gray-900 dark:text-white">
                    Walang Billing na Naghihintay ng Verification
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                    Na-verify na ng lahat ng billing records. Nice job!
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-white dark:bg-black shadow-2xl shadow-black/30">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-black/70">
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Billing No.
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Job Order
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Client
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Project
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Amount
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Verification
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Staff
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => {
                            const isMismatch =
                                invoice.matchesJobOrder === false;
                            const hasJobOrder = Boolean(invoice.jobOrderId);

                            return (
                                <tr
                                    key={invoice.id}
                                    className="border-b border-gray-200 dark:border-slate-800/70 transition-colors hover:bg-yellow-400/[0.025]"
                                >
                                    <td className="px-5 py-5">
                                        <button
                                            type="button"
                                            onClick={() => onView(invoice)}
                                            className="text-left"
                                        >
                                            <p className="font-black text-gray-900 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400">
                                                {invoice.billingNumber ?? "—"}
                                            </p>
                                            {/*
                                            | Invoice No. only appears AFTER approval.
                                            | Pending/Rejected = wala pa.
                                            */}
                                            {invoice.hasInvoiceNumber && (
                                                <p className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    Invoice: {invoice.number}
                                                </p>
                                            )}
                                            <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                                {invoice.serviceMonth
                                                    ? formatMonthLabel(
                                                          invoice.serviceMonth,
                                                      )
                                                    : formatDate(
                                                          invoice.createdAt,
                                                      )}
                                            </p>
                                        </button>
                                    </td>
                                    <td className="px-5 py-5">
                                        {invoice.jobOrderNumber ? (
                                            <span className="inline-flex rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-2 py-0.5 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                                {invoice.jobOrderNumber}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500 dark:text-slate-500">
                                                No JO
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-5">
                                        <p className="font-semibold text-gray-800 dark:text-slate-200">
                                            {invoice.client}
                                        </p>
                                        {invoice.clientEmail && (
                                            <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                                {invoice.clientEmail}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-5">
                                        <p className="text-sm text-gray-700 dark:text-slate-300">
                                            {invoice.project}
                                        </p>
                                    </td>
                                    <td className="px-5 py-5 text-right">
                                        <p className="font-black text-yellow-600 dark:text-yellow-400">
                                            {money(invoice.amount, hideAmount)}
                                        </p>
                                        {((invoice.vatAmount ?? 0) > 0 ||
                                            (invoice.additionalCharges ?? 0) >
                                                0) && (
                                            <p className="mt-1 text-[11px] text-gray-600 dark:text-slate-600">
                                                base{" "}
                                                {money(
                                                    invoice.baseAmount,
                                                    hideAmount,
                                                )}
                                                {(invoice.additionalCharges ??
                                                    0) > 0 && (
                                                    <>
                                                        {" + "}
                                                        {money(
                                                            invoice.additionalCharges,
                                                            hideAmount,
                                                        )}
                                                    </>
                                                )}
                                                {(invoice.vatAmount ?? 0) >
                                                    0 && (
                                                    <>
                                                        {" + VAT "}
                                                        {money(
                                                            invoice.vatAmount,
                                                            hideAmount,
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-5 text-center">
                                        <VerificationBadge
                                            invoice={invoice}
                                            hideAmount={hideAmount}
                                        />
                                    </td>
                                    <td className="px-5 py-5">
                                        <p className="text-sm text-gray-700 dark:text-slate-300">
                                            {invoice.staffName || "—"}
                                        </p>
                                    </td>
                                    <td className="px-5 py-5">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onView(invoice)}
                                                title="View billing breakdown"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {isMismatch ? (
                                                /* MISMATCH - Approve disabled, Reject highlighted */
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onReject(invoice)
                                                    }
                                                    disabled={isProcessing}
                                                    title="Hindi tugma ang billing at job order. I-reject para makita ng staff ang problema."
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/25 text-red-600 dark:text-red-400 transition hover:bg-red-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onApprove(invoice)
                                                    }
                                                    disabled={isProcessing}
                                                    title={
                                                        hasJobOrder
                                                            ? "Tugma sa job order - approve"
                                                            : "Walang job order - approve bilang service invoice"
                                                    }
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onReject(invoice)
                                                }
                                                disabled={isProcessing}
                                                title="Reject with reason"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 transition hover:border-red-400/40 hover:text-red-600 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| ALL INVOICES LIST
|--------------------------------------------------------------------------
*/

function AllInvoicesList({
    invoices,
    onView,
    onEdit,
    onApprove,
    onReject,
    onSendEmail,
    onPrint,
    viewMode,
    isProcessing,
    isSendingEmail,
    hideAmount,
}: {
    invoices: Invoice[];
    onView: (invoice: Invoice) => void;
    onEdit: (invoice: Invoice) => void;
    onApprove: (invoice: Invoice) => void;
    onReject: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
    onPrint: (invoice: Invoice) => void;
    viewMode: "list" | "grid";
    isProcessing: boolean;
    isSendingEmail: boolean;
    hideAmount: boolean;
}) {
    if (invoices.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-600">
                    <FileText size={40} />
                </div>
                <h3 className="mt-5 text-xl font-black text-gray-900 dark:text-white">
                    No Invoices Found
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                    Try adjusting your search or filters.
                </p>
            </div>
        );
    }

    if (viewMode === "grid") {
        return (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {invoices.map((invoice) => (
                    <InvoiceGridCard
                        key={invoice.id}
                        invoice={invoice}
                        onView={onView}
                        onEdit={onEdit}
                        onApprove={onApprove}
                        onReject={onReject}
                        onSendEmail={onSendEmail}
                        onPrint={onPrint}
                        isProcessing={isProcessing}
                        isSendingEmail={isSendingEmail}
                        hideAmount={hideAmount}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-white dark:bg-black shadow-2xl shadow-black/30">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-black/70">
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Billing No.
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Job Order
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Client
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Project
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Amount
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Due Date
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Status
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr
                                key={invoice.id}
                                className="border-b border-gray-200 dark:border-slate-800/70 transition-colors hover:bg-yellow-400/[0.025]"
                            >
                                <td className="px-5 py-5">
                                    <button
                                        type="button"
                                        onClick={() => onView(invoice)}
                                        className="text-left"
                                    >
                                        <p className="font-black text-gray-900 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400">
                                            {invoice.billingNumber ?? "—"}
                                        </p>
                                        {/*
                                        | Invoice No. only shows up AFTER approval.
                                        | Hindi pa approved = wala pa.
                                        */}
                                        {invoice.hasInvoiceNumber && (
                                            <p className="mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                Invoice: {invoice.number}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                            {invoice.serviceMonth
                                                ? formatMonthLabel(
                                                      invoice.serviceMonth,
                                                  )
                                                : formatDate(invoice.createdAt)}
                                        </p>
                                    </button>
                                </td>
                                <td className="px-5 py-5">
                                    {invoice.jobOrderNumber ? (
                                        <span className="inline-flex rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-2 py-0.5 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                            {invoice.jobOrderNumber}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-500 dark:text-slate-500">
                                            —
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-5">
                                    <p className="font-semibold text-gray-800 dark:text-slate-200">
                                        {invoice.client}
                                    </p>
                                    {invoice.clientEmail && (
                                        <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                            {invoice.clientEmail}
                                        </p>
                                    )}
                                </td>
                                <td className="px-5 py-5">
                                    <p className="truncate text-sm text-gray-700 dark:text-slate-300 max-w-[180px]">
                                        {invoice.project}
                                    </p>
                                </td>
                                <td className="px-5 py-5 text-right">
                                    <p className="font-black text-gray-900 dark:text-white">
                                        {money(invoice.amount, hideAmount)}
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-gray-700 dark:text-slate-300">
                                        {formatDate(invoice.dueDate)}
                                    </p>
                                </td>
                                <td className="px-5 py-5 text-center">
                                    <AdminStatusBadge status={invoice.status} />
                                </td>
                                <td className="px-5 py-5">
                                    <AdminInvoiceActions
                                        invoice={invoice}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onApprove={onApprove}
                                        onReject={onReject}
                                        onSendEmail={onSendEmail}
                                        onPrint={onPrint}
                                        isProcessing={isProcessing}
                                        isSendingEmail={isSendingEmail}
                                    />
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
| INVOICE GRID CARD
|--------------------------------------------------------------------------
*/

function InvoiceGridCard({
    invoice,
    onView,
    onEdit,
    onApprove,
    onReject,
    onSendEmail,
    onPrint,
    isProcessing,
    isSendingEmail,
    hideAmount,
}: {
    invoice: Invoice;
    onView: (invoice: Invoice) => void;
    onEdit: (invoice: Invoice) => void;
    onApprove: (invoice: Invoice) => void;
    onReject: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
    onPrint: (invoice: Invoice) => void;
    isProcessing: boolean;
    isSendingEmail: boolean;
    hideAmount: boolean;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-5 transition-colors hover:border-yellow-400/30">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-gray-600 dark:text-slate-600">
                        {invoice.serviceMonth
                            ? formatMonthLabel(invoice.serviceMonth)
                            : formatDate(invoice.createdAt)}
                    </p>
                    <p className="mt-1 font-black text-gray-900 dark:text-white">
                        {invoice.billingNumber ?? invoice.number}
                    </p>
                    {invoice.jobOrderNumber && (
                        <p className="mt-1 text-[11px] font-bold text-yellow-600 dark:text-yellow-400">
                            {invoice.jobOrderNumber}
                        </p>
                    )}
                </div>
                <AdminStatusBadge status={invoice.status} />
            </div>

            <div className="mt-4">
                <p className="font-semibold text-gray-800 dark:text-slate-200">
                    {invoice.client}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
                    {invoice.project}
                </p>
            </div>

            <div className="mt-2">
                <p className="text-xs text-gray-500 dark:text-slate-500">
                    Payment Method
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {invoice.paymentMethod || "Bank Transfer"}
                </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-slate-800 pt-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-slate-500">
                        Amount
                    </p>
                    <p className="text-xl font-black text-yellow-600 dark:text-yellow-400">
                        {money(invoice.amount, hideAmount)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-slate-500">
                        Base
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {money(invoice.baseAmount, hideAmount)}
                    </p>
                </div>
            </div>

            {(invoice.vatAmount ?? 0) > 0 &&
                (invoice.additionalCharges ?? 0) > 0 && (
                    <div className="mt-4">
                        <VerificationBadge
                            invoice={invoice}
                            hideAmount={hideAmount}
                        />
                    </div>
                )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => onView(invoice)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                >
                    <Eye size={15} /> View
                </button>
                <button
                    type="button"
                    onClick={() => onEdit(invoice)}
                    disabled={isProcessing}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-yellow-400/20 text-sm font-bold text-yellow-600 dark:text-yellow-400 transition hover:bg-yellow-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Edit3 size={15} /> Edit
                </button>
                <button
                    type="button"
                    onClick={() => onPrint(invoice)}
                    disabled={isProcessing}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Printer size={15} /> Print
                </button>
                {invoice.status === "Pending" && (
                    <>
                        <button
                            type="button"
                            onClick={() => onApprove(invoice)}
                            disabled={isProcessing}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 text-sm font-bold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Check size={15} /> Approve
                        </button>
                        <button
                            type="button"
                            onClick={() => onReject(invoice)}
                            disabled={isProcessing}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/20 text-sm font-bold text-red-600 dark:text-red-400 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Ban size={15} /> Reject
                        </button>
                    </>
                )}
                {invoice.status === "Approved" && (
                    <button
                        type="button"
                        onClick={() => onSendEmail(invoice)}
                        disabled={isSendingEmail}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-500/20 text-sm font-bold text-blue-600 dark:text-blue-400 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Mail size={15} /> Send
                    </button>
                )}
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| ADMIN INVOICE ACTIONS
|--------------------------------------------------------------------------
*/

function AdminInvoiceActions({
    invoice,
    onView,
    onEdit,
    onApprove,
    onReject,
    onSendEmail,
    onPrint,
    isProcessing,
    isSendingEmail,
}: {
    invoice: Invoice;
    onView: (invoice: Invoice) => void;
    onEdit: (invoice: Invoice) => void;
    onApprove: (invoice: Invoice) => void;
    onReject: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
    onPrint: (invoice: Invoice) => void;
    isProcessing: boolean;
    isSendingEmail: boolean;
}) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
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

    return (
        <>
            <div className="flex justify-center">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                >
                    <MoreVertical size={17} />
                </button>
            </div>
            {open && (
                <div
                    ref={menuRef}
                    className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black shadow-2xl shadow-black/50"
                    style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                    }}
                >
                    <div className="border-b border-gray-200 dark:border-slate-800 px-4 py-2.5">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 dark:text-slate-600">
                            Invoice Actions
                        </p>
                    </div>
                    <ActionItem
                        icon={<Eye size={16} />}
                        label="View Details"
                        onClick={() => action(() => onView(invoice))}
                    />
                    <ActionItem
                        icon={<Printer size={16} />}
                        label="Print Invoice"
                        onClick={() => action(() => onPrint(invoice))}
                        className="text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700/40"
                    />
                    <ActionItem
                        icon={<Edit3 size={16} />}
                        label="Edit Invoice"
                        onClick={() => action(() => onEdit(invoice))}
                        className="text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10"
                    />
                    {invoice.status === "Pending" && (
                        <>
                            <ActionItem
                                icon={<Check size={16} />}
                                label="Approve"
                                onClick={() => action(() => onApprove(invoice))}
                                className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-400/10"
                            />
                            <ActionItem
                                icon={<Ban size={16} />}
                                label="Reject"
                                onClick={() => action(() => onReject(invoice))}
                                className="text-red-600 dark:text-red-400 hover:bg-red-400/10"
                            />
                        </>
                    )}
                    {invoice.status === "Approved" && (
                        <ActionItem
                            icon={<Mail size={16} />}
                            label="Send to Client"
                            onClick={() => action(() => onSendEmail(invoice))}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-400/10"
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
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300 transition hover:bg-yellow-400/10 hover:text-yellow-600 dark:hover:text-yellow-400",
                className,
            ].join(" ")}
        >
            {icon} {label}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| ADMIN STATUS BADGE
|--------------------------------------------------------------------------
*/

function AdminStatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();
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
            "border-blue-400/20 bg-blue-400/10 text-blue-600 dark:text-blue-400",
    };

    return (
        <span
            className={[
                "inline-flex rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide",
                statusMap[normalized] ||
                    "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-gray-700 dark:text-slate-300",
            ].join(" ")}
        >
            {status || "Pending"}
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| ADMIN INVOICE VIEW MODAL
|--------------------------------------------------------------------------
*/

function AdminInvoiceViewModal({
    invoice,
    onClose,
    onApprove,
    onReject,
    onSendEmail,
    onPrint,
    isProcessing,
    isSendingEmail,
    hideAmount,
}: {
    invoice: Invoice;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
    onSendEmail: () => void;
    onPrint: () => void;
    isProcessing: boolean;
    isSendingEmail: boolean;
    hideAmount: boolean;
}) {
    const baseAmount = invoice.baseAmount ?? invoice.amount;
    const vatAmount = invoice.vatAmount ?? 0;
    const additionalCharges = invoice.additionalCharges ?? 0;
    const totalSales = invoice.amount;
    const withholdingTax = 0;
    const totalAmountDue = invoice.totalAmount ?? invoice.amount;

    const isApproved = invoice.status === "Approved";

    return (
        <Modal
            title={
                isApproved
                    ? `Service Invoice ${invoice.number ?? ""}`
                    : `Billing Record ${invoice.billingNumber ?? ""}`
            }
            onClose={onClose}
            size="lg"
        >
            <div className="space-y-6">
                <div className="rounded-2xl border border-yellow-400/10 bg-gray-50 dark:bg-black/70 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            {/*
                            | OK WALANG "Invoice" label sa taas ng Billing Record.
                            | Billing Record  → Billing No. (+ walang invoice number)
                            | Service Invoice → Invoice No. + Billing No. + JO No.
                            */}
                            <p className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-slate-600">
                                {isApproved
                                    ? "Service Invoice"
                                    : "Billing Record"}
                            </p>
                            <p className="mt-1 text-2xl font-black text-yellow-600 dark:text-yellow-400">
                                {isApproved
                                    ? (invoice.number ?? "—")
                                    : (invoice.billingNumber ?? "—")}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-slate-600">
                                {isApproved && invoice.billingNumber && (
                                    <span>
                                        Billing No.:{" "}
                                        <span className="font-bold text-gray-800 dark:text-slate-300">
                                            {invoice.billingNumber}
                                        </span>
                                    </span>
                                )}
                                {invoice.jobOrderNumber && (
                                    <span>
                                        Job Order:{" "}
                                        <span className="font-bold text-gray-800 dark:text-slate-300">
                                            {invoice.jobOrderNumber}
                                        </span>
                                    </span>
                                )}
                                {invoice.serviceMonth && (
                                    <span>
                                        Service Date:{" "}
                                        <span className="font-bold text-gray-800 dark:text-slate-300">
                                            {formatMonthLabel(
                                                invoice.serviceMonth,
                                            )}
                                        </span>
                                    </span>
                                )}
                            </div>
                            {!isApproved && (
                                <p className="mt-2 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.06] px-2.5 py-1.5 text-[11px] text-gray-600 dark:text-slate-600">
                                    Walang invoice number pa. Magigigawa ito pag
                                    na-approve.
                                </p>
                            )}
                        </div>
                        <AdminStatusBadge status={invoice.status} />
                    </div>
                </div>

                {/* ✅ VERIFICATION PANEL — billing vs job order */}
                {invoice.jobOrderId && (
                    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/70 p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <BriefcaseBusiness
                                    size={18}
                                    className="text-yellow-600 dark:text-yellow-400"
                                />
                                <p className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-slate-200">
                                    Verification — Job Order vs Billing
                                </p>
                            </div>
                            <VerificationBadge
                                invoice={invoice}
                                hideAmount={hideAmount}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {/* LEFT: JOB ORDER */}
                            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-black/50 p-4">
                                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Approved Quotation (Job Order)
                                </p>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-slate-600">
                                            Quotation Total
                                        </dt>
                                        <dd className="font-bold text-gray-900 dark:text-white">
                                            {money(
                                                invoice.quotationTotal,
                                                hideAmount,
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-slate-600">
                                            Months
                                        </dt>
                                        <dd className="font-bold text-gray-900 dark:text-white">
                                            {invoice.billingMonths || "—"}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-slate-800 pt-2">
                                        <dt className="text-slate-600">
                                            Monthly Amount
                                        </dt>
                                        <dd className="font-black text-yellow-600 dark:text-yellow-400">
                                            {money(
                                                invoice.expectedAmount,
                                                hideAmount,
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                {invoice.jobOrderStatus && (
                                    <p className="mt-3 text-[11px] text-slate-600">
                                        JO Status:{" "}
                                        <span className="font-bold">
                                            {invoice.jobOrderStatus}
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* RIGHT: BILLING */}
                            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-black/50 p-4">
                                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Billing Breakdown
                                </p>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-slate-600">
                                            Base Amount
                                        </dt>
                                        <dd
                                            className={[
                                                "font-bold",
                                                invoice.matchesJobOrder ===
                                                false
                                                    ? "text-red-600 dark:text-red-400"
                                                    : "text-gray-900 dark:text-white",
                                            ].join(" ")}
                                        >
                                            {money(baseAmount, hideAmount)}
                                        </dd>
                                    </div>
                                    {additionalCharges > 0 && (
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="text-slate-600">
                                                Additional Charges
                                            </dt>
                                            <dd className="font-bold text-blue-600 dark:text-blue-400">
                                                +{" "}
                                                {money(
                                                    additionalCharges,
                                                    hideAmount,
                                                )}
                                            </dd>
                                        </div>
                                    )}
                                    <div
                                        className={[
                                            "flex items-center justify-between gap-3",
                                            vatAmount > 0 ? "" : "opacity-40",
                                        ].join(" ")}
                                    >
                                        <dt className="text-slate-600">
                                            VAT ({invoice.vatRate ?? 12}%)
                                        </dt>
                                        <dd className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {vatAmount > 0
                                                ? `+ ${money(
                                                      vatAmount,
                                                      hideAmount,
                                                  )}`
                                                : "—"}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-slate-800 pt-2">
                                        <dt className="text-slate-600">
                                            Grand Total
                                        </dt>
                                        <dd className="font-black text-yellow-600 dark:text-yellow-400">
                                            {money(totalSales, hideAmount)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>

                        {/* ✅ VERIFICATION VERDICT */}
                        <div
                            className={[
                                "mt-4 flex items-start gap-3 rounded-xl border p-4",
                                invoice.matchesJobOrder === false
                                    ? "border-red-400/25 bg-red-400/[0.06]"
                                    : invoice.matchesJobOrder === true
                                      ? "border-emerald-400/25 bg-emerald-400/[0.06]"
                                      : "border-yellow-400/25 bg-yellow-400/[0.06]",
                            ].join(" ")}
                        >
                            {invoice.matchesJobOrder === false ? (
                                <X
                                    size={18}
                                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                                />
                            ) : invoice.matchesJobOrder === true ? (
                                <CheckCircle2
                                    size={18}
                                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                />
                            ) : (
                                <AlertTriangle
                                    size={18}
                                    className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400"
                                />
                            )}
                            <div className="min-w-0 text-sm">
                                {invoice.matchesJobOrder === false ? (
                                    <>
                                        <p className="font-black text-red-600 dark:text-red-400">
                                            Hindi tugma ang billing at job order
                                        </p>
                                        <p className="mt-1 text-gray-700 dark:text-slate-300">
                                            Base amount ng billing{" "}
                                            <span className="font-bold">
                                                {money(baseAmount, hideAmount)}
                                            </span>{" "}
                                            pero ang monthly amount ng approved
                                            quotation ay{" "}
                                            <span className="font-bold">
                                                {money(
                                                    invoice.expectedAmount,
                                                    hideAmount,
                                                )}
                                            </span>{" "}
                                            (difference{" "}
                                            <span className="font-bold">
                                                {money(
                                                    Math.abs(
                                                        invoice.amountDifference ??
                                                            0,
                                                    ),
                                                    hideAmount,
                                                )}
                                            </span>
                                            ). Hindi puwedeng i-approve —
                                            pumunta sa <strong>Reject</strong>{" "}
                                            at sabihin ang problema sa staff.
                                        </p>
                                    </>
                                ) : invoice.matchesJobOrder === true ? (
                                    <>
                                        <p className="font-black text-emerald-600 dark:text-emerald-400">
                                            Tugma ang billing at job order
                                        </p>
                                        <p className="mt-1 text-gray-700 dark:text-slate-300">
                                            Base amount{" "}
                                            <span className="font-bold">
                                                {money(baseAmount, hideAmount)}
                                            </span>{" "}
                                            = monthly amount ng approved
                                            quotation. Maaari nang i-approve.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-black text-yellow-600 dark:text-yellow-400">
                                            Manual review
                                        </p>
                                        <p className="mt-1 text-gray-700 dark:text-slate-300">
                                            Walang approved quotation data sa
                                            Job Order — hindi maaaring i-verify
                                            awtomatiko. Suriin manu-mano.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {invoice.verifiedAt && (
                            <p className="mt-3 text-[11px] text-slate-600">
                                Verified on {formatDateTime(invoice.verifiedAt)}
                                {invoice.verifiedBy && (
                                    <>
                                        {" by "}
                                        <span className="font-bold">
                                            {invoice.verifiedBy}
                                        </span>
                                    </>
                                )}
                            </p>
                        )}
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
                                    <p className="mt-2 text-xs text-gray-600 dark:text-slate-600">
                                        Rejected on{" "}
                                        {formatDateTime(invoice.rejectedAt)}
                                    </p>
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
                                <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                                    Approved on{" "}
                                    {formatDateTime(invoice.approvedAt)}
                                </p>
                                {invoice.approvedBy && (
                                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                        By {invoice.approvedBy}
                                    </p>
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
                        value={invoice.clientEmail || "—"}
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
                            invoice.jobOrderId
                                ? `JO-${invoice.jobOrderId}`
                                : "—"
                        }
                    />
                    <DetailBox label="Staff" value={invoice.staffName || "—"} />
                    <DetailBox label="VAT Rate" value="12%" highlight />
                    <DetailBox
                        label="Payment Method"
                        value={invoice.paymentMethod || "Bank Transfer"}
                        highlight
                    />
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800">
                    <div className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-black px-5 py-4">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                            {isApproved
                                ? "Service Invoice Items"
                                : "Billing Items"}
                        </p>
                    </div>

                    <div className="grid grid-cols-12 gap-2 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
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

                    <div className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 px-5 py-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold uppercase tracking-wide text-gray-600 dark:text-slate-400">
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
                                        className="text-gray-600 dark:text-slate-400"
                                    />
                                    <span className="font-bold uppercase tracking-wide text-gray-600 dark:text-slate-400">
                                        Total Sales
                                    </span>
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {money(totalSales, hideAmount)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-800/50 pt-3">
                                <span className="font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                                    Withholding Tax
                                </span>
                                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    {money(withholdingTax, hideAmount)}
                                </span>
                            </div>

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

                {invoice.supportingDocuments && (
                    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/60 p-5">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-slate-600">
                            Supporting Documents
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <DocLink
                                label="Quotation"
                                value={invoice.supportingDocuments.quotation}
                            />
                            <DocLink
                                label="Purchase Order"
                                value={
                                    invoice.supportingDocuments.purchaseOrder
                                }
                            />
                            <DocLink
                                label="Contract"
                                value={invoice.supportingDocuments.contract}
                            />
                        </div>
                    </div>
                )}

                {invoice.description && (
                    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/60 p-5">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-slate-600">
                            Description
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                            {invoice.description}
                        </p>
                    </div>
                )}

                {invoice.notes && (
                    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/60 p-5">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-slate-600">
                            Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-slate-300">
                            {invoice.notes}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 border-t border-gray-200 dark:border-slate-800 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={onPrint}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3 text-sm font-black text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                    >
                        <Printer size={17} /> Print
                    </button>

                    {invoice.status === "Pending" && (
                        <>
                            <button
                                type="button"
                                onClick={onApprove}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Check size={17} /> Approve
                            </button>
                            <button
                                type="button"
                                onClick={onReject}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Ban size={17} /> Reject
                            </button>
                        </>
                    )}

                    {invoice.status === "Approved" && (
                        <button
                            type="button"
                            onClick={onSendEmail}
                            disabled={isSendingEmail}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSendingEmail ? (
                                <RefreshCw size={17} className="animate-spin" />
                            ) : (
                                <Mail size={17} />
                            )}
                            {isSendingEmail ? "Sending..." : "Send to Client"}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
}

/*
|--------------------------------------------------------------------------
| DOC LINK
|--------------------------------------------------------------------------
*/

function DocLink({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    if (!value) {
        return (
            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-3">
                <p className="text-xs text-gray-600 dark:text-slate-600">
                    {label}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-500">
                    —
                </p>
            </div>
        );
    }
    return (
        <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black/50 p-3 transition hover:border-yellow-400/40 hover:bg-black/80"
        >
            <div>
                <p className="text-xs text-gray-600 dark:text-slate-600">
                    {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    View Document
                </p>
            </div>
            <ExternalLink
                size={16}
                className="text-gray-500 dark:text-slate-500"
            />
        </a>
    );
}

/*
|--------------------------------------------------------------------------
| APPROVE MODAL
|--------------------------------------------------------------------------
*/

function ApproveModal({
    invoice,
    notes,
    setNotes,
    onConfirm,
    onCancel,
    isProcessing,
    hideAmount,
}: {
    invoice: Invoice;
    notes: string;
    setNotes: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
    hideAmount: boolean;
}) {
    return (
        <Modal title="Approve Invoice" onClose={onCancel} size="md">
            <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2
                            size={24}
                            className="text-emerald-600 dark:text-emerald-400"
                        />
                        <div>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                Confirm Approval
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400">
                                You are about to approve invoice{" "}
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {invoice.number}
                                </span>{" "}
                                for{" "}
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {invoice.client}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-gray-600 dark:text-slate-400">
                            Amount:{" "}
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                                {money(invoice.amount, hideAmount)}
                            </span>
                        </p>
                        <p className="text-gray-600 dark:text-slate-400">
                            VAT (12%):{" "}
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                                {money(invoice.amount * VAT_RATE, hideAmount)}
                            </span>
                        </p>
                        <p className="text-gray-600 dark:text-slate-400 col-span-2">
                            Project:{" "}
                            <span className="text-gray-900 dark:text-white">
                                {invoice.project}
                            </span>
                        </p>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Approval Notes (Optional)
                    </label>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this approval..."
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                        disabled={isProcessing}
                    />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isProcessing ? (
                            <RefreshCw size={17} className="animate-spin" />
                        ) : (
                            <Check size={17} />
                        )}
                        {isProcessing ? "Processing..." : "Confirm Approval"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/*
|--------------------------------------------------------------------------
| REJECT MODAL
|--------------------------------------------------------------------------
*/

function RejectModal({
    invoice,
    reason,
    setReason,
    onConfirm,
    onCancel,
    isProcessing,
    hideAmount,
}: {
    invoice: Invoice;
    reason: string;
    setReason: (value: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
    hideAmount: boolean;
}) {
    return (
        <Modal title="Reject Invoice" onClose={onCancel} size="md">
            <div className="space-y-5">
                <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4">
                    <div className="flex items-center gap-3">
                        <Ban
                            size={24}
                            className="text-red-600 dark:text-red-400"
                        />
                        <div>
                            <p className="font-bold text-red-600 dark:text-red-400">
                                Confirm Rejection
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400">
                                You are about to reject invoice{" "}
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {invoice.number}
                                </span>{" "}
                                for{" "}
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {invoice.client}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/50 p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-gray-600 dark:text-slate-400">
                            Amount:{" "}
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                                {money(invoice.amount, hideAmount)}
                            </span>
                        </p>
                        <p className="text-gray-600 dark:text-slate-400">
                            VAT (12%):{" "}
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">
                                {money(invoice.amount * VAT_RATE, hideAmount)}
                            </span>
                        </p>
                        <p className="text-gray-600 dark:text-slate-400 col-span-2">
                            Project:{" "}
                            <span className="text-gray-900 dark:text-white">
                                {invoice.project}
                            </span>
                        </p>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                        Reason for Rejection{" "}
                        <span className="text-red-600 dark:text-red-400">
                            *
                        </span>
                    </label>
                    <textarea
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a detailed reason why this invoice is being rejected..."
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black py-3 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                        disabled={isProcessing}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                        {reason.length} / 500 characters
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing || !reason.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isProcessing ? (
                            <RefreshCw size={17} className="animate-spin" />
                        ) : (
                            <Ban size={17} />
                        )}
                        {isProcessing ? "Processing..." : "Confirm Rejection"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/*
|--------------------------------------------------------------------------
| DETAIL BOX
|--------------------------------------------------------------------------
*/

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
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-slate-600">
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

/*
|--------------------------------------------------------------------------
| EDIT INFO CARD
|--------------------------------------------------------------------------
*/

function EditInfoCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-black/70 p-4">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-black text-gray-500 dark:text-slate-500">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-slate-600">
                        {label}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-gray-700 dark:text-slate-300">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| BEAUTIFUL FORM FIELD
|--------------------------------------------------------------------------
*/

function BeautifulFormField({
    label,
    required = false,
    icon,
    children,
}: {
    label: string;
    required?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500 dark:text-slate-500">
                {icon && (
                    <span className="text-gray-600 dark:text-slate-600">
                        {icon}
                    </span>
                )}
                {label}
                {required && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                        *
                    </span>
                )}
            </span>
            {children}
        </label>
    );
}

/*
|--------------------------------------------------------------------------
| MODAL
|--------------------------------------------------------------------------
*/

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
                    "w-full overflow-hidden rounded-3xl border border-yellow-400/10 bg-white dark:bg-black shadow-2xl",
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
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
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
