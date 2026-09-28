import React, { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import UserLayout from "../../Layouts/UserLayout";

import {
    Wallet,
    CheckCircle,
    Clock,
    Receipt,
    Search,
    CreditCard,
    X,
    MoreVertical,
    Printer,
    Download,
    Banknote,
    FileText,
    Archive,
    ArchiveRestore,
    CalendarDays,
    User,
    Eye,
    EyeOff,
    AlertCircle,
    Loader2,
    ChevronDown,
    Mail,
    Send,
    UserRound,
    AtSign,
    CheckCircle2,
    ExternalLink,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PaymentStatus = "Fully Paid" | "Partially Paid" | "Due";

type PaymentTab = "all" | "Fully Paid" | "Partially Paid" | "Due" | "Archive";

type PaymentTransaction = {
    id?: number;
    amount: number;
    date: string | null;
    type?: "Partial" | "Full" | string;
    status?: string;
};

type InvoiceItem = {
    id?: number;
    qty: number;
    particulars: string;
    unitPrice: number;
    amount: number;
};

type Payment = {
    id: number;
    receipt: string;
    client: string;
    clientEmail?: string | null;
    invoice: string;
    invoiceId?: number | null;
    invoiceNumber?: string | null;
    method: "Bank Transfer" | "Cheque" | string;
    amount: number;
    status: PaymentStatus | string;
    paymentDate: string | null;
    partialPaymentDate: string | null;
    dueDate: string | null;
    paidAmount?: number;
    remainingBalance?: number;
    vatRate?: number | null;
    totalSales?: number | null;
    netOfVat?: number | null;
    vatAmount?: number | null;
    withholdingTax?: number | null;
    totalAmountDue?: number | null;
    invoiceItems?: InvoiceItem[];
    vatInclusive?: boolean | null;
    notes?: string | null;
    transactions?: PaymentTransaction[];
    archived?: boolean;
    archived_at?: string | null;
    archive_expires_at?: string | null;
    retention_delete_at?: string | null;
    invoiceData?: {
        id: number;
        number: string;
        description?: string | null;
        amount: number;
        clientEmail?: string | null;
        items?: Array<{
            id: number;
            description: string;
            quantity: number;
            unitPrice: number;
        }>;
    } | null;
};

type AuthUser = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type PageProps = {
    payments?: Payment[];
    auth?: {
        user?: AuthUser;
    };
    errors?: Record<string, string>;
    flash?: {
        success?: string;
        error?: string;
    };
};

/*
|--------------------------------------------------------------------------
| SETTINGS
|--------------------------------------------------------------------------
*/

const ARCHIVE_DAYS = 90;
const RETENTION_MONTHS = 6;
const PAYMENT_METHODS = ["Bank Transfer", "Cheque"];
const DEFAULT_VAT_RATE = 12;

/*
|--------------------------------------------------------------------------
| DEMO DATA - WITH INVOICE ITEMS
|--------------------------------------------------------------------------
*/

const DEMO_PAYMENTS: Payment[] = [
    {
        id: 999001,
        receipt: "PAY-0031",
        client: "ABC Construction",
        clientEmail: "info@abcconstruction.com",
        invoice: "INV-0001",
        invoiceId: 1,
        invoiceNumber: "INV-0001",
        method: "Bank Transfer",
        amount: 250000,
        vatRate: 12,
        totalSales: 250000,
        netOfVat: 223214.29,
        vatAmount: 26785.71,
        withholdingTax: 0,
        totalAmountDue: 250000,
        vatInclusive: true,
        invoiceItems: [
            {
                id: 1,
                qty: 2,
                particulars:
                    "Crawler crane rental for bridge construction - 3 days",
                unitPrice: 75000,
                amount: 150000,
            },
            {
                id: 2,
                qty: 1,
                particulars: "Lowbed trailer transport - crane delivery",
                unitPrice: 50000,
                amount: 50000,
            },
            {
                id: 3,
                qty: 5,
                particulars: "Rigger services - per day",
                unitPrice: 10000,
                amount: 50000,
            },
        ],
        status: "Fully Paid",
        paymentDate: "2026-08-20",
        partialPaymentDate: null,
        dueDate: "2026-08-25",
        paidAmount: 250000,
        remainingBalance: 0,
        notes: "Payment fully settled.",
        transactions: [
            {
                id: 1,
                amount: 250000,
                date: "2026-08-20",
                type: "Full",
                status: "Fully Paid",
            },
        ],
        archived: false,
    },
    {
        id: 999002,
        receipt: "PAY-0032",
        client: "Metro Builders",
        clientEmail: "billing@metrobuilders.com",
        invoice: "INV-0002",
        invoiceId: 2,
        invoiceNumber: "INV-0002",
        method: "Cheque",
        amount: 175000,
        vatRate: 12,
        totalSales: 175000,
        netOfVat: 156250,
        vatAmount: 18750,
        withholdingTax: 0,
        totalAmountDue: 175000,
        vatInclusive: true,
        invoiceItems: [
            {
                id: 4,
                qty: 3,
                particulars: "Backhoe loader rental - 5 days",
                unitPrice: 35000,
                amount: 105000,
            },
            {
                id: 5,
                qty: 2,
                particulars: "Dump truck rental - 3 days",
                unitPrice: 35000,
                amount: 70000,
            },
        ],
        status: "Partially Paid",
        paymentDate: null,
        partialPaymentDate: "2026-08-22",
        dueDate: "2026-09-05",
        paidAmount: 87500,
        remainingBalance: 87500,
        notes: "Half payment received.",
        transactions: [
            {
                id: 2,
                amount: 87500,
                date: "2026-08-22",
                type: "Partial",
                status: "Partially Paid",
            },
        ],
        archived: false,
    },
    {
        id: 999003,
        receipt: "PAY-0033",
        client: "Prime Engineering",
        clientEmail: "payments@primeengineering.com",
        invoice: "INV-0003",
        invoiceId: 3,
        invoiceNumber: "INV-0003",
        method: "Bank Transfer",
        amount: 325000,
        vatRate: 12,
        totalSales: 325000,
        netOfVat: 290178.57,
        vatAmount: 34821.43,
        withholdingTax: 0,
        totalAmountDue: 325000,
        vatInclusive: true,
        invoiceItems: [
            {
                id: 6,
                qty: 1,
                particulars: "Hydraulic excavator rental - 7 days",
                unitPrice: 250000,
                amount: 250000,
            },
            {
                id: 7,
                qty: 3,
                particulars: "Operator services - per day",
                unitPrice: 25000,
                amount: 75000,
            },
        ],
        status: "Due",
        paymentDate: null,
        partialPaymentDate: null,
        dueDate: "2026-08-30",
        paidAmount: 0,
        remainingBalance: 325000,
        notes: "Payment is currently due.",
        transactions: [],
        archived: false,
    },
    {
        id: 999004,
        receipt: "PAY-0034",
        client: "Northline Construction",
        clientEmail: "accounts@northline.com",
        invoice: "INV-0004",
        invoiceId: 4,
        invoiceNumber: "INV-0004",
        method: "Cheque",
        amount: 95000,
        vatRate: 12,
        totalSales: 95000,
        netOfVat: 84821.43,
        vatAmount: 10178.57,
        withholdingTax: 0,
        totalAmountDue: 95000,
        vatInclusive: true,
        invoiceItems: [
            {
                id: 8,
                qty: 2,
                particulars: "Forklift rental - 2 days",
                unitPrice: 25000,
                amount: 50000,
            },
            {
                id: 9,
                qty: 3,
                particulars: "Skid steer loader rental - 2 days",
                unitPrice: 15000,
                amount: 45000,
            },
        ],
        status: "Fully Paid",
        paymentDate: "2026-07-15",
        partialPaymentDate: null,
        dueDate: "2026-07-20",
        paidAmount: 95000,
        remainingBalance: 0,
        notes: "Paid by cheque.",
        transactions: [
            {
                id: 4,
                amount: 95000,
                date: "2026-07-15",
                type: "Full",
                status: "Fully Paid",
            },
        ],
        archived: true,
        archived_at: "2026-07-15",
        archive_expires_at: "2026-10-13",
        retention_delete_at: "2027-01-15",
    },
    {
        id: 999005,
        receipt: "PAY-0035",
        client: "Southern Construction",
        clientEmail: "billing@southern.com",
        invoice: "INV-0005",
        invoiceId: 5,
        invoiceNumber: "INV-0005",
        method: "Bank Transfer",
        amount: 450000,
        vatRate: 12,
        totalSales: 450000,
        netOfVat: 401785.71,
        vatAmount: 48214.29,
        withholdingTax: 5000,
        totalAmountDue: 445000,
        vatInclusive: true,
        invoiceItems: [
            {
                id: 10,
                qty: 2,
                particulars: "Mobile crane rental - 5 days",
                unitPrice: 120000,
                amount: 240000,
            },
            {
                id: 11,
                qty: 1,
                particulars: "Flatbed trailer transport - equipment delivery",
                unitPrice: 100000,
                amount: 100000,
            },
            {
                id: 12,
                qty: 4,
                particulars: "Certified rigger services - per day",
                unitPrice: 15000,
                amount: 60000,
            },
            {
                id: 13,
                qty: 1,
                particulars: "Project supervision and coordination",
                unitPrice: 50000,
                amount: 50000,
            },
        ],
        status: "Partially Paid",
        paymentDate: null,
        partialPaymentDate: "2026-09-01",
        dueDate: "2026-09-15",
        paidAmount: 200000,
        remainingBalance: 250000,
        notes: "Initial payment of 200,000 received. Balance due on project completion.",
        transactions: [
            {
                id: 5,
                amount: 200000,
                date: "2026-09-01",
                type: "Partial",
                status: "Partially Paid",
            },
        ],
        archived: false,
    },
    {
        id: 999006,
        receipt: "PAY-0036",
        client: "Eagle Logistics",
        clientEmail: "payments@eaglelogistics.com",
        invoice: "INV-0006",
        invoiceId: 6,
        invoiceNumber: "INV-0006",
        method: "Bank Transfer",
        amount: 580000,
        vatRate: 12,
        totalSales: 580000,
        netOfVat: 517857.14,
        vatAmount: 62142.86,
        withholdingTax: 10000,
        totalAmountDue: 570000,
        vatInclusive: true,
        invoiceItems: [
            {
                id: 14,
                qty: 3,
                particulars: "Heavy duty dump truck rental - 5 days",
                unitPrice: 85000,
                amount: 255000,
            },
            {
                id: 15,
                qty: 2,
                particulars: "Wheel loader rental - 4 days",
                unitPrice: 95000,
                amount: 190000,
            },
            {
                id: 16,
                qty: 1,
                particulars: "Motor grader rental - 3 days",
                unitPrice: 85000,
                amount: 85000,
            },
            {
                id: 17,
                qty: 5,
                particulars: "Driver services - per day",
                unitPrice: 10000,
                amount: 50000,
            },
        ],
        status: "Due",
        paymentDate: null,
        partialPaymentDate: null,
        dueDate: "2026-09-30",
        paidAmount: 0,
        remainingBalance: 580000,
        notes: "Payment due upon project completion. 10,000 withholding tax applied.",
        transactions: [],
        archived: false,
    },
];

/*
|--------------------------------------------------------------------------
| MONEY HELPERS
|--------------------------------------------------------------------------
*/

const formatMoney = (amount: number): string => {
    return Number(amount || 0).toLocaleString("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatCompactMoney = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(Number(amount || 0));
};

const MASKED_AMOUNT = "₱***,***";

/*
|--------------------------------------------------------------------------
| VAT HELPERS
|--------------------------------------------------------------------------
*/

const getVatBreakdown = (payment: Payment) => {
    const amount = Math.max(Number(payment.amount || 0), 0);
    const rate = Number(payment.vatRate ?? DEFAULT_VAT_RATE);
    const withholding = Math.max(Number(payment.withholdingTax ?? 0), 0);

    const suppliedTotalSales = Number(payment.totalSales);
    const suppliedNetOfVat = Number(payment.netOfVat);
    const suppliedVatAmount = Number(payment.vatAmount);
    const suppliedTotalAmountDue = Number(payment.totalAmountDue);

    const hasInvoiceVatData =
        Number.isFinite(suppliedVatAmount) &&
        payment.vatAmount !== null &&
        payment.vatAmount !== undefined;

    if (hasInvoiceVatData) {
        const vatAmount = Math.max(suppliedVatAmount, 0);
        const netOfVat =
            Number.isFinite(suppliedNetOfVat) &&
            payment.netOfVat !== null &&
            payment.netOfVat !== undefined
                ? Math.max(suppliedNetOfVat, 0)
                : Math.max(vatAmount > 0 ? amount - vatAmount : amount, 0);

        const totalSales =
            Number.isFinite(suppliedTotalSales) &&
            payment.totalSales !== null &&
            payment.totalSales !== undefined
                ? Math.max(suppliedTotalSales, 0)
                : netOfVat + vatAmount;

        const totalAmountDue =
            Number.isFinite(suppliedTotalAmountDue) &&
            payment.totalAmountDue !== null &&
            payment.totalAmountDue !== undefined
                ? Math.max(suppliedTotalAmountDue, 0)
                : Math.max(totalSales - withholding, 0);

        return {
            vatRate: rate,
            totalSales,
            netOfVat,
            vatAmount,
            withholdingTax: withholding,
            totalAmountDue,
            source: "invoice" as const,
        };
    }

    const netOfVat = rate > 0 ? amount / (1 + rate / 100) : amount;
    const vatAmount = amount - netOfVat;
    const totalSales = amount;
    const totalAmountDue = Math.max(totalSales - withholding, 0);

    return {
        vatRate: rate,
        totalSales,
        netOfVat,
        vatAmount,
        withholdingTax: withholding,
        totalAmountDue,
        source: "fallback" as const,
    };
};

const PAYMENT_METHOD_SAFE = (method: string): "Bank Transfer" | "Cheque" => {
    return method === "Cheque" ? "Cheque" : "Bank Transfer";
};

const PAYMENT_STATUS_SAFE = (status: string): PaymentStatus => {
    const normalized = String(status || "")
        .trim()
        .toLowerCase();

    if (
        normalized === "fully paid" ||
        normalized === "paid" ||
        normalized === "fullypaid"
    ) {
        return "Fully Paid";
    }

    if (
        normalized === "partially paid" ||
        normalized === "partial" ||
        normalized === "partiallypaid"
    ) {
        return "Partially Paid";
    }

    return "Due";
};

const parseDateForInput = (value: string | null | undefined): string => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return [
        parsed.getFullYear(),
        String(parsed.getMonth() + 1).padStart(2, "0"),
        String(parsed.getDate()).padStart(2, "0"),
    ].join("-");
};

const today = (): string => {
    const date = new Date();
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
};

const addDays = (date: string, days: number): string => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split("T")[0];
};

const addMonths = (date: string, months: number): string => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result.toISOString().split("T")[0];
};

