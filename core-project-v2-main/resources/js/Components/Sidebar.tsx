import { Link, router, usePage } from "@inertiajs/react";

import {
    LayoutDashboard,
    FileText,
    CreditCard,
    ClipboardList,
    ShieldCheck,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    X,
    Menu,
    FileBarChart,
    TrendingUp,
} from "lucide-react";

import { useEffect, useState } from "react";


import { useTheme } from "../Context/ThemeContext";

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);

    const { isDarkMode } = useTheme();

    const page = usePage<any>();

    const url = page.url;
    const user = page.props.auth?.user;

    /*
    |--------------------------------------------------------------------------
    | EMAIL MASK HELPER
    |--------------------------------------------------------------------------
    */

    const maskEmail = (email?: string | null): string => {
        if (!email) return "No email";

        const atIndex = email.indexOf("@");

        if (atIndex <= 0) return email;

        const localPart = email.slice(0, atIndex);
        const domain = email.slice(atIndex);

        if (localPart.length <= 8) {
            return `${localPart.slice(0, 3)}****${domain}`;
        }

        const visibleStart = localPart.slice(0, 5);
        const visibleEnd = localPart.slice(-3);
        const hiddenLength = localPart.length - 8;
        const asterisks = "*".repeat(Math.max(hiddenLength, 4));

        return `${visibleStart}${asterisks}${visibleEnd}${domain}`;
    };

    /*
    |--------------------------------------------------------------------------
    | ANALYTICS ACTIVE STATE
    |--------------------------------------------------------------------------
    */

    const isAnalyticsSection =
        url === "/analytics" ||
        url.startsWith("/analytics/") ||
        url === "/reports" ||
        url.startsWith("/reports/") ||
        url === "/forecasting" ||
        url.startsWith("/forecasting/");

    /*
    |--------------------------------------------------------------------------
    | AUTOMATICALLY OPEN ANALYTICS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (isAnalyticsSection) {
            setAnalyticsOpen(true);
        }
    }, [isAnalyticsSection]);

    /*
    |--------------------------------------------------------------------------
    | MAIN MENU
    |--------------------------------------------------------------------------
    */

    const menuItems = [
        {
            name: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
        },
        {
            name: "Billing & Invoicing",
            icon: FileText,
            href: "/billing-invoicing",
        },
        {
            name: "Records and Payment Management",
            icon: CreditCard,
            href: "/payment-management",
        },
        {
            name: "Contract & Permit Management",
            icon: ClipboardList,
            href: "/contract-permit",
        },
        {
            name: "Documents & Regulatory Compliance",
            icon: ShieldCheck,
            href: "/compliance",
        },
    ];

    /*
    |--------------------------------------------------------------------------
    | ANALYTICS SUBMENU
    |--------------------------------------------------------------------------
    */

    const analyticsItems = [
        {
            name: "Reports",
            icon: FileBarChart,
            href: "/reports",
        },
        {
            name: "Forecasting",
            icon: TrendingUp,
            href: "/forecasting",
        },
    ];

    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    const logout = () => {
        router.post("/logout");
    };

    /*
    |--------------------------------------------------------------------------
    | MOBILE NAVIGATION
    |--------------------------------------------------------------------------
    */

    const handleNavigation = () => {
        setMobileOpen(false);
    };

    /*
    |--------------------------------------------------------------------------
    | ACTIVE CHECK
    |--------------------------------------------------------------------------
    */

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return url === "/dashboard" || url === "/dashboard/";
        }

        return url === href || url.startsWith(`${href}/`);
    };

    /*
    |--------------------------------------------------------------------------
    | ANALYTICS TOGGLE
    |--------------------------------------------------------------------------
    */

    const toggleAnalytics = () => {
        if (collapsed) {
            setCollapsed(false);
            setAnalyticsOpen(true);
            return;
        }

        setAnalyticsOpen((current) => !current);
    };

    /*
    |--------------------------------------------------------------------------
    | THEME CLASSES
    |--------------------------------------------------------------------------
    */

    const sidebarBackground = isDarkMode
        ? "bg-black text-white border-yellow-400/10"
        : "bg-white text-gray-900 border-gray-200";

    const secondaryText = isDarkMode
        ? "text-slate-400"
        : "text-gray-600";

    const mutedText = isDarkMode
        ? "text-slate-500"
        : "text-gray-500";

    const veryMutedText = isDarkMode
        ? "text-slate-600"
        : "text-gray-400";

    const hoverMenu = isDarkMode
        ? "hover:bg-white/[0.035] hover:text-yellow-400"
        : "hover:bg-yellow-50 hover:text-yellow-600";

    const tooltipClass = isDarkMode
        ? "border-white/10 bg-zinc-950 text-white"
        : "border-gray-200 bg-white text-gray-900";

    return (
        <>
            {/* =====================================================
                CUSTOM SCROLLBAR
            ====================================================== */}

            <style>
                {`
                    .user-sidebar-scroll::-webkit-scrollbar {
                        width: 5px;
                    }

                    .user-sidebar-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    .user-sidebar-scroll::-webkit-scrollbar-thumb {
                        background: rgba(250, 204, 21, 0.18);
                        border-radius: 9999px;
                    }

                    .user-sidebar-scroll::-webkit-scrollbar-thumb:hover {
                        background: rgba(250, 204, 21, 0.42);
                    }

                    .user-sidebar-scroll {
                        scrollbar-width: thin;
                        scrollbar-color:
                            rgba(250, 204, 21, 0.24)
                            transparent;
                    }
                `}
            </style>

            {/* =====================================================
                MOBILE HEADER
            ====================================================== */}

            <header
                className={`
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
                    px-4
                    shadow-lg
                    backdrop-blur-2xl
                    transition-colors
                    duration-300
                    md:hidden
                    ${
                        isDarkMode
                            ? "border-yellow-400/10 bg-black/95 shadow-black/20"
                            : "border-gray-200 bg-white/95 shadow-gray-200/50"
                    }
                `}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            border
                            transition
                            ${
                                isDarkMode
                                    ? "border-white/10 bg-white/[0.03] text-slate-300 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-400"
                                    : "border-gray-200 bg-gray-100 text-gray-600 hover:border-yellow-400/50 hover:bg-yellow-50 hover:text-yellow-600"
                            }
                        `}
                        aria-label="Open sidebar"
                    >
                        <Menu size={21} />
                    </button>

                    {/* MOBILE LOGO */}

                    <div
                        className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            overflow-hidden
                            rounded-xl
                            border
                            border-yellow-400/20
                            shadow-lg
                            shadow-yellow-400/10
                            ${
                                isDarkMode
                                    ? "bg-zinc-950"
                                    : "bg-gray-100"
                            }
                        `}
                    >
                        <img
                            src="/images/logo.jpg"
                            alt="ALIBATON"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <div className="min-w-0">
                        <p
                            className={`
                                truncate
                                text-[9px]
                                font-semibold
                                uppercase
                                tracking-[0.16em]
                                ${mutedText}
                            `}
                        >
                            Heavy Equipment
                        </p>

                        <p
                            className={`
                                truncate
                                text-[8px]
                                uppercase
                                tracking-[0.13em]
                                ${veryMutedText}
                            `}
                        >
                            Logistics System
                        </p>
                    </div>
                </div>


            </header>

            {/* =====================================================
                MOBILE OVERLAY
            ====================================================== */}

            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    onClick={() => setMobileOpen(false)}
                    className={`
                        fixed
                        inset-0
                        z-40
                        backdrop-blur-sm
                        md:hidden
                        ${
                            isDarkMode
                                ? "bg-black/70"
                                : "bg-gray-900/30"
                        }
                    `}
                />
            )}

            {/* =====================================================
                SIDEBAR
            ====================================================== */}

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
                    shadow-[20px_0_60px_rgba(0,0,0,0.20)]
                    transition-all
                    duration-300
                    ease-in-out

                    w-[285px]
                    max-w-[86vw]

                    ${collapsed ? "md:w-[76px]" : "md:w-[270px]"}

                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}

                    md:sticky
                    md:top-0
                    md:translate-x-0

                    ${sidebarBackground}
                `}
            >
                {/* =================================================
                    BRAND HEADER
                ================================================== */}

                <div
                    className={`
                        flex
                        h-20
                        shrink-0
                        items-center
                        border-b
                        ${
                            isDarkMode
                                ? "border-yellow-400/10"
                                : "border-gray-200"
                        }
                        ${
                            collapsed
                                ? "justify-center px-3"
                                : "justify-between px-4"
                        }
                    `}
                >
                    <div
                        className={`
                            flex
                            min-w-0
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
                                shadow-lg
                                shadow-yellow-400/10
                                ${
                                    isDarkMode
                                        ? "bg-zinc-950"
                                        : "bg-gray-100"
                                }
                            `}
                        >
                            <img
                                src="/images/logo.jpg"
                                alt="ALIBATON"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        {!collapsed && (
                            <div className="min-w-0">
                                <p
                                    className={`
                                        truncate
                                        text-[10px]
                                        font-semibold
                                        uppercase
                                        tracking-[0.16em]
                                        ${secondaryText}
                                    `}
                                >
                                    Heavy Equipment
                                </p>

                                <p
                                    className={`
                                        truncate
                                        text-[9px]
                                        uppercase
                                        tracking-[0.13em]
                                        ${veryMutedText}
                                    `}
                                >
                                    Logistics System
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className={`
                            rounded-xl
                            p-2
                            transition
                            md:hidden
                            ${
                                isDarkMode
                                    ? "text-slate-500 hover:bg-white/5 hover:text-yellow-400"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-yellow-600"
                            }
                        `}
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* =================================================
                    COLLAPSE BUTTON
                ================================================== */}

                <button
                    type="button"
                    onClick={() => setCollapsed((current) => !current)}
                    className={`
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
                        border-yellow-400/25
                        bg-yellow-400
                        text-black
                        shadow-xl
                        transition-all
                        duration-200
                        hover:scale-110
                        hover:border-yellow-400/60
                        hover:bg-yellow-300
                        md:flex
                    `}
                    aria-label={
                        collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                    title={
                        collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                >
                    {collapsed ? (
                        <ChevronRight size={17} strokeWidth={2.5} />
                    ) : (
                        <ChevronLeft size={17} strokeWidth={2.5} />
                    )}
                </button>

                {/* =================================================
                    USER PROFILE
                ================================================== */}

                {!collapsed && (
                    <div className="shrink-0 px-4 pt-4">
                        <div
                            className={`
                                rounded-2xl
                                border
                                px-4
                                py-3
                                transition-colors
                                duration-300
                                ${
                                    isDarkMode
                                        ? "border-yellow-400/10 bg-gradient-to-br from-yellow-400/[0.07] via-white/[0.025] to-transparent"
                                        : "border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-gray-50"
                                }
                            `}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p
                                        className={`
                                            text-[9px]
                                            font-semibold
                                            uppercase
                                            tracking-[0.15em]
                                            ${veryMutedText}
                                        `}
                                    >
                                        Signed in as
                                    </p>

                                    <p
                                        className={`
                                            mt-1
                                            truncate
                                            text-sm
                                            font-semibold
                                            ${
                                                isDarkMode
                                                    ? "text-white"
                                                    : "text-gray-900"
                                            }
                                        `}
                                    >
                                        {user?.name ?? "User"}
                                    </p>

                                    <p
                                        className={`
                                            mt-0.5
                                            truncate
                                            text-[11px]
                                            ${mutedText}
                                        `}
                                        title={user?.email ?? "No email"}
                                    >
                                        {maskEmail(user?.email)}
                                    </p>
                                </div>

                                <div
                                    className="
                                        h-2
                                        w-2
                                        shrink-0
                                        rounded-full
                                        bg-emerald-400
                                        shadow-lg
                                        shadow-emerald-400/40
                                    "
                                    title="Online"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* =================================================
                    NAVIGATION
                ================================================== */}

                <nav
                    className="
                        user-sidebar-scroll
                        min-h-0
                        flex-1
                        overflow-y-auto
                        overflow-x-hidden
                        px-3
                        py-5
                    "
                >
                    {!collapsed && (
                        <p
                            className={`
                                mb-2
                                px-3
                                text-[9px]
                                font-bold
                                uppercase
                                tracking-[0.18em]
                                ${veryMutedText}
                            `}
                        >
                            Main Menu
                        </p>
                    )}

                    <div className="space-y-1.5">
                        {/* =========================================
                            MAIN MENU ITEMS
                        ========================================== */}

                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <div key={item.name} className="relative">
                                    <Link
                                        href={item.href}
                                        onClick={handleNavigation}
                                        className={`
                                            group
                                            relative
                                            flex
                                            min-h-[45px]
                                            items-center
                                            gap-3
                                            rounded-xl
                                            px-3
                                            transition-all
                                            duration-200

                                            ${
                                                collapsed
                                                    ? "justify-center"
                                                    : ""
                                            }

                                            ${
                                                active
                                                    ? "bg-yellow-400 font-semibold text-black shadow-[0_8px_25px_rgba(250,204,21,0.14)]"
                                                    : `${secondaryText} ${hoverMenu}`
                                            }
                                        `}
                                    >
                                        {active && (
                                            <span
                                                className="
                                                    absolute
                                                    bottom-2
                                                    left-0
                                                    top-2
                                                    w-1
                                                    rounded-r-full
                                                    bg-black/60
                                                "
                                            />
                                        )}

                                        <Icon
                                            size={18}
                                            strokeWidth={active ? 2.5 : 2}
                                            className="
                                                shrink-0
                                                transition-transform
                                                duration-200
                                                group-hover:scale-105
                                            "
                                        />

                                        {!collapsed && (
                                            <span
                                                className="
                                                    min-w-0
                                                    flex-1
                                                    truncate
                                                    text-[13px]
                                                "
                                            >
                                                {item.name}
                                            </span>
                                        )}

                                        {collapsed && (
                                            <span
                                                className={`
                                                    pointer-events-none
                                                    absolute
                                                    left-full
                                                    z-[80]
                                                    ml-3
                                                    hidden
                                                    whitespace-nowrap
                                                    rounded-lg
                                                    border
                                                    px-3
                                                    py-2
                                                    text-xs
                                                    font-semibold
                                                    opacity-0
                                                    shadow-2xl
                                                    transition
                                                    group-hover:opacity-100
                                                    md:block
                                                    ${tooltipClass}
                                                `}
                                            >
                                                {item.name}
                                            </span>
                                        )}
                                    </Link>
                                </div>
                            );
                        })}

                        {/* =========================================
                            ANALYTICS
                        ========================================== */}

                        <div className="relative">
                            <button
                                type="button"
                                onClick={toggleAnalytics}
                                className={`
                                    group
                                    relative
                                    flex
                                    min-h-[45px]
                                    w-full
                                    items-center
                                    gap-3
                                    rounded-xl
                                    px-3
                                    transition-all
                                    duration-200

                                    ${
                                        isAnalyticsSection
                                            ? "bg-yellow-400 font-semibold text-black shadow-[0_8px_25px_rgba(250,204,21,0.14)]"
                                            : `${secondaryText} ${hoverMenu}`
                                    }

                                    ${collapsed ? "justify-center" : ""}
                                `}
                            >
                                {isAnalyticsSection && (
                                    <span
                                        className="
                                            absolute
                                            bottom-2
                                            left-0
                                            top-2
                                            w-1
                                            rounded-r-full
                                            bg-black/60
                                        "
                                    />
                                )}

                                <BarChart3
                                    size={18}
                                    strokeWidth={
                                        isAnalyticsSection ? 2.5 : 2
                                    }
                                    className="shrink-0"
                                />

                                {!collapsed && (
                                    <>
                                        <span
                                            className="
                                                min-w-0
                                                flex-1
                                                truncate
                                                text-left
                                                text-[13px]
                                            "
                                        >
                                            Analytics
                                        </span>

                                        {analyticsOpen ? (
                                            <ChevronUp
                                                size={15}
                                                className="shrink-0"
                                            />
                                        ) : (
                                            <ChevronDown
                                                size={15}
                                                className="shrink-0"
                                            />
                                        )}
                                    </>
                                )}

                                {collapsed && (
                                    <span
                                        className={`
                                            pointer-events-none
                                            absolute
                                            left-full
                                            z-[80]
                                            ml-3
                                            hidden
                                            whitespace-nowrap
                                            rounded-lg
                                            border
                                            px-3
                                            py-2
                                            text-xs
                                            font-semibold
                                            opacity-0
                                            shadow-2xl
                                            transition
                                            group-hover:opacity-100
                                            md:block
                                            ${tooltipClass}
                                        `}
                                    >
                                        Analytics
                                    </span>
                                )}
                            </button>

                            {/* =====================================
                                ANALYTICS SUBMENU
                            ====================================== */}

                            {!collapsed && analyticsOpen && (
                                <div
                                    className={`
                                        ml-4
                                        mt-1
                                        space-y-1
                                        border-l
                                        pl-3
                                        ${
                                            isDarkMode
                                                ? "border-yellow-400/15"
                                                : "border-yellow-300"
                                        }
                                    `}
                                >
                                    {analyticsItems.map((item) => {
                                        const Icon = item.icon;
                                        const active = isActive(item.href);

                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={handleNavigation}
                                                className={`
                                                    group
                                                    flex
                                                    min-h-[40px]
                                                    items-center
                                                    gap-3
                                                    rounded-lg
                                                    px-3
                                                    text-[12px]
                                                    transition-all
                                                    duration-200

                                                    ${
                                                        active
                                                            ? "bg-yellow-400/15 font-semibold text-yellow-500"
                                                            : `${mutedText} ${hoverMenu}`
                                                    }
                                                `}
                                            >
                                                <Icon
                                                    size={16}
                                                    strokeWidth={
                                                        active ? 2.5 : 2
                                                    }
                                                    className="shrink-0"
                                                />

                                                <span className="truncate">
                                                    {item.name}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* =================================================
                        SYSTEM
                    ================================================== */}

                    {!collapsed && (
                        <p
                            className={`
                                mb-2
                                mt-7
                                px-3
                                text-[9px]
                                font-bold
                                uppercase
                                tracking-[0.18em]
                                ${veryMutedText}
                            `}
                        >
                            System
                        </p>
                    )}

                    {(() => {
                        const active =
                            url === "/settings" ||
                            url.startsWith("/settings/");

                        return (
                            <Link
                                href="/settings"
                                onClick={handleNavigation}
                                className={`
                                    group
                                    relative
                                    flex
                                    min-h-[45px]
                                    items-center
                                    gap-3
                                    rounded-xl
                                    px-3
                                    transition-all
                                    duration-200

                                    ${
                                        active
                                            ? "bg-yellow-400 font-semibold text-black shadow-[0_8px_25px_rgba(250,204,21,0.14)]"
                                            : `${secondaryText} ${hoverMenu}`
                                    }

                                    ${collapsed ? "justify-center" : ""}
                                `}
                            >
                                {active && (
                                    <span
                                        className="
                                            absolute
                                            bottom-2
                                            left-0
                                            top-2
                                            w-1
                                            rounded-r-full
                                            bg-black/60
                                        "
                                    />
                                )}

                                <Settings
                                    size={18}
                                    strokeWidth={active ? 2.5 : 2}
                                    className="shrink-0"
                                />

                                {!collapsed && (
                                    <span className="text-[13px]">
                                        Settings
                                    </span>
                                )}

                                {collapsed && (
                                    <span
                                        className={`
                                            pointer-events-none
                                            absolute
                                            left-full
                                            z-[80]
                                            ml-3
                                            hidden
                                            whitespace-nowrap
                                            rounded-lg
                                            border
                                            px-3
                                            py-2
                                            text-xs
                                            font-semibold
                                            opacity-0
                                            shadow-2xl
                                            transition
                                            group-hover:opacity-100
                                            md:block
                                            ${tooltipClass}
                                        `}
                                    >
                                        Settings
                                    </span>
                                )}
                            </Link>
                        );
                    })()}
                </nav>

                {/* =====================================================
                    BOTTOM
                ====================================================== */}

                <div
                    className={`
                        shrink-0
                        border-t
                        p-3
                        ${
                            isDarkMode
                                ? "border-yellow-400/10"
                                : "border-gray-200"
                        }
                    `}
                >
                    <button
                        type="button"
                        onClick={() => setShowLogoutModal(true)}
                        className={`
                            group
                            relative
                            flex
                            min-h-[45px]
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            text-red-500
                            transition
                            hover:bg-red-500/10
                            hover:text-red-400

                            ${collapsed ? "justify-center" : ""}
                        `}
                    >
                        <LogOut size={18} className="shrink-0" />

                        {!collapsed && (
                            <span className="text-[13px] font-medium">
                                Logout
                            </span>
                        )}

                        {collapsed && (
                            <span
                                className={`
                                    pointer-events-none
                                    absolute
                                    left-full
                                    z-[80]
                                    ml-3
                                    hidden
                                    whitespace-nowrap
                                    rounded-lg
                                    border
                                    border-red-500/20
                                    px-3
                                    py-2
                                    text-xs
                                    font-semibold
                                    text-red-500
                                    opacity-0
                                    shadow-2xl
                                    transition
                                    group-hover:opacity-100
                                    md:block
                                    ${
                                        isDarkMode
                                            ? "bg-zinc-950"
                                            : "bg-white"
                                    }
                                `}
                            >
                                Logout
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* =====================================================
                LOGOUT MODAL
            ====================================================== */}

            {showLogoutModal && (
                <div
                    className={`
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        p-4
                        backdrop-blur-md
                        ${
                            isDarkMode
                                ? "bg-black/75"
                                : "bg-gray-900/35"
                        }
                    `}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowLogoutModal(false);
                        }
                    }}
                >
                    <div
                        className={`
                            w-full
                            max-w-sm
                            rounded-3xl
                            border
                            p-6
                            shadow-2xl
                            transition-colors
                            duration-300
                            ${
                                isDarkMode
                                    ? "border-yellow-400/10 bg-zinc-950 shadow-black/60"
                                    : "border-gray-200 bg-white shadow-gray-400/30"
                            }
                        `}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p
                                    className="
                                        text-[9px]
                                        font-bold
                                        uppercase
                                        tracking-[0.18em]
                                        text-yellow-500
                                    "
                                >
                                    ALIBATON SYSTEM
                                </p>

                                <h2
                                    className={`
                                        mt-1
                                        text-xl
                                        font-bold
                                        ${
                                            isDarkMode
                                                ? "text-white"
                                                : "text-gray-900"
                                        }
                                    `}
                                >
                                    Logout?
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className={`
                                    rounded-xl
                                    p-2
                                    transition
                                    ${
                                        isDarkMode
                                            ? "text-slate-500 hover:bg-white/5 hover:text-white"
                                            : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                                    }
                                `}
                                aria-label="Close logout modal"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <p
                            className={`
                                mt-4
                                text-sm
                                leading-relaxed
                                ${
                                    isDarkMode
                                        ? "text-slate-400"
                                        : "text-gray-600"
                                }
                            `}
                        >
                            Are you sure you want to logout
                            from the ALIBATON system?
                        </p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className={`
                                    flex-1
                                    rounded-xl
                                    border
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-medium
                                    transition
                                    ${
                                        isDarkMode
                                            ? "border-white/10 text-slate-300 hover:bg-white/5"
                                            : "border-gray-200 text-gray-700 hover:bg-gray-100"
                                    }
                                `}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={logout}
                                className="
                                    flex-1
                                    rounded-xl
                                    bg-yellow-400
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-bold
                                    text-black
                                    transition
                                    hover:bg-yellow-300
                                "
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
