import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import AdminLayout from "../../Layouts/AdminLayout";
import {
    AlertCircle,
    Archive,
    Bell,
    Building,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Download,
    Eye,
    FileText,
    FileUp,
    Filter,
    Lock,
    MoreVertical,
    Paperclip,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    User,
    Users,
    X,
    XCircle,
    File,
    Grid,
    List,
    Unlock,
    Calendar,
    Timer,
    AlertTriangle,
    Package,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type Staff = {
    id: number;
    name: string;
    email: string;
    role?: string;
};

type DocumentAttachment = {
    id: number;
    file_name: string;
    file_path?: string | null;
    file_url?: string | null;
    download_url?: string | null;
    mime_type?: string | null;
    file_size?: number | null;
    formatted_file_size?: string | null;
    is_primary?: boolean;
    file_exists?: boolean;
};

type DocumentRecord = {
    id: number;
    title: string;
    file_name: string;
    file_path?: string | null;
    file_url?: string | null;
    download_url?: string | null;
    mime_type?: string | null;
    file_size?: number | null;
    formatted_file_size?: string | null;
    type?: string | null;
    description?: string | null;
    status?: string | null;
    uploaded_by?: number | null;
    uploaded_by_name?: string | null;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
    assigned_name?: string | null;
    uploaded_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    document_type?: "client" | "company" | null;
    is_locked?: boolean;
    requires_permission?: boolean;
    granted_staff_ids?: number[];
    expiry_date?: string | null;
    retention_period?: string | null;
    retention_start_date?: string | null;
    archived_at?: string | null;
    archived_by?: number | null;
    regulatory_body?: string | null;
    reference_number?: string | null;
    review_date?: string | null;
    compliance_status?: string | null;
    is_expired?: boolean;
    is_expiring_soon?: boolean;
    days_until_expiry?: number | null;
    retention_date?: string | null;
    is_retention_due?: boolean;
    can_be_archived?: boolean;
    attachments?: DocumentAttachment[];
    attachment_count?: number;
    is_deleted?: boolean;
    deleted_at?: string | null;
    file_exists?: boolean;
};

type DocumentAccessRequest = {
    id: number;
    document_id: number;
    staff_id: number;
    status: string;
    requested_at?: string | null;
    responded_at?: string | null;
    responded_by?: number | null;
    document_title?: string | null;
    document_file_name?: string | null;
    staff_name?: string | null;
    staff_email?: string | null;
    document?: {
        id?: number;
        title?: string | null;
        file_name?: string | null;
    } | null;
    staff?: { id?: number; name?: string | null; email?: string | null } | null;
};

type PageProps = {
    documents?: DocumentRecord[];
    deletedDocuments?: DocumentRecord[];
    clientDocuments?: DocumentRecord[];
    companyDocuments?: DocumentRecord[];
    compliance?: any[];
    accessRequests?: DocumentAccessRequest[];
    staff?: Staff[];
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
};

/* ============================================================
   CONSTANTS
============================================================ */

const DOCUMENT_TYPES = [
    "Permit",
    "Contract",
    "Certificate",
    "Invoice",
    "Compliance",
    "Safety",
    "Company",
    "Other",
];

const DOCUMENT_STATUS_FILTERS = ["All", "Active", "Archived"];
const DOCUMENT_STATUS_OPTIONS = ["Active", "Archived"];

/* ✅ AUTO-RETENTION base sa document type */
const RETENTION_BY_TYPE: Record<string, string> = {
    Permit: "1 year",
    Contract: "5 years",
    Certificate: "3 years",
    Invoice: "10 years",
    Compliance: "5 years",
    Safety: "1 year",
    Company: "Permanent",
    Other: "5 years",
};

/* ============================================================
   HELPERS
============================================================ */

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

function formatFileSize(bytes?: number | null, formatted?: string | null) {
    if (formatted) return formatted;
    if (!bytes || bytes <= 0) return "Unknown size";
    const units = ["Bytes", "KB", "MB", "GB"];
    let size = bytes;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }
    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/* ✅ FIXED: may : boolean return type + Boolean() wrapper */
function isPdf(document?: DocumentRecord | null): boolean {
    return Boolean(
        document?.mime_type === "application/pdf" ||
            document?.file_name?.toLowerCase().endsWith(".pdf"),
    );
}

/* ✅ FIXED: may : boolean return type */
function isImage(document?: DocumentRecord | null): boolean {
    return Boolean(document?.mime_type?.startsWith("image/"));
}

/* ✅ AUTO-COMPUTE EXPIRY base sa retention + start date */
function computeExpiryDate(
    retentionPeriod?: string | null,
    startDate?: string | null,
): string | null {
    if (!retentionPeriod || retentionPeriod === "Permanent") return null;
    const base = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(base.getTime())) return null;

    const yearsMatch = retentionPeriod.match(/(\d+)/);
    if (!yearsMatch) return null;

    const years = parseInt(yearsMatch[1], 10);
    const expiry = new Date(base);
    expiry.setFullYear(expiry.getFullYear() + years);
    return expiry.toISOString().split("T")[0];
}

