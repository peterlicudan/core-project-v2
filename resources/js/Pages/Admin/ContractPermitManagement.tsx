import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, useForm } from "@inertiajs/react";
import AdminLayout from "../../Layouts/AdminLayout";

import {
    AlertTriangle,
    Archive,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Download,
    Edit3,
    Eye,
    FileCheck2,
    FileText,
    Mail,
    MapPin,
    MoreVertical,
    RefreshCw,
    Search,
    Send,
    ShieldCheck,
    Trash2,
    X,
    XCircle,
} from "lucide-react";

// =========================================================
// TYPES
// =========================================================

type ContractStatus =
    | "Active"
    | "Pending"
    | "Needs Correction"
    | "Submitted for Review"
    | "Expiring Soon"
    | "Expired"
    | "Renewed"
    | "Archived";

interface Staff {
    id: number;
    name: string;
    email?: string | null;
}

interface InvoiceRecord {
    id: number;
    number: string;
    client: string;
    amount: number | string;
    project?: string | null;
    status?: string | null;
    contract_id?: number | null;
}

interface ContractFileRecord {
    id: number;
    type?: "contract" | "signed";
    file_path?: string | null;
    file_name: string;
    file_size?: number | null;
    mime_type?: string | null;
    created_at?: string | null;
}

interface ContractPermit {
    id: number;
    title?: string | null;
    name?: string | null;
    type?: string | null;
    contract_type?: string | null;
    is_permit?: boolean;
    isPermit?: boolean;
    description?: string | null;
    notes?: string | null;
    client?: string | null;
    client_name?: string | null;
    client_email?: string | null;
    email?: string | null;
    project?: string | null;
    project_name?: string | null;
    contract_no?: string | null;
    contract_number?: string | null;
    reference_number?: string | null;
    permit_number?: string | null;
    start_date?: string | null;
    issue_date?: string | null;
    end_date?: string | null;
    expiry_date?: string | null;
    status?: string | null;
    location?: string | null;
    invoice?: InvoiceRecord | null;
    invoice_id?: number | null;
    is_invoice_approved?: boolean | number | null;
    invoice_approved_at?: string | null;
    invoice_approved_by?: Staff | null;
    assigned_to?: number | Staff | null;
    assigned_staff?: Staff | null;
    staff?: Staff | null;
    creator?: Staff | null;
    rejection_reason?: string | null;
    correction_reason?: string | null;
    correctionReason?: string | null;
    archived?: boolean | number | null;
    is_archived?: boolean | number | null;
    isArchived?: boolean;
    days_until_expiry?: number | null;
    daysUntilExpiry?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    workflow_status?: string | null;
    workflowStatus?: string | null;
    contract_file_path?: string | null;
    contract_file_name?: string | null;
    signed_contract_path?: string | null;
    signed_contract_file_name?: string | null;
    sent_at?: string | null;
    submitted_at?: string | null;
    submitted_by?: Staff | null;
    reviewed_at?: string | null;
    reviewed_by?: Staff | null;
    approved_at?: string | null;
    calculatedStatus?: ContractStatus;
    invoiceApproved?: boolean;
    files?: ContractFileRecord[];
    contract_files?: ContractFileRecord[];
    signed_files?: ContractFileRecord[];
}

interface Props {
    contracts: ContractPermit[];
    contractPermits?: ContractPermit[];
    permits?: ContractPermit[];
    approvedInvoices?: InvoiceRecord[];
    staff?: Staff[];
}

// =========================================================
// ✅ PERMIT TYPES — para sa Edit modal dropdown
// =========================================================

const EDIT_TYPE_OPTIONS = [
    "Contract",
    "Construction Permit",
    "Equipment Permit",
    "Business Permit",
    "Building Permit",
    "Electrical Permit",
    "Sanitary Permit",
    "Fire Safety Permit",
    "Environmental Permit",
    "Zoning Permit",
    "Occupancy Permit",
    "Excavation Permit",
    "Road Closure Permit",
    "Health Permit",
    "Mayor's Permit",
    "Barangay Clearance",
    "DOLE Permit",
    "DENR Permit",
    "DPWH Permit",
    "BIR Permit",
    "LTO Permit",
    "License",
    "Certificate",
    "Other",
];

// =========================================================
// HELPERS
// =========================================================

const getTitle = (record: ContractPermit): string =>
    record.title ||
    record.name ||
    record.contract_type ||
    record.type ||
    "Contract & Permit";

/* ✅ UPDATED: Priority sa specific type */
const getType = (record: ContractPermit): string => {
    if (
        record.contract_type &&
        record.contract_type !== "Contract" &&
        record.contract_type !== "Permit"
    ) {
        return record.contract_type;
    }
    return record.type || record.contract_type || "Contract";
};

const getClient = (record: ContractPermit): string =>
    record.client || record.client_name || record.invoice?.client || "—";

const getClientEmail = (record: ContractPermit): string =>
    record.client_email || record.email || "";

const getProject = (record: ContractPermit): string =>
    record.project || record.project_name || record.invoice?.project || "—";

const getReference = (record: ContractPermit): string =>
    record.contract_no ||
    record.contract_number ||
    record.reference_number ||
    record.permit_number ||
    `CTR-${record.id}`;

const getStartDate = (record: ContractPermit): string | null =>
    record.start_date || record.issue_date || null;

const getExpiryDate = (record: ContractPermit): string | null =>
    record.end_date || record.expiry_date || null;

const getAssignedStaff = (record: ContractPermit): Staff | null => {
    if (record.assigned_staff && typeof record.assigned_staff === "object") {
        return record.assigned_staff;
    }
    if (record.staff && typeof record.staff === "object") {
        return record.staff;
    }
    return null;
};

const isInvoiceApproved = (record: ContractPermit): boolean =>
    record.is_invoice_approved === true ||
    record.is_invoice_approved === 1 ||
    Boolean(record.invoice_approved_at);

const isArchivedRecord = (record: ContractPermit): boolean =>
    Boolean(
        record.archived ||
        record.is_archived ||
        record.isArchived ||
        String(record.status || "").toLowerCase() === "archived",
    );

/* ✅ UPDATED: includes() check para sa specific types */
const isContractRecord = (record: ContractPermit): boolean => {
    const type = String(getType(record)).toLowerCase();
    return type === "contract" || type.includes("contract");
};

const isPermitRecord = (record: ContractPermit): boolean => {
    const type = String(getType(record)).toLowerCase();
    return type === "permit" || type.includes("permit");
};

const requiresInvoiceApproval = (record: ContractPermit): boolean =>
    isContractRecord(record);

const getCorrectionReason = (record: ContractPermit): string =>
    record.correction_reason ||
    record.correctionReason ||
    record.rejection_reason ||
    "";

const getContractFileCount = (record: ContractPermit): number => {
    if (record.contract_files && record.contract_files.length > 0) {
        return record.contract_files.length;
    }
    return record.contract_file_path ? 1 : 0;
};

const getSignedFileCount = (record: ContractPermit): number => {
    if (record.signed_files && record.signed_files.length > 0) {
        return record.signed_files.length;
    }
    return record.signed_contract_path ? 1 : 0;
};

const canApproveDirectly = (record: ContractPermit): boolean => {
    if (calculateStatus(record) !== "Submitted for Review") {
        return false;
    }

    if (isArchivedRecord(record)) {
        return false;
    }

    if (getContractFileCount(record) === 0) {
        return false;
    }

    if (isContractRecord(record)) {
        if (!isInvoiceApproved(record)) return false;
        if (getSignedFileCount(record) === 0) return false;
    }

    return true;
};

const formatDate = (value?: string | null): string => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const formatShortDate = (value?: string | null): string => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
        year: "2-digit",
        month: "short",
        day: "numeric",
    });
};

