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
    Bell,
    BellRing,
    Ban,
    RotateCcw,
    AlertTriangle,
    Send,
    Percent,
    Calculator,
    CreditCard,
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
    sentAt?: string | null;
    sentBy?: string | null;
    vatAmount?: number;
    netAmount?: number;
    withholdingTax?: number;
    totalAmountDue?: number;
    paymentMethod?: string | null;
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
};

type Notification = {
    id: number;
    type: "info" | "success" | "warning" | "error";
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    link?: string;
};

type PageProps = {
    invoices?: Invoice[];
    jobOrders?: JobOrder[];
    records?: JobOrder[];
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
        sentAt: raw?.sentAt ?? raw?.sent_at ?? null,
        sentBy: raw?.sentBy ?? raw?.sent_by ?? null,
        vatAmount,
        netAmount,
        withholdingTax: 0,
        totalAmountDue,
        paymentMethod:
            raw?.paymentMethod ?? raw?.payment_method ?? "Bank Transfer",
    };
};

const getJobOrderNumber = (jobOrder: JobOrder) =>
    jobOrder.number ?? `JO-${jobOrder.id}`;
const getJobOrderAmount = (jobOrder: JobOrder) => Number(jobOrder.amount ?? 0);

/**
 * ✅ UPDATED: Treats both "Generated" AND "Pending Admin Approval" as generated
 * from the user's perspective. They can no longer click "Generate" once submitted.
 */
