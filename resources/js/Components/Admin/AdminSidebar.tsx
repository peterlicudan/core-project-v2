import { Link, router, usePage } from "@inertiajs/react";
import {
    LayoutDashboard,
    Users,
    UserCog,
    FileText,
    Receipt,
    CreditCard,
    FileCheck2,
    BarChart3,
    TrendingUp,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Menu,
    X,
    UserRoundCog,
    AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";

type AdminSidebarProps = {
    collapsed?: boolean;
    onToggle?: () => void;
};

const STORAGE_COLLAPSED = "alibaton_admin_sidebar_collapsed";

const STORAGE_SCROLL = "alibaton_admin_sidebar_scroll";

const LOGO_URL = "/images/logo.jpg";

export default function AdminSidebar({
    collapsed: controlledCollapsed,
    onToggle,
}: AdminSidebarProps) {
    const [internalCollapsed, setInternalCollapsed] = useState(false);

    const [mobileOpen, setMobileOpen] = useState(false);

    // ✅ LAGING SARADO SA SIMULA
    const [userManagementOpen, setUserManagementOpen] = useState(false);

    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    const [sidebarScroll, setSidebarScroll] = useState(0);

    // ✅ LOGOUT MODAL STATE
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const { url } = usePage();

    const collapsed =
        controlledCollapsed !== undefined
            ? controlledCollapsed
            : internalCollapsed;

    /*
    |--------------------------------------------------------------------------
    | RESTORE COLLAPSED + SCROLL ONLY
    | (Menus are NOT restored — they always start closed)
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        try {
            const savedCollapsed = localStorage.getItem(STORAGE_COLLAPSED);
            const savedScroll = localStorage.getItem(STORAGE_SCROLL);

            if (controlledCollapsed === undefined && savedCollapsed !== null) {
                setInternalCollapsed(savedCollapsed === "true");
            }

            if (savedScroll !== null) {
                setSidebarScroll(Number(savedScroll) || 0);
            }
        } catch {
            // Ignore localStorage errors.
        }
    }, [controlledCollapsed]);

    /*
    |--------------------------------------------------------------------------
    | SAVE COLLAPSED
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (controlledCollapsed !== undefined) {
            return;
        }

        try {
            localStorage.setItem(STORAGE_COLLAPSED, String(internalCollapsed));
        } catch {
            // Ignore localStorage errors.
        }
    }, [internalCollapsed, controlledCollapsed]);

    /*
    |--------------------------------------------------------------------------
    | AUTO OPEN USER MANAGEMENT (only when on its pages)
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (
            url.startsWith("/admin/client-accounts") ||
            url.startsWith("/admin/user-roles") ||
            url.startsWith("/admin/user-management")
        ) {
            setUserManagementOpen(true);
        }
    }, [url]);

    /*
    |--------------------------------------------------------------------------
    | AUTO OPEN ANALYTICS (only when on its pages)
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (
            url.startsWith("/admin/reports") ||
            url.startsWith("/admin/forecasting")
        ) {
            setAnalyticsOpen(true);
        }
    }, [url]);

    /*
    |--------------------------------------------------------------------------
    | RESTORE SIDEBAR SCROLL
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const element = document.getElementById(
            "alibaton-admin-sidebar-scroll",
        );

        if (!element) {
            return;
        }

        requestAnimationFrame(() => {
            element.scrollTop = sidebarScroll;
        });

        let saveTimer: ReturnType<typeof setTimeout> | null = null;

        const handleScroll = () => {
            const currentScroll = element.scrollTop;

            if (saveTimer) {
                clearTimeout(saveTimer);
            }

            saveTimer = setTimeout(() => {
                try {
                    localStorage.setItem(STORAGE_SCROLL, String(currentScroll));
                } catch {
                    // Ignore localStorage errors.
                }
            }, 120);
        };

        element.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            element.removeEventListener("scroll", handleScroll);

            if (saveTimer) {
                clearTimeout(saveTimer);
            }
        };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | TOGGLE SIDEBAR
    |--------------------------------------------------------------------------
    */

    const handleToggle = () => {
        if (onToggle) {
            onToggle();
            return;
        }

        setInternalCollapsed((previous) => !previous);
    };

    /*
    |--------------------------------------------------------------------------
    | MOBILE
    |--------------------------------------------------------------------------
    */

    const openMobileSidebar = () => {
        setMobileOpen(true);
    };

    const closeMobileSidebar = () => {
        setMobileOpen(false);
    };

    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        setShowLogoutModal(false);
        router.post("/admin/logout");
    };

    const cancelLogout = () => {
        setShowLogoutModal(false);
    };

    /*
    |--------------------------------------------------------------------------
    | ACTIVE
    |--------------------------------------------------------------------------
    */

    const isActive = (href: string) => {
        if (href === "/admin/dashboard") {
            return url === "/admin/dashboard" || url === "/admin/dashboard/";
        }

        return url === href || url.startsWith(`${href}/`);
    };

    /*
    |--------------------------------------------------------------------------
    | USER MANAGEMENT ACTIVE
    |--------------------------------------------------------------------------
    */

    const userManagementActive =
        url.startsWith("/admin/client-accounts") ||
        url.startsWith("/admin/user-roles") ||
        url.startsWith("/admin/user-management");

    /*
    |--------------------------------------------------------------------------
    | ANALYTICS ACTIVE
    |--------------------------------------------------------------------------
    */

    const analyticsActive =
        url.startsWith("/admin/reports") ||
        url.startsWith("/admin/forecasting");

    /*
    |--------------------------------------------------------------------------
    | USER MANAGEMENT ITEMS
    |--------------------------------------------------------------------------
    */

    const userManagementItems = [
        {
            label: "Staff Accounts",
            href: "/admin/client-accounts",
            icon: Users,
        },
        {
            label: "User Roles",
            href: "/admin/user-roles",
            icon: UserCog,
        },
    ];

    /*
    |--------------------------------------------------------------------------
    | NAV LINK
    |--------------------------------------------------------------------------
    */

    const renderMenuLink = (item: {
        label: string;
        href: string;
        icon: React.ElementType;
    }) => {
        const Icon = item.icon;

        const active = isActive(item.href);

        return (
            <Link
                key={item.href}
                href={item.href}
                preserveScroll
                onClick={() => {
                    setMobileOpen(false);

                    if (
                        item.href === "/admin/client-accounts" ||
                        item.href === "/admin/user-roles"
                    ) {
                        setUserManagementOpen(true);
                    }

                    if (
                        item.href === "/admin/reports" ||
                        item.href === "/admin/forecasting"
                    ) {
                        setAnalyticsOpen(true);
                    }
                }}
                className={`
                    group
                    relative
                    flex
                    min-h-11
                    items-center
                    gap-3
                    rounded-xl
                    px-3
                    py-3
                    transition-all
                    duration-200
                    ${
                        active
                            ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }
                    ${collapsed ? "lg:justify-center" : ""}
                `}
            >
                {active && (
                    <span
                        className="
                            absolute
                            left-0
                            h-7
                            w-1
                            rounded-r-full
                            bg-black
                        "
                    />
                )}

                <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={`
                        shrink-0
                        ${
                            active
                                ? "text-black"
                                : "text-gray-500 group-hover:text-yellow-400"
                        }
                    `}
                />

                <span
                    className={`
                        truncate
                        text-sm
                        font-medium
                        ${active ? "font-bold text-black" : ""}
                        ${collapsed ? "lg:hidden" : ""}
                    `}
                >
                    {item.label}
                </span>

                {collapsed && (
                    <span
                        className="
                            pointer-events-none
                            absolute
                            left-full
                            z-[70]
                            ml-3
                            hidden
                            whitespace-nowrap
                            rounded-lg
                            border
                            border-white/10
                            bg-black
                            px-3
                            py-2
                            text-xs
                            font-medium
                            text-white
                            opacity-0
                            shadow-xl
                            transition
                            group-hover:opacity-100
                            lg:block
                        "
                    >
                        {item.label}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <>
            {/* ============================================================
                SIDEBAR SCROLLBAR
            ============================================================ */}

            <style>
                {`
                    .admin-sidebar-scroll::-webkit-scrollbar {
                        width: 5px;
                    }

                    .admin-sidebar-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    .admin-sidebar-scroll::-webkit-scrollbar-thumb {
                        background: rgba(250, 204, 21, 0.18);
                        border-radius: 9999px;
                    }

                    .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
                        background: rgba(250, 204, 21, 0.50);
                    }

                    .admin-sidebar-scroll {
                        scrollbar-width: thin;
                        scrollbar-color:
                            rgba(250, 204, 21, 0.28)
                            transparent;
                    }
                `}
            </style>

            {/* ============================================================
                MOBILE TOP BAR — SOLID BLACK
            ============================================================ */}

            <div
                className="
                    fixed
                    left-0
                    right-0
                    top-0
                    z-40
                    flex
                    h-16
                    items-center
                    justify-between
                    border-b
                    border-yellow-400/10
                    bg-black
                    px-4
                    shadow-lg
                    shadow-black/30
                    lg:hidden
                "
            >
                <div
                    className="
                        flex
                        min-w-0
                        items-center
                        gap-3
                    "
                >
                    <div
                        className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            overflow-hidden
                            rounded-xl
                            border
                            border-yellow-400/20
                            bg-black
                            shadow-lg
                            shadow-yellow-400/10
                        "
                    >
                        <img
                            src={LOGO_URL}
                            alt="ALIBATON"
                            className="
                                h-full
                                w-full
                                object-cover
                            "
                        />
                    </div>

                    <div className="min-w-0">
                        <h1
                            className="
                                truncate
                                text-sm
                                font-black
                                tracking-widest
                                text-yellow-400
                            "
                        >
                            ALIBATON
                        </h1>

                        <p
                            className="
                                text-[9px]
                                uppercase
                                tracking-[0.15em]
                                text-gray-500
                            "
                        >
                            Admin Panel
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openMobileSidebar}
                    className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-white/10
                        bg-white/5
                        text-gray-300
                        transition
                        hover:border-yellow-400/30
                        hover:bg-yellow-400/10
                        hover:text-yellow-400
                    "
                    aria-label="Open admin menu"
                >
                    <Menu size={22} />
                </button>
            </div>

            {/* ============================================================
                MOBILE OVERLAY
            ============================================================ */}

            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close admin menu"
                    onClick={closeMobileSidebar}
                    className="
                        fixed
                        inset-0
                        z-40
                        bg-black/75
                        backdrop-blur-sm
                        lg:hidden
                    "
                />
            )}

            {/* ============================================================
                SIDEBAR — SOLID BLACK
            ============================================================ */}

            <aside
                className={`
                    fixed
                    left-0
                    top-0
                    z-50
                    flex
                    h-screen
                    flex-col
                    border-r
                    border-yellow-400/10
                    bg-black
                    text-white
                    shadow-2xl
                    shadow-black/60
                    transition-all
                    duration-300
                    ease-in-out
                    w-72
                    lg:translate-x-0
                    ${collapsed ? "lg:w-20" : "lg:w-72"}
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                {/* ========================================================
                    HEADER / LOGO
                ======================================================== */}

                <div
                    className="
                        relative
                        flex
                        h-20
                        shrink-0
                        items-center
                        border-b
                        border-white/10
                        px-4
                    "
                >
                    <div
                        className={`
                            flex
                            min-w-0
                            flex-1
                            items-center
                            ${collapsed ? "justify-center" : "gap-3"}
                        `}
                    >
                        <div
                            className={`
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                overflow-hidden
                                rounded-xl
                                border
                                border-yellow-400/20
                                bg-black
                                shadow-lg
                                shadow-yellow-400/10
                                transition-all
                                duration-300
                                ${collapsed ? "lg:h-12 lg:w-12" : ""}
                            `}
                        >
                            <img
                                src={LOGO_URL}
                                alt="ALIBATON Logo"
                                className="
                                    h-full
                                    w-full
                                    object-cover
                                "
                            />
                        </div>

                        {!collapsed && (
                            <div className="min-w-0">
                                <h1
                                    className="
                                        truncate
                                        text-lg
                                        font-black
                                        tracking-widest
                                        text-yellow-400
                                    "
                                >
                                    ALIBATON
                                </h1>

                                <p
                                    className="
                                        truncate
                                        text-[10px]
                                        font-medium
                                        uppercase
                                        tracking-[0.2em]
                                        text-gray-500
                                    "
                                >
                                    Admin Panel
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={closeMobileSidebar}
                        className="
                            rounded-lg
                            p-2
                            text-gray-400
                            transition
                            hover:bg-white/10
                            hover:text-yellow-400
                            lg:hidden
                        "
                        aria-label="Close admin menu"
                    >
                        <X size={21} />
                    </button>
                </div>

                {/* ========================================================
                    COLLAPSE BUTTON
                ======================================================== */}

                <button
                    type="button"
                    onClick={handleToggle}
                    className="
                        absolute
                        -right-4
                        top-6
                        z-[60]
                        hidden
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-yellow-400/30
                        bg-black
                        text-yellow-400
                        shadow-lg
                        shadow-black/50
                        transition-all
                        duration-200
                        hover:scale-110
                        hover:border-yellow-400
                        hover:bg-yellow-400
                        hover:text-black
                        lg:flex
                    "
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={
                        collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                >
                    {collapsed ? (
                        <ChevronRight size={18} strokeWidth={2.5} />
                    ) : (
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    )}
                </button>

                {/* ========================================================
                    SECTION LABEL
                ======================================================== */}

                {!collapsed && (
                    <div
                        className="
                            shrink-0
                            px-5
                            pb-2
                            pt-6
                        "
                    >
                        <p
                            className="
                                text-[10px]
                                font-bold
                                uppercase
                                tracking-[0.25em]
                                text-gray-500
                            "
                        >
                            Administration
                        </p>
                    </div>
                )}

                {/* ========================================================
                    NAVIGATION
                ======================================================== */}

                <nav
                    id="alibaton-admin-sidebar-scroll"
                    className="
                        admin-sidebar-scroll
                        min-h-0
                        flex-1
                        overflow-y-auto
                        overflow-x-hidden
                        overscroll-contain
                        px-3
                        py-3
                    "
                >
                    <div className="space-y-1.5">
                        {/* ==================================================
                            #1 — USER MANAGEMENT (dropdown)
                        ================================================== */}

                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (collapsed) {
                                        handleToggle();

                                        setUserManagementOpen(true);

                                        return;
                                    }

                                    setUserManagementOpen(
                                        (previous) => !previous,
                                    );
                                }}
                                className={`
                                    group
                                    relative
                                    flex
                                    min-h-11
                                    w-full
                                    items-center
                                    gap-3
                                    rounded-xl
                                    px-3
                                    py-3
                                    transition-all
                                    duration-200
                                    ${
                                        userManagementActive
                                            ? "bg-yellow-400/10 text-yellow-400"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }
                                    ${collapsed ? "lg:justify-center" : ""}
                                `}
                            >
                                {userManagementActive && (
                                    <span
                                        className="
                                            absolute
                                            left-0
                                            h-7
                                            w-1
                                            rounded-r-full
                                            bg-yellow-400
                                        "
                                    />
                                )}

                                <UserRoundCog
                                    size={20}
                                    strokeWidth={userManagementActive ? 2.5 : 2}
                                    className="
                                        shrink-0
                                        text-yellow-400
                                    "
                                />

                                <span
                                    className={`
                                        truncate
                                        text-sm
                                        font-semibold
                                        ${collapsed ? "lg:hidden" : ""}
                                    `}
                                >
                                    User Management
                                </span>

                                {!collapsed && (
                                    <ChevronDown
                                        size={17}
                                        className={`
                                            ml-auto
                                            shrink-0
                                            transition-transform
                                            duration-200
                                            ${
                                                userManagementOpen
                                                    ? "rotate-180"
                                                    : ""
                                            }
                                        `}
                                    />
                                )}

                                {collapsed && (
                                    <span
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-full
                                            z-[70]
                                            ml-3
                                            hidden
                                            whitespace-nowrap
                                            rounded-lg
                                            border
                                            border-white/10
                                            bg-black
                                            px-3
                                            py-2
                                            text-xs
                                            font-medium
                                            text-white
                                            opacity-0
                                            shadow-xl
                                            transition
                                            group-hover:opacity-100
                                            lg:block
                                        "
                                    >
                                        User Management
                                    </span>
                                )}
                            </button>

                            {!collapsed && userManagementOpen && (
                                <div
                                    className="
                                        ml-4
                                        mt-1
                                        space-y-1
                                        border-l
                                        border-yellow-400/10
                                        pl-3
                                    "
                                >
                                    {userManagementItems.map((item) =>
                                        renderMenuLink(item),
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ==================================================
                            #2 — DASHBOARD
                        ================================================== */}

                        {renderMenuLink({
                            label: "Dashboard",
                            href: "/admin/dashboard",
                            icon: LayoutDashboard,
                        })}

                        {/* ==================================================
                            #3 — BILLING & INVOICING
                        ================================================== */}

                        {renderMenuLink({
                            label: "Billing & Invoicing",
                            href: "/admin/billing",
                            icon: Receipt,
                        })}

                        {/* ==================================================
                            #4 — PAYMENT MANAGEMENT
                        ================================================== */}

                        {renderMenuLink({
                            label: "Payment Management",
                            href: "/admin/payments",
                            icon: CreditCard,
                        })}

                        {/* ==================================================
                            #5 — CONTRACT & PERMIT MANAGEMENT
                        ================================================== */}

                        {renderMenuLink({
                            label: "Contract & Permit Management",
                            href: "/admin/contracts",
                            icon: FileCheck2,
                        })}

                        {/* ==================================================
                            #6 — DOCUMENTS & REGULATORY COMPLIANCE
                        ================================================== */}

                        {renderMenuLink({
                            label: "Documents & Regulatory Compliance",
                            href: "/admin/documents-compliance",
                            icon: FileText,
                        })}

                        {/* ==================================================
                            #7 — ANALYTICS (dropdown)
                        ================================================== */}

                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (collapsed) {
                                        handleToggle();

                                        setAnalyticsOpen(true);

                                        return;
                                    }

                                    setAnalyticsOpen((previous) => !previous);
                                }}
                                className={`
                                    group
                                    relative
                                    flex
                                    min-h-11
                                    w-full
                                    items-center
                                    gap-3
                                    rounded-xl
                                    px-3
                                    py-3
                                    transition-all
                                    duration-200
                                    ${
                                        analyticsActive
                                            ? "bg-yellow-400/10 text-yellow-400"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }
                                    ${collapsed ? "lg:justify-center" : ""}
                                `}
                            >
                                {analyticsActive && (
                                    <span
                                        className="
                                            absolute
                                            left-0
                                            h-7
                                            w-1
                                            rounded-r-full
                                            bg-yellow-400
                                        "
                                    />
                                )}

                                <BarChart3
                                    size={20}
                                    strokeWidth={analyticsActive ? 2.5 : 2}
                                    className="
                                        shrink-0
                                        text-yellow-400
                                    "
                                />

                                <span
                                    className={`
                                        truncate
                                        text-sm
                                        font-semibold
                                        ${collapsed ? "lg:hidden" : ""}
                                    `}
                                >
                                    Analytics
                                </span>

                                {!collapsed && (
                                    <ChevronDown
                                        size={17}
                                        className={`
                                            ml-auto
                                            shrink-0
                                            transition-transform
                                            duration-200
                                            ${analyticsOpen ? "rotate-180" : ""}
                                        `}
                                    />
                                )}

                                {collapsed && (
                                    <span
                                        className="
                                            pointer-events-none
                                            absolute
                                            left-full
                                            z-[70]
                                            ml-3
                                            hidden
                                            whitespace-nowrap
                                            rounded-lg
                                            border
                                            border-white/10
                                            bg-black
                                            px-3
                                            py-2
                                            text-xs
                                            font-medium
                                            text-white
                                            opacity-0
                                            shadow-xl
                                            transition
                                            group-hover:opacity-100
                                            lg:block
                                        "
                                    >
                                        Analytics
                                    </span>
                                )}
                            </button>

                            {!collapsed && analyticsOpen && (
                                <div
                                    className="
                                        ml-4
                                        mt-1
                                        space-y-1
                                        border-l
                                        border-yellow-400/10
                                        pl-3
                                    "
                                >
                                    {renderMenuLink({
                                        label: "Reports",
                                        href: "/admin/reports",
                                        icon: FileText,
                                    })}

                                    {renderMenuLink({
                                        label: "Forecasting",
                                        href: "/admin/forecasting",
                                        icon: TrendingUp,
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ==================================================
                            #8 — SETTINGS
                        ================================================== */}

                        {renderMenuLink({
                            label: "Settings",
                            href: "/admin/settings",
                            icon: Settings,
                        })}
                    </div>
                </nav>

                {/* ========================================================
                    FOOTER
                ======================================================== */}

                <div
                    className="
                        shrink-0
                        border-t
                        border-white/10
                        p-3
                    "
                >
                    {!collapsed && (
                        <div
                            className="
                                mb-3
                                flex
                                items-center
                                gap-3
                                rounded-xl
                                bg-white/5
                                p-3
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    overflow-hidden
                                    rounded-full
                                    border
                                    border-yellow-400/20
                                    bg-black
                                "
                            >
                                <img
                                    src={LOGO_URL}
                                    alt="Administrator"
                                    className="
                                        h-full
                                        w-full
                                        object-cover
                                    "
                                />
                            </div>

                            <div className="min-w-0">
                                <p
                                    className="
                                        truncate
                                        text-sm
                                        font-semibold
                                        text-white
                                    "
                                >
                                    Administrator
                                </p>

                                <p
                                    className="
                                        truncate
                                        text-xs
                                        text-gray-500
                                    "
                                >
                                    System Admin
                                </p>
                            </div>
                        </div>
                    )}

                    {/* LOGOUT */}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className={`
                            group
                            relative
                            flex
                            min-h-11
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-3
                            text-gray-400
                            transition
                            hover:bg-red-500/10
                            hover:text-red-400
                            ${collapsed ? "lg:justify-center" : ""}
                        `}
                        title="Logout"
                    >
                        <LogOut
                            size={20}
                            className="
                                shrink-0
                            "
                        />

                        <span
                            className={`
                                text-sm
                                font-medium
                                ${collapsed ? "lg:hidden" : ""}
                            `}
                        >
                            Logout
                        </span>

                        {collapsed && (
                            <span
                                className="
                                    pointer-events-none
                                    absolute
                                    left-full
                                    z-[70]
                                    ml-3
                                    hidden
                                    whitespace-nowrap
                                    rounded-lg
                                    border
                                    border-red-500/20
                                    bg-black
                                    px-3
                                    py-2
                                    text-xs
                                    font-medium
                                    text-red-400
                                    opacity-0
                                    shadow-xl
                                    transition
                                    group-hover:opacity-100
                                    lg:block
                                "
                            >
                                Logout
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* ============================================================
                LOGOUT CONFIRMATION MODAL
            ============================================================ */}

            {showLogoutModal && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        bg-black/75
                        p-4
                        backdrop-blur-sm
                    "
                    onClick={cancelLogout}
                >
                    <div
                        className="
                            w-full
                            max-w-md
                            rounded-2xl
                            border
                            border-white/10
                            bg-zinc-900
                            p-6
                            shadow-2xl
                            shadow-black/60
                        "
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className="
                                    flex
                                    h-12
                                    w-12
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-red-500/10
                                "
                            >
                                <AlertTriangle
                                    size={24}
                                    className="text-red-400"
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3
                                    className="
                                        text-lg
                                        font-bold
                                        text-white
                                    "
                                >
                                    Confirm Logout
                                </h3>

                                <p
                                    className="
                                        mt-2
                                        text-sm
                                        leading-relaxed
                                        text-gray-400
                                    "
                                >
                                    Are you sure you want to logout from your
                                    admin account? You will need to sign in
                                    again to access the dashboard.
                                </p>
                            </div>
                        </div>

                        <div
                            className="
                                mt-6
                                flex
                                justify-end
                                gap-3
                            "
                        >
                            <button
                                type="button"
                                onClick={cancelLogout}
                                className="
                                    rounded-xl
                                    border
                                    border-white/10
                                    bg-white/5
                                    px-5
                                    py-2.5
                                    text-sm
                                    font-semibold
                                    text-white
                                    transition
                                    hover:bg-white/10
                                "
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmLogout}
                                className="
                                    rounded-xl
                                    bg-red-500
                                    px-5
                                    py-2.5
                                    text-sm
                                    font-semibold
                                    text-white
                                    transition
                                    hover:bg-red-600
                                "
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}