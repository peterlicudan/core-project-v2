import React, { useEffect, useRef, useState, useCallback } from "react";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";

import {
    UserCog,
    Plus,
    Search,
    Mail,
    User,
    X,
    CheckCircle,
    AlertCircle,
    Clock,
    RotateCcw,
    Ban,
    MoreVertical,
    Loader2,
    Send,
    Eye,
    Trash2,
    Archive,
} from "lucide-react";

type Admin = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: "active" | "pending" | "expired" | "unverified";
    status_label: string;
    email_verified_at: string | null;
    invitation_expires_at: string | null;
    invitation_expires_in: string | null;
    invited_by: number | null;
    created_at: string;
    last_login_at: string | null;
};

type Stats = {
    total: number;
    active: number;
    pending: number;
    archived: number;
};

type PageProps = {
    admins: Admin[];
    stats: Stats;
    flash?: {
        success?: string;
        error?: string;
    };
};

export default function AdminManagement() {
    const props = usePage<any>().props as PageProps;

    const {
        admins = [],
        stats = {
            total: 0,
            active: 0,
            pending: 0,
            archived: 0,
        },
        flash,
    } = props;

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [search, setSearch] = useState("");
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // View Details modal
    const [viewingAdmin, setViewingAdmin] = useState<Admin | null>(null);

    // Delete modal
    const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null);
    const [deleteReason, setDeleteReason] = useState("");

    const menuButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

    const getRoute = (name: string, params?: any, fallback?: string) => {
        if (typeof window !== "undefined" && (window as any).route) {
            return (window as any).route(name, params);
        }
        return fallback ?? "";
    };

    const {
        data,
        setData,
        post,
        processing,
        errors: formErrors,
        reset,
    } = useForm({
        name: "",
        email: "",
    });

    // CLOSE MENU ON OUTSIDE CLICK + ESCAPE
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            const menu = document.getElementById("admin-action-menu");

            if (menu && !menu.contains(target)) {
                const clickedButton = Object.values(menuButtonRefs.current).some(
                    (btn) => btn?.contains(target)
                );
                if (!clickedButton) {
                    setOpenMenu(null);
                }
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenMenu(null);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    // CLOSE MENU ON SCROLL
    useEffect(() => {
        if (openMenu === null) return;

        const handleScroll = () => setOpenMenu(null);
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [openMenu]);

    // TOGGLE MENU — SMART POSITIONING
    const toggleMenu = useCallback((adminId: number) => {
        if (openMenu === adminId) {
            setOpenMenu(null);
            return;
        }

        const button = menuButtonRefs.current[adminId];
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const menuWidth = 240; // w-60 = 240px
        const menuHeight = 180; // estimate height
        const margin = 8;

        // Calculate left position (align right edge of menu to button's right)
        let left = rect.right - menuWidth;

        // Clamp to viewport
        if (left < margin) left = margin;
        if (left + menuWidth > window.innerWidth - margin) {
            left = window.innerWidth - menuWidth - margin;
        }

        // Calculate top position — try below, then above if not enough space
        let top = rect.bottom + margin;

        if (top + menuHeight > window.innerHeight - margin) {
            // Position above button
            top = rect.top - menuHeight - margin;

            // If still off-screen (top < margin), position at top margin
            if (top < margin) {
                top = margin;
            }
        }

        setMenuPosition({ top, left });
        setOpenMenu(adminId);
    }, [openMenu]);

    // INVITE ADMIN
    const submitInvite = (e: React.FormEvent) => {
        e.preventDefault();

        post(
            getRoute(
                "superadmin.admins.invite",
                {},
                "/superadmin/admins/invite"
            ),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowInviteModal(false);
                    reset();
                },
            }
        );
    };

    // RESEND INVITATION
    const resendInvite = (admin: Admin) => {
        setOpenMenu(null);
        setProcessingId(admin.id);

        router.post(
            getRoute(
                "superadmin.admins.resend",
                { user: admin.id },
                `/superadmin/admins/${admin.id}/resend`
            ),
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
            }
        );
    };

    // CANCEL INVITATION
    const cancelInvite = (admin: Admin) => {
        setOpenMenu(null);

        const confirmed = window.confirm(
            `Cancel invitation for ${admin.name}?`
        );

        if (!confirmed) return;

        setProcessingId(admin.id);

        router.post(
            getRoute(
                "superadmin.admins.cancel-invite",
                { user: admin.id },
                `/superadmin/admins/${admin.id}/cancel-invite`
            ),
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
            }
        );
    };

    // VIEW DETAILS
    const viewDetails = (admin: Admin) => {
        setOpenMenu(null);
        setViewingAdmin(admin);
    };

    // OPEN DELETE MODAL
    const openDeleteModal = (admin: Admin) => {
        setOpenMenu(null);
        setDeletingAdmin(admin);
        setDeleteReason("");
    };

    // CONFIRM DELETE
    const confirmDelete = () => {
        if (!deletingAdmin) return;

        setProcessingId(deletingAdmin.id);

        router.delete(
            getRoute(
                "superadmin.admins.destroy",
                { user: deletingAdmin.id },
                `/superadmin/admins/${deletingAdmin.id}`
            ),
            {
                data: { reason: deleteReason },
                preserveScroll: true,
                onSuccess: () => {
                    setDeletingAdmin(null);
                    setDeleteReason("");
                },
                onFinish: () => setProcessingId(null),
            }
        );
    };

    // SEARCH
    const filteredAdmins = admins.filter((admin) => {
        const keyword = search.toLowerCase().trim();
        if (!keyword) return true;
        return (
            admin.name.toLowerCase().includes(keyword) ||
            admin.email.toLowerCase().includes(keyword)
        );
    });

    // Get current admin for menu
    const selectedAdmin = openMenu !== null
        ? admins.find((a) => a.id === openMenu)
        : null;

    return (
        <SuperAdminLayout>
            <Head title="Admin Management" />

            {/* FLASH SUCCESS */}
            {flash?.success && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={16} />
                    {flash.success}
                </div>
            )}

            {/* FLASH ERROR */}
            {flash?.error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    <AlertCircle size={16} />
                    {flash.error}
                </div>
            )}

            {/* HEADER */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                        <UserCog size={24} className="text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Admin Management
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Invite and manage administrator accounts.
                        </p>
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
                    {/* VIEW ARCHIVED */}
                    <a
                        href={getRoute(
                            "superadmin.admins.archived",
                            {},
                            "/superadmin/admins/archived"
                        )}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-500/20"
                    >
                        <Archive size={18} />
                        Deleted Accounts
                        {stats.archived > 0 && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-white">
                                {stats.archived}
                            </span>
                        )}
                    </a>

                    {/* INVITE ADMIN */}
                    <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-3 font-semibold text-[#0A0F1D] shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-amber-500"
                    >
                        <Plus size={18} />
                        Invite Admin
                    </button>
                </div>
            </div>

            {/* STATISTICS */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Admins"
                    value={stats.total}
                    icon={<UserCog size={18} />}
                    color="amber"
                />
                <StatCard
                    label="Active"
                    value={stats.active}
                    icon={<CheckCircle size={18} />}
                    color="emerald"
                />
                <StatCard
                    label="Pending Invites"
                    value={stats.pending}
                    icon={<Clock size={18} />}
                    color="blue"
                />
                <StatCard
                    label="Archived"
                    value={stats.archived}
                    icon={<Archive size={18} />}
                    color="rose"
                />
            </div>

            {/* SEARCH */}
            <div className="mb-4">
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search admins by name or email..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500/50"
                    />
                </div>
            </div>

            {/* ADMIN TABLE */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0A0F1D]/80">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-5 py-4 text-left">Admin</th>
                                <th className="px-5 py-4 text-left">Email</th>
                                <th className="px-5 py-4 text-left">Status</th>
                                <th className="px-5 py-4 text-left">Created</th>
                                <th className="px-5 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdmins.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-16 text-center"
                                    >
                                        <UserCog
                                            size={40}
                                            className="mx-auto mb-3 text-slate-700"
                                        />
                                        <p className="text-sm font-medium text-slate-500">
                                            No admins found.
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            Click "Invite Admin" to add your first admin.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredAdmins.map((admin) => (
                                    <tr
                                        key={admin.id}
                                        className="border-b border-slate-200 dark:border-slate-800/60 transition hover:bg-slate-50 dark:hover:bg-slate-800/20"
                                    >
                                        {/* ADMIN */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
                                                    <User
                                                        size={18}
                                                        className="text-amber-400"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-slate-900 dark:text-white">
                                                        {admin.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        ID #{admin.id}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* EMAIL */}
                                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Mail
                                                    size={14}
                                                    className="shrink-0 text-slate-600"
                                                />
                                                <span className="truncate">
                                                    {admin.email}
                                                </span>
                                            </div>
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-5 py-4">
                                            <StatusBadge
                                                status={admin.status}
                                                label={admin.status_label}
                                            />
                                            {admin.invitation_expires_in && (
                                                <p className="mt-1 text-[10px] text-slate-500">
                                                    Expires{" "}
                                                    {admin.invitation_expires_in}
                                                </p>
                                            )}
                                        </td>

                                        {/* CREATED */}
                                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {admin.created_at}
                                        </td>

                                        {/* THREE DOTS */}
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                ref={(el) => {
                                                    menuButtonRefs.current[admin.id] = el;
                                                }}
                                                type="button"
                                                aria-label={`Actions for ${admin.name}`}
                                                aria-expanded={openMenu === admin.id}
                                                onClick={() => toggleMenu(admin.id)}
                                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                                                    openMenu === admin.id
                                                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                                                        : "border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                                }`}
                                            >
                                                <MoreVertical size={21} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FIXED ACTION MENU — Smart positioning, no scroll needed */}
            {openMenu !== null && selectedAdmin && (
                <div
                    id="admin-action-menu"
                    className="fixed z-[9999] w-60 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-left shadow-2xl shadow-black/60"
                    style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                    }}
                >
                    {/* MENU HEADER */}
                    <div className="border-b border-slate-300 dark:border-slate-700 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {selectedAdmin.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Manage Admin Account
                        </p>
                    </div>

                    {/* ACTIVE ADMIN */}
                    {selectedAdmin.status === "active" && (
                        <>
                            <ActionButton
                                icon={<Eye size={16} />}
                                label="View Details"
                                onClick={() => viewDetails(selectedAdmin)}
                            />

                            <ActionButton
                                icon={<Trash2 size={16} />}
                                label="Delete Admin"
                                danger
                                onClick={() => openDeleteModal(selectedAdmin)}
                            />
                        </>
                    )}

                    {/* PENDING / EXPIRED */}
                    {(selectedAdmin.status === "pending" ||
                        selectedAdmin.status === "expired") && (
                        <>
                            <ActionButton
                                icon={<RotateCcw size={16} />}
                                label="Resend Invitation"
                                disabled={processingId === selectedAdmin.id}
                                onClick={() => resendInvite(selectedAdmin)}
                            />

                            <ActionButton
                                icon={<Ban size={16} />}
                                label="Cancel Invitation"
                                danger
                                onClick={() => cancelInvite(selectedAdmin)}
                            />

                            <ActionButton
                                icon={<Trash2 size={16} />}
                                label="Delete Admin"
                                danger
                                onClick={() => openDeleteModal(selectedAdmin)}
                            />
                        </>
                    )}

                    {/* UNVERIFIED */}
                    {selectedAdmin.status === "unverified" && (
                        <>
                            <ActionButton
                                icon={<Mail size={16} />}
                                label="Resend Invitation"
                                onClick={() => resendInvite(selectedAdmin)}
                            />

                            <ActionButton
                                icon={<Trash2 size={16} />}
                                label="Delete Admin"
                                danger
                                onClick={() => openDeleteModal(selectedAdmin)}
                            />
                        </>
                    )}
                </div>
            )}

            {/* INVITE ADMIN MODAL */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                                    <Send size={18} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">
                                        Invite New Admin
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        They'll receive an email to set their password.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInviteModal(false);
                                    reset();
                                }}
                                className="rounded-lg p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={submitInvite} className="space-y-4 p-5">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    />
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData("name", e.target.value)
                                        }
                                        placeholder="Juan Dela Cruz"
                                        required
                                        className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] pl-10 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500/70 focus:ring-4 focus:ring-amber-500/10"
                                    />
                                </div>
                                {formErrors.name && (
                                    <p className="mt-1.5 text-xs text-rose-400">
                                        {formErrors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    />
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData("email", e.target.value)
                                        }
                                        placeholder="admin@example.com"
                                        required
                                        className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] pl-10 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500/70 focus:ring-4 focus:ring-amber-500/10"
                                    />
                                </div>
                                {formErrors.email && (
                                    <p className="mt-1.5 text-xs text-rose-400">
                                        {formErrors.email}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                <AlertCircle
                                    size={16}
                                    className="mt-0.5 shrink-0 text-amber-400"
                                />
                                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                    The admin will receive an email with a{" "}
                                    <strong className="text-amber-300">
                                        secure link
                                    </strong>{" "}
                                    to set their password. Link expires in{" "}
                                    <strong className="text-amber-300">
                                        24 hours
                                    </strong>
                                    .
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInviteModal(false);
                                        reset();
                                    }}
                                    disabled={processing}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-[#0A0F1D] shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-60"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Send Invitation
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW DETAILS MODAL */}
            {viewingAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                                    <Eye size={18} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">
                                        Admin Details
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {viewingAdmin.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingAdmin(null)}
                                className="rounded-lg p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 p-5">
                            <DetailRow label="Name" value={viewingAdmin.name} />
                            <DetailRow label="Email" value={viewingAdmin.email} />
                            <DetailRow label="Role" value={viewingAdmin.role} />
                            <DetailRow
                                label="Status"
                                value={
                                    <StatusBadge
                                        status={viewingAdmin.status}
                                        label={viewingAdmin.status_label}
                                    />
                                }
                            />
                            <DetailRow
                                label="Verified"
                                value={viewingAdmin.email_verified_at ?? "Not verified"}
                            />
                            <DetailRow label="Created" value={viewingAdmin.created_at} />
                            <DetailRow
                                label="Last Login"
                                value={viewingAdmin.last_login_at ?? "Never logged in"}
                            />
                            {viewingAdmin.invitation_expires_at && (
                                <DetailRow
                                    label="Invitation Expires"
                                    value={viewingAdmin.invitation_expires_at}
                                />
                            )}
                        </div>

                        <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 px-5 py-4">
                            <button
                                type="button"
                                onClick={() => setViewingAdmin(null)}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deletingAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
                                    <Trash2 size={18} className="text-rose-400" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">
                                        Delete Admin
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Moves to archive — can be restored later.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeletingAdmin(null)}
                                className="rounded-lg p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    You are about to archive:
                                </p>
                                <p className="mt-2 font-bold text-slate-900 dark:text-white">
                                    {deletingAdmin.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {deletingAdmin.email}
                                </p>
                            </div>

                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Reason (optional)
                            </label>
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Enter reason for deletion..."
                                rows={3}
                                className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] py-3 px-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-rose-500/70"
                                maxLength={500}
                            />

                            <div className="mt-4 flex gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                                <AlertCircle
                                    size={16}
                                    className="mt-0.5 shrink-0 text-rose-400"
                                />
                                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                    The account will be archived. Can be restored later from the "Archived" page.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setDeletingAdmin(null)}
                                disabled={processingId === deletingAdmin.id}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={processingId === deletingAdmin.id}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white transition hover:bg-rose-400 disabled:opacity-50"
                            >
                                {processingId === deletingAdmin.id ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Archive size={16} />
                                        Delete Admin
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}

