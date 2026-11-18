import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    AlertCircle,
    AlertTriangle,
    Archive,
    Building2,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileText,
    FileUp,
    Lock,
    Paperclip,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    UserRound,
    X,
    XCircle,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type DocumentStatus =
    | "Active"
    | "Expiring Soon"
    | "Expired"
    | "Archived";

type DocumentAttachment = {
    id: number;
    file_name: string;
    file_url?: string | null;
    download_url?: string | null;
    mime_type?: string | null;
    formatted_file_size?: string | null;
    is_primary: boolean;
    file_exists: boolean;
};

type DocumentRecord = {
    id: number;
    title: string;
    file_name: string;
    file_url?: string | null;
    download_url?: string | null;
    file_exists: boolean;
    mime_type?: string | null;
    formatted_file_size?: string | null;
    type?: string | null;
    description?: string | null;
    document_type: "client" | "company";
    is_locked: boolean;
    granted_staff_ids: number[];
    reference_number?: string | null;
    regulatory_body?: string | null;
    compliance_status?: string | null;
    retention_period?: string | null;
    expiry_date?: string | null;
    review_date?: string | null;
    uploaded_by?: number | null;
    uploaded_by_name?: string | null;
    uploaded_by_email?: string | null;
    uploaded_by_role?: string | null;
    assigned_to?: number | null;
    assigned_name?: string | null;
    assigned_email?: string | null;
    assigned_role?: string | null;
    status: DocumentStatus;
    raw_status?: string | null;
    is_expired: boolean;
    is_expiring_soon: boolean;
    days_until_expiry?: number | null;
    attachments: DocumentAttachment[];
    attachment_count: number;
    created_at?: string | null;
    created_at_date?: string | null;
    updated_at?: string | null;
};

type StaffOption = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type DocumentStats = {
    total: number;
    active: number;
    expiring: number;
    expired: number;
    archived: number;
    locked: number;
    company: number;
    client: number;
    from_staff: number;
    from_admin: number;
    from_superadmin: number;
    access_requests_total: number;
    access_requests_pending: number;
};

type AccessRequestRecord = {
    id: number;
    document_id: number;
    document_title?: string | null;
    document_file_name?: string | null;
    document_type?: string | null;
    staff_id: number;
    staff_name?: string | null;
    staff_email?: string | null;
    status: "pending" | "approved" | "rejected" | "revoked";
    requested_at?: string | null;
    responded_at?: string | null;
    responded_by?: string | null;
    remarks?: string | null;
};

type PageProps = {
    documents?: DocumentRecord[];
    users?: StaffOption[];
    accessRequests?: AccessRequestRecord[];
    stats?: DocumentStats;
    flash?: {
        success?: string;
        error?: string;
    };
    auth?: {
        user?: {
            id: number;
            role: string;
        };
    };
    [key: string]: unknown;
};

type UploadForm = {
    title: string;
    type: string;
    document_type: "client" | "company";
    assigned_to: string;
    description: string;
    expiry_date: string;
    retention_period: string;
    regulatory_body: string;
    reference_number: string;
    review_date: string;
    is_locked: boolean;
    granted_staff_ids: number[];
    files: File[];
};

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const DOCUMENT_TYPES = [
    "All",
    "Permit",
    "Contract",
    "Certificate",
    "Invoice",
    "Compliance",
    "Safety",
    "Company",
    "Other",
];

const STATUS_FILTERS = [
    "All",
    "Active",
    "Expiring Soon",
    "Expired",
    "Archived",
];

const SOURCE_FILTERS = ["All", "Staff", "Admin", "Superadmin"];

const CATEGORY_FILTERS = ["All", "Company", "Client"];

