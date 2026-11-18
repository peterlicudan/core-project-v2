import React, { useEffect, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    Bell,
    CheckCircle2,
    Database,
    Globe,
    HardDrive,
    Lock,
    Mail,
    RefreshCw,
    Save,
    Settings,
    Shield,
    ShieldCheck,
    Trash2,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type TabKey = "general" | "notifications" | "security" | "maintenance";

type FeatureToggle = {
    key: string;
    label: string;
    description: string;
};

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "general", label: "General", icon: <Globe size={16} /> },
    { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { key: "security", label: "Security", icon: <Shield size={16} /> },
    {
        key: "maintenance",
        label: "Maintenance",
        icon: <Database size={16} />,
    },
];

const NOTIFICATION_TOGGLES: FeatureToggle[] = [
    {
        key: "emailAlerts",
        label: "Email Alerts",
        description: "Send email notifications for important system events.",
    },
    {
        key: "securityAlerts",
        label: "Security Alerts",
        description: "Notify super admins of failed logins and permission changes.",
    },
    {
        key: "documentExpiry",
        label: "Document Expiry Reminders",
        description: "Alert document owners 30 days before expiry.",
    },
    {
        key: "paymentReminders",
        label: "Payment Reminders",
        description: "Send reminders for pending and overdue invoices.",
    },
    {
        key: "weeklyDigest",
        label: "Weekly Summary",
        description: "Email a weekly operations and compliance summary.",
    },
    {
        key: "systemUpdates",
        label: "System Updates",
        description: "Notify users about maintenance windows and releases.",
    },
];

const SECURITY_TOGGLES: FeatureToggle[] = [
    {
        key: "twoFactor",
        label: "Two-Factor Authentication",
        description: "Require OTP verification for all administrator logins.",
    },
    {
        key: "loginAlerts",
        label: "Login Alerts",
        description: "Email the account owner whenever a new device signs in.",
    },
    {
        key: "forcePasswordChange",
        label: "Force Password Change",
        description: "Require password updates after the first login.",
    },
    {
        key: "lockInactiveAccounts",
        label: "Lock Inactive Accounts",
        description: "Disable accounts with no activity for 90 days.",
    },
];

const MAINTENANCE_TOGGLES: FeatureToggle[] = [
    {
        key: "maintenanceMode",
        label: "Maintenance Mode",
        description:
            "Temporarily block non-admin access while maintenance is ongoing.",
    },
    {
        key: "autoBackup",
        label: "Automatic Backups",
        description: "Create scheduled database and document backups.",
    },
    {
        key: "errorReporting",
        label: "Error Reporting",
        description: "Capture application errors for super admin review.",
    },
    {
        key: "auditLogging",
        label: "Detailed Audit Logging",
        description: "Record every create, update, and delete action.",
    },
];

/*
|--------------------------------------------------------------------------
| SHARED COMPONENTS
|--------------------------------------------------------------------------
*/