/*
|--------------------------------------------------------------------------
| NORMALIZE PAYMENT
|--------------------------------------------------------------------------
*/

const normalizePayment = (payment: Payment): Payment => {
    const total = Number(payment.amount || 0);
    let paidAmount = Number(payment.paidAmount ?? 0);
    let remainingBalance =
        payment.remainingBalance !== undefined &&
        payment.remainingBalance !== null
            ? Number(payment.remainingBalance)
            : Math.max(total - paidAmount, 0);

    const status = PAYMENT_STATUS_SAFE(payment.status);

    if (status === "Fully Paid") {
        paidAmount = total;
        remainingBalance = 0;
    }

    if (status === "Due") {
        if (payment.paidAmount === undefined || payment.paidAmount === null) {
            paidAmount = 0;
        }
        remainingBalance =
            payment.remainingBalance !== undefined &&
            payment.remainingBalance !== null
                ? Number(payment.remainingBalance)
                : Math.max(total - paidAmount, 0);
    }

    if (status === "Partially Paid") {
        const serverPaidAmount =
            payment.paidAmount !== undefined && payment.paidAmount !== null
                ? Number(payment.paidAmount)
                : null;

        const serverRemainingBalance =
            payment.remainingBalance !== undefined &&
            payment.remainingBalance !== null
                ? Number(payment.remainingBalance)
                : null;

        if (serverRemainingBalance !== null && serverRemainingBalance > 0) {
            remainingBalance = serverRemainingBalance;
            paidAmount = Math.max(total - remainingBalance, 0);
        } else if (serverPaidAmount !== null && serverPaidAmount > 0) {
            paidAmount = serverPaidAmount;
            remainingBalance = Math.max(total - paidAmount, 0);
        } else {
            paidAmount = 0;
            remainingBalance = total;
        }
    }

    let invoiceItems = payment.invoiceItems || [];

    if (invoiceItems.length === 0 && payment.invoiceData?.items) {
        invoiceItems = payment.invoiceData.items.map((item) => ({
            id: item.id,
            qty: item.quantity || 1,
            particulars: item.description || "Service",
            unitPrice: item.unitPrice || 0,
            amount: (item.quantity || 1) * (item.unitPrice || 0),
        }));
    }

    if (invoiceItems.length === 0 && payment.invoiceData?.description) {
        invoiceItems = [
            {
                id: 1,
                qty: 1,
                particulars: payment.invoiceData.description,
                unitPrice: payment.invoiceData.amount || payment.amount,
                amount: payment.invoiceData.amount || payment.amount,
            },
        ];
    }

    if (invoiceItems.length === 0 && payment.invoice) {
        invoiceItems = [
            {
                id: 1,
                qty: 1,
                particulars: `Service for ${payment.invoice}`,
                unitPrice: payment.amount,
                amount: payment.amount,
            },
        ];
    }

    // ✅ GET CLIENT EMAIL
    const clientEmail =
        payment.clientEmail ?? payment.invoiceData?.clientEmail ?? null;

    // ✅ NORMALIZE RECEIPT FORMAT: OR-XXXX -> PAY-XXXX
    const normalizedReceipt = String(payment.receipt || "")
        .trim()
        .replace(/^OR-/i, "PAY-");

    return {
        ...payment,
        receipt: normalizedReceipt,
        method: PAYMENT_METHOD_SAFE(payment.method),
        status,
        amount: total,
        paidAmount,
        remainingBalance,
        paymentDate: payment.paymentDate || null,
        partialPaymentDate: payment.partialPaymentDate || null,
        dueDate: payment.dueDate || null,
        transactions: Array.isArray(payment.transactions)
            ? payment.transactions
            : [],
        invoiceItems,
        archived: Boolean(
            payment.archived ||
            payment.archived_at ||
            payment.archive_expires_at ||
            payment.retention_delete_at,
        ),
        clientEmail: clientEmail, // ✅ ADD THIS
    };
};

const getArchiveInfo = (payment: Payment) => {
    if (!payment.archived) return null;

    const archivedDate = payment.archived_at || payment.paymentDate;
    if (!archivedDate) return null;

    const expiration =
        payment.archive_expires_at || addDays(archivedDate, ARCHIVE_DAYS);
    const deleteDate =
        payment.retention_delete_at ||
        addMonths(archivedDate, RETENTION_MONTHS);

    const now = new Date();
    const expirationDate = new Date(expiration);
    const deleteDateObject = new Date(deleteDate);

    const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / 86400000,
    );
    const daysUntilDeletion = Math.ceil(
        (deleteDateObject.getTime() - now.getTime()) / 86400000,
    );

    return {
        expiration,
        deleteDate,
        daysUntilExpiration,
        daysUntilDeletion,
        expired: daysUntilExpiration <= 0,
    };
};

/*
|--------------------------------------------------------------------------
| GENERATE SOA (Statement of Account) - FORMAL VERSION
|--------------------------------------------------------------------------
*/

const generateSOA = (payment: Payment): string => {
    const vat = getVatBreakdown(payment);
    const transactions = payment.transactions || [];

    const soaContent = `

ALIBATON HEAVY EQUIPMENT AND LOGISTICS
MANAGEMENT SYSTEM

STATEMENT OF ACCOUNT (SOA)

----------------------------------------------------------------
ACCOUNT INFORMATION
----------------------------------------------------------------

Receipt Number      : ${payment.receipt}
Client              : ${payment.client}
Client Email        : ${payment.clientEmail || "N/A"}
Invoice Number      : ${payment.invoice}
Payment Method      : ${payment.method}
Status              : ${payment.status}
Date Issued         : ${payment.paymentDate || new Date().toISOString().split("T")[0]}
Due Date            : ${payment.dueDate || "N/A"}

----------------------------------------------------------------
SALES INVOICE ITEMS
----------------------------------------------------------------

Qty  Particulars                                         Unit Price      Amount
---- -------------------------------------------------- --------------  --------------
`;

    let itemsSection = "";
    if (payment.invoiceItems && payment.invoiceItems.length > 0) {
        payment.invoiceItems.forEach((item) => {
            const particulars = (item.particulars || "Service")
                .padEnd(50)
                .slice(0, 50);
            const unitPrice = formatMoney(Number(item.unitPrice || 0)).padStart(
                14,
            );
            const amount = formatMoney(Number(item.amount || 0)).padStart(14);
            itemsSection += ` ${String(item.qty || 1).padEnd(3)}  ${particulars}  ${unitPrice}  ${amount}\n`;
        });
    } else {
        itemsSection += ` N/A  No items recorded.\n`;
    }

    const soaSummary = `
----------------------------------------------------------------
VAT COMPUTATION
----------------------------------------------------------------

Total Sales                                 : ${formatMoney(vat.totalSales).padStart(30)}
Net of VAT (Taxable Sales)                  : ${formatMoney(vat.netOfVat).padStart(30)}
VAT (${vat.vatRate}%)                                   : ${formatMoney(vat.vatAmount).padStart(30)}
Withholding Tax                             : ${formatMoney(vat.withholdingTax).padStart(30)}
----------------------------------------------------------------
TOTAL AMOUNT DUE                            : ${formatMoney(vat.totalAmountDue).padStart(30)}

----------------------------------------------------------------
PAYMENT SUMMARY
----------------------------------------------------------------

Total Amount                                : ${formatMoney(payment.amount).padStart(30)}
Paid Amount                                 : ${formatMoney(Number(payment.paidAmount || 0)).padStart(30)}
Remaining Balance                           : ${formatMoney(Number(payment.remainingBalance || 0)).padStart(30)}

----------------------------------------------------------------
TRANSACTION HISTORY
----------------------------------------------------------------

Date                Type                    Amount
------------------  ----------------------  --------------
`;

    let transactionsSection = "";
    if (transactions.length > 0) {
        transactions.forEach((transaction) => {
            const date = (transaction.date || "N/A").padEnd(18);
            const type = (transaction.type || "Payment").padEnd(22);
            const amount = formatMoney(
                Number(transaction.amount || 0),
            ).padStart(14);
            transactionsSection += ` ${date}  ${type}  ${amount}\n`;
        });
    } else {
        transactionsSection += ` N/A                 N/A                     N/A\n`;
    }

    const soaFooter = `
----------------------------------------------------------------
PAYMENT NOTES
----------------------------------------------------------------

 ${payment.notes || "No notes provided."}

----------------------------------------------------------------
AUTHORIZED SIGNATORIES
----------------------------------------------------------------

 _________________________          _________________________
 Client / Authorized Rep           ALIBATON Finance / Staff

----------------------------------------------------------------
SYSTEM INFORMATION
----------------------------------------------------------------

 Document Type       : Statement of Account (SOA)
 Generated By        : ALIBATON Payment Management System
 Date Generated      : ${new Date().toLocaleDateString("en-PH", {
     year: "numeric",
     month: "long",
     day: "numeric",
     hour: "2-digit",
     minute: "2-digit",
 })}
 Status              : ${payment.status}

----------------------------------------------------------------

 This is a system-generated Statement of Account. Please verify all
 entries and contact us immediately for any discrepancies.

 ALIBATON Heavy Equipment and Logistics
 45 Riverside, Quezon City, Philippines
 Tel: (02) 8123-4567 | Email: billing@alibaton.com

----------------------------------------------------------------
`;

    return (
        soaContent + itemsSection + soaSummary + transactionsSection + soaFooter
    );
};

