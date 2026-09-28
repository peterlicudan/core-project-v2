import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";

import {
    MoreVertical,
    CheckCircle2,
    Clock3,
    X,
    CreditCard,
    Receipt,
    Building2,
    AlertCircle,
    WalletCards,
    Search,
    ChevronDown,
    Check,
    Mail,
    Send,
    FileText,
    Archive,
    RotateCcw,
    CalendarClock,
    Timer,
    ShieldCheck,
    Printer,
    Eye,
    Banknote,
    Hash,
    CircleDollarSign,
    Edit2,
    Save,
} from "lucide-react";

import AdminSidebar from "../../Components/Admin/AdminSidebar";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PaymentStatus =
    | "Paid"
    | "Partial"
    | "Pending"
    | "Rejected"
    | "Due"
    | string;

interface ArchiveInfo {
    expiration?: string | null;
    deleteDate?: string | null;
    expired?: boolean;
    readyForDeletion?: boolean;
    daysUntilExpiration?: number | null;
}

interface Payment {
    id: number;

    receipt_number?: string | null;
    invoice_number?: string | null;
    payment_method?: string | null;
    payment_date?: string | null;
    due_date?: string | null;

    user_id?: number | null;

    updated_by?: number | string | null;
    edited_by?: number | string | null;
    edited_at?: string | null;

    receipt?: string | null;
    invoice?: string | null;
    method?: string | null;

    paymentDate?: string | null;
    dueDate?: string | null;

    userId?: number | null;

    updatedBy?: string | null;
    updatedByEmail?: string | null;

    editedBy?: string | null;
    editedByEmail?: string | null;

    editedAt?: string | null;

    client?: string | null;
    clientEmail?: string | null; // Added

    userName?: string | null;
    userEmail?: string | null;
    userRole?: string | null;

    amount?: number | string | null;

    status?: PaymentStatus | null;

    notes?: string | null;

    invoiceId?: number | null;
    invoiceAmount?: number | null;
    invoiceStatus?: string | null;

    archived?: boolean;

    archivedAt?: string | null;

    archiveExpiresAt?: string | null;

    deleteAfter?: string | null;

    archiveExpired?: boolean;

    readyForDeletion?: boolean;

    daysUntilExpiration?: number | null;

    archiveInfo?: ArchiveInfo | null;
}

interface Props {
    payments?: Payment[];
    paymentMethods?: string[];
    paymentStatuses?: string[];
    flash?: {
        success?: string;
        error?: string;
    };
}

/*
|--------------------------------------------------------------------------
| DEFAULT OPTIONS
|--------------------------------------------------------------------------
*/

const PAYMENT_METHODS = ["Bank Transfer", "Cheque"];

const STATUS_OPTIONS = ["Pending", "Paid", "Partial"];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const ACTIVE_STATUS_FILTERS = ["All", "Pending", "Partial", "Due", "Paid"];

function getReceipt(payment: Payment) {
    return (
        payment.receipt_number ??
        payment.receipt ??
        `PAY-${String(payment.id).padStart(4, "0")}`
    );
}

function getInvoice(payment: Payment) {
    return payment.invoice_number ?? payment.invoice ?? "No invoice";
}

function getMethod(payment: Payment) {
    return payment.payment_method ?? payment.method ?? "—";
}

function getPaymentDate(payment: Payment) {
    return payment.payment_date ?? payment.paymentDate ?? "—";
}

function getDueDate(payment: Payment) {
    return payment.due_date ?? payment.dueDate ?? "";
}

function getClientName(payment: Payment) {
    return (
        payment.client?.trim() ||
        payment.userName?.trim() ||
        payment.userEmail?.trim() ||
        "Unknown Client"
    );
}

function getClientEmail(payment: Payment) {
    return payment.clientEmail ?? null;
}

function getStatus(payment: Payment) {
    return payment.status ?? "Pending";
}

function normalizeDate(value?: string | null) {
    if (!value) {
        return "";
    }

    return String(value).substring(0, 10);
}

function isArchived(payment: Payment) {
    return Boolean(payment.archived);
}

function getInvoiceTotal(payment: Payment) {
    const invoiceAmount = Number(payment.invoiceAmount ?? 0);

    if (Number.isFinite(invoiceAmount) && invoiceAmount > 0) {
        return invoiceAmount;
    }

    const amount = Number(payment.amount ?? 0);

    return Number.isFinite(amount) ? amount : 0;
}

function getPartialAmount(payment: Payment) {
    const invoiceTotal = getInvoiceTotal(payment);

    return invoiceTotal / 2;
}