function Toggle({
    enabled,
    onChange,
    label,
    description,
}: {
    enabled: boolean;
    onChange: () => void;
    label: string;
    description: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {description}
                </p>
            </div>

            <button
                type="button"
                onClick={onChange}
                aria-pressed={enabled}
                aria-label={`Toggle ${label}`}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
                    enabled
                        ? "border-emerald-500/40 bg-emerald-500/80"
                        : "border-slate-300 bg-slate-300 dark:border-slate-700 dark:bg-slate-700"
                }`}
            >
                <span
                    className={`h-4 w-4 rounded-full bg-white shadow transition ${
                        enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                />
            </button>
        </div>
    );
}

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {label}
            </label>
            {children}
            {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
        </div>
    );
}

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white";

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function Setting() {
    const { auth } = usePage<any>().props;
    const user = auth?.user;

    const [activeTab, setActiveTab] = useState<TabKey>("general");
    const [saved, setSaved] = useState(false);

    const [general, setGeneral] = useState({
        systemName: "ALIBATON Heavy Equipment Logistics System",
        companyName: "ALIBATON Corporation",
        supportEmail: "support@alibaton.com",
        contactNumber: "+63 917 555 0142",
        timezone: "Asia/Manila",
        dateFormat: "MMM DD, YYYY",
        currency: "PHP (₱)",
        language: "English",
    });

    const [toggles, setToggles] = useState<Record<string, boolean>>({
        emailAlerts: true,
        securityAlerts: true,
        documentExpiry: true,
        paymentReminders: true,
        weeklyDigest: false,
        systemUpdates: true,
        twoFactor: true,
        loginAlerts: true,
        forcePasswordChange: false,
        lockInactiveAccounts: false,
        maintenanceMode: false,
        autoBackup: true,
        errorReporting: true,
        auditLogging: true,
    });

    const [security, setSecurity] = useState({
        sessionTimeout: "30",
        passwordExpiry: "90",
        maxLoginAttempts: "5",
        lockoutDuration: "15",
    });

    const [maintenance, setMaintenance] = useState({
        backupFrequency: "Daily",
        retentionDays: "30",
        backupTime: "02:00",
        maintenanceMessage:
            "The ALIBATON system is currently undergoing scheduled maintenance. Please try again later.",
    });

    useEffect(() => {
        if (!saved) return;

        const timer = window.setTimeout(() => setSaved(false), 3000);

        return () => window.clearTimeout(timer);
    }, [saved]);

    const toggle = (key: string) => {
        setToggles((current) => ({ ...current, [key]: !current[key] }));
    };

    const handleSave = () => {
        setSaved(true);
    };

    return (
        <SuperAdminLayout>
            <Head title="Settings" />

            <div className="space-y-6">
                {/* HEADER */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                            <Settings
                                size={24}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Settings
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Configure system preferences, notifications,
                                security policies, and maintenance behavior.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-400"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>

                {saved && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={16} />
                        Settings saved successfully.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_1fr]">
                    {/* SIDE NAV */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                                        activeTab === tab.key
                                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
                                    }`}
                                >
                                    <span
                                        className={
                                            activeTab === tab.key
                                                ? "text-amber-600 dark:text-amber-400"
                                                : "text-slate-500"
                                        }
                                    >
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600">
                                    <Shield
                                        size={16}
                                        className="text-[#0A0F1D]"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                        {user?.name ?? "Super Admin"}
                                    </p>
                                    <p className="truncate text-[11px] text-slate-500">
                                        {user?.email ?? "superadmin@alibaton.com"}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                                Changes apply to the entire system and are
                                recorded in the activity logs.
                            </p>
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        {/* GENERAL */}
                        {activeTab === "general" && (
                            <div>
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Globe size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            General Settings
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Basic organization and localization
                                            preferences.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="System Name">
                                        <input
                                            type="text"
                                            value={general.systemName}
                                            onChange={(event) =>
                                                setGeneral({
                                                    ...general,
                                                    systemName: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Company Name">
                                        <input
                                            type="text"
                                            value={general.companyName}
                                            onChange={(event) =>
                                                setGeneral({
                                                    ...general,
                                                    companyName: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Support Email">
                                        <div className="relative">
                                            <Mail
                                                size={15}
                                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                type="email"
                                                value={general.supportEmail}
                                                onChange={(event) =>
                                                    setGeneral({
                                                        ...general,
                                                        supportEmail: event.target.value,
                                                    })
                                                }
                                                className={`${inputClass} pl-9`}
                                            />
                                        </div>
                                    </Field>

                                    <Field label="Contact Number">
                                        <input
                                            type="text"
                                            value={general.contactNumber}
                                            onChange={(event) =>
                                                setGeneral({
                                                    ...general,
                                                    contactNumber: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Timezone">
                                        <select
                                            value={general.timezone}
                                            onChange={(event) =>
                                                setGeneral({
                                                    ...general,
                                                    timezone: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            <option value="Asia/Manila">
                                                Asia/Manila (UTC+8)
                                            </option>
                                            <option value="Asia/Singapore">
                                                Asia/Singapore (UTC+8)
                                            </option>
                                            <option value="UTC">
                                                UTC (Coordinated Universal Time)
                                            </option>
                                        </select>
                                    </Field>

                                    <Field label="Date Format">
                                        <select
                                            value={general.dateFormat}
                                            onChange={(event) =>
                                                setGeneral({
                                                    ...general,
                                                    dateFormat: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            <option value="MMM DD, YYYY">
                                                MMM DD, YYYY
                                            </option>
                                            <option value="DD/MM/YYYY">
                                                DD/MM/YYYY
                                            </option>
                                            <option value="YYYY-MM-DD">
                                                YYYY-MM-DD
                                            </option>
                                        </select>
                                    </Field>

                                    <Field label="Currency">
                                        <select
                                            value={general.currency}
                                            onChange={(event) =>
                                                setGeneral({
                                                    ...general,
                                                    currency: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            <option value="PHP (₱)">
                                                PHP (₱)
                                            </option>
                                            <option value="USD ($)">
                                                USD ($)
                                            </option>
                                        </select>
                                    </Field>

                                    <Field label="Language">
                                        <select
                                            value={general.language}
                                            onChange={(event) =>
                                                setGeneral({
                                                    ...general,
                                                    language: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            <option value="English">English</option>
                                            <option value="Filipino">
                                                Filipino
                                            </option>
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        )}

                        {/* NOTIFICATIONS */}
                        {activeTab === "notifications" && (
                            <div>
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Bell size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            Notification Preferences
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Choose which system events trigger
                                            alerts.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {NOTIFICATION_TOGGLES.map((item) => (
                                        <Toggle
                                            key={item.key}
                                            enabled={Boolean(toggles[item.key])}
                                            onChange={() => toggle(item.key)}
                                            label={item.label}
                                            description={item.description}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SECURITY */}
                        {activeTab === "security" && (
                            <div>
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            Security Settings
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Configure authentication and account
                                            protection policies.
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field
                                        label="Session Timeout (minutes)"
                                        hint="Automatically log out inactive users."
                                    >
                                        <input
                                            type="number"
                                            min={5}
                                            value={security.sessionTimeout}
                                            onChange={(event) =>
                                                setSecurity({
                                                    ...security,
                                                    sessionTimeout:
                                                        event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field
                                        label="Password Expiry (days)"
                                        hint="Set to 0 to disable expiry."
                                    >
                                        <input
                                            type="number"
                                            min={0}
                                            value={security.passwordExpiry}
                                            onChange={(event) =>
                                                setSecurity({
                                                    ...security,
                                                    passwordExpiry:
                                                        event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Maximum Login Attempts">
                                        <input
                                            type="number"
                                            min={1}
                                            value={security.maxLoginAttempts}
                                            onChange={(event) =>
                                                setSecurity({
                                                    ...security,
                                                    maxLoginAttempts:
                                                        event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Lockout Duration (minutes)">
                                        <input
                                            type="number"
                                            min={1}
                                            value={security.lockoutDuration}
                                            onChange={(event) =>
                                                setSecurity({
                                                    ...security,
                                                    lockoutDuration:
                                                        event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {SECURITY_TOGGLES.map((item) => (
                                        <Toggle
                                            key={item.key}
                                            enabled={Boolean(toggles[item.key])}
                                            onChange={() => toggle(item.key)}
                                            label={item.label}
                                            description={item.description}
                                        />
                                    ))}
                                </div>

                                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                                            Force logout all sessions
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Immediately sign out every user except
                                            the current super admin.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300"
                                    >
                                        <Lock size={15} />
                                        Force Logout
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* MAINTENANCE */}
                        {activeTab === "maintenance" && (
                            <div>
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Database size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            Maintenance & Backups
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Manage backups, retention, and
                                            maintenance windows.
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="Backup Frequency">
                                        <select
                                            value={maintenance.backupFrequency}
                                            onChange={(event) =>
                                                setMaintenance({
                                                    ...maintenance,
                                                    backupFrequency:
                                                        event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        >
                                            <option value="Hourly">Hourly</option>
                                            <option value="Daily">Daily</option>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                        </select>
                                    </Field>

                                    <Field label="Backup Time">
                                        <input
                                            type="time"
                                            value={maintenance.backupTime}
                                            onChange={(event) =>
                                                setMaintenance({
                                                    ...maintenance,
                                                    backupTime: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field
                                        label="Retention Period (days)"
                                        hint="How long backups and logs are kept."
                                    >
                                        <input
                                            type="number"
                                            min={1}
                                            value={maintenance.retentionDays}
                                            onChange={(event) =>
                                                setMaintenance({
                                                    ...maintenance,
                                                    retentionDays:
                                                        event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Storage Used">
                                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                                            <HardDrive
                                                size={16}
                                                className="text-slate-400"
                                            />
                                            <div className="flex-1">
                                                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                    <div className="h-full w-[42%] rounded-full bg-amber-500" />
                                                </div>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    42% of 100 GB used
                                                </p>
                                            </div>
                                        </div>
                                    </Field>
                                </div>

                                <div className="mb-5">
                                    <Field
                                        label="Maintenance Message"
                                        hint="Shown to non-admin users while maintenance mode is active."
                                    >
                                        <textarea
                                            rows={3}
                                            value={maintenance.maintenanceMessage}
                                            onChange={(event) =>
                                                setMaintenance({
                                                    ...maintenance,
                                                    maintenanceMessage:
                                                        event.target.value,
                                                })
                                            }
                                            className={`${inputClass} resize-none`}
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {MAINTENANCE_TOGGLES.map((item) => (
                                        <Toggle
                                            key={item.key}
                                            enabled={Boolean(toggles[item.key])}
                                            onChange={() => toggle(item.key)}
                                            label={item.label}
                                            description={item.description}
                                        />
                                    ))}
                                </div>

                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                    <button
                                        type="button"
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                    >
                                        <RefreshCw size={15} />
                                        Run Backup Now
                                    </button>

                                    <button
                                        type="button"
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                                    >
                                        <Trash2 size={15} />
                                        Clear Application Cache
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