const isJobOrderGenerated = (jobOrder: JobOrder) => {
    const status = String(jobOrder.status ?? "").toLowerCase();
    return (
        status === "generated" ||
        status === "pending admin approval" ||
        Boolean(jobOrder.hasInvoice) ||
        Boolean(jobOrder.invoiceId) ||
        Boolean(jobOrder.invoice)
    );
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
    const backendInvoices = page.props.invoices ?? [];
    const backendJobOrders = page.props.jobOrders ?? page.props.records ?? [];
    const backendNotifications = page.props.notifications ?? [];

    const [invoices, setInvoices] = useState<Invoice[]>(
        backendInvoices.map(normalizeInvoice),
    );
    const [jobOrders, setJobOrders] = useState<JobOrder[]>(backendJobOrders);
    const [notifications, setNotifications] =
        useState<Notification[]>(backendNotifications);
    const [unreadCount, setUnreadCount] = useState<number>(
        backendNotifications.filter((n) => !n.read).length,
    );

    const [activeTab, setActiveTab] = useState<"job-orders" | "invoices">(
        "job-orders",
    );
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
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);
    const [showSendEmailModal, setShowSendEmailModal] = useState(false);

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
    const [isGenerating, setIsGenerating] = useState(false);
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
        setNotifications(backendNotifications);
        setUnreadCount(backendNotifications.filter((n) => !n.read).length);
    }, [page.props.notifications]);

    useEffect(() => {
        if (!flashSuccess) return;
        setSuccessMessage(String(flashSuccess));
        const timer = window.setTimeout(() => setSuccessMessage(""), 8000);
        return () => window.clearTimeout(timer);
    }, [flashSuccess]);

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

    const filteredInvoices = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return invoices.filter((invoice) => {
            const matchesSearch =
                !keyword ||
                [
                    invoice.number,
                    invoice.client,
                    invoice.project,
                    invoice.clientEmail,
                    invoice.status,
                    invoice.jobOrderId ? `JO-${invoice.jobOrderId}` : "",
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
    }, [invoices, search, invoiceStatusFilter]);

    const pendingCount = invoices.filter((i) => i.status === "Pending").length;
    const partialCount = invoices.filter((i) => i.status === "Partial").length;
    const paidCount = invoices.filter((i) => i.status === "Paid").length;
    const overdueCount = invoices.filter((i) => i.status === "Overdue").length;
    const rejectedCount = invoices.filter(
        (i) => i.status === "Rejected",
    ).length;
    const approvedCount = invoices.filter(
        (i) => i.status === "Approved",
    ).length;

    const jobOrderShouldScroll = filteredJobOrders.length >= SCROLL_THRESHOLD;
    const invoiceShouldScroll = filteredInvoices.length >= SCROLL_THRESHOLD;
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
            only: [
                "invoices",
                "jobOrders",
                "records",
                "flash",
                "notifications",
            ],
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

    /*
    |--------------------------------------------------------------------------
    | ✅ GENERATE JOB ORDER (FIXED)
    |--------------------------------------------------------------------------
    |
    | Changes:
    | - Removed setActiveTab("invoices") — hindi na lumilipat sa Service Invoice
    | - Updated success message — hindi na nagsasabing "invoice created"
    | - Manatili sa job-orders tab
    |
    */

    const generateJobOrder = (jobOrder: JobOrder) => {
        const number = getJobOrderNumber(jobOrder);
        if (isGenerating) return;
        if (isJobOrderGenerated(jobOrder)) {
            alert(
                `Job Order ${number} has already been submitted for admin approval.`,
            );
            return;
        }
        const status = String(jobOrder.status ?? "");
        if (!["Pending", "Received"].includes(status)) {
            alert(
                `Job Order ${number} cannot be generated while its status is ${status || "Unknown"}.`,
            );
            return;
        }

        openConfirm({
            title: "Submit Job Order for Approval",
            message: `Are you sure you want to submit Job Order ${number} for Admin approval?\n\nThe invoice will be created once Admin approves it.`,
            confirmLabel: "Submit Now",
            cancelLabel: "Cancel",
            variant: "warning",
            onConfirm: () => {
                setSuccessMessage("");
                setIsGenerating(true);

                router.post(
                    `/job-orders/${jobOrder.id}/generate`,
                    {},
                    {
                        preserveScroll: true,
                        onStart: () => {
                            setSuccessMessage("");
                            setIsGenerating(true);
                        },
                        onSuccess: () => {
                            setIsGenerating(false);
                            setSuccessMessage(
                                `Job Order ${number} has been submitted for Admin approval. The invoice will appear in Service Invoices once approved.`,
                            );
                            // ✅ HUWAG lumipat sa invoices tab — manatili sa Job Orders
                            setActiveTab("job-orders");
                            setSearch("");
                            setInvoiceStatusFilter("All");
                            setSelectedJobOrder(null);
                            setShowJobOrderView(false);
                            // ✅ Refresh para makita agad ang bagong status
                            refreshData();
                        },
                        onError: (errors) => {
                            setIsGenerating(false);
                            console.error("GENERATE JOB ORDER ERROR:", errors);
                            const firstError = Object.values(errors ?? {})[0];
                            alert(
                                firstError
                                    ? String(firstError)
                                    : `Failed to submit Job Order ${number}. Please try again.`,
                            );
                        },
                        onFinish: () => setIsGenerating(false),
                    },
                );
            },
        });
    };

    const openJobOrder = (jobOrder: JobOrder) => {
        setSelectedJobOrder(jobOrder);
        setShowJobOrderView(true);
    };

    const openInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setShowInvoiceView(true);
    };

    const resubmitInvoice = (invoice: Invoice) => {
        if (!invoice || isResubmitting) return;

        openConfirm({
            title: "Resubmit Invoice",
            message: `Resubmit invoice ${invoice.number}?\n\nThis will set the status back to PENDING for Admin review.`,
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
                                `Invoice ${invoice.number} has been resubmitted and is now PENDING for review.`,
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

        setSendEmailData({
            email: invoice.clientEmail || "",
            subject: `Invoice ${invoice.number} - ${invoice.status}`,
            message: `Dear ${invoice.client},\n\nPlease find attached the invoice ${invoice.number} for your reference.\n\nStatus: ${invoice.status}\nAmount: ${money(invoice.amount, hideAmount)}\nDue Date: ${formatDate(invoice.dueDate)}${statusMessage}\n\nThank you,\nALIBATON Team`,
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
            pdf.save(`${invoice.number || "invoice"}.pdf`);
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
                            <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#999;margin:0;">${invoice.jobOrderId ? "Service Invoice" : "Sales Invoice"}</p>
                            <p style="font-size:22px;font-weight:900;margin:5px 0 0 0;color:#1a1a2e;">${invoice.number}</p>
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
            `}</style>

            <UserLayout>
                <div className="min-h-screen bg-[#0a0a0a] text-white">
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

                        {/* TABS */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <TabCard
                                active={activeTab === "job-orders"}
                                icon={<BriefcaseBusiness size={27} />}
                                title="Job Orders"
                                count={jobOrders.length}
                                subtitle="Received job orders ready for billing"
                                onClick={() => {
                                    setActiveTab("job-orders");
                                    setSearch("");
                                    setInvoiceStatusFilter("All");
                                }}
                            />
                            <TabCard
                                active={activeTab === "invoices"}
                                icon={<FileText size={27} />}
                                title="Service Invoice"
                                count={invoices.length}
                                subtitle="Generated invoices and payment status"
                                onClick={() => {
                                    setActiveTab("invoices");
                                    setSearch("");
                                }}
                            />
                        </div>

                        {/* JOB ORDERS */}
                        {activeTab === "job-orders" && (
                            <section className="mt-6 overflow-hidden rounded-3xl border border-yellow-400/10 bg-slate-900/80 shadow-2xl shadow-black/30">
                                <div className="border-b border-slate-800 p-5 sm:p-6">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <BriefcaseBusiness
                                                    size={20}
                                                    className="text-yellow-400"
                                                />
                                                <h2 className="text-lg font-black uppercase tracking-wide">
                                                    Job Orders
                                                </h2>
                                            </div>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Submit a Job Order to Admin for
                                                approval. Invoice will be created
                                                once approved.
                                            </p>
                                        </div>
                                        <div className="relative w-full lg:w-96">
                                            <Search
                                                size={18}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                            />
                                            <input
                                                value={search}
                                                onChange={(event) =>
                                                    setSearch(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search Job Order..."
                                                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
                                            />
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
                                        onGenerate={generateJobOrder}
                                        isGenerating={isGenerating}
                                        hideAmount={hideAmount}
                                        onToggleHideAmount={() =>
                                            setHideAmount((v) => !v)
                                        }
                                    />
                                </div>
                            </section>
                        )}

                        {/* INVOICES */}
                        {activeTab === "invoices" && (
                            <section className="mt-6">
                                <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                                    <SummaryCard
                                        icon={<Clock size={20} />}
                                        label="Pending"
                                        value={pendingCount}
                                        active={
                                            invoiceStatusFilter === "Pending"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Pending")
                                        }
                                        color="yellow"
                                    />
                                    <SummaryCard
                                        icon={<Receipt size={20} />}
                                        label="Partial"
                                        value={partialCount}
                                        active={
                                            invoiceStatusFilter === "Partial"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Partial")
                                        }
                                        color="orange"
                                    />
                                    <SummaryCard
                                        icon={<CheckCircle2 size={20} />}
                                        label="Paid"
                                        value={paidCount}
                                        active={invoiceStatusFilter === "Paid"}
                                        onClick={() =>
                                            handleSummaryCardClick("Paid")
                                        }
                                        color="emerald"
                                    />
                                    <SummaryCard
                                        icon={<AlertCircle size={20} />}
                                        label="Overdue"
                                        value={overdueCount}
                                        active={
                                            invoiceStatusFilter === "Overdue"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Overdue")
                                        }
                                        color="red"
                                    />
                                    <SummaryCard
                                        icon={<Ban size={20} />}
                                        label="Rejected"
                                        value={rejectedCount}
                                        active={
                                            invoiceStatusFilter === "Rejected"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Rejected")
                                        }
                                        color="red"
                                    />
                                    <SummaryCard
                                        icon={<CheckCircle2 size={20} />}
                                        label="Approved"
                                        value={approvedCount}
                                        active={
                                            invoiceStatusFilter === "Approved"
                                        }
                                        onClick={() =>
                                            handleSummaryCardClick("Approved")
                                        }
                                        color="blue"
                                    />
                                </div>

                                <section className="mt-5 overflow-hidden rounded-3xl border border-yellow-400/10 bg-slate-900/80 shadow-2xl shadow-black/30">
                                    <div className="border-b border-slate-800 p-5 sm:p-6">
                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <FileText
                                                        size={20}
                                                        className="text-yellow-400"
                                                    />
                                                    <h2 className="text-lg font-black uppercase tracking-wide">
                                                        Invoices
                                                    </h2>
                                                </div>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Invoices automatically
                                                    created from approved Job
                                                    Orders. Includes 12% VAT.
                                                    {invoiceShouldScroll && (
                                                        <span className="ml-2 text-yellow-400/60">
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
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                                    />
                                                    <input
                                                        value={search}
                                                        onChange={(event) =>
                                                            setSearch(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Search invoice..."
                                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/10"
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
                                                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 outline-none focus:border-yellow-400/50"
                                                >
                                                    <option value="All">
                                                        All Status
                                                    </option>
                                                    <option value="Pending">
                                                        Pending
                                                    </option>
                                                    <option value="Partial">
                                                        Partial
                                                    </option>
                                                    <option value="Paid">
                                                        Paid
                                                    </option>
                                                    <option value="Overdue">
                                                        Overdue
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
                                            invoices={filteredInvoices}
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
                            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
                        >
                            Close
                        </button>
                        {!isJobOrderGenerated(selectedJobOrder) &&
                            ["Pending", "Received"].includes(
                                String(selectedJobOrder.status ?? ""),
                            ) && (
                                <button
                                    type="button"
                                    disabled={isGenerating}
                                    onClick={() => {
                                        setShowJobOrderView(false);
                                        generateJobOrder(selectedJobOrder);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw
                                                size={17}
                                                className="animate-spin"
                                            />{" "}
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Receipt size={17} /> Submit for
                                            Approval
                                        </>
                                    )}
                                </button>
                            )}
                    </div>
                </Modal>
            )}

            {/* INVOICE VIEW */}
            {showInvoiceView && selectedInvoice && (
                <Modal
                    title={`Invoice ${selectedInvoice.number}`}
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
                            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
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
                                <Send size={24} className="text-blue-400" />
                                <div>
                                    <p className="font-bold text-blue-400">
                                        Send Invoice Email
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        The client will receive this invoice via
                                        email.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                Client Email{" "}
                                <span className="text-red-400">*</span>
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
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10"
                                disabled={isSendingEmail}
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
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
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10"
                                disabled={isSendingEmail}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
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
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 resize-y"
                                disabled={isSendingEmail}
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowSendEmailModal(false)}
                                disabled={isSendingEmail}
                                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="confirm-card w-full max-w-md overflow-hidden rounded-3xl border border-yellow-400/20 bg-slate-900 shadow-[0_25px_80px_-20px_rgba(250,204,21,0.25)]"
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
                                        ? "border-yellow-400/30 bg-yellow-400/15 text-yellow-400"
                                        : confirmDialog.variant === "danger"
                                          ? "border-red-400/30 bg-red-400/15 text-red-400"
                                          : confirmDialog.variant === "success"
                                            ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-400"
                                            : "border-blue-400/30 bg-blue-400/15 text-blue-400",
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
                                <h3 className="text-lg font-black uppercase tracking-wide text-white">
                                    {confirmDialog.title}
                                </h3>
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="whitespace-pre-line text-sm leading-6 text-slate-300">
                                {confirmDialog.message}
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950/50 p-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeConfirm}
                                className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
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

                    <div className="fixed bottom-5 left-1/2 z-[110] flex -translate-x-1/2 gap-2 rounded-2xl border border-slate-700 bg-slate-950/95 p-2 shadow-2xl print:hidden">
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
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700"
                        >
                            <Download size={17} /> PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowInvoicePrint(false)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
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

function NotificationPanel({
    notifications,
    onClose,
    onMarkAllRead,
}: {
    notifications: Notification[];
    onClose: () => void;
    onMarkAllRead: () => void;
}) {
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <div className="absolute right-0 top-full z-[80] mt-3 w-80 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md sm:w-96">
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

            <div className="max-h-96 overflow-y-auto billing-scroll">
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
                        <div
                            key={notification.id}
                            className={[
                                "flex items-start gap-3 border-b border-slate-800/70 px-4 py-3 transition hover:bg-slate-800/40",
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
                                    {formatDateTime(notification.createdAt)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

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
                    : "border-slate-800 bg-slate-900/80 hover:border-yellow-400/40 hover:bg-slate-900",
            ].join(" ")}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                    <div
                        className={[
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition",
                            active
                                ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                                : "border-slate-700 bg-slate-950 text-slate-400 group-hover:border-yellow-400/30 group-hover:text-yellow-400",
                        ].join(" ")}
                    >
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p
                            className={[
                                "text-lg font-black uppercase tracking-wider",
                                active ? "text-yellow-400" : "text-white",
                            ].join(" ")}
                        >
                            {title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p
                        className={[
                            "text-2xl font-black sm:text-3xl",
                            active ? "text-yellow-400" : "text-white",
                        ].join(" ")}
                    >
                        {count}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
            base: "border-slate-800 bg-slate-900/80 hover:border-slate-700",
            active: "border-slate-400/40 bg-slate-400/[0.08] shadow-lg shadow-slate-400/5",
            iconBase: "text-slate-500",
            iconActive: "text-slate-200",
            valueBase: "text-white",
            valueActive: "text-slate-100",
            dot: "bg-slate-400",
        },
        yellow: {
            base: "border-slate-800 bg-slate-900/80 hover:border-yellow-400/40",
            active: "border-yellow-400/50 bg-yellow-400/[0.08] shadow-lg shadow-yellow-400/5",
            iconBase: "text-slate-500",
            iconActive: "text-yellow-400",
            valueBase: "text-white",
            valueActive: "text-yellow-300",
            dot: "bg-yellow-400",
        },
        orange: {
            base: "border-slate-800 bg-slate-900/80 hover:border-orange-400/40",
            active: "border-orange-400/50 bg-orange-400/[0.08] shadow-lg shadow-orange-400/5",
            iconBase: "text-slate-500",
            iconActive: "text-orange-400",
            valueBase: "text-white",
            valueActive: "text-orange-300",
            dot: "bg-orange-400",
        },
        emerald: {
            base: "border-slate-800 bg-slate-900/80 hover:border-emerald-400/40",
            active: "border-emerald-400/50 bg-emerald-400/[0.08] shadow-lg shadow-emerald-400/5",
            iconBase: "text-slate-500",
            iconActive: "text-emerald-400",
            valueBase: "text-white",
            valueActive: "text-emerald-300",
            dot: "bg-emerald-400",
        },
        red: {
            base: "border-slate-800 bg-slate-900/80 hover:border-red-400/40",
            active: "border-red-400/50 bg-red-400/[0.08] shadow-lg shadow-red-400/5",
            iconBase: "text-slate-500",
            iconActive: "text-red-400",
            valueBase: "text-white",
            valueActive: "text-red-300",
            dot: "bg-red-400",
        },
        blue: {
            base: "border-slate-800 bg-slate-900/80 hover:border-blue-400/40",
            active: "border-blue-400/50 bg-blue-400/[0.08] shadow-lg shadow-blue-400/5",
            iconBase: "text-slate-500",
            iconActive: "text-blue-400",
            valueBase: "text-white",
            valueActive: "text-blue-300",
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
                    active ? "text-slate-300" : "text-slate-500",
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
    onGenerate,
    isGenerating,
    hideAmount,
    onToggleHideAmount,
}: {
    jobOrders: JobOrder[];
    onView: (jobOrder: JobOrder) => void;
    onGenerate: (jobOrder: JobOrder) => void;
    isGenerating: boolean;
    hideAmount: boolean;
    onToggleHideAmount: () => void;
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
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-slate-800 bg-slate-950/70">
                    <th className="w-[11%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Job Order
                    </th>
                    <th className="w-[16%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Client
                    </th>
                    <th className="w-[15%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Project
                    </th>
                    <th className="w-[14%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Equipment
                    </th>
                    <th className="w-[12%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Service Date
                    </th>
                    <th className="w-[10%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Amount
                    </th>
                    <th className="w-[9%] px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Status
                    </th>
                    <th className="w-[13%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Action
                    </th>
                </tr>
            </thead>
            <tbody>
                {jobOrders.map((jobOrder) => {
                    const generated = isJobOrderGenerated(jobOrder);
                    const status = String(jobOrder.status ?? "");
                    const canGenerate =
                        !generated &&
                        !["Generated", "Pending Admin Approval"].includes(
                            status,
                        ) &&
                        ["Pending", "Received"].includes(status);
                    return (
                        <tr
                            key={jobOrder.id}
                            className="border-b border-slate-800/70 transition hover:bg-yellow-400/[0.025]"
                        >
                            <td className="px-3 py-3 align-top">
                                <button
                                    type="button"
                                    onClick={() => onView(jobOrder)}
                                    className="text-left"
                                >
                                    <p className="truncate text-xs font-black text-white hover:text-yellow-400">
                                        {getJobOrderNumber(jobOrder)}
                                    </p>
                                    {jobOrder.invoiceNumber && (
                                        <p className="mt-0.5 truncate text-[10px] text-emerald-400">
                                            {jobOrder.invoiceNumber}
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
                                        <p className="truncate text-[11px] font-semibold text-slate-200">
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
                                <p className="truncate text-[11px] text-slate-300">
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
                                <p className="truncate text-[11px] text-slate-300">
                                    {jobOrder.equipment ?? "—"}
                                </p>
                                {jobOrder.operator && (
                                    <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                        Operator: {jobOrder.operator}
                                    </p>
                                )}
                            </td>

                            <td className="px-3 py-3 align-top">
                                <div className="flex items-start gap-1.5">
                                    <CalendarDays
                                        size={12}
                                        className="mt-0.5 shrink-0 text-slate-600"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] text-slate-300">
                                            {formatDate(jobOrder.startDate)}
                                        </p>
                                        {jobOrder.endDate && (
                                            <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                                to{" "}
                                                {formatDate(jobOrder.endDate)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>

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
                                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 transition hover:text-yellow-400"
                                    >
                                        {hideAmount ? (
                                            <EyeOff size={12} />
                                        ) : (
                                            <Eye size={12} />
                                        )}
                                    </button>
                                    <p className="truncate text-xs font-black text-white">
                                        {money(
                                            getJobOrderAmount(jobOrder),
                                            hideAmount,
                                        )}
                                    </p>
                                </div>
                            </td>

                            <td className="px-3 py-3 text-center align-top">
                                <StatusBadge
                                    status={
                                        generated ||
                                        String(jobOrder.status ?? "").toLowerCase() ===
                                            "pending admin approval"
                                            ? "Generated"
                                            : (jobOrder.status ?? "Pending")
                                    }
                                />
                            </td>

                            <td className="px-3 py-3 align-top">
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onView(jobOrder)}
                                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-700 px-2 text-[10px] font-bold text-slate-300 transition hover:border-yellow-400/40 hover:bg-slate-800 hover:text-yellow-400"
                                    >
                                        <Eye size={12} />
                                        View
                                    </button>
                                    {canGenerate ? (
                                        <button
                                            type="button"
                                            disabled={isGenerating}
                                            onClick={() => onGenerate(jobOrder)}
                                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-yellow-400 px-2 text-[10px] font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <RefreshCw
                                                        size={12}
                                                        className="animate-spin"
                                                    />
                                                    ...
                                                </>
                                            ) : (
                                                <>
                                                    <Receipt size={12} />
                                                    Submit
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-2 text-[10px] font-bold text-emerald-400">
                                            <CheckCircle2 size={12} />
                                            Generated
                                        </span>
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
    onView,
    onPrint,
    onDownload,
    onSendEmail,
    isSendingEmail,
    hideAmount,
    onToggleHideAmount,
}: {
    invoices: Invoice[];
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
                icon={<FileText size={28} />}
                title="No Invoices Found"
                description="Invoices will appear here once Admin approves your Job Orders."
            />
        );
    }

    return (
        <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-slate-800 bg-slate-950/70">
                    <th className="w-[11%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Invoice
                    </th>
                    <th className="w-[10%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Job Order
                    </th>
                    <th className="w-[16%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Client
                    </th>
                    <th className="w-[15%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Project
                    </th>
                    <th className="w-[11%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Amount
                    </th>
                    <th className="w-[10%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Due Date
                    </th>
                    <th className="w-[10%] px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Status
                    </th>
                    <th className="w-[17%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody>
                {invoices.map((invoice) => (
                    <tr
                        key={invoice.id}
                        className="border-b border-slate-800/70 transition hover:bg-yellow-400/[0.025]"
                    >
                        <td className="px-3 py-3 align-top">
                            <button
                                type="button"
                                onClick={() => onView(invoice)}
                                className="text-left"
                            >
                                <p className="truncate text-xs font-black text-white hover:text-yellow-400">
                                    {invoice.number}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-slate-600">
                                    {formatDate(invoice.createdAt)}
                                </p>
                            </button>
                        </td>

                        <td className="px-3 py-3 align-top">
                            {invoice.jobOrderId ? (
                                <span className="inline-flex rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                                    JO-{invoice.jobOrderId}
                                </span>
                            ) : (
                                <span className="text-[10px] text-slate-600">
                                    —
                                </span>
                            )}
                        </td>

                        <td className="px-3 py-3 align-top">
                            <p className="truncate text-[11px] font-semibold text-slate-200">
                                {invoice.client}
                            </p>
                            {invoice.clientEmail && (
                                <p
                                    className={[
                                        "mt-0.5 truncate text-[10px]",
                                        invoice.status === "Approved"
                                            ? "text-emerald-400"
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
                            <p className="truncate text-[11px] text-slate-300">
                                {invoice.project}
                            </p>
                        </td>

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
                                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 transition hover:text-yellow-400"
                                >
                                    {hideAmount ? (
                                        <EyeOff size={12} />
                                    ) : (
                                        <Eye size={12} />
                                    )}
                                </button>
                                <p className="truncate text-xs font-black text-white">
                                    {money(invoice.amount, hideAmount)}
                                </p>
                            </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                            <p className="truncate text-[11px] text-slate-300">
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
                ))}
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
                    aria-label={`Actions for ${invoice.number}`}
                    aria-expanded={open}
                    className={[
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                        "border border-slate-700 bg-slate-950 text-slate-400",
                        "transition-all duration-200",
                        "hover:border-yellow-400/40 hover:bg-slate-800 hover:text-yellow-400",
                        open
                            ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400"
                            : "",
                    ].join(" ")}
                >
                    <MoreVertical size={14} />
                </button>
            </div>
            {open && (
                <div
                    ref={menuRef}
                    className="fixed z-[9999] w-48 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50"
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
                            className="text-blue-400 hover:bg-blue-400/10"
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
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-300 transition hover:bg-yellow-400/10 hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            ].join(" ")}
        >
            {icon} {label}
        </button>
    );
}

function StatusBadge({ status }: { status: string }) {
    const normalized = status.toLowerCase();
    let classes = "border-slate-700 bg-slate-800/60 text-slate-300";

    const statusMap: Record<string, string> = {
        pending: "border-yellow-400/20 bg-yellow-400/10 text-yellow-400",
        partial: "border-orange-400/20 bg-orange-400/10 text-orange-400",
        paid: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
        overdue: "border-red-400/20 bg-red-400/10 text-red-400",
        rejected: "border-red-400/20 bg-red-400/10 text-red-400",
        approved: "border-blue-400/20 bg-blue-400/10 text-blue-400",
        generated: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
        // ✅ Ituring na Generated ang "Pending Admin Approval"
        "pending admin approval":
            "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
    };

    classes = statusMap[normalized] || classes;

    // ✅ Ipakita as "Generated" kapag "Pending Admin Approval"
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
    const generated = isJobOrderGenerated(jobOrder);

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-yellow-400/10 bg-slate-950/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                            Job Order Number
                        </p>
                        <p className="mt-1 text-2xl font-black text-yellow-400">
                            {getJobOrderNumber(jobOrder)}
                        </p>
                    </div>
                    <StatusBadge
                        status={
                            generated ||
                            String(jobOrder.status ?? "").toLowerCase() ===
                                "pending admin approval"
                                ? "Generated"
                                : (jobOrder.status ?? "Pending")
                        }
                    />
                </div>
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
                <DetailBox
                    label="Amount"
                    value={money(getJobOrderAmount(jobOrder), hideAmount)}
                    highlight
                />
                <DetailBox
                    label="Invoice"
                    value={
                        jobOrder.invoiceNumber ??
                        jobOrder.invoice?.number ??
                        "Not generated"
                    }
                    highlight={Boolean(
                        jobOrder.invoiceNumber ?? jobOrder.invoice?.number,
                    )}
                />
            </div>

            {jobOrder.rejectionReason && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <Ban size={20} className="mt-0.5 text-red-400" />
                        <div>
                            <p className="font-bold text-red-400">
                                Rejection Reason
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                                {jobOrder.rejectionReason}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {jobOrder.description && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {jobOrder.description}
                    </p>
                </div>
            )}

            {jobOrder.notes && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {jobOrder.notes}
                    </p>
                </div>
            )}

            {jobOrder.generatedAt && (
                <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <CheckCircle2
                            size={20}
                            className="mt-0.5 text-emerald-400"
                        />
                        <div>
                            <p className="font-bold text-emerald-400">
                                Job Order Submitted
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
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

    const isApproved = invoice.status === "Approved";

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-yellow-400/10 bg-slate-950/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                            {invoiceType}
                        </p>
                        <p className="mt-1 text-2xl font-black text-yellow-400">
                            {invoice.number}
                        </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                </div>
            </div>

            {invoice.sentAt && (
                <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
                    <div className="flex items-start gap-3">
                        <Mail size={20} className="mt-0.5 text-blue-400" />
                        <div>
                            <p className="font-bold text-blue-400">
                                Sent to Client
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
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
                        <CheckCircle2                            size={20}
                            className="mt-0.5 text-blue-400"
                        />
                        <div>
                            <p className="font-bold text-blue-400">
                                Invoice Approved
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
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

            <div className="overflow-hidden rounded-2xl border border-slate-800">
                <div className="border-b border-slate-800 bg-slate-950 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        {invoiceType} Items
                    </p>
                </div>

                <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-950/50 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
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

                <div className="border-t border-slate-800 bg-slate-950/50 px-5 py-4">
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

                        {withholdingTax > 0 && (
                            <div className="flex items-center justify-between border-t border-slate-800/50 pt-3">
                                <span className="font-bold uppercase tracking-wide text-orange-400">
                                    Withholding Tax
                                </span>
                                <span className="text-lg font-bold text-orange-400">
                                    - {money(withholdingTax, hideAmount)}
                                </span>
                            </div>
                        )}

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

            {invoice.description && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                        {invoice.description}
                    </p>
                </div>
            )}

            {invoice.notes && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Notes
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
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
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-600">
                {icon}
            </div>
            <h3 className="mt-5 text-lg font-black uppercase tracking-wide text-slate-300">
                {title}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                {description}
            </p>
        </div>
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
                    "w-full overflow-hidden rounded-3xl border border-yellow-400/10 bg-slate-900 shadow-2xl",
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

    const invoiceType = invoice.items.some(
        (item) =>
            item.description?.toLowerCase().includes("equipment") ||
            item.description?.toLowerCase().includes("logistics") ||
            item.description?.toLowerCase().includes("service"),
    )
        ? "Service Invoice"
        : "Sales Invoice";

    return (
        <div className="bg-white p-8 text-slate-900 sm:p-12">
            <div className="border-b-4 border-slate-900 pb-6">
                <div className="flex items-start justify-between gap-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-wide">
                            ALIBATON
                        </h1>
                        <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-600">
                            Heavy Equipment & Logistics
                        </p>
                        <p className="mt-3 text-xs text-slate-500">
                            Quezon City, Metro Manila
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            VAT Reg. TIN: 123-456-789-000
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {invoiceType}
                        </p>
                        <p className="mt-1 text-2xl font-black">
                            {invoice.number}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            Date: {formatDate(invoice.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Due: {formatDate(invoice.dueDate)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-8">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                    <div className="flex justify-between py-4 border-t-2 border-slate-900">
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

            <div className="mt-12 border-t-2 border-slate-900 pt-5">
                <div className="flex items-end justify-between gap-8">
                    <div>
                        <p className="text-xs font-bold">ALIBATON</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Heavy Equipment & Logistics Management System
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
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