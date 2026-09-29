import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, router } from "@inertiajs/react";
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

/* =========================================================
   TYPES
========================================================= */

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
    type?: "contract" | "signed" | string;
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

    contract_file_url?: string | null;
    signed_contract_url?: string | null;

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
    contracts?: ContractPermit[];
    contractPermits?: ContractPermit[];
    permits?: ContractPermit[];
    approvedInvoices?: InvoiceRecord[];
    staff?: Staff[];
}

/* =========================================================
   OPTIONS
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

const getTitle = (record: ContractPermit): string =>
    record.title ||
    record.name ||
    record.contract_type ||
    record.type ||
    "Contract & Permit";

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
    record.client ||
    record.client_name ||
    record.invoice?.client ||
    "—";

const getClientEmail = (record: ContractPermit): string =>
    record.client_email ||
    record.email ||
    "";

const getProject = (record: ContractPermit): string =>
    record.project ||
    record.project_name ||
    record.invoice?.project ||
    "—";

const getReference = (record: ContractPermit): string =>
    record.contract_no ||
    record.contract_number ||
    record.reference_number ||
    record.permit_number ||
    `CTR-${record.id}`;

const getStartDate = (record: ContractPermit): string | null =>
    record.start_date ||
    record.issue_date ||
    null;

const getExpiryDate = (record: ContractPermit): string | null =>
    record.end_date ||
    record.expiry_date ||
    null;

const getAssignedStaff = (
    record: ContractPermit,
): Staff | null => {
    if (
        record.assigned_staff &&
        typeof record.assigned_staff === "object"
    ) {
        return record.assigned_staff;
    }

    if (
        record.staff &&
        typeof record.staff === "object"
    ) {
        return record.staff;
    }

    return null;
};

const isInvoiceApproved = (
    record: ContractPermit,
): boolean =>
    record.is_invoice_approved === true ||
    record.is_invoice_approved === 1 ||
    Boolean(record.invoice_approved_at);

const isArchivedRecord = (
    record: ContractPermit,
): boolean =>
    Boolean(
        record.archived ||
            record.is_archived ||
            record.isArchived ||
            String(record.status || "").toLowerCase() ===
                "archived",
    );

const isContractRecord = (
    record: ContractPermit,
): boolean => {
    const type = String(getType(record)).toLowerCase();

    return (
        type === "contract" ||
        type.includes("contract")
    );
};

const isPermitRecord = (
    record: ContractPermit,
): boolean => {
    const type = String(getType(record)).toLowerCase();

    return (
        type === "permit" ||
        type.includes("permit")
    );
};

const getCorrectionReason = (
    record: ContractPermit,
): string =>
    record.correction_reason ||
    record.correctionReason ||
    record.rejection_reason ||
    "";

const getContractFiles = (
    record: ContractPermit,
): ContractFileRecord[] => {
    if (
        record.contract_files &&
        record.contract_files.length > 0
    ) {
        return record.contract_files;
    }

    if (
        record.files &&
        record.files.length > 0
    ) {
        return record.files.filter(
            (file) =>
                String(file.type || "")
                    .toLowerCase() === "contract",
        );
    }

    if (record.contract_file_path) {
        return [
            {
                id: -record.id,
                type: "contract",
                file_path:
                    record.contract_file_path,
                file_name:
                    record.contract_file_name ||
                    "Contract Document",
            },
        ];
    }

    return [];
};

const getSignedFiles = (
    record: ContractPermit,
): ContractFileRecord[] => {
    if (
        record.signed_files &&
        record.signed_files.length > 0
    ) {
        return record.signed_files;
    }

    if (
        record.files &&
        record.files.length > 0
    ) {
        return record.files.filter(
            (file) =>
                String(file.type || "")
                    .toLowerCase() === "signed",
        );
    }

    if (record.signed_contract_path) {
        return [
            {
                id: -record.id,
                type: "signed",
                file_path:
                    record.signed_contract_path,
                file_name:
                    record.signed_contract_file_name ||
                    "Signed Contract",
            },
        ];
    }

    return [];
};

const getContractFileCount = (
    record: ContractPermit,
): number =>
    getContractFiles(record).length;

const getSignedFileCount = (
    record: ContractPermit,
): number =>
    getSignedFiles(record).length;

const daysUntil = (
    dateValue?: string | null,
): number | null => {
    if (!dateValue) return null;

    const target = new Date(dateValue);
    if (Number.isNaN(target.getTime())) {
        return null;
    }

    const now = new Date();

    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    return Math.ceil(
        (target.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
    );
};

const calculateStatus = (
    record: ContractPermit,
): ContractStatus => {
    if (isArchivedRecord(record)) {
        return "Archived";
    }

    const rawStatus = String(
        record.workflow_status ||
            record.workflowStatus ||
            record.status ||
            "",
    ).trim();

    if (rawStatus === "Needs Correction") {
        return "Needs Correction";
    }

    if (rawStatus === "Submitted for Review") {
        return "Submitted for Review";
    }

    if (rawStatus === "Renewed") {
        return "Renewed";
    }

    if (rawStatus === "Expired") {
        return "Expired";
    }

    if (!record.approved_at) {
        return "Pending";
    }

    const expiry = getExpiryDate(record);

    if (!expiry) {
        return "Active";
    }

    const remaining = daysUntil(expiry);

    if (remaining === null) {
        return "Active";
    }

    if (remaining < 0) {
        return "Expired";
    }

    if (remaining <= 30) {
        return "Expiring Soon";
    }

    return "Active";
};

/*
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
| Invoice approval is intentionally NOT checked here.
|
| Contract:
|   Contract file + Signed file
|
| Permit:
|   Permit document(s)
|
| Submitted for Review is required.
*/
const canApproveDirectly = (
    record: ContractPermit,
): boolean => {
    if (
        calculateStatus(record) !==
        "Submitted for Review"
    ) {
        return false;
    }

    if (isArchivedRecord(record)) {
        return false;
    }

    if (getContractFileCount(record) === 0) {
        return false;
    }

    if (
        isContractRecord(record) &&
        getSignedFileCount(record) === 0
    ) {
        return false;
    }

    return true;
};

const formatDate = (
    value?: string | null,
): string => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
        },
    );
};

const formatDateTime = (
    value?: string | null,
): string => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        },
    );
};

const formatMoney = (
    value?: number | string | null,
): string => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        },
    ).format(amount);
};

const formatFileSize = (
    bytes?: number | null,
): string => {
    if (!bytes) return "";

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(1)} MB`;
};

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function StatusBadge({
    status,
}: {
    status: ContractStatus;
}) {
    const config: Record<
        ContractStatus,
        string
    > = {
        Active:
            "border-green-400/20 bg-green-400/10 text-green-300",
        Pending:
            "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
        "Needs Correction":
            "border-red-400/20 bg-red-400/10 text-red-300",
        "Submitted for Review":
            "border-blue-400/20 bg-blue-400/10 text-blue-300",
        "Expiring Soon":
            "border-orange-400/20 bg-orange-400/10 text-orange-300",
        Expired:
            "border-red-400/20 bg-red-400/10 text-red-300",
        Renewed:
            "border-purple-400/20 bg-purple-400/10 text-purple-300",
        Archived:
            "border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config[status]}`}
        >
            {status}
        </span>
    );
}

