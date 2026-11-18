import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { Moon, Sun, Clock } from "lucide-react";
import { useTheme } from "../Context/ThemeContext";
import PaymentNotification from "../Components/PaymentNotification";

type UserData = {
    id?: number;
    name?: string;
    email?: string;
};

type PageProps = {
    auth?: {
        user?: UserData;
    };
};

/* =========================================================
   REAL-TIME CLOCK — PH Time
========================================================= */

function RealTimeClock({ isDarkMode }: { isDarkMode: boolean }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const interval = window.setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    const formatted = time.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    return (
        <div
            className={`
                hidden items-center gap-2 rounded-xl border px-3 py-2 sm:flex
                ${
                    isDarkMode
                        ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                        : "border-gray-200 bg-gray-100 text-gray-700"
                }
            `}
            title="Philippine Standard Time"
        >
            <Clock size={16} strokeWidth={2.5} />
            <span className="text-xs font-bold tabular-nums">
                {formatted}
            </span>
        </div>
    );
}

/* =========================================================
   USER HEADER
========================================================= */

export default function UserHeader() {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <header
            className={`
                sticky
                top-0
                z-30
                w-full
                border-b
                backdrop-blur-xl
                transition-colors
                duration-300
                ${
                    isDarkMode
                        ? "border-yellow-400/10 bg-black/90"
                        : "border-gray-200 bg-white/90"
                }
            `}
        >
            <div
                className="
                    flex
                    min-h-18
                    items-center
                    justify-between
                    gap-4
                    px-4
                    sm:px-6
                    lg:px-8
                "
            >
                {/* BRAND */}
                <div className="min-w-0">
                    <p
                        className={`
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-widest
                            ${
                                isDarkMode
                                    ? "text-yellow-400/70"
                                    : "text-yellow-600"
                            }
                        `}
                    >
                        ALIBATON
                    </p>

                    <p
                        className={`
                            truncate
                            text-sm
                            font-semibold
                            sm:text-base
                            ${
                                isDarkMode
                                    ? "text-white"
                                    : "text-gray-900"
                            }
                        `}
                    >
                        Heavy Equipment & Logistics
                    </p>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex shrink-0 items-center gap-3">
                    {/* ✅ REAL-TIME CLOCK */}
                    <RealTimeClock isDarkMode={isDarkMode} />

                    {/* ✅ NOTIFICATION BELL */}
                    <PaymentNotification />

                    {/* LIGHT / DARK MODE */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={
                            isDarkMode
                                ? "Switch to light mode"
                                : "Switch to dark mode"
                        }
                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
                        className={`
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            border
                            transition-all
                            duration-200
                            ${
                                isDarkMode
                                    ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20"
                                    : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }
                        `}
                    >
                        {isDarkMode ? (
                            <Sun size={18} strokeWidth={2.5} />
                        ) : (
                            <Moon size={18} strokeWidth={2.5} />
                        )}
                    </button>

                    {/* USER PROFILE */}
                    <div
                        className={`
                            flex
                            items-center
                            gap-2
                            border-l
                            pl-3
                            ${
                                isDarkMode
                                    ? "border-slate-800"
                                    : "border-gray-200"
                            }
                        `}
                    >
                        <div
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-yellow-400
                                text-sm
                                font-black
                                text-black
                            "
                        >
                            {user?.name
                                ? user.name.charAt(0).toUpperCase()
                                : "U"}
                        </div>

                        <div className="hidden max-w-37.5 sm:block">
                            <p
                                className={`
                                    truncate
                                    text-sm
                                    font-bold
                                    ${
                                        isDarkMode
                                            ? "text-white"
                                            : "text-gray-900"
                                    }
                                `}
                            >
                                {user?.name ?? "User"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