function formatDateReadable(value?: string | null) {
    if (!value || value === "—") {
        return "—";
    }

    const normalized = String(value).substring(0, 10);

    const date = new Date(`${normalized}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return normalized;
    }

    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
}

function formatShortDate(value?: string | null) {
    if (!value || value === "—") {
        return "—";
    }

    const normalized = String(value).substring(0, 10);

    const date = new Date(`${normalized}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return normalized;
    }

    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function Payments({
    payments = [],
    paymentMethods = PAYMENT_METHODS,
    paymentStatuses = STATUS_OPTIONS,
}: Props) {
    /*
    |--------------------------------------------------------------------------
    | SIDEBAR
    |--------------------------------------------------------------------------
    */

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | SEARCH / FILTER
    |--------------------------------------------------------------------------
    */

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] = useState("All");

    const [viewMode, setViewMode] = useState<"active" | "archive">("active");

    /*
    |--------------------------------------------------------------------------
    | ACTION MENU
    |--------------------------------------------------------------------------
    */

    const [openMenu, setOpenMenu] = useState<number | null>(null);

    const [menuPosition, setMenuPosition] = useState({
        top: 0,
        left: 0,
    });

    /*
    |--------------------------------------------------------------------------
    | SELECTED PAYMENT
    |--------------------------------------------------------------------------
    */

    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(
        null,
    );

    /*
    |--------------------------------------------------------------------------
    | MODALS
    |--------------------------------------------------------------------------
    */

    const [showEmailModal, setShowEmailModal] = useState(false);

    const [showRestoreModal, setShowRestoreModal] = useState(false);

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [showPartialModal, setShowPartialModal] = useState(false);

    const [showPaidModal, setShowPaidModal] = useState(false);

    const [showViewModal, setShowViewModal] = useState(false);

    // ✅ Edit modal only (no Add)
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | EMAIL
    |--------------------------------------------------------------------------
    */

    const [emailSending, setEmailSending] = useState(false);

    const [emailForm, setEmailForm] = useState({
        email: "",
        subject: "",
        message: "",
    });

    /*
    |--------------------------------------------------------------------------
    | PARTIAL CONFIRMATION
    |--------------------------------------------------------------------------
    */

    const [partialAmount, setPartialAmount] = useState(0);

    /*
    |--------------------------------------------------------------------------
    | FULLY PAID CONFIRMATION
    |--------------------------------------------------------------------------
    */

    const [paidProcessing, setPaidProcessing] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | EDIT PAYMENT FORM
    |--------------------------------------------------------------------------
    */

    const [paymentForm, setPaymentForm] = useState({
        client: "",
        invoice_number: "",
        receipt_number: "",
        payment_method: "Bank Transfer",
        amount: "",
        status: "Pending",
        payment_date: "",
        due_date: "",
        notes: "",
    });

    /*
    |--------------------------------------------------------------------------
    | CURRENCY
    |--------------------------------------------------------------------------
    */

    const formatCurrency = (value: number | string | null | undefined) => {
        const amount = Number(value ?? 0);

        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        }).format(Number.isFinite(amount) ? amount : 0);
    };

    /*
    |--------------------------------------------------------------------------
    | ACTIVE / ARCHIVED
    |--------------------------------------------------------------------------
    */

    const activePayments = useMemo(
        () => payments.filter((payment) => !isArchived(payment)),
        [payments],
    );

    const archivedPayments = useMemo(
        () => payments.filter((payment) => isArchived(payment)),
        [payments],
    );

    /*
    |--------------------------------------------------------------------------
    | FILTER
    |--------------------------------------------------------------------------
    */

    const filteredPayments = useMemo(() => {
        const source =
            viewMode === "archive" ? archivedPayments : activePayments;

        const keyword = search.trim().toLowerCase();

        return source.filter((payment) => {
            const client = getClientName(payment).toLowerCase();

            const receipt = getReceipt(payment).toLowerCase();

            const invoice = getInvoice(payment).toLowerCase();

            const method = getMethod(payment).toLowerCase();

            const status = getStatus(payment).toLowerCase();

            const email = String(payment.userEmail ?? "").toLowerCase();
            const clientEmail = String(payment.clientEmail ?? "").toLowerCase();

            const matchesSearch =
                !keyword ||
                client.includes(keyword) ||
                receipt.includes(keyword) ||
                invoice.includes(keyword) ||
                method.includes(keyword) ||
                status.includes(keyword) ||
                email.includes(keyword) ||
                clientEmail.includes(keyword);

            const matchesStatus =
                statusFilter === "All" || getStatus(payment) === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [
        payments,
        activePayments,
        archivedPayments,
        search,
        statusFilter,
        viewMode,
    ]);

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    const summary = useMemo(() => {
        const active = activePayments;

        const sum = (records: Payment[]) =>
            records.reduce(
                (total, payment) => total + Number(payment.amount ?? 0),
                0,
            );

        const paidRecords = active.filter(
            (payment) => getStatus(payment) === "Paid",
        );

        const pendingRecords = active.filter(
            (payment) => getStatus(payment) === "Pending",
        );

        const partialRecords = active.filter(
            (payment) => getStatus(payment) === "Partial",
        );

        const dueRecords = active.filter(
            (payment) => getStatus(payment) === "Due",
        );

        const outstandingRecords = active.filter((payment) =>
            ["Pending", "Partial", "Due"].includes(getStatus(payment)),
        );

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const weekEnd = new Date(today);

        weekEnd.setDate(weekEnd.getDate() + 7);

        const dueThisWeekRecords = outstandingRecords.filter((payment) => {
            const raw = getDueDate(payment);

            if (!raw) {
                return false;
            }

            const due = new Date(String(raw));

            if (Number.isNaN(due.getTime())) {
                return false;
            }

            due.setHours(0, 0, 0, 0);

            return due >= today && due <= weekEnd;
        });

        return {
            total: sum(active),
            outstanding: sum(outstandingRecords),
            outstandingCount: outstandingRecords.length,
            dueThisWeek: sum(dueThisWeekRecords),
            dueThisWeekCount: dueThisWeekRecords.length,
            collected: sum(paidRecords),
            paidCount: paidRecords.length,
            pending: sum(pendingRecords),
            partial: sum(partialRecords),
            due: sum(dueRecords),
            count: payments.length,
            activeCount: activePayments.length,
            archiveCount: archivedPayments.length,
            archiveValue: sum(archivedPayments),
        };
    }, [payments, activePayments, archivedPayments]);

    /*
    |--------------------------------------------------------------------------
    | MENU
    |--------------------------------------------------------------------------
    */

    const toggleMenu = (
        event: React.MouseEvent<HTMLButtonElement>,
        paymentId: number,
    ) => {
        event.stopPropagation();

        if (openMenu === paymentId) {
            setOpenMenu(null);
            return;
        }

        const payment = payments.find((item) => item.id === paymentId);

        if (!payment) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();

        const menuWidth = 230;

        let left = rect.right - menuWidth;

        let top = rect.bottom + 8;

        if (left < 10) {
            left = 10;
        }

        if (left + menuWidth > window.innerWidth - 10) {
            left = window.innerWidth - menuWidth - 10;
        }

        const archived = Boolean(payment.archived);

        const paid = getStatus(payment) === "Paid";

        const partial = getStatus(payment) === "Partial";

        const menuHeight = archived ? 220 : paid ? 190 : partial ? 170 : 280;

        if (top + menuHeight > window.innerHeight - 10) {
            top = rect.top - menuHeight - 8;
        }

        if (top < 10) {
            top = 10;
        }

        setMenuPosition({
            top,
            left,
        });

        setOpenMenu(paymentId);
    };

    /*
    |--------------------------------------------------------------------------
    | VIEW
    |--------------------------------------------------------------------------
    */

    const openView = (payment: Payment) => {
        setOpenMenu(null);
        setSelectedPayment(payment);
        setShowViewModal(true);
    };

    const closeView = () => {
        setShowViewModal(false);
        setSelectedPayment(null);
    };

    /*
    |--------------------------------------------------------------------------
    | EDIT PAYMENT
    |--------------------------------------------------------------------------
    */

    const openEditPayment = (payment: Payment) => {
        setSelectedPayment(payment);
        setPaymentForm({
            client: payment.client || "",
            invoice_number: payment.invoice_number || "",
            receipt_number: payment.receipt_number || "",
            payment_method: payment.payment_method || "Bank Transfer",
            amount: String(payment.amount || ""),
            status: payment.status || "Pending",
            payment_date: normalizeDate(payment.payment_date),
            due_date: normalizeDate(payment.due_date),
            notes: payment.notes || "",
        });
        setShowEditModal(true);
    };

    const closeEditPayment = () => {
        if (isSubmitting) return;
        setShowEditModal(false);
        setSelectedPayment(null);
        resetPaymentForm();
    };

    const submitEditPayment = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPayment) {
            window.alert("No payment selected.");
            return;
        }

        const client = paymentForm.client.trim();
        const amount = Number(paymentForm.amount);

        if (!client) {
            window.alert("Please enter the client name.");
            return;
        }

        if (!paymentForm.amount || !Number.isFinite(amount) || amount <= 0) {
            window.alert("Please enter a valid amount.");
            return;
        }

        if (!paymentForm.payment_method) {
            window.alert("Please select a payment method.");
            return;
        }

        setIsSubmitting(true);

        router.put(
            `/admin/payments/${selectedPayment.id}`,
            {
                client: client,
                invoice_number: paymentForm.invoice_number.trim() || null,
                receipt_number: paymentForm.receipt_number.trim() || null,
                payment_method: paymentForm.payment_method,
                amount: paymentForm.amount,
                status: paymentForm.status || "Pending",
                payment_date: paymentForm.payment_date || null,
                due_date: paymentForm.due_date || null,
                notes: paymentForm.notes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSubmitting(false);
                    setShowEditModal(false);
                    setSelectedPayment(null);
                    setShowSuccessModal(true);
                    resetPaymentForm();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    console.error("EDIT PAYMENT ERROR:", errors);
                    const firstError = Object.values(errors ?? {})[0];
                    window.alert(
                        firstError
                            ? String(firstError)
                            : "Failed to update payment. Please try again.",
                    );
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const resetPaymentForm = () => {
        setPaymentForm({
            client: "",
            invoice_number: "",
            receipt_number: "",
            payment_method: "Bank Transfer",
            amount: "",
            status: "Pending",
            payment_date: "",
            due_date: "",
            notes: "",
        });
    };

    /*
    |--------------------------------------------------------------------------
    | EMAIL
    |--------------------------------------------------------------------------
    */

    const openEmailModal = (payment: Payment) => {
        setOpenMenu(null);

        setSelectedPayment(payment);

        setEmailForm({
            email: "",
            subject: `Payment Update - ${getReceipt(payment)}`,
            message: "",
        });

        setShowEmailModal(true);
    };

    const closeEmailModal = () => {
        if (emailSending) {
            return;
        }

        setShowEmailModal(false);
        setSelectedPayment(null);
        setEmailSending(false);

        setEmailForm({
            email: "",
            subject: "",
            message: "",
        });
    };

    const submitEmail = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPayment) {
            return;
        }

        const email = emailForm.email.trim();

        const subject = emailForm.subject.trim();

        const message = emailForm.message.trim();

        if (!email) {
            window.alert("Please enter the client's email address.");

            return;
        }

        if (!subject) {
            window.alert("Please enter an email subject.");

            return;
        }

        if (!message) {
            window.alert("Please enter a message.");

            return;
        }

        if (emailSending) {
            return;
        }

        setEmailSending(true);

        router.post(
            `/admin/payments/${selectedPayment.id}/notify`,
            {
                email,
                subject,
                message,
            },
            {
                preserveScroll: true,

                onSuccess: () => {
                    setShowEmailModal(false);
                    setSelectedPayment(null);
                    setEmailSending(false);
                    setShowSuccessModal(true);
                },

                onError: (errors) => {
                    console.error("Email sending failed:", errors);

                    setEmailSending(false);

                    window.alert(
                        "The email could not be sent. Please check your mail configuration and try again.",
                    );
                },

                onFinish: () => {
                    setEmailSending(false);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | OPEN FULLY PAID CONFIRMATION
    |--------------------------------------------------------------------------
    */

    const openApprove = (payment: Payment) => {
        setOpenMenu(null);

        if (payment.archived) {
            return;
        }

        if (getStatus(payment) === "Paid") {
            return;
        }

        setSelectedPayment(payment);
        setShowPaidModal(true);
    };

    const closePaidModal = () => {
        if (paidProcessing) {
            return;
        }

        setShowPaidModal(false);
        setSelectedPayment(null);
        setPaidProcessing(false);
    };

    /*
    |--------------------------------------------------------------------------
    | CONFIRM FULLY PAID
    |--------------------------------------------------------------------------
    */

    const confirmFullyPaid = () => {
        if (!selectedPayment) {
            return;
        }

        if (paidProcessing) {
            return;
        }

        setPaidProcessing(true);

        router.put(
            `/admin/payments/${selectedPayment.id}/verify`,
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setShowPaidModal(false);
                    setPaidProcessing(false);
                    setSelectedPayment(null);
                    setShowSuccessModal(true);
                },

                onError: (errors) => {
                    console.error("Fully paid failed:", errors);

                    setPaidProcessing(false);

                    window.alert("Unable to mark this payment as Fully Paid.");
                },

                onFinish: () => {
                    setPaidProcessing(false);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | PARTIAL
    |--------------------------------------------------------------------------
    */

    const openPartial = (payment: Payment) => {
        setOpenMenu(null);

        if (payment.archived) {
            return;
        }

        if (getStatus(payment) === "Paid") {
            return;
        }

        if (getStatus(payment) === "Partial") {
            window.alert("This payment is already marked as Partial.");
            return;
        }

        const half = getPartialAmount(payment);

        setSelectedPayment(payment);
        setPartialAmount(half);
        setShowPartialModal(true);
    };

    const closePartial = () => {
        setShowPartialModal(false);
        setSelectedPayment(null);
        setPartialAmount(0);
    };

    /*
    |--------------------------------------------------------------------------
    | CONFIRM PARTIAL
    |--------------------------------------------------------------------------
    */

    const confirmPartial = () => {
        if (!selectedPayment) {
            return;
        }

        if (partialAmount <= 0) {
            window.alert("The calculated partial payment amount is invalid.");

            return;
        }

        router.put(
            `/admin/payments/${selectedPayment.id}/partial`,
            {
                amount: partialAmount,
                payment_date: new Date().toISOString().substring(0, 10),
            },
            {
                preserveScroll: true,

                onSuccess: () => {
                    closePartial();
                    setShowSuccessModal(true);
                },

                onError: (errors) => {
                    console.error("Partial payment failed:", errors);

                    window.alert("Unable to mark this payment as Partial.");
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | RESTORE
    |--------------------------------------------------------------------------
    */

    const openRestore = (payment: Payment) => {
        setOpenMenu(null);

        if (!payment.archived) {
            return;
        }

        setSelectedPayment(payment);
        setShowRestoreModal(true);
    };

    const closeRestore = () => {
        setShowRestoreModal(false);
        setSelectedPayment(null);
    };

    const restorePayment = () => {
        if (!selectedPayment) {
            return;
        }

        router.put(
            `/admin/payments/${selectedPayment.id}/unarchive`,
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    closeRestore();
                },

                onError: (errors) => {
                    console.error("Restore failed:", errors);

                    window.alert("Unable to restore this payment record.");
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | PRINT
    |--------------------------------------------------------------------------
    */

    const printPayment = (payment: Payment) => {
        setOpenMenu(null);

        const receipt = getReceipt(payment);

        const invoice = getInvoice(payment);

        const client = getClientName(payment);

        const clientEmail = getClientEmail(payment);

        const amount = Number(payment.amount ?? 0);

        const invoiceTotal = getInvoiceTotal(payment);

        const remaining = Math.max(invoiceTotal - amount, 0);

        const status = getStatus(payment);

        const paymentDate = formatDateReadable(getPaymentDate(payment));

        const dueDate = formatDateReadable(getDueDate(payment));

        const method = getMethod(payment);

        const notes = payment.notes?.trim() || "No additional notes.";

        const printWindow = window.open("", "_blank", "width=900,height=1000");

        if (!printWindow) {
            window.alert("Please allow pop-ups to print the payment record.");

            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Statement of Account - ${escapeHtml(receipt)}</title>

                <style>
                    * {
                        box-sizing: border-box;
                    }

                    @page {
                        size: A4;
                        margin: 0;
                    }

                    body {
                        margin: 0;
                        padding: 0;
                        background: #f3f4f6;
                        color: #111827;
                        font-family:
                            Arial,
                            Helvetica,
                            sans-serif;
                    }

                    .page {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 20px auto;
                        background: #ffffff;
                        padding: 15mm;
                    }

                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        padding-bottom: 15px;
                        border-bottom: 2px solid #111827;
                    }

                    .brand {
                        display: flex;
                        gap: 12px;
                        align-items: center;
                    }

                    .logo {
                        width: 52px;
                        height: 52px;
                        border: 1px solid #d1d5db;
                        border-radius: 9px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 900;
                        font-size: 16px;
                        letter-spacing: 1px;
                    }

                    .company {
                        font-size: 22px;
                        font-weight: 900;
                        letter-spacing: 1px;
                    }

                    .company-sub {
                        margin-top: 3px;
                        font-size: 9px;
                        color: #6b7280;
                        letter-spacing: 1.5px;
                        text-transform: uppercase;
                    }

                    .document-title {
                        text-align: right;
                    }

                    .document-title h1 {
                        margin: 0;
                        font-size: 18px;
                        letter-spacing: .5px;
                    }

                    .document-title p {
                        margin: 5px 0 0;
                        font-size: 10px;
                        color: #6b7280;
                    }

                    .section {
                        margin-top: 18px;
                    }

                    .section-title {
                        margin-bottom: 7px;
                        font-size: 10px;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #4b5563;
                    }

                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        border: 1px solid #d1d5db;
                    }

                    .info-item {
                        padding: 9px 11px;
                        border-bottom: 1px solid #e5e7eb;
                    }

                    .info-item:nth-child(odd) {
                        border-right: 1px solid #e5e7eb;
                    }

                    .info-label {
                        font-size: 8px;
                        text-transform: uppercase;
                        letter-spacing: .7px;
                        color: #6b7280;
                        margin-bottom: 3px;
                    }

                    .info-value {
                        font-size: 11px;
                        font-weight: 700;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }

                    th {
                        background: #111827;
                        color: #ffffff;
                        text-align: left;
                        padding: 8px;
                        font-size: 9px;
                        text-transform: uppercase;
                        letter-spacing: .6px;
                    }

                    td {
                        padding: 9px 8px;
                        border: 1px solid #d1d5db;
                        font-size: 10px;
                    }

                    .amount {
                        text-align: right;
                        font-weight: 800;
                    }

                    .summary {
                        width: 48%;
                        margin-left: auto;
                        margin-top: 13px;
                    }

                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 6px 0;
                        font-size: 10px;
                        border-bottom: 1px solid #e5e7eb;
                    }

                    .summary-row.total {
                        padding-top: 10px;
                        border-bottom: 2px solid #111827;
                        font-size: 13px;
                        font-weight: 900;
                    }

                    .status {
                        display: inline-block;
                        padding: 4px 7px;
                        border: 1px solid #9ca3af;
                        border-radius: 4px;
                        font-size: 8px;
                        font-weight: 900;
                        text-transform: uppercase;
                    }

                    .notes {
                        min-height: 65px;
                        padding: 10px;
                        border: 1px solid #d1d5db;
                        font-size: 10px;
                        line-height: 1.5;
                    }

                    .signature {
                        margin-top: 45px;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 70px;
                    }

                    .signature-line {
                        padding-top: 6px;
                        border-top: 1px solid #111827;
                        text-align: center;
                        font-size: 9px;
                    }

                    .footer {
                        margin-top: 35px;
                        padding-top: 12px;
                        border-top: 1px solid #d1d5db;
                        display: flex;
                        justify-content: space-between;
                        font-size: 8px;
                        color: #6b7280;
                    }

                    @media print {
                        body {
                            background: #ffffff;
                        }

                        .page {
                            margin: 0;
                            width: 210mm;
                            min-height: 297mm;
                            box-shadow: none;
                        }
                    }
                </style>
            </head>

            <body>
                <div class="page">

                    <div class="header">
                        <div class="brand">
                            <div class="logo">
                                AL
                            </div>

                            <div>
                                <div class="company">
                                    ALIBATON
                                </div>

                                <div class="company-sub">
                                    Power • Precision • Reliability
                                </div>
                            </div>
                        </div>

                        <div class="document-title">
                            <h1>
                                STATEMENT OF ACCOUNT
                            </h1>

                            <p>
                                Official Payment Record
                            </p>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">
                            Client Information
                        </div>

                        <div class="info-grid">

                            <div class="info-item">
                                <div class="info-label">
                                    Client / Company
                                </div>

                                <div class="info-value">
                                    ${escapeHtml(client)}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    Invoice Number
                                </div>

                                <div class="info-value">
                                    ${escapeHtml(invoice)}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    Receipt Number
                                </div>

                                <div class="info-value">
                                    ${escapeHtml(receipt)}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    Payment Method
                                </div>

                                <div class="info-value">
                                    ${escapeHtml(method)}
                                </div>
                            </div>

                            <!-- ✅ CLIENT EMAIL - Added to print -->
                            <div class="info-item">
                                <div class="info-label">
                                    Client Email
                                </div>

                                <div class="info-value">
                                    ${escapeHtml(clientEmail || "N/A")}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    Payment Date
                                </div>

                                <div class="info-value">
                                    ${escapeHtml(paymentDate)}
                                </div>
                            </div>

                            <div class="info-item">
                                <div class="info-label">
                                    Due Date
                                </div>

                                <div class="info-value">
                                    ${escapeHtml(dueDate)}
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">
                            Payment Details
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        Description
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th style="text-align:right">
                                        Amount
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr>
                                    <td>
                                        Payment for invoice
                                        ${escapeHtml(invoice)}
                                    </td>

                                    <td>
                                        <span class="status">
                                            ${escapeHtml(status)}
                                        </span>
                                    </td>

                                    <td class="amount">
                                        ${formatCurrencyPrint(amount)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="summary">
                        <div class="summary-row">
                            <span>
                                Invoice Total
                            </span>

                            <strong>
                                ${formatCurrencyPrint(invoiceTotal)}
                            </strong>
                        </div>

                        <div class="summary-row">
                            <span>
                                Amount Paid
                            </span>

                            <strong>
                                ${formatCurrencyPrint(amount)}
                            </strong>
                        </div>

                        <div class="summary-row total">
                            <span>
                                Remaining Balance
                            </span>

                            <span>
                                ${formatCurrencyPrint(remaining)}
                            </span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">
                            Notes
                        </div>

                        <div class="notes">
                            ${escapeHtml(notes)}
                        </div>
                    </div>

                    <div class="signature">
                        <div class="signature-line">
                            Prepared / Verified By
                        </div>

                        <div class="signature-line">
                            Client / Authorized Representative
                        </div>
                    </div>

                    <div class="footer">
                        <span>
                            ALIBATON — Official Payment Record
                        </span>

                        <span>
                            Receipt: ${escapeHtml(receipt)}
                        </span>
                    </div>

                </div>

                <script>
                    window.onload = function () {
                        window.print();

                        setTimeout(function () {
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);

        printWindow.document.close();
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="Payment Management | ALIBATON" />

            <AdminSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((previous) => !previous)}
            />

            <main
                className={`
                    min-h-screen
                    overflow-x-hidden
                    bg-black
                    text-white
                    transition-[margin]
                    duration-300
                    ease-out
                    ${sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[280px]"}
                `}
            >
                <div
                    className="
                        mx-auto
                        w-full
                        max-w-[1700px]
                        px-3
                        pb-10
                        pt-20
                        sm:px-5
                        lg:px-8
                        lg:pt-8
                    "
                >
                    {/* HEADER */}

                    <div className="mb-6">
                        <div
                            className="
                                flex
                                flex-col
                                gap-4
                                lg:flex-row
                                lg:items-end
                                lg:justify-between
                            "
                        >
                            <div className="min-w-0">
                                <div
                                    className="
                                        mb-2
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-2
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                            border
                                            border-yellow-400/20
                                            bg-yellow-400/10
                                        "
                                    >
                                        <WalletCards
                                            size={20}
                                            className="text-yellow-400"
                                        />
                                    </div>

                                    <span
                                        className="
                                            text-[10px]
                                            font-black
                                            uppercase
                                            tracking-[0.22em]
                                            text-yellow-400
                                            sm:text-xs
                                        "
                                    >
                                        Finance
                                    </span>
                                </div>

                                <h1
                                    className="
                                        text-2xl
                                        font-black
                                        tracking-tight
                                        sm:text-3xl
                                        lg:text-4xl
                                    "
                                >
                                    Payment Management
                                </h1>

                                <p
                                    className="
                                        mt-2
                                        max-w-3xl
                                        text-sm
                                        leading-6
                                        text-gray-400
                                    "
                                >
                                    Review, verify and manage all staff and
                                    client payment records.
                                </p>
                            </div>

                            <div
                                className="
                                    w-full
                                    rounded-2xl
                                    border
                                    border-white/10
                                    bg-white/[0.04]
                                    px-4
                                    py-3
                                    sm:w-auto
                                "
                            >
                                <div
                                    className="
                                        text-[10px]
                                        uppercase
                                        tracking-wider
                                        text-gray-500
                                    "
                                >
                                    Total Records
                                </div>

                                <div
                                    className="
                                        mt-1
                                        text-xl
                                        font-black
                                        text-yellow-400
                                    "
                                >
                                    {summary.count}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUMMARY */}

                    <div
                        className="
                            mb-5
                            grid
                            grid-cols-2
                            gap-3
                            xl:grid-cols-5
                        "
                    >
                        <SummaryCard
                            title="Total"
                            value={formatCurrency(summary.total)}
                            icon={<Receipt size={18} />}
                        />

                        <SummaryCard
                            title="Paid"
                            value={formatCurrency(summary.collected)}
                            icon={<CheckCircle2 size={18} />}
                            iconClass="text-emerald-400"
                        />

                        <SummaryCard
                            title="Pending"
                            value={formatCurrency(summary.pending)}
                            icon={<Clock3 size={18} />}
                            iconClass="text-yellow-400"
                        />

                        <SummaryCard
                            title="Partial"
                            value={formatCurrency(summary.partial)}
                            icon={<CreditCard size={18} />}
                            iconClass="text-blue-400"
                        />

                        <SummaryCard
                            title="Archived"
                            value={String(summary.archiveCount)}
                            icon={<Archive size={18} />}
                            iconClass="text-purple-400"
                        />
                    </div>

                    {/* VIEW TABS */}

                    <div
                        className="
                            mb-5
                            flex
                            flex-col
                            gap-2
                            rounded-2xl
                            border
                            border-white/10
                            bg-white/[0.035]
                            p-2
                            sm:flex-row
                        "
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode("active");
                                setStatusFilter("All");
                            }}
                            className={`
                                flex
                                flex-1
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                px-4
                                py-3
                                text-sm
                                font-bold
                                transition
                                ${
                                    viewMode === "active"
                                        ? "bg-yellow-400 text-black"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }
                            `}
                        >
                            <WalletCards size={16} />
                            Active Payments
                            <span
                                className={`
                                    rounded-full
                                    px-2
                                    py-0.5
                                    text-[10px]
                                    ${
                                        viewMode === "active"
                                            ? "bg-black/15 text-black"
                                            : "bg-white/10 text-gray-400"
                                    }
                                `}
                            >
                                {summary.activeCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setViewMode("archive");
                                setStatusFilter("All");
                            }}
                            className={`
                                flex
                                flex-1
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                px-4
                                py-3
                                text-sm
                                font-bold
                                transition
                                ${
                                    viewMode === "archive"
                                        ? "bg-yellow-400 text-black"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }
                            `}
                        >
                            <Archive size={16} />
                            Payment Archive
                            <span
                                className={`
                                    rounded-full
                                    px-2
                                    py-0.5
                                    text-[10px]
                                    ${
                                        viewMode === "archive"
                                            ? "bg-black/15 text-black"
                                            : "bg-white/10 text-gray-400"
                                    }
                                `}
                            >
                                {summary.archiveCount}
                            </span>
                        </button>
                    </div>

                    {/* ARCHIVE INFO */}

                    {viewMode === "archive" && (
                        <div
                            className="
                                mb-5
                                rounded-2xl
                                border
                                border-yellow-400/15
                                bg-yellow-400/[0.04]
                                p-4
                            "
                        >
                            <div className="flex gap-3">
                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-yellow-400/10
                                        text-yellow-400
                                    "
                                >
                                    <Archive size={18} />
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        Payment Archive
                                    </h3>

                                    <p className="mt-1 text-xs leading-5 text-gray-400">
                                        Archived payment records remain
                                        available for review. Archived records
                                        are read-only.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FILTER */}

                    <div
                        className="
                            mb-5
                            rounded-2xl
                            border
                            border-white/10
                            bg-white/[0.035]
                            p-3
                            backdrop-blur-xl
                            sm:p-4
                        "
                    >
                        <div
                            className="
                                grid
                                grid-cols-1
                                gap-3
                                lg:grid-cols-[minmax(0,1fr)_220px]
                            "
                        >
                            <div className="relative min-w-0">
                                <Search
                                    size={17}
                                    className="
                                        pointer-events-none
                                        absolute
                                        left-3
                                        top-1/2
                                        -translate-y-1/2
                                        text-gray-500
                                    "
                                />

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search client, invoice, receipt, email..."
                                    className={`${inputClass} pl-10`}
                                />
                            </div>

                            <div className="relative min-w-0">
                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                    className="
                                        h-11
                                        w-full
                                        min-w-0
                                        appearance-none
                                        rounded-xl
                                        border
                                        border-white/10
                                        bg-black/40
                                        px-4
                                        pr-10
                                        text-sm
                                        text-white
                                        outline-none
                                        focus:border-yellow-400/50
                                    "
                                >
                                    <option value="All" className="bg-black">
                                        All Status
                                    </option>

                                    {ACTIVE_STATUS_FILTERS.filter(
                                        (status) => status !== "All",
                                    ).map((status) => (
                                        <option
                                            key={status}
                                            value={status}
                                            className="bg-black"
                                        >
                                            {status}
                                        </option>
                                    ))}
                                </select>

                                <ChevronDown
                                    size={16}
                                    className="
                                        pointer-events-none
                                        absolute
                                        right-3
                                        top-1/2
                                        -translate-y-1/2
                                        text-gray-500
                                    "
                                />
                            </div>
                        </div>
                    </div>

                    {/* RECORDS */}

                    <div
                        className="
                            overflow-hidden
                            rounded-2xl
                            border
                            border-white/10
                            bg-white/[0.035]
                            shadow-2xl
                            shadow-black/30
                        "
                    >
                        <div
                            className="
                                border-b
                                border-white/10
                                px-4
                                py-4
                                sm:px-5
                            "
                        >
                            <div
                                className="
                                    flex
                                    flex-col
                                    gap-2
                                    sm:flex-row
                                    sm:items-center
                                    sm:justify-between
                                "
                            >
                                <div>
                                    <h2 className="font-bold text-white">
                                        {viewMode === "archive"
                                            ? "Archived Payments"
                                            : "Active Payment Records"}
                                    </h2>

                                    <p
                                        className="
                                            mt-0.5
                                            text-xs
                                            text-gray-500
                                        "
                                    >
                                        {filteredPayments.length} record
                                        {filteredPayments.length !== 1
                                            ? "s"
                                            : ""}{" "}
                                        displayed
                                    </p>
                                </div>

                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        text-[10px]
                                        text-gray-500
                                    "
                                >
                                    <div
                                        className={`
                                            h-2
                                            w-2
                                            rounded-full
                                            ${
                                                viewMode === "archive"
                                                    ? "bg-purple-400"
                                                    : "bg-yellow-400"
                                            }
                                        `}
                                    />

                                    {viewMode === "archive"
                                        ? "Archive controls enabled"
                                        : "Admin controls enabled"}
                                </div>
                            </div>
                        </div>

                        {filteredPayments.length === 0 ? (
                            <EmptyState archive={viewMode === "archive"} />
                        ) : (
                            <div
                                className="
                                    max-h-[680px]
                                    overflow-y-auto
                                    overscroll-contain
                                    [&::-webkit-scrollbar]:w-1.5
                                    [&::-webkit-scrollbar-track]:bg-transparent
                                    [&::-webkit-scrollbar-thumb]:rounded-full
                                    [&::-webkit-scrollbar-thumb]:bg-yellow-400/20
                                    hover:[&::-webkit-scrollbar-thumb]:bg-yellow-400/40
                                "
                                onScroll={() => setOpenMenu(null)}
                            >
                                <div className="divide-y divide-white/[0.06]">
                                    {filteredPayments.map((payment) => (
                                        <PaymentRow
                                            key={payment.id}
                                            payment={payment}
                                            clientName={getClientName(payment)}
                                            isMenuOpen={openMenu === payment.id}
                                            onMenuClick={(event) =>
                                                toggleMenu(event, payment.id)
                                            }
                                            onApprove={() =>
                                                openApprove(payment)
                                            }
                                            onPartial={() =>
                                                openPartial(payment)
                                            }
                                            onView={() => openView(payment)}
                                            onEdit={() =>
                                                openEditPayment(payment)
                                            }
                                            onSendEmail={() =>
                                                openEmailModal(payment)
                                            }
                                            onPrint={() =>
                                                printPayment(payment)
                                            }
                                            onRestore={() =>
                                                openRestore(payment)
                                            }
                                            formatCurrency={formatCurrency}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* =========================================================
                FIXED ACTION MENU
            ========================================================= */}

            {openMenu !== null && (
                <>
                    <div
                        className="
                            fixed
                            inset-0
                            z-[9998]
                        "
                        onClick={() => setOpenMenu(null)}
                    />

                    {(() => {
                        const payment = payments.find(
                            (item) => item.id === openMenu,
                        );

                        if (!payment) {
                            return null;
                        }

                        const status = getStatus(payment);
                        const paid = status === "Paid";
                        const partial = status === "Partial";
                        const archived = Boolean(payment.archived);

                        return (
                            <div
                                className="
                                    fixed
                                    z-[9999]
                                    w-[230px]
                                    overflow-hidden
                                    rounded-2xl
                                    border
                                    border-white/10
                                    bg-[#101010]
                                    p-1.5
                                    shadow-2xl
                                    shadow-black/80
                                "
                                style={{
                                    top: menuPosition.top,
                                    left: menuPosition.left,
                                }}
                                onClick={(event) => event.stopPropagation()}
                            >
                                {!archived && (
                                    <>
                                        <MenuItem
                                            icon={<Eye size={16} />}
                                            label="View Payment"
                                            onClick={() => openView(payment)}
                                        />

                                        <MenuItem
                                            icon={<Edit2 size={16} />}
                                            label="Edit Payment"
                                            onClick={() =>
                                                openEditPayment(payment)
                                            }
                                            className="text-yellow-400 hover:bg-yellow-400/10"
                                        />

                                        {paid ? (
                                            <>
                                                <MenuItem
                                                    icon={<Mail size={16} />}
                                                    label="Send Payment Email"
                                                    onClick={() =>
                                                        openEmailModal(payment)
                                                    }
                                                />

                                                <MenuItem
                                                    icon={<Printer size={16} />}
                                                    label="Print Payment"
                                                    onClick={() =>
                                                        printPayment(payment)
                                                    }
                                                />

                                                <div className="my-1 border-t border-white/10" />

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-2
                                                        px-3
                                                        py-2
                                                        text-[11px]
                                                        font-semibold
                                                        text-emerald-400
                                                    "
                                                >
                                                    <ShieldCheck size={15} />
                                                    Fully Paid
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <MenuItem
                                                    icon={
                                                        <CheckCircle2
                                                            size={16}
                                                        />
                                                    }
                                                    label="Mark Fully Paid"
                                                    onClick={() =>
                                                        openApprove(payment)
                                                    }
                                                    className="text-emerald-400 hover:bg-emerald-400/10"
                                                />

                                                {!partial && (
                                                    <MenuItem
                                                        icon={
                                                            <CreditCard
                                                                size={16}
                                                            />
                                                        }
                                                        label="Mark Partial Payment"
                                                        onClick={() =>
                                                            openPartial(payment)
                                                        }
                                                        className="text-blue-400 hover:bg-blue-400/10"
                                                    />
                                                )}

                                                {partial && (
                                                    <div
                                                        className="
                                                            flex
                                                            items-center
                                                            gap-2
                                                            px-3
                                                            py-2
                                                            text-[11px]
                                                            font-semibold
                                                            text-blue-400
                                                        "
                                                    >
                                                        <CreditCard size={15} />
                                                        Already Partial
                                                    </div>
                                                )}

                                                <MenuItem
                                                    icon={<Mail size={16} />}
                                                    label="Send Payment Email"
                                                    onClick={() =>
                                                        openEmailModal(payment)
                                                    }
                                                />

                                                <MenuItem
                                                    icon={<Printer size={16} />}
                                                    label="Print Payment"
                                                    onClick={() =>
                                                        printPayment(payment)
                                                    }
                                                />
                                            </>
                                        )}
                                    </>
                                )}

                                {archived && (
                                    <>
                                        <MenuItem
                                            icon={<Eye size={16} />}
                                            label="View Payment"
                                            onClick={() => openView(payment)}
                                        />

                                        <MenuItem
                                            icon={<Printer size={16} />}
                                            label="Print Payment"
                                            onClick={() =>
                                                printPayment(payment)
                                            }
                                        />

                                        <MenuItem
                                            icon={<RotateCcw size={16} />}
                                            label="Restore Payment"
                                            onClick={() => openRestore(payment)}
                                            className="text-yellow-400 hover:bg-yellow-400/10"
                                        />

                                        <div className="my-1 border-t border-white/10" />

                                        <div
                                            className="
                                                px-3
                                                py-2
                                                text-[10px]
                                                font-semibold
                                                text-gray-500
                                            "
                                        >
                                            Archived records are read-only.
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </>
            )}

            {/* =========================================================
                VIEW PAYMENT MODAL - WITH CLIENT EMAIL
            ========================================================= */}

            {showViewModal && selectedPayment && (
                <ModalOverlay onClose={closeView}>
                    <div
                        className="
                            flex
                            max-h-[calc(100vh-16px)]
                            w-full
                            max-w-4xl
                            flex-col
                            overflow-hidden
                            rounded-2xl
                            border
                            border-white/10
                            bg-[#090909]
                            shadow-[0_30px_100px_rgba(0,0,0,0.75)]
                            sm:max-h-[calc(100vh-32px)]
                        "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* MODAL HEADER */}

                        <ModalHeader
                            icon={<Eye size={19} />}
                            title="Payment Document"
                            subtitle={`Official Payment Record • ${getReceipt(
                                selectedPayment,
                            )}`}
                            onClose={closeView}
                        />

                        {/* DOCUMENT SCROLL AREA */}

                        <div
                            className="
                                min-h-0
                                flex-1
                                overflow-y-auto
                                bg-[#151515]
                                p-3
                                sm:p-6
                            "
                        >
                            {/* REALISTIC PAYMENT DOCUMENT */}

                            <div
                                className="
                                    mx-auto
                                    w-full
                                    max-w-[820px]
                                    overflow-hidden
                                    bg-white
                                    text-slate-900
                                    shadow-[0_20px_60px_rgba(0,0,0,0.45)]
                                "
                            >
                                {/* DOCUMENT HEADER */}

                                <div className="border-b-4 border-yellow-400 px-6 py-6 sm:px-10 sm:py-8">
                                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                                        {/* COMPANY */}

                                        <div className="flex items-center gap-4">
                                            <div
                                                className="
                                                    flex
                                                    h-14
                                                    w-14
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    border-2
                                                    border-slate-900
                                                    text-xl
                                                    font-black
                                                    tracking-widest
                                                "
                                            >
                                                A
                                            </div>

                                            <div>
                                                <h1 className="text-2xl font-black tracking-[0.14em] text-slate-950 sm:text-3xl">
                                                    ALIBATON
                                                </h1>

                                                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                                    Heavy Equipment & Logistics
                                                    Management System
                                                </p>

                                                <p className="mt-1 text-[8px] text-slate-400">
                                                    45 Riverside, Quezon City,
                                                    Philippines
                                                </p>
                                            </div>
                                        </div>

                                        {/* DOCUMENT TYPE */}

                                        <div className="text-left sm:text-right">
                                            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                Official Payment Record
                                            </p>

                                            <p className="mt-1 text-lg font-black text-slate-950">
                                                {getReceipt(selectedPayment)}
                                            </p>

                                            <p className="mt-1 text-[8px] uppercase tracking-wider text-slate-400">
                                                Payment Statement
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* PAYMENT STATUS BAR */}

                                <div className="border-b border-slate-200 px-6 py-5 sm:px-10">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                Transaction Record
                                            </p>

                                            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                                                PAYMENT STATEMENT
                                            </h2>

                                            <p className="mt-1 text-[9px] text-slate-500">
                                                Official record of payment
                                                transaction
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-start gap-1 sm:items-end">
                                            <span className="text-[7px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                Payment Status
                                            </span>

                                            <div
                                                className={`
                                                    inline-flex
                                                    min-w-[125px]
                                                    items-center
                                                    justify-center
                                                    rounded-full
                                                    border
                                                    px-5
                                                    py-2.5
                                                    text-[9px]
                                                    font-black
                                                    uppercase
                                                    tracking-[0.12em]
                                                    ${
                                                        getStatus(
                                                            selectedPayment,
                                                        ) === "Paid"
                                                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                            : getStatus(
                                                                    selectedPayment,
                                                                ) === "Partial"
                                                              ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                                                              : "border-red-300 bg-red-50 text-red-700"
                                                    }
                                                `}
                                            >
                                                {getStatus(selectedPayment) ===
                                                "Partial"
                                                    ? "PARTIALLY PAID"
                                                    : getStatus(
                                                          selectedPayment,
                                                      )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ACCOUNT INFORMATION - WITH CLIENT EMAIL */}

                                <div className="px-6 py-5 sm:px-10">
                                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                        Account Information
                                    </p>

                                    <div className="grid grid-cols-1 border border-slate-200 sm:grid-cols-2">
                                        <div className="border-b border-slate-200 p-4 sm:border-r">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                Client / Company
                                            </p>

                                            <p className="mt-1 break-words text-sm font-bold text-slate-900">
                                                {getClientName(selectedPayment)}
                                            </p>
                                        </div>

                                        <div className="border-b border-slate-200 p-4">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                Invoice Number
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {getInvoice(selectedPayment)}
                                            </p>
                                        </div>

                                        {/* ✅ PAYMENT METHOD - Added to view modal */}
                                        <div className="border-b border-slate-200 p-4 sm:border-r">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                Payment Method
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {getMethod(selectedPayment)}
                                            </p>
                                        </div>

                                        {/* ✅ CLIENT EMAIL - Added to view modal */}
                                        <div className="border-b border-slate-200 p-4">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                Client Email
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {getClientEmail(
                                                    selectedPayment,
                                                ) || "N/A"}
                                            </p>
                                        </div>

                                        <div className="border-b border-slate-200 p-4 sm:border-r">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                Receipt Number
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {getReceipt(selectedPayment)}
                                            </p>
                                        </div>

                                        <div className="border-b border-slate-200 p-4 sm:border-r sm:border-b-0">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                Payment Date
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {formatDateReadable(
                                                    getPaymentDate(
                                                        selectedPayment,
                                                    ),
                                                )}
                                            </p>
                                        </div>

                                        <div className="p-4">
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                Due Date
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-slate-900">
                                                {formatDateReadable(
                                                    getDueDate(selectedPayment),
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* PAYMENT SUMMARY */}

                                <div className="mx-6 border border-slate-200 sm:mx-10">
                                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                                        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                                            Payment Summary
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3">
                                        {/* INVOICE TOTAL */}

                                        <div className="border-b border-slate-200 p-5 sm:border-r">
                                            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                                Invoice Total
                                            </p>

                                            <p className="mt-2 text-lg font-black text-slate-950">
                                                {formatCurrency(
                                                    getInvoiceTotal(
                                                        selectedPayment,
                                                    ),
                                                )}
                                            </p>
                                        </div>

                                        {/* AMOUNT PAID */}

                                        <div className="border-b border-slate-200 p-5 sm:border-r">
                                            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                                Amount Paid
                                            </p>

                                            <p className="mt-2 text-lg font-black text-emerald-600">
                                                {formatCurrency(
                                                    Number(
                                                        selectedPayment.amount ??
                                                            0,
                                                    ),
                                                )}
                                            </p>
                                        </div>

                                        {/* REMAINING */}

                                        <div className="p-5">
                                            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                                Remaining Balance
                                            </p>

                                            <p
                                                className={`
                                                    mt-2
                                                    text-lg
                                                    font-black
                                                    ${
                                                        getStatus(
                                                            selectedPayment,
                                                        ) === "Partial"
                                                            ? "text-yellow-600"
                                                            : "text-slate-950"
                                                    }
                                                `}
                                            >
                                                {formatCurrency(
                                                    Math.max(
                                                        getInvoiceTotal(
                                                            selectedPayment,
                                                        ) -
                                                            Number(
                                                                selectedPayment.amount ??
                                                                    0,
                                                            ),
                                                        0,
                                                    ),
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* PAYMENT DETAILS */}

                                <div className="px-6 py-5 sm:px-10">
                                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                        Payment Details
                                    </p>

                                    <table className="w-full border-collapse border border-slate-200">
                                        <tbody>
                                            <tr>
                                                <td className="w-[40%] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Payment Date
                                                </td>

                                                <td className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-900">
                                                    {formatDateReadable(
                                                        getPaymentDate(
                                                            selectedPayment,
                                                        ),
                                                    )}
                                                </td>
                                            </tr>

                                            <tr>
                                                <td className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Due Date
                                                </td>

                                                <td className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-900">
                                                    {formatDateReadable(
                                                        getDueDate(
                                                            selectedPayment,
                                                        ),
                                                    )}
                                                </td>
                                            </tr>

                                            <tr>
                                                <td className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Payment Status
                                                </td>

                                                <td className="border-b border-slate-200 px-4 py-3">
                                                    <span
                                                        className={`
                                                            inline-flex
                                                            rounded-full
                                                            border
                                                            px-3
                                                            py-1.5
                                                            text-[8px]
                                                            font-black
                                                            uppercase
                                                            tracking-wider
                                                            ${
                                                                getStatus(
                                                                    selectedPayment,
                                                                ) === "Paid"
                                                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                                    : getStatus(
                                                                            selectedPayment,
                                                                        ) ===
                                                                        "Partial"
                                                                      ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                                                                      : "border-red-300 bg-red-50 text-red-700"
                                                            }
                                                        `}
                                                    >
                                                        {getStatus(
                                                            selectedPayment,
                                                        ) === "Partial"
                                                            ? "PARTIALLY PAID"
                                                            : getStatus(
                                                                  selectedPayment,
                                                              )}
                                                    </span>
                                                </td>
                                            </tr>

                                            {getStatus(selectedPayment) ===
                                                "Partial" && (
                                                <tr>
                                                    <td className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                        Partial Payment Date
                                                    </td>

                                                    <td className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-900">
                                                        {formatDateReadable(
                                                            (
                                                                selectedPayment as any
                                                            )
                                                                .partialPaymentDate,
                                                        )}
                                                    </td>
                                                </tr>
                                            )}

                                            <tr>
                                                <td className="bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Receipt Number
                                                </td>

                                                <td className="px-4 py-3 text-xs font-bold text-slate-900">
                                                    {getReceipt(
                                                        selectedPayment,
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* BALANCE NOTICE FOR PARTIAL PAYMENT */}

                                {getStatus(selectedPayment) === "Partial" && (
                                    <div className="mx-6 border border-yellow-300 bg-yellow-50 px-5 py-4 sm:mx-10">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100">
                                                <CircleDollarSign
                                                    size={17}
                                                    className="text-yellow-700"
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-yellow-700">
                                                    Outstanding Balance
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-yellow-800">
                                                    This invoice has been
                                                    partially paid. The
                                                    remaining balance is still
                                                    outstanding.
                                                </p>

                                                <p className="mt-2 text-base font-black text-yellow-700">
                                                    {formatCurrency(
                                                        Math.max(
                                                            getInvoiceTotal(
                                                                selectedPayment,
                                                            ) -
                                                                Number(
                                                                    selectedPayment.amount ??
                                                                        0,
                                                                ),
                                                            0,
                                                        ),
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* NOTES */}

                                <div className="px-6 py-5 sm:px-10">
                                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                        Payment Notes
                                    </p>

                                    <div className="min-h-[80px] border border-slate-200 bg-slate-50 px-5 py-4">
                                        <p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">
                                            {selectedPayment.notes?.trim() ||
                                                "No notes provided."}
                                        </p>
                                    </div>
                                </div>

                                {/* PAYMENT CONFIRMATION */}

                                {getStatus(selectedPayment) === "Paid" && (
                                    <div className="mx-6 border border-emerald-300 bg-emerald-50 px-5 py-4 sm:mx-10">
                                        <div className="flex items-start gap-3">
                                            <ShieldCheck
                                                size={18}
                                                className="mt-0.5 shrink-0 text-emerald-600"
                                            />

                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">
                                                    Payment Verified
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-emerald-700">
                                                    This payment has been fully
                                                    verified and the invoice
                                                    balance has been settled.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SIGNATURES */}

                                <div className="px-6 pb-8 pt-10 sm:px-10">
                                    <div className="grid gap-10 sm:grid-cols-2">
                                        <div>
                                            <div className="h-8 border-b border-slate-400" />

                                            <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-wider text-slate-500">
                                                Client / Authorized
                                                Representative
                                            </p>
                                        </div>

                                        <div>
                                            <div className="h-8 border-b border-slate-400" />

                                            <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-wider text-slate-500">
                                                ALIBATON Finance / Authorized
                                                Staff
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* DOCUMENT FOOTER */}

                                <div className="border-t border-slate-200 px-6 py-4 sm:px-10">
                                    <div className="flex flex-col gap-2 text-[7px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                                        <span>
                                            ALIBATON Payment Management System
                                        </span>

                                        <span>
                                            Receipt:{" "}
                                            <strong className="text-slate-500">
                                                {getReceipt(selectedPayment)}
                                            </strong>
                                        </span>

                                        <span>
                                            Printed:{" "}
                                            {new Date().toLocaleDateString(
                                                "en-PH",
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MODAL FOOTER */}

                        <ModalFooter>
                            <button
                                type="button"
                                onClick={closeView}
                                className={primaryButtonClass}
                            >
                                <Check size={17} />
                                Done
                            </button>
                        </ModalFooter>
                    </div>
                </ModalOverlay>
            )}

            {/* =========================================================
                EDIT PAYMENT MODAL
            ========================================================= */}

            {showEditModal && selectedPayment && (
                <ModalOverlay onClose={closeEditPayment}>
                    <div
                        className="
                            w-full
                            max-w-2xl
                            overflow-hidden
                            rounded-2xl
                            border
                            border-yellow-400/20
                            bg-[#0b0b0b]
                            shadow-2xl
                        "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ModalHeader
                            icon={<Edit2 size={19} />}
                            title={`Edit Payment - ${getReceipt(selectedPayment)}`}
                            subtitle="Update payment information"
                            onClose={closeEditPayment}
                        />

                        <form
                            onSubmit={submitEditPayment}
                            className="p-5 sm:p-6"
                        >
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                                            Client{" "}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentForm.client}
                                            onChange={(e) =>
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    client: e.target.value,
                                                })
                                            }
                                            placeholder="Enter client name"
                                            className={inputClass}
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                                            Invoice Number
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentForm.invoice_number}
                                            onChange={(e) =>
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    invoice_number:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="INV-2026-001"
                                            className={inputClass}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                                            Receipt Number
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentForm.receipt_number}
                                            onChange={(e) =>
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    receipt_number:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="OR-0001"
                                            className={inputClass}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                                            Payment Method{" "}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            value={paymentForm.payment_method}
                                            onChange={(e) =>
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    payment_method:
                                                        e.target.value,
                                                })
                                            }
                                            className={selectClass}
                                            required
                                            disabled={isSubmitting}
                                        >
                                            <option value="Bank Transfer">
                                                Bank Transfer
                                            </option>
                                            <option value="Cheque">
                                                Cheque
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                                            Amount{" "}
                                            <span className="text-red-400">
                                                *
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400">
                                                ₱
                                            </span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={paymentForm.amount}
                                                onChange={(e) =>
                                                    setPaymentForm({
                                                        ...paymentForm,
                                                        amount: e.target.value,
                                                    })
                                                }
                                                placeholder="0.00"
                                                className={`${inputClass} pl-8`}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                                            Payment Date
                                        </label>
                                        <input
                                            type="date"
                                            value={paymentForm.payment_date}
                                            onChange={(e) =>
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    payment_date:
                                                        e.target.value,
                                                })
                                            }
                                            className={inputClass}
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-gray-300">
                                            Due Date
                                        </label>
                                        <input
                                            type="date"
                                            value={paymentForm.due_date}
                                            onChange={(e) =>
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    due_date: e.target.value,
                                                })
                                            }
                                            className={inputClass}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold text-gray-300">
                                        Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={paymentForm.notes}
                                        onChange={(e) =>
                                            setPaymentForm({
                                                ...paymentForm,
                                                notes: e.target.value,
                                            })
                                        }
                                        placeholder="Additional notes..."
                                        className={`${inputClass} min-h-[80px] resize-y`}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <ModalFooter>
                                <button
                                    type="button"
                                    onClick={closeEditPayment}
                                    disabled={isSubmitting}
                                    className={secondaryButtonClass}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={primaryButtonClass}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={17} />
                                            Update Payment
                                        </>
                                    )}
                                </button>
                            </ModalFooter>
                        </form>
                    </div>
                </ModalOverlay>
            )}

            {/* =========================================================
                PARTIAL CONFIRMATION MODAL
            ========================================================= */}

            {showPartialModal && selectedPayment && (
                <ModalOverlay onClose={closePartial}>
                    <div
                        className="
                            w-full
                            max-w-lg
                            overflow-hidden
                            rounded-2xl
                            border
                            border-blue-400/20
                            bg-[#0b0b0b]
                            shadow-2xl
                        "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ModalHeader
                            icon={<CreditCard size={19} />}
                            title="Mark Partial Payment"
                            subtitle={getReceipt(selectedPayment)}
                            onClose={closePartial}
                        />

                        <div className="p-5 sm:p-6">
                            <div
                                className="
                                    mb-5
                                    rounded-2xl
                                    border
                                    border-blue-400/15
                                    bg-blue-400/[0.05]
                                    p-4
                                "
                            >
                                <div className="flex gap-3">
                                    <AlertCircle
                                        size={20}
                                        className="shrink-0 text-blue-400"
                                    />

                                    <div>
                                        <p className="text-sm font-bold text-blue-300">
                                            Automatic Half Payment
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-gray-400">
                                            The system automatically calculated
                                            50% of the invoice amount. Admin
                                            only needs to confirm.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <AmountConfirmRow
                                    label="Invoice Total"
                                    value={formatCurrency(
                                        getInvoiceTotal(selectedPayment),
                                    )}
                                />

                                <AmountConfirmRow
                                    label="Automatic 50% Payment"
                                    value={formatCurrency(partialAmount)}
                                    highlight
                                />

                                <AmountConfirmRow
                                    label="Remaining Balance"
                                    value={formatCurrency(
                                        Math.max(
                                            getInvoiceTotal(selectedPayment) -
                                                partialAmount,
                                            0,
                                        ),
                                    )}
                                />
                            </div>

                            <div
                                className="
                                    mt-5
                                    rounded-xl
                                    border
                                    border-white/10
                                    bg-white/[0.025]
                                    p-4
                                "
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle2
                                        size={19}
                                        className="text-blue-400"
                                    />

                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            Ready to confirm?
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            Clicking YES will mark this payment
                                            as Partial.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ModalFooter>
                            <button
                                type="button"
                                onClick={closePartial}
                                className={secondaryButtonClass}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmPartial}
                                className="
                                    flex
                                    h-11
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-blue-500
                                    px-6
                                    text-sm
                                    font-black
                                    text-white
                                    transition
                                    hover:bg-blue-400
                                "
                            >
                                <Check size={17} />
                                YES, MARK PARTIAL
                            </button>
                        </ModalFooter>
                    </div>
                </ModalOverlay>
            )}

            {/* =========================================================
                FULLY PAID CONFIRMATION
            ========================================================= */}

            {showPaidModal && selectedPayment && (
                <ModalOverlay onClose={closePaidModal}>
                    <div
                        className="
                            w-full
                            max-w-lg
                            overflow-hidden
                            rounded-2xl
                            border
                            border-emerald-400/20
                            bg-[#0b0b0b]
                            shadow-2xl
                        "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ModalHeader
                            icon={<CheckCircle2 size={19} />}
                            title="Mark Fully Paid"
                            subtitle={getReceipt(selectedPayment)}
                            onClose={closePaidModal}
                        />

                        <div className="p-5 sm:p-6">
                            <div
                                className="
                                    flex
                                    flex-col
                                    items-center
                                    text-center
                                "
                            >
                                <div
                                    className="
                                        flex
                                        h-20
                                        w-20
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-emerald-400/20
                                        bg-emerald-400/10
                                    "
                                >
                                    <ShieldCheck
                                        size={40}
                                        className="text-emerald-400"
                                    />
                                </div>

                                <h2 className="mt-5 text-xl font-black text-white">
                                    Confirm Fully Paid
                                </h2>

                                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">
                                    Mark{" "}
                                    <span className="font-bold text-white">
                                        {getReceipt(selectedPayment)}
                                    </span>{" "}
                                    as fully paid?
                                </p>
                            </div>

                            <div
                                className="
                                    mt-5
                                    rounded-xl
                                    border
                                    border-white/10
                                    bg-white/[0.025]
                                    p-4
                                "
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-600">
                                            Client
                                        </p>

                                        <p className="mt-1 truncate text-sm font-bold text-white">
                                            {getClientName(selectedPayment)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-600">
                                            Invoice
                                        </p>

                                        <p className="mt-1 truncate text-sm font-bold text-white">
                                            {getInvoice(selectedPayment)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-600">
                                            Amount
                                        </p>

                                        <p className="mt-1 text-sm font-black text-yellow-400">
                                            {formatCurrency(
                                                selectedPayment.amount,
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-600">
                                            Status
                                        </p>

                                        <p className="mt-1 text-sm font-black text-yellow-400">
                                            {getStatus(selectedPayment)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="
                                    mt-4
                                    rounded-xl
                                    border
                                    border-emerald-400/15
                                    bg-emerald-400/[0.04]
                                    p-4
                                "
                            >
                                <p className="text-xs leading-5 text-emerald-300">
                                    Once confirmed, this record will become
                                    <strong> Fully Paid</strong> and the payment
                                    record will be locked.
                                </p>
                            </div>
                        </div>

                        <ModalFooter>
                            <button
                                type="button"
                                onClick={closePaidModal}
                                disabled={paidProcessing}
                                className={secondaryButtonClass}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmFullyPaid}
                                disabled={paidProcessing}
                                className="
                                    flex
                                    h-11
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-emerald-400
                                    px-6
                                    text-sm
                                    font-black
                                    text-black
                                    transition
                                    hover:bg-emerald-300
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                {paidProcessing ? (
                                    <>
                                        <div
                                            className="
                                                h-4
                                                w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-black/30
                                                border-t-black
                                            "
                                        />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Check size={17} />
                                        YES, FULLY PAID
                                    </>
                                )}
                            </button>
                        </ModalFooter>
                    </div>
                </ModalOverlay>
            )}

            {/* =========================================================
                EMAIL MODAL
            ========================================================= */}

            {showEmailModal && selectedPayment && (
                <ModalOverlay
                    onClose={emailSending ? () => {} : closeEmailModal}
                >
                    <form
                        onSubmit={submitEmail}
                        className="
                            flex
                            max-h-[calc(100vh-24px)]
                            w-full
                            max-w-2xl
                            flex-col
                            overflow-hidden
                            rounded-2xl
                            border
                            border-yellow-400/20
                            bg-[#0b0b0b]
                            shadow-2xl
                            shadow-black/70
                            sm:max-h-[calc(100vh-48px)]
                        "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ModalHeader
                            icon={<Mail size={19} />}
                            title="Send Payment Email"
                            subtitle="Admin → Client"
                            onClose={emailSending ? () => {} : closeEmailModal}
                        />

                        <div
                            className="
                                min-h-0
                                flex-1
                                overflow-y-auto
                                p-4
                                sm:p-6
                            "
                        >
                            <div
                                className="
                                    mb-5
                                    rounded-2xl
                                    border
                                    border-white/10
                                    bg-white/[0.025]
                                    p-4
                                "
                            >
                                <div
                                    className="
                                        mb-4
                                        flex
                                        items-center
                                        gap-3
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-yellow-400/10
                                            text-yellow-400
                                        "
                                    >
                                        <CreditCard size={18} />
                                    </div>

                                    <div className="min-w-0">
                                        <p
                                            className="
                                                text-[10px]
                                                font-semibold
                                                uppercase
                                                tracking-wider
                                                text-gray-500
                                            "
                                        >
                                            Payment Record
                                        </p>

                                        <p
                                            className="
                                                mt-1
                                                truncate
                                                text-sm
                                                font-bold
                                            "
                                        >
                                            {getReceipt(selectedPayment)}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className="
                                        grid
                                        min-w-0
                                        grid-cols-1
                                        gap-3
                                        sm:grid-cols-2
                                    "
                                >
                                    <EmailInfo
                                        icon={<Building2 size={14} />}
                                        label="Client"
                                        value={getClientName(selectedPayment)}
                                    />

                                    <EmailInfo
                                        icon={<FileText size={14} />}
                                        label="Invoice"
                                        value={getInvoice(selectedPayment)}
                                    />

                                    <EmailInfo
                                        icon={<CreditCard size={14} />}
                                        label="Amount"
                                        value={formatCurrency(
                                            selectedPayment.amount,
                                        )}
                                    />

                                    <EmailInfo
                                        icon={<Clock3 size={14} />}
                                        label="Status"
                                        value={getStatus(selectedPayment)}
                                    />
                                </div>
                            </div>

                            <div className="mb-4 min-w-0">
                                <label className="mb-2 block text-xs font-semibold text-gray-300">
                                    Client Email Address
                                </label>

                                <div className="relative">
                                    <Mail
                                        size={16}
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-3
                                            top-1/2
                                            -translate-y-1/2
                                            text-gray-500
                                        "
                                    />

                                    <input
                                        type="email"
                                        value={emailForm.email}
                                        onChange={(e) =>
                                            setEmailForm({
                                                ...emailForm,
                                                email: e.target.value,
                                            })
                                        }
                                        placeholder="Enter client's email address"
                                        className={`${inputClass} pl-10`}
                                        required
                                        disabled={emailSending}
                                    />
                                </div>

                                <p className="mt-1.5 text-[11px] text-gray-600">
                                    Enter the recipient email manually.
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="mb-2 block text-xs font-semibold text-gray-300">
                                    Subject
                                </label>

                                <input
                                    type="text"
                                    value={emailForm.subject}
                                    onChange={(e) =>
                                        setEmailForm({
                                            ...emailForm,
                                            subject: e.target.value,
                                        })
                                    }
                                    placeholder="Payment Update"
                                    className={inputClass}
                                    required
                                    disabled={emailSending}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-300">
                                    Message
                                </label>

                                <textarea
                                    rows={7}
                                    value={emailForm.message}
                                    onChange={(e) =>
                                        setEmailForm({
                                            ...emailForm,
                                            message: e.target.value,
                                        })
                                    }
                                    placeholder="Write your message to the client..."
                                    className={`${inputClass} min-h-[140px] resize-none`}
                                    required
                                    disabled={emailSending}
                                />
                            </div>
                        </div>

                        <ModalFooter>
                            <button
                                type="button"
                                onClick={closeEmailModal}
                                disabled={emailSending}
                                className={secondaryButtonClass}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={emailSending}
                                className={primaryButtonClass}
                            >
                                {emailSending ? (
                                    <>
                                        <div
                                            className="
                                                h-4
                                                w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-black/30
                                                border-t-black
                                            "
                                        />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Send Email
                                    </>
                                )}
                            </button>
                        </ModalFooter>
                    </form>
                </ModalOverlay>
            )}

            {/* =========================================================
                EMAIL SUCCESS
            ========================================================= */}

            {showSuccessModal && (
                <ModalOverlay onClose={() => setShowSuccessModal(false)}>
                    <div
                        className="
                            w-full
                            max-w-md
                            overflow-hidden
                            rounded-2xl
                            border
                            border-emerald-400/20
                            bg-[#0b0b0b]
                            shadow-2xl
                        "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 sm:p-7">
                            <div className="flex flex-col items-center text-center">
                                <div
                                    className="
                                        flex
                                        h-16
                                        w-16
                                        items-center
                                        justify-center
                                        rounded-full
                                        border
                                        border-emerald-400/20
                                        bg-emerald-400/10
                                    "
                                >
                                    <CheckCircle2
                                        size={34}
                                        className="text-emerald-400"
                                    />
                                </div>

                                <h2 className="mt-5 text-xl font-bold text-white">
                                    Successfully Completed
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    The payment record has been successfully
                                    updated.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setShowSuccessModal(false)}
                                    className="
                                        mt-6
                                        flex
                                        h-11
                                        w-full
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        bg-emerald-400
                                        px-5
                                        text-sm
                                        font-bold
                                        text-black
                                    "
                                >
                                    <Check size={17} />
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* =========================================================
                RESTORE MODAL
            ========================================================= */}

            {showRestoreModal && selectedPayment && (
                <ModalOverlay onClose={closeRestore}>
                    <div
                        className="
                            w-full
                            max-w-md
                            overflow-hidden
                            rounded-2xl
                            border
                            border-yellow-400/20
                            bg-[#0b0b0b]
                            shadow-2xl
                        "
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ModalHeader
                            icon={<RotateCcw size={19} />}
                            title="Restore Payment"
                            subtitle={getReceipt(selectedPayment)}
                            onClose={closeRestore}
                        />

                        <div className="p-5 sm:p-6">
                            <p className="text-sm leading-6 text-gray-400">
                                Restore this payment record from the archive?
                            </p>

                            <div
                                className="
                                    mt-4
                                    rounded-xl
                                    border
                                    border-white/10
                                    bg-white/[0.025]
                                    p-4
                                "
                            >
                                <p className="text-xs text-gray-500">Client</p>

                                <p className="mt-1 font-bold text-white">
                                    {getClientName(selectedPayment)}
                                </p>

                                <p className="mt-3 text-xs text-gray-500">
                                    Amount
                                </p>

                                <p className="mt-1 font-black text-yellow-400">
                                    {formatCurrency(selectedPayment.amount)}
                                </p>
                            </div>
                        </div>

                        <ModalFooter>
                            <button
                                type="button"
                                onClick={closeRestore}
                                className={secondaryButtonClass}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={restorePayment}
                                className={primaryButtonClass}
                            >
                                <RotateCcw size={17} />
                                Restore
                            </button>
                        </ModalFooter>
                    </div>
                </ModalOverlay>
            )}
        </>
    );
}

/*
|--------------------------------------------------------------------------
| PAYMENT ROW - WITH CLIENT EMAIL
|--------------------------------------------------------------------------
*/

function PaymentRow({
    payment,
    clientName,
    isMenuOpen,
    onMenuClick,
    onApprove,
    onPartial,
    onView,
    onEdit,
    onSendEmail,
    onPrint,
    onRestore,
    formatCurrency,
}: {
    payment: Payment;
    clientName: string;
    isMenuOpen: boolean;
    onMenuClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onApprove: () => void;
    onPartial: () => void;
    onView: () => void;
    onEdit: () => void;
    onSendEmail: () => void;
    onPrint: () => void;
    onRestore: () => void;
    formatCurrency: (value: number | string | null | undefined) => string;
}) {
    const status = getStatus(payment);
    const paid = status === "Paid";
    const partial = status === "Partial";
    const archived = Boolean(payment.archived);
    const amount = Number(payment.amount ?? 0);
    const invoiceTotal = getInvoiceTotal(payment);
    const remaining = Math.max(invoiceTotal - amount, 0);
    const method = getMethod(payment);
    const clientEmail = getClientEmail(payment);

    return (
        <div
            className={`
                relative
                p-4
                transition
                hover:bg-white/[0.025]
                sm:p-5
                ${paid ? "bg-emerald-400/[0.015]" : ""}
                ${partial ? "bg-blue-400/[0.015]" : ""}
            `}
        >
            <div
                className="
                    flex
                    flex-col
                    gap-4
                    lg:flex-row
                    lg:items-center
                "
            >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                        className={`
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${
                                paid
                                    ? "bg-emerald-400/10 text-emerald-400"
                                    : partial
                                      ? "bg-blue-400/10 text-blue-400"
                                      : "bg-yellow-400/10 text-yellow-400"
                            }
                        `}
                    >
                        {paid ? (
                            <ShieldCheck size={20} />
                        ) : partial ? (
                            <CreditCard size={20} />
                        ) : (
                            <Receipt size={20} />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div
                            className="
                                flex
                                flex-wrap
                                items-center
                                gap-2
                            "
                        >
                            <h3 className="truncate text-sm font-black text-white sm:text-base">
                                {clientName}
                            </h3>

                            <StatusBadge status={status} />
                        </div>

                        <div
                            className="
                                mt-2
                                grid
                                grid-cols-1
                                gap-x-5
                                gap-y-1
                                text-xs
                                text-gray-500
                                sm:grid-cols-2
                                xl:grid-cols-5
                            "
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <FileText size={13} />
                                {getInvoice(payment)}
                            </span>

                            <span className="flex items-center gap-1.5 truncate">
                                <Hash size={13} />
                                {getReceipt(payment)}
                            </span>

                            <span className="flex items-center gap-1.5 truncate">
                                <Banknote size={13} />
                                {method}
                            </span>

                            <span className="flex items-center gap-1.5 truncate">
                                <CalendarClock size={13} />
                                Due: {formatShortDate(getDueDate(payment))}
                            </span>

                            <span className="flex items-center gap-1.5 truncate">
                                <CreditCard size={13} />
                                {formatCurrency(amount)}
                            </span>
                        </div>

                        {/* ✅ CLIENT EMAIL - Added to row */}
                        {clientEmail && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                                <Mail size={12} />
                                <span>{clientEmail}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="
                        grid
                        grid-cols-2
                        gap-3
                        sm:grid-cols-3
                        lg:w-[390px]
                        xl:w-[450px]
                    "
                >
                    <div
                        className="
                            rounded-xl
                            border
                            border-white/10
                            bg-black/20
                            px-3
                            py-2.5
                        "
                    >
                        <p className="text-[9px] uppercase tracking-wider text-gray-600">
                            Paid Amount
                        </p>

                        <p className="mt-1 text-sm font-black text-white">
                            {formatCurrency(amount)}
                        </p>
                    </div>

                    <div
                        className="
                            rounded-xl
                            border
                            border-white/10
                            bg-black/20
                            px-3
                            py-2.5
                        "
                    >
                        <p className="text-[9px] uppercase tracking-wider text-gray-600">
                            Remaining
                        </p>

                        <p
                            className={`
                                mt-1
                                text-sm
                                font-black
                                ${
                                    remaining > 0
                                        ? "text-yellow-400"
                                        : "text-emerald-400"
                                }
                            `}
                        >
                            {formatCurrency(remaining)}
                        </p>
                    </div>

                    <div
                        className="
                            rounded-xl
                            border
                            border-white/10
                            bg-black/20
                            px-3
                            py-2.5
                        "
                    >
                        <p className="text-[9px] uppercase tracking-wider text-gray-600">
                            Payment Date
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-gray-300">
                            {formatShortDate(getPaymentDate(payment))}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onMenuClick}
                    aria-label="Payment actions"
                    aria-expanded={isMenuOpen}
                    className={`
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        transition
                        ${
                            isMenuOpen
                                ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                                : "border-white/10 bg-white/[0.025] text-gray-400 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-400"
                        }
                    `}
                >
                    <MoreVertical size={19} />
                </button>
            </div>

            {paid && (
                <div
                    className="
                        mt-3
                        flex
                        items-center
                        gap-2
                        rounded-lg
                        border
                        border-emerald-400/10
                        bg-emerald-400/[0.03]
                        px-3
                        py-2
                        text-[10px]
                        font-semibold
                        text-emerald-400/80
                    "
                >
                    <ShieldCheck size={13} />
                    Fully Paid — record is locked.
                </div>
            )}

            {partial && (
                <div
                    className="
                        mt-3
                        flex
                        items-center
                        gap-2
                        rounded-lg
                        border
                        border-blue-400/10
                        bg-blue-400/[0.03]
                        px-3
                        py-2
                        text-[10px]
                        font-semibold
                        text-blue-400/80
                    "
                >
                    <CreditCard size={13} />
                    Partially Paid — remaining balance is still outstanding.
                </div>
            )}

            {archived && (
                <div
                    className="
                        mt-3
                        flex
                        items-center
                        gap-2
                        rounded-lg
                        border
                        border-purple-400/10
                        bg-purple-400/[0.03]
                        px-3
                        py-2
                        text-[10px]
                        font-semibold
                        text-purple-300/80
                    "
                >
                    <Archive size={13} />
                    Archived — read-only payment record.
                </div>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MENU ITEM
|--------------------------------------------------------------------------
*/

function MenuItem({
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
            className={`
                flex
                w-full
                items-center
                gap-3
                rounded-xl
                px-3
                py-2.5
                text-left
                text-xs
                font-bold
                text-gray-300
                transition
                hover:bg-white/5
                hover:text-white
                ${className}
            `}
        >
            <span className="shrink-0">{icon}</span>

            <span className="truncate">{label}</span>
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

function StatusBadge({ status }: { status: string }) {
    const classes =
        status === "Paid"
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
            : status === "Partial"
              ? "border-blue-400/20 bg-blue-400/10 text-blue-400"
              : status === "Due"
                ? "border-orange-400/20 bg-orange-400/10 text-orange-400"
                : "border-yellow-400/20 bg-yellow-400/10 text-yellow-400";

    return (
        <span
            className={`
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                px-2.5
                py-1
                text-[9px]
                font-black
                uppercase
                tracking-wider
                ${classes}
            `}
        >
            {status === "Paid" ? (
                <CheckCircle2 size={11} />
            ) : status === "Partial" ? (
                <CreditCard size={11} />
            ) : (
                <Clock3 size={11} />
            )}

            {status === "Partial" ? "Partially Paid" : status}
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| SUMMARY CARD
|--------------------------------------------------------------------------
*/

function SummaryCard({
    title,
    value,
    icon,
    iconClass = "text-yellow-400",
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    iconClass?: string;
}) {
    return (
        <div
            className="
                rounded-2xl
                border
                border-white/10
                bg-white/[0.035]
                p-4
            "
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        {title}
                    </p>

                    <p className="mt-1 text-base font-black text-white sm:text-lg">
                        {value}
                    </p>
                </div>

                <div
                    className={`
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-white/[0.04]
                        ${iconClass}
                    `}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| EMPTY STATE
|--------------------------------------------------------------------------
*/

function EmptyState({ archive }: { archive: boolean }) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <div
                className="
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.03]
                    text-gray-600
                "
            >
                {archive ? <Archive size={28} /> : <Receipt size={28} />}
            </div>

            <p className="mt-4 text-sm font-bold text-gray-400">
                No payment records found
            </p>

            <p className="mt-1 text-xs text-gray-600">
                {archive
                    ? "No archived payment records are available."
                    : "Try another search or payment status."}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MODAL OVERLAY
|--------------------------------------------------------------------------
*/

function ModalOverlay({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div
            className="
                fixed
                inset-0
                z-[10000]
                flex
                items-center
                justify-center
                overflow-y-auto
                bg-black/80
                p-3
                backdrop-blur-md
                sm:p-6
            "
            onMouseDown={onClose}
        >
            {children}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MODAL HEADER
|--------------------------------------------------------------------------
*/

function ModalHeader({
    icon,
    title,
    subtitle,
    onClose,
    danger = false,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onClose: () => void;
    danger?: boolean;
}) {
    return (
        <div
            className="
                flex
                shrink-0
                items-center
                justify-between
                gap-4
                border-b
                border-white/10
                px-4
                py-4
                sm:px-6            "
        >
            <div className="flex min-w-0 items-center gap-3">
                <div
                    className={`
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        ${danger ? "bg-red-400/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"}
                    `}
                >
                    {icon}
                </div>

                <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-white sm:text-base">
                        {title}
                    </h2>

                    {subtitle && (
                        <p className="mt-0.5 truncate text-[10px] text-gray-500">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={onClose}
                className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-white/10
                    text-gray-500
                    transition
                    hover:bg-white/5
                    hover:text-white
                "
            >
                <X size={17} />
            </button>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MODAL FOOTER
|--------------------------------------------------------------------------
*/

function ModalFooter({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="
                flex
                shrink-0
                flex-col-reverse
                gap-2
                border-t
                border-white/10
                bg-black/20
                p-4
                sm:flex-row
                sm:justify-end
                sm:px-6
            "
        >
            {children}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| EMAIL INFO
|--------------------------------------------------------------------------
*/

function EmailInfo({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div
            className="
                min-w-0
                rounded-xl
                border
                border-white/10
                bg-black/20
                p-3
            "
        >
            <div className="flex items-center gap-2">
                <span className="text-yellow-400">{icon}</span>

                <span className="text-[10px] uppercase tracking-wider text-gray-600">
                    {label}
                </span>
            </div>

            <p className="mt-1 truncate text-xs font-bold text-gray-300">
                {value}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| AMOUNT CONFIRM ROW
|--------------------------------------------------------------------------
*/

function AmountConfirmRow({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div
            className="
                flex
                items-center
                justify-between
                gap-4
                rounded-xl
                border
                border-white/10
                bg-white/[0.025]
                px-4
                py-3
            "
        >
            <span className="text-xs text-gray-500">{label}</span>

            <span
                className={`
                    text-sm
                    font-black
                    ${highlight ? "text-blue-400" : "text-white"}
                `}
            >
                {value}
            </span>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| SHARED CLASSES
|--------------------------------------------------------------------------
*/

const inputClass = `
    h-11
    w-full
    min-w-0
    rounded-xl
    border
    border-white/10
    bg-black/40
    px-4
    text-sm
    text-white
    outline-none
    placeholder:text-gray-700
    focus:border-yellow-400/50
    focus:ring-1
    focus:ring-yellow-400/10
`;

const selectClass = `
    h-11
    w-full
    min-w-0
    appearance-none
    rounded-xl
    border
    border-white/10
    bg-black/40
    px-4
    text-sm
    text-white
    outline-none
    focus:border-yellow-400/50
    focus:ring-1
    focus:ring-yellow-400/10
`;

const primaryButtonClass = `
    flex
    h-11
    items-center
    justify-center
    gap-2
    rounded-xl
    bg-yellow-400
    px-6
    text-sm
    font-black
    text-black
    transition
    hover:bg-yellow-300
    disabled:cursor-not-allowed
    disabled:opacity-50
`;

const secondaryButtonClass = `
    flex
    h-11
    items-center
    justify-center
    gap-2
    rounded-xl
    border
    border-white/10
    bg-white/[0.03]
    px-5
    text-sm
    font-bold
    text-gray-300
    transition
    hover:bg-white/5
    hover:text-white
`;

/*
|--------------------------------------------------------------------------
| PRINT HELPERS
|--------------------------------------------------------------------------
*/

function escapeHtml(value: string) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCurrencyPrint(value: number) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
}
