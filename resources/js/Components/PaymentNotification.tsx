import React, { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    Bell,
    BellRing,
    CheckCircle,
    Clock,
    AlertCircle,
    X,
    Receipt,
    User,
    ArrowRight,
} from "lucide-react";

type AppNotification = {
    id: string;
    type: string;
    data: any;
    read_at: string | null;
    created_at: string;
    createdAt?: string; // ✅ fallback kung camelCase
};

type PageProps = {
    notifications?: AppNotification[];
};

export default function PaymentNotification() {
    const { notifications: serverNotifications = [] } =
        usePage<PageProps>().props;
    const [notifications, setNotifications] = useState<AppNotification[]>(
        Array.isArray(serverNotifications) ? serverNotifications : [],
    );
    const [showDropdown, setShowDropdown] = useState(false);

    const unreadCount = Array.isArray(notifications)
        ? notifications.filter((n) => !n.read_at).length
        : 0;

    // ✅ FIX #1: Safe merge — hindi basta override local state
    useEffect(() => {
        if (!Array.isArray(serverNotifications)) return;

        setNotifications((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) {
                return serverNotifications;
            }

            return serverNotifications.map((serverNotif) => {
                const localMatch = prev.find((n) => n.id === serverNotif.id);

                if (localMatch && localMatch.read_at && !serverNotif.read_at) {
                    return localMatch;
                }

                return serverNotif;
            });
        });
    }, [JSON.stringify(serverNotifications)]);

    // ✅ FIX #2: Safe browser Notification API
    useEffect(() => {
        try {
            const win = window as any;
            if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                win.Notification &&
                win.Notification.permission === "default"
            ) {
                win.Notification.requestPermission().catch(() => {
                    // ignore
                });
            }
        } catch {
            // ignore
        }
    }, []);

    const getCsrfToken = (): string => {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || ""
        );
    };

    /**
     * ✅ FIXED: Parse notification data — handles JSON string, object, at array
     */
    const parseNotificationData = (rawData: any): any => {
        if (!rawData) return {};

        // ✅ Kung array, i-return agad (para hindi mag-crash)
        if (Array.isArray(rawData)) {
            return { title: "Notification", message: "" };
        }

        // ✅ Kung string, i-parse
        if (typeof rawData === "string") {
            try {
                const parsed = JSON.parse(rawData);
                // ✅ Kung array pa din, i-handle
                if (Array.isArray(parsed)) {
                    return { title: "Notification", message: "" };
                }
                return parsed ?? {};
            } catch (e) {
                console.error("Failed to parse notification data:", e);
                return {};
            }
        }

        // ✅ Kung object, i-return
        if (typeof rawData === "object") {
            return rawData;
        }

        return {};
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            Array.isArray(prev)
                ? prev.map((n) =>
                      n.id === id
                          ? { ...n, read_at: new Date().toISOString() }
                          : n,
                  )
                : [],
        );

        fetch(`/notifications/${id}/read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRF-TOKEN": getCsrfToken(),
            },
            credentials: "same-origin",
        }).catch((err) => {
            console.error("Failed to mark as read:", err);
        });
    };

    const markAllAsRead = () => {
        setNotifications((prev) =>
            Array.isArray(prev)
                ? prev.map((n) => ({
                      ...n,
                      read_at: new Date().toISOString(),
                  }))
                : [],
        );

        fetch("/notifications/read-all", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRF-TOKEN": getCsrfToken(),
            },
            credentials: "same-origin",
        }).catch((err) => {
            console.error("Failed to mark all as read:", err);
        });
    };

    const getSafeValue = (data: any, key: string): any => {
        if (!data) return undefined;

        const parsed = parseNotificationData(data);

        try {
            const value = parsed[key];
            if (typeof value !== "function") return value;
        } catch (e) {
            // Ignore
        }

        try {
            const descriptor = Object.getOwnPropertyDescriptor(parsed, key);
            if (descriptor && "value" in descriptor) {
                return descriptor.value;
            }
        } catch (e) {
            // Ignore
        }

        try {
            const reParsed = JSON.parse(JSON.stringify(parsed));
            return reParsed?.[key];
        } catch (e) {
            // Ignore
        }

        return undefined;
    };

   const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);

    const data = parseNotificationData(notif.data) ?? {};

    const redirectUrl = data?.redirect_url;
    const paymentId = data?.payment_id;
    const invoiceId = data?.invoice_id;
    const contractId = data?.contract_id;
    const documentId = data?.document_id;

    // Support both snake_case and camelCase
    const jobOrderId =
        data?.job_order_id ??
        data?.jobOrderId ??
        data?.job_order?.id ??
        data?.jobOrder?.id;

    const link = getSafeValue(data, "link");

    console.log("=== NOTIFICATION CLICK ===");
    console.log("Notification:", notif);
    console.log("Parsed data:", data);
    console.log("Job Order ID:", jobOrderId);

    if (typeof redirectUrl === "string" && redirectUrl) {
        setShowDropdown(false);
        router.visit(redirectUrl);
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | JOB ORDER
    |--------------------------------------------------------------------------
    | BillingInvoicing.tsx already supports:
    | /billing-invoicing?job_order_id=ID
    |--------------------------------------------------------------------------
    */
    if (jobOrderId !== undefined && jobOrderId !== null) {
        setShowDropdown(false);

        router.visit(
            `/billing-invoicing?job_order_id=${encodeURIComponent(
                String(jobOrderId),
            )}`,
            {
                preserveScroll: true,
            },
        );

        return;
    }

    if (paymentId) {
        setShowDropdown(false);

        router.visit(
            `/payment-management?payment_id=${encodeURIComponent(
                String(paymentId),
            )}`,
            {
                preserveScroll: true,
            },
        );

        return;
    }

    if (invoiceId) {
        setShowDropdown(false);

        router.visit(
            `/payment-management?invoice_id=${encodeURIComponent(
                String(invoiceId),
            )}`,
            {
                preserveScroll: true,
            },
        );

        return;
    }

    if (contractId) {
        setShowDropdown(false);

        router.visit(
            `/contract-permit?contract_id=${encodeURIComponent(
                String(contractId),
            )}`,
        );

        return;
    }

    if (documentId) {
        setShowDropdown(false);

        router.visit(
            `/compliance?document_id=${encodeURIComponent(
                String(documentId),
            )}`,
        );

        return;
    }

    if (typeof link === "string" && link) {
        setShowDropdown(false);
        router.visit(link);
        return;
    }

    console.warn(
        "Notification has no supported navigation target:",
        data,
    );

    setShowDropdown(false);
};

    const getIcon = (status: string) => {
        const normalized = String(status || "")
            .trim()
            .toLowerCase();

        if (normalized === "document_assigned")
            return (
                <Receipt
                    size={18}
                    className="text-yellow-600 dark:text-yellow-400"
                />
            );
        if (normalized === "fully paid" || normalized === "paid")
            return (
                <CheckCircle
                    size={18}
                    className="text-green-600 dark:text-green-400"
                />
            );
        if (normalized === "partially paid" || normalized === "partial")
            return (
                <Clock
                    size={18}
                    className="text-yellow-600 dark:text-yellow-400"
                />
            );
        if (normalized === "due" || normalized === "overdue")
            return (
                <AlertCircle
                    size={18}
                    className="text-red-600 dark:text-red-400"
                />
            );
        if (normalized === "active" || normalized === "approved")
            return (
                <CheckCircle
                    size={18}
                    className="text-green-600 dark:text-green-400"
                />
            );
        if (normalized === "needs correction" || normalized === "rejected")
            return (
                <AlertCircle
                    size={18}
                    className="text-red-600 dark:text-red-400"
                />
            );

        return (
            <Receipt size={18} className="text-blue-600 dark:text-blue-400" />
        );
    };

    /**
     * ✅ FIXED: Format time — may guards sa invalid date
     */
    const formatTime = (dateString: string | null | undefined) => {
        // ✅ Guard: kung null/undefined, return "Just now"
        if (!dateString) return "Just now";

        const date = new Date(dateString);
        const time = date.getTime();

        // ✅ Guard: kung invalid date (NaN), return "Just now"
        if (Number.isNaN(time)) {
            console.warn("Invalid date:", dateString);
            return "Just now";
        }

        const diffMins = Math.floor((Date.now() - time) / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    const formatChangeValue = (key: string, value: any): string => {
        if (value === null || value === undefined || value === "") return "—";

        const moneyFields = [
            "paid_amount",
            "remaining_balance",
            "amount",
            "total_amount_due",
            "vat_amount",
            "net_of_vat",
            "withholding_tax",
        ];

        if (moneyFields.includes(key) && !isNaN(Number(value))) {
            return Number(value).toLocaleString("en-PH", {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        }

        return String(value);
    };

   const isNotificationClickable = (rawData: any): boolean => {
    if (!rawData) return false;

    const data = parseNotificationData(rawData) ?? {};

    const link = getSafeValue(data, "link");
    const redirectUrl = data?.redirect_url;

    const paymentId = data?.payment_id;
    const invoiceId = data?.invoice_id;
    const contractId = data?.contract_id;
    const documentId = data?.document_id;

    const jobOrderId =
        data?.job_order_id ??
        data?.jobOrderId ??
        data?.job_order?.id ??
        data?.jobOrder?.id;

    return (
        (typeof redirectUrl === "string" && redirectUrl.length > 0) ||
        jobOrderId !== undefined ||
        paymentId !== undefined ||
        invoiceId !== undefined ||
        contractId !== undefined ||
        documentId !== undefined ||
        (typeof link === "string" && link.length > 0)
    );
};

    return (
        <div className="relative shrink-0">
            <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 transition hover:border-yellow-400/40 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-yellow-600 dark:hover:text-yellow-400"
                aria-label="Notifications"
            >
                {unreadCount > 0 ? (
                    <BellRing
                        size={22}
                        className="animate-pulse text-yellow-600 dark:text-yellow-400"
                    />
                ) : (
                    <Bell size={22} />
                )}

                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-lg">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 top-12 z-[9999] w-[380px] max-w-[calc(100vw-20px)] overflow-hidden rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Bell
                                    size={16}
                                    className="text-yellow-600 dark:text-yellow-400"
                                />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllAsRead}
                                        className="rounded-lg px-2 py-1 text-[10px] font-bold text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/10"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowDropdown(false)}
                                    className="rounded-lg p-1 text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-12 text-center">
                                    <Bell
                                        size={28}
                                        className="mx-auto text-slate-700"
                                    />
                                    <p className="mt-3 text-xs font-bold text-gray-500 dark:text-slate-500">
                                        No notifications yet
                                    </p>
                                </div>
                            ) : (
                          notifications.map((notif, index) => {
    // ✅ ROBUST: Parse + unwrap nested data
    let rawData: any = notif.data;

    // Step 1: Parse kung string
    if (typeof rawData === "string") {
        try {
            rawData = JSON.parse(rawData);
        } catch (e) {
            rawData = {};
        }
    }

    // Step 2: Kung may nested .data, i-unwrap
    if (rawData?.data && typeof rawData.data === "object") {
        rawData = rawData.data;
    } else if (rawData?.data && typeof rawData.data === "string") {
        try {
            rawData = JSON.parse(rawData.data);
        } catch (e) {
            // keep as is
        }
    }

    const data: any = rawData || {};

    // ✅ Fallback keys para sa title
    const title =
        data?.title ||
        data?.name ||
        data?.subject ||
        data?.action ||
        (notif as any)?.title ||
        "Notification";

    // ✅ Fallback keys para sa message
    const message =
        data?.message ||
        data?.body ||
        data?.description ||
        (notif as any)?.message ||
        "No message";

    const hasChanges =
        data?.changes &&
        typeof data.changes === "object" &&
        Object.keys(data.changes).length > 0;

    const isClickable = isNotificationClickable(notif.data);

    const rawTime =
        notif.created_at ||
        notif.createdAt ||
        (notif as any)?.created_at ||
        null;

                                    return (
                                       <div
    key={`${notif.id}-${index}`}
    onClick={() =>
        handleNotificationClick(notif)
    }
                                            className={[
                                                "group border-b border-gray-200 dark:border-slate-800/50 px-4 py-3 transition",
                                                isClickable
                                                    ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-900/70"
                                                    : "cursor-default",
                                                !notif.read_at
                                                    ? "bg-yellow-400/5"
                                                    : "opacity-70",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 shrink-0">
                                                    {getIcon(
                                                        data?.status ||
                                                            data?.type,
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-xs font-black text-gray-900 dark:text-white">
                                                            {title}
                                                        </p>
                                                        <span className="shrink-0 text-[9px] text-gray-500 dark:text-slate-500">
                                                            {formatTime(
                                                                rawTime,
                                                            )}
                                                        </span>
                                                    </div>

                                                 <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
    {message}
</p>

                                                    {hasChanges && (
                                                        <div className="mt-2 space-y-1 rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-2.5 py-2">
                                                            <p className="text-[9px] font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                                                                What changed
                                                            </p>
                                                            {Object.entries(
                                                                data.changes,
                                                            ).map(
                                                                ([key, value]: [
                                                                    string,
                                                                    any,
                                                                ]) => (
                                                                    <div
                                                                        key={
                                                                            key
                                                                        }
                                                                        className="flex items-center justify-between gap-2 text-[10px]"
                                                                    >
                                                                        <span className="font-bold uppercase text-gray-500 dark:text-slate-500">
                                                                            {key.replace(
                                                                                /_/g,
                                                                                " ",
                                                                            )}
                                                                        </span>
                                                                        <span className="flex items-center gap-1 font-mono">
                                                                            <span className="text-red-600 dark:text-red-400 line-through">
                                                                                {formatChangeValue(
                                                                                    key,
                                                                                    value?.from,
                                                                                )}
                                                                            </span>
                                                                            <ArrowRight
                                                                                size={
                                                                                    9
                                                                                }
                                                                                className="text-slate-600"
                                                                            />
                                                                            <span className="font-black text-green-600 dark:text-green-400">
                                                                                {formatChangeValue(
                                                                                    key,
                                                                                    value?.to,
                                                                                )}
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        {data?.receipt && (
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-gray-500 dark:text-slate-400">
                                                                <Receipt
                                                                    size={9}
                                                                />
                                                                {data.receipt}
                                                            </span>
                                                        )}
                                                        {data?.client && (
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-gray-500 dark:text-slate-400">
                                                                <User size={9} />
                                                                {data.client}
                                                            </span>
                                                        )}
                                                        {isClickable && (
                                                            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold text-yellow-600 dark:text-yellow-400 opacity-0 transition group-hover:opacity-100">
                                                                View details
                                                                <ArrowRight
                                                                    size={9}
                                                                />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
