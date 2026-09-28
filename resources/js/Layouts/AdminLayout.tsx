import React, { ReactNode, useState } from "react";
import { Head, router } from "@inertiajs/react";
import AdminSidebar from "../Components/Admin/AdminSidebar";
import IdleWarningModal from "../Components/IdleWarningModal";
import { useIdleLogout } from "../Hooks/useIdleLogout";

type AdminLayoutProps = {
    children: ReactNode;
    title?: string;
};

export default function AdminLayout({
    children,
    title = "Admin Panel",
}: AdminLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] =
        useState(false);

    /*
    |--------------------------------------------------------------------------
    | IDLE LOGOUT (5 minutes)
    |--------------------------------------------------------------------------
    |
    | If the admin does nothing (no mouse, no click, no type, no scroll)
    | for 5 minutes, they will be automatically logged out.
    |
    | 1 minute before logout, a warning modal will appear.
    |
    | NOTE: This is SEPARATE from the staff session.
    | Admin and staff have independent sessions.
    |
    */

const { showWarning, secondsLeft, stayLoggedIn } = useIdleLogout({
    timeout: 5 * 60 * 1000,         // 5 minutes
    warningDuration: 1 * 60 * 1000, // 1 minute warning
});
    return (
        <>
            <Head title={title} />

            <div className="min-h-screen bg-[#050505] text-white">
                <AdminSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() =>
                        setSidebarCollapsed(
                            (previous) => !previous,
                        )
                    }
                />

                <main
                    className={`
                        min-h-screen
                        pt-16
                        transition-all
                        duration-300
                        lg:pt-0
                        ${
                            sidebarCollapsed
                                ? "lg:pl-20"
                                : "lg:pl-72"
                        }
                    `}
                >
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
