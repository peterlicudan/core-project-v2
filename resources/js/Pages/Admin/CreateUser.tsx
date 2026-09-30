import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Head, router, useForm, usePage } from "@inertiajs/react";

import {
    Search,
    Plus,
    Pencil,
    Trash2,
    X,
    UserPlus,
    Mail,
    Lock,
    User,
    MoreVertical,
    ShieldCheck,
    Users,
    CheckCircle,
    AlertCircle,
    RotateCcw,
    FileText,
} from "lucide-react";

import AdminSidebar from "../../Components/Admin/AdminSidebar";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type UserRecord = {
    id: number;
    name: string;
    email: string;
    role: string;
    email_verified_at?: string | null;
    created_at: string;
};

type DeletedUserRecord = {
    id: number;
    name: string;
    email: string;
    deleted_at: string;
    delete_reason?: string | null;
};

type PageProps = {
    users: UserRecord[];
    deletedUsers?: DeletedUserRecord[];

    flash?: {
        success?: string;
    };

    errors: Record<string, string>;
};

/*
|--------------------------------------------------------------------------
| PASSWORD REQUIREMENT
|--------------------------------------------------------------------------
*/

function PasswordRequirement({
    valid,
    text,
}: {
    valid: boolean;
    text: string;
}) {
    return (
        <div
            className={`flex items-center gap-2 text-xs ${
                valid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
        >
            {valid ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
            )}

            <span>{text}</span>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function Index() {
    const {
        users = [],
        deletedUsers = [],
        flash,
        errors,
    } = usePage<PageProps>().props;

    /*
    |--------------------------------------------------------------------------
    | MODAL
    |--------------------------------------------------------------------------
    */

    const [showModal, setShowModal] = useState(false);

    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

    /*
    |--------------------------------------------------------------------------
    | DELETE MODAL
    |--------------------------------------------------------------------------
    */

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);

    const [deleteReason, setDeleteReason] = useState("");

    const [deleting, setDeleting] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | DELETED STAFF MODAL
    |--------------------------------------------------------------------------
    */

    const [showDeletedModal, setShowDeletedModal] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | RESTORING
    |--------------------------------------------------------------------------
    */

    const [restoringId, setRestoringId] = useState<number | null>(null);

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    const [search, setSearch] = useState("");

    /*
    |--------------------------------------------------------------------------
    | PASSWORD VISIBILITY
    |--------------------------------------------------------------------------
    */

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | SIDEBAR
    |--------------------------------------------------------------------------
    */

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    const menuButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});

    /*
    |--------------------------------------------------------------------------
    | DISPLAY FLASH
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
        }
    }, [flash?.success]);

    /*
    |--------------------------------------------------------------------------
    | AUTO HIDE SUCCESS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timer = window.setTimeout(() => {
            setSuccessMessage(null);
        }, 5000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [successMessage]);

    /*
    |--------------------------------------------------------------------------
    | CLOSE MENU WHEN CLICKING OUTSIDE
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            const menu = document.getElementById("staff-action-menu");

            if (menu && !menu.contains(target)) {
                const button = Object.values(menuButtonRefs.current).find(
                    (element) => element?.contains(target),
                );

                if (!button) {
                    setOpenMenu(null);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | CLOSE ACTION MENU ON SCROLL
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (openMenu === null) {
            return;
        }

        const handleScroll = () => {
            setOpenMenu(null);
        };

        window.addEventListener("scroll", handleScroll, true);

        return () => {
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [openMenu]);

    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    const { data, setData, post, put, processing, reset } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    });

    /*
    |--------------------------------------------------------------------------
    | LIVE NAME VALIDATION
    |--------------------------------------------------------------------------
    */

    const nameValid = data.name.trim().length > 0;

    /*
    |--------------------------------------------------------------------------
    | GMAIL ONLY VALIDATION
    |--------------------------------------------------------------------------
    */

    const emailValid = /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(
        data.email.trim(),
    );

    /*
    |--------------------------------------------------------------------------
    | PASSWORD VALIDATION
    |--------------------------------------------------------------------------
    */

    const passwordHasMinLength = data.password.length >= 12;

    const passwordHasUppercase = /[A-Z]/.test(data.password);

    const passwordHasLowercase = /[a-z]/.test(data.password);

    const passwordHasNumber = /[0-9]/.test(data.password);

    const passwordHasSpecial = /[^A-Za-z0-9]/.test(data.password);

    const passwordValid =
        passwordHasMinLength &&
        passwordHasUppercase &&
        passwordHasLowercase &&
        passwordHasNumber &&
        passwordHasSpecial;

    /*
    |--------------------------------------------------------------------------
    | PASSWORD MATCH
    |--------------------------------------------------------------------------
    */

    const passwordMatch =
        data.password.length > 0 &&
        data.password === data.password_confirmation;

    /*
    |--------------------------------------------------------------------------
    | COMPLETE FORM VALIDATION
    |--------------------------------------------------------------------------
    */

    const liveFormValid =
        nameValid &&
        emailValid &&
        (editingUser
            ? data.password.length === 0 || (passwordValid && passwordMatch)
            : passwordValid && passwordMatch);

    /*
    |--------------------------------------------------------------------------
    | SHOW VALIDATION
    |--------------------------------------------------------------------------
    */

    const showNameValidation = data.name.length > 0;

    const showEmailValidation = data.email.length > 0;

    const showPasswordValidation = data.password.length > 0;

    const showConfirmValidation = data.password_confirmation.length > 0;

    /*
    |--------------------------------------------------------------------------
    | FILTER USERS
    |--------------------------------------------------------------------------
    */

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
            return users;
        }

        return users.filter((user) =>
            `${user.name} ${user.email}`.toLowerCase().includes(keyword),
        );
    }, [users, search]);

    /*
    |--------------------------------------------------------------------------
    | OPEN ACTION MENU
    |--------------------------------------------------------------------------
    */

    const toggleActionMenu = (userId: number) => {
        if (openMenu === userId) {
            setOpenMenu(null);
            return;
        }

        const button = menuButtonRefs.current[userId];

        if (!button) {
            return;
        }

        const rect = button.getBoundingClientRect();

        const menuWidth = 160;
        const menuHeight = 100;
        const margin = 8;

        let left = rect.right - menuWidth;

        let top = rect.bottom + margin;

        if (left < margin) {
            left = margin;
        }

        if (left + menuWidth > window.innerWidth - margin) {
            left = window.innerWidth - menuWidth - margin;
        }

        if (top + menuHeight > window.innerHeight - margin) {
            top = rect.top - menuHeight - margin;
        }

        if (top < margin) {
            top = margin;
        }

        setMenuPosition({
            top,
            left,
        });

        setOpenMenu(userId);
    };

    /*
    |--------------------------------------------------------------------------
    | CREATE MODAL
    |--------------------------------------------------------------------------
    */

    const openCreateModal = () => {
        setEditingUser(null);

        reset();

        setShowPassword(false);
        setShowConfirmPassword(false);

        setShowModal(true);
        setOpenMenu(null);
    };

    /*
    |--------------------------------------------------------------------------
    | EDIT MODAL
    |--------------------------------------------------------------------------
    */

    const openEditModal = (user: UserRecord) => {
        setEditingUser(user);

        setData({
            name: user.name,
            email: user.email,
            password: "",
            password_confirmation: "",
        });

        setShowPassword(false);
        setShowConfirmPassword(false);

        setOpenMenu(null);
        setShowModal(true);
    };

    /*
    |--------------------------------------------------------------------------
    | CLOSE MODAL
    |--------------------------------------------------------------------------
    */

    const closeModal = () => {
        if (processing) {
            return;
        }

        setShowModal(false);
        setEditingUser(null);

        reset();

        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    /*
    |--------------------------------------------------------------------------
    | SUBMIT
    |--------------------------------------------------------------------------
    */

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (!liveFormValid) {
            return;
        }

        if (editingUser) {
            put(`/admin/create-user/${editingUser.id}`, {
                preserveScroll: true,

                onSuccess: () => {
                    closeModal();

                    setSuccessMessage("Staff account updated successfully!");
                },
            });

            return;
        }

        post("/admin/create-user", {
            preserveScroll: true,

            onSuccess: () => {
                closeModal();

                setSuccessMessage(
                    "Staff account created successfully! A verification PIN has been sent to the Gmail address.",
                );
            },
        });
    };

    /*
    |--------------------------------------------------------------------------
    | OPEN DELETE MODAL
    |--------------------------------------------------------------------------
    */

    const openDeleteModal = (user: UserRecord) => {
        setOpenMenu(null);

        setDeletingUser(user);

        setDeleteReason("");

        setShowDeleteModal(true);
    };

    /*
    |--------------------------------------------------------------------------
    | CLOSE DELETE MODAL
    |--------------------------------------------------------------------------
    */

    const closeDeleteModal = () => {
        if (deleting) {
            return;
        }

        setShowDeleteModal(false);
        setDeletingUser(null);
        setDeleteReason("");
    };

    /*
    |--------------------------------------------------------------------------
    | CONFIRM DELETE
    |--------------------------------------------------------------------------
    */

    const confirmDelete = () => {
        if (!deletingUser) {
            return;
        }

        if (deleteReason.trim().length === 0) {
            return;
        }

        setDeleting(true);

        router.delete(`/admin/create-user/${deletingUser.id}`, {
            data: {
                reason: deleteReason.trim(),
            },

            preserveScroll: true,

            onSuccess: () => {
                setSuccessMessage("Staff account deleted successfully!");
                closeDeleteModal();
            },

            onFinish: () => {
                setDeleting(false);
            },
        });
    };

    /*
    |--------------------------------------------------------------------------
    | RESTORE STAFF
    |--------------------------------------------------------------------------
    */

    const restoreStaff = (user: DeletedUserRecord) => {
        const confirmed = window.confirm(
            `Restore the account of ${user.name}?`,
        );

        if (!confirmed) {
            return;
        }

        setRestoringId(user.id);

        router.post(
            `/admin/create-user/${user.id}/restore`,
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setSuccessMessage("Staff account restored successfully!");
                },

                onFinish: () => {
                    setRestoringId(null);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | FORMAT DATE
    |--------------------------------------------------------------------------
    */

    const formatDate = (date: string) => {
        if (!date) {
            return "-";
        }

        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    /*
    |--------------------------------------------------------------------------
    | FORMAT DATE TIME
    |--------------------------------------------------------------------------
    */

    const formatDateTime = (date: string) => {
        if (!date) {
            return "-";
        }

        return new Date(date).toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="Staff Accounts" />

            {/* ========================================================= */}
            {/* SUCCESS TOAST */}
            {/* ========================================================= */}

            {successMessage && (
                <div className="fixed right-4 top-4 z-9999 w-[calc(100%-2rem)] max-w-md">
                    <div className="flex items-start gap-3 rounded-2xl border border-green-400/30 bg-white dark:bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-400/10">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-green-700 dark:text-green-300">
                                Success
                            </p>

                            <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
                                {successMessage}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSuccessMessage(null)}
                            className="rounded-lg p-1.5 text-gray-500 dark:text-white/40 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* ADMIN SIDEBAR */}
            {/* ========================================================= */}

            <AdminSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* ========================================================= */}
            {/* MAIN */}
            {/* ========================================================= */}

            <main
                className={`min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pt-16 transition-all duration-300 lg:pt-0 ${
                    sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                }`}
            >
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl">
                        {/* HEADER */}

                        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
                                        <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                    </div>

                                    <div>
                                        <h1 className="text-2xl font-bold sm:text-3xl">
                                            Staff Accounts
                                        </h1>

                                        <p className="text-sm text-gray-500 dark:text-white/50">
                                            Create and manage staff accounts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* BUTTONS — RIGHT SIDE */}

                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
                                {/* DELETED STAFF BUTTON */}



                                {/* CREATE STAFF BUTTON */}

                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:bg-yellow-300 sm:w-auto"
                                >
                                    <Plus className="h-5 w-5" />
                                    Create Staff
                                </button>
                            </div>
                        </div>

                        {/* FLASH */}

                        {flash?.success && (
                            <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-green-700 dark:text-green-300">
                                <CheckCircle className="h-5 w-5 shrink-0" />

                                <span className="text-sm">{flash.success}</span>
                            </div>
                        )}

                        {/* SEARCH + STATS */}

                        <div className="mb-5 grid gap-4 md:grid-cols-[1fr_auto]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-white/40" />

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search name or Gmail..."
                                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/30 focus:border-yellow-400/50"
                                />
                            </div>

                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-3">
                                <Users className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />

                                <div>
                                    <p className="text-xs text-gray-500 dark:text-white/40">
                                        Staff Accounts
                                    </p>

                                    <p className="font-bold">{users.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* TABLE */}

                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/3">
                            <div className="border-b border-gray-100 dark:border-white/5 px-4 py-3 text-xs text-gray-400 dark:text-white/30 sm:hidden">
                                Swipe left or right to view all columns.
                            </div>

                            <div
                                className={`overflow-x-auto ${
                                    filteredUsers.length > 4
                                        ? "max-h-107.5 overflow-y-auto"
                                        : ""
                                }`}
                            >
                                <table className="w-full min-w-195">
                                    <thead className="sticky top-0 z-30">
                                        <tr className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-left text-xs uppercase tracking-wider text-gray-500 dark:text-white/40">
                                            <th className="whitespace-nowrap px-5 py-4">
                                                User
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Email
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Role
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Created
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4 text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-5 py-16 text-center"
                                                >
                                                    <Users className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-white/20" />

                                                    <p className="font-medium text-gray-600 dark:text-white/60">
                                                        No staff found.
                                                    </p>

                                                    <p className="mt-1 text-sm text-gray-400 dark:text-white/30">
                                                        Create your first staff
                                                        account.
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    className="border-b border-gray-100 dark:border-white/5 transition hover:bg-gray-100 dark:hover:bg-white/3"
                                                >
                                                    {/* USER */}

                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                                                <User className="h-5 w-5" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium text-gray-900 dark:text-white">
                                                                    {user.name}
                                                                </p>

                                                                <p className="text-xs text-gray-400 dark:text-white/30">
                                                                    ID #
                                                                    {user.id}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* EMAIL */}

                                                    <td className="max-w-75 px-5 py-4 text-sm text-gray-600 dark:text-white/60">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 shrink-0 text-gray-400 dark:text-white/20" />

                                                            <span className="truncate">
                                                                {user.email}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* ROLE */}

                                                    <td className="px-5 py-4">
                                                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-300">
                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                            Staff
                                                        </span>
                                                    </td>

                                                    {/* CREATED */}

                                                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-500 dark:text-white/50">
                                                        {formatDate(
                                                            user.created_at,
                                                        )}
                                                    </td>

                                                    {/* ACTIONS */}

                                                    <td className="px-5 py-4 text-right">
                                                        <button
                                                            ref={(element) => {
                                                                menuButtonRefs.current[
                                                                    user.id
                                                                ] = element;
                                                            }}
                                                            type="button"
                                                            onClick={() =>
                                                                toggleActionMenu(
                                                                    user.id,
                                                                )
                                                            }
                                                            className={`rounded-lg p-2 transition ${
                                                                openMenu ===
                                                                user.id
                                                                    ? "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                                                                    : "text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                                            }`}
                                                        >
                                                            <MoreVertical className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {filteredUsers.length > 4 && (
                            <p className="mt-2 text-right text-xs text-gray-400 dark:text-white/25">
                                Showing {filteredUsers.length} staff accounts •
                                Scroll to view more
                            </p>
                        )}
                    </div>
                </div>
            </main>

            {/* ========================================================= */}
            {/* FIXED ACTION MENU */}
            {/* ========================================================= */}

            {openMenu !== null && (
                <div
                    id="staff-action-menu"
                    className="fixed z-9999 w-40 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl shadow-black/60"
                    style={{
                        top: menuPosition.top,
                        left: menuPosition.left,
                    }}
                >
                    {(() => {
                        const selectedUser = users.find(
                            (user) => user.id === openMenu,
                        );

                        if (!selectedUser) {
                            return null;
                        }

                        return (
                            <>
                                <button
                                    type="button"
                                    onClick={() => openEditModal(selectedUser)}
                                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-900 dark:text-white transition hover:bg-gray-200 dark:hover:bg-white/10"
                                >
                                    <Pencil className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openDeleteModal(selectedUser)}
                                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 transition hover:bg-red-400/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* ========================================================= */}
            {/* CREATE / EDIT MODAL */}
            {/* ========================================================= */}

            {showModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-md sm:p-4">
                    <div className="my-auto flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl">
                        {/* MODAL HEADER */}

                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 px-4 py-4 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                    {editingUser ? (
                                        <Pencil className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                    ) : (
                                        <UserPlus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <h2 className="truncate font-bold">
                                        {editingUser
                                            ? "Edit Staff"
                                            : "Create Staff"}
                                    </h2>

                                    <p className="truncate text-xs text-gray-500 dark:text-white/40">
                                        {editingUser
                                            ? "Update staff account information."
                                            : "Create a new Staff login account."}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={processing}
                                className="shrink-0 rounded-lg p-2 text-gray-500 dark:text-white/40 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* FORM */}

                        <form
                            onSubmit={submit}
                            className="overflow-y-auto p-4 sm:p-6"
                        >
                            <div className="space-y-5">
                                {/* NAME */}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-white/70">
                                        Full Name
                                    </label>

                                    <div className="relative">
                                        <User
                                            className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                                showNameValidation
                                                    ? nameValid
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                    : "text-gray-400 dark:text-white/30"
                                            }`}
                                        />

                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(event) =>
                                                setData(
                                                    "name",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Enter full name"
                                            className={`w-full rounded-xl border bg-white dark:bg-white/5 py-3 pl-11 pr-11 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/25 ${
                                                showNameValidation
                                                    ? nameValid
                                                        ? "border-green-400/50 focus:border-green-400"
                                                        : "border-red-400/50 focus:border-red-400"
                                                    : "border-gray-200 dark:border-white/10 focus:border-yellow-400/50"
                                            }`}
                                            required
                                        />

                                        {showNameValidation && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {nameValid ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {showNameValidation && !nameValid && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            Name is required.
                                        </p>
                                    )}

                                    {errors.name && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                {/* EMAIL */}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-white/70">
                                        Gmail Address
                                    </label>

                                    <div className="relative">
                                        <Mail
                                            className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                                showEmailValidation
                                                    ? emailValid
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                    : "text-gray-400 dark:text-white/30"
                                            }`}
                                        />

                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(event) =>
                                                setData(
                                                    "email",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="example@gmail.com"
                                            className={`w-full rounded-xl border bg-white dark:bg-white/5 py-3 pl-11 pr-11 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/25 ${
                                                showEmailValidation
                                                    ? emailValid
                                                        ? "border-green-400/50 focus:border-green-400"
                                                        : "border-red-400/50 focus:border-red-400"
                                                    : "border-gray-200 dark:border-white/10 focus:border-yellow-400/50"
                                            }`}
                                            required
                                        />

                                        {showEmailValidation && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {emailValid ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {showEmailValidation && !emailValid && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            Please enter a valid Gmail address
                                            ending in @gmail.com.
                                        </p>
                                    )}

                                    {errors.email && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                {/* PASSWORD */}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-white/70">
                                        {editingUser
                                            ? "New Password (optional)"
                                            : "Password"}
                                    </label>

                                    <div className="relative">
                                        <Lock
                                            className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                                showPasswordValidation
                                                    ? passwordValid
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                    : "text-gray-400 dark:text-white/30"
                                            }`}
                                        />

                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={data.password}
                                            onChange={(event) =>
                                                setData(
                                                    "password",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder={
                                                editingUser
                                                    ? "Leave blank to keep current password"
                                                    : "Enter password"
                                            }
                                            className={`w-full rounded-xl border bg-white dark:bg-white/5 py-3 pl-11 pr-20 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/25 ${
                                                showPasswordValidation
                                                    ? passwordValid
                                                        ? "border-green-400/50 focus:border-green-400"
                                                        : "border-red-400/50 focus:border-red-400"
                                                    : "border-gray-200 dark:border-white/10 focus:border-yellow-400/50"
                                            }`}
                                            required={!editingUser}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white"
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {showPasswordValidation && (
                                        <div className="mt-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 p-3">
                                            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-white/60">
                                                Password requirements
                                            </p>

                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <PasswordRequirement
                                                    valid={passwordHasMinLength}
                                                    text="At least 12 characters"
                                                />

                                                <PasswordRequirement
                                                    valid={passwordHasUppercase}
                                                    text="One uppercase letter"
                                                />

                                                <PasswordRequirement
                                                    valid={passwordHasLowercase}
                                                    text="One lowercase letter"
                                                />

                                                <PasswordRequirement
                                                    valid={passwordHasNumber}
                                                    text="One number"
                                                />

                                                <PasswordRequirement
                                                    valid={passwordHasSpecial}
                                                    text="One special character"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {errors.password && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                {/* CONFIRM PASSWORD */}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-white/70">
                                        Confirm Password
                                    </label>

                                    <div className="relative">
                                        <Lock
                                            className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                                showConfirmValidation
                                                    ? passwordMatch
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400"
                                                    : "text-gray-400 dark:text-white/30"
                                            }`}
                                        />

                                        <input
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={data.password_confirmation}
                                            onChange={(event) =>
                                                setData(
                                                    "password_confirmation",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Confirm password"
                                            className={`w-full rounded-xl border bg-white dark:bg-white/5 py-3 pl-11 pr-20 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/25 ${
                                                showConfirmValidation
                                                    ? passwordMatch
                                                        ? "border-green-400/50 focus:border-green-400"
                                                        : "border-red-400/50 focus:border-red-400"
                                                    : "border-gray-200 dark:border-white/10 focus:border-yellow-400/50"
                                            }`}
                                            required={!editingUser}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword,
                                                )
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white"
                                        >
                                            {showConfirmPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>
                                    </div>

                                    {showConfirmValidation && (
                                        <div
                                            className={`mt-2 flex items-center gap-2 text-xs ${
                                                passwordMatch
                                                    ? "text-green-600 dark:text-green-400"
                                                    : "text-red-600 dark:text-red-400"
                                            }`}
                                        >
                                            {passwordMatch ? (
                                                <CheckCircle className="h-4 w-4" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4" />
                                            )}

                                            <span>
                                                {passwordMatch
                                                    ? "Passwords match."
                                                    : "Passwords do not match."}
                                            </span>
                                        </div>
                                    )}

                                    {errors.password_confirmation && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                            {errors.password_confirmation}
                                        </p>
                                    )}
                                </div>

                                {/* STAFF INFORMATION */}

                                {!editingUser && (
                                    <div className="flex gap-3 rounded-xl border border-yellow-400/10 bg-yellow-400/5 p-4">
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />

                                        <p className="text-xs leading-5 text-gray-500 dark:text-white/50">
                                            This account will automatically be
                                            created with the role{" "}
                                            <strong className="text-yellow-700 dark:text-yellow-300">
                                                Staff
                                            </strong>
                                            . A verification PIN will be sent to
                                            the Gmail address entered above.
                                        </p>
                                    </div>
                                )}

                                {/* BUTTONS */}

                                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        disabled={processing}
                                        className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-3 font-medium text-gray-600 dark:text-white/70 transition hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={processing || !liveFormValid}
                                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${
                                            processing || !liveFormValid
                                                ? "cursor-not-allowed bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/30"
                                                : "bg-yellow-400 text-black hover:bg-yellow-300"
                                        }`}
                                    >
                                        {processing ? (
                                            "Saving..."
                                        ) : editingUser ? (
                                            <>
                                                <Pencil className="h-4 w-4" />
                                                Save Changes
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="h-4 w-4" />
                                                Create Staff
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* DELETE MODAL — MAY REASON */}
            {/* ========================================================= */}

            {showDeleteModal && deletingUser && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDeleteModal();
                        }
                    }}
                >
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl">
                        {/* HEADER */}

                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
                                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>

                                <div className="min-w-0">
                                    <h2 className="truncate font-bold">
                                        Delete Staff Account
                                    </h2>

                                    <p className="truncate text-xs text-gray-500 dark:text-white/40">
                                        This action can be undone.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                className="rounded-lg p-2 text-gray-500 dark:text-white/40 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* BODY */}

                        <div className="p-5">
                            <div className="mb-4 rounded-xl border border-red-400/10 bg-red-400/5 p-4">
                                <p className="text-sm text-gray-600 dark:text-white/70">
                                    You are about to delete:
                                </p>

                                <p className="mt-2 font-bold text-gray-900 dark:text-white">
                                    {deletingUser.name}
                                </p>

                                <p className="text-xs text-gray-500 dark:text-white/40">
                                    {deletingUser.email}
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-white/70">
                                    Reason for Deletion{" "}
                                    <span className="text-red-600 dark:text-red-400">*</span>
                                </label>

                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-white/30" />

                                    <textarea
                                        value={deleteReason}
                                        onChange={(event) =>
                                            setDeleteReason(event.target.value)
                                        }
                                        placeholder="Enter the reason for deleting this staff account..."
                                        rows={3}
                                        className="w-full resize-none rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-red-400/50"
                                        maxLength={500}
                                    />
                                </div>

                                <div className="mt-1 flex items-center justify-between text-xs">
                                    <span className="text-gray-400 dark:text-white/30">
                                        Required field
                                    </span>

                                    <span className="text-gray-400 dark:text-white/30">
                                        {deleteReason.length}/500
                                    </span>
                                </div>
                            </div>

                            {/* WARNING */}

                            <div className="mt-4 flex gap-3 rounded-xl border border-yellow-400/10 bg-yellow-400/5 p-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />

                                <p className="text-xs leading-5 text-gray-500 dark:text-white/50">
                                    The account will be soft-deleted and can be
                                    restored later from the "Deleted Staff"
                                    section.
                                </p>
                            </div>
                        </div>

                        {/* FOOTER */}

                        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 dark:border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                className="rounded-xl border border-gray-200 dark:border-white/10 px-5 py-3 font-medium text-gray-600 dark:text-white/70 transition hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={
                                    deleting ||
                                    deleteReason.trim().length === 0
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition ${
                                    deleting ||
                                    deleteReason.trim().length === 0
                                        ? "cursor-not-allowed bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/30"
                                        : "bg-red-500 text-white hover:bg-red-400"
                                }`}
                            >
                                <Trash2 className="h-4 w-4" />

                                {deleting ? "Deleting..." : "Delete Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* DELETED STAFF MODAL */}
            {/* ========================================================= */}

            {showDeletedModal && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowDeletedModal(false);
                        }
                    }}
                >
                    <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-2xl">
                        {/* HEADER */}

                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-white/10 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
                                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>

                                <div className="min-w-0">
                                    <h2 className="truncate font-bold">
                                        Deleted Staff ({deletedUsers.length})
                                    </h2>

                                    <p className="truncate text-xs text-gray-500 dark:text-white/40">
                                        Restore deleted staff accounts.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowDeletedModal(false)}
                                className="shrink-0 rounded-lg p-2 text-gray-500 dark:text-white/40 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* BODY */}

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                            {deletedUsers.length === 0 ? (
                                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/[0.015] px-6 text-center">
                                    <Trash2 className="h-8 w-8 text-gray-400 dark:text-white/20" />

                                    <p className="mt-3 text-sm font-bold text-gray-600 dark:text-white/60">
                                        No deleted staff accounts
                                    </p>

                                    <p className="mt-1 text-xs text-gray-400 dark:text-white/30">
                                        Deleted staff will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {deletedUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex flex-col gap-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 sm:flex-row sm:items-start sm:justify-between"
                                        >
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-400/10">
                                                    <User className="h-5 w-5 text-red-600 dark:text-red-400" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-gray-600 dark:text-white/80">
                                                        {user.name}
                                                    </p>

                                                    <p className="truncate text-xs text-gray-500 dark:text-white/35">
                                                        {user.email}
                                                    </p>

                                                    <p className="mt-1 text-[10px] text-red-600/60 dark:text-red-400/60">
                                                        Deleted:{" "}
                                                        {formatDateTime(
                                                            user.deleted_at,
                                                        )}
                                                    </p>

                                                    {user.delete_reason && (
                                                        <div className="mt-2 rounded-lg border border-red-400/10 bg-red-400/5 px-3 py-2">
                                                            <p className="text-[9px] font-black uppercase tracking-wider text-red-600/60 dark:text-red-400/60">
                                                                Reason
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-white/60">
                                                                {
                                                                    user.delete_reason
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    restoreStaff(user)
                                                }
                                                disabled={
                                                    restoringId === user.id
                                                }
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 transition hover:bg-green-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <RotateCcw
                                                    className={`h-4 w-4 ${
                                                        restoringId === user.id
                                                            ? "animate-spin"
                                                            : ""
                                                    }`}
                                                />

                                                {restoringId === user.id
                                                    ? "Restoring..."
                                                    : "Restore"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}

                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 dark:border-white/10 px-5 py-3">
                            <p className="text-[10px] text-gray-400 dark:text-white/25">
                                {deletedUsers.length} deleted staff account
                                {deletedUsers.length !== 1 ? "s" : ""}
                            </p>

                            <button
                                type="button"
                                onClick={() => setShowDeletedModal(false)}
                                className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-2 text-xs font-bold text-gray-500 dark:text-white/55 transition hover:border-yellow-400/20 hover:bg-yellow-400/[0.05] hover:text-gray-900 dark:hover:text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
