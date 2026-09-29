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
    number: string;
    client: string;
    clientEmail: string;
    clientAddress: string;
    clientContact: string;
    project: string;
    items: InvoiceItem[];
    taxRate: number;
    amount: number;
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
    vatAmount?: number;
    netAmount?: number;
    withholdingTax?: number;
    totalAmountDue?: number;
    paymentMethod?: string | null;
    supportingDocuments?: {
        quotation?: string | null;
        purchaseOrder?: string | null;
        contract?: string | null;
    };
};

// ✅ BAGO — Job Order type para sa admin approval
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
};

type PageProps = {
    invoices?: Invoice[];
    pendingInvoices?: Invoice[];
    allInvoices?: Invoice[];
    pendingJobOrders?: PendingJobOrder[];   // ✅ BAGO
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

    const { vatAmount, netAmount, totalAmountDue } = computeVAT(amount);

    return {
        id: Number(raw?.id ?? 0),
        number: String(raw?.number ?? ""),
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
        staffId: raw?.staffId ?? raw?.userId ?? raw?.user_id ?? undefined,
        staffName: raw?.staffName ?? raw?.user?.name ?? undefined,
        rejectionReason: raw?.rejectionReason ?? raw?.rejection_reason ?? null,
        rejectedAt: raw?.rejectedAt ?? raw?.rejected_at ?? null,
        approvedAt: raw?.approvedAt ?? raw?.approved_at ?? null,
        approvedBy: raw?.approvedBy ?? raw?.approved_by ?? null,
        vatAmount,
        netAmount,
        withholdingTax: 0,
        totalAmountDue,
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
    const backendPendingJobOrders = page.props.pendingJobOrders ?? [];
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

    // ✅ DEFAULT = "job-orders" — para ito agad ang makita ng admin
    const [activeTab, setActiveTab] = useState<
        "pending" | "all" | "job-orders"
    >("job-orders");
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
    | ✅ AUTO-REFRESH — Every 15 seconds (with guards)
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const interval = window.setInterval(() => {
            const hasOpenModal =
                showInvoiceView ||
                showInvoiceEdit ||
                showApproveModal ||
                showRejectModal ||
                showNotificationPanel;

            const isBusy =
                isProcessing ||
                isSavingInvoice ||
                isSendingEmail ||
                isRefreshing;

            if (hasOpenModal || isBusy || document.hidden) return;

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
            });
        }, 15000);

        return () => window.clearInterval(interval);
    }, [
        showInvoiceView,
        showInvoiceEdit,
        showApproveModal,
        showRejectModal,
        showNotificationPanel,
        isProcessing,
        isSavingInvoice,
        isSendingEmail,
        isRefreshing,
    ]);

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
    | ✅ APPROVE / REJECT JOB ORDER
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
            <div className="min-h-screen bg-black text-white">
                <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                    {/* HEADER */}
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                                    <Receipt size={25} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                                        Billing & Invoicing
                                    </h1>
                                    <p className="mt-1 text-sm text-slate-400">
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
                                        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-black text-slate-400 transition",
                                        showNotificationPanel
                                            ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400"
                                            : "border-slate-700 hover:border-yellow-400/40 hover:text-yellow-400",
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
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-black px-4 text-sm font-bold text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                                className="mt-0.5 shrink-0 text-emerald-400"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-black uppercase tracking-wide text-emerald-300">
                                    Success
                                </p>
                                <p className="mt-1 text-sm leading-6 text-emerald-400/80">
                                    {successMessage || flashSuccess}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSuccessMessage("")}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-400 transition hover:bg-emerald-400/10 hover:text-emerald-300"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    )}

                    {/* ERROR */}
                    {flashError && (
                        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm text-red-300">
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
                            {/* ✅ JOB ORDERS TAB */}
                            <TabButton
                                active={activeTab === "job-orders"}
                                onClick={() => {
                                    setActiveTab("job-orders");
                                    setSearch("");
                                    setStatusFilter("All");
                                }}
                                icon={<BriefcaseBusiness size={18} />}
                                label="Pending Job Orders"
                                count={pendingJobOrders.length}
                            />
                            <TabButton
                                active={activeTab === "pending"}
                                onClick={() => {
                                    setActiveTab("pending");
                                    setSearch("");
                                    setStatusFilter("All");
                                }}
                                icon={<Clock size={18} />}
                                label="Pending Invoices"
                                count={stats.pending}
                            />
                            <TabButton
                                active={activeTab === "all"}
                                onClick={() => {
                                    setActiveTab("all");
                                    setSearch("");
                                }}
                                icon={<FileText size={18} />}
                                label="All Invoices"
                                count={invoices.length}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search
                                    size={17}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    placeholder={
                                        activeTab === "job-orders"
                                            ? "Search job orders..."
                                            : "Search invoices..."
                                    }
                                    className="w-48 rounded-xl border border-slate-700 bg-black py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-400/50 sm:w-60"
                                />
                            </div>

                            {activeTab === "all" && (
                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(
                                            e.target.value as
                                                | "All"
                                                | InvoiceStatus,
                                        )
                                    }
                                    className="rounded-xl border border-slate-700 bg-black px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-yellow-400/50"
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
                                    hideAmount
                                        ? "Show amounts"
                                        : "Hide amounts"
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-black text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-400"
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
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-black text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-400"
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
                            onApprove={approveJobOrder}
                            onReject={rejectJobOrder}
                            isProcessing={isProcessing}
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
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 shadow-lg shadow-yellow-950/20">
                                        <FilePenLine size={26} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400/70">
                                            Invoice Editor
                                        </p>
                                        <h3 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">
                                            {selectedInvoice.number}
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-500">
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

                        <div className="rounded-3xl border border-slate-800 bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                                    <FileText size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-white">
                                        Invoice Number
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-600">
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
                                className="w-full rounded-xl border border-slate-700 bg-black py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                disabled={isSavingInvoice}
                            />
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                                    <UserRound size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-white">
                                        Billing Information
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-600">
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
                                        className="w-full rounded-xl border border-slate-700 bg-black py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
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
                                        className="w-full rounded-xl border border-slate-700 bg-black py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                        disabled={isSavingInvoice}
                                    />
                                </BeautifulFormField>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                                    <Wallet size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-white">
                                        Payment Details
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-600">
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
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-yellow-400">
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
                                            className="w-full rounded-xl border border-slate-700 bg-black py-3 pl-10 pr-4 text-lg font-black text-yellow-400 placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
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
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
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
                                            className="w-full rounded-xl border border-slate-700 bg-black py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                            disabled={isSavingInvoice}
                                        />
                                    </div>
                                </BeautifulFormField>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                                    <FileText size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-white">
                                        Invoice Description
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-600">
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
                                className="w-full rounded-xl border border-slate-700 bg-black py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                                disabled={isSavingInvoice}
                            />
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-black/50 p-5 sm:p-6">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                                    <StickyNote size={19} />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-wide text-white">
                                        Internal Notes
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-600">
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
                                className="w-full rounded-xl border border-slate-700 bg-black py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                                disabled={isSavingInvoice}
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={isSavingInvoice}
                                onClick={() => setShowInvoiceEdit(false)}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-black px-6 text-sm font-bold text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
| ✅ PENDING JOB ORDERS LIST (BAGO)
|--------------------------------------------------------------------------
*/

function PendingJobOrdersList({
    jobOrders,
    onApprove,
    onReject,
    isProcessing,
    hideAmount,
}: {
    jobOrders: PendingJobOrder[];
    onApprove: (jobOrder: PendingJobOrder) => void;
    onReject: (jobOrder: PendingJobOrder) => void;
    isProcessing: boolean;
    hideAmount: boolean;
}) {
    if (jobOrders.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-black/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-black text-slate-600">
                    <BriefcaseBusiness size={40} />
                </div>
                <h3 className="mt-5 text-xl font-black text-white">
                    No Pending Job Orders
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                    All Job Orders have been reviewed. Great job!
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-black shadow-2xl shadow-black/30">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-slate-800 bg-black/70">
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Job Order
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Client
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Project
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                                Amount
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Staff
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Submitted
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobOrders.map((jobOrder) => (
                            <tr
                                key={jobOrder.id}
                                className="border-b border-slate-800/70 transition-colors hover:bg-yellow-400/[0.025]"
                            >
                                <td className="px-5 py-5">
                                    <p className="font-black text-white">
                                        {jobOrder.number}
                                    </p>
                                    <p className="mt-1 text-xs text-yellow-400">
                                        Pending Approval
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="font-semibold text-slate-200">
                                        {jobOrder.client}
                                    </p>
                                    {jobOrder.clientEmail && (
                                        <p className="mt-1 text-xs text-slate-600">
                                            {jobOrder.clientEmail}
                                        </p>
                                    )}
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-slate-300">
                                        {jobOrder.project}
                                    </p>
                                    {jobOrder.location && (
                                        <p className="mt-1 text-xs text-slate-600">
                                            {jobOrder.location}
                                        </p>
                                    )}
                                </td>
                                <td className="px-5 py-5 text-right">
                                    <p className="font-black text-yellow-400">
                                        {money(jobOrder.amount, hideAmount)}
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-slate-300">
                                        {jobOrder.staffName || "—"}
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-slate-300">
                                        {formatDateTime(jobOrder.generatedAt)}
                                    </p>
                                    {jobOrder.generatedByName && (
                                        <p className="mt-1 text-xs text-slate-600">
                                            by {jobOrder.generatedByName}
                                        </p>
                                    )}
                                </td>
                                <td className="px-5 py-5">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onApprove(jobOrder)}
                                            disabled={isProcessing}
                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 text-xs font-black text-emerald-400 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Check size={14} /> Approve
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onReject(jobOrder)}
                                            disabled={isProcessing}
                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-red-500/20 px-3 text-xs font-black text-red-400 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Ban size={14} /> Reject
                                        </button>
                                    </div>
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
        <div className="absolute right-0 top-full z-[80] mt-3 w-80 overflow-hidden rounded-2xl border border-slate-700 bg-black/95 shadow-2xl backdrop-blur-md sm:w-96">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-yellow-400" />
                    <p className="text-sm font-black uppercase tracking-wide text-white">
                        Notifications
                    </p>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-black text-yellow-400">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={onMarkAllRead}
                            className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-400 transition hover:bg-yellow-400/10"
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                        <Bell size={28} className="text-slate-700" />
                        <p className="mt-3 text-sm font-bold text-slate-400">
                            No notifications
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
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
                                "flex w-full items-start gap-3 border-b border-slate-800/70 px-4 py-3 text-left transition hover:bg-slate-800/40",
                                !notification.read
                                    ? "bg-yellow-400/[0.04]"
                                    : "",
                            ].join(" ")}
                        >
                            <div
                                className={[
                                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    notification.type === "success"
                                        ? "bg-emerald-400/10 text-emerald-400"
                                        : notification.type === "error"
                                          ? "bg-red-400/10 text-red-400"
                                          : notification.type === "warning"
                                            ? "bg-yellow-400/10 text-yellow-400"
                                            : "bg-blue-400/10 text-blue-400",
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
                                    <p className="truncate text-sm font-bold text-white">
                                        {notification.title}
                                    </p>
                                    {!notification.read && (
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-400" />
                                    )}
                                </div>
                                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-400">
                                    {notification.message}
                                </p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
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
        yellow: "border-yellow-400/20 bg-yellow-400/5 text-yellow-400 hover:bg-yellow-400/10",
        blue: "border-blue-400/20 bg-blue-400/5 text-blue-400 hover:bg-blue-400/10",
        red: "border-red-400/20 bg-red-400/5 text-red-400 hover:bg-red-400/10",
        green: "border-emerald-400/20 bg-emerald-400/5 text-emerald-400 hover:bg-emerald-400/10",
        orange: "border-orange-400/20 bg-orange-400/5 text-orange-400 hover:bg-orange-400/10",
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
                    ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30"
                    : "border border-slate-700 bg-black text-slate-400 hover:border-yellow-400/30 hover:text-yellow-400",
            ].join(" ")}
        >
            {icon}
            {label}
            {count > 0 && (
                <span
                    className={[
                        "ml-1 rounded-full px-2 py-0.5 text-xs",
                        active
                            ? "bg-yellow-400/20 text-yellow-400"
                            : "bg-slate-800 text-slate-400",
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
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-black/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-black text-slate-600">
                    <CheckCircle2 size={40} className="text-emerald-400" />
                </div>
                <h3 className="mt-5 text-xl font-black text-white">
                    No Pending Invoices
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                    All invoices have been reviewed. Great job!
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-black shadow-2xl shadow-black/30">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                    <thead>
                        <tr className="border-b border-slate-800 bg-black/70">
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Invoice
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Client
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Project
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                                Amount
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Created
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Staff
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr
                                key={invoice.id}
                                className="border-b border-slate-800/70 transition-colors hover:bg-yellow-400/[0.025]"
                            >
                                <td className="px-5 py-5">
                                    <button
                                        type="button"
                                        onClick={() => onView(invoice)}
                                        className="text-left"
                                    >
                                        <p className="font-black text-white hover:text-yellow-400">
                                            {invoice.number}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            {formatDate(invoice.createdAt)}
                                        </p>
                                    </button>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="font-semibold text-slate-200">
                                        {invoice.client}
                                    </p>
                                    {invoice.clientEmail && (
                                        <p className="mt-1 text-xs text-slate-600">
                                            {invoice.clientEmail}
                                        </p>
                                    )}
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-slate-300">
                                        {invoice.project}
                                    </p>
                                </td>
                                <td className="px-5 py-5 text-right">
                                    <p className="font-black text-yellow-400">
                                        {money(invoice.amount, hideAmount)}
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-slate-300">
                                        {formatDate(invoice.createdAt)}
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-slate-300">
                                        {invoice.staffName || "—"}
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onView(invoice)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-400"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onApprove(invoice)}
                                            disabled={isProcessing}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onReject(invoice)}
                                            disabled={isProcessing}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Ban size={16} />
                                        </button>
                                    </div>
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
    viewMode: "list" | "grid";
    isProcessing: boolean;
    isSendingEmail: boolean;
    hideAmount: boolean;
}) {
    if (invoices.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-black/50">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-black text-slate-600">
                    <FileText size={40} />
                </div>
                <h3 className="mt-5 text-xl font-black text-white">
                    No Invoices Found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
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
                        isProcessing={isProcessing}
                        isSendingEmail={isSendingEmail}
                        hideAmount={hideAmount}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-black shadow-2xl shadow-black/30">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-slate-800 bg-black/70">
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Invoice
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Client
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Project
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                                Amount
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                                Due Date
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                                Status
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr
                                key={invoice.id}
                                className="border-b border-slate-800/70 transition-colors hover:bg-yellow-400/[0.025]"
                            >
                                <td className="px-5 py-5">
                                    <button
                                        type="button"
                                        onClick={() => onView(invoice)}
                                        className="text-left"
                                    >
                                        <p className="font-black text-white hover:text-yellow-400">
                                            {invoice.number}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            {formatDate(invoice.createdAt)}
                                        </p>
                                    </button>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="font-semibold text-slate-200">
                                        {invoice.client}
                                    </p>
                                    {invoice.clientEmail && (
                                        <p className="mt-1 text-xs text-slate-600">
                                            {invoice.clientEmail}
                                        </p>
                                    )}
                                </td>
                                <td className="px-5 py-5">
                                    <p className="truncate text-sm text-slate-300 max-w-[180px]">
                                        {invoice.project}
                                    </p>
                                </td>
                                <td className="px-5 py-5 text-right">
                                    <p className="font-black text-white">
                                        {money(invoice.amount, hideAmount)}
                                    </p>
                                </td>
                                <td className="px-5 py-5">
                                    <p className="text-sm text-slate-300">
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
    isProcessing: boolean;
    isSendingEmail: boolean;
    hideAmount: boolean;
}) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-black/50 p-5 transition-colors hover:border-yellow-400/30">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-slate-600">
                        {formatDate(invoice.createdAt)}
                    </p>
                    <p className="mt-1 font-black text-white">
                        {invoice.number}
                    </p>
                </div>
                <AdminStatusBadge status={invoice.status} />
            </div>

            <div className="mt-4">
                <p className="font-semibold text-slate-200">{invoice.client}</p>
                <p className="mt-1 text-sm text-slate-500">{invoice.project}</p>
            </div>

            <div className="mt-2">
                <p className="text-xs text-slate-500">Payment Method</p>
                <p className="text-sm font-semibold text-white">
                    {invoice.paymentMethod || "Bank Transfer"}
                </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                    <p className="text-sm text-slate-500">Amount</p>
                    <p className="text-xl font-black text-yellow-400">
                        {money(invoice.amount, hideAmount)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-slate-500">VAT (12%)</p>
                    <p className="text-sm font-bold text-yellow-400">
                        {money(invoice.amount * VAT_RATE, hideAmount)}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onView(invoice)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                >
                    <Eye size={15} /> View
                </button>
                <button
                    type="button"
                    onClick={() => onEdit(invoice)}
                    disabled={isProcessing}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-yellow-400/20 text-sm font-bold text-yellow-400 transition hover:bg-yellow-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Edit3 size={15} /> Edit
                </button>
                {invoice.status === "Pending" && (
                    <>
                        <button
                            type="button"
                            onClick={() => onApprove(invoice)}
                            disabled={isProcessing}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Check size={15} /> Approve
                        </button>
                        <button
                            type="button"
                            onClick={() => onReject(invoice)}
                            disabled={isProcessing}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/20 text-sm font-bold text-red-400 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-500/20 text-sm font-bold text-blue-400 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
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
    isProcessing,
    isSendingEmail,
}: {
    invoice: Invoice;
    onView: (invoice: Invoice) => void;
    onEdit: (invoice: Invoice) => void;
    onApprove: (invoice: Invoice) => void;
    onReject: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-black text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-400"
                >
                    <MoreVertical size={17} />
                </button>
            </div>
            {open && (
                <div
                    ref={menuRef}
                    className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl shadow-black/50"
                    style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                    }}
                >
                    <div className="border-b border-slate-800 px-4 py-2.5">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
                            Invoice Actions
                        </p>
                    </div>
                    <ActionItem
                        icon={<Eye size={16} />}
                        label="View Details"
                        onClick={() => action(() => onView(invoice))}
                    />
                    <ActionItem
                        icon={<Edit3 size={16} />}
                        label="Edit Invoice"
                        onClick={() => action(() => onEdit(invoice))}
                        className="text-yellow-400 hover:bg-yellow-400/10"
                    />
                    {invoice.status === "Pending" && (
                        <>
                            <ActionItem
                                icon={<Check size={16} />}
                                label="Approve"
                                onClick={() => action(() => onApprove(invoice))}
                                className="text-emerald-400 hover:bg-emerald-400/10"
                            />
                            <ActionItem
                                icon={<Ban size={16} />}
                                label="Reject"
                                onClick={() => action(() => onReject(invoice))}
                                className="text-red-400 hover:bg-red-400/10"
                            />
                        </>
                    )}
                    {invoice.status === "Approved" && (
                        <ActionItem
                            icon={<Mail size={16} />}
                            label="Send to Client"
                            onClick={() => action(() => onSendEmail(invoice))}
                            className="text-blue-400 hover:bg-blue-400/10"
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
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-yellow-400/10 hover:text-yellow-400",
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
        pending: "border-yellow-400/20 bg-yellow-400/10 text-yellow-400",
        partial: "border-orange-400/20 bg-orange-400/10 text-orange-400",
        paid: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
        overdue: "border-red-400/20 bg-red-400/10 text-red-400",
        rejected: "border-red-400/20 bg-red-400/10 text-red-400",
        approved: "border-blue-400/20 bg-blue-400/10 text-blue-400",
    };

    return (
        <span
            className={[
                "inline-flex rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide",
                statusMap[normalized] ||
                    "border-slate-700 bg-slate-800/60 text-slate-300",
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
    isProcessing,
    isSendingEmail,
    hideAmount,
}: {
    invoice: Invoice;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
    onSendEmail: () => void;
    isProcessing: boolean;
    isSendingEmail: boolean;
    hideAmount: boolean;
}) {
    const totalSales = invoice.amount;
    const vatAmount = totalSales * VAT_RATE;
    const netOfVAT = totalSales;
    const withholdingTax = 0;
    const totalAmountDue = netOfVAT + vatAmount;

    const invoiceType = invoice.items.some(
        (item) =>
            item.description?.toLowerCase().includes("equipment") ||
            item.description?.toLowerCase().includes("logistics") ||
            item.description?.toLowerCase().includes("service"),
    )
        ? "Service Invoice"
        : "Sales Invoice";

    return (
        <Modal title={`Invoice ${invoice.number}`} onClose={onClose} size="lg">
            <div className="space-y-6">
                <div className="rounded-2xl border border-yellow-400/10 bg-black/70 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                                {invoiceType}
                            </p>
                            <p className="mt-1 text-2xl font-black text-yellow-400">
                                {invoice.number}
                            </p>
                        </div>
                        <AdminStatusBadge status={invoice.status} />
                    </div>
                </div>

                {invoice.status === "Rejected" && invoice.rejectionReason && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
                        <div className="flex items-start gap-3">
                            <Ban size={20} className="mt-0.5 text-red-400" />
                            <div>
                                <p className="font-bold text-red-400">
                                    Rejection Reason
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                                    {invoice.rejectionReason}
                                </p>
                                {invoice.rejectedAt && (
                                    <p className="mt-2 text-xs text-slate-600">
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
                                className="mt-0.5 text-blue-400"
                            />
                            <div>
                                <p className="font-bold text-blue-400">
                                    Invoice Approved
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                    Approved on{" "}
                                    {formatDateTime(invoice.approvedAt)}
                                </p>
                                {invoice.approvedBy && (
                                    <p className="mt-1 text-xs text-slate-600">
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

                <div className="overflow-hidden rounded-2xl border border-slate-800">
                    <div className="border-b border-slate-800 bg-black px-5 py-4">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            {invoiceType} Items
                        </p>
                    </div>

                    <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-black/50 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
                        <div className="col-span-1">Qty</div>
                        <div className="col-span-5">
                            {invoiceType === "Service Invoice"
                                ? "Description"
                                : "Particulars"}
                        </div>
                        <div className="col-span-2 text-right">
                            {invoiceType === "Service Invoice"
                                ? "Unit Cost"
                                : "Unit Price"}
                        </div>
                        <div className="col-span-4 text-right">Amount</div>
                    </div>

                    <div className="divide-y divide-slate-800">
                        {invoice.items.map((item) => (
                            <div
                                key={item.id}
                                className="grid grid-cols-12 gap-2 px-5 py-4"
                            >
                                <div className="col-span-1 font-semibold text-slate-300">
                                    {item.quantity}
                                </div>
                                <div className="col-span-5 text-slate-200">
                                    {item.description}
                                </div>
                                <div className="col-span-2 text-right text-slate-300">
                                    {money(item.unitPrice, hideAmount)}
                                </div>
                                <div className="col-span-4 text-right font-bold text-white">
                                    {money(
                                        item.quantity * item.unitPrice,
                                        hideAmount,
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-800 bg-black/50 px-5 py-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold uppercase tracking-wide text-slate-400">
                                    Total Sales
                                </span>
                                <span className="text-lg font-bold text-white">
                                    {money(totalSales, hideAmount)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-800/50 pt-3">
                                <div className="flex items-center gap-2">
                                    <Percent
                                        size={16}
                                        className="text-yellow-400"
                                    />
                                    <span className="font-bold uppercase tracking-wide text-yellow-400">
                                        VAT (12%)
                                    </span>
                                </div>
                                <span className="text-lg font-bold text-yellow-400">
                                    {money(vatAmount, hideAmount)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-800/50 pt-3">
                                <div className="flex items-center gap-2">
                                    <Calculator
                                        size={16}
                                        className="text-slate-400"
                                    />
                                    <span className="font-bold uppercase tracking-wide text-slate-400">
                                        Net of VAT
                                    </span>
                                </div>
                                <span className="text-lg font-bold text-white">
                                    {money(netOfVAT, hideAmount)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-800/50 pt-3">
                                <span className="font-bold uppercase tracking-wide text-orange-400">
                                    Withholding Tax
                                </span>
                                <span className="text-lg font-bold text-orange-400">
                                    {money(withholdingTax, hideAmount)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-t-2 border-yellow-400/30 pt-4">
                                <span className="text-xl font-black uppercase tracking-wide text-yellow-400">
                                    Total Amount Due
                                </span>
                                <span className="text-2xl font-black text-yellow-400">
                                    {money(totalAmountDue, hideAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {invoice.supportingDocuments && (
                    <div className="rounded-2xl border border-slate-800 bg-black/60 p-5">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
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
                    <div className="rounded-2xl border border-slate-800 bg-black/60 p-5">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                            Description
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                            {invoice.description}
                        </p>
                    </div>
                )}

                {invoice.notes && (
                    <div className="rounded-2xl border border-slate-800 bg-black/60 p-5">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                            Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                            {invoice.notes}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-900"
                    >
                        Close
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
            <div className="rounded-xl border border-slate-800 bg-black/50 p-3">
                <p className="text-xs text-slate-600">{label}</p>
                <p className="mt-1 text-sm text-slate-500">—</p>
            </div>
        );
    }
    return (
        <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-black/50 p-3 transition hover:border-yellow-400/40 hover:bg-black/80"
        >
            <div>
                <p className="text-xs text-slate-600">{label}</p>
                <p className="mt-1 text-sm font-semibold text-white">
                    View Document
                </p>
            </div>
            <ExternalLink size={16} className="text-slate-500" />
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
                        <CheckCircle2 size={24} className="text-emerald-400" />
                        <div>
                            <p className="font-bold text-emerald-400">
                                Confirm Approval
                            </p>
                            <p className="text-sm text-slate-400">
                                You are about to approve invoice{" "}
                                <span className="font-bold text-white">
                                    {invoice.number}
                                </span>{" "}
                                for{" "}
                                <span className="font-bold text-white">
                                    {invoice.client}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-black/50 p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-slate-400">
                            Amount:{" "}
                            <span className="font-bold text-yellow-400">
                                {money(invoice.amount, hideAmount)}
                            </span>
                        </p>
                        <p className="text-slate-400">
                            VAT (12%):{" "}
                            <span className="font-bold text-yellow-400">
                                {money(invoice.amount * VAT_RATE, hideAmount)}
                            </span>
                        </p>
                        <p className="text-slate-400 col-span-2">
                            Project:{" "}
                            <span className="text-white">
                                {invoice.project}
                            </span>
                        </p>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Approval Notes (Optional)
                    </label>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this approval..."
                        className="w-full rounded-xl border border-slate-700 bg-black py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                        disabled={isProcessing}
                    />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
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
                        <Ban size={24} className="text-red-400" />
                        <div>
                            <p className="font-bold text-red-400">
                                Confirm Rejection
                            </p>
                            <p className="text-sm text-slate-400">
                                You are about to reject invoice{" "}
                                <span className="font-bold text-white">
                                    {invoice.number}
                                </span>{" "}
                                for{" "}
                                <span className="font-bold text-white">
                                    {invoice.client}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-black/50 p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-slate-400">
                            Amount:{" "}
                            <span className="font-bold text-yellow-400">
                                {money(invoice.amount, hideAmount)}
                            </span>
                        </p>
                        <p className="text-slate-400">
                            VAT (12%):{" "}
                            <span className="font-bold text-yellow-400">
                                {money(invoice.amount * VAT_RATE, hideAmount)}
                            </span>
                        </p>
                        <p className="text-slate-400 col-span-2">
                            Project:{" "}
                            <span className="text-white">
                                {invoice.project}
                            </span>
                        </p>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Reason for Rejection{" "}
                        <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a detailed reason why this invoice is being rejected..."
                        className="w-full rounded-xl border border-slate-700 bg-black py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10 resize-y"
                        disabled={isProcessing}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        {reason.length} / 500 characters
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="rounded-2xl border border-slate-800 bg-black/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                {label}
            </p>
            <p
                className={[
                    "mt-2 break-words text-sm font-semibold",
                    highlight ? "text-yellow-400" : "text-slate-200",
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
        <div className="rounded-2xl border border-slate-800 bg-black/70 p-4">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-black text-slate-500">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        {label}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-300">
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
            <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                {icon && <span className="text-slate-600">{icon}</span>}
                {label}
                {required && <span className="text-yellow-400">*</span>}
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
                    "w-full overflow-hidden rounded-3xl border border-yellow-400/10 bg-black shadow-2xl",
                    sizeClass,
                ].join(" ")}
            >
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-6">
                    <h2 className="text-lg font-black uppercase tracking-wide text-white">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:border-yellow-400/40 hover:text-yellow-400"
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