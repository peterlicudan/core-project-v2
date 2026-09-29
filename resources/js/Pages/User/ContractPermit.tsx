import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, useForm } from "@inertiajs/react";
import UserLayout from "../../Layouts/UserLayout";

import {
    AlertTriangle,
    Archive,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Cloud,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Mail,
    MapPin,
    MoreVertical,
    PlusCircle,
    Printer,
    RefreshCw,
    Search,
    Send,
    ShieldCheck,
    Upload,
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

type MainTab = "contract" | "permit";
type SubTab =
    | "all"
    | "active"
    | "pending"
    | "correction"
    | "review"
    | "expiring"
    | "archive";

interface Staff {
    id: number;
    name: string;
    email?: string | null;
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
    invoice?: string | null;
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
    workflow?: ContractStatus;

    files?: ContractFileRecord[];
    contract_files?: ContractFileRecord[];
    signed_files?: ContractFileRecord[];
}

interface Props {
    contracts: ContractPermit[];
    staff?: Staff[];
    approvedInvoices?: any[];
}

// =========================================================
// HELPERS
// =========================================================

const getTitle = (record: ContractPermit): string =>
    record.title ||
    record.name ||
    record.contract_type ||
    record.type ||
    "Contract & Permit";

const getType = (record: ContractPermit): string =>
    record.type || record.contract_type || "Contract";

const getClient = (record: ContractPermit): string =>
    record.client || record.client_name || "—";

const getProject = (record: ContractPermit): string =>
    record.project || record.project_name || "—";

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

const isContractRecord = (record: ContractPermit): boolean =>
    String(getType(record)).toLowerCase().trim() === "contract";

const getWorkflowStatus = (record: ContractPermit): ContractStatus => {
    const workflow = record.workflow_status || record.workflowStatus || "";
    const status = String(workflow || record.status || "").trim();

    if (status === "Submitted for Review") return "Submitted for Review";
    if (status === "Needs Correction") return "Needs Correction";
    if (status === "Expiring Soon" || status === "Expiring")
        return "Expiring Soon";
    if (status === "Active") return "Active";
    if (status === "Expired") return "Expired";
    if (status === "Renewed") return "Renewed";
    if (status === "Archived") return "Archived";
    return "Pending";
};

const getCorrectionReason = (record: ContractPermit): string =>
    record.correction_reason ||
    record.correctionReason ||
    record.rejection_reason ||
    "";

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
    const workflow = getWorkflowStatus(record);
    if (workflow === "Needs Correction") return "Needs Correction";
    if (workflow === "Submitted for Review") return "Submitted for Review";
    if (workflow === "Renewed") return "Renewed";
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
            return "border-slate-700 bg-slate-800/50 text-zinc-500";
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

// =========================================================
// SCROLL SETTINGS
// =========================================================

const SCROLL_THRESHOLD = 4;
const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 48;

// =========================================================
// COMPONENT
// =========================================================

export default function ContractPermit({
    contracts = [],
    approvedInvoices = [],
}: Props) {
    const [search, setSearch] = useState("");
    const [selectedContract, setSelectedContract] =
        useState<ContractPermit | null>(null);
    const [emailContract, setEmailContract] = useState<ContractPermit | null>(
        null,
    );
    const [uploadSignedContract, setUploadSignedContract] =
        useState<ContractPermit | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreatePermitModal, setShowCreatePermitModal] =
        useState(false);

    const [successMessage, setSuccessMessage] = useState<{
        title: string;
        description: string;
    } | null>(null);

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState<{
        top: number;
        left: number;
        openUpward: boolean;
    } | null>(null);
    const menuButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

    const [mainTab, setMainTab] = useState<MainTab>("contract");
    const [subTab, setSubTab] = useState<SubTab>("all");

    const emailForm = useForm({
        recipient_email: "",
        subject: "",
        message: "",
    });

    // ✅ Upload Signed Contract form
    const uploadSignedForm = useForm({
        signed_files: [] as File[],
    });

    const createForm = useForm({
        invoice_id: "",
        title: "",
        type: "Contract",
        project: "",
        location: "",
        assigned_to: "",
        description: "",
        contract_files: [] as File[],
    });

    const createPermitForm = useForm({
        title: "",
        type: "Permit",
        client: "",
        email: "",
        project: "",
        location: "",
        description: "",
        notes: "",
        permit_number: "",
        contract_files: [] as File[],
    });

    // =====================================================
    // CLOSE DROPDOWN
    // =====================================================

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

    // =====================================================
    // NORMALIZED RECORDS
    // =====================================================

    const normalizedRecords = useMemo(() => {
        return contracts.map((record) => ({
            ...record,
            calculatedStatus: calculateStatus(record),
            invoiceApproved: isInvoiceApproved(record),
            workflow: getWorkflowStatus(record),
        }));
    }, [contracts]);

    const contractRecords = useMemo(
        () =>
            normalizedRecords.filter(
                (r) => String(getType(r)).toLowerCase().trim() === "contract",
            ),
        [normalizedRecords],
    );

    const permitRecords = useMemo(
        () =>
            normalizedRecords.filter(
                (r) => String(getType(r)).toLowerCase().trim() === "permit",
            ),
        [normalizedRecords],
    );

    const activeRecords = useMemo(() => {
        return mainTab === "contract" ? contractRecords : permitRecords;
    }, [mainTab, contractRecords, permitRecords]);

    const counts = useMemo(() => {
        const nonArchived = activeRecords.filter(
            (r) => r.calculatedStatus !== "Archived",
        );
        const archived = activeRecords.filter(
            (r) => r.calculatedStatus === "Archived",
        );

        return {
            all: nonArchived.length,
            active: nonArchived.filter((r) => r.calculatedStatus === "Active")
                .length,
            pending: nonArchived.filter((r) => r.calculatedStatus === "Pending")
                .length,
            correction: nonArchived.filter(
                (r) => r.calculatedStatus === "Needs Correction",
            ).length,
            review: nonArchived.filter(
                (r) => r.calculatedStatus === "Submitted for Review",
            ).length,
            expiring: nonArchived.filter(
                (r) => r.calculatedStatus === "Expiring Soon",
            ).length,
            archive: archived.length,
        };
    }, [activeRecords]);

    const mainTabCounts = useMemo(() => {
        return {
            contract: contractRecords.length,
            permit: permitRecords.length,
        };
    }, [contractRecords, permitRecords]);

    const filteredRecords = useMemo(() => {
        const query = search.trim().toLowerCase();
        return activeRecords.filter((record) => {
            const status = record.calculatedStatus;

            if (subTab === "all" && status === "Archived") return false;
            if (subTab === "active" && status !== "Active") return false;
            if (subTab === "pending" && status !== "Pending") return false;
            if (subTab === "correction" && status !== "Needs Correction")
                return false;
            if (subTab === "review" && status !== "Submitted for Review")
                return false;
            if (subTab === "expiring" && status !== "Expiring Soon")
                return false;
            if (subTab === "archive" && status !== "Archived") return false;

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
    }, [activeRecords, subTab, search]);

    const availableInvoices = useMemo(() => {
        return approvedInvoices.filter((invoice) => {
            return !normalizedRecords.some(
                (record) => Number(record.invoice_id) === Number(invoice.id),
            );
        });
    }, [approvedInvoices, normalizedRecords]);

    const shouldScroll = filteredRecords.length >= SCROLL_THRESHOLD;
    const tableMaxHeight = shouldScroll
        ? HEADER_HEIGHT + SCROLL_THRESHOLD * ROW_HEIGHT
        : undefined;

    const reloadContracts = () => {
        router.reload({ only: ["contracts", "approvedInvoices"] });
    };

    const showSuccess = (title: string, description: string) => {
        setSuccessMessage({ title, description });
        window.setTimeout(() => setSuccessMessage(null), 3500);
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
        const menuHeight = 420;
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

    /* =====================================================
       CREATE CONTRACT
    ===================================================== */

    const openCreateModal = () => {
        createForm.reset();
        createForm.setData("type", "Contract");
        createForm.setData("contract_files", []);
        setShowCreateModal(true);
    };

    const submitCreate = (event: React.FormEvent) => {
        event.preventDefault();
        if (!createForm.data.contract_files.length) {
            alert("Please attach at least one contract document.");
            return;
        }

        createForm.post("/contract-permit", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                const count = createForm.data.contract_files.length;
                setShowCreateModal(false);
                createForm.reset();
                showSuccess(
                    "Contract Created Successfully",
                    `Contract created with ${count} document(s). You can now email the template to the client, then upload the signed contract.`,
                );
                reloadContracts();
            },
        });
    };

    /* =====================================================
       CREATE PERMIT
    ===================================================== */

    const openCreatePermitModal = () => {
        createPermitForm.reset();
        createPermitForm.setData("type", "Permit");
        createPermitForm.setData("contract_files", []);
        setShowCreatePermitModal(true);
    };

    const submitCreatePermit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!createPermitForm.data.contract_files.length) {
            alert("Please attach at least one permit document.");
            return;
        }

        createPermitForm.post("/contract-permit/create-permit", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                const count = createPermitForm.data.contract_files.length;
                setShowCreatePermitModal(false);
                createPermitForm.reset();
                showSuccess(
                    "Permit Created Successfully",
                    `Permit created with ${count} document(s). You can now submit it for Admin review.`,
                );
                reloadContracts();
            },
        });
    };

    /* =====================================================
       ✅ UPLOAD SIGNED CONTRACT
    ===================================================== */

    const openUploadSigned = (contract: ContractPermit) => {
        if (!contract?.id) return;
        if (!isContractRecord(contract)) {
            alert(
                "Signed contract upload is only available for Contract records.",
            );
            return;
        }
        if (isArchivedRecord(contract)) {
            alert("Cannot upload signed contract to an archived record.");
            return;
        }
        uploadSignedForm.reset();
        uploadSignedForm.setData("signed_files", []);
        uploadSignedForm.clearErrors();
        setUploadSignedContract(contract);
    };

    const submitUploadSigned = (event: React.FormEvent) => {
        event.preventDefault();
        if (!uploadSignedContract?.id) return;
        if (!uploadSignedForm.data.signed_files.length) {
            alert("Please select the signed contract file to upload.");
            return;
        }

        uploadSignedForm.post(
            `/contract-permit/${uploadSignedContract.id}/upload-signed-files`,
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setUploadSignedContract(null);
                    uploadSignedForm.reset();
                    showSuccess(
                        "Signed Contract Uploaded",
                        "The signed contract has been uploaded. You can now submit for Admin review or email the client.",
                    );
                    reloadContracts();
                },
            },
        );
    };

    /* =====================================================
       ✅ EMAIL CLIENT — FIXED (template o signed)
    ===================================================== */

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

        // ✅ Kailangan lang may contract file (template)
        if (getContractFileCount(contract) === 0) {
            alert(
                "Upload the Contract document first. Use 'Create Contract' to upload the template.",
            );
            return;
        }

        const recipient = contract.client_email || contract.email || "";
        const hasSigned = getSignedFileCount(contract) > 0;

        emailForm.clearErrors();

        // ✅ DYNAMIC MESSAGE — kung may signed, signed ang message;
        // kung wala, template ang message
        const subject = hasSigned
            ? `Signed Contract Agreement - ${getReference(contract)}`
            : `Contract Agreement for Review - ${getReference(contract)}`;

        const messageBody = hasSigned
            ? `Dear ${getClient(contract)},\n\n` +
              `Please find the signed Contract Agreement for ${getProject(contract)} attached to this email.\n\n` +
              `Reference: ${getReference(contract)}\n\n` +
              `Thank you.\n\n` +
              `ALIBATON\nHeavy Equipment & Logistics`
            : `Dear ${getClient(contract)},\n\n` +
              `Please find the Contract Agreement for ${getProject(contract)} attached to this email.\n\n` +
              `Kindly review the document and sign it. Once signed, please reply to this email with the signed copy attached.\n\n` +
              `Reference: ${getReference(contract)}\n\n` +
              `Thank you.\n\n` +
              `ALIBATON\nHeavy Equipment & Logistics`;

        emailForm.setData({
            recipient_email: recipient,
            subject,
            message: messageBody,
        });

        setEmailContract(contract);
    };

    const submitEmail = (event: React.FormEvent) => {
        event.preventDefault();
        if (!emailContract?.id) return;
        emailForm.post(`/contract-permit/${emailContract.id}/send-email`, {
            preserveScroll: true,
            onSuccess: () => {
                setEmailContract(null);
                emailForm.reset();
                emailForm.clearErrors();
                showSuccess(
                    "Email Sent Successfully",
                    "The Contract Agreement has been sent to the client.",
                );
                reloadContracts();
            },
            onError: (errors) => {
                console.error("Email send error:", errors);
            },
        });
    };

    // ✅ SUBMIT FOR REVIEW
    const submitForReview = (contract: ContractPermit) => {
        if (!contract?.id) return;
        if (isArchivedRecord(contract)) {
            alert("Cannot submit an archived record.");
            return;
        }

        const contractFileCount = getContractFileCount(contract);
        const signedFileCount = getSignedFileCount(contract);

        if (contractFileCount === 0) {
            alert(
                isContractRecord(contract)
                    ? "Upload the contract document first."
                    : "Upload the permit document first.",
            );
            return;
        }

        if (isContractRecord(contract) && signedFileCount === 0) {
            alert(
                "Upload the signed Contract Agreement first. Use the 'Upload Signed Contract' action in the 3-dot menu.",
            );
            return;
        }

        const workflow = getWorkflowStatus(contract);
        if (workflow !== "Pending" && workflow !== "Needs Correction") {
            alert(
                "Only Pending or Needs Correction records can be submitted for Admin review.",
            );
            return;
        }
        const message =
            workflow === "Needs Correction"
                ? "The corrected record will be submitted to Admin for final review. Continue?"
                : "Submit this record to Admin for final review?";
        if (!window.confirm(message)) return;

        router.post(
            `/contract-permit/${contract.id}/submit-review`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    showSuccess(
                        "Submitted for Review Successfully",
                        "The record has been submitted to Admin for final review. You will be notified once it is approved.",
                    );
                    reloadContracts();
                },
                onError: (errors) => {
                    console.error("Submit for review error:", errors);
                    const errorMsg =
                        Object.values(errors).join("\n") ||
                        "Failed to submit for review. Please try again.";
                    alert(errorMsg);
                },
            },
        );
    };

    const archiveContract = (contract: ContractPermit) => {
        if (!contract?.id) return;
        if (isArchivedRecord(contract)) return;
        if (!window.confirm(`Move ${getReference(contract)} to Archive?`))
            return;
        router.put(
            `/contract-permit/${contract.id}/archive`,
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
    };

    const restoreContract = (contract: ContractPermit) => {
        if (!contract?.id) return;
        if (!window.confirm(`Restore ${getReference(contract)} from Archive?`))
            return;
        router.patch(
            `/contract-permit/${contract.id}/restore`,
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
    };

    const downloadFile = (fileId: number) => {
        window.location.href = `/contract-permit/files/${fileId}/download`;
    };

    const printContract = (contract: ContractPermit) => {
        if (!contract) return;
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Please allow pop-ups to print the contract record.");
            return;
        }
        const reference = getReference(contract);
        const title = getTitle(contract);
        const client = getClient(contract);
        const project = getProject(contract);
        const type = getType(contract);
        const location = contract.location || "—";
        const startDate = getStartDate(contract);
        const expiryDate = getExpiryDate(contract);
        const status = calculateStatus(contract);
        const workflow = getWorkflowStatus(contract);
        const correctionReason = getCorrectionReason(contract);
        const description = contract.description || "No description provided.";
        const notes = contract.notes || "No additional notes.";
        const createdText = formatDate(contract.created_at);
        const updatedText = formatDate(contract.updated_at);
        const approvedText = formatDate(contract.approved_at);
        const isPermit = !isContractRecord(contract);

        const contractFilesList =
            contract.contract_files && contract.contract_files.length > 0
                ? contract.contract_files
                : contract.contract_file_name
                  ? [
                        {
                            id: 0,
                            file_name: contract.contract_file_name,
                            file_size: null as number | null,
                        },
                    ]
                  : [];

        const signedFilesList =
            contract.signed_files && contract.signed_files.length > 0
                ? contract.signed_files
                : contract.signed_contract_file_name
                  ? [
                        {
                            id: 0,
                            file_name: contract.signed_contract_file_name,
                            file_size: null as number | null,
                        },
                    ]
                  : [];

        const escapeHtml = (value: string) =>
            value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/\n/g, "<br />");

        const renderFileList = (
            files: {
                id: number;
                file_name: string;
                file_size?: number | null;
            }[],
        ) =>
            files.length > 0
                ? files
                      .map(
                          (f) =>
                              `<li>${escapeHtml(f.file_name)}${
                                  f.file_size
                                      ? ` (${formatFileSize(f.file_size)})`
                                      : ""
                              }</li>`,
                      )
                      .join("")
                : "<li>No files uploaded</li>";

        printWindow.document
            .write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Contract Record - ${escapeHtml(reference)}</title>
<style>@page{size:Letter;margin:0.45in}*{box-sizing:border-box}body{margin:0;background:#fff;color:#161616;font-family:Arial,sans-serif;font-size:12px}.page{width:100%;max-width:8in;margin:0 auto}.header{border-bottom:3px solid #facc15;padding-bottom:14px;margin-bottom:18px}.brand{font-size:26px;font-weight:900}.subbrand{margin-top:3px;color:#555;font-size:11px;font-weight:700}.address{margin-top:3px;color:#777;font-size:10px}.title{margin-top:18px;font-size:20px;font-weight:900}.reference{margin-top:4px;color:#777;font-size:11px}.status-row{margin-top:12px}.badge{display:inline-block;padding:5px 9px;margin-right:5px;border:1px solid #ccc;border-radius:999px;font-size:9px;font-weight:900;text-transform:uppercase}.section{margin-top:18px}.section-title{margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid #ddd;font-size:11px;font-weight:900;text-transform:uppercase}.details{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detail{border:1px solid #e3e3e3;border-radius:7px;padding:9px}.detail-label{margin-bottom:3px;color:#777;font-size:8px;font-weight:900;text-transform:uppercase}.detail-value{font-size:11px;font-weight:700;word-break:break-word}.text-box{border:1px solid #e3e3e3;border-radius:7px;padding:10px;line-height:1.6;color:#333}.files{display:grid;grid-template-columns:1fr 1fr;gap:10px}.file-box{border:1px solid #e3e3e3;border-radius:7px;padding:10px}.file-box ul{margin:5px 0 0 0;padding-left:16px}.file-box li{font-size:10px;line-height:1.6}.correction-box{border:1px solid #fca5a5;background:#fef2f2;border-radius:7px;padding:11px}.correction-title{color:#b91c1c;font-size:9px;font-weight:900;text-transform:uppercase;margin-bottom:4px}.confidential{margin-top:22px;padding:10px;border:1px solid #ddd;background:#fafafa;color:#777;font-size:8px}.footer{display:flex;justify-content:space-between;margin-top:16px;padding-top:8px;border-top:1px solid #ddd;color:#777;font-size:8px}</style></head><body><div class="page">
<div class="header"><div class="brand">ALIBATON</div><div class="subbrand">Heavy Equipment &amp; Logistics</div><div class="address">Quezon City</div><div class="title">Contract &amp; Permit Record</div><div class="reference">Reference: ${escapeHtml(reference)}</div><div class="status-row"><span class="badge">${escapeHtml(status)}</span><span class="badge">${escapeHtml(workflow)}</span><span class="badge">${isInvoiceApproved(contract) ? "Invoice Approved" : "Invoice Pending"}</span></div></div>
${correctionReason ? `<div class="section"><h2 class="section-title">Admin Correction Required</h2><div class="correction-box"><div class="correction-title">Correction Reason</div>${escapeHtml(correctionReason)}</div></div>` : ""}
<div class="section"><h2 class="section-title">Contract Information</h2><div class="details">
<div class="detail"><div class="detail-label">Title</div><div class="detail-value">${escapeHtml(title)}</div></div>
<div class="detail"><div class="detail-label">Type</div><div class="detail-value">${escapeHtml(type)}</div></div>
<div class="detail"><div class="detail-label">Reference</div><div class="detail-value">${escapeHtml(reference)}</div></div>
<div class="detail"><div class="detail-label">Client</div><div class="detail-value">${escapeHtml(client)}</div></div>
<div class="detail"><div class="detail-label">Project</div><div class="detail-value">${escapeHtml(project)}</div></div>
<div class="detail"><div class="detail-label">Location</div><div class="detail-value">${escapeHtml(location)}</div></div>
<div class="detail"><div class="detail-label">Client Email</div><div class="detail-value">${escapeHtml(contract.client_email || contract.email || "—")}</div></div>
</div></div>
<div class="section"><h2 class="section-title">Validity</h2><div class="details">
<div class="detail"><div class="detail-label">Start / Issue Date</div><div class="detail-value">${startDate ? escapeHtml(formatDate(startDate)) : "Starts after Admin approval"}</div></div>
<div class="detail"><div class="detail-label">Expiry Date</div><div class="detail-value">${expiryDate ? escapeHtml(formatDate(expiryDate)) : "Starts after Admin approval"}</div></div>
<div class="detail"><div class="detail-label">Admin Approved At</div><div class="detail-value">${escapeHtml(approvedText)}</div></div>
<div class="detail"><div class="detail-label">Days Remaining</div><div class="detail-value">${expiryDate && daysUntil(expiryDate) !== null ? `${daysUntil(expiryDate)} days` : "—"}</div></div>
</div></div>
<div class="section"><h2 class="section-title">Description</h2><div class="text-box">${escapeHtml(description)}</div></div>
<div class="section"><h2 class="section-title">Notes</h2><div class="text-box">${escapeHtml(notes)}</div></div>
<div class="section"><h2 class="section-title">Documents</h2><div class="files">
<div class="file-box"><div class="detail-label">${isPermit ? "Permit Documents" : "Contract Documents"} (${contractFilesList.length})</div><ul>${renderFileList(contractFilesList)}</ul></div>
${!isPermit ? `<div class="file-box"><div class="detail-label">Signed Documents (${signedFilesList.length})</div><ul>${renderFileList(signedFilesList)}</ul></div>` : ""}
</div></div>
<div class="section"><h2 class="section-title">Record Information</h2><div class="details">
<div class="detail"><div class="detail-label">Created</div><div class="detail-value">${escapeHtml(createdText)}</div></div>
<div class="detail"><div class="detail-label">Last Updated</div><div class="detail-value">${escapeHtml(updatedText)}</div></div>
</div></div>
<div class="confidential">This document is generated from the ALIBATON Contract &amp; Permit Management System.</div>
<div class="footer"><span>ALIBATON • Heavy Equipment &amp; Logistics</span><span>Quezon City</span><span>Ref: ${escapeHtml(reference)}</span></div>
</div></body></html>`);

        printWindow.document.close();
        printWindow.onload = () => {
            window.setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 300);
        };
    };

    const clearFilters = () => {
        setSearch("");
    };

    useEffect(() => {
        if (!selectedContract) return;
        const latest = normalizedRecords.find(
            (r) => Number(r.id) === Number(selectedContract.id),
        );
        if (latest && latest !== selectedContract) {
            setSelectedContract(latest);
        }
    }, [normalizedRecords]);

    useEffect(() => {
        if (!emailContract) return;
        const latest = normalizedRecords.find(
            (r) => Number(r.id) === Number(emailContract.id),
        );
        if (latest && latest !== emailContract) {
            setEmailContract(latest);
        }
    }, [normalizedRecords]);

    useEffect(() => {
        if (!uploadSignedContract) return;
        const latest = normalizedRecords.find(
            (r) => Number(r.id) === Number(uploadSignedContract.id),
        );
        if (latest && latest !== uploadSignedContract) {
            setUploadSignedContract(latest);
        }
    }, [normalizedRecords]);

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <UserLayout>
            <Head title="Contract & Permit Management" />

            <style>{`
                .alibaton-scroll::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .alibaton-scroll::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5);
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
                    scrollbar-color: rgba(250, 204, 21, 0.5) rgba(15, 23, 42, 0.5);
                }
            `}</style>

            <div className="min-w-0 flex-1 px-4 pb-8 pt-20 text-white sm:px-6 lg:px-8 lg:pt-8">
                <div className="mx-auto w-full max-w-[1600px]">
                    {/* HEADER */}
                    <div className="mb-6 flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                                <ShieldCheck size={15} />
                                Staff Module
                            </div>
                            <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                                Contract & Permit Management
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                                Manage your assigned Contract and Permit
                                records. Attach unlimited documents during
                                creation, upload signed contracts, submit for
                                Admin review, download files, and email clients.
                            </p>
                        </div>
                        {mainTab === "contract" && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
                            >
                                <PlusCircle size={17} />
                                Create Contract
                            </button>
                        )}
                        {mainTab === "permit" && (
                            <button
                                type="button"
                                onClick={openCreatePermitModal}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                            >
                                <PlusCircle size={17} />
                                Create Permit
                            </button>
                        )}
                    </div>

                    {/* MAIN TABS */}
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <MainTabCard
                            active={mainTab === "contract"}
                            icon={<FileText size={24} />}
                            label="Contract"
                            count={mainTabCounts.contract}
                            subtitle="Contract records"
                            onClick={() => {
                                setMainTab("contract");
                                setSubTab("all");
                            }}
                        />
                        <MainTabCard
                            active={mainTab === "permit"}
                            icon={<FileCheck2 size={24} />}
                            label="Permit"
                            count={mainTabCounts.permit}
                            subtitle="Permit records"
                            onClick={() => {
                                setMainTab("permit");
                                setSubTab("all");
                            }}
                        />
                    </div>

                    {/* SUB TABS */}
                    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
                        <SubTabButton
                            active={subTab === "all"}
                            label="All"
                            count={counts.all}
                            onClick={() => setSubTab("all")}
                        />
                        <SubTabButton
                            active={subTab === "active"}
                            label="Active"
                            count={counts.active}
                            onClick={() => setSubTab("active")}
                        />
                        <SubTabButton
                            active={subTab === "pending"}
                            label="Pending"
                            count={counts.pending}
                            onClick={() => setSubTab("pending")}
                        />
                        <SubTabButton
                            active={subTab === "correction"}
                            label="Needs Correction"
                            count={counts.correction}
                            onClick={() => setSubTab("correction")}
                        />
                        <SubTabButton
                            active={subTab === "review"}
                            label="For Review"
                            count={counts.review}
                            onClick={() => setSubTab("review")}
                        />
                        <SubTabButton
                            active={subTab === "expiring"}
                            label="Expiring Soon"
                            count={counts.expiring}
                            onClick={() => setSubTab("expiring")}
                        />
                        <SubTabButton
                            active={subTab === "archive"}
                            label="Archive"
                            count={counts.archive}
                            onClick={() => setSubTab("archive")}
                        />
                    </div>

                    {/* SEARCH */}
                    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
                        <div className="flex min-w-0 flex-col gap-3 lg:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={17}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={`Search ${mainTab}...`}
                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* TABLE */}
                    {filteredRecords.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-20 text-center shadow-xl">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70">
                                <FileCheck2
                                    size={28}
                                    className="text-zinc-600"
                                />
                            </div>
                            <h3 className="text-lg font-black text-zinc-300">
                                No records found
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                                There are no {mainTab} records matching your
                                current filters.
                            </p>
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-5 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm font-bold text-zinc-300 transition hover:border-yellow-400/20 hover:bg-slate-800 hover:text-white"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <section className="overflow-hidden rounded-3xl border border-yellow-400/10 bg-slate-900/80 shadow-2xl shadow-black/30">
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
                                    <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                                        <tr className="border-b border-slate-800 bg-slate-950/70">
                                            <th className="w-[13%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                {mainTab === "contract"
                                                    ? "Contract"
                                                    : "Permit"}
                                            </th>
                                            <th className="w-[10%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Type
                                            </th>
                                            <th className="w-[22%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Project
                                            </th>
                                            <th className="w-[15%] px-3 py-3.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Validity
                                            </th>
                                            <th className="w-[13%] px-3 py-3.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Status
                                            </th>
                                            <th className="w-[11%] px-3 py-3.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                Files
                                            </th>
                                            <th className="w-[16%] px-3 py-3.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                                            const correction =
                                                getCorrectionReason(contract);
                                            const needsCorrection =
                                                status === "Needs Correction";

                                            return (
                                                <React.Fragment
                                                    key={contract.id}
                                                >
                                                    <tr
                                                        className={`border-b transition hover:bg-yellow-400/[0.025] ${
                                                            needsCorrection
                                                                ? "border-red-400/20 bg-red-500/[0.04]"
                                                                : "border-slate-800/70"
                                                        }`}
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
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-yellow-400/20 bg-yellow-400/5 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
                                                                {String(
                                                                    getType(
                                                                        contract,
                                                                    ),
                                                                ).toLowerCase() ===
                                                                "permit" ? (
                                                                    <FileCheck2
                                                                        size={
                                                                            10
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <FileText
                                                                        size={
                                                                            10
                                                                        }
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
                                                                className="truncate text-[11px] text-slate-300"
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
                                                                    className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-600"
                                                                    title={
                                                                        contract.location
                                                                    }
                                                                >
                                                                    <MapPin
                                                                        size={
                                                                            10
                                                                        }
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
                                                                    className="mt-0.5 shrink-0 text-slate-600"
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-[11px] text-slate-300">
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
                                                                {statusIcon(
                                                                    status,
                                                                )}
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
                                                                        size={
                                                                            11
                                                                        }
                                                                    />
                                                                    {contractFileCount >
                                                                    0
                                                                        ? `${contractFileCount} file${
                                                                              contractFileCount >
                                                                              1
                                                                                  ? "s"
                                                                                  : ""
                                                                          }`
                                                                        : "Missing"}
                                                                </span>

                                                                {isContractRecord(
                                                                    contract,
                                                                ) && (
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
                                                                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-700 px-2 text-[10px] font-bold text-slate-300 transition hover:border-yellow-400/40 hover:bg-slate-800 hover:text-yellow-400"
                                                                >
                                                                    <Eye
                                                                        size={
                                                                            12
                                                                        }
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
                                                                    onClick={(
                                                                        e,
                                                                    ) =>
                                                                        openActionMenu(
                                                                            e,
                                                                            contract.id,
                                                                        )
                                                                    }
                                                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                                                        openMenuId ===
                                                                        contract.id
                                                                            ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400"
                                                                            : "border-slate-700 text-slate-400 hover:border-yellow-400/40 hover:text-yellow-400"
                                                                    }`}
                                                                >
                                                                    <MoreVertical
                                                                        size={
                                                                            13
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {needsCorrection &&
                                                        correction && (
                                                            <tr className="border-b border-red-400/10 bg-red-500/[0.02]">
                                                                <td
                                                                    colSpan={7}
                                                                    className="px-3 pb-3 pt-0"
                                                                >
                                                                    <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/[0.08] p-3">
                                                                        <AlertTriangle
                                                                            size={
                                                                                16
                                                                            }
                                                                            className="mt-0.5 shrink-0 text-red-400"
                                                                        />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[10px] font-black uppercase tracking-wider text-red-300">
                                                                                ⚠️
                                                                                Admin
                                                                                Correction
                                                                                Required
                                                                            </p>
                                                                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-white">
                                                                                {
                                                                                    correction
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setSelectedContract(
                                                                                    contract,
                                                                                )
                                                                            }
                                                                            className="shrink-0 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-300 transition hover:bg-red-500/20"
                                                                        >
                                                                            Fix
                                                                            Now
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* FOOTER */}
                    <div className="mt-6 flex min-w-0 flex-col gap-2 border-t border-slate-800 pt-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Showing{" "}
                            <strong className="text-zinc-400">
                                {filteredRecords.length}
                            </strong>{" "}
                            of{" "}
                            <strong className="text-zinc-400">
                                {activeRecords.length}
                            </strong>{" "}
                            {mainTab} records
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
                    const workflow = getWorkflowStatus(contract);

                    const contractFileCount = getContractFileCount(contract);
                    const signedFileCount = getSignedFileCount(contract);

                    const isContract = isContractRecord(contract);

                    // ✅ Upload Signed — only for non-archived contracts
                    const canUploadSigned = isContract && !isArchived;

                    const canSubmitReview =
                        !isArchived &&
                        contractFileCount > 0 &&
                        (isContract ? signedFileCount > 0 : true) &&
                        (workflow === "Pending" ||
                            workflow === "Needs Correction");

                    // ✅ Email Client — pwede kahit walang signed file,
                    // kailangan lang may contract template
                    const canEmailClient =
                        isContract && !isArchived && contractFileCount > 0;

                    const allContractFiles = contract.contract_files ?? [];
                    const allSignedFiles = contract.signed_files ?? [];

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
                                className="alibaton-scroll fixed z-[9999] w-64 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-[0_25px_80px_rgba(0,0,0,0.9)]"
                                style={{
                                    top: `${menuPosition.top}px`,
                                    left: `${menuPosition.left}px`,
                                    maxHeight: "480px",
                                }}
                            >
                                <div className="border-b border-slate-800 px-3 py-2.5">
                                    <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                                        {mainTab === "contract"
                                            ? "Contract Actions"
                                            : "Permit Actions"}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs font-bold text-white">
                                        {getReference(contract)}
                                    </p>
                                </div>
                                <div className="p-1">
                                    {/* PRINT */}
                                    <MenuItem
                                        icon={<Printer size={14} />}
                                        label="Print Record"
                                        onClick={() => {
                                            setOpenMenuId(null);
                                            setMenuPosition(null);
                                            printContract(contract);
                                        }}
                                    />

                                    {/* ✅ EMAIL CLIENT — pwede kahit walang signed file */}
                                    {canEmailClient && (
                                        <>
                                            <div className="my-1 border-t border-slate-800" />
                                            <MenuItem
                                                icon={<Mail size={14} />}
                                                label={
                                                    signedFileCount > 0
                                                        ? "Email Signed Contract"
                                                        : "Email Template to Client"
                                                }
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    openEmail(contract);
                                                }}
                                                highlight={signedFileCount === 0}
                                            />
                                        </>
                                    )}

                                    {/* ✅ UPLOAD SIGNED CONTRACT — for Contract records */}
                                    {canUploadSigned && (
                                        <>
                                            <div className="my-1 border-t border-slate-800" />
                                            <p className="px-3 pt-1 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                                Signed Contract
                                            </p>
                                            <MenuItem
                                                icon={<Upload size={14} />}
                                                label={
                                                    signedFileCount > 0
                                                        ? `Re-upload Signed (${signedFileCount})`
                                                        : "Upload Signed Contract"
                                                }
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    openUploadSigned(contract);
                                                }}
                                                highlight={signedFileCount === 0}
                                            />
                                        </>
                                    )}

                                    {/* DOWNLOAD FILES — contract */}
                                    {allContractFiles.length > 0 && (
                                        <>
                                            <div className="my-1 border-t border-slate-800" />
                                            <p className="px-3 pt-1 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                                {isContract
                                                    ? "Contract Documents"
                                                    : "Permit Documents"}
                                            </p>
                                            {allContractFiles.map((file) => (
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

                                    {/* DOWNLOAD FILES — signed */}
                                    {isContract &&
                                        allSignedFiles.length > 0 && (
                                            <>
                                                <div className="my-1 border-t border-slate-800" />
                                                <p className="px-3 pt-1 pb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                                    Signed Documents
                                                </p>
                                                {allSignedFiles.map((file) => (
                                                    <MenuItem
                                                        key={file.id}
                                                        icon={
                                                            <Download
                                                                size={14}
                                                            />
                                                        }
                                                        label={truncate(
                                                            file.file_name,
                                                            28,
                                                        )}
                                                        onClick={() => {
                                                            setOpenMenuId(
                                                                null,
                                                            );
                                                            setMenuPosition(
                                                                null,
                                                            );
                                                            downloadFile(
                                                                file.id,
                                                            );
                                                        }}
                                                    />
                                                ))}
                                            </>
                                        )}

                                    {/* SUBMIT FOR REVIEW */}
                                    {canSubmitReview && (
                                        <>
                                            <div className="my-1 border-t border-slate-800" />
                                            <MenuItem
                                                icon={<Send size={14} />}
                                                label="Submit for Review"
                                                onClick={() => {
                                                    setOpenMenuId(null);
                                                    setMenuPosition(null);
                                                    submitForReview(contract);
                                                }}
                                                highlight
                                            />
                                        </>
                                    )}

                                    {/* ARCHIVE / RESTORE */}
                                    <div className="my-1 border-t border-slate-800" />
                                    {!isArchived ? (
                                        <MenuItem
                                            icon={<Archive size={14} />}
                                            label="Archive"
                                            onClick={() => {
                                                setOpenMenuId(null);
                                                setMenuPosition(null);
                                                archiveContract(contract);
                                            }}
                                            danger
                                        />
                                    ) : (
                                        <MenuItem
                                            icon={<RefreshCw size={14} />}
                                            label="Restore"
                                            onClick={() => {
                                                setOpenMenuId(null);
                                                setMenuPosition(null);
                                                restoreContract(contract);
                                            }}
                                            highlight
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}

            {/* CREATE CONTRACT MODAL */}
            {showCreateModal && (
                <Modal
                    title="Create Contract from Invoice"
                    subtitle="Select an approved invoice to create a Contract record. You can attach multiple files."
                    icon={<PlusCircle size={20} />}
                    onClose={() => {
                        setShowCreateModal(false);
                        createForm.reset();
                    }}
                    wide
                >
                    <form onSubmit={submitCreate} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Select Approved Invoice{" "}
                                <span className="ml-1 text-yellow-400">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={createForm.data.invoice_id}
                                    onChange={(e) =>
                                        createForm.setData(
                                            "invoice_id",
                                            e.target.value,
                                        )
                                    }
                                    className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 pr-10 text-sm text-white outline-none focus:border-yellow-400/60"
                                    required
                                >
                                    <option value="">
                                        Select an approved invoice...
                                    </option>
                                    {availableInvoices.map((invoice) => (
                                        <option
                                            key={invoice.id}
                                            value={String(invoice.id)}
                                            className="bg-slate-950"
                                        >
                                            {invoice.number} — {invoice.client}{" "}
                                            — ₱
                                            {Number(
                                                invoice.amount,
                                            ).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600"
                                />
                            </div>
                            {availableInvoices.length === 0 && (
                                <p className="mt-2 text-sm text-amber-400">
                                    ⚠️{" "}
                                    {approvedInvoices.length === 0
                                        ? "No approved invoices available. Please wait for Admin to approve an invoice first."
                                        : "All approved invoices already have a Contract record."}
                                </p>
                            )}
                        </div>

                        {createForm.data.invoice_id &&
                            (() => {
                                const selected = availableInvoices.find(
                                    (invoice) =>
                                        invoice.id ===
                                        parseInt(createForm.data.invoice_id),
                                );
                                if (!selected) return null;
                                return (
                                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
                                        <h3 className="mb-3 text-sm font-bold text-emerald-400">
                                            📄 Invoice Details
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-zinc-500">
                                                    Invoice Number
                                                </p>
                                                <p className="font-bold text-white">
                                                    {selected.number}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">
                                                    Client
                                                </p>
                                                <p className="font-bold text-white">
                                                    {selected.client}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">
                                                    Amount
                                                </p>
                                                <p className="font-bold text-white">
                                                    ₱
                                                    {Number(
                                                        selected.amount,
                                                    ).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">
                                                    Status
                                                </p>
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400">
                                                    <CheckCircle2 size={12} />
                                                    Approved
                                                </span>
                                            </div>
                                            {selected.project && (
                                                <div className="col-span-2">
                                                    <p className="text-zinc-500">
                                                        Project
                                                    </p>
                                                    <p className="font-bold text-white">
                                                        {selected.project}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <FormInput
                                label="Contract Title"
                                value={createForm.data.title}
                                onChange={(value) =>
                                    createForm.setData("title", value)
                                }
                                placeholder="Contract title"
                                required
                            />
                            <FormInput
                                label="Project"
                                value={createForm.data.project}
                                onChange={(value) =>
                                    createForm.setData("project", value)
                                }
                                placeholder="Project name"
                            />
                            <FormInput
                                label="Location"
                                value={createForm.data.location}
                                onChange={(value) =>
                                    createForm.setData("location", value)
                                }
                                placeholder="Project location"
                            />
                            <TextArea
                                label="Description"
                                value={createForm.data.description}
                                onChange={(value) =>
                                    createForm.setData("description", value)
                                }
                                placeholder="Contract description"
                                rows={4}
                                full
                            />
                        </div>

                        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-4">
                            <MultiFileUploadField
                                id="create-contract-files-input"
                                label="Contract Documents"
                                files={createForm.data.contract_files}
                                onChange={(files) =>
                                    createForm.setData("contract_files", files)
                                }
                                hint="Attach the actual contract document(s). You can select multiple files. Any type, no size limit."
                                accentColor="yellow"
                            />
                        </div>

                        <div className="rounded-2xl border border-blue-400/10 bg-blue-400/[0.025] p-4">
                            <p className="text-xs leading-5 text-zinc-500">
                                The new record starts as{" "}
                                <strong className="text-blue-400">
                                    Pending
                                </strong>
                                . After creation, use the 3-dot menu to{" "}
                                <strong className="text-yellow-400">
                                    Email the Template to Client
                                </strong>
                                , then upload the signed contract and submit
                                for Admin review. The 90-day validity starts
                                only when Admin approves.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    createForm.reset();
                                }}
                                className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    createForm.processing ||
                                    !createForm.data.invoice_id ||
                                    availableInvoices.length === 0 ||
                                    !createForm.data.contract_files.length
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createForm.processing ? (
                                    <>
                                        <RefreshCw
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <FileText size={16} />
                                        Create Contract
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* CREATE PERMIT MODAL */}
            {showCreatePermitModal && (
                <Modal
                    title="Create New Permit"
                    subtitle="Fill in the details and attach the actual permit document(s)."
                    icon={<PlusCircle size={20} />}
                    onClose={() => {
                        setShowCreatePermitModal(false);
                        createPermitForm.reset();
                    }}
                    wide
                >
                    <form onSubmit={submitCreatePermit} className="space-y-5">
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
                            <div className="flex items-start gap-3">
                                <FileCheck2
                                    size={18}
                                    className="mt-0.5 shrink-0 text-emerald-400"
                                />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                                        Permit Record
                                    </p>
                                    <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                                        Attach the actual permit paper/document
                                        during creation. Admin will verify the
                                        attached file before approving.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <FormInput
                                label="Permit Title"
                                value={createPermitForm.data.title}
                                onChange={(value) =>
                                    createPermitForm.setData("title", value)
                                }
                                placeholder="e.g. Business Permit 2026"
                                required
                            />
                            <FormInput
                                label="Permit Number (Optional)"
                                value={createPermitForm.data.permit_number}
                                onChange={(value) =>
                                    createPermitForm.setData(
                                        "permit_number",
                                        value,
                                    )
                                }
                                placeholder="Auto-generated if left blank"
                            />
                            <FormInput
                                label="Client Name"
                                value={createPermitForm.data.client}
                                onChange={(value) =>
                                    createPermitForm.setData("client", value)
                                }
                                placeholder="Client / Company name"
                                required
                            />
                            <FormInput
                                label="Client Email"
                                value={createPermitForm.data.email}
                                onChange={(value) =>
                                    createPermitForm.setData("email", value)
                                }
                                placeholder="client@example.com"
                                type="email"
                            />
                            <FormInput
                                label="Project"
                                value={createPermitForm.data.project}
                                onChange={(value) =>
                                    createPermitForm.setData("project", value)
                                }
                                placeholder="Project name"
                            />
                            <FormInput
                                label="Location"
                                value={createPermitForm.data.location}
                                onChange={(value) =>
                                    createPermitForm.setData("location", value)
                                }
                                placeholder="Project location"
                            />
                            <TextArea
                                label="Description"
                                value={createPermitForm.data.description}
                                onChange={(value) =>
                                    createPermitForm.setData(
                                        "description",
                                        value,
                                    )
                                }
                                placeholder="Permit description"
                                rows={4}
                                full
                            />
                            <TextArea
                                label="Notes"
                                value={createPermitForm.data.notes}
                                onChange={(value) =>
                                    createPermitForm.setData("notes", value)
                                }
                                placeholder="Additional notes"
                                rows={3}
                                full
                            />
                        </div>

                        <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/[0.06] p-4">
                            <MultiFileUploadField
                                id="permit-files-input"
                                label="Permit Documents"
                                files={createPermitForm.data.contract_files}
                                onChange={(files) =>
                                    createPermitForm.setData(
                                        "contract_files",
                                        files,
                                    )
                                }
                                hint="REQUIRED. Attach the actual permit paper/document(s) that Admin will verify. You can select multiple files. Any type, no size limit."
                                accentColor="emerald"
                            />
                        </div>

                        <div className="rounded-2xl border border-blue-400/10 bg-blue-400/[0.025] p-4">
                            <p className="text-xs leading-5 text-zinc-500">
                                The new Permit starts as{" "}
                                <strong className="text-blue-400">
                                    Pending
                                </strong>
                                . The attached permit document(s) will be sent
                                to Admin for verification. The 90-day validity
                                period starts only after Admin approval.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreatePermitModal(false);
                                    createPermitForm.reset();
                                }}
                                className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    createPermitForm.processing ||
                                    !createPermitForm.data.contract_files
                                        .length
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createPermitForm.processing ? (
                                    <>
                                        <RefreshCw
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <FileCheck2 size={16} />
                                        Create Permit
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ✅ UPLOAD SIGNED CONTRACT MODAL */}
            {uploadSignedContract && isContractRecord(uploadSignedContract) && (
                <Modal
                    title="Upload Signed Contract"
                    subtitle={`Upload the client-signed contract for ${getReference(uploadSignedContract)}`}
                    icon={<Upload size={20} />}
                    onClose={() => {
                        if (uploadSignedForm.processing) return;
                        setUploadSignedContract(null);
                        uploadSignedForm.reset();
                        uploadSignedForm.clearErrors();
                    }}
                >
                    <form
                        onSubmit={submitUploadSigned}
                        className="space-y-5"
                    >
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
                            <div className="flex items-start gap-3">
                                <FileCheck2
                                    size={18}
                                    className="mt-0.5 shrink-0 text-emerald-400"
                                />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                                        Client-Signed Contract
                                    </p>
                                    <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                                        Attach the contract that has been signed
                                        and returned by the client. This will
                                        be reviewed by Admin.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Contract Info
                            </p>
                            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                                        Reference
                                    </p>
                                    <p className="font-bold text-white">
                                        {getReference(uploadSignedContract)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                                        Client
                                    </p>
                                    <p className="font-bold text-white">
                                        {getClient(uploadSignedContract)}
                                    </p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                                        Project
                                    </p>
                                    <p className="font-bold text-white">
                                        {getProject(uploadSignedContract)}
                                    </p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                                        Current Signed Files
                                    </p>
                                    <p className="font-bold text-white">
                                        {getSignedFileCount(
                                            uploadSignedContract,
                                        )}{" "}
                                        file(s) uploaded
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/[0.06] p-4">
                            <MultiFileUploadField
                                id="upload-signed-input"
                                label="Signed Contract File(s)"
                                files={uploadSignedForm.data.signed_files}
                                onChange={(files) =>
                                    uploadSignedForm.setData(
                                        "signed_files",
                                        files,
                                    )
                                }
                                hint="Attach the client-signed contract file(s). PDF, DOC, or image. You can attach multiple files."
                                accentColor="emerald"
                            />
                            {uploadSignedForm.errors.signed_files && (
                                <p className="mt-2 text-xs font-semibold text-red-400">
                                    {uploadSignedForm.errors.signed_files}
                                </p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-blue-400/10 bg-blue-400/[0.025] p-4">
                            <p className="text-xs leading-5 text-zinc-500">
                                After upload, you can{" "}
                                <strong className="text-yellow-400">
                                    Email Signed Contract
                                </strong>{" "}
                                to the client, or{" "}
                                <strong className="text-blue-400">
                                    Submit for Review
                                </strong>{" "}
                                so Admin can approve the record.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={uploadSignedForm.processing}
                                onClick={() => {
                                    setUploadSignedContract(null);
                                    uploadSignedForm.reset();
                                    uploadSignedForm.clearErrors();
                                }}
                                className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    uploadSignedForm.processing ||
                                    !uploadSignedForm.data.signed_files.length
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {uploadSignedForm.processing ? (
                                    <>
                                        <RefreshCw
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Upload Signed Contract
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
                            <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-zinc-400">
                                {getType(selectedContract)}
                            </span>
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
                        </div>

                        {getCorrectionReason(selectedContract) &&
                            calculateStatus(selectedContract) ===
                                "Needs Correction" && (
                                <div className="rounded-2xl border-2 border-red-400/40 bg-red-500/[0.08] p-5 shadow-lg shadow-red-500/10">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/15 text-red-400">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-black uppercase tracking-wider text-red-300">
                                                ⚠️ Admin Correction Required
                                            </p>
                                            <p className="mt-1 text-[11px] font-semibold text-red-200/70">
                                                You need to correct the
                                                following items before
                                                resubmitting to Admin:
                                            </p>
                                            <div className="mt-3 rounded-xl border border-red-400/20 bg-black/30 p-3">
                                                <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-white">
                                                    {getCorrectionReason(
                                                        selectedContract,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-2.5">
                                                <RefreshCw
                                                    size={14}
                                                    className="mt-0.5 shrink-0 text-amber-400"
                                                />
                                                <p className="text-[11px] leading-4 text-amber-200/80">
                                                    <strong>
                                                        Next Steps:
                                                    </strong>{" "}
                                                    Upload the corrected
                                                    document, re-upload the
                                                    signed contract if
                                                    necessary, then submit
                                                    for review.
                                                </p>
                                            </div>
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

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailBox
                                label="Reference Number"
                                value={getReference(selectedContract)}
                            />
                            <DetailBox
                                label="Status"
                                value={calculateStatus(selectedContract)}
                            />
                            <DetailBox
                                label="Workflow"
                                value={getWorkflowStatus(selectedContract)}
                            />
                            <DetailBox
                                label="Invoice Status"
                                value={
                                    isInvoiceApproved(selectedContract)
                                        ? "Approved"
                                        : "Pending Approval"
                                }
                            />
                            <DetailBox
                                label="Client"
                                value={getClient(selectedContract)}
                            />
                            <DetailBox
                                label="Client Email"
                                value={
                                    selectedContract.client_email ||
                                    selectedContract.email ||
                                    "—"
                                }
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
                            const isPermit = !isContractRecord(selectedContract);

                            if (
                                contractFiles.length === 0 &&
                                signedFiles.length === 0
                            ) {
                                return null;
                            }

                            return (
                                <div className="space-y-4">
                                    {contractFiles.length > 0 && (
                                        <div>
                                            <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                                                {isPermit ? "📁 Permit" : "📁 Contract"}{" "}
                                                Documents ({contractFiles.length})
                                            </p>
                                            <div className="space-y-2">
                                                {contractFiles.map((f) => (
                                                    <div
                                                        key={f.id}
                                                        className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                                                    >
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-xs font-bold text-white">
                                                                {f.file_name}
                                                            </p>
                                                            <p className="mt-0.5 text-[10px] text-zinc-500">
                                                                {f.file_size
                                                                    ? formatFileSize(
                                                                          f.file_size,
                                                                      )
                                                                    : "—"}
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={`/contract-permit/files/${f.id}/download`}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
                                                        >
                                                            <Download size={12} />
                                                            Download
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isContractRecord(selectedContract) &&
                                        signedFiles.length > 0 && (
                                            <div>
                                                <p className="mb-2 text-xs font-black uppercase tracking-wider text-zinc-500">
                                                    ✍️ Signed Documents (
                                                    {signedFiles.length})
                                                </p>
                                                <div className="space-y-2">
                                                    {signedFiles.map((f) => (
                                                        <div
                                                            key={f.id}
                                                            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                                                        >
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                                                                <FileCheck2 size={18} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-xs font-bold text-white">
                                                                    {f.file_name}
                                                                </p>
                                                                <p className="mt-0.5 text-[10px] text-zinc-500">
                                                                    {f.file_size
                                                                        ? formatFileSize(
                                                                              f.file_size,
                                                                          )
                                                                        : "—"}
                                                                </p>
                                                            </div>
                                                            <a
                                                                href={`/contract-permit/files/${f.id}/download`}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
                                                            >
                                                                <Download size={12} />
                                                                Download
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            );
                        })()}

                        <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-5">
                            <button
                                type="button"
                                onClick={() => printContract(selectedContract)}
                                className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-4 py-2.5 text-sm font-bold text-yellow-400 transition hover:border-yellow-400/40 hover:bg-yellow-400/10"
                            >
                                <Printer size={16} />
                                Print Record
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ✅ EMAIL MODAL — DYNAMIC */}
            {emailContract && isContractRecord(emailContract) && (
                <Modal
                    title={
                        getSignedFileCount(emailContract) > 0
                            ? "Send Signed Contract Agreement"
                            : "Send Contract Template to Client"
                    }
                    subtitle={`${
                        getSignedFileCount(emailContract) > 0
                            ? "Send signed Contract Agreement"
                            : "Send Contract Template for review and signature"
                    } for ${getReference(emailContract)}`}
                    icon={<Mail size={20} />}
                    onClose={() => {
                        if (emailForm.processing) return;
                        setEmailContract(null);
                        emailForm.reset();
                        emailForm.clearErrors();
                    }}
                >
                    <form onSubmit={submitEmail} className="space-y-5">
                        <div
                            className={`rounded-2xl border p-4 ${
                                getSignedFileCount(emailContract) > 0
                                    ? "border-emerald-400/20 bg-emerald-400/[0.05]"
                                    : "border-yellow-400/20 bg-yellow-400/[0.05]"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <Mail
                                    size={18}
                                    className={`mt-0.5 shrink-0 ${
                                        getSignedFileCount(emailContract) > 0
                                            ? "text-emerald-400"
                                            : "text-yellow-400"
                                    }`}
                                />
                                <div>
                                    {getSignedFileCount(emailContract) > 0 ? (
                                        <>
                                            <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                                                Attached: Signed Contract
                                            </p>
                                            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                                                The uploaded signed contract (
                                                {getSignedFileCount(
                                                    emailContract,
                                                )}{" "}
                                                file
                                                {getSignedFileCount(
                                                    emailContract,
                                                ) > 1
                                                    ? "s"
                                                    : ""}
                                                ) will be attached to this
                                                email automatically.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs font-black uppercase tracking-wider text-yellow-300">
                                                Attached: Contract Template
                                            </p>
                                            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
                                                The contract template (
                                                {getContractFileCount(
                                                    emailContract,
                                                )}{" "}
                                                file
                                                {getContractFileCount(
                                                    emailContract,
                                                ) > 1
                                                    ? "s"
                                                    : ""}
                                                ) will be attached. The client
                                                will review, sign, and send it
                                                back via email.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

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
                            placeholder="Contract Agreement"
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
                        <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={emailForm.processing}
                                onClick={() => {
                                    setEmailContract(null);
                                    emailForm.reset();
                                    emailForm.clearErrors();
                                }}
                                className="rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    emailForm.processing ||
                                    !emailForm.data.recipient_email.trim()
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
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
                                        {getSignedFileCount(emailContract) > 0
                                            ? "Send Signed Contract"
                                            : "Send Template to Client"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* SUCCESS NOTIFICATION */}
            {successMessage && (
                <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-900/98 px-5 py-5 shadow-2xl shadow-emerald-400/10 backdrop-blur-sm">
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
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-slate-800 hover:text-white"
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-800">
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
        </UserLayout>
    );
}

// =========================================================
// MAIN TAB CARD
// =========================================================

function MainTabCard({
    active,
    icon,
    label,
    count,
    subtitle,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    count: number;
    subtitle: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl border p-5 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                active
                    ? "border-yellow-400/40 bg-yellow-400/[0.08] shadow-yellow-400/[0.05]"
                    : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-800"
            }`}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                    <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition ${
                            active
                                ? "bg-yellow-400 text-black"
                                : "bg-slate-950 text-zinc-500 group-hover:text-zinc-300"
                        }`}
                    >
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p
                            className={`truncate text-lg font-black uppercase tracking-wider ${
                                active ? "text-yellow-300" : "text-white"
                            }`}
                        >
                            {label}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p
                        className={`text-3xl font-black ${
                            active ? "text-yellow-300" : "text-white"
                        }`}
                    >
                        {count}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        {count === 1 ? "record" : "records"}
                    </p>
                </div>
            </div>
            {active && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400" />
            )}
        </button>
    );
}

// =========================================================
// SUB TAB BUTTON
// =========================================================

function SubTabButton({
    active,
    label,
    count,
    onClick,
}: {
    active: boolean;
    label: string;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                active
                    ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20"
                    : "text-zinc-400 hover:bg-slate-800 hover:text-yellow-400"
            }`}
        >
            <span>{label}</span>
            <span
                className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    active
                        ? "bg-black/20 text-black"
                        : "bg-slate-950 text-zinc-500"
                }`}
            >
                {count}
            </span>
        </button>
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
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
        >
            {icon}
            <span className="truncate">{label}</span>
        </button>
    );
}

// =========================================================
// MULTI-FILE UPLOAD FIELD
// =========================================================

function MultiFileUploadField({
    id,
    label,
    files,
    onChange,
    hint,
    accentColor = "yellow",
}: {
    id: string;
    label: string;
    files: File[];
    onChange: (files: File[]) => void;
    hint?: string;
    accentColor?: "yellow" | "emerald";
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const accent =
        accentColor === "emerald"
            ? {
                  bg: "bg-emerald-400/10",
                  text: "text-emerald-400",
                  border: "hover:border-emerald-400/50",
                  btn: "bg-emerald-400 hover:bg-emerald-300",
              }
            : {
                  bg: "bg-yellow-400/10",
                  text: "text-yellow-400",
                  border: "hover:border-yellow-400/50",
                  btn: "bg-yellow-400 hover:bg-yellow-300",
              };

    const addFiles = (newFiles: FileList | File[]) => {
        const list = Array.from(newFiles);
        onChange([...files, ...list]);
    };

    const removeFile = (index: number) => {
        const next = [...files];
        next.splice(index, 1);
        onChange(next);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files?.length) {
            addFiles(event.dataTransfer.files);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    return (
        <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
                {label}
                <span className="ml-1 text-yellow-400">*</span>
            </label>

            <input
                ref={inputRef}
                id={id}
                type="file"
                multiple
                onChange={(e) => {
                    if (e.target.files?.length) {
                        addFiles(e.target.files);
                        if (inputRef.current) inputRef.current.value = "";
                    }
                }}
                className="sr-only"
            />

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 ${accent.border} ${
                    isDragging
                        ? `${accent.bg} scale-[1.01]`
                        : "border-slate-700 bg-slate-950/80 hover:bg-slate-900"
                }`}
            >
                <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent.bg} ${accent.text}`}
                >
                    <Cloud size={26} />
                </div>
                <div>
                    <p className="text-sm font-black text-white">
                        Click to browse or drag & drop
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                        You can select multiple files at once.
                    </p>
                </div>
                <span
                    className={`inline-flex items-center gap-2 rounded-xl ${accent.btn} px-4 py-2 text-xs font-black text-black`}
                >
                    <Upload size={14} />
                    Choose Files
                </span>
            </div>

            {files.length > 0 && (
                <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                        <div
                            key={`${file.name}-${index}-${file.size}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3"
                        >
                            <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}
                            >
                                <FileText size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-white">
                                    {file.name}
                                </p>
                                <p className="mt-0.5 text-[10px] text-zinc-500">
                                    {formatFileSize(file.size)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/5 text-red-400 transition hover:bg-red-400/10"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <p className="text-[10px] text-zinc-600">
                        {files.length} file{files.length > 1 ? "s" : ""}{" "}
                        selected
                    </p>
                </div>
            )}

            {hint && <p className="mt-2 text-[10px] text-zinc-600">{hint}</p>}
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:bg-slate-900"
            />
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
                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:bg-slate-900"
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
            className={`min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl ${
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
                } overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 shadow-xl`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-6">
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
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 text-zinc-500 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
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