function getDaysUntilExpiry(expiryDate?: string | null): number | null {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(expiryDate?: string | null): {
    label: string;
    className: string;
} {
    if (!expiryDate)
        return {
            label: "No expiry",
            className: "border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400",
        };
    const days = getDaysUntilExpiry(expiryDate);
    if (days === null)
        return {
            label: "No expiry",
            className: "border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400",
        };
    if (days < 0)
        return {
            label: "Expired",
            className: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
        };
    if (days <= 30)
        return {
            label: `Expiring in ${days} days`,
            className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        };
    return {
        label: `${days} days left`,
        className: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
    };
}

function getRetentionStatus(retentionDate?: string | null): {
    label: string;
    className: string;
} {
    if (!retentionDate || retentionDate === "Permanent") {
        return {
            label: "Permanent",
            className: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        };
    }
    const today = new Date();
    const retention = new Date(retentionDate);
    const diffTime = retention.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0)
        return {
            label: "Retention Due",
            className: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
        };
    if (diffDays <= 30)
        return {
            label: `Retention in ${diffDays} days`,
            className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        };
    return {
        label: `${diffDays} days left`,
        className: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
    };
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function DocumentsCompliance() {
    const {
        documents = [],
        deletedDocuments = [],
        clientDocuments = [],
        companyDocuments = [],
        accessRequests = [],
        staff = [],
        flash,
        auth,
    } = usePage<PageProps>().props;

    const currentUserId = auth?.user?.id;
    const userRole = auth?.user?.role;
    const isAdmin = userRole === "admin";

    const [docSubTab, setDocSubTab] = useState<
        "client" | "company" | "deleted"
    >("client");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const [flashMessage, setFlashMessage] = useState("");
    const [flashError, setFlashError] = useState("");

    useEffect(() => {
        if (flash?.success) {
            setFlashMessage(flash.success);
            const timer = window.setTimeout(() => setFlashMessage(""), 4000);
            return () => window.clearTimeout(timer);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error) {
            setFlashError(flash.error);
            const timer = window.setTimeout(() => setFlashError(""), 5000);
            return () => window.clearTimeout(timer);
        }
    }, [flash?.error]);

    const [documentSearch, setDocumentSearch] = useState("");
    const [documentTypeFilter, setDocumentTypeFilter] = useState("All");
    const [documentStatusFilter, setDocumentStatusFilter] = useState("All");
    const [documentStaffFilter, setDocumentStaffFilter] = useState("All");
    const [documentLockedFilter, setDocumentLockedFilter] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [selectedDocument, setSelectedDocument] =
        useState<DocumentRecord | null>(null);
    const [editingDocument, setEditingDocument] =
        useState<DocumentRecord | null>(null);
    const [documentMenu, setDocumentMenu] = useState<number | null>(null);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedDocumentForPermission, setSelectedDocumentForPermission] =
        useState<DocumentRecord | null>(null);
    const [processingAccessRequestId, setProcessingAccessRequestId] = useState<
        number | null
    >(null);

    const [showNotifications, setShowNotifications] = useState(false);
    const [seenRequestIds, setSeenRequestIds] = useState<Set<number>>(
        new Set(),
    );
    const notificationRef = useRef<HTMLDivElement | null>(null);

    const documentForm = useForm<{
        title: string;
        type: string;
        assigned_to: string;
        description: string;
        status: string;
        files: File[];
        document_type: "client" | "company";
        is_locked: boolean;
        requires_permission: boolean;
        granted_staff_ids: number[];
        expiry_date: string;
        retention_period: string;
    }>({
        title: "",
        type: "Other",
        assigned_to: "",
        description: "",
        status: "Active",
        files: [],
        document_type: "client",
        is_locked: false,
        requires_permission: false,
        granted_staff_ids: [],
        expiry_date: "",
        retention_period: "",
    });

    const editForm = useForm<{
        title: string;
        type: string;
        assigned_to: string;
        description: string;
        status: string;
        expiry_date: string;
        retention_period: string;
        is_locked: boolean;
    }>({
        title: "",
        type: "Other",
        assigned_to: "",
        description: "",
        status: "Active",
        expiry_date: "",
        retention_period: "",
        is_locked: false,
    });

    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [fileError, setFileError] = useState("");

    const resetDocumentForm = () => {
        documentForm.setData({
            title: "",
            type: "Other",
            assigned_to: "",
            description: "",
            status: "Active",
            files: [],
            document_type: "client",
            is_locked: false,
            requires_permission: false,
            granted_staff_ids: [],
            expiry_date: "",
            retention_period: "",
        });
        documentForm.clearErrors();
        setPendingFiles([]);
        setFileError("");
    };

    const openNewDocument = (type: "client" | "company" = "client") => {
        documentForm.setData({
            title: "",
            type: "Other",
            assigned_to: "",
            description: "",
            status: "Active",
            files: [],
            document_type: type,
            is_locked: type === "company",
            requires_permission: false,
            granted_staff_ids: [],
            expiry_date: "",
            retention_period: "",
        });
        documentForm.clearErrors();
        setPendingFiles([]);
        setFileError("");
        setSelectedDocument(null);
        setShowDocumentModal(true);
    };

    const openEditDocument = (document: DocumentRecord) => {
        setEditingDocument(document);
        editForm.setData({
            title: document.title || "",
            type: document.type || "Other",
            assigned_to: document.assigned_to
                ? String(document.assigned_to)
                : "",
            description: document.description || "",
            status: document.status || "Active",
            expiry_date: document.expiry_date || "",
            retention_period: document.retention_period || "",
            is_locked: Boolean(document.is_locked),
        });
        editForm.clearErrors();
        setDocumentMenu(null);
    };

    const closeEditModal = () => {
        setEditingDocument(null);
        editForm.reset();
        editForm.clearErrors();
    };

    const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingDocument) return;

        const autoRetention =
            editForm.data.retention_period ||
            RETENTION_BY_TYPE[editForm.data.type] ||
            "5 years";
        const baseDate =
            editingDocument.uploaded_at ||
            editingDocument.created_at ||
            new Date().toISOString();
        const computedExpiry =
            autoRetention === "Permanent"
                ? null
                : computeExpiryDate(autoRetention, baseDate);

        editForm.transform((data) => ({
            ...data,
            retention_period: autoRetention,
            expiry_date: computedExpiry ?? "",
        }));

        editForm.put(`/admin/documents/${editingDocument.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                closeEditModal();
                setFlashMessage("Document updated successfully.");
                setTimeout(() => setFlashMessage(""), 4000);
            },
            onError: () => {
                setFlashError("Failed to update document. Please try again.");
                setTimeout(() => setFlashError(""), 5000);
            },
        });
    };

    const handleAddFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setFileError("");
        const incoming = Array.from(files);
        setPendingFiles((prev) => {
            const merged = [...prev, ...incoming];
            documentForm.setData("files", merged);
            return merged;
        });
    };

    const handleRemoveFile = (index: number) => {
        setPendingFiles((prev) => {
            const next = prev.filter((_, i) => i !== index);
            documentForm.setData("files", next);
            return next;
        });
    };

    const handleDocumentUpload = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (pendingFiles.length === 0) {
            setFileError("Please attach at least one file.");
            return;
        }

        const autoRetention =
            RETENTION_BY_TYPE[documentForm.data.type] || "5 years";
        const computedExpiry =
            autoRetention === "Permanent"
                ? null
                : computeExpiryDate(autoRetention, new Date().toISOString());

        const autoTitle =
            documentForm.data.title.trim() ||
            pendingFiles[0]?.name.replace(/\.[^.]+$/, "") ||
            "Untitled Document";

        documentForm.transform((data) => ({
            ...data,
            title: autoTitle,
            files: pendingFiles,
            retention_period: autoRetention,
            expiry_date: computedExpiry ?? "",
        }));

        documentForm.post("/admin/documents", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                resetDocumentForm();
                setShowDocumentModal(false);
                setFlashMessage(
                    "Document uploaded successfully with all attachments.",
                );
                setTimeout(() => setFlashMessage(""), 4000);
            },
            onError: () => {
                setFlashError("Failed to upload document. Please try again.");
                setTimeout(() => setFlashError(""), 5000);
            },
        });
    };

    const openPermissionModal = (document: DocumentRecord) => {
        setSelectedDocumentForPermission(document);
        setShowPermissionModal(true);
        setDocumentMenu(null);
    };

    const grantPermission = (staffId: number) => {
        if (!selectedDocumentForPermission) return;

        router.post(
            `/admin/documents/${selectedDocumentForPermission.id}/grant-permission`,
            { staff_id: staffId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowPermissionModal(false);
                },
            },
        );
    };

    const revokePermission = (staffId: number) => {
        if (!selectedDocumentForPermission) return;

        router.delete(
            `/admin/documents/${selectedDocumentForPermission.id}/revoke-permission/${staffId}`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowPermissionModal(false);
                    setSelectedDocumentForPermission(null);
                    setFlashMessage(
                        "Staff access has been revoked successfully.",
                    );
                    setFlashError("");
                    window.setTimeout(() => {
                        setFlashMessage("");
                    }, 4000);
                },
                onError: () => {
                    setFlashError(
                        "Failed to revoke staff access. Please try again.",
                    );
                    setFlashMessage("");
                },
            },
        );
    };

    const grantAccessRequest = (request: DocumentAccessRequest) => {
        if (!request.document_id || !request.staff_id) return;
        setProcessingAccessRequestId(request.id);
        router.post(
            `/admin/documents/${request.document_id}/grant-permission`,
            {
                staff_id: request.staff_id,
                request_id: request.id,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSeenRequestIds((prev) => {
                        const next = new Set(prev);
                        next.add(request.id);
                        return next;
                    });
                    setFlashMessage(
                        `Access granted to ${request.staff_name || "staff"}.`,
                    );
                    setTimeout(() => setFlashMessage(""), 4000);
                },
                onError: () => {
                    setFlashError("Failed to grant access. Please try again.");
                    setTimeout(() => setFlashError(""), 5000);
                },
                onFinish: () => setProcessingAccessRequestId(null),
            },
        );
    };

    const rejectAccessRequest = (request: DocumentAccessRequest) => {
        if (!request.id) return;
        setProcessingAccessRequestId(request.id);
        router.patch(
            `/admin/document-access-requests/${request.id}/reject`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSeenRequestIds((prev) => {
                        const next = new Set(prev);
                        next.add(request.id);
                        return next;
                    });
                    setFlashMessage(
                        `Access request from ${request.staff_name || "staff"} rejected.`,
                    );
                    setTimeout(() => setFlashMessage(""), 4000);
                },
                onError: () => {
                    setFlashError(
                        "Failed to reject request. Please try again.",
                    );
                    setTimeout(() => setFlashError(""), 5000);
                },
                onFinish: () => setProcessingAccessRequestId(null),
            },
        );
    };

    const pendingAccessRequests = useMemo(
        () => accessRequests.filter((request) => request.status === "pending"),
        [accessRequests],
    );

    const pendingCount = pendingAccessRequests.length;

    const unseenPendingRequests = useMemo(
        () => pendingAccessRequests.filter((r) => !seenRequestIds.has(r.id)),
        [pendingAccessRequests, seenRequestIds],
    );

    const unseenCount = unseenPendingRequests.length;

    const markAllNotificationsSeen = () => {
        setSeenRequestIds(new Set(pendingAccessRequests.map((r) => r.id)));
    };

    const handleToggleNotifications = () => {
        const next = !showNotifications;
        setShowNotifications(next);
        if (next) {
            window.setTimeout(() => markAllNotificationsSeen(), 400);
        }
    };

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (
                showNotifications &&
                notificationRef.current &&
                !notificationRef.current.contains(target)
            ) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [showNotifications]);

  /*
useEffect(() => {
    if (!isAdmin) return;

    const interval = window.setInterval(() => {
        if (
            showDocumentModal ||
            showPermissionModal ||
            selectedDocument ||
            editingDocument
        ) {
            return;
        }

        router.reload({
            only: ["accessRequests"],
            preserveUrl: true,
        } as any);
    }, 5000);

    return () => window.clearInterval(interval);
}, [
    isAdmin,
    showDocumentModal,
    showPermissionModal,
    selectedDocument,
    editingDocument,
]);
*/
    const hasPermission = (document: DocumentRecord): boolean => {
        if (isAdmin) return true;
        if (!document.is_locked) return true;
        return (
            document.granted_staff_ids?.includes(currentUserId || 0) || false
        );
    };

    const getCurrentDocuments = () => {
        if (docSubTab === "client") {
            return clientDocuments.length > 0
                ? clientDocuments
                : documents.filter(
                      (d) => d.document_type === "client" || !d.document_type,
                  );
        } else if (docSubTab === "company") {
            return companyDocuments.length > 0
                ? companyDocuments
                : documents.filter((d) => d.document_type === "company");
        } else {
            return deletedDocuments;
        }
    };

    const filteredDocuments = useMemo(() => {
        const currentDocs = getCurrentDocuments();
        const search = documentSearch.trim().toLowerCase();

        return currentDocs.filter((document) => {
            const matchesSearch =
                !search ||
                document.title?.toLowerCase().includes(search) ||
                document.file_name?.toLowerCase().includes(search) ||
                document.type?.toLowerCase().includes(search) ||
                document.assigned_to_name?.toLowerCase().includes(search) ||
                document.assigned_name?.toLowerCase().includes(search);

            const matchesType =
                documentTypeFilter === "All" ||
                document.type === documentTypeFilter;
            const matchesStatus =
                documentStatusFilter === "All" ||
                document.status === documentStatusFilter;
            const matchesStaff =
                documentStaffFilter === "All" ||
                String(document.assigned_to ?? "") === documentStaffFilter;
            const matchesLocked =
                !documentLockedFilter ||
                (documentLockedFilter && document.is_locked);

            return (
                matchesSearch &&
                matchesType &&
                matchesStatus &&
                matchesStaff &&
                matchesLocked
            );
        });
    }, [
        docSubTab,
        clientDocuments,
        companyDocuments,
        documents,
        deletedDocuments,
        documentSearch,
        documentTypeFilter,
        documentStatusFilter,
        documentStaffFilter,
        documentLockedFilter,
    ]);

    const clientDocs =
        clientDocuments.length > 0
            ? clientDocuments
            : documents.filter(
                  (d) => d.document_type === "client" || !d.document_type,
              );
    const companyDocs =
        companyDocuments.length > 0
            ? companyDocuments
            : documents.filter((d) => d.document_type === "company");

    const documentStats = useMemo(() => {
        return {
            client: {
                total: clientDocs.length,
                active: clientDocs.filter(
                    (item) => item.status === "Active" || !item.status,
                ).length,
                archived: clientDocs.filter(
                    (item) => item.status === "Archived",
                ).length,
            },
            company: {
                total: companyDocs.length,
                active: companyDocs.filter(
                    (item) => item.status === "Active" || !item.status,
                ).length,
                archived: companyDocs.filter(
                    (item) => item.status === "Archived",
                ).length,
                locked: companyDocs.filter((item) => item.is_locked).length,
            },
            deleted: {
                total: deletedDocuments.length,
            },
        };
    }, [clientDocs, companyDocs, deletedDocuments]);

    const archiveDocument = (document: DocumentRecord) => {
        const confirmed = window.confirm(
            `Archive "${document.title}"? Archived documents can be restored later.`,
        );
        if (!confirmed) return;

        router.put(
            `/admin/documents/${document.id}/archive`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setFlashMessage("Document archived successfully.");
                    setTimeout(() => setFlashMessage(""), 4000);
                },
                onError: () => {
                    setFlashError(
                        "Failed to archive document. Please try again.",
                    );
                    setTimeout(() => setFlashError(""), 5000);
                },
            },
        );
        setDocumentMenu(null);
    };

    const restoreDocument = (document: DocumentRecord) => {
        const confirmed = window.confirm(
            `Restore "${document.title}"? This will make it active again.`,
        );
        if (!confirmed) return;

        router.put(
            `/admin/documents/${document.id}/restore`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setFlashMessage("Document restored successfully.");
                    setTimeout(() => setFlashMessage(""), 4000);
                },
                onError: () => {
                    setFlashError(
                        "Failed to restore document. Please try again.",
                    );
                    setTimeout(() => setFlashError(""), 5000);
                },
            },
        );
        setDocumentMenu(null);
    };

    const deleteDocument = (document: DocumentRecord) => {
        const confirmed = window.confirm(
            `Delete "${document.title}"? Mapupunta ito sa Deleted tab at pwede pang i-restore.`,
        );
        if (!confirmed) return;
        router.delete(`/admin/documents/${document.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setFlashMessage("Document moved to Deleted.");
                setTimeout(() => setFlashMessage(""), 4000);
            },
        });
        setDocumentMenu(null);
    };

    const restoreDeletedDocument = (document: DocumentRecord) => {
        const confirmed = window.confirm(
            `Restore "${document.title}"? Mababalik ito sa Active list.`,
        );
        if (!confirmed) return;

        router.put(
            `/admin/documents/${document.id}/restore-deleted`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setFlashMessage("Document restored successfully.");
                    setTimeout(() => setFlashMessage(""), 4000);
                },
                onError: () => {
                    setFlashError(
                        "Failed to restore document. Please try again.",
                    );
                    setTimeout(() => setFlashError(""), 5000);
                },
            },
        );
        setDocumentMenu(null);
    };

    const forceDeleteDocument = (document: DocumentRecord) => {
        const confirmed = window.confirm(
            `PERMANENTLY DELETE "${document.title}"? Hindi na ito ma-recover. Sigurado ka?`,
        );
        if (!confirmed) return;

        router.delete(`/admin/documents/${document.id}/force-delete`, {
            preserveScroll: true,
            onSuccess: () => {
                setFlashMessage("Document permanently deleted.");
                setTimeout(() => setFlashMessage(""), 4000);
            },
            onError: () => {
                setFlashError("Failed to permanently delete document.");
                setTimeout(() => setFlashError(""), 5000);
            },
        });
        setDocumentMenu(null);
    };

    const downloadDocument = (document: DocumentRecord) => {
        window.open(`/admin/documents/${document.id}/download`, "_blank");
        setDocumentMenu(null);
    };

    const downloadAllAttachments = (document: DocumentRecord) => {
        window.open(`/admin/documents/${document.id}/download-all`, "_blank");
        setDocumentMenu(null);
    };

    const downloadAttachment = (attachment: DocumentAttachment) => {
        if (attachment.download_url) {
            window.open(attachment.download_url, "_blank");
        } else if (attachment.file_url) {
            window.open(attachment.file_url, "_blank");
        }
        setDocumentMenu(null);
    };

    const openDocument = (document: DocumentRecord) => {
        setSelectedDocument(document);
        setDocumentMenu(null);
    };

    const documentStatusBadge = (status?: string | null) => {
        if (status === "Archived")
            return "border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-400";
        return "border-green-400/20 bg-green-400/10 text-green-600 dark:text-green-400";
    };

    const resetDocumentFilters = () => {
        setDocumentSearch("");
        setDocumentTypeFilter("All");
        setDocumentStatusFilter("All");
        setDocumentStaffFilter("All");
        setDocumentLockedFilter(false);
    };

    const switchSubTab = (tab: "client" | "company" | "deleted") => {
        setDocSubTab(tab);
        resetDocumentFilters();
        setDocumentMenu(null);
    };

    const isDeletedView = docSubTab === "deleted";

    return (
        <AdminLayout title="Documents & Compliance">
            <Head title="Documents & Compliance" />

            <style>{`
                .alibaton-notif-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #facc15 transparent;
                }
                .alibaton-notif-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .alibaton-notif-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .alibaton-notif-scroll::-webkit-scrollbar-thumb {
                    background: rgba(250, 204, 21, .65);
                    border-radius: 999px;
                }
                @keyframes notif-pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.08); opacity: .85; }
                }
                .notif-pulse {
                    animation: notif-pulse 1.6s ease-in-out infinite;
                }
            `}</style>

            <div className="min-h-screen bg-gray-50 dark:bg-[#050505] px-4 py-6 text-gray-900 dark:text-white sm:px-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-[1600px]">
                    {/* HEADER */}
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <ShieldCheck
                                    size={18}
                                    className="text-yellow-600 dark:text-yellow-400"
                                />
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-600 dark:text-yellow-400">
                                    Administration
                                </span>
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                                Documents
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                Manage client documents and company documents.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {isAdmin && (
                                <div className="relative" ref={notificationRef}>
                                    <button
                                        type="button"
                                        onClick={handleToggleNotifications}
                                        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                                            unseenCount > 0
                                                ? "border-red-400/40 bg-red-400/[0.08] text-red-600 dark:text-red-400 hover:bg-red-400/[0.14]"
                                                : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                                        }`}
                                        title="Document access requests"
                                    >
                                        <Bell size={18} />
                                        {unseenCount > 0 && (
                                            <span className="notif-pulse absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-lg shadow-red-500/40">
                                                {unseenCount > 9
                                                    ? "9+"
                                                    : unseenCount}
                                            </span>
                                        )}
                                    </button>

                                    {showNotifications && (
                                        <div className="absolute right-0 top-14 z-[9999] w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0b0b0b] shadow-[0_25px_80px_rgba(0,0,0,.85)]">
                                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Bell
                                                        size={16}
                                                        className="text-yellow-600 dark:text-yellow-400"
                                                    />
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">
                                                        Access Requests
                                                    </p>
                                                    {pendingCount > 0 && (
                                                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                                                            {pendingCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowNotifications(
                                                            false,
                                                        )
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>

                                            {pendingAccessRequests.length ===
                                            0 ? (
                                                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                                                    <CheckCircle2
                                                        size={32}
                                                        className="mb-2 text-green-600 dark:text-green-400"
                                                    />
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                        All caught up!
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        No pending access
                                                        requests at the moment.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="alibaton-notif-scroll max-h-[400px] overflow-y-auto">
                                                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                                                        {pendingAccessRequests.map(
                                                            (r) => {
                                                                const isProcessing =
                                                                    processingAccessRequestId ===
                                                                    r.id;
                                                                const staffName =
                                                                    r.staff_name ||
                                                                    r.staff
                                                                        ?.name ||
                                                                    "Staff";
                                                                const staffEmail =
                                                                    r.staff_email ||
                                                                    r.staff
                                                                        ?.email ||
                                                                    "";
                                                                const docTitle =
                                                                    r.document_title ||
                                                                    r.document
                                                                        ?.title ||
                                                                    `Doc #${r.document_id}`;

                                                                return (
                                                                    <div
                                                                        key={
                                                                            r.id
                                                                        }
                                                                        className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/[0.02]"
                                                                    >
                                                                        <div className="flex items-start gap-3">
                                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                                                                <User
                                                                                    size={
                                                                                        15
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                                                                                    {
                                                                                        staffName
                                                                                    }
                                                                                </p>
                                                                                {staffEmail && (
                                                                                    <p className="mt-0.5 truncate text-[10px] text-gray-500">
                                                                                        {
                                                                                            staffEmail
                                                                                        }
                                                                                    </p>
                                                                                )}
                                                                                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
                                                                                    <FileText
                                                                                        size={
                                                                                            11
                                                                                        }
                                                                                        className="shrink-0 text-yellow-600 dark:text-yellow-400"
                                                                                    />
                                                                                    <span className="truncate font-semibold text-gray-700 dark:text-gray-300">
                                                                                        {
                                                                                            docTitle
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                                <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-gray-600">
                                                                                    <CalendarDays
                                                                                        size={
                                                                                            10
                                                                                        }
                                                                                    />
                                                                                    {formatDate(
                                                                                        r.requested_at,
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-2.5 flex gap-2">
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    isProcessing
                                                                                }
                                                                                onClick={() =>
                                                                                    rejectAccessRequest(
                                                                                        r,
                                                                                    )
                                                                                }
                                                                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/[0.05] px-3 py-2 text-[11px] font-black text-red-600 dark:text-red-400 transition hover:bg-red-400/15 disabled:opacity-50"
                                                                            >
                                                                                <XCircle
                                                                                    size={
                                                                                        12
                                                                                    }
                                                                                />
                                                                                Reject
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    isProcessing
                                                                                }
                                                                                onClick={() =>
                                                                                    grantAccessRequest(
                                                                                        r,
                                                                                    )
                                                                                }
                                                                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-[11px] font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
                                                                            >
                                                                                <Unlock
                                                                                    size={
                                                                                        12
                                                                                    }
                                                                                />
                                                                                {isProcessing
                                                                                    ? "Processing..."
                                                                                    : "Grant"}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {isAdmin && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openNewDocument("client")
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-400 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-blue-400/10 transition hover:bg-blue-300"
                                    >
                                        <Upload size={17} />
                                        Upload Client Doc
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openNewDocument("company")
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300"
                                    >
                                        <Upload size={17} />
                                        Upload Company Doc
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {flashMessage && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 size={18} />
                            <span>{flashMessage}</span>
                            <button
                                type="button"
                                onClick={() => setFlashMessage("")}
                                className="ml-auto"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {flashError && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle size={18} />
                            <span>{flashError}</span>
                            <button
                                type="button"
                                onClick={() => setFlashError("")}
                                className="ml-auto"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <div className="mb-6 flex overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-1">
                        <button
                            type="button"
                            onClick={() => switchSubTab("client")}
                            className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                docSubTab === "client"
                                    ? "bg-blue-400 text-black shadow-lg shadow-blue-400/10"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <File size={17} />
                            Client Documents
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                    docSubTab === "client"
                                        ? "bg-black/10"
                                        : "bg-gray-100 dark:bg-white/10"
                                }`}
                            >
                                {documentStats.client.total}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => switchSubTab("company")}
                            className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                docSubTab === "company"
                                    ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <Building size={17} />
                            Company Documents
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                    docSubTab === "company"
                                        ? "bg-black/10"
                                        : "bg-gray-100 dark:bg-white/10"
                                }`}
                            >
                                {documentStats.company.total}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => switchSubTab("deleted")}
                            className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                docSubTab === "deleted"
                                    ? "bg-red-500 text-white shadow-lg shadow-red-500/10"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <Trash2 size={17} />
                            Deleted
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] ${
                                    docSubTab === "deleted"
                                        ? "bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white"
                                        : "bg-gray-100 dark:bg-white/10"
                                }`}
                            >
                                {documentStats.deleted.total}
                            </span>
                        </button>
                    </div>

                    {!isDeletedView && docSubTab === "client" && (
                        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <StatCard
                                label="Total Client Docs"
                                value={documentStats.client.total}
                                icon={File}
                                color="blue"
                                active={
                                    documentStatusFilter === "All" &&
                                    !documentLockedFilter &&
                                    documentTypeFilter === "All"
                                }
                                onClick={() => {
                                    setDocumentStatusFilter("All");
                                    setDocumentTypeFilter("All");
                                    setDocumentLockedFilter(false);
                                }}
                            />
                            <StatCard
                                label="Active"
                                value={documentStats.client.active}
                                icon={CheckCircle2}
                                color="green"
                                active={documentStatusFilter === "Active"}
                                onClick={() =>
                                    setDocumentStatusFilter("Active")
                                }
                            />
                            <StatCard
                                label="Archived"
                                value={documentStats.client.archived}
                                icon={Archive}
                                color="gray"
                                active={documentStatusFilter === "Archived"}
                                onClick={() =>
                                    setDocumentStatusFilter("Archived")
                                }
                            />
                            <StatCard
                                label="Types"
                                value={
                                    clientDocs.length > 0
                                        ? new Set(clientDocs.map((d) => d.type))
                                              .size
                                        : 0
                                }
                                icon={FileText}
                                color="blue"
                            />
                        </div>
                    )}

                    {!isDeletedView && docSubTab === "company" && (
                        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <StatCard
                                label="Total Company Docs"
                                value={documentStats.company.total}
                                icon={Building}
                                color="yellow"
                                active={
                                    documentStatusFilter === "All" &&
                                    !documentLockedFilter &&
                                    documentTypeFilter === "All"
                                }
                                onClick={() => {
                                    setDocumentStatusFilter("All");
                                    setDocumentTypeFilter("All");
                                    setDocumentLockedFilter(false);
                                }}
                            />
                            <StatCard
                                label="Active"
                                value={documentStats.company.active}
                                icon={CheckCircle2}
                                color="green"
                                active={documentStatusFilter === "Active"}
                                onClick={() =>
                                    setDocumentStatusFilter("Active")
                                }
                            />
                            <StatCard
                                label="Archived"
                                value={documentStats.company.archived}
                                icon={Archive}
                                color="gray"
                                active={documentStatusFilter === "Archived"}
                                onClick={() =>
                                    setDocumentStatusFilter("Archived")
                                }
                            />
                            <StatCard
                                label="Locked"
                                value={documentStats.company.locked}
                                icon={Lock}
                                color="red"
                                active={documentLockedFilter}
                                onClick={() =>
                                    setDocumentLockedFilter((prev) => !prev)
                                }
                            />
                        </div>
                    )}

                    {isDeletedView && (
                        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-4">
                            <div className="flex items-center gap-3">
                                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        Deleted Documents (
                                        {deletedDocuments.length})
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Documents that have been soft-deleted.
                                        They can be restored or permanently
                                        deleted.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-xl shadow-black/20">
                        <div className="grid gap-3 lg:grid-cols-[minmax(200px,1fr)_150px_150px_150px_auto]">
                            <SearchInput
                                value={documentSearch}
                                onChange={setDocumentSearch}
                                placeholder={`Search ${docSubTab} documents...`}
                            />

                            <FilterSelect
                                value={documentTypeFilter}
                                onChange={setDocumentTypeFilter}
                                options={["All", ...DOCUMENT_TYPES]}
                            />

                            {!isDeletedView && (
                                <FilterSelect
                                    value={documentStatusFilter}
                                    onChange={setDocumentStatusFilter}
                                    options={DOCUMENT_STATUS_FILTERS}
                                />
                            )}

                            {!isDeletedView && (
                                <BlackSelect
                                    value={documentStaffFilter}
                                    onChange={setDocumentStaffFilter}
                                >
                                    <option value="All">All Staff</option>
                                    {staff.map((member) => (
                                        <option
                                            key={member.id}
                                            value={String(member.id)}
                                        >
                                            {member.name}
                                        </option>
                                    ))}
                                </BlackSelect>
                            )}

                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("grid")}
                                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                                        viewMode === "grid"
                                            ? "bg-yellow-400 text-black"
                                            : "border border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/30 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                    <Grid size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("list")}
                                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                                        viewMode === "list"
                                            ? "bg-yellow-400 text-black"
                                            : "border border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/30 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {filteredDocuments.length === 0 ? (
                        <EmptyState
                            icon={
                                isDeletedView
                                    ? Trash2
                                    : docSubTab === "client"
                                      ? File
                                      : Building
                            }
                            title={
                                isDeletedView
                                    ? "No deleted documents"
                                    : `No ${docSubTab} documents found`
                            }
                            description={
                                isDeletedView
                                    ? "There are no deleted documents at the moment."
                                    : isAdmin
                                      ? `Upload a document or adjust your filters.`
                                      : "No documents available."
                            }
                            actionLabel=""
                            onAction={() => {}}
                        />
                    ) : viewMode === "grid" ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredDocuments.map((document) => {
                                const isCompanyDoc =
                                    document.document_type === "company";
                                const isLocked = Boolean(document.is_locked);
                                const hasAccess = hasPermission(document);
                                const canView =
                                    !isLocked || hasAccess || isAdmin;
                                const isArchived =
                                    document.status === "Archived";
                                const expiryStatus = getExpiryStatus(
                                    document.expiry_date,
                                );
                                const daysUntilExpiry = getDaysUntilExpiry(
                                    document.expiry_date,
                                );
                                const retentionStatus = getRetentionStatus(
                                    document.retention_date,
                                );

                                return (
                                    <DocumentCard
                                        key={document.id}
                                        document={document}
                                        isCompanyDoc={isCompanyDoc}
                                        isLocked={isLocked}
                                        canView={canView}
                                        hasAccess={hasAccess}
                                        isAdmin={isAdmin}
                                        isArchived={isArchived}
                                        isDeleted={isDeletedView}
                                        expiryStatus={expiryStatus}
                                        daysUntilExpiry={daysUntilExpiry}
                                        retentionStatus={retentionStatus}
                                        onOpen={() => openDocument(document)}
                                        onDownload={() =>
                                            downloadDocument(document)
                                        }
                                        onDownloadAll={() =>
                                            downloadAllAttachments(document)
                                        }
                                        onDelete={() =>
                                            deleteDocument(document)
                                        }
                                        onArchive={() =>
                                            archiveDocument(document)
                                        }
                                        onRestore={() =>
                                            restoreDocument(document)
                                        }
                                        onRestoreDeleted={() =>
                                            restoreDeletedDocument(document)
                                        }
                                        onForceDelete={() =>
                                            forceDeleteDocument(document)
                                        }
                                        onEdit={() =>
                                            openEditDocument(document)
                                        }
                                        onManagePermissions={() =>
                                            openPermissionModal(document)
                                        }
                                        onMenuToggle={() =>
                                            setDocumentMenu(
                                                documentMenu === document.id
                                                    ? null
                                                    : document.id,
                                            )
                                        }
                                        isMenuOpen={
                                            documentMenu === document.id
                                        }
                                        formatDate={formatDate}
                                        formatFileSize={formatFileSize}
                                        documentStatusBadge={
                                            documentStatusBadge
                                        }
                                        isPdf={isPdf}
                                        isImage={isImage}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <DocumentListView
                            documents={filteredDocuments}
                            documentMenu={documentMenu}
                            setDocumentMenu={setDocumentMenu}
                            onOpen={openDocument}
                            onDownload={downloadDocument}
                            onDownloadAll={downloadAllAttachments}
                            onDelete={deleteDocument}
                            onArchive={archiveDocument}
                            onRestore={restoreDocument}
                            onRestoreDeleted={restoreDeletedDocument}
                            onForceDelete={forceDeleteDocument}
                            onEdit={openEditDocument}
                            onManagePermissions={openPermissionModal}
                            isAdmin={isAdmin}
                            hasPermission={hasPermission}
                            isDeletedView={isDeletedView}
                            formatDate={formatDate}
                            documentStatusBadge={documentStatusBadge}
                            isPdf={isPdf}
                            isImage={isImage}
                        />
                    )}
                </div>
            </div>

            {showDocumentModal && (
                <Modal
                    title={
                        documentForm.data.document_type === "company"
                            ? "Upload Company Document"
                            : "Upload Client Document"
                    }
                    subtitle={
                        documentForm.data.document_type === "company"
                            ? "Company documents are locked by default and require admin permission for staff access."
                            : "Client documents are visible to all staff by default."
                    }
                    onClose={() => {
                        setShowDocumentModal(false);
                        documentForm.clearErrors();
                    }}
                    large
                >
                    <DocumentForm
                        form={documentForm}
                        onSubmit={handleDocumentUpload}
                        onCancel={() => setShowDocumentModal(false)}
                        pendingFiles={pendingFiles}
                        onAddFiles={handleAddFiles}
                        onRemoveFile={handleRemoveFile}
                        fileError={fileError}
                    />
                </Modal>
            )}

            {editingDocument && (
                <Modal
                    title="Edit Document"
                    subtitle={`Editing: ${editingDocument.title}`}
                    onClose={closeEditModal}
                    large
                >
                    <EditDocumentForm
                        form={editForm}
                        onSubmit={handleEditSubmit}
                        onCancel={closeEditModal}
                        staff={staff}
                        document={editingDocument}
                    />
                </Modal>
            )}

            {selectedDocument && (
                <DocumentViewModal
                    document={selectedDocument}
                    onClose={() => setSelectedDocument(null)}
                    onDownload={() => downloadDocument(selectedDocument)}
                    onDownloadAll={() =>
                        downloadAllAttachments(selectedDocument)
                    }
                    onDownloadAttachment={downloadAttachment}
                    formatDate={formatDate}
                    formatFileSize={formatFileSize}
                    isPdf={isPdf}
                    isImage={isImage}
                />
            )}

            {showPermissionModal && selectedDocumentForPermission && (
                <PermissionModal
                    document={selectedDocumentForPermission}
                    staff={staff}
                    onClose={() => {
                        setShowPermissionModal(false);
                        setSelectedDocumentForPermission(null);
                    }}
                    onGrant={grantPermission}
                    onRevoke={revokePermission}
                />
            )}
        </AdminLayout>
    );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
    label,
    value,
    icon: Icon,
    color = "yellow",
    active = false,
    onClick,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    color?: "yellow" | "blue" | "green" | "red" | "gray";
    active?: boolean;
    onClick?: () => void;
}) {
    const colorClasses = {
        yellow: "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400",
        blue: "bg-blue-400/10 text-blue-600 dark:text-blue-400",
        green: "bg-green-400/10 text-green-600 dark:text-green-400",
        red: "bg-red-400/10 text-red-600 dark:text-red-400",
        gray: "bg-gray-400/10 text-gray-600 dark:text-gray-400",
    };

    const isClickable = Boolean(onClick);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!isClickable}
            className={`rounded-2xl border p-4 text-left shadow-lg shadow-black/20 transition ${
                isClickable
                    ? "cursor-pointer hover:border-yellow-400/40 hover:bg-white dark:hover:bg-white/[0.06]"
                    : "cursor-default"
            } ${
                active
                    ? "border-yellow-400 bg-yellow-400/[0.08] ring-2 ring-yellow-400/30"
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03]"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                        {value}
                    </p>
                </div>
                <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorClasses[color]}`}
                >
                    <Icon size={18} />
                </div>
            </div>
        </button>
    );
}

/* ============================================================
   DOCUMENT CARD
============================================================ */

function DocumentCard({
    document,
    isCompanyDoc,
    isLocked,
    canView,
    hasAccess,
    isAdmin,
    isArchived,
    isDeleted,
    expiryStatus,
    daysUntilExpiry,
    retentionStatus,
    onOpen,
    onDownload,
    onDownloadAll,
    onDelete,
    onArchive,
    onRestore,
    onRestoreDeleted,
    onForceDelete,
    onEdit,
    onManagePermissions,
    onMenuToggle,
    isMenuOpen,
    formatDate,
    formatFileSize,
    documentStatusBadge,
    isPdf,
    isImage,
}: {
    document: DocumentRecord;
    isCompanyDoc: boolean;
    isLocked: boolean;
    canView: boolean;
    hasAccess: boolean;
    isAdmin: boolean;
    isArchived: boolean;
    isDeleted: boolean;
    expiryStatus: { label: string; className: string };
    daysUntilExpiry: number | null;
    retentionStatus: { label: string; className: string };
    onOpen: () => void;
    onDownload: () => void;
    onDownloadAll: () => void;
    onDelete: () => void;
    onArchive: () => void;
    onRestore: () => void;
    onRestoreDeleted: () => void;
    onForceDelete: () => void;
    onEdit: () => void;
    onManagePermissions: () => void;
    onMenuToggle: () => void;
    isMenuOpen: boolean;
    formatDate: (date?: string | null) => string;
    formatFileSize: (
        bytes?: number | null,
        formatted?: string | null,
    ) => string;
    documentStatusBadge: (status?: string | null) => string;
    isPdf: (doc?: DocumentRecord | null) => boolean;
    isImage: (doc?: DocumentRecord | null) => boolean;
}) {
    const attachmentCount =
        document.attachments?.length ?? (document.file_url ? 1 : 0);

    return (
        <div
            className={`group relative rounded-2xl border transition-all ${
                isDeleted
                    ? "border-red-500/30 bg-red-500/[0.03] opacity-90"
                    : isCompanyDoc
                      ? "border-yellow-400/20 bg-yellow-400/[0.03]"
                      : "border-blue-400/20 bg-blue-400/[0.03]"
            } hover:border-yellow-400/40 hover:shadow-xl hover:shadow-yellow-400/5`}
            onClick={(e) => {
                if (
                    !(e.target as HTMLElement).closest("button") &&
                    !(e.target as HTMLElement).closest("[data-action-menu]")
                ) {
                    onOpen();
                }
            }}
        >
            <div className="relative">
                <div
                    className={`relative flex h-48 items-center justify-center overflow-hidden rounded-t-2xl bg-white dark:bg-black/40 ${
                        canView ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                    onClick={canView ? onOpen : undefined}
                >
                    {canView && document.file_url && isImage(document) ? (
                        <img
                            src={document.file_url}
                            alt={document.title}
                            className="h-full w-full object-cover"
                        />
                    ) : canView && document.file_url && isPdf(document) ? (
                        <div className="flex flex-col items-center justify-center">
                            <FileText size={48} className="text-red-600 dark:text-red-400" />
                            <span className="mt-2 text-xs text-gray-500">
                                PDF Document
                            </span>
                        </div>
                    ) : canView ? (
                        <div className="flex flex-col items-center justify-center">
                            <FileText size={48} className="text-yellow-600 dark:text-yellow-400" />
                            <span className="mt-2 text-xs text-gray-500">
                                {document.file_name}
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center opacity-40">
                            <FileText size={48} className="text-gray-500" />
                        </div>
                    )}

                    {isDeleted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-sm">
                            <Trash2 size={40} className="text-red-700 dark:text-red-300" />
                            <p className="mt-2 text-xs font-black text-red-700 dark:text-red-200">
                                DELETED
                            </p>
                        </div>
                    )}

                    {!isDeleted && isCompanyDoc && isLocked && (
                        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 backdrop-blur-sm">
                            <Lock size={11} />
                            Locked
                        </div>
                    )}

                    {!isDeleted && isCompanyDoc && !isLocked && (
                        <div className="absolute right-3 top-3 rounded-full bg-yellow-400/20 px-2.5 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 backdrop-blur-sm">
                            Company
                        </div>
                    )}

                    {!isDeleted && !isCompanyDoc && (
                        <div className="absolute right-3 top-3 rounded-full bg-blue-400/20 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 backdrop-blur-sm">
                            Client
                        </div>
                    )}

                    {!isDeleted && attachmentCount > 1 && (
                        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/25 px-2.5 py-1 text-[10px] font-black text-purple-700 dark:text-purple-200 backdrop-blur-sm">
                            <Paperclip size={10} />
                            {attachmentCount} files
                        </div>
                    )}

                    {!isDeleted && isArchived && (
                        <div className="absolute left-3 top-3 rounded-full bg-gray-500/20 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-400 backdrop-blur-sm">
                            Archived
                        </div>
                    )}

                    {!isDeleted && document.expiry_date && (
                        <div
                            className={`absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${expiryStatus.className}`}
                        >
                            <Calendar size={11} />
                            {expiryStatus.label}
                        </div>
                    )}

                    {!isDeleted &&
                        document.retention_period &&
                        document.retention_period !== "" && (
                            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 backdrop-blur-sm">
                                <Timer size={11} />
                                {document.retention_period}
                            </div>
                        )}

                    {!isDeleted && !canView && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                            <Lock size={32} className="text-red-600 dark:text-red-400" />
                            <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                Access Denied
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Request permission from Admin
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {document.title}
                            </h3>
                            <p className="mt-1 truncate text-xs text-gray-500">
                                {canView
                                    ? document.file_name
                                    : "Restricted file"}
                            </p>
                        </div>
                        {(isAdmin || canView) && (
                            <button
                                type="button"
                                onClick={onMenuToggle}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                            >
                                <MoreVertical size={16} />
                            </button>
                        )}
                    </div>

                    {isDeleted ? (
                        <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/5 px-2.5 py-2">
                            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                <Trash2 size={11} />
                                Deleted: {formatDate(document.deleted_at)}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                                    {document.type || "Other"}
                                </span>
                                <span
                                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${documentStatusBadge(document.status)}`}
                                >
                                    {document.status || "Active"}
                                </span>
                                {document.assigned_name && (
                                    <span className="text-xs text-gray-500">
                                        {document.assigned_name}
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                                {document.expiry_date && (
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-medium ${expiryStatus.className}`}
                                    >
                                        <Calendar size={10} />
                                        Expires:{" "}
                                        {formatDate(document.expiry_date)}
                                        {daysUntilExpiry !== null &&
                                            daysUntilExpiry <= 30 &&
                                            daysUntilExpiry > 0 && (
                                                <AlertTriangle
                                                    size={10}
                                                    className="text-yellow-600 dark:text-yellow-400"
                                                />
                                            )}
                                        {daysUntilExpiry !== null &&
                                            daysUntilExpiry <= 0 && (
                                                <AlertCircle
                                                    size={10}
                                                    className="text-red-600 dark:text-red-400"
                                                />
                                            )}
                                    </span>
                                )}
                                {document.retention_period &&
                                    document.retention_period !== "" && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                                            <Package size={10} />
                                            Retention:{" "}
                                            {document.retention_period}
                                        </span>
                                    )}
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3 text-xs text-gray-500">
                                <span>
                                    {formatDate(
                                        document.uploaded_at ||
                                            document.created_at,
                                    )}
                                </span>
                                <span>
                                    {canView
                                        ? formatFileSize(
                                              document.file_size,
                                              document.formatted_file_size,
                                          )
                                        : "—"}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isMenuOpen && (
                <div
                    data-action-menu
                    className="absolute right-4 top-[180px] z-30 w-56 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0c0c] p-1 shadow-2xl"
                >
                    {isDeleted ? (
                        <>
                            {isAdmin && (
                                <>
                                    <button
                                        type="button"
                                        onClick={onRestoreDeleted}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-green-600 dark:text-green-400 hover:bg-green-500/10"
                                    >
                                        <RotateCcw size={15} />
                                        Restore Document
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onForceDelete}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 size={15} />
                                        Permanently Delete
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {canView && (
                                <>
                                    <button
                                        type="button"
                                        onClick={onOpen}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        <Eye size={15} />
                                        View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onDownload}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        <Download size={15} />
                                        Download Primary
                                    </button>
                                    {attachmentCount > 1 && (
                                        <button
                                            type="button"
                                            onClick={onDownloadAll}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                                        >
                                            <Package size={15} />
                                            Download All ({attachmentCount})
                                        </button>
                                    )}
                                </>
                            )}

                            {isAdmin && (
                                <>
                                    <button
                                        type="button"
                                        onClick={onEdit}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
                                    >
                                        <Pencil size={15} />
                                        Edit Document
                                    </button>
                                    {isCompanyDoc && (
                                        <button
                                            type="button"
                                            onClick={onManagePermissions}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10"
                                        >
                                            <Users size={15} />
                                            Manage Permissions
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={
                                            isArchived ? onRestore : onArchive
                                        }
                                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                                            isArchived
                                                ? "text-green-600 dark:text-green-400 hover:bg-green-400/10"
                                                : "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10"
                                        }`}
                                    >
                                        <Archive size={15} />
                                        {isArchived
                                            ? "Restore"
                                            : "Move to Archive"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onDelete}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 size={15} />
                                        Delete (Move to Trash)
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/* ============================================================
   DOCUMENT LIST VIEW
============================================================ */

function DocumentListView({
    documents,
    documentMenu,
    setDocumentMenu,
    onOpen,
    onDownload,
    onDownloadAll,
    onDelete,
    onArchive,
    onRestore,
    onRestoreDeleted,
    onForceDelete,
    onEdit,
    onManagePermissions,
    isAdmin,
    hasPermission,
    isDeletedView,
    formatDate,
    documentStatusBadge,
    isPdf,
    isImage,
}: {
    documents: DocumentRecord[];
    documentMenu: number | null;
    setDocumentMenu: (id: number | null) => void;
    onOpen: (doc: DocumentRecord) => void;
    onDownload: (doc: DocumentRecord) => void;
    onDownloadAll: (doc: DocumentRecord) => void;
    onDelete: (doc: DocumentRecord) => void;
    onArchive: (doc: DocumentRecord) => void;
    onRestore: (doc: DocumentRecord) => void;
    onRestoreDeleted: (doc: DocumentRecord) => void;
    onForceDelete: (doc: DocumentRecord) => void;
    onEdit: (doc: DocumentRecord) => void;
    onManagePermissions: (doc: DocumentRecord) => void;
    isAdmin: boolean;
    hasPermission: (doc: DocumentRecord) => boolean;
    isDeletedView: boolean;
    formatDate: (date?: string | null) => string;
    documentStatusBadge: (status?: string | null) => string;
    isPdf: (doc?: DocumentRecord | null) => boolean;
    isImage: (doc?: DocumentRecord | null) => boolean;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-xl shadow-black/20">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-left">
                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Document
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Category
                            </th>
                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Type
                            </th>
                            {!isDeletedView && (
                                <>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        Assigned To
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        Expiry
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        Retention
                                    </th>
                                </>
                            )}
                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                {isDeletedView ? "Deleted At" : "Status"}
                            </th>
                            <th className="w-16 px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((document) => {
                            const isCompanyDoc =
                                document.document_type === "company";
                            const isLocked = Boolean(document.is_locked);
                            const canView =
                                !isLocked || hasPermission(document) || isAdmin;
                            const isArchived = document.status === "Archived";
                            const expiryStatus = getExpiryStatus(
                                document.expiry_date,
                            );
                            const retentionStatus = getRetentionStatus(
                                document.retention_date,
                            );
                            const attachmentCount =
                                document.attachments?.length ??
                                (document.file_url ? 1 : 0);

                            return (
                                <tr
                                    key={document.id}
                                    className={`border-b border-gray-100 dark:border-white/5 transition hover:bg-gray-100 dark:hover:bg-white/[0.025] ${
                                        isDeletedView ? "bg-red-500/[0.02]" : ""
                                    }`}
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/10 bg-yellow-400/5">
                                                {isDeletedView ? (
                                                    <Trash2
                                                        size={17}
                                                        className="text-red-600 dark:text-red-400"
                                                    />
                                                ) : !canView ? (
                                                    <Lock
                                                        size={17}
                                                        className="text-red-600 dark:text-red-400"
                                                    />
                                                ) : document.file_url &&
                                                  isImage(document) ? (
                                                    <img
                                                        src={document.file_url}
                                                        alt=""
                                                        className="h-8 w-8 rounded object-cover"
                                                    />
                                                ) : (
                                                    <FileText
                                                        size={19}
                                                        className="text-yellow-600 dark:text-yellow-400"
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                    {document.title}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-gray-600">
                                                    {canView
                                                        ? document.file_name
                                                        : "Access restricted"}
                                                </p>
                                                {attachmentCount > 1 && (
                                                    <p className="mt-0.5 inline-flex items-center gap-1 rounded-lg bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                                        <Paperclip size={10} />
                                                        {attachmentCount} files
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        {isCompanyDoc ? (
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-400/10 px-2.5 py-1 text-xs text-yellow-600 dark:text-yellow-400">
                                                Company
                                                {isLocked && <Lock size={11} />}
                                            </span>
                                        ) : (
                                            <span className="rounded-lg bg-blue-400/10 px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400">
                                                Client
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">
                                            {document.type || "Other"}
                                        </span>
                                    </td>
                                    {!isDeletedView && (
                                        <>
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                                    {document.assigned_name ||
                                                        "All Staff"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {document.expiry_date ? (
                                                    <div className="flex flex-col">
                                                        <span
                                                            className={`inline-flex items-center gap-1 text-xs font-medium ${expiryStatus.className}`}
                                                        >
                                                            <Calendar
                                                                size={11}
                                                            />
                                                            {formatDate(
                                                                document.expiry_date,
                                                            )}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] ${expiryStatus.className}`}
                                                        >
                                                            {expiryStatus.label}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-500">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                {document.retention_period ? (
                                                    <div className="flex flex-col">
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                                                            <Package
                                                                size={11}
                                                            />
                                                            {
                                                                document.retention_period
                                                            }
                                                        </span>
                                                        <span
                                                            className={`text-[10px] ${retentionStatus.className}`}
                                                        >
                                                            {
                                                                retentionStatus.label
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-500">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-5 py-4">
                                        {isDeletedView ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                                                <Trash2 size={11} />
                                                {formatDate(
                                                    document.deleted_at,
                                                )}
                                            </span>
                                        ) : (
                                            <span
                                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${documentStatusBadge(document.status)}`}
                                            >
                                                {document.status || "Active"}
                                            </span>
                                        )}
                                    </td>
                                    <td className="relative px-5 py-4">
                                        {(isAdmin || canView) && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDocumentMenu(
                                                        documentMenu ===
                                                            document.id
                                                            ? null
                                                            : document.id,
                                                    )
                                                }
                                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        )}
                                        {documentMenu === document.id && (
                                            <div className="absolute right-5 top-14 z-30 w-52 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#090909] p-1 shadow-2xl">
                                                {isDeletedView ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onRestoreDeleted(
                                                                    document,
                                                                )
                                                            }
                                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-green-600 dark:text-green-400 hover:bg-green-500/10"
                                                        >
                                                            <RotateCcw
                                                                size={15}
                                                            />
                                                            Restore Document
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onForceDelete(
                                                                    document,
                                                                )
                                                            }
                                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                                        >
                                                            <Trash2 size={15} />
                                                            Permanently Delete
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {canView && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onOpen(
                                                                            document,
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                                                >
                                                                    <Eye
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                    View
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onDownload(
                                                                            document,
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                                                >
                                                                    <Download
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                    Download
                                                                </button>
                                                            </>
                                                        )}
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onEdit(
                                                                        document,
                                                                    )
                                                                }
                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
                                                            >
                                                                <Pencil
                                                                    size={15}
                                                                />
                                                                Edit
                                                            </button>
                                                        )}
                                                        {isAdmin &&
                                                            isCompanyDoc && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onManagePermissions(
                                                                            document,
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10"
                                                                >
                                                                    <Users
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                    Permissions
                                                                </button>
                                                            )}
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    isArchived
                                                                        ? onRestore(
                                                                              document,
                                                                          )
                                                                        : onArchive(
                                                                              document,
                                                                          )
                                                                }
                                                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                                                                    isArchived
                                                                        ? "text-green-600 dark:text-green-400 hover:bg-green-400/10"
                                                                        : "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10"
                                                                }`}
                                                            >
                                                                <Archive
                                                                    size={15}
                                                                />
                                                                {isArchived
                                                                    ? "Restore"
                                                                    : "Archive"}
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onDelete(
                                                                        document,
                                                                    )
                                                                }
                                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <Trash2
                                                                    size={15}
                                                                />
                                                                Delete
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
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

/* ============================================================
   DOCUMENT FORM — UPLOAD (SIMPLIFIED)
============================================================ */

function DocumentForm({
    form,
    onSubmit,
    onCancel,
    pendingFiles,
    onAddFiles,
    onRemoveFile,
    fileError,
}: {
    form: any;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    pendingFiles: File[];
    onAddFiles: (files: FileList | null) => void;
    onRemoveFile: (index: number) => void;
    fileError: string;
}) {
    const isCompany = form.data.document_type === "company";

    const autoRetention = RETENTION_BY_TYPE[form.data.type] || "5 years";
    const autoExpiry =
        autoRetention === "Permanent"
            ? null
            : computeExpiryDate(autoRetention, new Date().toISOString());

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div
                className={`rounded-2xl border p-4 ${
                    isCompany
                        ? "border-yellow-400/20 bg-yellow-400/[0.03]"
                        : "border-blue-400/20 bg-blue-400/[0.03]"
                }`}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isCompany ? "bg-yellow-400/10" : "bg-blue-400/10"
                        }`}
                    >
                        {isCompany ? (
                            <Lock size={20} className="text-yellow-600 dark:text-yellow-400" />
                        ) : (
                            <File size={20} className="text-blue-600 dark:text-blue-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isCompany ? "Company Document" : "Client Document"}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                            {isCompany
                                ? "Locked by default. Staff needs permission."
                                : "Visible to all staff by default."}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        Document Files
                    </label>
                    {pendingFiles.length > 0 && (
                        <span className="rounded-lg border border-purple-400/20 bg-purple-400/10 px-2 py-1 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                            {pendingFiles.length} file
                            {pendingFiles.length !== 1 ? "s" : ""} attached
                        </span>
                    )}
                </div>

                <label className="group flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/15 bg-white dark:bg-black/40 px-6 py-8 text-center transition hover:border-yellow-400/50 hover:bg-yellow-400/[0.03]">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400/10 transition group-hover:scale-105">
                        <FileUp size={28} className="text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {pendingFiles.length > 0
                            ? "Add more files"
                            : "Choose document files"}
                    </span>
                    <span className="mt-2 max-w-md text-xs leading-5 text-gray-600">
                        PDF, images, Word, Excel.
                    </span>
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            onAddFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />
                </label>

                {pendingFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {pendingFiles.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                    <FileText
                                        size={18}
                                        className="text-yellow-600 dark:text-yellow-400"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveFile(index)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-600 dark:text-red-400 transition hover:bg-red-500/10"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {(fileError || form.errors.files) && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {fileError || form.errors.files}
                    </p>
                )}
            </div>

            <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Document Title{" "}
                    <span className="text-[10px] font-normal text-gray-600">
                        (optional)
                    </span>
                </label>
                <input
                    type="text"
                    value={form.data.title}
                    onChange={(e) => form.setData("title", e.target.value)}
                    placeholder={
                        pendingFiles[0]?.name.replace(/\.[^.]+$/, "") ||
                        "Auto-based sa filename..."
                    }
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20"
                />
                {form.errors.title && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {form.errors.title}
                    </p>
                )}
            </div>

            <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Document Type
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DOCUMENT_TYPES.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => form.setData("type", t)}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                                form.data.type === t
                                    ? "border-yellow-400 bg-yellow-400 text-black"
                                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/30 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.03] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-400/10">
                        <Timer size={17} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                            Auto-computed Retention
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          Hidden from staff until permission is granted.
                        </p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">
                                    Retention
                                </p>
                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                                    <Package size={11} />
                                    {autoRetention}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">
                                    Expiry Date
                                </p>
                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                                    <Calendar size={11} />
                                    {autoExpiry ?? "Permanent"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Status
                </label>
                <div className="flex gap-2">
                    {DOCUMENT_STATUS_OPTIONS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => form.setData("status", s)}
                            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                                form.data.status === s
                                    ? s === "Active"
                                        ? "border-green-400 bg-green-400/15 text-green-700 dark:text-green-300"
                                        : "border-gray-400 bg-gray-400/15 text-gray-700 dark:text-gray-300"
                                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 hover:border-gray-300 dark:hover:border-white/30"
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {isCompany && (
                <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/[0.02] p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Lock Document
                            </p>
                            <p className="text-xs text-gray-500">
                               Hidden from staff until permission is granted.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                form.setData("is_locked", !form.data.is_locked)
                            }
                            className={`relative h-7 w-12 rounded-full transition ${
                                form.data.is_locked
                                    ? "bg-yellow-400"
                                    : "bg-gray-100 dark:bg-white/20"
                            }`}
                        >
                            <span
                                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                                    form.data.is_locked ? "left-6" : "left-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 dark:border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={form.processing || pendingFiles.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Upload size={17} />
                    {form.processing
                        ? `Uploading ${pendingFiles.length} file${pendingFiles.length !== 1 ? "s" : ""}...`
                        : `Upload ${pendingFiles.length > 0 ? `${pendingFiles.length} File${pendingFiles.length !== 1 ? "s" : ""}` : "Document"}`}
                </button>
            </div>
        </form>
    );
}

/* ============================================================
   EDIT DOCUMENT FORM
============================================================ */

function EditDocumentForm({
    form,
    onSubmit,
    onCancel,
    staff,
    document,
}: {
    form: any;
    onSubmit: (e: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    staff: Staff[];
    document: DocumentRecord;
}) {
    const isCompany = document.document_type === "company";

    const autoRetention =
        form.data.retention_period ||
        RETENTION_BY_TYPE[form.data.type] ||
        "5 years";
    const baseDate =
        document.uploaded_at || document.created_at || new Date().toISOString();
    const autoExpiry =
        autoRetention === "Permanent"
            ? null
            : computeExpiryDate(autoRetention, baseDate);

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.03] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/10">
                        <Pencil size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            Edit Metadata Only
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                            Hindi pwedeng baguhin ang files dito. Kung gusto
                            mong palitan yung attached files, delete mo yung
                            document at i-upload muli.
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Document Title
                </label>
                <input
                    type="text"
                    value={form.data.title}
                    onChange={(e) => form.setData("title", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20"
                    required
                />
                {form.errors.title && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {form.errors.title}
                    </p>
                )}
            </div>

            <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Document Type
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DOCUMENT_TYPES.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => form.setData("type", t)}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                                form.data.type === t
                                    ? "border-yellow-400 bg-yellow-400 text-black"
                                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/30 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.03] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-400/10">
                        <Timer size={17} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                            Auto-computed Retention
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                            Base sa type — walang manual input.
                        </p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">
                                    Retention
                                </p>
                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                                    <Package size={11} />
                                    {autoRetention}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">
                                    Expiry Date
                                </p>
                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                                    <Calendar size={11} />
                                    {autoExpiry ?? "Permanent"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isCompany && (
                <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/[0.02] p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Lock Document
                            </p>
                            <p className="text-xs text-gray-500">
                                Locked documents are hidden from staff until you
                                grant them access individually.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                form.setData("is_locked", !form.data.is_locked)
                            }
                            className={`relative h-7 w-12 rounded-full transition ${
                                form.data.is_locked
                                    ? "bg-yellow-400"
                                    : "bg-gray-100 dark:bg-white/20"
                            }`}
                        >
                            <span
                                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                                    form.data.is_locked ? "left-6" : "left-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            )}

            <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Assign Document
                </label>
                <div className="relative">
                    <Users
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                    />
                    <select
                        value={form.data.assigned_to}
                        onChange={(e) =>
                            form.setData("assigned_to", e.target.value)
                        }
                        className="h-12 w-full appearance-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-10 pr-10 text-sm text-gray-900 dark:text-white outline-none transition focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20"
                    >
                        <option value="">All Staff</option>
                        {staff.map((member) => (
                            <option key={member.id} value={String(member.id)}>
                                {member.name} — {member.email}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 p-4">
                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Description
                </label>
                <textarea
                    value={form.data.description}
                    onChange={(e) =>
                        form.setData("description", e.target.value)
                    }
                    rows={4}
                    placeholder="Add document details..."
                    className="w-full resize-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] px-4 py-3 text-sm leading-6 text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-700 focus:border-yellow-400/40 focus:ring-1 focus:ring-yellow-400/10"
                />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 dark:border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={form.processing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-400 px-6 py-3 text-sm font-black text-black transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Pencil size={17} />
                    {form.processing ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}

/* ============================================================
   DOCUMENT VIEW MODAL
============================================================ */

function DocumentViewModal({
    document,
    onClose,
    onDownload,
    onDownloadAll,
    formatDate,
    formatFileSize,
    isPdf,
    isImage,
}: {
    document: DocumentRecord;
    onClose: () => void;
    onDownload: () => void;
    onDownloadAll: () => void;
    onDownloadAttachment: (attachment: DocumentAttachment) => void;
    formatDate: (date?: string | null) => string;
    formatFileSize: (
        bytes?: number | null,
        formatted?: string | null,
    ) => string;
    isPdf: (doc?: DocumentRecord | null) => boolean;
    isImage: (doc?: DocumentRecord | null) => boolean;
}) {
    const attachments =
        document.attachments && document.attachments.length > 0
            ? document.attachments
            : document.file_url
              ? [
                    {
                        id: 0,
                        file_name: document.file_name,
                        file_url: document.file_url,
                        file_size: document.file_size,
                        formatted_file_size: document.formatted_file_size,
                        mime_type: document.mime_type,
                    },
                ]
              : [];

    const [activeIndex, setActiveIndex] = useState(0);
    const activeFile = attachments[activeIndex];

    return (
        <Modal
            title={document.title}
            subtitle={`${attachments.length} attachment${
                attachments.length !== 1 ? "s" : ""
            }`}
            large
            onClose={onClose}
        >
            <div className="space-y-4">
                {attachments.length > 0 && activeFile ? (
                    <>
                        {attachments.length > 1 && (
                            <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-2">
                                {attachments.map((att, index) => (
                                    <button
                                        key={`${att.file_name}-${index}`}
                                        type="button"
                                        onClick={() => setActiveIndex(index)}
                                        className={`inline-flex max-w-[240px] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                                            index === activeIndex
                                                ? "bg-yellow-400 text-black"
                                                : "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                        }`}
                                    >
                                        <Paperclip size={12} />
                                        <span className="truncate">
                                            {att.file_name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black">
                            {activeFile.file_exists === false ? (
                                <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-black/40">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
                                        <AlertTriangle size={30} />
                                    </div>
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        File Not Found on Server
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 max-w-sm">
                                        The record for <span className="font-semibold">{activeFile.file_name}</span> exists in the database, but the physical file is not in server storage.
                                    </p>
                                </div>
                            ) : activeFile.mime_type === "application/pdf" ||
                            activeFile.file_name
                                ?.toLowerCase()
                                .endsWith(".pdf") ? (
                                <iframe
                                    src={activeFile.file_url ?? ""}
                                    title={activeFile.file_name}
                                    className="h-[65vh] w-full"
                                />
                            ) : activeFile.mime_type?.startsWith("image/") ? (
                                <img
                                    src={activeFile.file_url ?? ""}
                                    alt={activeFile.file_name}
                                    className="max-h-[65vh] w-full object-contain"
                                />
                            ) : (
                                <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                                    <FileText
                                        size={50}
                                        className="mb-3 text-yellow-600 dark:text-yellow-400"
                                    />
                                    <p className="font-semibold">
                                        Preview not available
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600">
                                        Open or download this file to view it.
                                    </p>
                                    {activeFile.file_url && (
                                        <a
                                            href={activeFile.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-yellow-300"
                                        >
                                            <Eye size={15} />
                                            Open File
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 text-center">
                        <FileText size={50} className="mb-3 text-yellow-600 dark:text-yellow-400" />
                        <p className="font-semibold">Preview not available</p>
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-4">
                    <InfoBox label="Type" value={document.type || "Other"} />
                    <InfoBox
                        label="Size"
                        value={formatFileSize(
                            document.file_size,
                            document.formatted_file_size,
                        )}
                    />
                    <InfoBox
                        label="Assigned"
                        value={
                            document.assigned_to
                                ? document.assigned_name || "Staff"
                                : "All Staff"
                        }
                    />
                    <InfoBox
                        label="Uploaded"
                        value={formatDate(
                            document.uploaded_at || document.created_at,
                        )}
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {document.retention_period && (
                        <div className="rounded-xl border border-purple-400/20 bg-purple-400/[0.05] p-3">
                            <p className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                <Package size={10} />
                                Retention
                            </p>
                            <p className="mt-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                {document.retention_period}
                            </p>
                        </div>
                    )}
                    {document.expiry_date && (
                        <div className="rounded-xl border border-purple-400/20 bg-purple-400/[0.05] p-3">
                            <p className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                <Calendar size={10} />
                                Expiry Date
                            </p>
                            <p className="mt-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                {formatDate(document.expiry_date)}
                            </p>
                        </div>
                    )}
                </div>

                {document.description && (
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                            Description
                        </p>
                        <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">
                            {document.description}
                        </p>
                    </div>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-gray-200 dark:border-white/10 pt-4 sm:flex-row sm:justify-end">
                    {attachments.length > 1 && (
                        <button
                            type="button"
                            onClick={onDownloadAll}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-5 py-2.5 text-sm font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-400/20"
                        >
                            <Package size={16} />
                            Download All (ZIP)
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onDownload}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300"
                    >
                        <Download size={16} />
                        Download Primary
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ============================================================
   PERMISSION MODAL
============================================================ */

function PermissionModal({
    document,
    staff,
    onClose,
    onGrant,
    onRevoke,
}: {
    document: DocumentRecord;
    staff: Staff[];
    onClose: () => void;
    onGrant: (staffId: number) => void;
    onRevoke: (staffId: number) => void;
}) {
    const [selectedStaff, setSelectedStaff] = useState<number | null>(null);

    return (
        <Modal
            title={`Manage Permissions: ${document.title}`}
            subtitle="Grant or revoke access to this company document for specific staff members."
            onClose={onClose}
            large
        >
            <div className="space-y-6">
                <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/[0.03] p-4">
                    <div className="flex items-start gap-3">
                        <Lock size={20} className="text-yellow-600 dark:text-yellow-400" />
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">
                                Permission Control
                            </h4>
                            <p className="text-xs text-gray-500">
                                Staff members need explicit permission to view
                                this company document.
                                {document.is_locked
                                    ? " This document is currently locked."
                                    : " This document is currently unlocked — all staff can already view it."}
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <h5 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                        Grant Access
                    </h5>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-yellow-400/40"
                            onChange={(e) =>
                                setSelectedStaff(
                                    parseInt(e.target.value) || null,
                                )
                            }
                            value={selectedStaff || ""}
                        >
                            <option value="">Select staff member...</option>
                            {staff
                                .filter(
                                    (m) =>
                                        !document.granted_staff_ids?.includes(
                                            m.id,
                                        ),
                                )
                                .map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} — {m.email}
                                    </option>
                                ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedStaff) {
                                    onGrant(selectedStaff);
                                    setSelectedStaff(null);
                                }
                            }}
                            disabled={!selectedStaff}
                            className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Grant
                        </button>
                    </div>
                </div>

                <div>
                    <h5 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
                        Staff with Access
                    </h5>
                    {document.granted_staff_ids &&
                    document.granted_staff_ids.length > 0 ? (
                        <div className="space-y-2">
                            {document.granted_staff_ids.map((staffId) => {
                                const staffMember = staff.find(
                                    (s) => s.id === staffId,
                                );
                                return staffMember ? (
                                    <div
                                        key={staffId}
                                        className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400/10">
                                                <User
                                                    size={15}
                                                    className="text-yellow-600 dark:text-yellow-400"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {staffMember.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {staffMember.email}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRevoke(staffId)}
                                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 text-center">
                            <p className="text-sm text-gray-500">
                                No staff members have been granted access yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

/* ============================================================
   SHARED COMPONENTS
============================================================ */

function SearchInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div className="relative">
            <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 pl-10 pr-4 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:border-yellow-400/40"
            />
        </div>
    );
}

function FilterSelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (value: string) => void;
    options: string[];
}) {
    return (
        <div className="relative">
            <Filter
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-600"
            />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-9 pr-9 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-yellow-400/40"
            >
                {options.map((option) => (
                    <option
                        key={option}
                        value={option}
                        className="bg-white dark:bg-black text-gray-900 dark:text-white"
                    >
                        {option}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
            />
        </div>
    );
}

function BlackSelect({
    value,
    onChange,
    children,
}: {
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-3 pr-9 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-yellow-400/40"
            >
                {children}
            </select>
            <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
            />
        </div>
    );
}

function DarkSelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
}) {
    return (
        <div>
            {label && (
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-12 w-full appearance-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black px-4 pr-10 text-sm font-medium text-gray-900 dark:text-white outline-none transition focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20"
                >
                    {options.map((option) => (
                        <option
                            key={option}
                            value={option}
                            className="bg-white dark:bg-black text-gray-900 dark:text-white"
                        >
                            {option || "—"}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
            </div>
        </div>
    );
}

function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
}) {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-5 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400/10">
                <Icon size={26} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-gray-600">
                {description}
            </p>
            {actionLabel && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-bold text-black hover:bg-yellow-300"
                >
                    <Plus size={15} />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

function Modal({
    title,
    subtitle,
    children,
    onClose,
    large = false,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    onClose: () => void;
    large?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close modal"
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <div
                className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0c0c] shadow-2xl shadow-black/70 ${
                    large ? "max-w-6xl" : "max-w-2xl"
                }`}
            >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0c0c]/95 px-5 py-4 backdrop-blur-xl">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-black text-gray-900 dark:text-white">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-1 truncate text-xs text-gray-600">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function InfoBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">
                {label}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
                {value}
            </p>
        </div>
    );
}
