import React, { useState, useRef, useEffect, useCallback } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    Archive,
    ArrowLeft,
    Mail,
    User,
    RotateCcw,
    Trash2,
    FileText,
    Clock,
    Search,
    CheckCircle,
    AlertCircle,
    Loader2,
    MoreVertical,
    X,
} from "lucide-react";

type ArchivedAdmin = {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    deleted_at: string;
    deleted_ago: string;
    delete_reason: string;
    last_login_at: string | null;
    email_verified_at: string | null;
};

type PageProps = {
    archivedAdmins: ArchivedAdmin[];
    total: number;
    flash?: {
        success?: string;
        error?: string;
    };
};

export default function ArchivedAdmins() {
    const props = usePage<any>().props as PageProps;
    const { archivedAdmins = [], total = 0, flash } = props;

    const [search, setSearch] = useState("");
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Restore modal
    const [restoringAdmin, setRestoringAdmin] = useState<ArchivedAdmin | null>(null);

    // Permanent delete modal
    const [permanentDeletingAdmin, setPermanentDeletingAdmin] =
        useState<ArchivedAdmin | null>(null);
    const [confirmInput, setConfirmInput] = useState("");

    const menuButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

    const getRoute = (name: string, params?: any, fallback?: string) => {
        if (typeof window !== "undefined" && (window as any).route) {
            return (window as any).route(name, params);
        }
        return fallback ?? "";
    };

    // CLOSE MENU ON OUTSIDE CLICK + ESCAPE
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            const menu = document.getElementById("archived-action-menu");

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
    const toggleMenu = useCallback(
        (adminId: number) => {
            if (openMenu === adminId) {
                setOpenMenu(null);
                return;
            }

            const button = menuButtonRefs.current[adminId];
            if (!button) return;

            const rect = button.getBoundingClientRect();
            const menuWidth = 240;
            const menuHeight = 120;
            const margin = 8;

            let left = rect.right - menuWidth;

            if (left < margin) left = margin;
            if (left + menuWidth > window.innerWidth - margin) {
                left = window.innerWidth - menuWidth - margin;
            }

            let top = rect.bottom + margin;

            if (top + menuHeight > window.innerHeight - margin) {
                top = rect.top - menuHeight - margin;
                if (top < margin) top = margin;
            }

            setMenuPosition({ top, left });
            setOpenMenu(adminId);
        },
        [openMenu]
    );

    const filteredAdmins = archivedAdmins.filter((admin) => {
        const keyword = search.toLowerCase().trim();
        if (!keyword) return true;
        return (
            admin.name.toLowerCase().includes(keyword) ||
            admin.email.toLowerCase().includes(keyword)
        );
    });

    // CONFIRM RESTORE
    const handleRestore = () => {
        if (!restoringAdmin) return;
        setProcessingId(restoringAdmin.id);

        router.post(
            getRoute(
                "superadmin.admins.restore",
                { id: restoringAdmin.id },
                `/superadmin/admins/${restoringAdmin.id}/restore`
            ),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setRestoringAdmin(null),
                onFinish: () => setProcessingId(null),
            }
        );
    };

    // CONFIRM PERMANENT DELETE
    const handlePermanentDelete = () => {
        if (!permanentDeletingAdmin) return;
        if (confirmInput !== "DELETE") return;

        setProcessingId(permanentDeletingAdmin.id);

        router.delete(
            getRoute(
                "superadmin.admins.force-delete",
                { id: permanentDeletingAdmin.id },
                `/superadmin/admins/${permanentDeletingAdmin.id}/force-delete`
            ),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPermanentDeletingAdmin(null);
                    setConfirmInput("");
                },
                onFinish: () => setProcessingId(null),
            }
        );
    };

    // Get current admin for menu
    const selectedAdmin =
        openMenu !== null
            ? archivedAdmins.find((a) => a.id === openMenu)
            : null;

    return (
        <SuperAdminLayout>
            <Head title="Archived Admins" />

            {/* Flash */}
            {flash?.success && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={16} />
                    {flash.success}
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href={getRoute(
                            "superadmin.admins.index",
                            {},
                            "/superadmin/admins"
                        )}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        <ArrowLeft size={18} />
                    </Link>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
                        <Archive size={24} className="text-rose-400" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Deleted Admins
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {total} deleted account{total !== 1 ? "s" : ""}.
                            Restore or permanently delete.
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
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
                        placeholder="Search deleted admins..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0A0F1D]/80">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-5 py-4 text-left">Admin</th>
                                <th className="px-5 py-4 text-left">Email</th>
                                <th className="px-5 py-4 text-left">Deleted</th>
                                <th className="px-5 py-4 text-left">Reason</th>
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
                                        <Archive
                                            size={40}
                                            className="mx-auto mb-3 text-slate-700"
                                        />
                                        <p className="text-sm font-medium text-slate-500">
                                            No deleted admins.
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            Deleted admins will appear here.
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
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10">
                                                    <User
                                                        size={18}
                                                        className="text-rose-400"
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

                                        {/* DELETED */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <Clock
                                                    size={14}
                                                    className="text-slate-600"
                                                />
                                                <div>
                                                    <p>{admin.deleted_at}</p>
                                                    <p className="text-xs text-rose-400/70">
                                                        {admin.deleted_ago}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* REASON */}
                                        <td className="max-w-xs px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-start gap-2">
                                                <FileText
                                                    size={14}
                                                    className="mt-0.5 shrink-0 text-slate-600"
                                                />
                                                <span className="line-clamp-2">
                                                    {admin.delete_reason}
                                                </span>
                                            </div>
                                        </td>

                                        {/* THREE DOTS */}
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                ref={(el) => {
                                                    menuButtonRefs.current[
                                                        admin.id
                                                    ] = el;
                                                }}
                                                type="button"
                                                aria-label={`Actions for ${admin.name}`}
                                                aria-expanded={
                                                    openMenu === admin.id
                                                }
                                                onClick={() =>
                                                    toggleMenu(admin.id)
                                                }
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

            {/* FIXED ACTION MENU — Smart positioning */}
            {openMenu !== null && selectedAdmin && (
                <div
                    id="archived-action-menu"
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
                            Archived Admin
                        </p>
                    </div>

                    <ActionButton
                        icon={<RotateCcw size={16} />}
                        label="Restore Account"
                        onClick={() => {
                            setOpenMenu(null);
                            setRestoringAdmin(selectedAdmin);
                        }}
                    />

                    <ActionButton
                        icon={<Trash2 size={16} />}
                        label="Permanently Delete"
                        danger
                        onClick={() => {
                            setOpenMenu(null);
                            setPermanentDeletingAdmin(selectedAdmin);
                            setConfirmInput("");
                        }}
                    />
                </div>
            )}

            {/* CONFIRM RESTORE MODAL */}
            {restoringAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                                    <RotateCcw
                                        size={18}
                                        className="text-emerald-400"
                                    />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">
                                        Restore Admin
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        The account will be reactivated.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    You are about to restore:
                                </p>
                                <p className="mt-2 font-bold text-slate-900 dark:text-white">
                                    {restoringAdmin.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {restoringAdmin.email}
                                </p>
                            </div>

                            <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                <AlertCircle
                                    size={16}
                                    className="mt-0.5 shrink-0 text-amber-400"
                                />
                                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                    The admin will be able to log in again
                                    with their existing password.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setRestoringAdmin(null)}
                                disabled={processingId !== null}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRestore}
                                disabled={processingId !== null}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white transition hover:bg-emerald-400 disabled:opacity-50"
                            >
                                {processingId !== null ? (
                                    <>
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw size={16} />
                                        Restore Admin
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM PERMANENT DELETE MODAL */}
            {permanentDeletingAdmin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/40 bg-white dark:bg-[#0A0F1D] shadow-2xl shadow-rose-500/10">
                        <div className="flex items-center justify-between border-b border-rose-500/30 bg-rose-500/5 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/20">
                                    <Trash2
                                        size={18}
                                        className="text-rose-400"
                                    />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">
                                        Permanent Delete
                                    </h2>
                                    <p className="text-xs text-rose-400">
                                        This action CANNOT be undone!
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPermanentDeletingAdmin(null);
                                    setConfirmInput("");
                                }}
                                className="rounded-lg p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    You are about to{" "}
                                    <strong className="text-rose-400">
                                        permanently delete
                                    </strong>
                                    :
                                </p>
                                <p className="mt-2 font-bold text-slate-900 dark:text-white">
                                    {permanentDeletingAdmin.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {permanentDeletingAdmin.email}
                                </p>
                            </div>

                            <div className="mb-4 flex gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                                <AlertCircle
                                    size={16}
                                    className="mt-0.5 shrink-0 text-rose-400"
                                />
                                <div className="text-xs leading-relaxed text-rose-700 dark:text-rose-300">
                                    <p className="font-bold">Warning:</p>
                                    <p className="mt-1 text-slate-600 dark:text-slate-400">
                                        This will{" "}
                                        <strong className="text-rose-400">
                                            permanently remove
                                        </strong>{" "}
                                        the account from the database. This
                                        action{" "}
                                        <strong className="text-rose-400">
                                            cannot be undone
                                        </strong>
                                        . All data will be lost.
                                    </p>
                                </div>
                            </div>

                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Type{" "}
                                <strong className="text-rose-400">
                                    DELETE
                                </strong>{" "}
                                to confirm:
                            </label>
                            <input
                                type="text"
                                value={confirmInput}
                                onChange={(e) =>
                                    setConfirmInput(e.target.value)
                                }
                                placeholder="Type DELETE here..."
                                className="w-full rounded-xl border border-rose-500/30 bg-slate-50 dark:bg-[#050810] py-3 px-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-rose-500/70 focus:ring-4 focus:ring-rose-500/10"
                                autoComplete="off"
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-rose-500/30 bg-rose-500/5 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setPermanentDeletingAdmin(null);
                                    setConfirmInput("");
                                }}
                                disabled={processingId !== null}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handlePermanentDelete}
                                disabled={
                                    processingId !== null ||
                                    confirmInput !== "DELETE"
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white transition hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingId !== null ? (
                                    <>
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Permanently Delete
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