function FileRow({
    file,
}: {
    file: ContractFileRecord;
}) {
    const downloadUrl =
        file.id > 0
            ? `/admin/contracts/files/${file.id}/download`
            : file.file_path
              ? `/storage/${String(
                    file.file_path,
                ).replace(/^\/+/, "")}`
              : "#";

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                    <FileText
                        size={17}
                    />
                </div>

                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                        {file.file_name ||
                            "Document"}
                    </p>

                    <p className="mt-0.5 text-[11px] text-zinc-500">
                        {file.mime_type ||
                            "File"}

                        {file.file_size
                            ? ` • ${formatFileSize(
                                  file.file_size,
                              )}`
                            : ""}
                    </p>
                </div>
            </div>

            <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300"
            >
                <Download
                    size={14}
                />
                Download
            </a>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    onClick,
    active,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-2xl border p-4 text-left transition ${
                active
                    ? "border-yellow-400/30 bg-yellow-400/[0.08]"
                    : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-zinc-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                        {value}
                    </p>
                </div>

                <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-2 text-yellow-300">
                    {icon}
                </div>
            </div>
        </button>
    );
}

function MenuItem({
    icon,
    children,
    danger,
    disabled,
    onClick,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
                disabled
                    ? "cursor-not-allowed opacity-40"
                    : danger
                      ? "text-red-300 hover:bg-red-400/10"
                      : "text-zinc-200 hover:bg-white/5 hover:text-yellow-300"
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

function DetailBox({
    label,
    value,
}: {
    label: string;
    value?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {label}
            </p>

            <div className="mt-1 text-sm text-white">
                {value || "—"}
            </div>
        </div>
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function ContractPermitManagement(
    props: Props,
) {
    const records = useMemo(() => {
        const merged = [
            ...(props.contracts || []),
            ...(props.contractPermits || []),
            ...(props.permits || []),
        ];

        const map = new Map<
            number,
            ContractPermit
        >();

        merged.forEach((record) => {
            map.set(record.id, record);
        });

        return Array.from(map.values());
    }, [
        props.contracts,
        props.contractPermits,
        props.permits,
    ]);

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState<"All" | ContractStatus>(
            "All",
        );

    const [typeFilter, setTypeFilter] =
        useState<
            "All" | "Contract" | "Permit"
        >("All");

    const [showArchived, setShowArchived] =
        useState(false);

    const [selectedContract, setSelectedContract] =
        useState<ContractPermit | null>(
            null,
        );

    const [menuOpen, setMenuOpen] =
        useState<number | null>(null);

    const [confirmDialog, setConfirmDialog] =
        useState<{
            title: string;
            message: string;
            confirmLabel: string;
            cancelLabel: string;
            variant:
                | "success"
                | "danger"
                | "warning";
            onConfirm: () => void;
        } | null>(null);

    const [correctionRecord, setCorrectionRecord] =
        useState<ContractPermit | null>(
            null,
        );

    const [correctionReason, setCorrectionReason] =
        useState("");

    const [emailRecord, setEmailRecord] =
        useState<ContractPermit | null>(
            null,
        );

    const [emailMessage, setEmailMessage] =
        useState("");

    const [reviewProcessing, setReviewProcessing] =
        useState<number | null>(null);

    const [actionProcessing, setActionProcessing] =
        useState<number | null>(null);

    const [lastRefresh, setLastRefresh] =
        useState(new Date());

    const menuRef =
        useRef<HTMLDivElement | null>(null);

    /* =====================================================
       CLOSE MENU
    ===================================================== */

    useEffect(() => {
        const handler = (
            event: MouseEvent,
        ) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(
                    event.target as Node,
                )
            ) {
                setMenuOpen(null);
            }
        };

        document.addEventListener(
            "mousedown",
            handler,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handler,
            );
        };
    }, []);

  {/* =====================================================
    LIVE REFRESH
===================================================== */}

useEffect(() => {
    const interval = window.setInterval(() => {
        router.reload();
        setLastRefresh(new Date());
    }, 30000);

    return () => {
        window.clearInterval(interval);
    };
}, []);

const reloadContracts = () => {
    router.reload();
    setLastRefresh(new Date());
};

    /* =====================================================
       FILTER
    ===================================================== */

    const filteredRecords = useMemo(() => {
        const query =
            search.trim().toLowerCase();

        return records
            .filter((record) => {
                const archived =
                    isArchivedRecord(record);

                if (
                    showArchived !== archived
                ) {
                    return false;
                }

                return true;
            })
            .filter((record) => {
                if (
                    statusFilter === "All"
                ) {
                    return true;
                }

                return (
                    calculateStatus(
                        record,
                    ) === statusFilter
                );
            })
            .filter((record) => {
                if (
                    typeFilter === "All"
                ) {
                    return true;
                }

                if (
                    typeFilter ===
                    "Permit"
                ) {
                    return isPermitRecord(
                        record,
                    );
                }

                return isContractRecord(
                    record,
                );
            })
            .filter((record) => {
                if (!query) {
                    return true;
                }

                const haystack = [
                    getTitle(record),
                    getType(record),
                    getClient(record),
                    getProject(record),
                    getReference(record),
                    getClientEmail(record),
                    record.location || "",
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(
                    query,
                );
            });
    }, [
        records,
        search,
        statusFilter,
        typeFilter,
        showArchived,
    ]);

    /* =====================================================
       COUNTS
    ===================================================== */

    const activeRecords =
        records.filter(
            (record) =>
                !isArchivedRecord(record) &&
                calculateStatus(
                    record,
                ) === "Active",
        );

    const pendingRecords =
        records.filter(
            (record) =>
                !isArchivedRecord(record) &&
                calculateStatus(
                    record,
                ) === "Pending",
        );

    const submittedRecords =
        records.filter(
            (record) =>
                !isArchivedRecord(record) &&
                calculateStatus(
                    record,
                ) ===
                    "Submitted for Review",
        );

    const correctionRecords =
        records.filter(
            (record) =>
                !isArchivedRecord(record) &&
                calculateStatus(
                    record,
                ) === "Needs Correction",
        );

    const expiringRecords =
        records.filter(
            (record) =>
                !isArchivedRecord(record) &&
                calculateStatus(
                    record,
                ) === "Expiring Soon",
        );

    const archivedRecords =
        records.filter((record) =>
            isArchivedRecord(record),
        );

    /* =====================================================
       SUCCESS
    ===================================================== */

    const showSuccess = (
        title: string,
        message: string,
    ) => {
        window.alert(
            `${title}\n\n${message}`,
        );
    };

    /* =====================================================
       APPROVE
    ===================================================== */

    const approveContract = (
        record: ContractPermit,
    ) => {
        const isPermit =
            isPermitRecord(record);

        const contractFileCount =
            getContractFileCount(
                record,
            );

        const signedFileCount =
            getSignedFileCount(record);

        if (contractFileCount === 0) {
            window.alert(
                isPermit
                    ? "The permit document is required before approval."
                    : "The actual contract file is required before approval.",
            );

            return;
        }

        if (
            !isPermit &&
            signedFileCount === 0
        ) {
            window.alert(
                "A signed contract file is required before approval.",
            );

            return;
        }

        if (
            calculateStatus(record) !==
            "Submitted for Review"
        ) {
            window.alert(
                "Only records submitted for review can be approved.",
            );

            return;
        }

        setConfirmDialog({
            title: isPermit
                ? "Approve Permit and Make it Active?"
                : "Approve Contract and Make it Active?",

            message: isPermit
                ? "By approving, you confirm that you have VERIFIED the attached permit document(s).\n\nThe 90-day validity period will start on the Admin approval date."
                : "The 90-day validity period will start on the Admin approval date.",

            confirmLabel: isPermit
                ? "Yes, Verify & Approve"
                : "Yes, Approve & Activate",

            cancelLabel: "Cancel",

            variant: "success",

            onConfirm: () => {
                setConfirmDialog(
                    null,
                );

                setReviewProcessing(
                    record.id,
                );

                router.put(
                    `/admin/contracts/${record.id}/approve`,
                    {},
                    {
                        preserveScroll: true,

                        onSuccess: () => {
                            setSelectedContract(
                                null,
                            );

                            showSuccess(
                                isPermit
                                    ? "Permit Approved Successfully"
                                    : "Contract Approved Successfully",
                                `The ${
                                    isPermit
                                        ? "permit"
                                        : "contract"
                                } is now Active for 90 days from the Admin approval date.`,
                            );

                            reloadContracts();
                        },

                        onError: (
                            errors,
                        ) => {
                            console.error(
                                "Approve error:",
                                errors,
                            );

                            const firstError =
                                Object.values(
                                    errors,
                                )[0] ||
                                "Approval failed. Please check the record and try again.";

                            window.alert(
                                String(
                                    firstError,
                                ),
                            );
                        },

                        onFinish: () => {
                            setReviewProcessing(
                                null,
                            );
                        },
                    },
                );
            },
        });
    };

    /* =====================================================
       RETURN FOR CORRECTION
    ===================================================== */

    const openCorrection = (
        record: ContractPermit,
    ) => {
        setMenuOpen(null);

        setCorrectionRecord(
            record,
        );

        setCorrectionReason(
            getCorrectionReason(
                record,
            ),
        );
    };

    const submitCorrection = () => {
        if (!correctionRecord) {
            return;
        }

        if (
            !correctionReason.trim()
        ) {
            window.alert(
                "Please provide a correction reason.",
            );

            return;
        }

        const record =
            correctionRecord;

        setActionProcessing(
            record.id,
        );

        router.put(
            `/admin/contracts/${record.id}/return-correction`,
            {
                reason:
                    correctionReason.trim(),
            },
            {
                preserveScroll: true,

                onSuccess: () => {
                    setCorrectionRecord(
                        null,
                    );

                    setCorrectionReason(
                        "",
                    );

                    showSuccess(
                        "Returned for Correction",
                        "The record is now marked as Needs Correction.",
                    );

                    reloadContracts();
                },

                onError: (errors) => {
                    console.error(
                        "Correction error:",
                        errors,
                    );

                    const firstError =
                        Object.values(
                            errors,
                        )[0] ||
                        "Unable to return the record for correction.";

                    window.alert(
                        String(
                            firstError,
                        ),
                    );
                },

                onFinish: () => {
                    setActionProcessing(
                        null,
                    );
                },
            },
        );
    };

    /* =====================================================
       ARCHIVE
    ===================================================== */

    const archiveContract = (
        record: ContractPermit,
    ) => {
        setMenuOpen(null);

        setConfirmDialog({
            title: "Archive Record?",
            message:
                "This record will be removed from the active list and moved to Archive. You can restore it later.",

            confirmLabel:
                "Yes, Archive",

            cancelLabel: "Cancel",

            variant: "warning",

            onConfirm: () => {
                setConfirmDialog(
                    null,
                );

                setActionProcessing(
                    record.id,
                );

                router.put(
                    `/admin/contracts/${record.id}/archive`,
                    {},
                    {
                        preserveScroll: true,

                        onSuccess: () => {
                            showSuccess(
                                "Record Archived",
                                "The record has been moved to Archive.",
                            );

                            reloadContracts();
                        },

                        onError: (
                            errors,
                        ) => {
                            const firstError =
                                Object.values(
                                    errors,
                                )[0] ||
                                "Unable to archive the record.";

                            window.alert(
                                String(
                                    firstError,
                                ),
                            );
                        },

                        onFinish: () => {
                            setActionProcessing(
                                null,
                            );
                        },
                    },
                );
            },
        });
    };

    /* =====================================================
       RESTORE
    ===================================================== */

    const restoreContract = (
        record: ContractPermit,
    ) => {
        setMenuOpen(null);

        setConfirmDialog({
            title: "Restore Record?",
            message:
                "This record will be restored to the active contract and permit list.",

            confirmLabel:
                "Yes, Restore",

            cancelLabel: "Cancel",

            variant: "success",

            onConfirm: () => {
                setConfirmDialog(
                    null,
                );

                setActionProcessing(
                    record.id,
                );

                router.put(
                    `/admin/contracts/${record.id}/restore`,
                    {},
                    {
                        preserveScroll: true,

                        onSuccess: () => {
                            showSuccess(
                                "Record Restored",
                                "The record has been restored successfully.",
                            );

                            reloadContracts();
                        },

                        onError: (
                            errors,
                        ) => {
                            const firstError =
                                Object.values(
                                    errors,
                                )[0] ||
                                "Unable to restore the record.";

                            window.alert(
                                String(
                                    firstError,
                                ),
                            );
                        },

                        onFinish: () => {
                            setActionProcessing(
                                null,
                            );
                        },
                    },
                );
            },
        });
    };

    /* =====================================================
       DELETE
    ===================================================== */

    const deleteContract = (
        record: ContractPermit,
    ) => {
        setMenuOpen(null);

        setConfirmDialog({
            title: "Delete Record Permanently?",
            message:
                "This action permanently deletes the record and cannot be undone.",

            confirmLabel:
                "Yes, Delete",

            cancelLabel: "Cancel",

            variant: "danger",

            onConfirm: () => {
                setConfirmDialog(
                    null,
                );

                setActionProcessing(
                    record.id,
                );

                router.delete(
                    `/admin/contracts/${record.id}`,
                    {
                        preserveScroll: true,

                        onSuccess: () => {
                            setSelectedContract(
                                null,
                            );

                            showSuccess(
                                "Record Deleted",
                                "The record has been permanently deleted.",
                            );

                            reloadContracts();
                        },

                        onError: (
                            errors,
                        ) => {
                            const firstError =
                                Object.values(
                                    errors,
                                )[0] ||
                                "Unable to delete the record.";

                            window.alert(
                                String(
                                    firstError,
                                ),
                            );
                        },

                        onFinish: () => {
                            setActionProcessing(
                                null,
                            );
                        },
                    },
                );
            },
        });
    };

    /* =====================================================
       EMAIL
    ===================================================== */

    const openEmailModal = (
        record: ContractPermit,
    ) => {
        setMenuOpen(null);

        setEmailRecord(
            record,
        );

        setEmailMessage(
            `Dear ${getClient(record)},\n\nThis is a notification regarding your ${isPermitRecord(record) ? "permit" : "contract"} (${getReference(record)}).\n\nPlease review your ALIBATON account for the latest status and documents.\n\nThank you,\nALIBATON\nHeavy Equipment & Logistics`,
        );
    };

    const sendEmail = () => {
        if (!emailRecord) {
            return;
        }

        const record =
            emailRecord;

        const email =
            getClientEmail(record);

        if (!email) {
            window.alert(
                "No client email address is available for this record.",
            );

            return;
        }

        if (
            !emailMessage.trim()
        ) {
            window.alert(
                "Please enter a message.",
            );

            return;
        }

        setActionProcessing(
            record.id,
        );

        router.post(
            `/admin/contracts/${record.id}/notify`,
            {
                message:
                    emailMessage.trim(),
            },
            {
                preserveScroll: true,

                onSuccess: () => {
                    setEmailRecord(
                        null,
                    );

                    setEmailMessage(
                        "",
                    );

                    showSuccess(
                        "Email Sent",
                        `The notification was sent to ${email}.`,
                    );
                },

                onError: (errors) => {
                    console.error(
                        "Email error:",
                        errors,
                    );

                    const firstError =
                        Object.values(
                            errors,
                        )[0] ||
                        "Unable to send the email.";

                    window.alert(
                        String(
                            firstError,
                        ),
                    );
                },

                onFinish: () => {
                    setActionProcessing(
                        null,
                    );
                },
            },
        );
    };

    /* =====================================================
       PRINT
    ===================================================== */

    const printRecord = (
        record: ContractPermit,
    ) => {
        setMenuOpen(null);

        const status =
            calculateStatus(record);

        const html = `
            <html>
            <head>
                <title>${getTitle(
                    record,
                )}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        color: #111;
                    }

                    h1 {
                        margin-bottom: 4px;
                    }

                    h2 {
                        margin-top: 28px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 12px;
                    }

                    td {
                        border: 1px solid #ddd;
                        padding: 10px;
                    }

                    td:first-child {
                        width: 30%;
                        font-weight: bold;
                    }

                    .status {
                        font-weight: bold;
                    }
                </style>
            </head>

            <body>
                <h1>ALIBATON</h1>
                <p>Heavy Equipment & Logistics</p>

                <h2>${getTitle(
                    record,
                )}</h2>

                <table>
                    <tr>
                        <td>Type</td>
                        <td>${getType(
                            record,
                        )}</td>
                    </tr>

                    <tr>
                        <td>Reference</td>
                        <td>${getReference(
                            record,
                        )}</td>
                    </tr>

                    <tr>
                        <td>Client</td>
                        <td>${getClient(
                            record,
                        )}</td>
                    </tr>

                    <tr>
                        <td>Client Email</td>
                        <td>${getClientEmail(
                            record,
                        )}</td>
                    </tr>

                    <tr>
                        <td>Project</td>
                        <td>${getProject(
                            record,
                        )}</td>
                    </tr>

                    <tr>
                        <td>Location</td>
                        <td>${record.location || "—"}</td>
                    </tr>

                    <tr>
                        <td>Status</td>
                        <td class="status">${status}</td>
                    </tr>

                    <tr>
                        <td>Start Date</td>
                        <td>${formatDate(
                            getStartDate(
                                record,
                            ),
                        )}</td>
                    </tr>

                    <tr>
                        <td>Expiry Date</td>
                        <td>${formatDate(
                            getExpiryDate(
                                record,
                            ),
                        )}</td>
                    </tr>

                    <tr>
                        <td>Approved At</td>
                        <td>${formatDateTime(
                            record.approved_at,
                        )}</td>
                    </tr>

                    <tr>
                        <td>Created At</td>
                        <td>${formatDateTime(
                            record.created_at,
                        )}</td>
                    </tr>
                </table>

                <h2>Documents</h2>

                <p>
                    Primary documents:
                    ${getContractFileCount(
                        record,
                    )}
                </p>

                ${
                    isContractRecord(
                        record,
                    )
                        ? `<p>Signed documents: ${getSignedFileCount(
                              record,
                          )}</p>`
                        : ""
                }

                <br />

                <p>
                    ALIBATON<br />
                    Heavy Equipment & Logistics<br />
                    45 Riverside, Quezon City, Philippines<br />
                    info@alibaton.com
                </p>
            </body>
            </html>
        `;

        const printWindow =
            window.open(
                "",
                "_blank",
                "width=900,height=700",
            );

        if (!printWindow) {
            window.alert(
                "Please allow pop-ups to print this record.",
            );

            return;
        }

        printWindow.document.write(
            html,
        );

        printWindow.document.close();

        printWindow.focus();

        window.setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <AdminLayout>
            <Head title="Contract & Permit Management" />

            <div className="min-h-screen bg-black text-white">
                <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                    {/* =====================================
                        HEADER
                    ===================================== */}

                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                                    <FileCheck2
                                        size={22}
                                    />
                                </div>

                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-white">
                                        Contract &
                                        Permit
                                        Management
                                    </h1>

                                    <p className="mt-1 text-sm text-zinc-500">
                                        Review, approve,
                                        monitor, and manage
                                        contracts and
                                        permits.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start lg:self-auto">
                            <button
                                type="button"
                                onClick={
                                    reloadContracts
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300"
                            >
                                <RefreshCw
                                    size={14}
                                />

                                Refresh
                            </button>

                            <div className="hidden items-center gap-2 rounded-xl border border-green-400/10 bg-green-400/[0.04] px-3 py-2 sm:flex">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                                </span>

                                <span className="text-[11px] font-medium text-green-300">
                                    Live
                                </span>

                                <span className="text-[11px] text-zinc-500">
                                    •
                                </span>

                                <span className="text-[11px] text-zinc-500">
                                    {lastRefresh.toLocaleTimeString(
                                        "en-PH",
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* =====================================
                        STATS
                    ===================================== */}

                    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        <StatCard
                            label="Active"
                            value={
                                activeRecords.length
                            }
                            icon={
                                <CheckCircle2
                                    size={18}
                                />
                            }
                            active={
                                statusFilter ===
                                    "Active" &&
                                !showArchived
                            }
                            onClick={() => {
                                setShowArchived(
                                    false,
                                );

                                setStatusFilter(
                                    "Active",
                                );
                            }}
                        />

                        <StatCard
                            label="Submitted for Review"
                            value={
                                submittedRecords.length
                            }
                            icon={
                                <ShieldCheck
                                    size={18}
                                />
                            }
                            active={
                                statusFilter ===
                                    "Submitted for Review" &&
                                !showArchived
                            }
                            onClick={() => {
                                setShowArchived(
                                    false,
                                );

                                setStatusFilter(
                                    "Submitted for Review",
                                );
                            }}
                        />

                        <StatCard
                            label="Needs Correction"
                            value={
                                correctionRecords.length
                            }
                            icon={
                                <AlertTriangle
                                    size={18}
                                />
                            }
                            active={
                                statusFilter ===
                                    "Needs Correction" &&
                                !showArchived
                            }
                            onClick={() => {
                                setShowArchived(
                                    false,
                                );

                                setStatusFilter(
                                    "Needs Correction",
                                );
                            }}
                        />

                        <StatCard
                            label="Pending"
                            value={
                                pendingRecords.length
                            }
                            icon={
                                <Clock3
                                    size={18}
                                />
                            }
                            active={
                                statusFilter ===
                                    "Pending" &&
                                !showArchived
                            }
                            onClick={() => {
                                setShowArchived(
                                    false,
                                );

                                setStatusFilter(
                                    "Pending",
                                );
                            }}
                        />

                        <StatCard
                            label="Expiring Soon"
                            value={
                                expiringRecords.length
                            }
                            icon={
                                <CalendarDays
                                    size={18}
                                />
                            }
                            active={
                                statusFilter ===
                                    "Expiring Soon" &&
                                !showArchived
                            }
                            onClick={() => {
                                setShowArchived(
                                    false,
                                );

                                setStatusFilter(
                                    "Expiring Soon",
                                );
                            }}
                        />

                        <StatCard
                            label="Archived"
                            value={
                                archivedRecords.length
                            }
                            icon={
                                <Archive
                                    size={18}
                                />
                            }
                            active={
                                showArchived
                            }
                            onClick={() => {
                                setShowArchived(
                                    true,
                                );

                                setStatusFilter(
                                    "All",
                                );
                            }}
                        />
                    </div>

                    {/* =====================================
                        FILTER BAR
                    ===================================== */}

                    <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={17}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                                />

                                <input
                                    value={search}
                                    onChange={(
                                        event,
                                    ) =>
                                        setSearch(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="Search client, project, reference, type..."
                                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-400/40"
                                />
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <select
                                    value={
                                        statusFilter
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setStatusFilter(
                                            event
                                                .target
                                                .value as
                                                | "All"
                                                | ContractStatus,
                                        )
                                    }
                                    className="rounded-xl border border-white/10 bg-black px-3 py-2.5 text-xs font-medium text-zinc-200 outline-none focus:border-yellow-400/40"
                                >
                                    <option value="All">
                                        All Status
                                    </option>
                                    <option value="Active">
                                        Active
                                    </option>
                                    <option value="Pending">
                                        Pending
                                    </option>
                                    <option value="Needs Correction">
                                        Needs Correction
                                    </option>
                                    <option value="Submitted for Review">
                                        Submitted for Review
                                    </option>
                                    <option value="Expiring Soon">
                                        Expiring Soon
                                    </option>
                                    <option value="Expired">
                                        Expired
                                    </option>
                                    <option value="Renewed">
                                        Renewed
                                    </option>
                                </select>

                                <select
                                    value={
                                        typeFilter
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setTypeFilter(
                                            event
                                                .target
                                                .value as
                                                | "All"
                                                | "Contract"
                                                | "Permit",
                                        )
                                    }
                                    className="rounded-xl border border-white/10 bg-black px-3 py-2.5 text-xs font-medium text-zinc-200 outline-none focus:border-yellow-400/40"
                                >
                                    <option value="All">
                                        All Types
                                    </option>

                                    <option value="Contract">
                                        Contracts
                                    </option>

                                    <option value="Permit">
                                        Permits
                                    </option>
                                </select>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch(
                                            "",
                                        );

                                        setStatusFilter(
                                            "All",
                                        );

                                        setTypeFilter(
                                            "All",
                                        );
                                    }}
                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                            <p className="text-xs text-zinc-500">
                                Showing{" "}
                                <span className="font-semibold text-zinc-300">
                                    {
                                        filteredRecords.length
                                    }
                                </span>{" "}
                                record
                                {filteredRecords.length ===
                                1
                                    ? ""
                                    : "s"}
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowArchived(
                                        !showArchived,
                                    );

                                    setStatusFilter(
                                        "All",
                                    );
                                }}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                    showArchived
                                        ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                                }`}
                            >
                                <Archive
                                    size={14}
                                />

                                {showArchived
                                    ? "Viewing Archive"
                                    : "View Archive"}
                            </button>
                        </div>
                    </div>

                    {/* =====================================
                        TABLE
                    ===================================== */}

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                        <div className="overflow-x-auto">
                            <table className="min-w-[1100px] w-full">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.025]">
                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            Contract / Permit
                                        </th>

                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            Client
                                        </th>

                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            Project
                                        </th>

                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            Documents
                                        </th>

                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            Validity
                                        </th>

                                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            Status
                                        </th>

                                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-white/5">
                                    {filteredRecords.length ===
                                    0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="px-6 py-16 text-center"
                                            >
                                                <div className="mx-auto flex max-w-md flex-col items-center">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-600">
                                                        <FileText
                                                            size={
                                                                25
                                                            }
                                                        />
                                                    </div>

                                                    <p className="mt-4 text-sm font-semibold text-zinc-300">
                                                        No records
                                                        found
                                                    </p>

                                                    <p className="mt-1 text-xs text-zinc-600">
                                                        Try changing
                                                        your search
                                                        or filters.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map(
                                            (
                                                record,
                                            ) => {
                                                const status =
                                                    calculateStatus(
                                                        record,
                                                    );

                                                const isPermit =
                                                    isPermitRecord(
                                                        record,
                                                    );

                                                const canApprove =
                                                    canApproveDirectly(
                                                        record,
                                                    );

                                                const expiry =
                                                    getExpiryDate(
                                                        record,
                                                    );

                                                const remaining =
                                                    daysUntil(
                                                        expiry,
                                                    );

                                                const processing =
                                                    reviewProcessing ===
                                                        record.id ||
                                                    actionProcessing ===
                                                        record.id;

                                                return (
                                                    <tr
                                                        key={
                                                            record.id
                                                        }
                                                        className="transition hover:bg-white/[0.025]"
                                                    >
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-yellow-400/15 bg-yellow-400/[0.06] text-yellow-300">
                                                                    {isPermit ? (
                                                                        <ShieldCheck
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <FileText
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <p className="max-w-[220px] truncate text-sm font-semibold text-white">
                                                                        {getTitle(
                                                                            record,
                                                                        )}
                                                                    </p>

                                                                    <p className="mt-1 text-[11px] text-zinc-500">
                                                                        {getReference(
                                                                            record,
                                                                        )}
                                                                    </p>

                                                                    <div className="mt-2">
                                                                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-400">
                                                                            {getType(
                                                                                record,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="text-sm font-medium text-zinc-200">
                                                                {getClient(
                                                                    record,
                                                                )}
                                                            </p>

                                                            <p className="mt-1 text-[11px] text-zinc-600">
                                                                {getClientEmail(
                                                                    record,
                                                                ) ||
                                                                    "No email"}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="max-w-[190px] truncate text-sm text-zinc-300">
                                                                {getProject(
                                                                    record,
                                                                )}
                                                            </p>

                                                            {record.location && (
                                                                <p className="mt-1 flex max-w-[190px] items-center gap-1 truncate text-[11px] text-zinc-600">
                                                                    <MapPin
                                                                        size={
                                                                            11
                                                                        }
                                                                    />

                                                                    {
                                                                        record.location
                                                                    }
                                                                </p>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-zinc-300">
                                                                    <span className="font-semibold text-white">
                                                                        {
                                                                            getContractFileCount(
                                                                                record,
                                                                            )
                                                                        }
                                                                    </span>{" "}
                                                                    document
                                                                    {getContractFileCount(
                                                                        record,
                                                                    ) ===
                                                                    1
                                                                        ? ""
                                                                        : "s"}
                                                                </p>

                                                                {!isPermit && (
                                                                    <p className="text-[11px] text-zinc-600">
                                                                        Signed:{" "}
                                                                        <span className="text-zinc-400">
                                                                            {
                                                                                getSignedFileCount(
                                                                                    record,
                                                                                )
                                                                            }
                                                                        </span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {status ===
                                                                "Active" ||
                                                            status ===
                                                                "Expiring Soon" ||
                                                            status ===
                                                                "Expired" ? (
                                                                <div>
                                                                    <p className="text-xs text-zinc-300">
                                                                        {formatDate(
                                                                            getStartDate(
                                                                                record,
                                                                            ),
                                                                        )}
                                                                    </p>

                                                                    <p className="mt-1 text-[11px] text-zinc-600">
                                                                        to{" "}
                                                                        {formatDate(
                                                                            expiry,
                                                                        )}
                                                                    </p>

                                                                    {remaining !==
                                                                        null && (
                                                                        <p
                                                                            className={`mt-1 text-[10px] font-semibold ${
                                                                                remaining <
                                                                                0
                                                                                    ? "text-red-300"
                                                                                    : remaining <=
                                                                                        30
                                                                                      ? "text-orange-300"
                                                                                      : "text-green-300"
                                                                            }`}
                                                                        >
                                                                            {remaining <
                                                                            0
                                                                                ? `${Math.abs(
                                                                                      remaining,
                                                                                  )} days expired`
                                                                                : `${remaining} days remaining`}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-zinc-600">
                                                                    Not active
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <StatusBadge
                                                                status={
                                                                    status
                                                                }

                                                            />

                                                            {status ===
                                                                "Needs Correction" &&
                                                                getCorrectionReason(
                                                                    record,
                                                                ) && (
                                                                    <p className="mt-2 max-w-[180px] truncate text-[10px] text-red-300/70">
                                                                        {getCorrectionReason(
                                                                            record,
                                                                        )}
                                                                    </p>
                                                                )}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <div
                                                                ref={
                                                                    menuOpen ===
                                                                    record.id
                                                                        ? menuRef
                                                                        : null
                                                                }
                                                                className="relative flex justify-end"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                    onClick={() =>
                                                                        setMenuOpen(
                                                                            menuOpen ===
                                                                                record.id
                                                                                ? null
                                                                                : record.id,
                                                                        )
                                                                    }
                                                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300 disabled:opacity-40"
                                                                >
                                                                    {processing ? (
                                                                        <RefreshCw
                                                                            size={
                                                                                16
                                                                            }
                                                                            className="animate-spin"
                                                                        />
                                                                    ) : (
                                                                        <MoreVertical
                                                                            size={
                                                                                17
                                                                            }
                                                                        />
                                                                    )}
                                                                </button>

                                                                {menuOpen ===
                                                                    record.id && (
                                                                    <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#101010] py-1 shadow-2xl shadow-black/70">
                                                                        <MenuItem
                                                                            icon={
                                                                                <Eye
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            }
                                                                            onClick={() => {
                                                                                setMenuOpen(
                                                                                    null,
                                                                                );

                                                                                setSelectedContract(
                                                                                    record,
                                                                                );
                                                                            }}
                                                                        >
                                                                            View
                                                                            Details
                                                                        </MenuItem>

                                                                        <MenuItem
                                                                            icon={
                                                                                <Download
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            }
                                                                            onClick={() => {
                                                                                setMenuOpen(
                                                                                    null,
                                                                                );

                                                                                if (
                                                                                    getContractFiles(
                                                                                        record,
                                                                                    ).length >
                                                                                    0
                                                                                ) {
                                                                                    const file =
                                                                                        getContractFiles(
                                                                                            record,
                                                                                        )[0];

                                                                                    const url =
                                                                                        file.id >
                                                                                        0
                                                                                            ? `/admin/contracts/files/${file.id}/download`
                                                                                            : record.contract_file_url ||
                                                                                              `/storage/${String(
                                                                                                  file.file_path ||
                                                                                                      "",
                                                                                              ).replace(
                                                                                                  /^\/+/,
                                                                                                  "",
                                                                                              )}`;

                                                                                    window.open(
                                                                                        url,
                                                                                        "_blank",
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            Download
                                                                            Document
                                                                        </MenuItem>

                                                                        {!isPermit &&
                                                                            getSignedFileCount(
                                                                                record,
                                                                            ) >
                                                                                0 && (
                                                                                <MenuItem
                                                                                    icon={
                                                                                        <FileCheck2
                                                                                            size={
                                                                                                14
                                                                                            }
                                                                                        />
                                                                                    }
                                                                                    onClick={() => {
                                                                                        setMenuOpen(
                                                                                            null,
                                                                                        );

                                                                                        const file =
                                                                                            getSignedFiles(
                                                                                                record,
                                                                                            )[0];

                                                                                        const url =
                                                                                            file.id >
                                                                                            0
                                                                                                ? `/admin/contracts/files/${file.id}/download`
                                                                                                : record.signed_contract_url ||
                                                                                                  `/storage/${String(
                                                                                                      file.file_path ||
                                                                                                          "",
                                                                                                  ).replace(
                                                                                                      /^\/+/,
                                                                                                      "",
                                                                                                  )}`;

                                                                                        window.open(
                                                                                            url,
                                                                                            "_blank",
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    Download
                                                                                    Signed
                                                                                    Contract
                                                                                </MenuItem>
                                                                            )}

                                                                        <MenuItem
                                                                            icon={
                                                                                <Send
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            }
                                                                            onClick={() =>
                                                                                openEmailModal(
                                                                                    record,
                                                                                )
                                                                            }
                                                                        >
                                                                            Email
                                                                            Client
                                                                        </MenuItem>

                                                                        <MenuItem
                                                                            icon={
                                                                                <FileText
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            }
                                                                            onClick={() =>
                                                                                printRecord(
                                                                                    record,
                                                                                )
                                                                            }
                                                                        >
                                                                            Print
                                                                        </MenuItem>

                                                                        {!isArchivedRecord(
                                                                            record,
                                                                        ) &&
                                                                            status ===
                                                                                "Submitted for Review" && (
                                                                                <>
                                                                                    <div className="my-1 border-t border-white/10" />

                                                                                    <MenuItem
                                                                                        icon={
                                                                                            <CheckCircle2
                                                                                                size={
                                                                                                    14
                                                                                                }
                                                                                            />
                                                                                        }
                                                                                        disabled={
                                                                                            !canApprove
                                                                                        }
                                                                                        onClick={() =>
                                                                                            approveContract(
                                                                                                record,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {isPermit
                                                                                            ? "Verify & Approve Permit"
                                                                                            : "Approve & Activate"}
                                                                                    </MenuItem>

                                                                                    <MenuItem
                                                                                        icon={
                                                                                            <XCircle
                                                                                                size={
                                                                                                    14
                                                                                                }
                                                                                            />
                                                                                        }
                                                                                        onClick={() =>
                                                                                            openCorrection(
                                                                                                record,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        Return
                                                                                        for
                                                                                        Correction
                                                                                    </MenuItem>
                                                                                </>
                                                                            )}

                                                                        {!isArchivedRecord(
                                                                            record,
                                                                        ) && (
                                                                            <>
                                                                                <div className="my-1 border-t border-white/10" />

                                                                                <MenuItem
                                                                                    icon={
                                                                                        <Archive
                                                                                            size={
                                                                                                14
                                                                                            }
                                                                                        />
                                                                                    }
                                                                                    onClick={() =>
                                                                                        archiveContract(
                                                                                            record,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Archive
                                                                                </MenuItem>
                                                                            </>
                                                                        )}

                                                                        {isArchivedRecord(
                                                                            record,
                                                                        ) && (
                                                                            <>
                                                                                <div className="my-1 border-t border-white/10" />

                                                                                <MenuItem
                                                                                    icon={
                                                                                        <Archive
                                                                                            size={
                                                                                                14
                                                                                            }
                                                                                        />
                                                                                    }
                                                                                    onClick={() =>
                                                                                        restoreContract(
                                                                                            record,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Restore
                                                                                </MenuItem>

                                                                                <MenuItem
                                                                                    icon={
                                                                                        <Trash2
                                                                                            size={
                                                                                                14
                                                                                            }
                                                                                        />
                                                                                    }
                                                                                    danger
                                                                                    onClick={() =>
                                                                                        deleteContract(
                                                                                            record,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Delete
                                                                                    Permanently
                                                                                </MenuItem>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            },
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* =====================================
                        FOOTER INFO
                    ===================================== */}

                    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.015] px-4 py-3 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            Contract approval requires
                            the actual contract and
                            signed contract file.
                            Permit approval requires
                            permit document(s).
                        </p>

                        <p>
                            Invoice approval does not
                            block contract or permit
                            approval.
                        </p>
                    </div>
                </div>
            </div>

            {/* =================================================
                VIEW MODAL
            ================================================= */}

            {selectedContract && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
                    <div className="my-8 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-2xl shadow-black/80">
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                                    {isPermitRecord(
                                        selectedContract,
                                    ) ? (
                                        <ShieldCheck
                                            size={
                                                21
                                            }
                                        />
                                    ) : (
                                        <FileText
                                            size={
                                                21
                                            }
                                        />
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {getTitle(
                                            selectedContract,
                                        )}
                                    </h2>

                                    <p className="mt-1 text-xs text-zinc-500">
                                        {getReference(
                                            selectedContract,
                                        )}{" "}
                                        •{" "}
                                        {getType(
                                            selectedContract,
                                        )}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedContract(
                                        null,
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                            >
                                <X
                                    size={18}
                                />
                            </button>
                        </div>

                        <div className="max-h-[75vh] overflow-y-auto p-5">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <DetailBox
                                    label="Type"
                                    value={
                                        getType(
                                            selectedContract,
                                        )
                                    }
                                />

                                <DetailBox
                                    label="Reference Number"
                                    value={
                                        getReference(
                                            selectedContract,
                                        )
                                    }
                                />

                                <DetailBox
                                    label="Status"
                                    value={
                                        <StatusBadge
                                            status={calculateStatus(
                                                selectedContract,
                                            )}
                                        />
                                    }
                                />

                                <DetailBox
                                    label="Client"
                                    value={
                                        getClient(
                                            selectedContract,
                                        )
                                    }
                                />

                                <DetailBox
                                    label="Client Email"
                                    value={
                                        getClientEmail(
                                            selectedContract,
                                        )
                                    }
                                />

                                <DetailBox
                                    label="Project"
                                    value={
                                        getProject(
                                            selectedContract,
                                        )
                                    }
                                />

                                <DetailBox
                                    label="Location"
                                    value={
                                        selectedContract.location
                                    }
                                />

                                <DetailBox
                                    label="Assigned Staff"
                                    value={
                                        getAssignedStaff(
                                            selectedContract,
                                        )?.name ||
                                        "Unassigned"
                                    }
                                />

                                <DetailBox
                                    label="Created"
                                    value={formatDateTime(
                                        selectedContract.created_at,
                                    )}
                                />

                                <DetailBox
                                    label="Submitted At"
                                    value={formatDateTime(
                                        selectedContract.submitted_at,
                                    )}
                                />

                                <DetailBox
                                    label="Approved At"
                                    value={formatDateTime(
                                        selectedContract.approved_at,
                                    )}
                                />

                                <DetailBox
                                    label="Start Date"
                                    value={formatDate(
                                        getStartDate(
                                            selectedContract,
                                        ),
                                    )}
                                />

                                <DetailBox
                                    label="End Date"
                                    value={formatDate(
                                        getExpiryDate(
                                            selectedContract,
                                        ),
                                    )}
                                />

                                <DetailBox
                                    label="Invoice Status"
                                    value={
                                        selectedContract.invoice
                                            ? selectedContract
                                                  .invoice
                                                  .status ||
                                              "—"
                                            : "No Invoice"
                                    }
                                />

                                <DetailBox
                                    label="Invoice Approval"
                                    value={
                                        isInvoiceApproved(
                                            selectedContract,
                                        )
                                            ? "Approved"
                                            : "Not Approved"
                                    }
                                />
                            </div>

                            {getCorrectionReason(
                                selectedContract,
                            ) && (
                                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-4">
                                    <div className="flex gap-3">
                                        <AlertTriangle
                                            size={
                                                18
                                            }
                                            className="mt-0.5 shrink-0 text-red-300"
                                        />

                                        <div>
                                            <p className="text-sm font-semibold text-red-200">
                                                Correction
                                                Required
                                            </p>

                                            <p className="mt-1 text-sm leading-6 text-red-200/70">
                                                {getCorrectionReason(
                                                    selectedContract,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedContract.description && (
                                <div className="mt-4">
                                    <DetailBox
                                        label="Description"
                                        value={
                                            <p className="whitespace-pre-wrap leading-6 text-zinc-300">
                                                {
                                                    selectedContract.description
                                                }
                                            </p>
                                        }
                                    />
                                </div>
                            )}

                            {selectedContract.notes && (
                                <div className="mt-3">
                                    <DetailBox
                                        label="Notes"
                                        value={
                                            <p className="whitespace-pre-wrap leading-6 text-zinc-300">
                                                {
                                                    selectedContract.notes
                                                }
                                            </p>
                                        }
                                    />
                                </div>
                            )}

                            {/* DOCUMENTS */}

                            <div className="mt-6">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-white">
                                            {isPermitRecord(
                                                selectedContract,
                                            )
                                                ? "Permit Documents"
                                                : "Contract Documents"}
                                        </h3>

                                        <p className="mt-1 text-xs text-zinc-600">
                                            {isPermitRecord(
                                                selectedContract,
                                            )
                                                ? "Verify the attached permit document(s) before approval."
                                                : "The actual contract and signed contract must be present before approval."}
                                        </p>
                                    </div>

                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-400">
                                        {
                                            getContractFileCount(
                                                selectedContract,
                                            )
                                        }{" "}
                                        file
                                        {getContractFileCount(
                                            selectedContract,
                                        ) === 1
                                            ? ""
                                            : "s"}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {getContractFiles(
                                        selectedContract,
                                    ).length >
                                    0 ? (
                                        getContractFiles(
                                            selectedContract,
                                        ).map(
                                            (
                                                file,
                                            ) => (
                                                <FileRow
                                                    key={
                                                        file.id
                                                    }
                                                    file={
                                                        file
                                                    }
                                                />
                                            ),
                                        )
                                    ) : (
                                        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.04] p-4 text-sm text-red-300">
                                            No document
                                            attached.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SIGNED */}

                            {isContractRecord(
                                selectedContract,
                            ) && (
                                <div className="mt-6">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-white">
                                                Signed Contract
                                            </h3>

                                            <p className="mt-1 text-xs text-zinc-600">
                                                Required before
                                                contract approval.
                                            </p>
                                        </div>

                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-400">
                                            {
                                                getSignedFileCount(
                                                    selectedContract,
                                                )
                                            }{" "}
                                            file
                                            {getSignedFileCount(
                                                selectedContract,
                                            ) === 1
                                                ? ""
                                                : "s"}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {getSignedFiles(
                                            selectedContract,
                                        ).length >
                                        0 ? (
                                            getSignedFiles(
                                                selectedContract,
                                            ).map(
                                                (
                                                    file,
                                                ) => (
                                                    <FileRow
                                                        key={
                                                            file.id
                                                        }
                                                        file={
                                                            file
                                                        }
                                                    />
                                                ),
                                            )
                                        ) : (
                                            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.04] p-4 text-sm text-red-300">
                                                No signed
                                                contract
                                                attached.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* MODAL ACTIONS */}

                        <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-black/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedContract(
                                        null,
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
                            >
                                Close
                            </button>

                            {calculateStatus(
                                selectedContract,
                            ) ===
                                "Submitted for Review" && (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openCorrection(
                                                selectedContract,
                                            )
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/15"
                                    >
                                        <XCircle
                                            size={
                                                15
                                            }
                                        />
                                        Return for
                                        Correction
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            reviewProcessing ===
                                            selectedContract.id
                                        }
                                        onClick={() =>
                                            approveContract(
                                                selectedContract,
                                            )
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {reviewProcessing ===
                                        selectedContract.id ? (
                                            <RefreshCw
                                                size={
                                                    15
                                                }
                                                className="animate-spin"
                                            />
                                        ) : (
                                            <CheckCircle2
                                                size={
                                                    15
                                                }
                                            />
                                        )}

                                        {isPermitRecord(
                                            selectedContract,
                                        )
                                            ? "Verify & Approve Permit"
                                            : "Approve & Activate"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
                CORRECTION MODAL
            ================================================= */}

            {correctionRecord && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-2xl shadow-black/80">
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    Return for
                                    Correction
                                </h2>

                                <p className="mt-1 text-xs text-zinc-600">
                                    {getReference(
                                        correctionRecord,
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setCorrectionRecord(
                                        null,
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400"
                            >
                                <X
                                    size={17}
                                />
                            </button>
                        </div>

                        <div className="p-5">
                            <label className="text-xs font-semibold text-zinc-300">
                                Correction Reason
                            </label>

                            <textarea
                                value={
                                    correctionReason
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setCorrectionReason(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                rows={6}
                                placeholder="Explain what needs to be corrected..."
                                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-yellow-400/40"
                            />
                        </div>

                        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setCorrectionRecord(
                                        null,
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={
                                    actionProcessing ===
                                    correctionRecord.id
                                }
                                onClick={
                                    submitCorrection
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                            >
                                {actionProcessing ===
                                correctionRecord.id ? (
                                    <RefreshCw
                                        size={
                                            14
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Send
                                        size={
                                            14
                                        }
                                    />
                                )}

                                Return for
                                Correction
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
                EMAIL MODAL
            ================================================= */}

            {emailRecord && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-2xl shadow-black/80">
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    Email Client
                                </h2>

                                <p className="mt-1 text-xs text-zinc-600">
                                    {getClient(
                                        emailRecord,
                                    )}{" "}
                                    •{" "}
                                    {getClientEmail(
                                        emailRecord,
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setEmailRecord(
                                        null,
                                    )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400"
                            >
                                <X
                                    size={17}
                                />
                            </button>
                        </div>

                        <div className="p-5">
                            <label className="text-xs font-semibold text-zinc-300">
                                Message
                            </label>

                            <textarea
                                value={
                                    emailMessage
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setEmailMessage(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                rows={10}
                                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-yellow-400/40"
                            />
                        </div>

                        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setEmailRecord(
                                        null,
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={
                                    actionProcessing ===
                                    emailRecord.id
                                }
                                onClick={
                                    sendEmail
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
                            >
                                {actionProcessing ===
                                emailRecord.id ? (
                                    <RefreshCw
                                        size={
                                            14
                                        }
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Mail
                                        size={
                                            14
                                        }
                                    />
                                )}

                                Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
                CONFIRM DIALOG
            ================================================= */}

            {confirmDialog && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-2xl shadow-black/80">
                        <div className="p-5">
                            <div
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                                    confirmDialog.variant ===
                                    "danger"
                                        ? "border-red-400/20 bg-red-400/10 text-red-300"
                                        : confirmDialog.variant ===
                                            "warning"
                                          ? "border-orange-400/20 bg-orange-400/10 text-orange-300"
                                          : "border-green-400/20 bg-green-400/10 text-green-300"
                                }`}
                            >
                                {confirmDialog.variant ===
                                "danger" ? (
                                    <Trash2
                                        size={
                                            20
                                        }
                                    />
                                ) : confirmDialog.variant ===
                                  "warning" ? (
                                    <Archive
                                        size={
                                            20
                                        }
                                    />
                                ) : (
                                    <CheckCircle2
                                        size={
                                            20
                                        }
                                    />
                                )}
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-white">
                                {
                                    confirmDialog.title
                                }
                            </h2>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">
                                {
                                    confirmDialog.message
                                }
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setConfirmDialog(
                                        null,
                                    )
                                }
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
                            >
                                {
                                    confirmDialog.cancelLabel
                                }
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmDialog.onConfirm
                                }
                                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                                    confirmDialog.variant ===
                                    "danger"
                                        ? "bg-red-500 text-white hover:bg-red-400"
                                        : confirmDialog.variant ===
                                            "warning"
                                          ? "bg-orange-400 text-black hover:bg-orange-300"
                                          : "bg-yellow-400 text-black hover:bg-yellow-300"
                                }`}
                            >
                                {
                                    confirmDialog.confirmLabel
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}