import React, { useCallback, useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    Bell,
    BellRing,
    X,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    FileText,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| GLOBAL ADMIN NOTIFICATION BELL
|--------------------------------------------------------------------------
|
| Nakalagay ito sa AdminLayout kaya makikita sa LAHAT ng admin pages.
| Nagpo-poll sa GET /admin/notifications kada 30 segundo para laging
| aware ang admin sa pinakabagong activity ng staff (hal. may bagong
| billing na nagsusubmit para i-approve).
|
*/

export type AdminNotification = {
    id: number | string;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    link?: string | null;
    read: boolean;
    createdAt?: string;
};

type RawShape = {
    id: number | string;
    type?: string;
    data?: any;
    read_at?: string | null;
    created_at?: string | null;
    title?: string;
    message?: string;
    link?: string | null;
    read?: boolean;
    createdAt?: string | null;
};

type PageProps = {
    notifications?: RawShape[];
};

const parseData = (data: any): any => {
    if (!data) return {};
    if (typeof data === "string") {
        try {
            return JSON.parse(data);
        } catch {
            return {};
        }
    }
    return data;
};

const normalize = (raw: RawShape): AdminNotification => {
    // Raw (middleware) shape: { id, type, data, read_at, created_at }
    if (
        raw &&
        typeof raw === "object" &&
        "data" in raw &&
        raw.data !== undefined
    ) {
        const data = parseData(raw.data);
        const rawType = String(data?.type ?? raw.type ?? "info").toLowerCase();

        return {
            id: raw.id,
            title: data?.title ?? "Notification",
            message: data?.message ?? "",
            type:
                rawType === "success" ||
                rawType === "warning" ||
                rawType === "error"
                    ? rawType
                    : "info",
            link: data?.link ?? data?.redirect_url ?? null,
            read: Boolean(raw.read_at),
            createdAt: raw.created_at ?? undefined,
        };
    }

    // Flattened shape: { id, title, message, type, link, read, createdAt }
    const rawType = String(raw?.type ?? "info").toLowerCase();

    return {
        id: raw.id,
        title: raw.title ?? "Notification",
        message: raw.message ?? "",
        type:
            rawType === "success" ||
            rawType === "warning" ||
            rawType === "error"
                ? rawType
                : "info",
        link: raw.link ?? null,
        read: Boolean(raw.read),
        createdAt: raw.createdAt ?? raw.created_at ?? undefined,
    };
};

export default function AdminNotificationBell() {
    const { notifications: serverNotifications = [] } =
        usePage<PageProps>().props;

    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [showPanel, setShowPanel] = useState(false);

    useEffect(() => {
        if (!Array.isArray(serverNotifications)) {
            setNotifications([]);
            return;
        }

        setNotifications(serverNotifications.map(normalize));
    }, [JSON.stringify(serverNotifications)]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    /*
    |--------------------------------------------------------------------------
    | POLL — kumuha ng bago tuwing 30 sec
    |--------------------------------------------------------------------------
    */

    const refresh = useCallback(() => {
        fetch("/admin/notifications", {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then((res) => {
                if (res.status === 401) {
                    window.location.href = "/admin/login";

                    throw new Error("Session expired");
                }

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                return res.json();
            })
            .then((data) => {
                const list = Array.isArray(data?.notifications)
                    ? data.notifications
                    : null;

                if (list !== null) {
                    setNotifications(list.map(normalize));
                }
            })
            .catch((err) => {
                console.error("Notification poll failed:", err);
            });
    }, []);

    useEffect(() => {
        const timer = window.setInterval(refresh, 30_000);
        return () => window.clearInterval(timer);
    }, [refresh]);

    /*
    |--------------------------------------------------------------------------
    | MARK READ
    |--------------------------------------------------------------------------
    */

    const getCsrf = () =>
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") || "";

    const markAsRead = (id: number | string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );

        fetch(`/admin/notifications/${id}/read`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "X-CSRF-TOKEN": getCsrf(),
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then(() => refresh())
            .catch((err) => console.error("Mark as read failed:", err));
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        fetch("/admin/notifications/mark-all-read", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "X-CSRF-TOKEN": getCsrf(),
                "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin",
        })
            .then(() => refresh())
            .catch((err) => console.error("Mark all read failed:", err));
    };

    const handleClick = (n: AdminNotification) => {
        if (!n.read) {
            markAsRead(n.id);
        }

        if (n.link) {
            setShowPanel(false);
            router.visit(n.link);
        }
    };

    const getIcon = (type: string) => {
        if (type === "success") return <CheckCircle2 size={16} />;
        if (type === "error") return <AlertCircle size={16} />;
        if (type === "warning") return <AlertTriangle size={16} />;
        if (type === "info") return <FileText size={16} />;
        return <Bell size={16} />;
    };

    const getIconWrap = (type: string) => {
        if (type === "success")
            return "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400";
        if (type === "error")
            return "bg-red-400/10 text-red-600 dark:text-red-400";
        if (type === "warning")
            return "bg-yellow-400/10 text-yellow-600 dark:text-yellow-400";
        return "bg-blue-400/10 text-blue-600 dark:text-blue-400";
    };

    const formatTime = (value?: string) => {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "";

        const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);

        if (diffHours < 24) return `${diffHours}h ago`;

        return date.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setShowPanel((v) => !v)}
                className={[
                    "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition",
                    showPanel
                        ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-600 dark:text-yellow-400"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-black text-gray-600 dark:text-slate-400 hover:border-yellow-400/40 hover:text-yellow-600 dark:hover:text-yellow-400",
                ].join(" ")}
                aria-label="Notifications"
            >
                {unreadCount > 0 ? (
                    <BellRing
                        size={18}
                        className="text-yellow-600 dark:text-yellow-400"
                    />
                ) : (
                    <Bell size={18} />
                )}

                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {showPanel && (
                <>
                    <div
                        className="fixed inset-0 z-[9970]"
                        onClick={() => setShowPanel(false)}
                    />
                    <div className="absolute right-0 top-full z-[9980] mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-black/95 shadow-2xl backdrop-blur-md sm:w-96">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Bell
                                    size={16}
                                    className="text-yellow-600 dark:text-yellow-400"
                                />
                                <p className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-white">
                                    Notifications
                                </p>
                                {unreadCount > 0 && (
                                    <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-black text-yellow-600 dark:text-yellow-400">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllAsRead}
                                        className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 transition hover:bg-yellow-400/10"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowPanel(false)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 dark:text-slate-400 transition hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                                    <Bell
                                        size={28}
                                        className="text-slate-700"
                                    />
                                    <p className="mt-3 text-sm font-bold text-gray-600 dark:text-slate-400">
                                        No notifications
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-600">
                                        You're all caught up.
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() =>
                                            handleClick(notification)
                                        }
                                        className={[
                                            "flex w-full items-start gap-3 border-b border-gray-200 dark:border-slate-800/70 px-4 py-3 text-left transition hover:bg-gray-100 dark:hover:bg-slate-800/40",
                                            !notification.read
                                                ? "bg-yellow-400/[0.04]"
                                                : "",
                                        ].join(" ")}
                                    >
                                        <div
                                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getIconWrap(
                                                notification.type,
                                            )}`}
                                        >
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-400" />
                                                )}
                                            </div>
                                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-gray-600 dark:text-slate-400">
                                                {notification.message}
                                            </p>
                                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-600">
                                                {formatTime(
                                                    notification.createdAt,
                                                )}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
