import React, { ReactNode, useState } from "react";
import { Head, router } from "@inertiajs/react";
import AdminSidebar from "../Components/Admin/AdminSidebar";
import IdleWarningModal from "../Components/IdleWarningModal";
import AdminNotificationBell from "../Components/Admin/AdminNotificationBell";

import { useIdleLogout } from "../Hooks/useIdleLogout";
import useScreenActivity from "../Hooks/useScreenActivity";

type AdminLayoutProps = {
    children: ReactNode;
    title?: string;
};

export default function AdminLayout({
    children,
    title = "Admin Panel",
}: AdminLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | IDLE LOGOUT — 3 MINUTES
    |--------------------------------------------------------------------------
    |
    | Primary idle timer. Understands real typing and clicking.
    |
    | 2:00  → Warning appears
    | 2:00–3:00 → 60 second countdown
    | 3:00 → Automatic logout
    |
    | The server-side CheckIdleSession runs at 4 minutes as a backstop, so
    | it never pre-empts this warning.
    |
    */

    const { showWarning, secondsLeft, stayLoggedIn } = useIdleLogout({
        timeout: 3 * 60 * 1000,
        warningDuration: 1 * 60 * 1000,
        logoutUrl: "/admin/logout",
        redirectUrl: "/admin/login",
    });

    useScreenActivity();

    return (
        <>
            <Head title={title} />

            <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-[#050505] dark:text-white">
                <AdminSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() =>
                        setSidebarCollapsed((previous) => !previous)
                    }
                />

                <main
                    className={`
                        min-h-screen
                        pt-16
                        transition-all
                        duration-300
                        lg:pt-0
                        ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}
                    `}
                >
                    {/* GLOBAL ADMIN NOTIFICATION BAR */}
                    <div
                        className="
                            sticky
                            top-16
                            z-[55]
                            flex
                            h-12
                            items-center
                            justify-end
                            gap-3
                            border-b
                            border-gray-200/60
                            bg-white/70
                            px-4
                            backdrop-blur-md
                            dark:border-white/[0.06]
                            dark:bg-[#0a0a0a]/70
                            lg:top-0
                            lg:px-8
                        "
                    >
                        <div className="flex items-center gap-3">
                            <span className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/25 sm:inline">
                                Notifications
                            </span>

                            <AdminNotificationBell />
                        </div>
                    </div>

                    <div className="min-h-screen">
                        {children}
                    </div>
                </main>
            </div>

            {/* IDLE WARNING MODAL */}
            {showWarning && (
                <IdleWarningModal
                    secondsLeft={secondsLeft}
                    onStayLoggedIn={stayLoggedIn}
                    onLogoutNow={() => {
                        router.post(
                            "/admin/logout",
                            {},
                            {
                                onFinish: () => {
                                    window.location.href = "/admin/login";
                                },
                            },
                        );
                    }}
                />
            )}
        </>
    );
}