/* ACTION BUTTON */

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
            className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                danger
                    ? "text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

/* STAT CARD */

function StatCard({
    label,
    value,
    icon,
    color = "amber",
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color?: "amber" | "emerald" | "blue" | "rose";
}) {
    const colors = {
        amber: {
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            text: "text-amber-400",
        },
        emerald: {
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            text: "text-emerald-400",
        },
        blue: {
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            text: "text-blue-400",
        },
        rose: {
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
            text: "text-rose-400",
        },
    };

    const c = colors[color];

    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0A0F1D]/80 p-4">
            <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${c.bg} ${c.border} ${c.text}`}
            >
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
}

/* STATUS BADGE */

function StatusBadge({
    status,
    label,
}: {
    status: string;
    label: string;
}) {
    const colors: Record<string, string> = {
        active: "border-emerald-500/30 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
        pending: "border-amber-500/30 bg-amber-500/20 text-amber-300",
        expired: "border-rose-500/30 bg-rose-500/20 text-rose-700 dark:text-rose-300",
        unverified: "border-slate-500/30 bg-slate-500/20 text-slate-700 dark:text-slate-300",
    };

    const icons: Record<string, React.ReactNode> = {
        active: <CheckCircle size={12} />,
        pending: <Clock size={12} />,
        expired: <AlertCircle size={12} />,
        unverified: <AlertCircle size={12} />,
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                colors[status] || colors.unverified
            }`}
        >
            {icons[status] || <AlertCircle size={12} />}
            {label}
        </span>
    );
}

/* DETAIL ROW */

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800/50 pb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {label}
            </span>
            <span className="text-right text-sm text-slate-900 dark:text-white">{value}</span>
        </div>
    );
}
