import React, { useEffect, useMemo, useState } from "react";

import { Head, router } from "@inertiajs/react";

import {
    Users,
    ShieldCheck,
    Mail,
    User,
    Circle,
    Clock,
    Wifi,
    WifiOff,
    Search,
    RefreshCw,
    X,
    ArrowUpDown,
    Copy,
    Check,
    UserCheck,
    UserX,
    Activity,
    CalendarDays,
    Trash2,
    RotateCcw,
    FileText,
} from "lucide-react";

import AdminSidebar from "../../../Components/Admin/AdminSidebar";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type Staff = {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    last_login_at: string | null;
    is_online: boolean;
};

type DeletedStaff = {
    id: number;
    name: string;
    email: string;
    deleted_at: string;
    delete_reason?: string | null;
};

type Props = {
    staff?: Staff[];
    deletedUsers?: DeletedStaff[];
};

type StatusFilter = "all" | "online" | "offline";

type SortOption = "name" | "last_login" | "created" | "status";

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function Index({ staff = [], deletedUsers = [] }: Props) {
    /*
    |--------------------------------------------------------------------------
    | SIDEBAR
    |--------------------------------------------------------------------------
    */

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    const [search, setSearch] = useState("");

    /*
    |--------------------------------------------------------------------------
    | FILTERS
    |--------------------------------------------------------------------------
    */

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const [sortBy, setSortBy] = useState<SortOption>("name");

    const [onlineFirst, setOnlineFirst] = useState(true);

    /*
    |--------------------------------------------------------------------------
    | REFRESH
    |--------------------------------------------------------------------------
    */

    const [refreshing, setRefreshing] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | COPIED EMAIL
    |--------------------------------------------------------------------------
    */

    const [copiedEmail, setCopiedEmail] = useState<number | null>(null);

    /*
    |--------------------------------------------------------------------------
    | RESTORING
    |--------------------------------------------------------------------------
    */

    const [restoringId, setRestoringId] = useState<number | null>(null);

    /*
    |--------------------------------------------------------------------------
    | DELETED STAFF MODAL
    |--------------------------------------------------------------------------
    */

    const [showDeletedModal, setShowDeletedModal] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | AUTO REFRESH
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const interval = window.setInterval(() => {
            setRefreshing(true);

            router.reload({
                only: ["staff", "deletedUsers"],

                onFinish: () => {
                    setRefreshing(false);
                },
            });
        }, 30000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | MANUAL REFRESH
    |--------------------------------------------------------------------------
    */

    const refreshStaff = () => {
        if (refreshing) {
            return;
        }

        setRefreshing(true);

        router.reload({
            only: ["staff", "deletedUsers"],

            onFinish: () => {
                setRefreshing(false);
            },
        });
    };

    /*
    |--------------------------------------------------------------------------
    | CLEAR FILTERS
    |--------------------------------------------------------------------------
    */

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setSortBy("name");
        setOnlineFirst(true);
    };

    /*
    |--------------------------------------------------------------------------
    | SEARCH + FILTER + SORT
    |--------------------------------------------------------------------------
    */

    const filteredStaff = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        let result = [...staff];

        if (keyword) {
            result = result.filter((user) =>
                `${user.name} ${user.email} ${user.role} ${user.id}`
                    .toLowerCase()
                    .includes(keyword),
            );
        }

        if (statusFilter === "online") {
            result = result.filter((user) => user.is_online);
        }

        if (statusFilter === "offline") {
            result = result.filter((user) => !user.is_online);
        }

        if (onlineFirst) {
            result.sort((a, b) => Number(b.is_online) - Number(a.is_online));
        }

        result.sort((a, b) => {
            if (sortBy === "name") {
                return a.name.localeCompare(b.name);
            }

            if (sortBy === "last_login") {
                const dateA = a.last_login_at
                    ? new Date(a.last_login_at).getTime()
                    : 0;

                const dateB = b.last_login_at
                    ? new Date(b.last_login_at).getTime()
                    : 0;

                return dateB - dateA;
            }

            if (sortBy === "created") {
                const dateA = new Date(a.created_at).getTime();

                const dateB = new Date(b.created_at).getTime();

                return dateB - dateA;
            }

            if (sortBy === "status") {
                return Number(b.is_online) - Number(a.is_online);
            }

            return 0;
        });

        return result;
    }, [staff, search, statusFilter, sortBy, onlineFirst]);

    /*
    |--------------------------------------------------------------------------
    | COUNTS
    |--------------------------------------------------------------------------
    */

    const onlineCount = staff.filter((user) => user.is_online).length;

    const offlineCount = staff.filter((user) => !user.is_online).length;

    /*
    |--------------------------------------------------------------------------
    | HAS ACTIVE FILTERS
    |--------------------------------------------------------------------------
    */

    const hasActiveFilters =
        search.trim() !== "" ||
        statusFilter !== "all" ||
        sortBy !== "name" ||
        !onlineFirst;

    /*
    |--------------------------------------------------------------------------
    | FORMAT LAST LOGIN
    |--------------------------------------------------------------------------
    */

    const formatLastLogin = (lastLogin: string | null) => {
        if (!lastLogin) {
            return "Never logged in";
        }

        const date = new Date(lastLogin);

        if (Number.isNaN(date.getTime())) {
            return "Unknown";
        }

        return date.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    /*
    |--------------------------------------------------------------------------
    | RELATIVE LAST LOGIN
    |--------------------------------------------------------------------------
    */

    const formatRelativeTime = (lastLogin: string | null) => {
        if (!lastLogin) {
            return "No activity";
        }

        const date = new Date(lastLogin);

        if (Number.isNaN(date.getTime())) {
            return "Unknown";
        }

        const now = new Date().getTime();

        const difference = now - date.getTime();

        const seconds = Math.floor(difference / 1000);

        if (seconds < 60) {
            return "Just now";
        }

        const minutes = Math.floor(seconds / 60);

        if (minutes < 60) {
            return `${minutes} min ago`;
        }

        const hours = Math.floor(minutes / 60);

        if (hours < 24) {
            return `${hours} hr ago`;
        }

        const days = Math.floor(hours / 24);

        if (days < 30) {
            return `${days} day${days !== 1 ? "s" : ""} ago`;
        }

        const months = Math.floor(days / 30);

        if (months < 12) {
            return `${months} month${months !== 1 ? "s" : ""} ago`;
        }

        const years = Math.floor(months / 12);

        return `${years} year${years !== 1 ? "s" : ""} ago`;
    };

    /*
    |--------------------------------------------------------------------------
    | FORMAT CREATED DATE
    |--------------------------------------------------------------------------
    */

    const formatCreatedDate = (dateString: string) => {
        if (!dateString) {
            return "-";
        }

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString("en-PH", {
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

    const formatDateTime = (dateString: string) => {
        if (!dateString) {
            return "-";
        }

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    /*
    |--------------------------------------------------------------------------
    | COPY EMAIL
    |--------------------------------------------------------------------------
    */

    const copyEmail = async (user: Staff) => {
        try {
            await navigator.clipboard.writeText(user.email);

            setCopiedEmail(user.id);

            window.setTimeout(() => {
                setCopiedEmail(null);
            }, 1800);
        } catch {
            /*
             * Clipboard may be unavailable
             * on some browsers / environments.
             */
        }
    };

    /*
    |--------------------------------------------------------------------------
    | RESTORE STAFF
    |--------------------------------------------------------------------------
    */

    const restoreStaff = (user: DeletedStaff) => {
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
                    setShowDeletedModal(false);
                },

                onFinish: () => {
                    setRestoringId(null);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="User Roles | ALIBATON" />

            {/* =========================================================
                ADMIN SIDEBAR
            ========================================================== */}

            <AdminSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* =========================================================
                MAIN CONTENT
            ========================================================== */}

            <main
                className={`
                    min-h-screen
                    bg-black
                    text-white
                    pt-16
                    transition-all
                    duration-300
                    lg:pt-0
                    ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"}
                `}
            >
                <div className="w-full p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-7xl">
                        {/* =================================================
                            HEADER
                        ================================================== */}

                        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="
                                        flex
                                        h-12
                                        w-12
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        border
                                        border-yellow-400/30
                                        bg-yellow-400/10
                                    "
                                    >
                                        <ShieldCheck className="h-6 w-6 text-yellow-400" />
                                    </div>

                                    <div className="min-w-0">
                                        <h1 className="text-2xl font-bold sm:text-3xl">
                                            User Roles
                                        </h1>

                                        <p className="mt-1 text-sm text-white/50">
                                            Monitor Staff accounts, activity,
                                            and current online status.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* BUTTONS — RIGHT SIDE */}

                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
                                {/* DELETED STAFF BUTTON */}

                                <button
                                    type="button"
                                    onClick={() => setShowDeletedModal(true)}
                                    className="
                                        inline-flex
                                        w-full
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-red-400/20
                                        bg-red-400/10
                                        px-5
                                        py-3
                                        text-sm
                                        font-medium
                                        text-red-300
                                        transition
                                        hover:border-red-400/30
                                        hover:bg-red-400/15
                                        hover:text-red-200
                                        sm:w-auto
                                    "
                                >
                                    <Trash2 className="h-4 w-4" />

                                    Deleted Staff

                                    {deletedUsers.length > 0 && (
                                        <span
                                            className="
                                                ml-1
                                                inline-flex
                                                h-5
                                                min-w-5
                                                items-center
                                                justify-center
                                                rounded-full
                                                bg-red-400/20
                                                px-1.5
                                                text-[10px]
                                                font-black
                                                text-red-200
                                            "
                                        >
                                            {deletedUsers.length}
                                        </span>
                                    )}
                                </button>

                                {/* REFRESH BUTTON */}

                                <button
                                    type="button"
                                    onClick={refreshStaff}
                                    disabled={refreshing}
                                    className="
                                        inline-flex
                                        w-full
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-white/10
                                        bg-white/5
                                        px-5
                                        py-3
                                        text-sm
                                        font-medium
                                        text-white/70
                                        transition
                                        hover:border-yellow-400/20
                                        hover:bg-yellow-400/5
                                        hover:text-white
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                        sm:w-auto
                                    "
                                >
                                    <RefreshCw
                                        className={`
                                            h-4
                                            w-4
                                            ${refreshing ? "animate-spin" : ""}
                                        `}
                                    />

                                    {refreshing ? "Refreshing..." : "Refresh"}
                                </button>
                            </div>
                        </div>

                        {/* =================================================
                            SUMMARY CARDS
                        ================================================== */}

                        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div
                                className="
                                rounded-2xl
                                border
                                border-white/10
                                bg-white/5
                                p-5
                                backdrop-blur-xl
                            "
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-white/40">
                                            Staff Accounts
                                        </p>

                                        <p className="mt-2 text-3xl font-bold">
                                            {staff.length}
                                        </p>

                                        <p className="mt-1 text-xs text-white/30">
                                            Registered staff
                                        </p>
                                    </div>

                                    <div
                                        className="
                                        flex
                                        h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-yellow-400/10
                                    "
                                    >
                                        <Users className="h-6 w-6 text-yellow-400" />
                                    </div>
                                </div>
                            </div>

                            <div
                                className="
                                rounded-2xl
                                border
                                border-green-400/10
                                bg-white/5
                                p-5
                                backdrop-blur-xl
                            "
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-white/40">
                                            Online Now
                                        </p>

                                        <p className="mt-2 text-3xl font-bold text-green-400">
                                            {onlineCount}
                                        </p>

                                        <p className="mt-1 text-xs text-green-400/40">
                                            Currently active
                                        </p>
                                    </div>

                                    <div
                                        className="
                                        flex
                                        h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-green-400/10
                                    "
                                    >
                                        <Wifi className="h-6 w-6 text-green-400" />
                                    </div>
                                </div>
                            </div>

                            <div
                                className="
                                rounded-2xl
                                border
                                border-white/10
                                bg-white/5
                                p-5
                                backdrop-blur-xl
                            "
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-white/40">
                                            Offline
                                        </p>

                                        <p className="mt-2 text-3xl font-bold text-white/50">
                                            {offlineCount}
                                        </p>

                                        <p className="mt-1 text-xs text-white/30">
                                            Not currently active
                                        </p>
                                    </div>

                                    <div
                                        className="
                                        flex
                                        h-12
                                        w-12
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-white/5
                                    "
                                    >
                                        <WifiOff className="h-6 w-6 text-white/40" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* =================================================
                            SEARCH + FILTERS
                        ================================================== */}

                        <div
                            className="
                            mb-6
                            rounded-2xl
                            border
                            border-white/10
                            bg-white/5
                            p-4
                            backdrop-blur-xl
                            sm:p-5
                        "
                        >
                            <div className="flex flex-col gap-4">
                                <div className="relative">
                                    <Search
                                        className="
                                        absolute
                                        left-4
                                        top-1/2
                                        h-5
                                        w-5
                                        -translate-y-1/2
                                        text-white/30
                                    "
                                    />

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search staff name, email, role, or ID..."
                                        className="
                                            w-full
                                            rounded-xl
                                            border
                                            border-white/10
                                            bg-black/30
                                            py-3
                                            pl-12
                                            pr-12
                                            text-sm
                                            text-white
                                            outline-none
                                            placeholder:text-white/30
                                            focus:border-yellow-400/50
                                            focus:ring-1
                                            focus:ring-yellow-400/20
                                        "
                                    />

                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch("")}
                                            className="
                                                absolute
                                                right-3
                                                top-1/2
                                                -translate-y-1/2
                                                rounded-lg
                                                p-1.5
                                                text-white/30
                                                transition
                                                hover:bg-white/10
                                                hover:text-white
                                            "
                                            title="Clear search"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div
                                    className="
                                    grid
                                    grid-cols-1
                                    gap-3
                                    sm:grid-cols-2
                                    lg:grid-cols-4
                                "
                                >
                                    <div>
                                        <label
                                            className="
                                            mb-2
                                            block
                                            text-xs
                                            font-medium
                                            uppercase
                                            tracking-wider
                                            text-white/30
                                        "
                                        >
                                            Status
                                        </label>

                                        <select
                                            value={statusFilter}
                                            onChange={(event) =>
                                                setStatusFilter(
                                                    event.target
                                                        .value as StatusFilter,
                                                )
                                            }
                                            className="
                                                w-full
                                                rounded-xl
                                                border
                                                border-white/10
                                                bg-zinc-950
                                                px-3
                                                py-3
                                                text-sm
                                                text-white
                                                outline-none
                                                focus:border-yellow-400/50
                                            "
                                        >
                                            <option value="all">
                                                All Staff
                                            </option>

                                            <option value="online">
                                                Online
                                            </option>

                                            <option value="offline">
                                                Offline
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            className="
                                            mb-2
                                            block
                                            text-xs
                                            font-medium
                                            uppercase
                                            tracking-wider
                                            text-white/30
                                        "
                                        >
                                            Sort By
                                        </label>

                                        <div className="relative">
                                            <ArrowUpDown
                                                className="
                                                pointer-events-none
                                                absolute
                                                left-3
                                                top-1/2
                                                h-4
                                                w-4
                                                -translate-y-1/2
                                                text-white/30
                                            "
                                            />

                                            <select
                                                value={sortBy}
                                                onChange={(event) =>
                                                    setSortBy(
                                                        event.target
                                                            .value as SortOption,
                                                    )
                                                }
                                                className="
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-white/10
                                                    bg-zinc-950
                                                    py-3
                                                    pl-10
                                                    pr-3
                                                    text-sm
                                                    text-white
                                                    outline-none
                                                    focus:border-yellow-400/50
                                                "
                                            >
                                                <option value="name">
                                                    Name
                                                </option>

                                                <option value="last_login">
                                                    Last Login
                                                </option>

                                                <option value="created">
                                                    Created Date
                                                </option>

                                                <option value="status">
                                                    Status
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    <div
                                        className="
                                        flex
                                        items-end
                                    "
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOnlineFirst(!onlineFirst)
                                            }
                                            className={`
                                                flex
                                                w-full
                                                items-center
                                                justify-between
                                                rounded-xl
                                                border
                                                px-4
                                                py-3
                                                text-sm
                                                transition
                                                ${
                                                    onlineFirst
                                                        ? "border-green-400/20 bg-green-400/10 text-green-300"
                                                        : "border-white/10 bg-white/5 text-white/50"
                                                }
                                            `}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Activity className="h-4 w-4" />
                                                Online first
                                            </span>

                                            <span
                                                className={`
                                                    h-2.5
                                                    w-2.5
                                                    rounded-full
                                                    ${
                                                        onlineFirst
                                                            ? "bg-green-400"
                                                            : "bg-white/20"
                                                    }
                                                `}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            disabled={!hasActiveFilters}
                                            className="
                                                flex
                                                w-full
                                                items-center
                                                justify-center
                                                gap-2
                                                rounded-xl
                                                border
                                                border-white/10
                                                bg-white/5
                                                px-4
                                                py-3
                                                text-sm
                                                text-white/50
                                                transition
                                                hover:bg-white/10
                                                hover:text-white
                                                disabled:cursor-not-allowed
                                                disabled:opacity-30
                                            "
                                        >
                                            <X className="h-4 w-4" />
                                            Clear Filters
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* =================================================
                            STAFF TABLE
                        ================================================== */}

                        <div
                            className="
                            overflow-hidden
                            rounded-2xl
                            border
                            border-white/10
                            bg-white/5
                            backdrop-blur-xl
                        "
                        >
                            <div
                                className="
                                flex
                                flex-col
                                gap-3
                                border-b
                                border-white/10
                                px-4
                                py-4
                                sm:px-6
                                md:flex-row
                                md:items-center
                                md:justify-between
                            "
                            >
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold sm:text-xl">
                                        Staff Accounts
                                    </h2>

                                    <p className="mt-1 text-xs text-white/40 sm:text-sm">
                                        Showing{" "}
                                        <span className="text-white/70">
                                            {filteredStaff.length}
                                        </span>{" "}
                                        of{" "}
                                        <span className="text-white/70">
                                            {staff.length}
                                        </span>{" "}
                                        Staff accounts.
                                    </p>
                                </div>

                                <div
                                    className="
                                    flex
                                    shrink-0
                                    items-center
                                    gap-2
                                    text-xs
                                    text-white/30
                                "
                                >
                                    <Circle
                                        className="
                                        h-2
                                        w-2
                                        fill-green-400
                                        text-green-400
                                    "
                                    />
                                    Auto-refresh every 30 seconds
                                </div>
                            </div>

                            <div
                                className="
                                border-b
                                border-white/5
                                px-4
                                py-3
                                text-xs
                                text-white/30
                                sm:hidden
                            "
                            >
                                Swipe left or right to view all columns.
                            </div>

                            <div
                                className={`
                                    w-full
                                    overflow-x-auto
                                    ${
                                        filteredStaff.length > 5
                                            ? "max-h-[600px] overflow-y-auto"
                                            : ""
                                    }
                                `}
                            >
                                <table className="w-full min-w-[1000px]">
                                    <thead className="sticky top-0 z-20">
                                        <tr
                                            className="
                                            border-b
                                            border-white/10
                                            bg-zinc-950
                                            text-left
                                            text-xs
                                            uppercase
                                            tracking-wider
                                            text-white/40
                                        "
                                        >
                                            <th className="whitespace-nowrap px-5 py-4">
                                                Staff
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Email
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Role
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Status
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Last Activity
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                Created
                                            </th>

                                            <th className="whitespace-nowrap px-5 py-4">
                                                ID
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredStaff.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-5 py-20 text-center"
                                                >
                                                    <div
                                                        className="
                                                        mx-auto
                                                        flex
                                                        h-16
                                                        w-16
                                                        items-center
                                                        justify-center
                                                        rounded-2xl
                                                        bg-white/5
                                                    "
                                                    >
                                                        <Users className="h-8 w-8 text-white/20" />
                                                    </div>

                                                    <p className="mt-4 font-medium text-white/60">
                                                        No Staff accounts found.
                                                    </p>

                                                    <p className="mt-1 text-sm text-white/30">
                                                        Try another search or
                                                        filter.
                                                    </p>

                                                    {hasActiveFilters && (
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                clearFilters
                                                            }
                                                            className="
                                                                mt-4
                                                                inline-flex
                                                                items-center
                                                                gap-2
                                                                rounded-lg
                                                                border
                                                                border-yellow-400/20
                                                                bg-yellow-400/10
                                                                px-4
                                                                py-2
                                                                text-xs
                                                                font-medium
                                                                text-yellow-300
                                                                transition
                                                                hover:bg-yellow-400/20
                                                            "
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Clear filters
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStaff.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    className="
                                                            border-b
                                                            border-white/5
                                                            transition
                                                            hover:bg-white/[0.03]
                                                        "
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative shrink-0">
                                                                <div
                                                                    className="
                                                                        flex
                                                                        h-10
                                                                        w-10
                                                                        items-center
                                                                        justify-center
                                                                        rounded-full
                                                                        border
                                                                        border-yellow-400/20
                                                                        bg-yellow-400/10
                                                                    "
                                                                >
                                                                    <User className="h-5 w-5 text-yellow-400" />
                                                                </div>

                                                                {user.is_online && (
                                                                    <span
                                                                        className="
                                                                            absolute
                                                                            -bottom-0.5
                                                                            -right-0.5
                                                                            h-3
                                                                            w-3
                                                                            rounded-full
                                                                            border-2
                                                                            border-zinc-950
                                                                            bg-green-400
                                                                        "
                                                                    />
                                                                )}
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p
                                                                    className="
                                                                        truncate
                                                                        font-medium
                                                                        text-white
                                                                    "
                                                                >
                                                                    {user.name}
                                                                </p>

                                                                <p
                                                                    className="
                                                                        text-xs
                                                                        text-white/30
                                                                    "
                                                                >
                                                                    Staff
                                                                    Account
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="max-w-[300px] px-5 py-4">
                                                        <div
                                                            className="
                                                                flex
                                                                items-center
                                                                gap-2
                                                                text-sm
                                                                text-white/60
                                                            "
                                                        >
                                                            <Mail
                                                                className="
                                                                    h-4
                                                                    w-4
                                                                    shrink-0
                                                                    text-white/20
                                                                "
                                                            />

                                                            <span className="min-w-0 truncate">
                                                                {user.email}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    copyEmail(
                                                                        user,
                                                                    )
                                                                }
                                                                className="
                                                                        shrink-0
                                                                        rounded-md
                                                                        p-1.5
                                                                        text-white/20
                                                                        transition
                                                                        hover:bg-white/10
                                                                        hover:text-yellow-400
                                                                    "
                                                                title="Copy email"
                                                            >
                                                                {copiedEmail ===
                                                                user.id ? (
                                                                    <Check className="h-4 w-4 text-green-400" />
                                                                ) : (
                                                                    <Copy className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className="
                                                                inline-flex
                                                                items-center
                                                                gap-1.5
                                                                whitespace-nowrap
                                                                rounded-full
                                                                border
                                                                border-yellow-400/20
                                                                bg-yellow-400/10
                                                                px-3
                                                                py-1
                                                                text-xs
                                                                font-medium
                                                                text-yellow-300
                                                            "
                                                        >
                                                            <ShieldCheck className="h-3.5 w-3.5" />
                                                            Staff
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        {user.is_online ? (
                                                            <span
                                                                className="
                                                                    inline-flex
                                                                    items-center
                                                                    gap-1.5
                                                                    whitespace-nowrap
                                                                    rounded-full
                                                                    border
                                                                    border-green-400/20
                                                                    bg-green-400/10
                                                                    px-3
                                                                    py-1
                                                                    text-xs
                                                                    font-medium
                                                                    text-green-300
                                                                "
                                                            >
                                                                <Circle
                                                                    className="
                                                                        h-2
                                                                        w-2
                                                                        fill-green-400
                                                                        text-green-400
                                                                    "
                                                                />
                                                                Online
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="
                                                                    inline-flex
                                                                    items-center
                                                                    gap-1.5
                                                                    whitespace-nowrap
                                                                    rounded-full
                                                                    border
                                                                    border-white/10
                                                                    bg-white/5
                                                                    px-3
                                                                    py-1
                                                                    text-xs
                                                                    font-medium
                                                                    text-white/40
                                                                "
                                                            >
                                                                <Circle
                                                                    className="
                                                                        h-2
                                                                        w-2
                                                                        fill-white/30
                                                                        text-white/30
                                                                    "
                                                                />
                                                                Offline
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td
                                                        className="
                                                            whitespace-nowrap
                                                            px-5
                                                            py-4
                                                        "
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {user.is_online ? (
                                                                <UserCheck className="h-4 w-4 text-green-400/70" />
                                                            ) : (
                                                                <Clock className="h-4 w-4 text-white/20" />
                                                            )}

                                                            <div>
                                                                <p className="text-sm text-white/60">
                                                                    {formatLastLogin(
                                                                        user.last_login_at,
                                                                    )}
                                                                </p>

                                                                <p className="text-xs text-white/25">
                                                                    {formatRelativeTime(
                                                                        user.last_login_at,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td
                                                        className="
                                                            whitespace-nowrap
                                                            px-5
                                                            py-4
                                                        "
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <CalendarDays className="h-4 w-4 text-white/20" />

                                                            <span className="text-sm text-white/40">
                                                                {formatCreatedDate(
                                                                    user.created_at,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td
                                                        className="
                                                            whitespace-nowrap
                                                            px-5
                                                            py-4
                                                        "
                                                    >
                                                        <span
                                                            className="
                                                                inline-flex
                                                                items-center
                                                                rounded-lg
                                                                border
                                                                border-white/10
                                                                bg-white/5
                                                                px-2.5
                                                                py-1
                                                                text-xs
                                                                font-medium
                                                                text-white/40
                                                            "
                                                        >
                                                            #{user.id}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* =================================================
                            FOOTER
                        ================================================== */}

                        <div
                            className="
                            mt-3
                            flex
                            flex-col
                            gap-2
                            text-xs
                            text-white/25
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                        "
                        >
                            <div className="flex items-center gap-2">
                                {onlineCount > 0 ? (
                                    <>
                                        <UserCheck className="h-3.5 w-3.5 text-green-400" />

                                        <span>
                                            {onlineCount} Staff currently online
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <UserX className="h-3.5 w-3.5 text-white/30" />

                                        <span>No Staff currently online</span>
                                    </>
                                )}
                            </div>

                            {filteredStaff.length > 5 && (
                                <p className="text-right">
                                    Showing {filteredStaff.length} Staff
                                    accounts • Scroll to view more
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* =========================================================
                DELETED STAFF MODAL — MAY REASON
            ========================================================== */}

            {showDeletedModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowDeletedModal(false);
                        }
                    }}
                >
                    <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/50">
                        {/* HEADER */}

                        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
                                    <Trash2 className="h-5 w-5 text-red-400" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-400">
                                        Deleted Accounts
                                    </p>

                                    <h2 className="truncate text-lg font-black text-white sm:text-xl">
                                        Deleted Staff ({deletedUsers.length})
                                    </h2>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowDeletedModal(false)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/45 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* BODY */}

                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                            {deletedUsers.length === 0 ? (
                                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 text-center">
                                    <Trash2 className="h-8 w-8 text-white/20" />

                                    <p className="mt-3 text-sm font-bold text-white/60">
                                        No deleted staff accounts
                                    </p>

                                    <p className="mt-1 text-xs text-white/30">
                                        Deleted staff will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {deletedUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-start sm:justify-between"
                                        >
                                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-400/10">
                                                    <User className="h-5 w-5 text-red-400" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-white/80">
                                                        {user.name}
                                                    </p>

                                                    <p className="truncate text-xs text-white/35">
                                                        {user.email}
                                                    </p>

                                                    <p className="mt-1 text-[10px] text-red-400/60">
                                                        Deleted:{" "}
                                                        {formatDateTime(
                                                            user.deleted_at,
                                                        )}
                                                    </p>

                                                    {/* REASON */}

                                                    {user.delete_reason && (
                                                        <div className="mt-2 rounded-lg border border-red-400/10 bg-red-400/5 px-3 py-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <FileText className="h-3 w-3 text-red-400/60" />

                                                                <p className="text-[9px] font-black uppercase tracking-wider text-red-400/60">
                                                                    Reason
                                                                </p>
                                                            </div>

                                                            <p className="mt-1 text-xs leading-5 text-white/60">
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
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-400/20 disabled:cursor-not-allowed disabled:opacity-50"
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

                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-3">
                            <p className="text-[10px] text-white/25">
                                {deletedUsers.length} deleted staff account
                                {deletedUsers.length !== 1 ? "s" : ""}
                            </p>

                            <button
                                type="button"
                                onClick={() => setShowDeletedModal(false)}
                                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-white/55 transition hover:border-yellow-400/20 hover:bg-yellow-400/[0.05] hover:text-white"
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
