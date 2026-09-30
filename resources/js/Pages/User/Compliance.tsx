import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import UserLayout from "../../Layouts/UserLayout";


import {
    AlertCircle,
    Archive,
    AtSign,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    Clock3,
    Download,
    Eye,
    ExternalLink,
    FileArchive,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    Lock,
    Mail,
    MessageSquare,
    MoreVertical,
    Paperclip,
    Printer,
    RefreshCw,
    RotateCcw,
    Search,
    Send,
    ShieldCheck,
    Users,
    X,
    XCircle,
    AlertTriangle,
    Package,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type DocumentType =
    | "Permit"
    | "Certificate"
    | "Compliance"
    | "Safety"
    | "Company"
    | "Other";

type Status =
    | "Active"
    | "Pending Review"
    | "Verified"
    | "Expiring"
    | "Expired"
    | "Rejected"
    | "Archived";

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
};

type DocumentRecord = {
    id: number;
    title: string;
    file_name: string;
    file_path?: string | null;
    file_url?: string | null;
    download_url?: string | null;
    assigned_to?: number | null;
    assigned_name?: string | null;
    assigned_email?: string | null;
    uploaded_by?: number | null;
    uploaded_by_name?: string | null;
    type: DocumentType;
    description?: string | null;
    status: Status | string;
    file_size?: number | null;
    formatted_file_size?: string | null;
    mime_type?: string | null;
    created_at?: string | null;
    formatted_created_at?: string | null;
    archived?: boolean;
    document_type?: "client" | "company" | null;
    is_locked?: boolean;
    requires_permission?: boolean;
    granted_staff_ids?: number[];
    can_access?: boolean;
    access_requested?: boolean;
    access_request_status?: string | null;

    /* MULTI-FILE ATTACHMENTS */
    attachments?: DocumentAttachment[];
    attachment_count?: number;
};

type ComplianceRecord = {
    id: number;
    title: string;
    type: string;
    status: string;
    assigned_to: number | null;
    assigned_to_name: string | null;
    assigned_name: string | null;
    assigned_email: string | null;
    due_date: string | null;
    expiry_date: string | null;
    description: string | null;
    created_by: number | null;
    created_by_name: string | null;
    created_at: string | null;
    updated_at: string | null;
    priority?: string | null;
    file_path?: string | null;
    file_name?: string | null;
    file_url?: string | null;
    file_size?: number | null;
    formatted_file_size?: string | null;
    mime_type?: string | null;
};

type Props = {
    documents?: DocumentRecord[];
    compliance?: ComplianceRecord[];
    auth?: {
        user?: {
            id: number;
            role: string;
        };
    };
};

/* =========================================================
   SCROLL THRESHOLD
========================================================= */

const SCROLL_THRESHOLD = 5;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 40;

/* =========================================================
   AUTO-REFRESH INTERVAL
========================================================= */

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

/* =========================================================
   DATE HELPERS
========================================================= */

const formatDate = (
    value?: string | null,
    fallback?: string | null,
): string => {
    if (fallback) return fallback;
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
};

const formatDateTime = (
    value?: string | null,
    fallback?: string | null,
): string => {
    if (fallback) return fallback;
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Compliance({
    documents: serverDocuments = [],
    compliance: serverCompliance = [],
}: Props) {
    const { auth } = usePage<Props>().props;

    const currentUserId = auth?.user?.id;
    const userRole = auth?.user?.role;

    const isAdmin = userRole === "admin";

    const [documents, setDocuments] =
        useState<DocumentRecord[]>(serverDocuments);
    const [compliances, setCompliances] =
        useState<ComplianceRecord[]>(serverCompliance);

    /* STEP 1 → STEP 2 NAVIGATION */
    const [selectedCategory, setSelectedCategory] = useState<
        "client" | "company" | null
    >(null);

    const [search, setSearch] = useState("");
   const [typeFilter, setTypeFilter] = useState("All Types");

    const [viewDoc, setViewDoc] = useState<DocumentRecord | null>(null);
    const [menuDoc, setMenuDoc] = useState<DocumentRecord | null>(null);
    const [sendDoc, setSendDoc] = useState<DocumentRecord | null>(null);
    const [accessDeniedDoc, setAccessDeniedDoc] =
        useState<DocumentRecord | null>(null);
    const [requestingAccessId, setRequestingAccessId] = useState<number | null>(
        null,
    );

    const [forwardEmail, setForwardEmail] = useState("");
    const [forwardSubject, setForwardSubject] = useState("");
    const [forwardMessage, setForwardMessage] = useState("");
    const [forwardSending, setForwardSending] = useState(false);

    const [toast, setToast] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">(
        "success",
    );

    /* AUTO-REFRESH — para sa realtime updates */
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

    useEffect(() => {
        setDocuments(serverDocuments);
        setCompliances(serverCompliance);
        setLastRefresh(new Date());
    }, [serverDocuments, serverCompliance]);

    /* =====================================================
   AUTO-OPEN DOCUMENT FROM NOTIFICATION (?document_id=X)
===================================================== */

useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const documentIdFromUrl = params.get("document_id");

    if (!documentIdFromUrl) return;

    const target = documents.find(
        (d) => Number(d.id) === Number(documentIdFromUrl),
    );

    if (target) {
        // Auto-set category
        if (target.document_type === "client") {
            setSelectedCategory("client");
        } else if (target.document_type === "company") {
            setSelectedCategory("company");
        }

        // Auto-open view modal
        setViewDoc(target);

        // Clear URL param
        window.history.replaceState({}, "", "/compliance");
    }
}, [documents]);

    /* =====================================================
       TOAST
    ===================================================== */

    const notify = (
        message: string,
        type: "success" | "error" | "info" = "success",
    ) => {
        setToast(message);
        setToastType(type);
        window.setTimeout(() => setToast(""), 3500);
    };

    /* =====================================================
       CLOSE MENU
    ===================================================== */

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (menuDoc && !target.closest("[data-document-action-menu]")) {
                setMenuDoc(null);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [menuDoc]);

    useEffect(() => {
        const closeMenu = () => setMenuDoc(null);
        window.addEventListener("scroll", closeMenu, true);
        return () => window.removeEventListener("scroll", closeMenu, true);
    }, []);

