import React, { useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { useTheme } from "../Context/ThemeContext";

import Sidebar from "../Components/Sidebar";
import UserHeader from "../Components/UserHeader";
import IdleWarningModal from "../Components/IdleWarningModal";
import { useIdleLogout } from "../Hooks/useIdleLogout";

type AuthUser = {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
};

type SharedPageProps = {
    auth?: {
        user?: AuthUser | null;
    };
};

export default function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isDarkMode } = useTheme();

    const { auth } = usePage<SharedPageProps>().props;

    const userRole = String(
        auth?.user?.role ?? ""
    ).toLowerCase().trim();

   /*
|--------------------------------------------------------------------------
| IDLE LOGOUT (5 minutes)
|--------------------------------------------------------------------------
|
| If the user does nothing (no mouse, no click, no type, no scroll)
| for 5 minutes, they will be automatically logged out.
|
| 1 minute before logout, a warning modal will appear.
|
*/

const { showWarning, secondsLeft, stayLoggedIn } = useIdleLogout({
    timeout: 5 * 60 * 1000,         // 5 minutes idle
    warningDuration: 1 * 60 * 1000, // 1 minute warning
});
    useEffect(() => {
        /*
        |--------------------------------------------------------------------------
        | STAFF HEARTBEAT
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        | This heartbeat belongs ONLY to STAFF.
        |
        | Admin must NEVER call:
        | POST /staff/heartbeat
        |
        */

        if (userRole !== "staff") {
            console.log(
                `Heartbeat disabled for role: ${userRole || "unknown"}`
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | EXTRA ADMIN PROTECTION
        |--------------------------------------------------------------------------
        |
        | Even if this layout somehow gets mounted under an admin URL,
        | do not send the staff heartbeat.
        |
        */

        const isAdminPath =
            window.location.pathname === "/admin" ||
            window.location.pathname.startsWith("/admin/");

        if (isAdminPath) {
            console.log(
                "Admin route detected - staff heartbeat disabled."
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | SEND HEARTBEAT
        |--------------------------------------------------------------------------
        */

        const sendHeartbeat = () => {
            /*
            | Re-check role before every request.
            */

            if (userRole !== "staff") {
                return;
            }

            /*
            | Re-check current URL before every request.
            */

            const currentPath =
                window.location.pathname;

            if (
                currentPath === "/admin" ||
                currentPath.startsWith("/admin/")
            ) {
                return;
            }

            router.post(
                "/staff/heartbeat",
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,

                    onSuccess: () => {
                        console.log(
                            "Staff heartbeat sent."
                        );
                    },

                    onError: (errors) => {
                        console.error(
                            "Staff heartbeat failed:",
                            errors
                        );
                    },

                    onFinish: () => {
                        /*
                        | No redirect or page replacement here.
                        */
                    },
                }
            );
        };

        /*
        |--------------------------------------------------------------------------
        | INITIAL HEARTBEAT
        |--------------------------------------------------------------------------
        */

        sendHeartbeat();

        /*
        |--------------------------------------------------------------------------
        | HEARTBEAT EVERY 30 SECONDS
        |--------------------------------------------------------------------------
        */

        const interval =
            window.setInterval(
                sendHeartbeat,
                30000
            );

        /*
        |--------------------------------------------------------------------------
        | CLEANUP
        |--------------------------------------------------------------------------
        */

        return () => {
            window.clearInterval(interval);
        };
    }, [userRole]);

    return (
        <div
            className={`flex min-h-screen transition-colors duration-300 ${
                isDarkMode
                    ? "bg-[#000000] text-white"
                    : "bg-gray-100 text-gray-900"
            }`}
        >
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <UserHeader />

                <main className="min-w-0 flex-1 px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-8">
                    <div className="mx-auto w-full max-w-[1800px]">
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
                            "/logout",
                            {},
                            {
                                onFinish: () => {
                                    window.location.href = "/login";
                                },
                            },
                        );
                    }}
                />
            )}
        </div>
    );
}