const daysUntil = (value?: string | null): number | null => {
    if (!value) return null;
    const target = new Date(value);
    if (Number.isNaN(target.getTime())) return null;
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil(
        (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
};

const calculateStatus = (record: ContractPermit): ContractStatus => {
    if (isArchivedRecord(record)) return "Archived";

    const rawStatus = String(
        record.workflow_status || record.workflowStatus || record.status || "",
    ).trim();

    if (rawStatus === "Needs Correction") return "Needs Correction";
    if (rawStatus === "Submitted for Review") return "Submitted for Review";
    if (rawStatus === "Renewed") return "Renewed";
    if (rawStatus === "Expired") return "Expired";
    if (!record.approved_at) return "Pending";

    const expiry = getExpiryDate(record);
    if (!expiry) return "Active";
    const remaining = daysUntil(expiry);
    if (remaining === null) return "Active";
    if (remaining < 0) return "Expired";
    if (remaining <= 30) return "Expiring Soon";
    return "Active";
};

const statusClasses = (status: ContractStatus): string => {
    switch (status) {
        case "Active":
            return "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400";
        case "Needs Correction":
            return "border-red-400/20 bg-red-400/[0.06] text-red-400";
        case "Submitted for Review":
            return "border-blue-400/20 bg-blue-400/[0.06] text-blue-400";
        case "Expiring Soon":
            return "border-orange-400/20 bg-orange-400/[0.06] text-orange-400";
        case "Expired":
            return "border-red-400/20 bg-red-400/[0.06] text-red-400";
        case "Renewed":
            return "border-violet-400/20 bg-violet-400/[0.06] text-violet-400";
        case "Archived":
            return "border-zinc-800 bg-zinc-900/50 text-zinc-500";
        default:
            return "border-yellow-400/20 bg-yellow-400/[0.06] text-yellow-400";
    }
};

const statusShortLabel = (status: ContractStatus): string => {
    switch (status) {
        case "Needs Correction":
            return "Correction";
        case "Submitted for Review":
            return "Review";
        case "Expiring Soon":
            return "Expiring";
        default:
            return status;
    }
};

const invoiceBadgeClasses = (approved: boolean): string =>
    approved
        ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-400"
        : "border-yellow-400/20 bg-yellow-400/[0.05] text-yellow-400";

const statusIcon = (status: ContractStatus): React.ReactNode => {
    switch (status) {
        case "Active":
            return <CheckCircle2 size={12} />;
        case "Needs Correction":
            return <AlertTriangle size={12} />;
        case "Submitted for Review":
            return <Send size={12} />;
        case "Expiring Soon":
            return <AlertTriangle size={12} />;
        case "Expired":
            return <XCircle size={12} />;
        case "Renewed":
            return <RefreshCw size={12} />;
        case "Archived":
            return <Archive size={12} />;
        default:
            return <Clock3 size={12} />;
    }
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const truncate = (value: string, max: number = 30): string => {
    if (!value) return "—";
    return value.length > max ? value.slice(0, max) + "…" : value;
};

const SCROLL_THRESHOLD = 4;
const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 48;

// =========================================================
// COMPONENT
// =========================================================

export default function ContractPermit({
    contracts = [],
    contractPermits = [],
    permits = [],
    approvedInvoices = [],
    staff = [],
}: Props) {
    const records = useMemo(() => {
        const source =
            contracts.length > 0
                ? contracts
                : contractPermits.length > 0
                  ? contractPermits
                  : permits;
        return source;
    }, [contracts, contractPermits, permits]);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [selectedContract, setSelectedContract] =
        useState<ContractPermit | null>(null);
    const [editingRecord, setEditingRecord] = useState<ContractPermit | null>(
        null,
    );
    const [deleteRecord, setDeleteRecord] = useState<ContractPermit | null>(
        null,
    );
    const [emailContract, setEmailContract] = useState<ContractPermit | null>(
        null,
    );

    // ✅ Custom confirm modal state
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        variant: "success" | "danger" | "warning";
        onConfirm: () => void;
    } | null>(null);

    const [successMessage, setSuccessMessage] = useState<{
        title: string;
        description: string;
    } | null>(null);

    const [approvingInvoice, setApprovingInvoice] = useState<number | null>(
        null,
    );
    const [reviewProcessing, setReviewProcessing] = useState<number | null>(
        null,
    );

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{
        top: number;
        left: number;
        openUpward: boolean;
    } | null>(null);
    const menuButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

    const [activeTab, setActiveTab] = useState<
        | "all"
        | "active"
        | "pending"
        | "correction"
        | "review"
        | "expiring"
        | "archive"
    >("all");

    const editForm = useForm({
        title: "",
        type: "Contract",
        project: "",
        location: "",
        assigned_to: "",
        start_date: "",
        end_date: "",
        description: "",
        notes: "",
    });

    const emailForm = useForm({
        recipient_email: "",
        subject: "",
        message: "",
    });

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest("[data-contract-action-menu]")) {
                setOpenMenuId(null);
                setMenuPosition(null);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    useEffect(() => {
        const close = () => {
            setOpenMenuId(null);
            setMenuPosition(null);
        };
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, []);

    useEffect(() => {
        const interval = window.setInterval(() => {
            router.reload({
                only: [
                    "contracts",
                    "contractPermits",
                    "permits",
                    "approvedInvoices",
                    "staff",
                ],
                preserveScroll: true,
                preserveState: true,
            } as any);
        }, 30000);
        return () => window.clearInterval(interval);
    }, []);

    const normalizedRecords = useMemo(() => {
        return records.map((record) => ({
            ...record,
            calculatedStatus: calculateStatus(record),
            invoiceApproved: isInvoiceApproved(record),
        }));
    }, [records]);

    const types = useMemo(() => {
        const unique = Array.from(
            new Set(
                normalizedRecords
                    .map((record) => getType(record))
                    .filter(Boolean),
            ),
        );
        return ["All", ...unique];
    }, [normalizedRecords]);

    const counts = useMemo(() => {
        return {
            all: normalizedRecords.filter(
                (record) => record.calculatedStatus !== "Archived",
            ).length,
            active: normalizedRecords.filter(
                (record) => record.calculatedStatus === "Active",
            ).length,
            pending: normalizedRecords.filter(
                (record) => record.calculatedStatus === "Pending",
            ).length,
            correction: normalizedRecords.filter(
                (record) => record.calculatedStatus === "Needs Correction",
            ).length,
            review: normalizedRecords.filter(
                (record) => record.calculatedStatus === "Submitted for Review",
            ).length,
            expiring: normalizedRecords.filter(
                (record) => record.calculatedStatus === "Expiring Soon",
            ).length,
            archive: normalizedRecords.filter(
                (record) => record.calculatedStatus === "Archived",
            ).length,
        };
    }, [normalizedRecords]);

    const filteredRecords = useMemo(() => {
        const query = search.trim().toLowerCase();
        return normalizedRecords.filter((record) => {
            const status = record.calculatedStatus;
            if (activeTab === "all" && status === "Archived") return false;
            if (activeTab === "active" && status !== "Active") return false;
            if (activeTab === "pending" && status !== "Pending") return false;
            if (activeTab === "correction" && status !== "Needs Correction")
                return false;
            if (activeTab === "review" && status !== "Submitted for Review")
                return false;
            if (activeTab === "expiring" && status !== "Expiring Soon")
                return false;
            if (activeTab === "archive" && status !== "Archived") return false;
            if (typeFilter !== "All" && getType(record) !== typeFilter)
                return false;
            if (!query) return true;

            const searchable = [
                getTitle(record),
                getType(record),
                getClient(record),
                getProject(record),
                getReference(record),
                record.location || "",
                getCorrectionReason(record),
            ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(query);
        });
    }, [normalizedRecords, activeTab, typeFilter, search]);

    const shouldScroll = filteredRecords.length >= SCROLL_THRESHOLD;
    const tableMaxHeight = shouldScroll
        ? HEADER_HEIGHT + SCROLL_THRESHOLD * ROW_HEIGHT
        : undefined;

    const reloadContracts = () => {
        router.reload({
            only: [
                "contracts",
                "contractPermits",
                "permits",
                "approvedInvoices",
                "staff",
            ],
        });
    };

    const showSuccess = (title: string, description: string) => {
        setSuccessMessage({ title, description });
        window.setTimeout(() => setSuccessMessage(null), 3500);
    };

    const clearFilters = () => {
        setSearch("");
        setTypeFilter("All");
    };

    const openActionMenu = (
        event: React.MouseEvent<HTMLButtonElement>,
        contractId: number,
    ) => {
        event.stopPropagation();

        if (openMenuId === contractId) {
            setOpenMenuId(null);
            setMenuPosition(null);
            return;
        }

        const button = menuButtonRefs.current[contractId];
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const menuWidth = 240;
        const menuHeight = 360;
        const gap = 6;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const spaceBelow = viewportHeight - rect.bottom;
        const openUpward = spaceBelow < menuHeight + gap;

        let left = rect.right - menuWidth;
        if (left < 12) left = 12;
        if (left + menuWidth > viewportWidth - 12) {
            left = viewportWidth - menuWidth - 12;
        }

        let top = openUpward ? rect.top - menuHeight - gap : rect.bottom + gap;
        if (top < 12) top = 12;
        if (top + menuHeight > viewportHeight - 12) {
            top = viewportHeight - menuHeight - 12;
        }

        setMenuPosition({ top, left, openUpward });
        setOpenMenuId(contractId);
    };

    const openEdit = (record: ContractPermit) => {
        if (isArchivedRecord(record)) return;
        if (requiresInvoiceApproval(record) && !isInvoiceApproved(record))
            return;
        if (calculateStatus(record) === "Submitted for Review") return;

        editForm.setData({
            title: record.title || record.name || "",
            type: getType(record) || "Contract",
            project: record.project || record.project_name || "",
            location: record.location || "",
            assigned_to: record.assigned_to ? String(record.assigned_to) : "",
            start_date: record.start_date ? record.start_date.slice(0, 10) : "",
            end_date: record.end_date ? record.end_date.slice(0, 10) : "",
            description: record.description || "",
            notes: record.notes || "",
        });

        setEditingRecord(record);
    };

    const submitEdit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingRecord) return;
        editForm.put(`/admin/contracts/${editingRecord.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingRecord(null);
                editForm.reset();
                showSuccess(
                    "Record Updated Successfully",
                    "The Contract / Permit details have been saved.",
                );
                reloadContracts();
            },
        });
    };

    const approveInvoice = (record: ContractPermit) => {
        if (approvingInvoice === record.id) return;
        setApprovingInvoice(record.id);
        router.put(
            `/admin/contracts/${record.id}/approve-invoice`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    showSuccess(
                        "Invoice Approved Successfully",
                        "The invoice is now approved. Staff can now upload the contract and signed contract.",
                    );
                    reloadContracts();
                },
                onFinish: () => {
                    setApprovingInvoice(null);
                },
            },
        );
    };

    const approveContract = (record: ContractPermit) => {
        const isPermit = isPermitRecord(record);

        if (
            (isContractRecord(record) && !isInvoiceApproved(record)) ||
            getContractFileCount(record) === 0 ||
            (!isPermit && getSignedFileCount(record) === 0)
        )
            return;

        setConfirmDialog({
            title: isPermit
                ? "Approve Permit and Make it Active?"
                : "Approve Contract and Make it Active?",
            message: isPermit
                ? `By approving, you confirm that you have VERIFIED the attached permit document(s).\n\nThe 90-day validity period will start on the Admin approval date.`
                : `The 90-day validity period will start on the Admin approval date.`,
            confirmLabel: isPermit
                ? "Yes, Verify & Approve"
                : "Yes, Approve & Activate",
            cancelLabel: "Cancel",
            variant: "success",
            onConfirm: () => {
                setConfirmDialog(null);
                setReviewProcessing(record.id);
                router.put(
                    `/admin/contracts/${record.id}/approve`,
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            setSelectedContract(null);
                            showSuccess(
                                isPermit
                                    ? "Permit Approved Successfully"
                                    : "Contract Approved Successfully",
                                `The ${isPermit ? "permit" : "contract"} is now Active for 90 days from today. Staff will now see it as APPROVED.`,
                            );
                            reloadContracts();
                        },
                        onFinish: () => {
                            setReviewProcessing(null);
                        },
                    },
                );
            },
        });
    };

    const archiveContract = (contract: ContractPermit) => {
        if (!contract?.id) return;
        if (isArchivedRecord(contract)) return;
        setConfirmDialog({
            title: "Archive Record?",
            message: `Archive ${getReference(
                contract,
            )}?\n\nThe record will move to the Archive tab.`,
            confirmLabel: "Yes, Archive",
            cancelLabel: "Cancel",
            variant: "danger",
            onConfirm: () => {
                setConfirmDialog(null);
                router.put(
                    `/admin/contracts/${contract.id}/archive`,
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            showSuccess(
                                "Moved to Archive Successfully",
                                "The record has been moved to the Archive tab.",
                            );
                            reloadContracts();
                        },
                    },
                );
            },
        });
    };

        /* =====================================================
       RETURN FOR CORRECTION (ADMIN)
    ===================================================== */

    const returnForCorrection = (record: ContractPermit) => {
        if (!record?.id) return;

        const isPermit = isPermitRecord(record);
        const recordType = isPermit ? "Permit" : "Contract";

        // Prompt for correction reason
        const reason = window.prompt(
            `Return this ${recordType} for correction?\n\nPlease enter the reason (the staff will see this):`,
            "",
        );

        if (reason === null) return; // user cancelled

        if (!reason.trim() || reason.trim().length < 5) {
            alert(
                "Please provide a clear reason (at least 5 characters) so the staff knows what to fix.",
            );
            return;
        }

        setConfirmDialog({
            title: `Return ${recordType} for Correction?`,
            message:
                `Return ${getReference(record)} to staff for correction?\n\n` +
                `Reason:\n"${reason.trim()}"\n\n` +
                `The staff will be notified and can re-upload the corrected documents, then resubmit for review.`,
            confirmLabel: "Yes, Return for Correction",
            cancelLabel: "Cancel",
            variant: "warning",
            onConfirm: () => {
                setConfirmDialog(null);
                setReviewProcessing(record.id);

                router.put(
                    `/admin/contracts/${record.id}/return-correction`,
                    { correction_reason: reason.trim() },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            setSelectedContract(null);
                            showSuccess(
                                "Returned for Correction",
                                `The ${recordType.toLowerCase()} has been returned to staff. They will be notified to make the corrections.`,
                            );
                            reloadContracts();
                        },
                        onError: (errors) => {
                            console.error(
                                "Return for correction error:",
                                errors,
                            );
                            alert(
                                "Failed to return for correction. Please check the console for details.",
                            );
                        },
                        onFinish: () => {
                            setReviewProcessing(null);
                        },
                    },
                );
            },
        });
    };

    const restoreContract = (contract: ContractPermit) => {
        if (!contract?.id) return;
        setConfirmDialog({
            title: "Restore Record?",
            message: `Restore ${getReference(contract)} back to active records?`,
            confirmLabel: "Yes, Restore",
            cancelLabel: "Cancel",
            variant: "success",
            onConfirm: () => {
                setConfirmDialog(null);
                router.put(
                    `/admin/contracts/${contract.id}/restore`,
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            showSuccess(
                                "Restored Successfully",
                                "The record has been restored from Archive.",
                            );
                            reloadContracts();
                        },
                    },
                );
            },
        });
    };

    const permanentlyDelete = () => {
        if (!deleteRecord) return;
        setConfirmDialog({
            title: "Delete Permanently?",
            message: `You are about to permanently delete ${getTitle(
                deleteRecord,
            )}.\n\nThis action CANNOT be undone.`,
            confirmLabel: "Yes, Delete Forever",
            cancelLabel: "Cancel",
            variant: "danger",
            onConfirm: () => {
                setConfirmDialog(null);
                router.delete(`/admin/contracts/${deleteRecord.id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setDeleteRecord(null);
                        showSuccess(
                            "Deleted Permanently",
                            "The archived record has been permanently removed.",
                        );
                        reloadContracts();
                    },
                });
            },
        });
    };

    const openEmail = (contract: ContractPermit) => {
        if (!contract?.id) return;

        if (!isContractRecord(contract)) {
            alert("Email sending is only available for Contract records.");
            return;
        }

        if (isArchivedRecord(contract)) {
            alert("Cannot email an archived contract.");
            return;
        }
        if (!isInvoiceApproved(contract)) {
            alert(
                "Invoice must be approved by Admin before sending the Contract Agreement.",
            );
            return;
        }
        const recipient = getClientEmail(contract);
        emailForm.clearErrors();
        emailForm.setData({
            recipient_email: recipient,
            subject: `Contract Agreement - ${getReference(contract)}`,
            message:
                `Dear ${getClient(contract)},\n\n` +
                `Please find the Contract Agreement for ${getProject(
                    contract,
                )} attached to this email.\n\n` +
                `Kindly review the agreement, sign the designated signature section, and return the signed agreement to ALIBATON.\n\n` +
                `Reference: ${getReference(contract)}\n\n` +
                `Thank you,\n\nALIBATON\nHeavy Equipment & Logistics`,
        });
        setEmailContract(contract);
    };

    const submitEmail = (event: React.FormEvent) => {
        event.preventDefault();
        if (!emailContract?.id) return;
        emailForm.post(`/admin/contracts/${emailContract.id}/notify`, {
            preserveScroll: true,
            onSuccess: () => {
                setEmailContract(null);
                emailForm.reset();
                emailForm.clearErrors();
                showSuccess(
                    "Email Sent Successfully",
                    "The Contract Agreement has been emailed to the client.",
                );
            },
        });
    };

    const downloadContract = (contract: ContractPermit) => {
        if (!contract?.id) return;
        if (!contract.contract_file_path) {
            alert("No contract file uploaded for this record.");
            return;
        }
        window.location.href = `/admin/contracts/${contract.id}/download-contract`;
    };

    const downloadSignedContract = (contract: ContractPermit) => {
        if (!contract?.id) return;
        if (!contract.signed_contract_path) {
            alert("No signed contract uploaded for this record.");
            return;
        }
        window.location.href = `/admin/contracts/${contract.id}/download-signed`;
    };

    const downloadFile = (fileId: number) => {
        window.location.href = `/admin/contracts/files/${fileId}/download`;
    };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <AdminLayout>
            <Head title="Contract & Permit Management" />

            <style>{`
                .alibaton-scroll::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .alibaton-scroll::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.6);
                    border-radius: 999px;
                }
                .alibaton-scroll::-webkit-scrollbar-thumb {
                    background: rgba(250, 204, 21, 0.4);
                    border-radius: 999px;
                    border: 1px solid rgba(250, 204, 21, 0.2);
                }
                .alibaton-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(250, 204, 21, 0.7);
                }
                .alibaton-scroll::-webkit-scrollbar-corner {
                    background: transparent;
                }
                .alibaton-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(250, 204, 21, 0.5) rgba(0, 0, 0, 0.6);
                }
            `}</style>

            <div className="min-w-0 flex-1 bg-black px-4 pb-8 pt-20 text-white sm:px-6 lg:px-8 lg:pt-8">
                <div className="mx-auto w-full max-w-[1600px]">
                    {/* HEADER */}
                    <div className="mb-6 flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                <ShieldCheck size={15} />
                                Administration
                            </div>
                            <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                                Contract & Permit Management
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                                Admin reviews and manages Contract and Permit
                                records. Permits: verify + approve directly.
                                Contracts: invoice + signed documents required.
                            </p>
                        </div>
                    </div>

                    {/* STAT CARDS */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                        <StatCard
                            label="All"
                            value={counts.all}
                            icon={<FileText size={19} />}
                            active={activeTab === "all"}
                            onClick={() => setActiveTab("all")}
                        />
                        <StatCard
                            label="Active"
                            value={counts.active}
                            icon={<CheckCircle2 size={19} />}
                            active={activeTab === "active"}
                            onClick={() => setActiveTab("active")}
                        />
                        <StatCard
                            label="Pending"
                            value={counts.pending}
                            icon={<Clock3 size={19} />}
                            active={activeTab === "pending"}
                            onClick={() => setActiveTab("pending")}
                        />
                        <StatCard
                            label="Needs Correction"
                            value={counts.correction}
                            icon={<AlertTriangle size={19} />}
                            active={activeTab === "correction"}
                            onClick={() => setActiveTab("correction")}
                        />
                        <StatCard
                            label="For Review"
                            value={counts.review}
                            icon={<Send size={19} />}
                            active={activeTab === "review"}
                            onClick={() => setActiveTab("review")}
                            highlight
                        />
                        <StatCard
                            label="Expiring Soon"
                            value={counts.expiring}
                            icon={<AlertTriangle size={19} />}
                            active={activeTab === "expiring"}
                            onClick={() => setActiveTab("expiring")}
                        />
                        <StatCard
                            label="Archive"
                            value={counts.archive}
                            icon={<Archive size={19} />}
                            active={activeTab === "archive"}
                            onClick={() => setActiveTab("archive")}
                        />
                    </div>

                    {/* SEARCH / FILTER */}
                    <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl">
                        <div className="flex min-w-0 flex-col gap-3 lg:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={17}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search title, client, project, reference..."
                                    className="w-full rounded-xl border border-zinc-800 bg-black py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/50"
                                />
                            </div>
                            <div className="relative w-full lg:w-56">
                                <select
                                    value={typeFilter}
                                    onChange={(e) =>
                                        setTypeFilter(e.target.value)
                                    }
                                    className="w-full appearance-none rounded-xl border border-zinc-800 bg-black px-4 py-3 pr-10 text-sm font-semibold text-zinc-300 outline-none focus:border-yellow-400/50"
                                >
                                    {types.map((type) => (
                                        <option
                                            key={type}
                                            value={type}
                                            className="bg-black"
                                        >
                                            {type === "All"
                                                ? "All Types"
                                                : type}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* TABLE */}
                    {filteredRecords.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-20 text-center shadow-xl">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-black">
                                <FileCheck2
                                    size={28}
                                    className="text-zinc-600"
                                />
                            </div>
                            <h3 className="text-lg font-black text-zinc-300">
                                No records found
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                                There are no Contract or Permit records matching
                                your current filters.
                            </p>
                            {(search || typeFilter !== "All") && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-zinc-300 transition hover:border-yellow-400/20 hover:bg-zinc-900 hover:text-white"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <section className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-zinc-950 shadow-2xl shadow-black/50">
                            <div
                                className="alibaton-scroll"
                                style={{
                                    maxHeight:
                                        shouldScroll && tableMaxHeight
                                            ? `${tableMaxHeight}px`
                                            : undefined,
                                    overflowY: shouldScroll
                                        ? "auto"
                                        : "visible",
                                }}
                            >
                                <table className="w-full table-fixed">
                                    <thead className="sticky top-0 z-10 bg-black/95 backdrop-blur-sm">
                                        <tr className="border-b border-zinc-800 bg-black">
                                            <th className="w-[13%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                Contract
                                            </th>
                                            <th className="w-[10%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                Type
                                            </th>
                                            <th className="w-[22%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                Project
                                            </th>
                                            <th className="w-[15%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                Validity
                                            </th>
                                            <th className="w-[13%] px-3 py-3.5 text-center text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                Status
                                            </th>
                                            <th className="w-[11%] px-3 py-3.5 text-center text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                Files
                                            </th>
                                            <th className="w-[16%] px-3 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecords.map((contract) => {
                                            const status =
                                                contract.calculatedStatus;
                                            const expiry =
                                                getExpiryDate(contract);
                                            const remaining = daysUntil(expiry);
                                            const invoiceApproved =
                                                contract.invoiceApproved;
                                            const contractFileCount =
                                                getContractFileCount(contract);
                                            const signedFileCount =
                                                getSignedFileCount(contract);
                                            const isPermit =
                                                isPermitRecord(contract);

                                            return (
                                                <tr
                                                    key={contract.id}
                                                    className="border-b border-zinc-900 transition hover:bg-yellow-400/[0.025]"
                                                >
                                                    <td className="px-3 py-4 align-top">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedContract(
                                                                    contract,
                                                                )
                                                            }
                                                            className="text-left"
                                                        >
                                                            <p className="truncate text-xs font-black text-white hover:text-yellow-400">
                                                                {getReference(
                                                                    contract,
                                                                )}
                                                            </p>
                                                            <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                                                                {getTitle(
                                                                    contract,
                                                                )}
                                                            </p>
                                                        </button>
                                                    </td>

                                                    <td className="px-3 py-4 align-top">
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                                                                isPermit
                                                                    ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                                                                    : "border-yellow-400/20 bg-yellow-400/5 text-yellow-400"
                                                            }`}
                                                        >
                                                            {isPermit ? (
                                                                <FileCheck2
                                                                    size={10}
                                                                />
                                                            ) : (
                                                                <FileText
                                                                    size={10}
                                                                />
                                                            )}
                                                            <span className="truncate">
                                                                {truncate(
                                                                    getType(
                                                                        contract,
                                                                    ),
                                                                    10,
                                                                )}
                                                            </span>
                                                        </span>
                                                    </td>

                                                    <td className="px-3 py-4 align-top">
                                                        <p
                                                            className="truncate text-[11px] text-zinc-300"
                                                            title={getProject(
                                                                contract,
                                                            )}
                                                        >
                                                            {truncate(
                                                                getProject(
                                                                    contract,
                                                                ),
                                                                30,
                                                            )}
                                                        </p>
                                                        {contract.location && (
                                                            <p
                                                                className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-zinc-600"
                                                                title={
                                                                    contract.location
                                                                }
                                                            >
                                                                <MapPin
                                                                    size={10}
                                                                    className="shrink-0"
                                                                />
                                                                <span className="truncate">
                                                                    {truncate(
                                                                        contract.location,
                                                                        28,
                                                                    )}
                                                                </span>
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-4 align-top">
                                                        <div className="flex items-start gap-1.5">
                                                            <CalendarDays
                                                                size={12}
                                                                className="mt-0.5 shrink-0 text-zinc-700"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="truncate text-[11px] text-zinc-300">
                                                                    {getStartDate(
                                                                        contract,
                                                                    )
                                                                        ? formatShortDate(
                                                                              getStartDate(
                                                                                  contract,
                                                                              ),
                                                                          )
                                                                        : "—"}
                                                                </p>
                                                                <p
                                                                    className={`mt-0.5 truncate text-[10px] ${
                                                                        remaining !==
                                                                            null &&
                                                                        remaining <
                                                                            0
                                                                            ? "text-red-400"
                                                                            : remaining !==
                                                                                    null &&
                                                                                remaining <=
                                                                                    30
                                                                              ? "text-orange-400"
                                                                              : "text-zinc-600"
                                                                    }`}
                                                                >
                                                                    to{" "}
                                                                    {expiry
                                                                        ? formatShortDate(
                                                                              expiry,
                                                                          )
                                                                        : "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 text-center align-top">
                                                        <span
                                                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusClasses(status)}`}
                                                        >
                                                            {statusIcon(status)}
                                                            {statusShortLabel(
                                                                status,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="px-3 py-4 text-center align-top">
                                                        <span
                                                            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${invoiceBadgeClasses(invoiceApproved)}`}
                                                        >
                                                            {invoiceApproved ? (
                                                                <>
                                                                    <CheckCircle2
                                                                        size={
                                                                            10
                                                                        }
                                                                    />
                                                                    OK
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Clock3
                                                                        size={
                                                                            10
                                                                        }
                                                                    />
                                                                    Pending
                                                                </>
                                                            )}
                                                        </span>
                                                        <div className="mt-1.5 flex flex-col items-center gap-1">
                                                            <span
                                                                className={`inline-flex items-center gap-1 text-[9px] font-bold ${
                                                                    contractFileCount >
                                                                    0
                                                                        ? "text-emerald-400"
                                                                        : "text-slate-700"
                                                                }`}
                                                            >
                                                                <FileText
                                                                    size={11}
                                                                />
                                                                {contractFileCount >
                                                                0
                                                                    ? `${contractFileCount} file${contractFileCount > 1 ? "s" : ""}`
                                                                    : "Missing"}
                                                            </span>
                                                            {!isPermit && (
                                                                <span
                                                                    className={`inline-flex items-center gap-1 text-[9px] font-bold ${
                                                                        signedFileCount >
                                                                        0
                                                                            ? "text-emerald-400"
                                                                            : "text-slate-700"
                                                                    }`}
                                                                >
                                                                    <FileCheck2
                                                                        size={
                                                                            11
                                                                        }
                                                                    />
                                                                    {signedFileCount >
                                                                    0
                                                                        ? `${signedFileCount} signed`
                                                                        : "No Signed"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 align-top">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setSelectedContract(
                                                                        contract,
                                                                    )
                                                                }
                                                                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-700 px-2 text-[10px] font-bold text-zinc-300 transition hover:border-yellow-400/40 hover:bg-zinc-900 hover:text-yellow-400"
                                                            >
                                                                <Eye
                                                                    size={12}
                                                                />
                                                                View
                                                            </button>
                                                            <button
                                                                ref={(el) => {
                                                                    menuButtonRefs.current[
                                                                        contract.id
                                                                    ] = el;
                                                                }}
                                                                type="button"
                                                                onClick={(e) =>
                                                                    openActionMenu(
                                                                        e,
                                                                        contract.id,
                                                                    )
                                                                }
                                                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                                                    openMenuId ===
                                                                    contract.id
                                                                        ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400"
                                                                        : "border-zinc-700 text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400"
                                                                }`}
                                                            >
                                                                <MoreVertical
                                                                    size={13}
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* FOOTER */}
                    <div className="mt-6 flex min-w-0 flex-col gap-2 border-t border-zinc-800 pt-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Showing{" "}
                            <strong className="text-zinc-400">
                                {filteredRecords.length}
                            </strong>{" "}
                            of{" "}
                            <strong className="text-zinc-400">
                                {normalizedRecords.length}
                            </strong>{" "}
                            records
                            {shouldScroll && (
                                <span className="ml-2 text-yellow-400/60">
                                    (scroll to view more)
                                </span>
                            )}
                        </span>
                        <span>ALIBATON Contract & Permit Management</span>
                    </div>
                </div>
            </div>

            {/* ACTION MENU */}
            {openMenuId !== null &&
                menuPosition &&
                (() => {
                    const contract = filteredRecords.find(
                        (c) => c.id === openMenuId,
                    );
                    if (!contract) return null;

                    const status = contract.calculatedStatus;
                    const isArchived = status === "Archived";
                    const invoiceApproved = contract.invoiceApproved;

                    const isContract = isContractRecord(contract);
                    const isPermit = isPermitRecord(contract);

                    const contractFiles = contract.contract_files ?? [];
                    const signedFiles = contract.signed_files ?? [];

                    return (
                        <>
                            <button
                                type="button"
                                className="fixed inset-0 z-[9998] cursor-default"
                                onClick={() => {
                                    setOpenMenuId(null);
                                    setMenuPosition(null);
                                }}
                                aria-label="Close menu"
                            />
                            <div
                                data-contract-action-menu
                                className="alibaton-scroll fixed z-[9999] w-64 overflow-y-auto rounded-2xl border border-zinc-700 bg-black shadow-[0_25px_80px_rgba(0,0,0,0.9)]"
                                style={{
                                    top: `${menuPosition.top}px`,
                                    left: `${menuPosition.left}px`,
                                    maxHeight: "420px",
                                }}
                            >
                                <div className="border-b border-zinc-800 px-3 py-2.5">
                                    <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                                        Admin Actions
                                    </p>
                                    <p className="mt-0.5 truncate text-xs font-bold text-white">
                                        {getReference(contract)}
                                    </p>
                                </div>
                                <div className="p-1">
                                    <MenuItem
                                        icon={<Eye size={14} />}
                                        label="View Details"
                                        onClick={() => {
                                            setOpenMenuId(null);
                                            setMenuPosition(null);
                                            setSelectedContract(contract);
                                        }}
                                    />

                                    {contract.contract_file_path &&
                                        contractFiles.length === 0 && (
                                            <MenuItem
                                                icon={<Download size={14} />}
                                                label={
                                                    isPermit
                                                        ? "Download Permit Document"
                                                        : "Download Contract"
                                                }
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    downloadContract(contract);
                                                }}
                                            />
                                        )}

                                    {contractFiles.length > 0 && (
                                        <>
                                            <div className="my-1 border-t border-zinc-800" />
                                            <p className="px-3 pt-1 pb-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                                {isPermit
                                                    ? "Permit Documents"
                                                    : "Contract Documents"}
                                            </p>
                                            {contractFiles.map((file) => (
                                                <MenuItem
                                                    key={file.id}
                                                    icon={
                                                        <Download size={14} />
                                                    }
                                                    label={truncate(
                                                        file.file_name,
                                                        28,
                                                    )}
                                                    onClick={() => {
                                                        setOpenMenuId(null);
                                                        setMenuPosition(null);
                                                        downloadFile(file.id);
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}

                                    {isContract &&
                                        contract.signed_contract_path &&
                                        signedFiles.length === 0 && (
                                            <MenuItem
                                                icon={<FileCheck2 size={14} />}
                                                label="Download Signed Contract"
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    downloadSignedContract(
                                                        contract,
                                                    );
                                                }}
                                            />
                                        )}

                                    {isContract && signedFiles.length > 0 && (
                                        <>
                                            <div className="my-1 border-t border-zinc-800" />
                                            <p className="px-3 pt-1 pb-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                                                Signed Documents
                                            </p>
                                            {signedFiles.map((file) => (
                                                <MenuItem
                                                    key={file.id}
                                                    icon={
                                                        <Download size={14} />
                                                    }
                                                    label={truncate(
                                                        file.file_name,
                                                        28,
                                                    )}
                                                    onClick={() => {
                                                        setOpenMenuId(null);
                                                        setMenuPosition(null);
                                                        downloadFile(file.id);
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}

                                    {!isArchived &&
                                        isContract &&
                                        !invoiceApproved && (
                                            <MenuItem
                                                icon={
                                                    <CheckCircle2 size={14} />
                                                }
                                                label="Approve Invoice"
                                                highlight
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    approveInvoice(contract);
                                                }}
                                            />
                                        )}

                                        {!isArchived && status === "Submitted for Review" && (
    <MenuItem
        icon={<XCircle size={14} />}
        label="Return for Correction"
        danger
        onClick={() => {
            setOpenMenuId(null);
            setMenuPosition(null);
            returnForCorrection(contract);
        }}
    />
)}

                                    {!isArchived &&
                                        (!isContract || invoiceApproved) &&
                                        status !== "Submitted for Review" &&
                                        status !== "Active" &&
                                        status !== "Expiring Soon" &&
                                        status !== "Expired" && (
                                            <MenuItem
                                                icon={<Edit3 size={14} />}
                                                label="Edit Record"
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    openEdit(contract);
                                                }}
                                            />
                                        )}

                                    {isContract &&
                                        !isArchived &&
                                        invoiceApproved && (
                                            <MenuItem
                                                icon={<Mail size={14} />}
                                                label="Email Client"
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    openEmail(contract);
                                                }}
                                            />
                                        )}

                                    <div className="my-1 border-t border-zinc-800" />
                                    {!isArchived ? (
                                        <MenuItem
                                            icon={<Archive size={14} />}
                                            label="Archive"
                                            danger
                                            onClick={() => {
                                                setOpenMenuId(null);
                                                setMenuPosition(null);
                                                archiveContract(contract);
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <MenuItem
                                                icon={<RefreshCw size={14} />}
                                                label="Restore"
                                                highlight
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    restoreContract(contract);
                                                }}
                                            />
                                            <MenuItem
                                                icon={<Trash2 size={14} />}
                                                label="Delete Permanently"
                                                danger
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    setDeleteRecord(contract);
                                                }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}

            {/* EDIT MODAL */}
            {editingRecord && (
                <Modal
                    title="Edit Contract / Permit"
                    subtitle={`Editing existing record ${getReference(editingRecord)}`}
                    icon={<Edit3 size={20} />}
                    onClose={() => setEditingRecord(null)}
                    wide
                >
                    <form onSubmit={submitEdit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <FormInput
                                label="Contract Title"
                                value={editForm.data.title}
                                onChange={(value) =>
                                    editForm.setData("title", value)
                                }
                                required
                            />
                            {/* ✅ UPDATED: kumpletong options */}
                            <SelectInput
                                label="Type"
                                value={editForm.data.type}
                                onChange={(value) =>
                                    editForm.setData("type", value)
                                }
                                options={EDIT_TYPE_OPTIONS}
                                required
                            />
                            <FormInput
                                label="Project"
                                value={editForm.data.project}
                                onChange={(value) =>
                                    editForm.setData("project", value)
                                }
                            />
                            <FormInput
                                label="Location"
                                value={editForm.data.location}
                                onChange={(value) =>
                                    editForm.setData("location", value)
                                }
                            />
                            <div className="md:col-span-2">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Assigned Staff
                                </label>
                                <select
                                    value={editForm.data.assigned_to}
                                    onChange={(e) =>
                                        editForm.setData(
                                            "assigned_to",
                                            e.target.value,
                                        )
                                    }
                                    className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-yellow-400/60"
                                >
                                    <option value="" className="bg-black">
                                        All Staff
                                    </option>
                                    {staff.map((person) => (
                                        <option
                                            key={person.id}
                                            value={String(person.id)}
                                            className="bg-black"
                                        >
                                            {person.name}
                                            {person.email
                                                ? ` — ${person.email}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <TextArea
                                label="Description"
                                value={editForm.data.description}
                                onChange={(value) =>
                                    editForm.setData("description", value)
                                }
                                rows={4}
                                full
                            />
                            <TextArea
                                label="Notes"
                                value={editForm.data.notes}
                                onChange={(value) =>
                                    editForm.setData("notes", value)
                                }
                                rows={3}
                                full
                            />
                        </div>
                        <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setEditingRecord(null)}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editForm.processing}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
                            >
                                {editForm.processing ? (
                                    <>
                                        <RefreshCw
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* VIEW MODAL */}
            {selectedContract && (
                <Modal
                    title={getTitle(selectedContract)}
                    subtitle={getReference(selectedContract)}
                    icon={<Eye size={20} />}
                    onClose={() => setSelectedContract(null)}
                    wide
                >
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${statusClasses(calculateStatus(selectedContract))}`}
                            >
                                {statusIcon(calculateStatus(selectedContract))}
                                {calculateStatus(selectedContract)}
                            </span>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                                    isPermitRecord(selectedContract)
                                        ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"
                                        : "border-zinc-800 bg-zinc-950 text-zinc-400"
                                }`}
                            >
                                {getType(selectedContract)}
                            </span>
                            {isPermitRecord(selectedContract) ? (
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                                        getContractFileCount(selectedContract) >
                                        0
                                            ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400"
                                            : "border-red-400/20 bg-red-400/[0.06] text-red-400"
                                    }`}
                                >
                                    {getContractFileCount(selectedContract) >
                                    0 ? (
                                        <>
                                            <CheckCircle2 size={14} />
                                            Permit Document
                                            {getContractFileCount(
                                                selectedContract,
                                            ) > 1
                                                ? "s"
                                                : ""}{" "}
                                            Attached
                                        </>
                                    ) : (
                                        <>
                                            <Clock3 size={14} />
                                            Permit Document Missing
                                        </>
                                    )}
                                </span>
                            ) : (
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${invoiceBadgeClasses(isInvoiceApproved(selectedContract))}`}
                                >
                                    {isInvoiceApproved(selectedContract) ? (
                                        <>
                                            <CheckCircle2 size={14} />
                                            Invoice Approved
                                        </>
                                    ) : (
                                        <>
                                            <Clock3 size={14} />
                                            Pending Invoice Approval
                                        </>
                                    )}
                                </span>
                            )}
                        </div>

                        {getCorrectionReason(selectedContract) && (
                            <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle
                                        size={19}
                                        className="mt-0.5 shrink-0 text-red-400"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider text-red-300">
                                            Admin Correction Required
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                                            {getCorrectionReason(
                                                selectedContract,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {calculateStatus(selectedContract) ===
                            "Submitted for Review" && (
                            <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.04] p-4">
                                <div className="flex items-start gap-3">
                                    <Send
                                        size={19}
                                        className="mt-0.5 shrink-0 text-blue-400"
                                    />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-blue-300">
                                            Awaiting Admin Review
                                        </p>
                                        <p className="mt-1 text-xs leading-6 text-zinc-500">
                                            This record has been submitted for
                                            final Admin approval.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {calculateStatus(selectedContract) === "Submitted for Review" && (
    <button
        type="button"
        onClick={() => returnForCorrection(selectedContract)}
        disabled={reviewProcessing === selectedContract.id}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-2.5 text-sm font-bold text-amber-400 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
        {reviewProcessing === selectedContract.id ? (
            <>
                <RefreshCw size={16} className="animate-spin" />
                Processing...
            </>
        ) : (
            <>
                <XCircle size={16} />
                Return for Correction
            </>
        )}
    </button>
)}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailBox
                                label="Reference Number"
                                value={getReference(selectedContract)}
                            />
                            <DetailBox
                                label="Status"
                                value={calculateStatus(selectedContract)}
                            />
                            {!isPermitRecord(selectedContract) && (
                                <DetailBox
                                    label="Invoice Status"
                                    value={
                                        isInvoiceApproved(selectedContract)
                                            ? "Approved"
                                            : "Pending Approval"
                                    }
                                />
                            )}
                            <DetailBox
                                label="Client"
                                value={getClient(selectedContract)}
                            />
                            <DetailBox
                                label="Client Email"
                                value={getClientEmail(selectedContract) || "—"}
                            />
                            <DetailBox
                                label="Project"
                                value={getProject(selectedContract)}
                            />
                            <DetailBox
                                label="Assigned Staff"
                                value={
                                    getAssignedStaff(selectedContract)?.name ||
                                    "All Staff"
                                }
                            />
                            <DetailBox
                                label="Start / Issue Date"
                                value={
                                    getStartDate(selectedContract)
                                        ? formatDate(
                                              getStartDate(selectedContract),
                                          )
                                        : "Starts after Admin approval"
                                }
                            />
                            <DetailBox
                                label="Expiry Date"
                                value={
                                    getExpiryDate(selectedContract)
                                        ? formatDate(
                                              getExpiryDate(selectedContract),
                                          )
                                        : "Starts after Admin approval"
                                }
                            />
                            <DetailBox
                                label="Location"
                                value={selectedContract.location || "—"}
                            />
                            <DetailBox
                                label="Created"
                                value={formatDate(selectedContract.created_at)}
                            />
                            <DetailBox
                                label="Last Updated"
                                value={formatDate(selectedContract.updated_at)}
                            />
                            <DetailBox
                                label="Admin Approved At"
                                value={formatDate(selectedContract.approved_at)}
                            />
                        </div>

                        <DetailBox
                            label="Description"
                            value={
                                selectedContract.description ||
                                "No description provided."
                            }
                            full
                        />
                        <DetailBox
                            label="Notes"
                            value={
                                selectedContract.notes || "No additional notes."
                            }
                            full
                        />

                        {(() => {
                            const contractFiles =
                                selectedContract.contract_files ?? [];
                            const signedFiles =
                                selectedContract.signed_files ?? [];
                            const isPermit = isPermitRecord(selectedContract);
                            const hasLegacyContract =
                                !contractFiles.length &&
                                selectedContract.contract_file_path;
                            const hasLegacySigned =
                                !signedFiles.length &&
                                selectedContract.signed_contract_path;

                            if (
                                !contractFiles.length &&
                                !signedFiles.length &&
                                !hasLegacyContract &&
                                !hasLegacySigned
                            ) {
                                return null;
                            }

                            return (
                                <div className="space-y-4">
                                    {(contractFiles.length > 0 ||
                                        hasLegacyContract) && (
                                        <div>
                                            <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                                                {isPermit
                                                    ? "📁 Permit"
                                                    : "📁 Contract"}{" "}
                                                Documents (
                                                {contractFiles.length || 1})
                                            </p>
                                            <div className="space-y-2">
                                                {contractFiles.length > 0 ? (
                                                    contractFiles.map((f) => (
                                                        <FileRow
                                                            key={f.id}
                                                            file={f}
                                                            accent="yellow"
                                                            href={`/admin/contracts/files/${f.id}/download`}
                                                        />
                                                    ))
                                                ) : (
                                                    <FileRow
                                                        file={{
                                                            id: 0,
                                                            file_name:
                                                                selectedContract.contract_file_name ||
                                                                "Contract file",
                                                            file_size: null,
                                                        }}
                                                        accent="yellow"
                                                        href={`/admin/contracts/${selectedContract.id}/download-contract`}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {!isPermit &&
                                        (signedFiles.length > 0 ||
                                            hasLegacySigned) && (
                                            <div>
                                                <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                                                    ✍️ Signed Documents (
                                                    {signedFiles.length || 1})
                                                </p>
                                                <div className="space-y-2">
                                                    {signedFiles.length > 0 ? (
                                                        signedFiles.map((f) => (
                                                            <FileRow
                                                                key={f.id}
                                                                file={f}
                                                                accent="emerald"
                                                                href={`/admin/contracts/files/${f.id}/download`}
                                                            />
                                                        ))
                                                    ) : (
                                                        <FileRow
                                                            file={{
                                                                id: 0,
                                                                file_name:
                                                                    selectedContract.signed_contract_file_name ||
                                                                    "Signed contract",
                                                                file_size: null,
                                                            }}
                                                            accent="emerald"
                                                            href={`/admin/contracts/${selectedContract.id}/download-signed`}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            );
                        })()}

                        {calculateStatus(selectedContract) ===
                            "Submitted for Review" && (
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                                <p className="mb-4 text-xs font-black uppercase tracking-wider text-zinc-500">
                                    Admin Review Checklist
                                </p>
                                <div className="space-y-2">
                                    {requiresInvoiceApproval(
                                        selectedContract,
                                    ) && (
                                        <ReviewCheck
                                            label="Invoice is approved"
                                            passed={isInvoiceApproved(
                                                selectedContract,
                                            )}
                                        />
                                    )}
                                    {isPermitRecord(selectedContract) && (
                                        <ReviewCheck
                                            label={`Permit document attached (${getContractFileCount(selectedContract)} file${getContractFileCount(selectedContract) > 1 ? "s" : ""})`}
                                            passed={
                                                getContractFileCount(
                                                    selectedContract,
                                                ) > 0
                                            }
                                        />
                                    )}
                                    <ReviewCheck
                                        label="Client information is available"
                                        passed={
                                            getClient(selectedContract) !== "—"
                                        }
                                    />
                                    <ReviewCheck
                                        label={
                                            isPermitRecord(selectedContract)
                                                ? "Permit information is available"
                                                : "Project / contract information is available"
                                        }
                                        passed={Boolean(
                                            getTitle(selectedContract),
                                        )}
                                    />
                                    {!isPermitRecord(selectedContract) && (
                                        <ReviewCheck
                                            label="Original contract uploaded"
                                            passed={
                                                getContractFileCount(
                                                    selectedContract,
                                                ) > 0
                                            }
                                        />
                                    )}
                                    {!isPermitRecord(selectedContract) && (
                                        <ReviewCheck
                                            label="Signed contract uploaded"
                                            passed={
                                                getSignedFileCount(
                                                    selectedContract,
                                                ) > 0
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {calculateStatus(selectedContract) ===
                            "Submitted for Review" && (
                            <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/[0.05] p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black uppercase tracking-wider text-emerald-300">
                                            {isPermitRecord(selectedContract)
                                                ? "⚠️ Admin Verification Required"
                                                : "⚠️ Admin Approval Required"}
                                        </p>
                                        <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                                            {isPermitRecord(selectedContract)
                                                ? "Verify the attached permit document before approving it."
                                                : "Check the invoice, contract documents, and signed contract before approving."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-5">
                            {calculateStatus(selectedContract) ===
                                "Submitted for Review" &&
                                canApproveDirectly(selectedContract) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            approveContract(selectedContract)
                                        }
                                        disabled={
                                            reviewProcessing ===
                                            selectedContract.id
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {reviewProcessing ===
                                        selectedContract.id ? (
                                            <>
                                                <RefreshCw
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                {isPermitRecord(
                                                    selectedContract,
                                                )
                                                    ? "✅ Verify & Approve Permit"
                                                    : "✅ Approve & Make Active"}
                                            </>
                                        )}
                                    </button>
                                )}

                            {isContractRecord(selectedContract) &&
                                !isInvoiceApproved(selectedContract) &&
                                !isArchivedRecord(selectedContract) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            approveInvoice(selectedContract)
                                        }
                                        disabled={
                                            approvingInvoice ===
                                            selectedContract.id
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] px-4 py-2.5 text-sm font-bold text-yellow-400 transition hover:bg-yellow-400/10 disabled:opacity-50"
                                    >
                                        {approvingInvoice ===
                                        selectedContract.id ? (
                                            <>
                                                <RefreshCw
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                Approve Invoice
                                            </>
                                        )}
                                    </button>
                                )}

                            {isContractRecord(selectedContract) &&
                                isInvoiceApproved(selectedContract) &&
                                !isArchivedRecord(selectedContract) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedContract(null);
                                            openEmail(selectedContract);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                                    >
                                        <Mail size={16} />
                                        Email Client
                                    </button>
                                )}

                            {!isArchivedRecord(selectedContract) &&
                                calculateStatus(selectedContract) !==
                                    "Submitted for Review" &&
                                (!isContractRecord(selectedContract) ||
                                    isInvoiceApproved(selectedContract)) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedContract(null);
                                            openEdit(selectedContract);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-zinc-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                                    >
                                        <Edit3 size={16} />
                                        Edit Record
                                    </button>
                                )}

                            {!isArchivedRecord(selectedContract) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedContract(null);
                                        archiveContract(selectedContract);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-400/10"
                                >
                                    <Archive size={16} />
                                    Archive
                                </button>
                            )}

                            {isArchivedRecord(selectedContract) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedContract(null);
                                            restoreContract(selectedContract);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-2.5 text-sm font-bold text-emerald-400 transition hover:bg-emerald-400/10"
                                    >
                                        <RefreshCw size={16} />
                                        Restore
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedContract(null);
                                            setDeleteRecord(selectedContract);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-400/10"
                                    >
                                        <Trash2 size={16} />
                                        Delete Permanently
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* EMAIL MODAL */}
            {emailContract && isContractRecord(emailContract) && (
                <Modal
                    title="Send Contract Agreement"
                    subtitle={`Send Contract Agreement for ${getReference(emailContract)}`}
                    icon={<Mail size={20} />}
                    onClose={() => {
                        if (emailForm.processing) return;
                        setEmailContract(null);
                        emailForm.reset();
                        emailForm.clearErrors();
                    }}
                >
                    <form onSubmit={submitEmail} className="space-y-5">
                        <FormInput
                            label="Client Email"
                            value={emailForm.data.recipient_email}
                            onChange={(value) =>
                                emailForm.setData("recipient_email", value)
                            }
                            placeholder="client@example.com"
                            type="email"
                            required
                        />
                        {emailForm.errors.recipient_email && (
                            <p className="-mt-3 text-xs font-semibold text-red-400">
                                {emailForm.errors.recipient_email}
                            </p>
                        )}
                        <FormInput
                            label="Subject"
                            value={emailForm.data.subject}
                            onChange={(value) =>
                                emailForm.setData("subject", value)
                            }
                            required
                        />
                        <TextArea
                            label="Message"
                            value={emailForm.data.message}
                            onChange={(value) =>
                                emailForm.setData("message", value)
                            }
                            rows={9}
                            full
                            required
                        />
                        <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={emailForm.processing}
                                onClick={() => {
                                    setEmailContract(null);
                                    emailForm.reset();
                                    emailForm.clearErrors();
                                }}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    emailForm.processing ||
                                    !emailForm.data.recipient_email.trim()
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
                            >
                                {emailForm.processing ? (
                                    <>
                                        <RefreshCw
                                            size={16}
                                            className="animate-spin"
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
                        </div>
                    </form>
                </Modal>
            )}

            {/* DELETE MODAL */}
            {deleteRecord && (
                <Modal
                    title="Delete Archived Record"
                    subtitle="This action cannot be undone."
                    icon={<Trash2 size={20} />}
                    onClose={() => setDeleteRecord(null)}
                >
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-4">
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
                                        You are about to permanently delete{" "}
                                        <strong>
                                            {getTitle(deleteRecord)}
                                        </strong>
                                        .
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-red-300/50">
                                        Only archived Contract / Permit records
                                        can be permanently deleted.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setDeleteRecord(null)}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={permanentlyDelete}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400"
                            >
                                <Trash2 size={16} />
                                Delete Permanently
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ✅ CUSTOM CONFIRM DIALOG */}
            {confirmDialog && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div
                        className={`pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border bg-black shadow-2xl ${
                            confirmDialog.variant === "danger"
                                ? "border-red-400/30 shadow-red-400/10"
                                : confirmDialog.variant === "warning"
                                  ? "border-amber-400/30 shadow-amber-400/10"
                                  : "border-emerald-400/30 shadow-emerald-400/10"
                        }`}
                    >
                        <div className="px-5 py-5">
                            <div className="flex items-start gap-3">
                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                                        confirmDialog.variant === "danger"
                                            ? "bg-red-400/15 text-red-400"
                                            : confirmDialog.variant ===
                                                "warning"
                                              ? "bg-amber-400/15 text-amber-400"
                                              : "bg-emerald-400/15 text-emerald-400"
                                    }`}
                                >
                                    {confirmDialog.variant === "danger" ? (
                                        <AlertTriangle size={24} />
                                    ) : confirmDialog.variant === "warning" ? (
                                        <AlertTriangle size={24} />
                                    ) : (
                                        <CheckCircle2 size={24} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-white">
                                        {confirmDialog.title}
                                    </p>
                                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-400">
                                        {confirmDialog.message}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-zinc-800 bg-zinc-950/50 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setConfirmDialog(null)}
                                className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-2.5 text-sm font-bold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                            >
                                {confirmDialog.cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={confirmDialog.onConfirm}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition ${
                                    confirmDialog.variant === "danger"
                                        ? "bg-red-500 text-white hover:bg-red-400"
                                        : confirmDialog.variant === "warning"
                                          ? "bg-amber-500 text-black hover:bg-amber-400"
                                          : "bg-emerald-500 text-white hover:bg-emerald-400"
                                }`}
                            >
                                {confirmDialog.variant === "danger" ? (
                                    <Trash2 size={16} />
                                ) : confirmDialog.variant === "warning" ? (
                                    <AlertTriangle size={16} />
                                ) : (
                                    <CheckCircle2 size={16} />
                                )}
                                {confirmDialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS NOTIFICATION */}
            {successMessage && (
                <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-emerald-400/30 bg-black px-5 py-5 shadow-2xl shadow-emerald-400/10">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-black text-white">
                                    {successMessage.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">
                                    {successMessage.description}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSuccessMessage(null)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-900">
                            <div
                                className="h-full bg-emerald-400"
                                style={{
                                    animation:
                                        "successProgress 3.5s linear forwards",
                                }}
                            />
                        </div>
                    </div>
                    <style>{`
                        @keyframes successProgress {
                            from { width: 100%; }
                            to { width: 0%; }
                        }
                    `}</style>
                </div>
            )}
        </AdminLayout>
    );
}
// =========================================================
// FILE ROW
// =========================================================

function FileRow({
    file,
    href,
    accent = "yellow",
}: {
    file: ContractFileRecord;
    href: string;
    accent?: "yellow" | "emerald";
}) {
    const accentBg =
        accent === "emerald"
            ? "bg-emerald-400/10 text-emerald-400"
            : "bg-yellow-400/10 text-yellow-400";

    return (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentBg}`}
            >
                <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">
                    {file.file_name}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                    {file.file_size ? formatFileSize(file.file_size) : "—"}
                </p>
            </div>
            <a
                href={href}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
                <Download size={12} />
                Download
            </a>
        </div>
    );
}

// =========================================================
// MENU ITEM
// =========================================================

function MenuItem({
    icon,
    label,
    onClick,
    highlight = false,
    danger = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    highlight?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                danger
                    ? "text-red-400 hover:bg-red-400/10"
                    : highlight
                      ? "text-yellow-400 hover:bg-yellow-400/10"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
            }`}
        >
            {icon}
            <span className="truncate">{label}</span>
        </button>
    );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
    label,
    value,
    icon,
    active,
    onClick,
    highlight = false,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
    highlight?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group min-w-0 rounded-2xl border p-4 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                active
                    ? highlight
                        ? "border-amber-400/30 bg-amber-400/[0.07] shadow-amber-400/[0.03]"
                        : "border-yellow-400/30 bg-yellow-400/[0.07] shadow-yellow-400/[0.03]"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        active
                            ? highlight
                                ? "bg-amber-400 text-black"
                                : "bg-yellow-400 text-black"
                            : "bg-black text-zinc-500 group-hover:text-zinc-300"
                    }`}
                >
                    {icon}
                </div>
                <span
                    className={`text-2xl font-black ${
                        active
                            ? highlight
                                ? "text-amber-300"
                                : "text-yellow-300"
                            : "text-white"
                    }`}
                >
                    {value}
                </span>
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-zinc-600">
                {label}
            </p>
        </button>
    );
}

// =========================================================
// REVIEW CHECK
// =========================================================

function ReviewCheck({ label, passed }: { label: string; passed: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black px-3 py-3">
            <span className="text-xs font-bold text-zinc-300">{label}</span>
            {passed ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 size={14} />
                    Ready
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400">
                    <XCircle size={14} />
                    Missing
                </span>
            )}
        </div>
    );
}

// =========================================================
// FORM INPUT
// =========================================================

function FormInput({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                {label}
                {required && <span className="ml-1 text-yellow-400">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:bg-zinc-950"
            />
        </div>
    );
}

// =========================================================
// SELECT INPUT
// =========================================================

function SelectInput({
    label,
    value,
    onChange,
    options,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    required?: boolean;
}) {
    return (
        <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                {label}
                {required && <span className="ml-1 text-yellow-400">*</span>}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    className="w-full appearance-none rounded-xl border border-zinc-800 bg-black px-4 py-3 pr-10 text-sm text-white outline-none focus:border-yellow-400/60"
                >
                    {options.map((option) => (
                        <option
                            key={option}
                            value={option}
                            className="bg-black"
                        >
                            {option}
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

// =========================================================
// TEXT AREA
// =========================================================

function TextArea({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
    full = false,
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    full?: boolean;
    required?: boolean;
}) {
    return (
        <div className={full ? "md:col-span-2" : ""}>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                {label}
                {required && <span className="ml-1 text-yellow-400">*</span>}
            </label>
            <textarea
                rows={rows}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:bg-zinc-950"
            />
        </div>
    );
}

// =========================================================
// DETAIL BOX
// =========================================================

function DetailBox({
    label,
    value,
    full = false,
}: {
    label: string;
    value: string;
    full?: boolean;
}) {
    return (
        <div
            className={`min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl ${
                full ? "sm:col-span-2" : ""
            }`}
        >
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">
                {label}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-zinc-300">
                {value}
            </p>
        </div>
    );
}

// =========================================================
// MODAL
// =========================================================

function Modal({
    title,
    subtitle,
    icon,
    onClose,
    children,
    wide = false,
}: {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
    wide?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-6">
            <div
                className={`my-auto w-full ${
                    wide ? "max-w-4xl" : "max-w-xl"
                } overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-xl`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-5 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black">
                            {icon}
                        </div>
                        <div className="min-w-0">
                            <h2 className="break-words text-lg font-black text-white">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="mt-1 break-words text-xs leading-5 text-zinc-600">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-500 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                    >
                        <X size={17} />
                    </button>
                </div>
                <div className="max-h-[82vh] overflow-y-auto overscroll-contain p-5 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