/*
|--------------------------------------------------------------------------
| ✅ AUTO-REFRESH DISABLED — Manual refresh button na lang
|--------------------------------------------------------------------------
*/

// useEffect(() => {
//     const interval = window.setInterval(() => {
//         try {
//             if (viewDoc || menuDoc || sendDoc || accessDeniedDoc) {
//                 return;
//             }
//
//             setIsRefreshing(true);
//             router.reload({
//                 only: ["documents", "compliance"],
//                 onSuccess: () => {
//                     setIsRefreshing(false);
//                     setLastRefresh(new Date());
//                 },
//                 onError: () => {
//                     setIsRefreshing(false);
//                 },
//             });
//         } catch (err) {
//             console.error("Auto-refresh failed:", err);
//             setIsRefreshing(false);
//         }
//     }, AUTO_REFRESH_INTERVAL);
//
//     return () => window.clearInterval(interval);
// }, [viewDoc, menuDoc, sendDoc, accessDeniedDoc]);
    /* =====================================================
       HELPERS
    ===================================================== */

    const isArchived = (doc: DocumentRecord) =>
        doc.archived === true || doc.status === "Archived";

    const isClientDocument = (doc: DocumentRecord) =>
        doc.document_type === "client";

    const isCompanyDocument = (doc: DocumentRecord) =>
        doc.document_type === "company";

    /* =====================================================
       ACCESS CHECK
    ===================================================== */

    const hasDocumentAccess = (doc: DocumentRecord) => {
        if (!isCompanyDocument(doc)) return true;
        if (isAdmin) return true;
        if (typeof doc.can_access === "boolean") return doc.can_access;
        if (!doc.is_locked) return true;
        return doc.granted_staff_ids?.includes(currentUserId || 0) || false;
    };

    const hasRequestedAccess = (doc: DocumentRecord) => {
        if (doc.access_requested === true) return true;
        return doc.access_request_status?.toLowerCase() === "pending";
    };

    /* =====================================================
       REQUEST ACCESS
    ===================================================== */

    const requestDocumentAccess = (doc: DocumentRecord) => {
        setMenuDoc(null);
        if (isAdmin) {
            notify("Administrator already has access.", "info");
            return;
        }
        if (!isCompanyDocument(doc)) {
            notify("This document does not require permission.", "info");
            return;
        }
        if (!doc.is_locked) {
            notify("This document is already accessible.", "info");
            return;
        }
        if (hasDocumentAccess(doc)) {
            notify("You already have access.", "info");
            return;
        }
        if (hasRequestedAccess(doc)) {
            notify("Your access request is pending.", "info");
            return;
        }

        setRequestingAccessId(doc.id);
        router.post(
            `/documents/${doc.id}/request-access`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDocuments((current) =>
                        current.map((item) =>
                            item.id === doc.id
                                ? {
                                      ...item,
                                      access_requested: true,
                                      access_request_status: "pending",
                                  }
                                : item,
                        ),
                    );
                    setAccessDeniedDoc(null);
                    notify("Access request sent to admin.", "success");
                },
                onError: () => {
                    notify("Unable to send access request.", "error");
                },
                onFinish: () => setRequestingAccessId(null),
            },
        );
    };

    /* =====================================================
       SUMMARY COUNTS
    ===================================================== */

    const activeDocuments = documents.filter((doc) => !isArchived(doc));
    const clientDocs = activeDocuments.filter(isClientDocument).length;
    const companyDocs = activeDocuments.filter(isCompanyDocument).length;

    /* =====================================================
       DOCUMENTS BY CATEGORY
    ===================================================== */

    const categoryDocuments = useMemo(() => {
        if (!selectedCategory) return [];
        return activeDocuments.filter((doc) =>
            selectedCategory === "client"
                ? isClientDocument(doc)
                : isCompanyDocument(doc),
        );
    }, [activeDocuments, selectedCategory]);

    /* =====================================================
       FILTERED DOCUMENTS
    ===================================================== */

    const filteredDocuments = useMemo(() => {
        const query = search.toLowerCase().trim();
        return categoryDocuments.filter((doc) => {
            const searchable = [
                doc.title,
                doc.file_name,
                doc.type,
                doc.description,
                doc.assigned_name,
                doc.assigned_email,
                doc.uploaded_by_name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = !query || searchable.includes(query);
          const matchesType =
    typeFilter === "All Types" || doc.type === typeFilter;
return matchesSearch && matchesType;
        });
   }, [categoryDocuments, search, typeFilter]);

    /* =====================================================
       SCROLLBAR LOGIC
    ===================================================== */

    const shouldScroll = filteredDocuments.length > SCROLL_THRESHOLD;
    const tableMaxHeight = shouldScroll
        ? HEADER_HEIGHT + SCROLL_THRESHOLD * ROW_HEIGHT
        : undefined;

    /* =====================================================
       OPEN ACTION MENU
    ===================================================== */

    const openActionMenu = (doc: DocumentRecord) => {
        const button = menuButtonRefs.current[doc.id];
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const menuWidth = 250;
        const menuHeight = 430;
        const gap = 8;

        let left = rect.right - menuWidth;
        let top = rect.bottom + gap;

        if (left < 12) left = 12;
        if (left + menuWidth > window.innerWidth - 12)
            left = window.innerWidth - menuWidth - 12;
        if (top + menuHeight > window.innerHeight - 12)
            top = rect.top - menuHeight - gap;
        if (top < 12) top = 12;

        setMenuPosition({ top, left });
        setMenuDoc(menuDoc?.id === doc.id ? null : doc);
    };

    /* =====================================================
       VIEW / DOWNLOAD
    ===================================================== */

    const viewDocument = (doc: DocumentRecord) => {
        setMenuDoc(null);
        if (!hasDocumentAccess(doc)) {
            setAccessDeniedDoc(doc);
            return;
        }
        if (!doc.file_url && (!doc.attachments || doc.attachments.length === 0)) {
            notify("This document has no accessible file.", "error");
            return;
        }
        setViewDoc(doc);
    };

    /* ✅ SIMPLE DOWNLOAD — direct download lang, walang 404 */
    const downloadDocument = (doc: DocumentRecord) => {
        setMenuDoc(null);
        if (!hasDocumentAccess(doc)) {
            setAccessDeniedDoc(doc);
            return;
        }

        // Primary download URL
        if (doc.download_url) {
            window.location.href = doc.download_url;
            notify(`Downloading: ${doc.title}`, "success");
            return;
        }

        // Fallback: kung walang download_url, gamitin yung file_url
        if (doc.file_url) {
            window.location.href = doc.file_url;
            notify(`Downloading: ${doc.title}`, "success");
            return;
        }

        notify("Download link is unavailable.", "error");
    };

    const downloadAttachment = (attachment: DocumentAttachment) => {
        setMenuDoc(null);
        if (attachment.download_url) {
            window.open(attachment.download_url, "_blank");
        } else if (attachment.file_url) {
            window.open(attachment.file_url, "_blank");
        }
    };

    const openExternalFile = (doc: DocumentRecord) => {
        setMenuDoc(null);
        if (!hasDocumentAccess(doc)) {
            setAccessDeniedDoc(doc);
            return;
        }
        if (!doc.file_url) {
            notify("File URL is unavailable.", "error");
            return;
        }
        window.open(doc.file_url, "_blank", "noopener,noreferrer");
    };

    const printDocument = (doc: DocumentRecord) => {
        setMenuDoc(null);
        if (!hasDocumentAccess(doc)) {
            setAccessDeniedDoc(doc);
            return;
        }
        if (!doc.file_url) {
            notify("This document cannot be printed.", "error");
            return;
        }
        const popup = window.open(doc.file_url, "_blank");
        if (!popup) {
            notify("Please allow pop-ups to print.", "error");
            return;
        }
        setTimeout(() => {
            try {
                popup.print();
            } catch {}
        }, 1200);
    };

    const openSendModal = (doc: DocumentRecord) => {
        setMenuDoc(null);
        setViewDoc(null);
        setSendDoc(doc);
        setForwardEmail("");
        setForwardSubject(`Document: ${doc.title}`);
        setForwardMessage(
            `Please find attached the document "${doc.title}".\n\nFile: ${doc.file_name}\nType: ${doc.type}\nUploaded: ${formatDateTime(doc.created_at, doc.formatted_created_at)}\n\nRegards,\nALIBATON Team`,
        );
        setForwardSending(false);
    };

    const sendToClient = () => {
        if (!sendDoc) return;

        if (!forwardEmail.trim()) {
            notify("Please enter recipient email.", "error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forwardEmail.trim())) {
            notify("Please enter a valid email address.", "error");
            return;
        }

        if (!forwardSubject.trim()) {
            notify("Please enter a subject.", "error");
            return;
        }

        setForwardSending(true);

        router.post(
            "/documents/forward",
            {
                document_id: sendDoc.id,
                email: forwardEmail.trim(),
                subject: forwardSubject.trim(),
                message: forwardMessage.trim(),
                file_url: sendDoc.file_url,
                file_name: sendDoc.file_name,
                file_path: sendDoc.file_path,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setForwardSending(false);
                    setSendDoc(null);
                    notify(
                        `Document "${sendDoc.title}" sent successfully!`,
                        "success",
                    );
                },
                onError: (errors) => {
                    setForwardSending(false);
                    const firstError = Object.values(errors)[0];
                    notify(
                        typeof firstError === "string"
                            ? firstError
                            : "Failed to send document.",
                        "error",
                    );
                },
            },
        );
    };

   const resetFilters = () => {
    setSearch("");
    setTypeFilter("All Types");
};

  const resetCategory = () => {
    setSelectedCategory(null);
    setSearch("");
    setTypeFilter("All Types");
    setMenuDoc(null);
};

    const manualRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ["documents", "compliance"],
            onSuccess: () => {
                setIsRefreshing(false);
                setLastRefresh(new Date());
            },
            onError: () => {
                setIsRefreshing(false);
            },
        });
    };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <UserLayout>
            <Head title="Compliance & Documents | ALIBATON" />

            <style>{`
                .alibaton-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #facc15 transparent;
                }
                .alibaton-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .alibaton-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .alibaton-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(250, 204, 21, .65);
                    border-radius: 999px;
                }
                select option {
                    background: #020617;
                    color: white;
                }
                .category-card {
                    transition: transform .25s ease, border-color .25s ease, background .25s ease, box-shadow .25s ease;
                }
                .category-card:hover {
                    transform: translateY(-4px);
                }
                @keyframes sync-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .sync-pulse {
                    animation: sync-pulse 1.5s ease-in-out infinite;
                }
            `}</style>

            <div className="min-h-screen w-full overflow-x-hidden bg-transparent pb-10 pt-12 text-gray-900 dark:text-white sm:pt-6 lg:pt-2">
                <div className="w-full max-w-[1500px] px-3 sm:px-5 lg:px-6">
                    {/* HEADER */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-yellow-600 dark:text-yellow-400">
                                <ShieldCheck size={16} />
                                ALIBATON DOCUMENT CONTROL
                            </div>
                            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                                Documents & Regulatory Compliance
                            </h1>
                            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500 dark:text-slate-400">
                                {selectedCategory
                                    ? `Viewing ${selectedCategory === "client" ? "Client" : "Company"} Documents`
                                    : "Choose a document category to view its records."}
                            </p>
                        </div>


                    </div>

                    {/* STEP 1 — CATEGORY SELECTOR */}
                    {!selectedCategory && (
                        <div className="mt-10">
                            <div className="mb-6 text-center">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                                    Document Category
                                </h2>
                                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500 dark:text-slate-500">
                                    Choose which type of documents you want to
                                    view. Records will appear after you select a
                                    category.
                                </p>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
                                {/* CLIENT DOCUMENTS */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedCategory("client")
                                    }
                                    className="category-card group relative overflow-hidden rounded-3xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/[0.06] via-white to-white dark:via-slate-900 dark:to-slate-900 p-6 text-left shadow-2xl hover:border-blue-400/50 hover:shadow-blue-500/10 sm:p-8"
                                >
                                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl transition group-hover:bg-blue-500/20" />

                                    <div className="relative">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            <Users size={30} />
                                        </div>

                                        <h3 className="mt-5 text-4xl font-black text-gray-900 dark:text-white">
                                            Client Documents
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
                                            Contracts, invoices, permits, and
                                            files related to clients.
                                        </p>

                                        <div className="mt-6 flex items-center justify-between">
                                            <div>
                                                <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                                                    {clientDocs}
                                                </p>
                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                    {clientDocs === 1
                                                        ? "Document"
                                                        : "Documents"}
                                                </p>
                                            </div>
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-500 group-hover:text-white">
                                                <ChevronLeft
                                                    size={20}
                                                    className="rotate-180"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* COMPANY DOCUMENTS */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedCategory("company")
                                    }
                                    className="category-card group relative overflow-hidden rounded-3xl border-2 border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.06] via-white to-white dark:via-slate-900 dark:to-slate-900 p-6 text-left shadow-2xl hover:border-yellow-400/50 hover:shadow-yellow-400/10 sm:p-8"
                                >
                                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-400/10 blur-3xl transition group-hover:bg-yellow-400/20" />

                                    <div className="relative">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                            <Building2 size={30} />
                                        </div>

                                        <h3 className="mt-5 text-4xl font-black text-gray-900 dark:text-white">
                                            Companies Documents
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
                                            Internal ALIBATON records, policies,
                                            and company files.
                                        </p>

                                        <div className="mt-6 flex items-center justify-between">
                                            <div>
                                                <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400">
                                                    {companyDocs}
                                                </p>
                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                    {companyDocs === 1
                                                        ? "Document"
                                                        : "Documents"}
                                                </p>
                                            </div>
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400 transition group-hover:bg-yellow-400 group-hover:text-black">
                                                <ChevronLeft
                                                    size={20}
                                                    className="rotate-180"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — RECORDS */}
                    {selectedCategory && (
                        <>
                            {/* BACK BUTTON + CATEGORY BADGE */}
                            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    onClick={resetCategory}
                                    className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                                >
                                    <ChevronLeft size={16} />
                                    Back to Categories
                                </button>

                                <div className="flex items-center gap-2">
                                    {selectedCategory === "client" ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                                            <Users size={14} />
                                            Client Documents
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                            <Building2 size={14} />
                                            Alibaton Regulatory Compliance
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* FILTERS */}
                            <div className="mt-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl sm:p-4">
                                <div className="grid gap-3 lg:grid-cols-[1fr_200px_auto]">
                                    <div className="relative">
                                        <Search
                                            size={17}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500"
                                        />
                                        <input
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder={`Search ${
                                                selectedCategory === "client"
                                                    ? "client"
                                                    : "company"
                                            } document...`}
                                            className="w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 py-3 pl-10 pr-3 text-sm text-gray-900 dark:text-white outline-none placeholder:text-slate-600 focus:border-yellow-400/50"
                                        />
                                    </div>

                              <select
    value={typeFilter}
    onChange={(event) =>
        setTypeFilter(event.target.value)
    }
    className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-3 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-yellow-400/50"
>
    <option value="All Types">All Types</option>
    <option value="Permit">Permit</option>
    <option value="Contract">Contract</option>
    <option value="Certificate">Certificate</option>
    <option value="Compliance">Compliance</option>
    <option value="Safety">Safety</option>
    <option value="Company">Company</option>
    <option value="Other">Other</option>
</select>
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 transition hover:border-yellow-400/30 hover:text-yellow-600 dark:hover:text-yellow-400"
                                    >
                                        <RotateCcw size={15} />
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* RECORD HEADER */}
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                        {selectedCategory === "client"
                                            ? "Client Documents"
                                            : "Alibaton Regulatory Compliance"}
                                    </h2>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-500">
                                        {filteredDocuments.length} record
                                        {filteredDocuments.length !== 1
                                            ? "s"
                                            : ""}{" "}
                                        found
                                        {shouldScroll && (
                                            <span className="ml-2 text-yellow-600/60 dark:text-yellow-400/60">
                                                (scroll to view more)
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div
                                    className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${
                                        isRefreshing
                                            ? "sync-pulse text-yellow-600 dark:text-yellow-400"
                                            : "text-slate-600"
                                    }`}
                                >
                                    <RefreshCw
                                        size={12}
                                        className={
                                            isRefreshing ? "animate-spin" : ""
                                        }
                                    />
                                  {isRefreshing
    ? "Syncing with ALIBATON..."
    : "Manual refresh enabled"}
                                </div>
                            </div>

                            {/* TABLE */}
                            {filteredDocuments.length > 0 ? (
                                <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xl">
                                    <div
                                        className="alibaton-scrollbar"
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
                                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-950/95 backdrop-blur-sm">
                                                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/70">
                                                    <th className="w-[22%] px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        Document
                                                    </th>
                                                    <th className="w-[10%] px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        Type
                                                    </th>
                                                    <th className="w-[12%] px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        Status
                                                    </th>
                                                    <th className="w-[10%] px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        File Size
                                                    </th>
                                                    <th className="w-[12%] px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        Uploaded By
                                                    </th>
                                                    <th className="w-[12%] px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        Assigned To
                                                    </th>
                                                    <th className="w-[10%] px-3 py-3 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        Date
                                                    </th>
                                                    <th className="w-[12%] px-3 py-3 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-500">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredDocuments.map(
                                                    (doc) => {
                                                        const isCompanyDoc =
                                                            isCompanyDocument(
                                                                doc,
                                                            );
                                                        const isLocked =
                                                            doc.is_locked ===
                                                            true;
                                                        const canView =
                                                            hasDocumentAccess(
                                                                doc,
                                                            );

                                                        return (
                                                            <tr
                                                                key={doc.id}
                                                                className="border-b border-gray-200 dark:border-slate-800/70 transition hover:bg-yellow-400/[0.025]"
                                                            >
                                                                <td className="px-3 py-3 align-top">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            viewDocument(
                                                                                doc,
                                                                            )
                                                                        }
                                                                        className="flex items-start gap-2 text-left"
                                                                    >
                                                                        <div
                                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                                                                isCompanyDoc
                                                                                    ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                                                                                    : "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                                            }`}
                                                                        >
                                                                            <DocumentIcon
                                                                                type={
                                                                                    doc.type
                                                                                }
                                                                                mimeType={
                                                                                    doc.mime_type
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="truncate text-[11px] font-black text-gray-900 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400">
                                                                                {
                                                                                    doc.title
                                                                                }
                                                                            </p>
                                                                            <p className="mt-0.5 truncate text-[9px] text-gray-500 dark:text-slate-500">
                                                                                {doc.attachment_count &&
                                                                                doc.attachment_count >
                                                                                    1
                                                                                    ? `${doc.attachment_count} files`
                                                                                    : doc.file_name}
                                                                            </p>
                                                                        </div>
                                                                    </button>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <TypeBadge
                                                                        type={
                                                                            doc.type
                                                                        }
                                                                    />
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        <StatusBadge
                                                                            status={
                                                                                doc.status
                                                                            }
                                                                        />
                                                                        {isCompanyDoc &&
                                                                            isLocked && (
                                                                                <span
                                                                                    className={`inline-flex items-center gap-1 text-[9px] font-bold ${canView ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}
                                                                                >
                                                                                    {canView ? (
                                                                                        <UnlockIcon
                                                                                            size={
                                                                                                9
                                                                                            }
                                                                                        />
                                                                                    ) : (
                                                                                        <Lock
                                                                                            size={
                                                                                                9
                                                                                            }
                                                                                        />
                                                                                    )}
                                                                                    {canView
                                                                                        ? "Access"
                                                                                        : "Locked"}
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <p className="truncate text-[10px] font-bold text-gray-700 dark:text-slate-300">
                                                                        {doc.formatted_file_size ||
                                                                            "—"}
                                                                    </p>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <p className="truncate text-[10px] text-gray-700 dark:text-slate-300">
                                                                        {doc.uploaded_by_name ||
                                                                            "ALIBATON Admin"}
                                                                    </p>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <p className="truncate text-[10px] text-gray-700 dark:text-slate-300">
                                                                        {doc.assigned_name ||
                                                                            "All Staff"}
                                                                    </p>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <p className="truncate text-[10px] text-gray-500 dark:text-slate-400">
                                                                        {formatDate(
                                                                            doc.created_at,
                                                                            doc.formatted_created_at,
                                                                        )}
                                                                    </p>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                viewDocument(
                                                                                    doc,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                !canView
                                                                            }
                                                                            className={`inline-flex h-7 items-center justify-center gap-1 rounded-md border px-2 text-[9px] font-bold transition ${
                                                                                canView
                                                                                    ? "border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-yellow-400/40 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-yellow-600 dark:hover:text-yellow-400"
                                                                                    : "cursor-not-allowed border-gray-200 dark:border-slate-900 text-slate-700"
                                                                            }`}
                                                                        >
                                                                            <Eye
                                                                                size={
                                                                                    10
                                                                                }
                                                                            />
                                                                            View
                                                                        </button>

                                                                        <button
                                                                            ref={(
                                                                                el,
                                                                            ) => {
                                                                                menuButtonRefs.current[
                                                                                    doc.id
                                                                                ] =
                                                                                    el;
                                                                            }}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                openActionMenu(
                                                                                    doc,
                                                                                )
                                                                            }
                                                                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                                                                menuDoc?.id ===
                                                                                doc.id
                                                                                    ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                                                                                    : "border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                                                                            }`}
                                                                        >
                                                                            <MoreVertical
                                                                                size={
                                                                                    11
                                                                                }
                                                                            />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            ) : (
                                <div className="mt-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-20 text-center shadow-xl">
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-slate-700">
                                        {selectedCategory === "company" ? (
                                            <Building2 size={36} />
                                        ) : (
                                            <Users size={36} />
                                        )}
                                    </div>
                                    <p className="mt-5 text-lg font-black text-gray-500 dark:text-slate-400">
                                        No documents found
                                    </p>
                                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                                        No{" "}
                                        {selectedCategory === "client"
                                            ? "client"
                                            : "company"}{" "}
                                        documents match your current filters.
                                    </p>
                                    {(search || typeFilter !== "All Types") && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
                                        >
                                            <RotateCcw size={15} />
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ACTION MENU */}
            {menuDoc && (
                <div
                    data-document-action-menu
                    className="fixed z-[99999] w-[250px] rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 p-2 shadow-[0_25px_80px_rgba(0,0,0,.85)]"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                    <div className="border-b border-gray-200 dark:border-slate-800 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${isCompanyDocument(menuDoc) ? "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400" : "bg-blue-400/10 text-blue-600 dark:text-blue-400"}`}
                            >
                                {isCompanyDocument(menuDoc) ? (
                                    <Building2 size={15} />
                                ) : (
                                    <Users size={15} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-black text-gray-900 dark:text-white">
                                    {menuDoc.title}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-gray-500 dark:text-slate-500">
                                    {menuDoc.attachment_count &&
                                    menuDoc.attachment_count > 1
                                        ? `${menuDoc.attachment_count} files`
                                        : menuDoc.file_name}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-1">
                        {hasDocumentAccess(menuDoc) && (
                            <>
                                <MenuItem
                                    icon={<Eye size={16} />}
                                    label="View Document"
                                    onClick={() => viewDocument(menuDoc)}
                                />
                                <MenuItem
                                    icon={<ExternalLink size={16} />}
                                    label="Open in New Tab"
                                    onClick={() => openExternalFile(menuDoc)}
                                />
                                {/* ✅ SIMPLE DOWNLOAD — "Download" lang */}
                                <MenuItem
                                    icon={<Download size={16} />}
                                    label="Download"
                                    onClick={() => downloadDocument(menuDoc)}
                                />
                                <MenuItem
                                    icon={<Printer size={16} />}
                                    label="Print"
                                    onClick={() => printDocument(menuDoc)}
                                />
                                <div className="my-1 border-t border-gray-200 dark:border-slate-800" />
                                <MenuItem
                                    icon={<Send size={16} />}
                                    label="Forward"
                                    onClick={() => openSendModal(menuDoc)}
                                />
                            </>
                        )}

                        {isCompanyDocument(menuDoc) &&
                            menuDoc.is_locked &&
                            !hasDocumentAccess(menuDoc) &&
                            !isAdmin && (
                                <>
                                    <button
                                        type="button"
                                        disabled={
                                            hasRequestedAccess(menuDoc) ||
                                            requestingAccessId === menuDoc.id
                                        }
                                        onClick={() =>
                                            requestDocumentAccess(menuDoc)
                                        }
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-black transition ${
                                            hasRequestedAccess(menuDoc)
                                                ? "cursor-not-allowed text-slate-600"
                                                : "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10"
                                        }`}
                                    >
                                        {requestingAccessId === menuDoc.id ? (
                                            <RefreshCw
                                                size={16}
                                                className="animate-spin"
                                            />
                                        ) : hasRequestedAccess(menuDoc) ? (
                                            <Clock3 size={16} />
                                        ) : (
                                            <Send size={16} />
                                        )}
                                        {requestingAccessId === menuDoc.id
                                            ? "Sending Request..."
                                            : hasRequestedAccess(menuDoc)
                                              ? "Access Request Pending"
                                              : "Request Access"}
                                    </button>
                                    <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/[0.035] px-3 py-3">
                                        <div className="flex items-start gap-2">
                                            <Lock
                                                size={14}
                                                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                                            />
                                            <p className="text-[10px] font-bold leading-4 text-red-600 dark:text-red-400">
                                                This company document is locked.
                                                Contents require administrator
                                                permission.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                        {isCompanyDocument(menuDoc) &&
                            menuDoc.is_locked &&
                            hasDocumentAccess(menuDoc) && (
                                <div className="mt-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.035] px-3 py-3">
                                    <div className="flex items-center gap-2">
                                        <UnlockIcon
                                            size={14}
                                            className="text-yellow-600 dark:text-yellow-400"
                                        />
                                        <p className="text-[10px] font-bold leading-4 text-yellow-600 dark:text-yellow-400">
                                            You have permission to access this
                                            company document.
                                        </p>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            )}

            {/* ACCESS DENIED MODAL */}
            {accessDeniedDoc && (
                <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-2xl border border-yellow-400/20 bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                            <Lock size={32} />
                        </div>
                        <h2 className="mt-4 text-xl font-black text-gray-900 dark:text-white">
                            Access Required
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
                            This company document is locked. You need
                            administrator permission to open or download the
                            actual file.
                        </p>
                        <div className="mt-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                    <Building2 size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                        {accessDeniedDoc.title}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
                                        {accessDeniedDoc.file_name}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setAccessDeniedDoc(null)}
                                className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-6 py-3 text-sm font-bold text-gray-900 dark:text-white transition hover:border-yellow-400/40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={
                                    hasRequestedAccess(accessDeniedDoc) ||
                                    requestingAccessId === accessDeniedDoc.id
                                }
                                onClick={() =>
                                    requestDocumentAccess(accessDeniedDoc)
                                }
                                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition ${
                                    hasRequestedAccess(accessDeniedDoc)
                                        ? "cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-500"
                                        : "bg-yellow-400 text-black hover:bg-yellow-300"
                                }`}
                            >
                                {requestingAccessId === accessDeniedDoc.id ? (
                                    <>
                                        <RefreshCw
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Sending...
                                    </>
                                ) : hasRequestedAccess(accessDeniedDoc) ? (
                                    <>
                                        <Clock3 size={16} />
                                        Request Pending
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Request Access
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODAL */}
            {viewDoc && (
                <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5">
                    <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_30px_100px_rgba(0,0,0,.8)]">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-4 py-4 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isCompanyDocument(viewDoc) ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400" : "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}
                                >
                                    <DocumentIcon
                                        type={viewDoc.type}
                                        mimeType={viewDoc.mime_type}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-base font-black text-gray-900 dark:text-white sm:text-lg">
                                        {viewDoc.title}
                                    </h2>
                                    <p className="truncate text-xs text-gray-500 dark:text-slate-500">
                                        {viewDoc.attachment_count &&
                                        viewDoc.attachment_count > 1
                                            ? `${viewDoc.attachment_count} files attached`
                                            : viewDoc.file_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewDoc(null)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="alibaton-scrollbar flex-1 overflow-y-auto">
                            <div className="grid lg:grid-cols-[320px_1fr]">
                                <div className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 lg:border-b-0 lg:border-r">
                                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-yellow-600 dark:text-yellow-400">
                                        Document Information
                                    </p>
                                    <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                                        Details
                                    </h3>
                                    <div className="mt-5 space-y-3">
                                        <InfoRow
                                            label="Document"
                                            value={viewDoc.title}
                                        />
                                        <InfoRow
                                            label="File Name"
                                            value={viewDoc.file_name}
                                        />
                                       <InfoRow
    label="Category"
    value={
        isCompanyDocument(viewDoc) ? (
            <span className="text-yellow-600 dark:text-yellow-400">Company</span>
        ) : (
            <span className="text-blue-600 dark:text-blue-400">Client</span>
        )
    }
/>
                                        <InfoRow
                                            label="Type"
                                            value={
                                                <TypeBadge
                                                    type={viewDoc.type}
                                                />
                                            }
                                        />
                                        <InfoRow
                                            label="Status"
                                            value={
                                                <StatusBadge
                                                    status={viewDoc.status}
                                                />
                                            }
                                        />
                                        <InfoRow
                                            label="File Size"
                                            value={
                                                viewDoc.formatted_file_size ||
                                                "Unknown"
                                            }
                                        />
                                        {viewDoc.attachment_count &&
                                            viewDoc.attachment_count > 0 && (
                                                <InfoRow
                                                    label="Attachments"
                                                    value={
                                                        <span className="text-purple-600 dark:text-purple-300">
                                                            <Paperclip
                                                                size={12}
                                                                className="mr-1 inline"
                                                            />
                                                            {
                                                                viewDoc.attachment_count
                                                            }{" "}
                                                            file
                                                            {viewDoc.attachment_count !==
                                                            1
                                                                ? "s"
                                                                : ""}
                                                        </span>
                                                    }
                                                />
                                            )}
                                        <InfoRow
                                            label="Uploaded By"
                                            value={
                                                viewDoc.uploaded_by_name ||
                                                "ALIBATON Admin"
                                            }
                                        />
                                        <InfoRow
                                            label="Assigned To"
                                            value={
                                                viewDoc.assigned_name ||
                                                "All Staff"
                                            }
                                        />
                                        <InfoRow
                                            label="Uploaded"
                                            value={formatDateTime(
                                                viewDoc.created_at,
                                                viewDoc.formatted_created_at,
                                            )}
                                        />
                                        {viewDoc.description && (
                                            <InfoRow
                                                label="Description"
                                                value={viewDoc.description}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-4 sm:p-6">
                                    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Eye
                                                    size={16}
                                                    className="text-yellow-600 dark:text-yellow-400"
                                                />
                                                <span className="text-xs font-black text-gray-900 dark:text-white">
                                                    Document Preview
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-600">
                                                {viewDoc.mime_type || "File"}
                                            </span>
                                        </div>
                                        <DocumentPreview document={viewDoc} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                            <button
                                type="button"
                                onClick={() => setViewDoc(null)}
                                className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-gray-900 dark:text-white hover:border-yellow-400/40"
                            >
                                Close
                            </button>
                            {/* ✅ SIMPLE DOWNLOAD — "Download" lang */}
                            <button
                                type="button"
                                onClick={() => downloadDocument(viewDoc)}
                                disabled={!hasDocumentAccess(viewDoc)}
                                className={`flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold ${
                                    hasDocumentAccess(viewDoc)
                                        ? "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400"
                                        : "cursor-not-allowed border-gray-200 dark:border-slate-900 bg-gray-50 dark:bg-slate-950 text-slate-700"
                                }`}
                            >
                                <Download size={16} />
                                Download
                            </button>
                            <button
                                type="button"
                                onClick={() => openExternalFile(viewDoc)}
                                disabled={!hasDocumentAccess(viewDoc)}
                                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black ${
                                    hasDocumentAccess(viewDoc)
                                        ? "bg-yellow-400 text-black hover:bg-yellow-300"
                                        : "cursor-not-allowed bg-gray-100 dark:bg-slate-800 text-slate-600"
                                }`}
                            >
                                <ExternalLink size={16} />
                                Open File
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FORWARD MODAL */}
            {sendDoc && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-lg rounded-2xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black">
                                <Mail size={21} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                    Forward Document
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-slate-500">
                                    Send this document via email
                                </p>
                            </div>
                        </div>

                        <div className="mb-5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                    <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-gray-900 dark:text-white">
                                        {sendDoc.title}
                                    </p>
                                    <p className="truncate text-xs text-gray-500 dark:text-slate-500">
                                        {sendDoc.file_name}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                                    Recipient Email{" "}
                                    <span className="text-red-600 dark:text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <AtSign
                                        size={17}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                                    />
                                    <input
                                        type="email"
                                        value={forwardEmail}
                                        onChange={(e) =>
                                            setForwardEmail(e.target.value)
                                        }
                                        placeholder="client@email.com"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-10 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-yellow-400/50 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                                    Subject
                                </label>
                                <div className="relative">
                                    <MessageSquare
                                        size={17}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
                                    />
                                    <input
                                        type="text"
                                        value={forwardSubject}
                                        onChange={(e) =>
                                            setForwardSubject(e.target.value)
                                        }
                                        placeholder="Document: [Document Name]"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-10 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-yellow-400/50 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                                    Message
                                </label>
                                <textarea
                                    value={forwardMessage}
                                    onChange={(e) =>
                                        setForwardMessage(e.target.value)
                                    }
                                    rows={4}
                                    placeholder="Please find attached the document..."
                                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-yellow-400/50 dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-gray-600"
                                />
                            </div>

                            <div className="rounded-xl border border-yellow-400/10 bg-yellow-400/[0.03] px-3 py-2.5">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Paperclip
                                        size={14}
                                        className="text-yellow-600 dark:text-yellow-400"
                                    />
                                    <span>
                                        Attachment:{" "}
                                        <span className="text-gray-900 dark:text-white font-semibold">
                                            {sendDoc.file_name}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setSendDoc(null)}
                                className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-5 py-3 text-sm font-bold text-gray-900 dark:text-white hover:border-yellow-400/40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={sendToClient}
                                disabled={forwardSending}
                                className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {forwardSending ? (
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
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast && (
                <div
                    className={`fixed bottom-5 right-5 z-[20000] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white shadow-2xl ${
                        toastType === "error"
                            ? "border-red-500/20 bg-red-900/80"
                            : toastType === "info"
                              ? "border-blue-500/20 bg-blue-900/80"
                              : "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {toastType === "success" && (
                            <CheckCircle2
                                size={17}
                                className="text-yellow-600 dark:text-yellow-400"
                            />
                        )}
                        {toastType === "error" && (
                            <XCircle size={17} className="text-red-600 dark:text-red-400" />
                        )}
                        {toastType === "info" && (
                            <AlertCircle size={17} className="text-blue-600 dark:text-blue-400" />
                        )}
                        {toast}
                    </div>
                </div>
            )}
        </UserLayout>
    );
}
/* =========================================================
   DOCUMENT PREVIEW — with multi-attachment support
========================================================= */

function DocumentPreview({ document }: { document: DocumentRecord }) {
    const attachments =
        document.attachments && document.attachments.length > 0
            ? document.attachments
            : document.file_url
              ? [
                    {
                        id: 0,
                        file_name: document.file_name,
                        file_url: document.file_url,
                        mime_type: document.mime_type,
                        file_size: document.file_size,
                        formatted_file_size: document.formatted_file_size,
                    },
                ]
              : [];

    const [activeIndex, setActiveIndex] = useState(0);
    const activeFile = attachments[activeIndex];

    if (attachments.length === 0 || !activeFile) {
        return (
            <div className="flex min-h-[480px] flex-col items-center justify-center p-8 text-center">
                <Lock size={48} className="text-red-600 dark:text-red-400" />
                <h3 className="mt-4 text-lg font-black text-gray-900 dark:text-white">
                    File Locked
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-slate-500">
                    The actual file is protected until the administrator grants
                    access.
                </p>
            </div>
        );
    }

    const url = activeFile.file_url ?? "";
    const mime = activeFile.mime_type?.toLowerCase() || "";

    return (
        <div className="space-y-3 p-3">
            {/* ATTACHMENT SWITCHER */}
            {attachments.length > 1 && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
                    {attachments.map((att, index) => (
                        <button
                            key={`${att.file_name}-${index}`}
                            type="button"
                            onClick={() => setActiveIndex(index)}
                            className={`inline-flex max-w-[240px] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                                index === activeIndex
                                    ? "bg-yellow-400 text-black"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white"
                            }`}
                        >
                            <Paperclip size={12} />
                            <span className="truncate">{att.file_name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* FILE PREVIEW */}
            {!url ? (
                <div className="flex min-h-[480px] flex-col items-center justify-center p-8 text-center">
                    <Lock size={48} className="text-red-600 dark:text-red-400" />
                    <h3 className="mt-4 text-lg font-black text-gray-900 dark:text-white">
                        File Locked
                    </h3>
                </div>
            ) : mime.includes("pdf") ? (
                <div className="h-[65vh] min-h-[480px] bg-white dark:bg-slate-900">
                    <iframe
                        src={url}
                        title={activeFile.file_name}
                        className="h-full w-full border-0 bg-white"
                    />
                </div>
            ) : mime.startsWith("image/") ? (
                <div className="flex min-h-[480px] items-center justify-center overflow-auto bg-gray-50 dark:bg-slate-950 p-6">
                    <img
                        src={url}
                        alt={activeFile.file_name}
                        className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl"
                    />
                </div>
            ) : (
                <div className="flex min-h-[480px] flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-8 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-yellow-600 dark:text-yellow-400">
                        <DocumentIcon
                            type={document.type}
                            mimeType={activeFile.mime_type}
                        />
                    </div>
                    <h3 className="mt-5 text-lg font-black text-gray-900 dark:text-white">
                        Preview unavailable
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-slate-500">
                        This file type cannot be previewed directly in the
                        browser.
                    </p>
                    <div className="mt-5">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black hover:bg-yellow-300"
                        >
                            <ExternalLink size={16} />
                            Open File
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================================================
   DOCUMENT ICON
========================================================= */

function DocumentIcon({
    type,
    mimeType,
}: {
    type: DocumentType;
    mimeType?: string | null;
}) {
    const mime = mimeType?.toLowerCase() || "";

    if (
        mime.includes("spreadsheet") ||
        mime.includes("excel") ||
        mime.includes("csv")
    ) {
        return <FileSpreadsheet size={16} />;
    }
    if (mime.includes("zip") || mime.includes("archive")) {
        return <FileArchive size={16} />;
    }
    if (mime.startsWith("image/")) {
        return <ImageIcon size={16} />;
    }
    if (type === "Permit" || type === "Compliance" || type === "Safety") {
        return <ShieldCheck size={16} />;
    }
    if (type === "Certificate") {
        return <FileCheck2 size={16} />;
    }
    return <FileText size={16} />;
}

/* =========================================================
   TYPE BADGE
========================================================= */

function TypeBadge({ type }: { type: DocumentType }) {
const config: Record<DocumentType, string> = {
    Permit: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Certificate: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Compliance: "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    Safety: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    Company: "border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-400",
    Other: "border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300",
};

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold ${config[type] || config.Other}`}
        >
            {type}
        </span>
    );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }: { status: string }) {
    const normalized = status as Status;

    const config: Record<Status, { className: string; icon: React.ReactNode }> =
        {
            Active: {
                className:
                    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                icon: <CheckCircle2 size={10} />,
            },
            Verified: {
                className:
                    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                icon: <CheckCircle2 size={10} />,
            },
            "Pending Review": {
                className: "border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300",
                icon: <Clock3 size={10} />,
            },
            Expiring: {
                className:
                    "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                icon: <AlertTriangle size={10} />,
            },
            Expired: {
                className: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
                icon: <XCircle size={10} />,
            },
            Rejected: {
                className: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
                icon: <XCircle size={10} />,
            },
            Archived: {
                className: "border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400",
                icon: <Archive size={10} />,
            },
        };

    const selected = config[normalized] || config.Active;

    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold ${selected.className}`}
        >
            {selected.icon}
            {status}
        </span>
    );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-500">
                {label}
            </p>
            <div className="mt-1.5 break-words text-sm font-semibold text-gray-900 dark:text-white">
                {value}
            </div>
        </div>
    );
}

/* =========================================================
   MENU ITEM
========================================================= */

function MenuItem({
    label,
    icon,
    onClick,
}: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-gray-800 dark:text-slate-200 transition hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
        >
            <span className="text-gray-500 dark:text-slate-500">{icon}</span>
            {label}
        </button>
    );
}

/* =========================================================
   UNLOCK ICON
========================================================= */

function UnlockIcon({
    size = 15,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
    );
}
