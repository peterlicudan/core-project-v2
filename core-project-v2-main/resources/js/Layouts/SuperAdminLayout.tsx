import React, { useEffect, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import ThemeToggle from "../Components/ThemeToggle";

import {
    HardHat,
    LayoutDashboard,
    UserCog,
    Activity,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Shield,
    FileText,
    DollarSign,
    Users,
    ClipboardCheck,
    BarChart3,
    UserCircle,
} from "lucide-react";

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
};

type NavItem = {
    label: string;
    route: string;
    fallback: string;
    icon: React.ReactNode;
    activePattern: string;
    disabled?: boolean;
};

type NavSection = {
    title: string;
    items: NavItem[];
};

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const { auth } = usePage<{ auth: { user: User } }>().props;
    const user = auth?.user;

    const currentUrl =
        typeof window !== "undefined"
            ? window.location.pathname
            : "";

    /*
    |----------------------------------------------------------------------
    | ESC KEY TO CLOSE LOGOUT MODAL
    |----------------------------------------------------------------------
    */
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showLogoutModal) {
                setShowLogoutModal(false);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [showLogoutModal]);

    const getRoute = (name: string, fallback: string) => {
        if (
            typeof window !== "undefined" &&
            typeof (window as any).route === "function"
        ) {
            try {
                return (window as any).route(name);
            } catch {
                return fallback;
            }
        }

        return fallback;
    };

    const isActive = (pattern: string) => {
        return currentUrl.startsWith(pattern);
    };

    /*
    |----------------------------------------------------------------------
    | LOGOUT HANDLERS
    |----------------------------------------------------------------------
    */
    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        setShowLogoutModal(false);
        router.post(
            getRoute(
                "superadmin.logout",
                "/superadmin/logout"
            )
        );
    };

    const cancelLogout = () => {
        setShowLogoutModal(false);
    };

    const navigation: NavSection[] = [
        {
            title: "Main",
            items: [
                {
                    label: "Dashboard",
                    route: "superadmin.dashboard",
                    fallback: "/superadmin/dashboard",
                    icon: <LayoutDashboard size={18} />,
                    activePattern: "/superadmin/dashboard",
                },
            ],
        },

        {
            title: "Management",
            items: [
                {
                    label: "Admin Management",
                    route: "superadmin.admins.index",
                    fallback: "/superadmin/admins",
                    icon: <UserCog size={18} />,
                    activePattern: "/superadmin/admins",
                },
                {
                    label: "Staff Management",
                    route: "superadmin.staff.index",
                    fallback: "/superadmin/staff",
                    icon: <Users size={18} />,
                    activePattern: "/superadmin/staff",
                },
            ],
        },

        {
            title: "Monitoring",
            items: [
                {
                    label: "Activity Logs",
                    route: "superadmin.logs.index",
                    fallback: "/superadmin/logs",
                    icon: <Activity size={18} />,
                    activePattern: "/superadmin/logs",
                },
                {
                    label: "Documents Monitoring",
                    route: "superadmin.documents",
                    fallback: "/superadmin/documents",
                    icon: <FileText size={18} />,
                    activePattern: "/superadmin/documents",
                },
                {
                    label: "Financial Monitoring",
                    route: "superadmin.financial",
                    fallback: "/superadmin/financial",
                    icon: <DollarSign size={18} />,
                    activePattern: "/superadmin/financial",
                },
                {
                    label: "Compliance Monitoring",
                    route: "superadmin.compliance.index",
                    fallback: "/superadmin/compliance",
                    icon: <ClipboardCheck size={18} />,
                    activePattern: "/superadmin/compliance",
                },
                {
                    label: "System Reports",
                    route: "superadmin.reports.index",
                    fallback: "/superadmin/reports",
                    icon: <BarChart3 size={18} />,
                    activePattern: "/superadmin/reports",
                },
            ],
        },

        {
            title: "System",
            items: [
                {
                    label: "Settings",
                    route: "superadmin.settings",
                    fallback: "/superadmin/settings",
                    icon: <Settings size={18} />,
                    activePattern: "/superadmin/settings",
                },
            ],
        },

        {
            title: "Account",
            items: [
                {
                    label: "My Profile",
                    route: "superadmin.profile.edit",
                    fallback: "/superadmin/profile",
                    icon: <UserCircle size={18} />,
                    activePattern: "/superadmin/profile",
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050810] text-slate-900 dark:text-slate-100 font-sans">

            {/* MOBILE OVERLAY */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside
                className={`
                    fixed top-0 left-0 h-screen w-[260px] z-50
                    bg-white dark:bg-[#0A0F1D]
                    border-r border-slate-200 dark:border-slate-800/80
                    flex flex-col
                    transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${
                        sidebarOpen
                            ? "translate-x-0"
                            : "-translate-x-full"
                    }
                `}
            >

                {/* BRAND */}
                <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">

                    <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 dark:from-[#121929] to-white dark:to-[#0A0F1D] border border-amber-500/30 flex items-center justify-center shrink-0">
                            <HardHat
                                size={20}
                                className="text-amber-400"
                            />
                        </div>

                        <div>
                            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">
                                ALI
                                <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                                    BATON
                                </span>
                            </h1>

                            <p className="text-[9px] tracking-[0.15em] text-amber-400/80 uppercase font-semibold mt-1">
                                Super Admin
                            </p>
                        </div>

                    </div>

                    {/* MOBILE CLOSE */}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close sidebar"
                        className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    >
                        <X size={18} />
                    </button>

                </div>

                {/* NAVIGATION */}
                <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-5">

                    {navigation.map((section) => (

                        <div key={section.title}>

                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-3 mb-2">
                                {section.title}
                            </p>

                            <div className="space-y-0.5">

                                {section.items.map((item) => {

                                    const active =
                                        !item.disabled &&
                                        isActive(item.activePattern);

                                    // DISABLED ITEMS
                                    if (item.disabled) {
                                        return (
                                            <div
                                                key={item.label}
                                                aria-disabled="true"
                                                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 dark:text-slate-600 border border-transparent cursor-not-allowed opacity-60"
                                            >
                                                <span className="text-slate-400 dark:text-slate-600">
                                                    {item.icon}
                                                </span>

                                                <span className="flex-1">
                                                    {item.label}
                                                </span>
                                            </div>
                                        );
                                    }

                                    // ACTIVE / ENABLED ITEMS
                                    return (
                                        <Link
                                            key={item.label}
                                            href={getRoute(
                                                item.route,
                                                item.fallback
                                            )}
                                            onClick={() =>
                                                setSidebarOpen(false)
                                            }
                                            aria-current={
                                                active ? "page" : undefined
                                            }
                                            className={`
                                                group flex items-center gap-3
                                                px-3 py-2.5 rounded-lg
                                                text-sm font-medium
                                                transition-all duration-200
                                                ${
                                                    active
                                                        ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shadow-sm"
                                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                                }
                                            `}
                                        >
                                            <span
                                                className={
                                                    active
                                                        ? "text-amber-500 dark:text-amber-400"
                                                        : "text-slate-600 dark:text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400"
                                                }
                                            >
                                                {item.icon}
                                            </span>

                                            <span className="flex-1">
                                                {item.label}
                                            </span>

                                            {active && (
                                                <ChevronRight
                                                    size={14}
                                                    className="text-amber-400"
                                                />
                                            )}
                                        </Link>
                                    );

                                })}

                            </div>

                        </div>

                    ))}

                </nav>

                {/* USER INFO */}
                <div className="border-t border-slate-200 dark:border-slate-800/80 p-3 shrink-0">

                    <div className="flex items-center gap-2.5 px-2 py-2">

                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
                            <Shield
                                size={16}
                                className="text-[#0A0F1D]"
                            />
                        </div>

                        <div className="flex-1 min-w-0">

                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {user?.name ?? "Super Admin"}
                            </p>

                            <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                                {user?.email}
                            </p>

                        </div>

                    </div>

                    {/* LOGOUT — opens modal */}
                    <button
                        type="button"
                        onClick={handleLogoutClick}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all mt-1"
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>

                </div>

            </aside>

            {/* MAIN CONTENT */}
            <div className="lg:pl-[260px]">

                {/* TOP BAR */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0A0F1D]/80 backdrop-blur-xl sticky top-0 z-30">

                    <div className="h-full px-4 sm:px-6 flex items-center justify-between">

                        {/* LEFT */}
                        <div className="flex items-center gap-3">

                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open sidebar"
                                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                            >
                                <Menu size={20} />
                            </button>

                            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">

                                <span>Super Admin</span>

                                <ChevronRight size={12} />

                                <span className="text-slate-900 dark:text-white font-medium">
                                    {getPageTitle(currentUrl)}
                                </span>

                            </div>

                        </div>

                        {/* RIGHT */}
                        <div className="flex items-center gap-2">

                            <span className="hidden sm:inline-block text-xs text-slate-600 dark:text-slate-400">
                                {user?.email}
                            </span>

                            <ThemeToggle />

                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                                <Shield
                                    size={14}
                                    className="text-[#0A0F1D]"
                                />
                            </div>

                        </div>

                    </div>

                </header>

                {/* PAGE CONTENT */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>

            </div>

            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutModal && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) cancelLogout();
                    }}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0A0F1D]"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 mb-4">
                                <LogOut
                                    size={24}
                                    className="text-rose-500 dark:text-rose-400"
                                />
                            </div>

                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Are you sure to logout?
                            </h2>

                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                You will be signed out of your superadmin account.
                            </p>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <button
                                type="button"
                                onClick={cancelLogout}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmLogout}
                                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// PAGE TITLE
function getPageTitle(url: string): string {

    if (url.includes("/superadmin/dashboard"))
        return "Dashboard";

    if (url.includes("/superadmin/admins"))
        return "Admin Management";

    if (url.includes("/superadmin/staff"))
        return "Staff Management";

    if (url.includes("/superadmin/logs"))
        return "Activity Logs";

    if (url.includes("/superadmin/documents"))
        return "Documents Monitoring";

    if (url.includes("/superadmin/financial"))
        return "Financial Monitoring";

    if (url.includes("/superadmin/compliance"))
        return "Compliance Monitoring";

    if (url.includes("/superadmin/reports"))
        return "System Reports";

    if (url.includes("/superadmin/settings"))
        return "Settings";

    if (url.includes("/superadmin/profile"))
        return "My Profile";

    return "Dashboard";
}