/*
|--------------------------------------------------------------------------
| MAIN PAGE
|--------------------------------------------------------------------------
*/

export default function PaymentManagement({
    payments: serverPayments = [],
}: PageProps) {
    const [payments, setPayments] = useState<Payment[]>(
        serverPayments.length > 0
            ? serverPayments.map(normalizePayment)
            : DEMO_PAYMENTS.map(normalizePayment),
    );

    const [activeTab, setActiveTab] = useState<PaymentTab>("all");
    const [search, setSearch] = useState("");
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(
        null,
    );
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [visiblePaymentId, setVisiblePaymentId] = useState<number | null>(
        null,
    );
    const [showTotalAmount, setShowTotalAmount] = useState(false);
    const [sendingEmail, setSendingEmail] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [emailSuccessMessage, setEmailSuccessMessage] = useState("");

    const [showEmailForm, setShowEmailForm] = useState(false);
    const [emailFormData, setEmailFormData] = useState({
        paymentId: 0,
        receipt: "",
        client: "",
        email: "",
        subject: "",
        message: "",
    });
    const [emailFormError, setEmailFormError] = useState("");

    const fetchInvoiceItems = (payment: Payment) => {
        if (payment.invoiceId && payment.invoiceItems?.length === 0) {
            router.visit(`/billing-invoicing/${payment.invoiceId}`, {
                preserveScroll: true,
                preserveState: true,
                only: ["invoice"],
                onSuccess: (page) => {
                    const invoiceData = (page.props as any).invoice;
                    if (invoiceData) {
                        const updatedPayment = {
                            ...payment,
                            invoiceData: invoiceData,
                            invoiceItems:
                                invoiceData.items?.map((item: any) => ({
                                    id: item.id,
                                    qty: item.quantity || 1,
                                    particulars: item.description || "Service",
                                    unitPrice: item.unitPrice || 0,
                                    amount:
                                        (item.quantity || 1) *
                                        (item.unitPrice || 0),
                                })) || [],
                        };
                        setPayments((prev) =>
                            prev.map((p) =>
                                p.id === payment.id
                                    ? normalizePayment(updatedPayment)
                                    : p,
                            ),
                        );
                        setSelectedPayment(normalizePayment(updatedPayment));
                    }
                },
            });
        }
    };

    useEffect(() => {
        if (serverPayments.length > 0) {
            setPayments(serverPayments.map(normalizePayment));
        }
    }, [serverPayments]);

    const flashSuccess =
        (window as any).flash?.success || (window as any).flash?.message;

    useEffect(() => {
        if (flashSuccess) {
            setSuccessMessage(String(flashSuccess));
            const timer = window.setTimeout(() => setSuccessMessage(""), 8000);
            return () => window.clearTimeout(timer);
        }
    }, [flashSuccess]);

    useEffect(() => {
        if (emailSuccessMessage) {
            const timer = window.setTimeout(
                () => setEmailSuccessMessage(""),
                8000,
            );
            return () => window.clearTimeout(timer);
        }
    }, [emailSuccessMessage]);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                !target.closest("[data-payment-menu]") &&
                !target.closest("[data-payment-trigger]") &&
                !target.closest("[data-email-form]")
            ) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenMenuId(null);
                setSelectedPayment(null);
                setShowEmailForm(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    useEffect(() => {
        console.log(
            "📧 PAYMENTS DATA:",
            payments.map((p) => ({
                id: p.id,
                client: p.client,
                clientEmail: p.clientEmail,
                invoice: p.invoice,
            })),
        );
    }, [payments]);

    const activePayments = useMemo(
        () => payments.filter((payment) => !payment.archived),
        [payments],
    );

    const archivedPayments = useMemo(
        () => payments.filter((payment) => Boolean(payment.archived)),
        [payments],
    );

    const filteredPayments = useMemo(() => {
        let records =
            activeTab === "Archive" ? archivedPayments : activePayments;

        if (activeTab !== "all" && activeTab !== "Archive") {
            records = records.filter((payment) => payment.status === activeTab);
        }

        const query = search.trim().toLowerCase();
        if (!query) return records;

        return records.filter((payment) =>
            [
                payment.receipt,
                payment.client,
                payment.invoice,
                payment.method,
                payment.status,
                payment.paymentDate || "",
                payment.partialPaymentDate || "",
                payment.dueDate || "",
            ]
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [activeTab, activePayments, archivedPayments, search]);

    const fullyPaidPayments = activePayments.filter(
        (payment) => payment.status === "Fully Paid",
    );
    const partiallyPaidPayments = activePayments.filter(
        (payment) => payment.status === "Partially Paid",
    );
    const duePayments = activePayments.filter(
        (payment) => payment.status === "Due",
    );

    const totalPayments = activePayments.reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0,
    );

    const totalRemainingBalance = activePayments.reduce(
        (total, payment) => total + Number(payment.remainingBalance || 0),
        0,
    );

    const togglePaymentAmount = (id: number) => {
        setVisiblePaymentId((current) => (current === id ? null : id));
    };

    const openActionMenu = (
        event: React.MouseEvent<HTMLButtonElement>,
        id: number,
    ) => {
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        const menuWidth = 235;
        const padding = 10;
        const gap = 8;

        let left = rect.right - menuWidth;
        if (left < padding) left = padding;
        if (left + menuWidth > window.innerWidth - padding) {
            left = window.innerWidth - menuWidth - padding;
        }

        let top = rect.bottom + gap;
        if (top < padding) top = padding;

        setMenuPosition({ top, left });
        setOpenMenuId((current) => (current === id ? null : id));
    };

    const handleView = (payment: Payment) => {
        setOpenMenuId(null);
        if (payment.invoiceId && payment.invoiceItems?.length === 0) {
            fetchInvoiceItems(payment);
        }
        setSelectedPayment(payment);
    };

    const openEmailForm = (payment: Payment) => {
        setOpenMenuId(null);

        const vat = getVatBreakdown(payment);
        const itemsList = (payment.invoiceItems || [])
            .map(
                (item) =>
                    `  • ${item.qty}x ${item.particulars} - ${formatMoney(item.amount)}`,
            )
            .join("\n");

      const defaultSubject = `Payment Confirmation - ${payment.receipt}`;

        const defaultMessage = `Dear ${payment.client},

Please find below the Statement of Account (SOA) for your reference.

----------------------------------------------------------------
ACCOUNT SUMMARY
----------------------------------------------------------------

Receipt Number      : ${payment.receipt}
Invoice Number      : ${payment.invoice}
Total Amount        : ${formatMoney(payment.amount)}
Amount Paid         : ${formatMoney(Number(payment.paidAmount || 0))}
Remaining Balance   : ${formatMoney(Number(payment.remainingBalance || 0))}
Status              : ${payment.status}
Due Date            : ${payment.dueDate || "N/A"}

----------------------------------------------------------------
VAT BREAKDOWN
----------------------------------------------------------------

Total Sales         : ${formatMoney(vat.totalSales)}
Net of VAT          : ${formatMoney(vat.netOfVat)}
VAT (12%)           : ${formatMoney(vat.vatAmount)}
Withholding Tax     : ${formatMoney(vat.withholdingTax)}
----------------------------------------------------------------
TOTAL AMOUNT DUE    : ${formatMoney(vat.totalAmountDue)}

----------------------------------------------------------------
INVOICE ITEMS
----------------------------------------------------------------

${itemsList || "  No items listed"}

----------------------------------------------------------------

Should you have any questions or concerns regarding this statement, please do not hesitate to contact our finance team.

Thank you for your continued trust in ALIBATON.

Yours sincerely,
ALIBATON Finance Team
Tel: (02) 8123-4567
Email: billing@alibaton.com
Address: 45 Riverside, Quezon City, Philippines`;

        setEmailFormData({
            paymentId: payment.id,
            receipt: payment.receipt,
            client: payment.client,
            email: payment.clientEmail || "",
            subject: defaultSubject,
            message: defaultMessage,
        });

        setEmailFormError("");
        setShowEmailForm(true);
    };

    const handleSendEmail = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const email = emailFormData.email.trim();
        const subject = emailFormData.subject.trim();
        const message = emailFormData.message.trim();

        if (!email) {
            setEmailFormError("Please enter the client's email address.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailFormError("Please enter a valid email address.");
            return;
        }

        if (!subject) {
            setEmailFormError("Please enter a subject for the email.");
            return;
        }

        setEmailFormError("");
        setSendingEmail(emailFormData.paymentId);

        const payment = payments.find((p) => p.id === emailFormData.paymentId);
        const soaContent = payment ? generateSOA(payment) : "";

        router.post(
            `/payment-management/${emailFormData.paymentId}/send-email`,
            {
                email: email,
                subject: subject,
                message: message,
                soa_content: soaContent,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSendingEmail(null);
                    setShowEmailForm(false);
                    setEmailSuccessMessage(
                        `Statement of Account for ${emailFormData.receipt} has been sent to ${email}.`,
                    );
                    setSuccessMessage(
                        `SOA for ${emailFormData.receipt} has been sent to ${email}.`,
                    );
                },
                onError: (errors) => {
                    setSendingEmail(null);
                    console.error("SEND SOA ERROR:", errors);
                    const firstError = Object.values(errors ?? {})[0];
                    if (firstError) {
                        setEmailFormError(String(firstError));
                    } else {
                        setEmailFormError(
                            "Failed to send SOA. Please try again.",
                        );
                    }
                },
                onFinish: () => setSendingEmail(null),
            },
        );
    };

    const handleArchive = (payment: Payment) => {
        setOpenMenuId(null);

        if (payment.status !== "Fully Paid") {
            window.alert("Only Fully Paid payments can be archived.");
            return;
        }

        if (!window.confirm(`Move ${payment.receipt} to Archive?`)) return;

        const archiveDate = today();
        const updated: Payment = normalizePayment({
            ...payment,
            archived: true,
            archived_at: archiveDate,
            archive_expires_at: addDays(archiveDate, ARCHIVE_DAYS),
            retention_delete_at: addMonths(archiveDate, RETENTION_MONTHS),
        });

        setPayments((current) =>
            current.map((item) => (item.id === payment.id ? updated : item)),
        );

        if (payment.id < 100000) {
            router.put(
                `/payment-management/${payment.id}/archive`,
                {
                    archived: true,
                    archived_at: archiveDate,
                    archive_expires_at: addDays(archiveDate, ARCHIVE_DAYS),
                    retention_delete_at: addMonths(
                        archiveDate,
                        RETENTION_MONTHS,
                    ),
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onError: () => {
                        setPayments((current) =>
                            current.map((item) =>
                                item.id === payment.id ? payment : item,
                            ),
                        );
                    },
                },
            );
        }
    };

    const handleRestore = (payment: Payment) => {
        setOpenMenuId(null);

        if (!window.confirm(`Restore ${payment.receipt} from Archive?`)) return;

        const updated: Payment = normalizePayment({
            ...payment,
            archived: false,
            archived_at: null,
            archive_expires_at: null,
            retention_delete_at: null,
        });

        setPayments((current) =>
            current.map((item) => (item.id === payment.id ? updated : item)),
        );

        if (payment.id < 100000) {
            router.patch(
                `/payment-management/${payment.id}/restore`,
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    onError: () => {
                        setPayments((current) =>
                            current.map((item) =>
                                item.id === payment.id ? payment : item,
                            ),
                        );
                    },
                },
            );
        }
    };

    const handlePrintSOA = (payment: Payment) => {
        setOpenMenuId(null);

        const printWindow = window.open("", "_blank", "width=900,height=800");
        if (!printWindow) {
            alert("Please allow pop-ups to print the Statement of Account.");
            return;
        }

        const vat = getVatBreakdown(payment);
        const transactions = payment.transactions || [];

        const rawStatus = String(payment.status ?? "")
            .trim()
            .toLowerCase();
        let statusBadge = "status-pending";
        if (rawStatus === "fully paid" || rawStatus === "paid")
            statusBadge = "status-paid";
        else if (rawStatus === "partially paid" || rawStatus === "partial")
            statusBadge = "status-partial";
        else if (rawStatus === "due" || rawStatus === "overdue")
            statusBadge = "status-due";

        printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SOA-${payment.receipt} - ALIBATON Statement of Account</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    background: #f0f0f0;
    font-family: 'Times New Roman', Times, serif;
    padding: 20px;
    display: flex;
    justify-content: center;
}
.soa-container {
    max-width: 900px;
    width: 100%;
    background: white;
    padding: 40px;
    border: 1px solid #1a1a2e;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}
.soa-header {
    text-align: center;
    border-bottom: 2px solid #1a1a2e;
    padding-bottom: 20px;
    margin-bottom: 20px;
}
.soa-header h1 {
    font-size: 24px;
    letter-spacing: 3px;
    color: #1a1a2e;
    font-weight: bold;
}
.soa-header h2 {
    font-size: 16px;
    color: #4a4a6a;
    margin-top: 5px;
    font-weight: normal;
    letter-spacing: 1px;
}
.soa-header p {
    font-size: 11px;
    color: #666;
    margin-top: 5px;
}
.soa-body {
    font-size: 12px;
    line-height: 1.8;
}
.section-title {
    font-weight: bold;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: #f8f8f8;
    padding: 6px 12px;
    margin: 18px 0 10px 0;
    border-left: 4px solid #1a1a2e;
}
.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 30px;
    margin-bottom: 15px;
}
.info-grid .label {
    font-weight: bold;
    color: #555;
}
.info-grid .value {
    font-weight: normal;
}
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin: 10px 0;
}
th {
    background: #f1f5f9;
    padding: 8px 10px;
    text-align: left;
    border-bottom: 2px solid #1a1a2e;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
}
td {
    padding: 6px 10px;
    border-bottom: 1px solid #e5e7eb;
}
.text-right { text-align: right; }
.text-center { text-align: center; }
.font-bold { font-weight: bold; }
.vat-section {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 15px 20px;
    margin: 10px 0;
}
.vat-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px dotted #e2e8f0;
}
.vat-row:last-child {
    border-bottom: none;
    font-weight: bold;
    font-size: 14px;
    border-top: 2px solid #1a1a2e;
    padding-top: 8px;
    margin-top: 4px;
}
.status-badge {
    display: inline-block;
    padding: 4px 20px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
}
.status-paid { background: #d1fae5; color: #065f46; }
.status-partial { background: #fef3c7; color: #92400e; }
.status-due { background: #fecaca; color: #991b1b; }
.status-pending { background: #e5e7eb; color: #374151; }
.signature-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 30px;
}
.signature-line {
    border-top: 1px solid #1a1a2e;
    padding-top: 10px;
    text-align: center;
    font-size: 10px;
    color: #666;
}
.soa-footer {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid #1a1a2e;
    text-align: center;
    font-size: 10px;
    color: #666;
}
.soa-footer .company {
    font-weight: bold;
    font-size: 12px;
    color: #1a1a2e;
}
.no-print {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a2e;
    padding: 10px 20px;
    border-radius: 10px;
    display: flex;
    gap: 10px;
    z-index: 999;
}
.no-print button {
    padding: 8px 24px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    border: none;
    font-size: 13px;
}
.btn-print { background: #1a1a2e; color: white; border: 1px solid #facc15; }
.btn-close { background: #666; color: white; }
@media print {
    body { background: white; padding: 0; }
    .soa-container { box-shadow: none; border: none; padding: 30px; }
    .no-print { display: none !important; }
}
</style>
</head>
<body>
<div class="soa-container">
    <div class="soa-header">
        <h1>ALIBATON</h1>
        <h2>Heavy Equipment and Logistics Management System</h2>
        <p>45 Riverside, Quezon City, Philippines | Tel: (02) 8123-4567</p>
        <p style="font-size:16px;font-weight:bold;margin-top:15px;">ACCOUNT SUMMARY</p>
        <div style="margin-top:10px;">
            <span class="status-badge ${statusBadge}">${payment.status}</span>
        </div>
    </div>

    <div class="soa-body">
        <div class="section-title">Account Information</div>
        <div class="info-grid">
            <div><span class="label">Receipt Number:</span> <span class="value">${payment.receipt}</span></div>
            <div><span class="label">Client:</span> <span class="value">${payment.client}</span></div>
            <div><span class="label">Invoice Number:</span> <span class="value">${payment.invoice}</span></div>
            <div><span class="label">Payment Method:</span> <span class="value">${payment.method}</span></div>
            <div><span class="label">Client Email:</span> <span class="value">${payment.clientEmail || "N/A"}</span></div>
            <div><span class="label">Date Issued:</span> <span class="value">${payment.paymentDate || "N/A"}</span></div>
            <div><span class="label">Due Date:</span> <span class="value">${payment.dueDate || "N/A"}</span></div>
        </div>

        <div class="section-title">Sales Invoice Items</div>
        <table>
            <thead>
                <tr>
                    <th style="width:60px;text-align:center;">Qty</th>
                    <th>Particulars</th>
                    <th style="width:150px;text-align:right;">Unit Price</th>
                    <th style="width:150px;text-align:right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${(payment.invoiceItems || [])
                    .map(
                        (item) => `
                    <tr>
                        <td class="text-center">${item.qty}</td>
                        <td>${item.particulars}</td>
                        <td class="text-right">${formatMoney(Number(item.unitPrice || 0))}</td>
                        <td class="text-right font-bold">${formatMoney(Number(item.amount || 0))}</td>
                    </tr>
                `,
                    )
                    .join("")}
            </tbody>
        </table>

        <div class="section-title">VAT Computation</div>
        <div class="vat-section">
            <div class="vat-row"><span>Total Sales</span><span>${formatMoney(vat.totalSales)}</span></div>
            <div class="vat-row"><span>Net of VAT (Taxable Sales)</span><span>${formatMoney(vat.netOfVat)}</span></div>
            <div class="vat-row" style="color:#2563eb;"><span>VAT (${vat.vatRate}%)</span><span>${formatMoney(vat.vatAmount)}</span></div>
            <div class="vat-row"><span>Withholding Tax</span><span>(${formatMoney(vat.withholdingTax)})</span></div>
            <div class="vat-row"><span>TOTAL AMOUNT DUE</span><span>${formatMoney(vat.totalAmountDue)}</span></div>
        </div>

        <div class="section-title">Payment Summary</div>
        <div class="vat-section" style="background:#f0fdf4;">
            <div class="vat-row"><span>Total Amount</span><span>${formatMoney(payment.amount)}</span></div>
            <div class="vat-row"><span>Paid Amount</span><span style="color:#059669;">${formatMoney(Number(payment.paidAmount || 0))}</span></div>
            <div class="vat-row" style="font-weight:bold;font-size:14px;border-top:2px solid #1a1a2e;padding-top:8px;">
                <span>Remaining Balance</span>
                <span style="color:${Number(payment.remainingBalance || 0) > 0 ? "#dc2626" : "#059669"};">
                    ${formatMoney(Number(payment.remainingBalance || 0))}
                </span>
            </div>
        </div>

        <div class="section-title">Transaction History</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${(transactions.length > 0
                    ? transactions
                    : [{ date: "N/A", type: "N/A", amount: 0 }]
                )
                    .map(
                        (transaction) => `
                    <tr>
                        <td>${transaction.date || "N/A"}</td>
                        <td>${transaction.type || "Payment"}</td>
                        <td class="text-right font-bold">${formatMoney(Number(transaction.amount || 0))}</td>
                    </tr>
                `,
                    )
                    .join("")}
            </tbody>
        </table>

        <div class="section-title">Payment Notes</div>
        <div style="background:#f8fafc;padding:12px 16px;border-radius:4px;margin:10px 0 20px 0;border-left:3px solid #1a1a2e;">
            ${payment.notes || "No notes provided."}
        </div>

        <div class="signature-section">
            <div>
                <div class="signature-line">_________________________<br>Client / Authorized Representative</div>
            </div>
            <div>
                <div class="signature-line">_________________________<br>ALIBATON Finance / Staff</div>
            </div>
        </div>
    </div>

    <div class="soa-footer">
        <p class="company">ALIBATON Heavy Equipment and Logistics Management System</p>
        <p>This is a system-generated Statement of Account. Please verify all entries.</p>
        <p style="margin-top:5px;font-size:9px;color:#999;">
            Generated: ${new Date().toLocaleString("en-PH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
    </div>
</div>

<div class="no-print">
    <button class="btn-print" onclick="window.print()">Print</button>
    <button class="btn-close" onclick="window.close()">Close</button>
</div>

<script>
window.onload = function() {
    window.focus();
    setTimeout(function() {
        window.print();
    }, 1000);
};
</script>
</body>
</html>
`);

        printWindow.document.close();
    };

    const handleDownload = (payment: Payment) => {
        setOpenMenuId(null);

        const transactions = payment.transactions || [];
        const transactionText =
            transactions.length > 0
                ? transactions
                      .map(
                          (transaction) =>
                              `${transaction.type || "Payment"} | ${
                                  transaction.date || "—"
                              } | ${formatMoney(Number(transaction.amount || 0))}`,
                      )
                      .join("\n")
                : "No payment transactions recorded.";

        const vat = getVatBreakdown(payment);

        const content = `
ALIBATON
Heavy Equipment & Logistics Management System

STATEMENT OF ACCOUNT

Receipt: ${payment.receipt}
Client: ${payment.client}
Client Email: ${payment.clientEmail || "N/A"}
Invoice: ${payment.invoice}
Payment Method: ${payment.method}

Status: ${payment.status}

SALES INVOICE ITEMS
${(payment.invoiceItems || []).length > 0 ? (payment.invoiceItems || []).map((item) => `${item.qty} | ${item.particulars} | ${formatMoney(Number(item.unitPrice || 0))} | ${formatMoney(Number(item.amount || 0))}`).join("\n") : "No sales invoice items recorded."}

Total Sales: ${formatMoney(vat.totalSales)}
Net of VAT: ${formatMoney(vat.netOfVat)}
VAT (${vat.vatRate}%): ${formatMoney(vat.vatAmount)}
Withholding Tax: ${formatMoney(vat.withholdingTax)}
Total Amount Due: ${formatMoney(vat.totalAmountDue)}

Total Amount: ${formatMoney(Number(payment.amount || 0))}
Paid Amount: ${formatMoney(Number(payment.paidAmount || 0))}
Remaining Balance: ${formatMoney(Number(payment.remainingBalance || 0))}

Due Date: ${payment.dueDate || "—"}
Partial Payment Date: ${payment.partialPaymentDate || "—"}
Payment Date: ${payment.paymentDate || "—"}

PAYMENT TRANSACTIONS
${transactionText}

Notes:
${payment.notes || "No notes provided."}

Generated by ALIBATON.
`.trim();

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${payment.receipt}-statement-of-account.txt`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const changeTab = (tab: PaymentTab) => {
        setActiveTab(tab);
        setSearch("");
        setOpenMenuId(null);

        window.requestAnimationFrame(() => {
            document
                .getElementById("payment-records")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    return (
        <>
            <Head title="Payment Management | ALIBATON" />
            <UserLayout>
                <div className="w-full min-w-0 pt-16 pb-8 text-white sm:pt-8 lg:pt-0">
                    {emailSuccessMessage && (
                        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 shadow-lg shadow-emerald-950/20 animate-in slide-in-from-top-2 fade-in duration-300">
                            <CheckCircle2
                                size={22}
                                className="mt-0.5 shrink-0 text-emerald-400"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-black uppercase tracking-wide text-emerald-300">
                                    SOA Sent Successfully
                                </p>
                                <p className="mt-1 text-sm leading-6 text-emerald-400/80">
                                    {emailSuccessMessage}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEmailSuccessMessage("")}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-400 transition hover:bg-emerald-400/10 hover:text-emerald-300"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    )}

                    {successMessage && !emailSuccessMessage && (
                        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 shadow-lg shadow-emerald-950/20">
                            <CheckCircle
                                size={22}
                                className="mt-0.5 shrink-0 text-emerald-400"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-black uppercase tracking-wide text-emerald-300">
                                    Success
                                </p>
                                <p className="mt-1 text-sm leading-6 text-emerald-400/80">
                                    {successMessage}
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

                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-300">
                            <CreditCard size={14} />
                            Payment Management
                        </div>
                        <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl">
                            Payment Records
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                            View your payment records, payment dates, due dates,
                            partial payments and remaining balances.
                        </p>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <SummaryCard
                            icon={<Wallet size={21} />}
                            title="Total Payments"
                            value={
                                showTotalAmount
                                    ? formatCompactMoney(totalPayments)
                                    : MASKED_AMOUNT
                            }
                            showEye
                            visible={showTotalAmount}
                            onToggle={() =>
                                setShowTotalAmount((value) => !value)
                            }
                            onClick={() => changeTab("all")}
                            active={activeTab === "all"}
                            hint={`${activePayments.length} records`}
                        />
                        <SummaryCard
                            icon={<CheckCircle size={21} />}
                            title="Fully Paid"
                            value={String(fullyPaidPayments.length)}
                            onClick={() => changeTab("Fully Paid")}
                            active={activeTab === "Fully Paid"}
                            hint="Click to filter"
                        />
                        <SummaryCard
                            icon={<Clock size={21} />}
                            title="Partially Paid"
                            value={String(partiallyPaidPayments.length)}
                            onClick={() => changeTab("Partially Paid")}
                            active={activeTab === "Partially Paid"}
                            hint="Click to filter"
                        />
                        <SummaryCard
                            icon={<AlertCircle size={21} />}
                            title="Due"
                            value={String(duePayments.length)}
                            onClick={() => changeTab("Due")}
                            active={activeTab === "Due"}
                            hint="Click to filter"
                        />
                    </div>

                    <div
                        id="payment-records"
                        className="mt-5 overflow-hidden rounded-3xl border border-yellow-400/15 bg-slate-900/90 shadow-2xl backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h2 className="font-bold">
                                        Payment Records
                                    </h2>
                                    <p className="text-xs text-slate-600">
                                        Your payment database
                                    </p>
                                </div>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-semibold text-slate-400">
                                {filteredPayments.length} records
                            </span>
                        </div>

                        <div className="border-b border-slate-800 bg-slate-950/50 px-3 py-3 sm:px-5">
                            <div className="flex w-full items-center gap-2 overflow-x-auto">
                                <div className="flex shrink-0 gap-2">
                                    <PaymentTab
                                        active={activeTab === "all"}
                                        label="All Payments"
                                        count={activePayments.length}
                                        onClick={() => changeTab("all")}
                                    />
                                    <PaymentTab
                                        active={activeTab === "Fully Paid"}
                                        label="Fully Paid"
                                        count={fullyPaidPayments.length}
                                        icon={<CheckCircle size={14} />}
                                        onClick={() => changeTab("Fully Paid")}
                                    />
                                    <PaymentTab
                                        active={activeTab === "Partially Paid"}
                                        label="Partially Paid"
                                        count={partiallyPaidPayments.length}
                                        icon={<Clock size={14} />}
                                        onClick={() =>
                                            changeTab("Partially Paid")
                                        }
                                    />
                                    <PaymentTab
                                        active={activeTab === "Due"}
                                        label="Due"
                                        count={duePayments.length}
                                        icon={<AlertCircle size={14} />}
                                        onClick={() => changeTab("Due")}
                                    />
                                </div>
                                <div className="ml-auto shrink-0 border-l border-slate-800 pl-3">
                                    <button
                                        type="button"
                                        onClick={() => changeTab("Archive")}
                                        className={[
                                            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition",
                                            activeTab === "Archive"
                                                ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                                                : "border-slate-700 bg-slate-900 text-slate-400 hover:border-yellow-400/30 hover:text-yellow-300",
                                        ].join(" ")}
                                    >
                                        <Archive size={15} />
                                        Archive
                                        <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-[9px]">
                                            {archivedPayments.length}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-3 pt-4 sm:px-5">
                            <div className="flex items-center gap-3 rounded-2xl border border-yellow-400/15 bg-slate-950/80 px-4 py-3">
                                <Search size={19} className="text-yellow-400" />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder={
                                        activeTab === "Archive"
                                            ? "Search archived payments..."
                                            : "Search client, invoice, receipt..."
                                    }
                                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="text-slate-500 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeTab === "Archive" && (
                            <div className="mx-3 mt-4 rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4 sm:mx-5">
                                <div className="flex items-start gap-3">
                                    <Archive
                                        size={19}
                                        className="mt-0.5 shrink-0 text-yellow-400"
                                    />
                                    <div>
                                        <p className="text-xs font-black text-yellow-300">
                                            Payment Archive
                                        </p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                            Fully Paid payments can be manually
                                            archived. Archived records remain
                                            for{" "}
                                            <strong className="text-slate-300">
                                                90 days
                                            </strong>
                                            . Permanent deletion is scheduled
                                            after{" "}
                                            <strong className="text-slate-300">
                                                6 months
                                            </strong>{" "}
                                            retention.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 hidden md:block">
                            <div className="max-h-[560px] overflow-auto">
                                <table className="w-full min-w-[1350px] text-left">
                                    <thead className="sticky top-0 z-10 bg-slate-950">
                                        <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                                            <th className="px-4 py-3">
                                                Receipt
                                            </th>
                                            <th className="px-4 py-3">
                                                Client
                                            </th>
                                            <th className="px-4 py-3">
                                                Invoice
                                            </th>
                                            <th className="px-4 py-3">
                                                Method
                                            </th>
                                            <th className="px-4 py-3">
                                                Amount
                                            </th>
                                            <th className="px-4 py-3">
                                                VAT (12%)
                                            </th>
                                            <th className="px-4 py-3">Paid</th>
                                            <th className="px-4 py-3">
                                                Remaining
                                            </th>
                                            <th className="px-4 py-3">
                                                Status
                                            </th>
                                            <th className="px-4 py-3">Dates</th>
                                            {activeTab === "Archive" && (
                                                <th className="px-4 py-3">
                                                    Archive
                                                </th>
                                            )}
                                            <th className="px-4 py-3 text-center">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.map((payment) => {
                                            const archiveInfo =
                                                getArchiveInfo(payment);
                                            const vat =
                                                getVatBreakdown(payment);

                                            return (
                                                <tr
                                                    key={payment.id}
                                                    className="border-b border-slate-800/80 hover:bg-slate-800/30"
                                                >
                                                    <td className="px-4 py-4">
                                                        <p className="text-xs font-black text-white">
                                                            {payment.receipt}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-slate-600">
                                                            {payment.invoice}
                                                        </p>
                                                    </td>

                                                    {/* ✅ CLIENT WITH EMAIL */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-slate-300">
                                                                {payment.client}
                                                            </span>
                                                            {payment.clientEmail && (
                                                                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                                                                    <Mail
                                                                        size={
                                                                            11
                                                                        }
                                                                    />
                                                                    {
                                                                        payment.clientEmail
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        {payment.invoiceId &&
                                                        payment.invoiceNumber ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    router.visit(
                                                                        `/billing-invoicing/${payment.invoiceId}`,
                                                                    );
                                                                }}
                                                                className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:text-yellow-300 hover:underline"
                                                            >
                                                                {
                                                                    payment.invoiceNumber
                                                                }
                                                                <ExternalLink
                                                                    size={12}
                                                                />
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">
                                                                {
                                                                    payment.invoice
                                                                }
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Banknote
                                                                size={14}
                                                                className="text-yellow-400"
                                                            />
                                                            <span className="text-xs text-slate-400">
                                                                {payment.method}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-yellow-400">
                                                                {visiblePaymentId ===
                                                                payment.id
                                                                    ? formatMoney(
                                                                          payment.amount,
                                                                      )
                                                                    : MASKED_AMOUNT}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    togglePaymentAmount(
                                                                        payment.id,
                                                                    )
                                                                }
                                                                className="rounded-md border border-slate-700 p-1.5 text-slate-500 hover:text-yellow-400"
                                                            >
                                                                {visiblePaymentId ===
                                                                payment.id ? (
                                                                    <EyeOff
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <Eye
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="min-w-[150px]">
                                                            <p className="text-xs font-black text-cyan-300">
                                                                {visiblePaymentId ===
                                                                payment.id
                                                                    ? formatMoney(
                                                                          vat.vatAmount,
                                                                      )
                                                                    : MASKED_AMOUNT}
                                                            </p>
                                                            <p className="mt-1 text-[9px] text-slate-600">
                                                                VAT{" "}
                                                                {vat.vatRate}% •
                                                                Net{" "}
                                                                {visiblePaymentId ===
                                                                payment.id
                                                                    ? formatMoney(
                                                                          vat.netOfVat,
                                                                      )
                                                                    : MASKED_AMOUNT}
                                                            </p>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <span className="text-xs font-bold text-green-400">
                                                            {visiblePaymentId ===
                                                            payment.id
                                                                ? formatMoney(
                                                                      Number(
                                                                          payment.paidAmount ||
                                                                              0,
                                                                      ),
                                                                  )
                                                                : MASKED_AMOUNT}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={[
                                                                "text-xs font-black",
                                                                Number(
                                                                    payment.remainingBalance ||
                                                                        0,
                                                                ) > 0
                                                                    ? "text-red-400"
                                                                    : "text-green-400",
                                                            ].join(" ")}
                                                        >
                                                            {visiblePaymentId ===
                                                            payment.id
                                                                ? formatMoney(
                                                                      Number(
                                                                          payment.remainingBalance ||
                                                                              0,
                                                                      ),
                                                                  )
                                                                : MASKED_AMOUNT}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <Status
                                                            status={
                                                                payment.status
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="min-w-[170px] space-y-1">
                                                            <DateRow
                                                                label="Partial"
                                                                value={
                                                                    payment.partialPaymentDate ||
                                                                    "—"
                                                                }
                                                            />
                                                            <DateRow
                                                                label="Paid"
                                                                value={
                                                                    payment.paymentDate ||
                                                                    "—"
                                                                }
                                                            />
                                                            <DateRow
                                                                label="Due"
                                                                value={
                                                                    payment.dueDate ||
                                                                    "—"
                                                                }
                                                            />
                                                        </div>
                                                    </td>

                                                    {activeTab ===
                                                        "Archive" && (
                                                        <td className="px-4 py-4">
                                                            {archiveInfo ? (
                                                                <div className="min-w-[190px]">
                                                                    <div className="flex items-center gap-2">
                                                                        <CalendarDays
                                                                            size={
                                                                                14
                                                                            }
                                                                            className="text-yellow-400"
                                                                        />
                                                                        <span className="text-[10px] font-bold text-slate-300">
                                                                            90-days
                                                                            archive
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-1 text-[10px] text-slate-500">
                                                                        Expires:{" "}
                                                                        {
                                                                            archiveInfo.expiration
                                                                        }
                                                                    </p>
                                                                    <p
                                                                        className={[
                                                                            "mt-1 text-[10px] font-bold",
                                                                            archiveInfo.expired
                                                                                ? "text-red-400"
                                                                                : "text-yellow-400",
                                                                        ].join(
                                                                            " ",
                                                                        )}
                                                                    >
                                                                        {archiveInfo.expired
                                                                            ? "Archive expired"
                                                                            : `${archiveInfo.daysUntilExpiration} days remaining`}
                                                                    </p>
                                                                    <p className="mt-1 text-[9px] text-slate-600">
                                                                        Auto-delete:{" "}
                                                                        {
                                                                            archiveInfo.deleteDate
                                                                        }
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </td>
                                                    )}

                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            data-payment-trigger
                                                            onClick={(event) =>
                                                                openActionMenu(
                                                                    event,
                                                                    payment.id,
                                                                )
                                                            }
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:border-yellow-400/40 hover:text-yellow-400"
                                                        >
                                                            <MoreVertical
                                                                size={18}
                                                            />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* MOBILE - WITH CLIENT EMAIL */}
                        <div className="space-y-3 p-3 md:hidden">
                            {filteredPayments.map((payment) => {
                                const archiveInfo = getArchiveInfo(payment);
                                const vat = getVatBreakdown(payment);

                                return (
                                    <div
                                        key={payment.id}
                                        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[9px] uppercase text-slate-600">
                                                    Receipt
                                                </p>
                                                <p className="mt-1 font-black">
                                                    {payment.receipt}
                                                </p>
                                                <p className="mt-1 text-[10px] text-slate-600">
                                                    {payment.invoice}
                                                </p>
                                                {payment.clientEmail && (
                                                    <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-500">
                                                        <Mail size={10} />
                                                        {payment.clientEmail}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Status
                                                    status={payment.status}
                                                />
                                                <button
                                                    type="button"
                                                    data-payment-trigger
                                                    onClick={(event) =>
                                                        openActionMenu(
                                                            event,
                                                            payment.id,
                                                        )
                                                    }
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <PaymentDetail
                                                label="Client"
                                                value={payment.client}
                                            />
                                            <PaymentDetail
                                                label="Client Email"
                                                value={
                                                    payment.clientEmail || "—"
                                                }
                                            />
                                            <PaymentDetail
                                                label="Method"
                                                value={payment.method}
                                            />
                                            <PaymentDetail
                                                label="Total Amount"
                                                value={
                                                    visiblePaymentId ===
                                                    payment.id
                                                        ? formatMoney(
                                                              payment.amount,
                                                          )
                                                        : MASKED_AMOUNT
                                                }
                                            />
                                            <PaymentDetail
                                                label={`VAT (${vat.vatRate}%)`}
                                                value={
                                                    visiblePaymentId ===
                                                    payment.id
                                                        ? formatMoney(
                                                              vat.vatAmount,
                                                          )
                                                        : MASKED_AMOUNT
                                                }
                                            />
                                            <PaymentDetail
                                                label="Net of VAT"
                                                value={
                                                    visiblePaymentId ===
                                                    payment.id
                                                        ? formatMoney(
                                                              vat.netOfVat,
                                                          )
                                                        : MASKED_AMOUNT
                                                }
                                            />
                                            <PaymentDetail
                                                label="Paid Amount"
                                                value={
                                                    visiblePaymentId ===
                                                    payment.id
                                                        ? formatMoney(
                                                              Number(
                                                                  payment.paidAmount ||
                                                                      0,
                                                              ),
                                                          )
                                                        : MASKED_AMOUNT
                                                }
                                            />
                                            <PaymentDetail
                                                label="Remaining Balance"
                                                value={
                                                    visiblePaymentId ===
                                                    payment.id
                                                        ? formatMoney(
                                                              Number(
                                                                  payment.remainingBalance ||
                                                                      0,
                                                              ),
                                                          )
                                                        : MASKED_AMOUNT
                                                }
                                            />
                                            <PaymentDetail
                                                label="Due Date"
                                                value={payment.dueDate || "—"}
                                            />
                                            <PaymentDetail
                                                label="Partial Payment"
                                                value={
                                                    payment.partialPaymentDate ||
                                                    "—"
                                                }
                                            />
                                            <PaymentDetail
                                                label="Payment Date"
                                                value={
                                                    payment.paymentDate || "—"
                                                }
                                            />
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    togglePaymentAmount(
                                                        payment.id,
                                                    )
                                                }
                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-400"
                                            >
                                                {visiblePaymentId ===
                                                payment.id ? (
                                                    <>
                                                        <EyeOff size={13} />{" "}
                                                        Hide
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye size={13} /> Show
                                                        Amount
                                                    </>
                                                )}
                                            </button>
                                            {activeTab === "Archive" &&
                                                archiveInfo && (
                                                    <div className="text-right">
                                                        <p className="text-[9px] text-slate-600">
                                                            Archive expires
                                                        </p>
                                                        <p className="text-[10px] font-bold text-yellow-400">
                                                            {
                                                                archiveInfo.expiration
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredPayments.length === 0 && (
                            <div className="px-5 py-16 text-center">
                                <FileText
                                    size={30}
                                    className="mx-auto text-slate-700"
                                />
                                <p className="mt-3 text-sm font-bold text-slate-400">
                                    No payment records found
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                    Try another search or payment status.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {openMenuId !== null && (
                    <ActionMenu
                        top={menuPosition.top}
                        left={menuPosition.left}
                        payment={
                            payments.find(
                                (payment) => payment.id === openMenuId,
                            ) || null
                        }
                        onView={handleView}
                        onPrint={handlePrintSOA}
                        onDownload={handleDownload}
                        onArchive={handleArchive}
                        onRestore={handleRestore}
                        onSendEmail={openEmailForm}
                    />
                )}

                {selectedPayment && (
                    <ViewPaymentModal
                        payment={selectedPayment}
                        onClose={() => setSelectedPayment(null)}
                        onPrint={handlePrintSOA}
                        onSendEmail={openEmailForm}
                    />
                )}

                {showEmailForm && (
                    <EmailFormModal
                        paymentId={emailFormData.paymentId}
                        receipt={emailFormData.receipt}
                        client={emailFormData.client}
                        email={emailFormData.email}
                        subject={emailFormData.subject}
                        message={emailFormData.message}
                        onEmailChange={(value) =>
                            setEmailFormData((prev) => ({
                                ...prev,
                                email: value,
                            }))
                        }
                        onSubjectChange={(value) =>
                            setEmailFormData((prev) => ({
                                ...prev,
                                subject: value,
                            }))
                        }
                        onMessageChange={(value) =>
                            setEmailFormData((prev) => ({
                                ...prev,
                                message: value,
                            }))
                        }
                        error={emailFormError}
                        onClose={() => {
                            setShowEmailForm(false);
                            setEmailFormError("");
                        }}
                        onSubmit={handleSendEmail}
                        isSending={sendingEmail === emailFormData.paymentId}
                    />
                )}
            </UserLayout>
        </>
    );
}

// ============================================================
// COMPONENTS
// ============================================================

function PaymentTab({
    active,
    label,
    count,
    icon,
    onClick,
}: {
    active: boolean;
    label: string;
    count: number;
    icon?: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition",
                active
                    ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                    : "border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300",
            ].join(" ")}
        >
            {icon}
            {label}
            <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-[9px]">
                {count}
            </span>
        </button>
    );
}

function SummaryCard({
    icon,
    title,
    value,
    showEye,
    visible,
    onToggle,
    onClick,
    active = false,
    hint,
}: {
    icon: React.ReactNode;
    title: string;
    value: string;
    showEye?: boolean;
    visible?: boolean;
    onToggle?: () => void;
    onClick?: () => void;
    active?: boolean;
    hint?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "group rounded-2xl border p-4 text-left shadow-xl transition",
                active
                    ? "border-yellow-400/60 bg-yellow-400/10 ring-2 ring-yellow-400/30"
                    : "border-slate-800 bg-slate-900/80 hover:border-yellow-400/40 hover:bg-slate-900",
                onClick ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
        >
            <div className="flex items-center justify-between">
                <div
                    className={[
                        "flex h-10 w-10 items-center justify-center rounded-xl transition",
                        active
                            ? "bg-yellow-400 text-slate-950"
                            : "bg-yellow-400/10 text-yellow-400 group-hover:bg-yellow-400/20",
                    ].join(" ")}
                >
                    {icon}
                </div>
                {showEye && onToggle && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggle();
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                onToggle();
                            }
                        }}
                        className="rounded-lg border border-slate-800 p-2 text-slate-500 transition hover:text-yellow-400"
                    >
                        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </span>
                )}
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {title}
            </p>
            <p className="mt-1 truncate text-xl font-black">{value}</p>
            {hint && (
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    {hint}
                </p>
            )}
        </button>
    );
}

function Status({ status }: { status: string }) {
    const normalized = status.toLowerCase().trim();
    let classes = "border-slate-700 bg-slate-800 text-slate-400";

    if (normalized === "fully paid")
        classes = "border-green-400/20 bg-green-400/10 text-green-400";
    if (normalized === "partially paid")
        classes = "border-yellow-400/20 bg-yellow-400/10 text-yellow-300";
    if (normalized === "due")
        classes = "border-red-400/20 bg-red-400/10 text-red-400";

    return (
        <span
            className={[
                "inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider",
                classes,
            ].join(" ")}
        >
            {status}
        </span>
    );
}

function DateRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase text-slate-600">
                {label}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
                {value}
            </span>
        </div>
    );
}

function VatRow({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-5 py-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                {label}
            </span>
            <span
                className={`text-xs font-black ${highlight ? "text-cyan-700" : "text-slate-900"}`}
            >
                {value}
            </span>
        </div>
    );
}

function PaymentDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                {label}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-300">
                {value}
            </p>
        </div>
    );
}

function ActionMenu({
    top,
    left,
    payment,
    onView,
    onPrint,
    onDownload,
    onArchive,
    onRestore,
    onSendEmail,
}: {
    top: number;
    left: number;
    payment: Payment | null;
    onView: (payment: Payment) => void;
    onPrint: (payment: Payment) => void;
    onDownload: (payment: Payment) => void;
    onArchive: (payment: Payment) => void;
    onRestore: (payment: Payment) => void;
    onSendEmail: (payment: Payment) => void;
}) {
    if (!payment) return null;

    const archiveInfo = getArchiveInfo(payment);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const [adjustedPosition, setAdjustedPosition] = useState({ top, left });

    useEffect(() => {
        setAdjustedPosition({ top, left });

        const positionMenu = () => {
            const menu = menuRef.current;
            if (!menu) return;

            const rect = menu.getBoundingClientRect();
            const padding = 10;
            const gap = 8;

            let nextTop = top;
            let nextLeft = left;

            if (rect.bottom > window.innerHeight - padding) {
                nextTop = Math.max(padding, top - rect.height - gap);
            }
            nextTop = Math.min(
                nextTop,
                Math.max(padding, window.innerHeight - rect.height - padding),
            );

            const maxLeft = window.innerWidth - rect.width - padding;
            nextLeft = Math.max(padding, Math.min(nextLeft, maxLeft));

            setAdjustedPosition({ top: nextTop, left: nextLeft });
        };

        const frame = window.requestAnimationFrame(positionMenu);
        window.addEventListener("resize", positionMenu);
        window.addEventListener("scroll", positionMenu, true);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", positionMenu);
            window.removeEventListener("scroll", positionMenu, true);
        };
    }, [top, left]);

    return (
        <div
            ref={menuRef}
            data-payment-menu
            className="fixed z-[99999] w-[235px] max-w-[calc(100vw-20px)] max-h-[calc(100vh-20px)] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
            style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
        >
            <div className="border-b border-slate-800 px-3 py-3">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                    {payment.receipt}
                </p>
                <p className="mt-1 text-[10px] text-slate-700">
                    {payment.invoice}
                </p>
            </div>
            <div className="p-1.5">
                <ActionButton
                    icon={<Eye size={15} />}
                    label="View Payment"
                    onClick={() => onView(payment)}
                />
                <ActionButton
                    icon={<Mail size={15} />}
                    label="Send Email"
                    onClick={() => onSendEmail(payment)}
                />
                <ActionButton
                    icon={<Printer size={15} />}
                    label="Print Summary"
                    onClick={() => onPrint(payment)}
                />
                <ActionButton
                    icon={<Download size={15} />}
                    label="Download"
                    onClick={() => onDownload(payment)}
                />
                <div className="my-1 border-t border-slate-800" />
                {payment.archived ? (
                    archiveInfo?.expired ? (
                        <ActionButton
                            icon={<AlertCircle size={15} />}
                            label="Archive Expired"
                            danger
                            onClick={() =>
                                window.alert(
                                    "This archive has expired and is scheduled for retention deletion.",
                                )
                            }
                        />
                    ) : (
                        <ActionButton
                            icon={<ArchiveRestore size={15} />}
                            label="Restore Payment"
                            onClick={() => onRestore(payment)}
                        />
                    )
                ) : payment.status === "Fully Paid" ? (
                    <ActionButton
                        icon={<Archive size={15} />}
                        label="Archive Payment"
                        onClick={() => onArchive(payment)}
                    />
                ) : (
                    <div className="px-3 py-2.5 text-[10px] leading-relaxed text-slate-600">
                        Only Fully Paid payments can be archived.
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionButton({
    icon,
    label,
    onClick,
    danger = false,
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition",
                disabled
                    ? "cursor-not-allowed opacity-50"
                    : danger
                      ? "text-red-400 hover:bg-red-400/10"
                      : "text-slate-400 hover:bg-yellow-400/10 hover:text-yellow-300",
            ].join(" ")}
        >
            {icon}
            {label}
        </button>
    );
}

function EmailFormModal({
    paymentId,
    receipt,
    client,
    email,
    subject,
    message,
    onEmailChange,
    onSubjectChange,
    onMessageChange,
    error,
    onClose,
    onSubmit,
    isSending,
}: {
    paymentId: number;
    receipt: string;
    client: string;
    email: string;
    subject: string;
    message: string;
    onEmailChange: (value: string) => void;
    onSubjectChange: (value: string) => void;
    onMessageChange: (value: string) => void;
    error: string;
    onClose: () => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    isSending: boolean;
}) {
    return (
        <div
            data-email-form
            className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSending) onClose();
            }}
        >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-yellow-400/20 bg-slate-900 shadow-2xl">
                <div className="border-b border-slate-800 px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10 text-blue-400">
    <Mail size={17} />
</div>
<div>
    <h2 className="text-base font-black text-white">
        Send Email
    </h2>
    <p className="text-[11px] text-slate-500">
        Enter the client's email address and details
    </p>
</div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="rounded-xl border border-slate-700 p-2 text-slate-500 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

               <form onSubmit={onSubmit} className="p-4 space-y-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
    <div className="grid grid-cols-2 gap-3">
        <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                Receipt
            </p>
            <p className="mt-0.5 text-xs font-bold text-white">
                {receipt}
            </p>
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                Client
            </p>
            <p className="mt-0.5 text-xs font-bold text-white">
                {client}
            </p>
        </div>
    </div>
    <div className="mt-2.5 rounded-md border border-blue-400/20 bg-blue-400/5 p-2">
        <div className="flex items-center gap-1.5">
            <FileText size={12} className="text-blue-400" />
            <span className="text-[9px] font-bold text-blue-300">
                Account Summary
            </span>
        </div>
    </div>
</div>

                    <div>
                       <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
    <AtSign size={13} className="text-slate-600" />
    Client Email Address
    <span className="text-yellow-400">*</span>
</label>
<div className="relative">
    <UserRound
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
    />
    <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="Enter client email address"
        className={[
            "w-full rounded-lg border bg-slate-950 py-2 pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-slate-600",
            error
                ? "border-red-400/50 focus:border-red-400/50 focus:ring-2 focus:ring-red-400/10"
                : "border-slate-700 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10",
        ].join(" ")}
        disabled={isSending}
        autoFocus
    />
</div>
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
    <FileText size={13} className="text-slate-600" />
    Email Subject
    <span className="text-yellow-400">*</span>
</label>
<input
    type="text"
    value={subject}
    onChange={(e) => onSubjectChange(e.target.value)}
    placeholder="Enter email subject"
    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10"
    disabled={isSending}
/>
                    </div>

                    <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
    <Mail size={13} className="text-slate-600" />
    Email Message
</label>
<textarea
    rows={4}
    value={message}
    onChange={(e) => onMessageChange(e.target.value)}
    placeholder="Enter your email message..."
    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 px-3 text-[11px] text-white placeholder:text-slate-600 outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 resize-y"
    disabled={isSending}
/>
<p className="mt-1 text-[9px] text-slate-500">
    The payment receipt will be attached as a PDF/Text document.
</p>
                    </div>

                    {error && (
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                            <AlertCircle size={14} /> {error}
                        </p>
                    )}

                   <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
    <button
        type="button"
        onClick={onClose}
        disabled={isSending}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 px-4 text-xs font-bold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
        Cancel
    </button>
    <button
        type="submit"
        disabled={isSending}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
                            {isSending ? (
                                <>
                                    <Loader2
                                        size={17}
                                        className="animate-spin"
                                    />{" "}
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={17} /> Send Email
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ViewPaymentModal({
    payment,
    onClose,
    onPrint,
    onSendEmail,
}: {
    payment: Payment;
    onClose: () => void;
    onPrint: (payment: Payment) => void;
    onSendEmail: (payment: Payment) => void;
}) {
    const transactions = payment.transactions || [];

    const rawStatus = String(payment.status ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    let statusLabel = "PENDING";
    let statusClass = "border-yellow-300 bg-yellow-50 text-yellow-700";

    if (
        rawStatus === "paid" ||
        rawStatus === "fully paid" ||
        rawStatus === "fullypaid" ||
        rawStatus === "complete" ||
        rawStatus === "completed"
    ) {
        statusLabel = "FULLY PAID";
        statusClass = "border-emerald-300 bg-emerald-50 text-emerald-700";
    } else if (
        rawStatus === "partial" ||
        rawStatus === "partially paid" ||
        rawStatus === "partiallypaid"
    ) {
        statusLabel = "PARTIALLY PAID";
        statusClass = "border-blue-300 bg-blue-50 text-blue-700";
    } else if (rawStatus === "due" || rawStatus === "overdue") {
        statusLabel = "DUE";
        statusClass = "border-red-300 bg-red-50 text-red-700";
    } else if (rawStatus === "rejected") {
        statusLabel = "REJECTED";
        statusClass = "border-red-300 bg-red-50 text-red-700";
    }

    const totalAmount = Number(payment.amount || 0);
    const paidAmount = Number(payment.paidAmount || 0);
    const remainingBalance = Number(payment.remainingBalance || 0);
    const vat = getVatBreakdown(payment);

    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6">
            <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-yellow-400/20 bg-slate-950 shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-400">
                            Payment Management
                        </p>
                        <h2 className="mt-1 text-base font-black text-white sm:text-lg">
                            Payment Document
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-500 transition hover:border-slate-700 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto bg-slate-800/80 p-3 sm:p-6">
                    <div className="mx-auto w-full max-w-[820px] overflow-hidden bg-white text-slate-900 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
                        <div className="border-b-4 border-yellow-400 px-6 py-6 sm:px-10 sm:py-8">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-slate-900 text-xl font-black tracking-widest">
                                        A
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black tracking-[0.12em] text-slate-950 sm:text-3xl">
                                            ALIBATON
                                        </h1>
                                        <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                            Heavy Equipment & Logistics
                                            Management System                                        </p>
                                        <p className="mt-1 text-[8px] text-slate-400">
                                            45 Riverside, Quezon City,
                                            Philippines
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        Official Receipt
                                    </p>
                                    <p className="mt-1 text-lg font-black text-slate-950">
                                        {payment.receipt}
                                    </p>
                                    <p className="mt-1 text-[8px] uppercase tracking-wider text-slate-400">
                                        Payment Statement
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-b border-slate-200 px-6 py-5 sm:px-10">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        Transaction Record
                                    </p>
                                    <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                                        PAYMENT STATEMENT
                                    </h2>
                                    <p className="mt-1 text-[9px] text-slate-500">
                                        Official record of payment transaction
                                    </p>
                                </div>
                                <div className="flex flex-col items-start gap-1 sm:items-end">
                                    <span className="text-[7px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        Payment Status
                                    </span>
                                    <div
                                        className={`inline-flex min-w-[130px] items-center justify-center rounded-full border px-5 py-2.5 text-[10px] font-black tracking-[0.12em] ${statusClass}`}
                                    >
                                        {statusLabel}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {payment.invoiceId && payment.invoiceNumber && (
                            <div className="px-6 py-4 sm:px-10">
                                <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 flex items-center justify-between">
                                    <p className="text-sm font-bold text-blue-800">
                                        Linked Invoice
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            router.visit(
                                                `/billing-invoicing/${payment.invoiceId}`,
                                            );
                                            onClose();
                                        }}
                                        className="flex items-center gap-2 font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        {payment.invoiceNumber}
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="px-6 py-5 sm:px-10">
                            <div className="mb-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                Account Information
                            </div>
                            <div className="grid grid-cols-1 border border-slate-200 sm:grid-cols-2">
                                <div className="border-b border-slate-200 p-4 sm:border-r">
                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                        Client
                                    </p>
                                    <p className="mt-1 break-words text-sm font-bold text-slate-900">
                                        {payment.client}
                                    </p>
                                    {payment.clientEmail && (
                                        <p className="mt-1 text-[10px] text-slate-500">
                                            {payment.clientEmail}
                                        </p>
                                    )}
                                </div>
                                <div className="border-b border-slate-200 p-4">
                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                        Invoice Number
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                        {payment.invoice}
                                    </p>
                                </div>
                                <div className="border-b border-slate-200 p-4 sm:border-r sm:border-b-0">
                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                        Payment Method
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                        {payment.method}
                                    </p>
                                </div>
                                <div className="p-4">
                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                        Receipt Number
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                        {payment.receipt}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 sm:px-10">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                        Sales Invoice Items
                                    </p>
                                    <p className="mt-1 text-[9px] text-slate-400">
                                        Items billed under the linked sales
                                        invoice
                                    </p>
                                </div>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[8px] font-black uppercase text-slate-500">
                                    Invoice Details
                                </span>
                            </div>
                            {payment.invoiceItems &&
                            payment.invoiceItems.length > 0 ? (
                                <div className="overflow-x-auto border border-slate-200">
                                    <table className="w-full min-w-[620px] border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="w-[70px] px-4 py-3 text-center text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Qty
                                                </th>
                                                <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Particulars
                                                </th>
                                                <th className="w-[150px] px-4 py-3 text-right text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Unit Price
                                                </th>
                                                <th className="w-[150px] px-4 py-3 text-right text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payment.invoiceItems.map(
                                                (item, index) => (
                                                    <tr
                                                        key={item.id ?? index}
                                                        className="border-b border-slate-100 last:border-0"
                                                    >
                                                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-800">
                                                            {Number(
                                                                item.qty || 0,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                                                            {item.particulars ||
                                                                "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs font-bold text-slate-800">
                                                            {formatMoney(
                                                                Number(
                                                                    item.unitPrice ||
                                                                        0,
                                                                ),
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs font-black text-slate-950">
                                                            {formatMoney(
                                                                Number(
                                                                    item.amount ||
                                                                        0,
                                                                ),
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center">
                                    <p className="text-xs font-semibold text-slate-500">
                                        No sales invoice items were returned by
                                        the server.
                                    </p>
                                    <p className="mt-1 text-[10px] text-slate-400">
                                        Make sure the Payment controller
                                        eager-loads the linked invoice items.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mx-6 border border-slate-200 sm:mx-10">
                            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                                    Payment Summary
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3">
                                <div className="border-b border-slate-200 p-5 sm:border-r">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                        Total Amount
                                    </p>
                                    <p className="mt-2 text-lg font-black text-slate-950">
                                        {formatMoney(totalAmount)}
                                    </p>
                                </div>
                                <div className="border-b border-slate-200 p-5 sm:border-r">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                        Paid Amount
                                    </p>
                                    <p className="mt-2 text-lg font-black text-emerald-600">
                                        {formatMoney(paidAmount)}
                                    </p>
                                </div>
                                <div className="p-5">
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                        Remaining Balance
                                    </p>
                                    <p
                                        className={`mt-2 text-lg font-black ${remainingBalance > 0 ? "text-red-600" : "text-slate-950"}`}
                                    >
                                        {formatMoney(remainingBalance)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mx-6 mt-5 overflow-hidden border border-slate-200 sm:mx-10">
                            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                                        VAT Computation
                                    </p>
                                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[8px] font-black text-cyan-700">
                                        VAT {vat.vatRate}%
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                <VatRow
                                    label="Total Sales"
                                    value={formatMoney(vat.totalSales)}
                                />
                                <VatRow
                                    label="Net of VAT / Taxable Sales"
                                    value={formatMoney(vat.netOfVat)}
                                />
                                <VatRow
                                    label={`VAT (${vat.vatRate}%)`}
                                    value={formatMoney(vat.vatAmount)}
                                    highlight
                                />
                                <VatRow
                                    label="Withholding Tax"
                                    value={`(${formatMoney(vat.withholdingTax)})`}
                                />
                                <div className="flex items-center justify-between bg-yellow-50 px-5 py-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                        Total Amount Due
                                    </span>
                                    <span className="text-lg font-black text-slate-950">
                                        {formatMoney(vat.totalAmountDue)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 sm:px-10">
                            <div className="mb-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                Payment Details
                            </div>
                            <table className="w-full border-collapse border border-slate-200">
                                <tbody>
                                    <tr>
                                        <td className="w-[38%] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                            Payment Date
                                        </td>
                                        <td className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-900">
                                            {payment.paymentDate || "—"}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                            Due Date
                                        </td>
                                        <td className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-900">
                                            {payment.dueDate || "—"}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                            Partial Payment Date
                                        </td>
                                        <td className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-900">
                                            {payment.partialPaymentDate || "—"}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="bg-slate-50 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                            Payment Status
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full border px-3 py-1.5 text-[8px] font-black tracking-wider ${statusClass}`}
                                            >
                                                {statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 pb-5 sm:px-10">
                            <div className="mb-3 flex items-center gap-2">
                                <Receipt size={14} className="text-slate-500" />
                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                                    Transaction History
                                </p>
                            </div>
                            {transactions.length > 0 ? (
                                <div className="overflow-hidden border border-slate-200">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Type
                                                </th>
                                                <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Date
                                                </th>
                                                <th className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-wider text-slate-500">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(
                                                (transaction, index) => (
                                                    <tr
                                                        key={
                                                            transaction.id ??
                                                            index
                                                        }
                                                        className="border-b border-slate-100 last:border-0"
                                                    >
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-800">
                                                            {transaction.type ||
                                                                "Payment"}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-500">
                                                            {transaction.date ||
                                                                "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs font-black text-slate-900">
                                                            {formatMoney(
                                                                Number(
                                                                    transaction.amount ||
                                                                        0,
                                                                ),
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center">
                                    <p className="text-xs text-slate-400">
                                        No payment transactions recorded.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mx-6 border border-slate-200 bg-slate-50 px-5 py-4 sm:mx-10">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Payment Notes
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                                {payment.notes || "No notes provided."}
                            </p>
                        </div>

                        {payment.archived &&
                            (() => {
                                const archiveInfo = getArchiveInfo(payment);
                                if (!archiveInfo) return null;

                                return (
                                    <div className="mx-6 mt-5 border border-yellow-300 bg-yellow-50 px-5 py-4 sm:mx-10">
                                        <div className="flex items-center gap-2">
                                            <Archive
                                                size={15}
                                                className="text-yellow-600"
                                            />
                                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-yellow-700">
                                                Archive Information
                                            </p>
                                        </div>
                                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                            <div>
                                                <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                                                    Archived
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-slate-800">
                                                    {payment.archived_at || "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                                                    Archive Expires
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-slate-800">
                                                    {archiveInfo.expiration}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                                                    Retention Delete
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-slate-800">
                                                    {archiveInfo.deleteDate}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                        <div className="px-6 pb-8 pt-10 sm:px-10">
                            <div className="grid gap-10 sm:grid-cols-2">
                                <div>
                                    <div className="h-8 border-b border-slate-400" />
                                    <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-wider text-slate-500">
                                        Client / Authorized Representative
                                    </p>
                                </div>
                                <div>
                                    <div className="h-8 border-b border-slate-400" />
                                    <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-wider text-slate-500">
                                        ALIBATON Finance / Authorized Staff
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 px-6 py-4 sm:px-10">
                            <div className="flex flex-col gap-2 text-[7px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                                <span>ALIBATON Payment Management System</span>
                                <span>
                                    Document Status:{" "}
                                    <strong>{statusLabel}</strong>
                                </span>
                                <span>
                                    Printed:{" "}
                                    {new Date().toLocaleDateString("en-PH")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-800 bg-slate-950 px-5 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => onSendEmail(payment)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 px-5 py-2.5 text-xs font-black text-blue-400 shadow-lg shadow-blue-400/5 transition hover:bg-blue-400/20"
                    >
                        <Mail size={15} /> Send SOA
                    </button>
                    <button
                        type="button"
                        onClick={() => onPrint(payment)}
                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300"
                    >
                        <Printer size={15} /> Print SOA
                    </button>
                </div>
            </div>
        </div>
    );
}