const DEFAULT_UPLOAD_FORM: UploadForm = {
    title: "",
    type: "Other",
    document_type: "client",
    assigned_to: "",
    description: "",
    expiry_date: "",
    retention_period: "",
    regulatory_body: "",
    reference_number: "",
    review_date: "",
    is_locked: false,
    granted_staff_ids: [],
    files: [],
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatRole(role?: string | null) {
    if (!role) return "Unknown";

    switch (role) {
        case "superadmin":
            return "Super Admin";
        case "admin":
            return "Admin";
        case "staff":
            return "Staff";
        default:
            return role.charAt(0).toUpperCase() + role.slice(1);
    }
}

function formatFileSize(bytes: number) {
    if (!bytes || bytes <= 0) return "0 KB";

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
    }

    return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function statusClass(status: string) {
    switch (status) {
        case "Active":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "Expiring Soon":
            return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        case "Expired":
            return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
        case "Archived":
            return "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300";
        default:
            return "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    }
}

function statusIcon(status: string) {
    switch (status) {
        case "Active":
            return <CheckCircle2 size={13} />;
        case "Expiring Soon":
            return <Clock size={13} />;
        case "Expired":
            return <AlertTriangle size={13} />;
        case "Archived":
            return <Archive size={13} />;
        default:
            return <FileText size={13} />;
    }
}

function roleBadgeClass(role?: string | null) {
    switch (role) {
        case "staff":
            return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
        case "admin":
            return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
        case "superadmin":
            return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        default:
            return "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    }
}

function requestStatusClass(status: string) {
    switch (status) {
        case "pending":
            return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
        case "approved":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
        case "rejected":
            return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
        default:
            return "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    }
}

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
    label,
    value,
    hint,
    icon,
    tone,
}: {
    label: string;
    value: number | string;
    hint: string;
    icon: React.ReactNode;
    tone: "amber" | "emerald" | "rose" | "blue";
}) {
    const tones = {
        amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        emerald:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        rose: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        blue: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{hint}</p>
                </div>

                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function DocumentsMonitoring() {
    const {
        documents = [],
        users = [],
        accessRequests = [],
        stats: serverStats,
        flash,
    } = usePage<PageProps>().props;

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sourceFilter, setSourceFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [lockedOnly, setLockedOnly] = useState(false);
    const [selected, setSelected] = useState<DocumentRecord | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [fileError, setFileError] = useState("");
    const [flashMessage, setFlashMessage] = useState("");
    const [flashError, setFlashError] = useState("");
    const [processingRequestId, setProcessingRequestId] = useState<
        number | null
    >(null);

    const uploadForm = useForm<UploadForm>({
        ...DEFAULT_UPLOAD_FORM,
        files: [],
    });

    useEffect(() => {
        if (flash?.success) {
            setFlashMessage(flash.success);
            const timer = window.setTimeout(() => setFlashMessage(""), 5000);
            return () => window.clearTimeout(timer);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error) {
            setFlashError(flash.error);
            const timer = window.setTimeout(() => setFlashError(""), 6000);
            return () => window.clearTimeout(timer);
        }
    }, [flash?.error]);

    const computedStats = useMemo<DocumentStats>(() => {
        return {
            total: documents.length,
            active: documents.filter((doc) => doc.status === "Active").length,
            expiring: documents.filter((doc) => doc.status === "Expiring Soon")
                .length,
            expired: documents.filter((doc) => doc.status === "Expired").length,
            archived: documents.filter((doc) => doc.status === "Archived")
                .length,
            locked: documents.filter((doc) => doc.is_locked).length,
            company: documents.filter(
                (doc) => doc.document_type === "company",
            ).length,
            client: documents.filter((doc) => doc.document_type === "client")
                .length,
            from_staff: documents.filter(
                (doc) => doc.uploaded_by_role === "staff",
            ).length,
            from_admin: documents.filter(
                (doc) => doc.uploaded_by_role === "admin",
            ).length,
            from_superadmin: documents.filter(
                (doc) => doc.uploaded_by_role === "superadmin",
            ).length,
            access_requests_total: accessRequests.length,
            access_requests_pending: accessRequests.filter(
                (request) => request.status === "pending",
            ).length,
        };
    }, [documents, accessRequests]);

    const stats = serverStats ?? computedStats;

    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return documents.filter((doc) => {
            const matchesSearch =
                !keyword ||
                [
                    doc.title,
                    doc.file_name,
                    doc.reference_number,
                    doc.type,
                    doc.description,
                    doc.uploaded_by_name,
                    doc.uploaded_by_email,
                    doc.assigned_name,
                    doc.regulatory_body,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(keyword);

            const matchesType =
                typeFilter === "All" || doc.type === typeFilter;

            const matchesStatus =
                statusFilter === "All" || doc.status === statusFilter;

            const matchesSource =
                sourceFilter === "All" ||
                (sourceFilter === "Staff" &&
                    doc.uploaded_by_role === "staff") ||
                (sourceFilter === "Admin" &&
                    doc.uploaded_by_role === "admin") ||
                (sourceFilter === "Superadmin" &&
                    doc.uploaded_by_role === "superadmin");

            const matchesCategory =
                categoryFilter === "All" ||
                (categoryFilter === "Company" &&
                    doc.document_type === "company") ||
                (categoryFilter === "Client" &&
                    doc.document_type === "client");

            const matchesLocked = !lockedOnly || doc.is_locked;

            return (
                matchesSearch &&
                matchesType &&
                matchesStatus &&
                matchesSource &&
                matchesCategory &&
                matchesLocked
            );
        });
    }, [
        documents,
        search,
        typeFilter,
        statusFilter,
        sourceFilter,
        categoryFilter,
        lockedOnly,
    ]);

    const hasActiveFilters =
        search.trim() !== "" ||
        typeFilter !== "All" ||
        statusFilter !== "All" ||
        sourceFilter !== "All" ||
        categoryFilter !== "All" ||
        lockedOnly;

    const resetFilters = () => {
        setSearch("");
        setTypeFilter("All");
        setStatusFilter("All");
        setSourceFilter("All");
        setCategoryFilter("All");
        setLockedOnly(false);
    };

    const resetUploadForm = () => {
        uploadForm.setData({
            ...DEFAULT_UPLOAD_FORM,
            files: [],
        });
        uploadForm.clearErrors();
        setPendingFiles([]);
        setFileError("");
    };

    const openUpload = () => {
        resetUploadForm();
        setShowUpload(true);
    };

    const closeUpload = () => {
        setShowUpload(false);
        resetUploadForm();
    };

    const handleAddFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setFileError("");
        const incoming = Array.from(files);

        setPendingFiles((previous) => {
            const merged = [...previous, ...incoming];
            uploadForm.setData("files", merged);
            return merged;
        });
    };

    const handleRemoveFile = (index: number) => {
        setPendingFiles((previous) => {
            const next = previous.filter((_, fileIndex) => fileIndex !== index);
            uploadForm.setData("files", next);
            return next;
        });
    };

    const handleUpload = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (pendingFiles.length === 0) {
            setFileError("Please attach at least one document file.");
            return;
        }

        uploadForm.transform((data) => ({
            ...data,
            files: pendingFiles,
        }));

        uploadForm.post("/superadmin/documents", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                closeUpload();
                setFlashMessage(
                    "Document uploaded successfully. It is now available in the documents list.",
                );
                window.setTimeout(() => setFlashMessage(""), 5000);
            },
            onError: (errors) => {
                setFileError(errors.files ?? "");
                setFlashError(
                    "Please review the highlighted fields and try again.",
                );
                window.setTimeout(() => setFlashError(""), 6000);
            },
        });
    };

    const toggleGrantedStaff = (staffId: number) => {
        const current = uploadForm.data.granted_staff_ids;
        const next = current.includes(staffId)
            ? current.filter((id) => id !== staffId)
            : [...current, staffId];

        uploadForm.setData("granted_staff_ids", next);
    };

    const handleAccessRequest = (
        request: AccessRequestRecord,
        action: "approve" | "reject",
    ) => {
        setProcessingRequestId(request.id);

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setFlashMessage(
                    action === "approve"
                        ? `Access request for "${request.document_title ?? "document"}" approved.`
                        : `Access request for "${request.document_title ?? "document"}" rejected.`,
                );
                window.setTimeout(() => setFlashMessage(""), 5000);
            },
            onError: () => {
                setFlashError("The access request could not be processed.");
                window.setTimeout(() => setFlashError(""), 6000);
            },
            onFinish: () => setProcessingRequestId(null),
        };

        if (action === "approve") {
            router.post(
                `/superadmin/document-access-requests/${request.id}/approve`,
                {},
                options,
            );
        } else {
            router.patch(
                `/superadmin/document-access-requests/${request.id}/reject`,
                {},
                options,
            );
        }
    };

    return (
        <SuperAdminLayout>
            <Head title="Documents Monitoring" />

            <div className="space-y-6">
                {/* HEADER */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                            <FileText
                                size={24}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Documents Monitoring
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Live view of every document uploaded by staff,
                                admins, and super admins.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openUpload}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-300"
                    >
                        <Upload size={16} />
                        Upload Document
                    </button>
                </div>

                {/* FLASH MESSAGES */}
                {flashMessage && (
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                            <p className="font-medium">{flashMessage}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFlashMessage("")}
                            className="rounded-lg p-1 transition hover:bg-emerald-500/10"
                            aria-label="Dismiss success message"
                        >
                            <X size={15} />
                        </button>
                    </div>
                )}

                {flashError && (
                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={17} className="mt-0.5 shrink-0" />
                            <p className="font-medium">{flashError}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFlashError("")}
                            className="rounded-lg p-1 transition hover:bg-rose-500/10"
                            aria-label="Dismiss error message"
                        >
                            <X size={15} />
                        </button>
                    </div>
                )}

                {/* STATS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total Documents"
                        value={stats.total}
                        hint="From staff, admin, and super admin uploads"
                        icon={<FileText size={20} />}
                        tone="amber"
                    />
                    <StatCard
                        label="Active Documents"
                        value={stats.active}
                        hint="Uploaded and currently active"
                        icon={<ShieldCheck size={20} />}
                        tone="emerald"
                    />
                    <StatCard
                        label="Expiring Soon"
                        value={stats.expiring}
                        hint="Within the next 30 days"
                        icon={<Clock size={20} />}
                        tone="blue"
                    />
                    <StatCard
                        label="Expired"
                        value={stats.expired}
                        hint="Requires immediate renewal"
                        icon={<AlertTriangle size={20} />}
                        tone="rose"
                    />
                </div>

                {/* SOURCE SUMMARY */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                        Upload sources
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-700 dark:text-sky-300">
                        <UserRound size={12} />
                        {stats.from_staff} staff
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 font-semibold text-violet-700 dark:text-violet-300">
                        <ShieldCheck size={12} />
                        {stats.from_admin} admin
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-300">
                        <FileText size={12} />
                        {stats.from_superadmin} super admin
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/20 bg-slate-500/10 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300">
                        <Lock size={12} />
                        {stats.locked} locked
                    </span>
                </div>

                {/* STAFF ACCESS REQUESTS */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <ShieldCheck size={17} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Staff Access Requests
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Requests submitted by staff for locked
                                    company documents.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                {stats.access_requests_pending} pending
                            </span>
                            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                {stats.access_requests_total} total
                            </span>
                        </div>
                    </div>

                    {accessRequests.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                            <ShieldCheck
                                size={26}
                                className="mx-auto mb-2 text-slate-400 opacity-60"
                            />
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                No staff access requests yet.
                            </p>
                            <p className="text-xs text-slate-500">
                                Requests will appear here when staff asks for
                                access to a locked company document.
                            </p>
                        </div>
                    ) : (
                        <div className="sa-scrollbar max-h-80 divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800/70">
                            {accessRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                {request.document_title ||
                                                    "Untitled document"}
                                            </p>
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${requestStatusClass(
                                                    request.status,
                                                )}`}
                                            >
                                                {request.status}
                                            </span>
                                        </div>
                                        <p className="truncate text-xs text-slate-500">
                                            {request.document_file_name ||
                                                "No file name"}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                                                <UserRound size={12} />
                                                {request.staff_name ||
                                                    "Unknown staff"}
                                            </span>
                                            {request.staff_email && (
                                                <span>
                                                    {request.staff_email}
                                                </span>
                                            )}
                                            <span>
                                                Requested{" "}
                                                {request.requested_at || "—"}
                                            </span>
                                            {request.responded_by && (
                                                <span>
                                                    Handled by{" "}
                                                    {request.responded_by} ·{" "}
                                                    {request.responded_at ||
                                                        "—"}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {request.status === "pending" && (
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleAccessRequest(
                                                        request,
                                                        "approve",
                                                    )
                                                }
                                                disabled={
                                                    processingRequestId ===
                                                    request.id
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
                                            >
                                                <CheckCircle2 size={13} />
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleAccessRequest(
                                                        request,
                                                        "reject",
                                                    )
                                                }
                                                disabled={
                                                    processingRequestId ===
                                                    request.id
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300"
                                            >
                                                <XCircle size={13} />
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FILTERS */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search title, file name, reference, uploader, or assignee..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <select
                                value={typeFilter}
                                onChange={(event) =>
                                    setTypeFilter(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                {DOCUMENT_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type === "All"
                                            ? "All Types"
                                            : type}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                {STATUS_FILTERS.map((status) => (
                                    <option key={status} value={status}>
                                        {status === "All"
                                            ? "All Statuses"
                                            : status}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={sourceFilter}
                                onChange={(event) =>
                                    setSourceFilter(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                {SOURCE_FILTERS.map((source) => (
                                    <option key={source} value={source}>
                                        {source === "All"
                                            ? "All Sources"
                                            : source}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={categoryFilter}
                                onChange={(event) =>
                                    setCategoryFilter(event.target.value)
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                {CATEGORY_FILTERS.map((category) => (
                                    <option key={category} value={category}>
                                        {category === "All"
                                            ? "All Categories"
                                            : category}
                                    </option>
                                ))}
                            </select>

                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={lockedOnly}
                                    onChange={(event) =>
                                        setLockedOnly(event.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                />
                                Locked only
                            </label>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                        Showing {filtered.length} of {documents.length} documents
                        {stats.access_requests_pending > 0
                            ? ` · ${stats.access_requests_pending} pending staff request${stats.access_requests_pending === 1 ? "" : "s"}`
                            : ""}
                        {stats.archived > 0
                            ? ` · ${stats.archived} archived`
                            : ""}
                    </p>
                </div>

                {/* TABLE */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                    <div className="sa-scrollbar max-h-[600px] overflow-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800/80">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                                <tr>
                                    {[
                                        "Document",
                                        "Type",
                                        "Uploaded By",
                                        "Assigned To",
                                        "Uploaded",
                                        "Expiry",
                                        "Status",
                                        "",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                                {filtered.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                                    >
                                        <td className="min-w-[260px] px-4 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                                        {doc.title}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {doc.file_name}
                                                        {doc.reference_number
                                                            ? ` · ${doc.reference_number}`
                                                            : ""}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                        <span>
                                                            {doc.formatted_file_size ||
                                                                "—"}
                                                        </span>
                                                        {doc.attachment_count >
                                                            0 && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Paperclip
                                                                    size={11}
                                                                />
                                                                {
                                                                    doc.attachment_count
                                                                }{" "}
                                                                file
                                                                {doc.attachment_count >
                                                                1
                                                                    ? "s"
                                                                    : ""}
                                                            </span>
                                                        )}
                                                        {!doc.file_exists && (
                                                            <span className="inline-flex items-center gap-1 text-rose-500">
                                                                <AlertCircle
                                                                    size={11}
                                                                />
                                                                Missing file
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <p className="text-slate-700 dark:text-slate-300">
                                                {doc.type || "Other"}
                                            </p>
                                            <div className="mt-1 flex items-center gap-1.5">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                                        doc.document_type ===
                                                        "company"
                                                            ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                                                            : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                                    }`}
                                                >
                                                    {doc.document_type ===
                                                    "company" ? (
                                                        <Building2 size={10} />
                                                    ) : (
                                                        <UserRound size={10} />
                                                    )}
                                                    {doc.document_type ===
                                                    "company"
                                                        ? "Company"
                                                        : "Client"}
                                                </span>
                                                {doc.is_locked && (
                                                    <Lock
                                                        size={12}
                                                        className="text-amber-500"
                                                    />
                                                )}
                                            </div>
                                        </td>

                                        <td className="min-w-[165px] px-4 py-3">
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {doc.uploaded_by_name ||
                                                    "System"}
                                            </p>
                                            <span
                                                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass(
                                                    doc.uploaded_by_role,
                                                )}`}
                                            >
                                                {formatRole(
                                                    doc.uploaded_by_role,
                                                )}
                                            </span>
                                        </td>

                                        <td className="min-w-[165px] px-4 py-3">
                                            <p className="font-medium text-slate-800 dark:text-slate-200">
                                                {doc.assigned_name ||
                                                    "All staff"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {doc.assigned_name
                                                    ? formatRole(
                                                          doc.assigned_role,
                                                      )
                                                    : "Unassigned"}
                                            </p>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {doc.created_at || "—"}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <p className="text-slate-600 dark:text-slate-400">
                                                {doc.expiry_date
                                                    ? formatDate(
                                                          doc.expiry_date,
                                                      )
                                                    : "No expiry"}
                                            </p>
                                            {doc.expiry_date &&
                                                doc.status ===
                                                    "Expiring Soon" && (
                                                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                        {doc.days_until_expiry}{" "}
                                                        day
                                                        {doc.days_until_expiry ===
                                                        1
                                                            ? ""
                                                            : "s"}{" "}
                                                        left
                                                    </p>
                                                )}
                                            {doc.expiry_date &&
                                                doc.status === "Expired" && (
                                                    <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                                                        Expired{" "}
                                                        {Math.abs(
                                                            doc.days_until_expiry ??
                                                                0,
                                                        )}{" "}
                                                        day
                                                        {Math.abs(
                                                            doc.days_until_expiry ??
                                                                0,
                                                        ) === 1
                                                            ? ""
                                                            : "s"}{" "}
                                                        ago
                                                    </p>
                                                )}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                                    doc.status,
                                                )}`}
                                            >
                                                {statusIcon(doc.status)}
                                                {doc.status}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelected(doc)
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:border-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
                                                >
                                                    <Eye size={14} />
                                                    View
                                                </button>

                                                {doc.download_url && (
                                                    <a
                                                        href={doc.download_url}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 dark:border-slate-800 dark:text-slate-400 dark:hover:text-emerald-400"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-12 text-center"
                                        >
                                            <FileText
                                                size={30}
                                                className="mx-auto mb-2 text-slate-400 opacity-60"
                                            />
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                {documents.length === 0
                                                    ? "No documents have been uploaded yet."
                                                    : "No documents match your filters."}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {documents.length === 0
                                                    ? "Upload the first document to start monitoring compliance."
                                                    : "Try a different keyword or reset the filters."}
                                            </p>
                                            {documents.length === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={openUpload}
                                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
                                                >
                                                    <Upload size={16} />
                                                    Upload Document
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {selected && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelected(null);
                        }
                    }}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {selected.title}
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {selected.file_name}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                                                selected.status,
                                            )}`}
                                        >
                                            {statusIcon(selected.status)}
                                            {selected.status}
                                        </span>
                                        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                            {selected.type || "Other"}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                                selected.document_type ===
                                                "company"
                                                    ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                                                    : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                            }`}
                                        >
                                            {selected.document_type ===
                                            "company" ? (
                                                <Building2 size={11} />
                                            ) : (
                                                <UserRound size={11} />
                                            )}
                                            {selected.document_type ===
                                            "company"
                                                ? "Company"
                                                : "Client"}
                                        </span>
                                        {selected.is_locked && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                                <Lock size={11} />
                                                Locked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-white"
                                aria-label="Close document details"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                                {
                                    label: "Reference Number",
                                    value:
                                        selected.reference_number ||
                                        `DOC-${String(selected.id).padStart(
                                            6,
                                            "0",
                                        )}`,
                                },
                                {
                                    label: "File Size",
                                    value:
                                        selected.formatted_file_size || "—",
                                },
                                {
                                    label: "Uploaded By",
                                    value: `${selected.uploaded_by_name || "System"} (${formatRole(
                                        selected.uploaded_by_role,
                                    )})`,
                                },
                                {
                                    label: "Assigned To",
                                    value: selected.assigned_name
                                        ? `${selected.assigned_name} (${formatRole(
                                              selected.assigned_role,
                                          )})`
                                        : "All staff / unassigned",
                                },
                                {
                                    label: "Uploaded On",
                                    value: selected.created_at || "—",
                                },
                                {
                                    label: "Expiry Date",
                                    value: selected.expiry_date
                                        ? formatDate(selected.expiry_date)
                                        : "No expiry",
                                },
                                {
                                    label: "Review Date",
                                    value: selected.review_date
                                        ? formatDate(selected.review_date)
                                        : "—",
                                },
                                {
                                    label: "Regulatory Body",
                                    value: selected.regulatory_body || "—",
                                },
                                {
                                    label: "Retention Period",
                                    value: selected.retention_period || "—",
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                                >
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {selected.description && (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Description
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                                    {selected.description}
                                </p>
                            </div>
                        )}

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Attached Files (
                                    {selected.attachments.length})
                                </p>
                                <Paperclip
                                    size={14}
                                    className="text-slate-400"
                                />
                            </div>

                            {selected.attachments.length === 0 ? (
                                <p className="mt-2 text-sm text-slate-500">
                                    No attachments recorded for this document.
                                </p>
                            ) : (
                                <div className="sa-scrollbar mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                                    {selected.attachments.map((attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#0A0F1D]"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {attachment.file_name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {attachment.formatted_file_size ||
                                                        "—"}
                                                    {attachment.is_primary
                                                        ? " · Primary file"
                                                        : ""}
                                                    {!attachment.file_exists
                                                        ? " · File missing"
                                                        : ""}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                {attachment.file_url && (
                                                    <a
                                                        href={
                                                            attachment.file_url
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                                    >
                                                        <Eye size={13} />
                                                        View
                                                    </a>
                                                )}
                                                {attachment.download_url && (
                                                    <a
                                                        href={
                                                            attachment.download_url
                                                        }
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                                    >
                                                        <Download size={13} />
                                                        Download
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            {selected.download_url && (
                                <a
                                    href={selected.download_url}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
                                >
                                    <Download size={16} />
                                    Download File
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD MODAL */}
            {showUpload && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeUpload();
                        }
                    }}
                >
                    <div
                        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <FileUp size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Upload Document
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Uploaded files are immediately available
                                        to the selected assignee and visible in
                                        this monitoring page.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeUpload}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-white"
                                aria-label="Close upload dialog"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpload}
                            className="mt-5 space-y-4"
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Document Title{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadForm.data.title}
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "title",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. Business Permit 2026"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                    {uploadForm.errors.title && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {uploadForm.errors.title}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Document Type{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={uploadForm.data.type}
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "type",
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    >
                                        {DOCUMENT_TYPES.filter(
                                            (type) => type !== "All",
                                        ).map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                    {uploadForm.errors.type && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {uploadForm.errors.type}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Category{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={
                                            uploadForm.data.document_type
                                        }
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "document_type",
                                                event.target.value as
                                                    | "client"
                                                    | "company",
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    >
                                        <option value="client">
                                            Client Document
                                        </option>
                                        <option value="company">
                                            Company Document
                                        </option>
                                    </select>
                                    {uploadForm.errors.document_type && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {uploadForm.errors.document_type}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Assign To
                                    </label>
                                    <select
                                        value={uploadForm.data.assigned_to}
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "assigned_to",
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    >
                                        <option value="">
                                            All staff (unassigned)
                                        </option>
                                        {users.map((user) => (
                                            <option
                                                key={user.id}
                                                value={user.id}
                                            >
                                                {user.name} —{" "}
                                                {formatRole(user.role)}
                                            </option>
                                        ))}
                                    </select>
                                    {uploadForm.errors.assigned_to && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {uploadForm.errors.assigned_to}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        value={uploadForm.data.expiry_date}
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "expiry_date",
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                    {uploadForm.errors.expiry_date && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {uploadForm.errors.expiry_date}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Reference Number
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            uploadForm.data.reference_number
                                        }
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "reference_number",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. DOC-2026-0142"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Regulatory Body
                                    </label>
                                    <input
                                        type="text"
                                        value={
                                            uploadForm.data.regulatory_body
                                        }
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "regulatory_body",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. DOLE, BIR, SEC"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Retention Period
                                    </label>
                                    <select
                                        value={
                                            uploadForm.data.retention_period
                                        }
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "retention_period",
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    >
                                        <option value="">No retention set</option>
                                        <option value="1 year">1 year</option>
                                        <option value="3 years">3 years</option>
                                        <option value="5 years">5 years</option>
                                        <option value="10 years">
                                            10 years
                                        </option>
                                        <option value="Permanent">
                                            Permanent
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Review Date
                                    </label>
                                    <input
                                        type="date"
                                        value={uploadForm.data.review_date}
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "review_date",
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={uploadForm.data.description}
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "description",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Optional notes about this document..."
                                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                                    />
                                    {uploadForm.errors.description && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {uploadForm.errors.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                                <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={uploadForm.data.is_locked}
                                        onChange={(event) =>
                                            uploadForm.setData(
                                                "is_locked",
                                                event.target.checked,
                                            )
                                        }
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                                            Lock this document
                                        </span>
                                        <span className="block text-xs text-slate-500">
                                            Only the selected staff accounts
                                            below can access a locked company
                                            document.
                                        </span>
                                    </span>
                                </label>

                                {uploadForm.data.is_locked && (
                                    <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#0A0F1D]">
                                        {users.filter(
                                            (user) => user.role === "staff",
                                        ).length === 0 ? (
                                            <p className="px-1 py-2 text-xs text-slate-500">
                                                No staff accounts available.
                                            </p>
                                        ) : (
                                            users
                                                .filter(
                                                    (user) =>
                                                        user.role === "staff",
                                                )
                                                .map((user) => (
                                                    <label
                                                        key={user.id}
                                                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={uploadForm.data.granted_staff_ids.includes(
                                                                user.id,
                                                            )}
                                                            onChange={() =>
                                                                toggleGrantedStaff(
                                                                    user.id,
                                                                )
                                                            }
                                                            className="h-3.5 w-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                                        />
                                                        <span className="font-medium">
                                                            {user.name}
                                                        </span>
                                                        <span className="text-slate-400">
                                                            {user.email}
                                                        </span>
                                                    </label>
                                                ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Document Files{" "}
                                    <span className="text-rose-500">*</span>
                                </label>

                                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-amber-500/50 hover:bg-amber-500/5 dark:border-slate-700 dark:bg-slate-900/40">
                                    <FileUp
                                        size={24}
                                        className="text-amber-500"
                                    />
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Choose document files
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        PDF, DOC, DOCX, XLS, XLSX, CSV, PNG,
                                        JPG, WEBP, ZIP, RAR, 7Z, TXT · max 50 MB
                                        each
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.zip,.rar,.7z,.txt"
                                        onChange={(event) => {
                                            handleAddFiles(
                                                event.target.files,
                                            );
                                            event.target.value = "";
                                        }}
                                        className="hidden"
                                    />
                                </label>

                                {(fileError || uploadForm.errors.files) && (
                                    <p className="mt-2 text-xs text-rose-500">
                                        {fileError || uploadForm.errors.files}
                                    </p>
                                )}

                                {pendingFiles.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                        {pendingFiles.map((file, index) => (
                                            <div
                                                key={`${file.name}-${index}`}
                                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Paperclip
                                                        size={14}
                                                        className="shrink-0 text-slate-400"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                                                            {file.name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {formatFileSize(
                                                                file.size,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveFile(
                                                            index,
                                                        )
                                                    }
                                                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                                                    aria-label={`Remove ${file.name}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={closeUpload}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadForm.processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Upload size={16} />
                                    {uploadForm.processing
                                        ? "Uploading..."
                                        : "Upload Document"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}
