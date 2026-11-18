import { useEffect, useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import SuperAdminLayout from "@/Layouts/SuperAdminLayout";
import {
    Activity,
    CalendarDays,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    KeyRound,
    Lock,
    Mail,
    MapPin,
    Phone,
    Save,
    Shield,
    ShieldCheck,
    UserCircle,
    Users,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type TabKey = "personal" | "security" | "activity";

/*
|--------------------------------------------------------------------------
| SAMPLE DATA
|--------------------------------------------------------------------------
*/

const RECENT_ACTIVITY = [
    {
        id: 1,
        title: "Generated financial summary report",
        detail: "October 2026 Financial Summary · PDF",
        time: "Today, 10:42 AM",
        icon: "report",
    },
    {
        id: 2,
        title: "Invited a new administrator",
        detail: "maria.santos@alibaton.com · Admin Management",
        time: "Yesterday, 3:18 PM",
        icon: "user",
    },
    {
        id: 3,
        title: "Updated compliance record",
        detail: "DOLE Occupational Safety Report · Due Soon",
        time: "Yesterday, 9:05 AM",
        icon: "compliance",
    },
    {
        id: 4,
        title: "Reviewed document access request",
        detail: "Heavy Equipment Insurance · Approved",
        time: "Nov 2, 2026, 4:30 PM",
        icon: "document",
    },
    {
        id: 5,
        title: "Signed in from a new device",
        detail: "Windows · Chrome · Quezon City, PH",
        time: "Nov 1, 2026, 8:12 AM",
        icon: "security",
    },
];

const ACTIVE_SESSIONS = [
    {
        id: 1,
        device: "Windows · Chrome",
        location: "Quezon City, Philippines",
        lastActive: "Active now",
        current: true,
    },
    {
        id: 2,
        device: "Android · ALIBATON App",
        location: "Manila, Philippines",
        lastActive: "2 hours ago",
        current: false,
    },
    {
        id: 3,
        device: "macOS · Safari",
        location: "Cebu City, Philippines",
        lastActive: "Yesterday",
        current: false,
    },
];

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function getInitials(name?: string | null) {
    if (!name) return "SA";

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

function activityIcon(type: string) {
    switch (type) {
        case "report":
            return <Activity size={16} />;
        case "user":
            return <Users size={16} />;
        case "compliance":
            return <ShieldCheck size={16} />;
        case "document":
            return <CalendarDays size={16} />;
        default:
            return <Shield size={16} />;
    }
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function MyProfile() {
    const { auth } = usePage<any>().props;
    const user = auth?.user;

    const [activeTab, setActiveTab] = useState<TabKey>("personal");
    const [saved, setSaved] = useState(false);

    const [personal, setPersonal] = useState({
        name: user?.name ?? "Super Admin",
        email: user?.email ?? "superadmin@alibaton.com",
        phone: "+63 917 555 0142",
        position: "System Administrator",
        department: "Information Technology",
        location: "Quezon City, Philippines",
        bio: "Oversees the ALIBATON platform, manages administrator accounts, and monitors system-wide compliance and financial activity.",
    });

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [passwords, setPasswords] = useState({
        current: "",
        next: "",
        confirm: "",
    });

    useEffect(() => {
        if (!saved) return;

        const timer = window.setTimeout(() => setSaved(false), 3000);

        return () => window.clearTimeout(timer);
    }, [saved]);

    const initials = useMemo(() => getInitials(personal.name), [personal.name]);

    const passwordChecks = useMemo(() => {
        return {
            length: passwords.next.length >= 8,
            uppercase: /[A-Z]/.test(passwords.next),
            lowercase: /[a-z]/.test(passwords.next),
            number: /[0-9]/.test(passwords.next),
            special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]/.test(
                passwords.next,
            ),
        };
    }, [passwords.next]);

    const allPasswordChecksPassed = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch =
        passwords.confirm.length > 0 && passwords.next === passwords.confirm;

    const handleSave = () => {
        setSaved(true);
    };

    const handlePasswordSave = () => {
        if (!allPasswordChecksPassed || !passwordsMatch) return;

        setPasswords({ current: "", next: "", confirm: "" });
        setSaved(true);
    };

    return (
        <SuperAdminLayout>
            <Head title="My Profile" />

            <div className="space-y-6">
                {/* HEADER */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                            <UserCircle
                                size={24}
                                className="text-amber-600 dark:text-amber-400"
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                My Profile
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Manage your personal information, password, and
                                account activity.
                            </p>
                        </div>
                    </div>

                    {activeTab !== "activity" && (
                        <button
                            type="button"
                            onClick={
                                activeTab === "personal"
                                    ? handleSave
                                    : handlePasswordSave
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-400"
                        >
                            <Save size={16} />
                            {activeTab === "personal"
                                ? "Save Profile"
                                : "Update Password"}
                        </button>
                    )}
                </div>

                {saved && activeTab !== "activity" && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={16} />
                        {activeTab === "personal"
                            ? "Profile updated successfully."
                            : "Password updated successfully."}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
                    {/* PROFILE CARD */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-bold text-[#0A0F1D] shadow-lg shadow-amber-500/20">
                                {initials}
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                                {personal.name}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {personal.position}
                            </p>

                            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                <Shield size={12} />
                                Super Administrator
                            </span>

                            <div className="mt-5 space-y-2.5 border-t border-slate-200 pt-4 text-left dark:border-slate-800">
                                <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <Mail
                                        size={14}
                                        className="shrink-0 text-amber-600 dark:text-amber-400"
                                    />
                                    <span className="truncate">
                                        {personal.email}
                                    </span>
                                </p>
                                <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <Phone
                                        size={14}
                                        className="shrink-0 text-amber-600 dark:text-amber-400"
                                    />
                                    {personal.phone}
                                </p>
                                <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <MapPin
                                        size={14}
                                        className="shrink-0 text-amber-600 dark:text-amber-400"
                                    />
                                    {personal.location}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                Account Summary
                            </p>

                            <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        Account Status
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Active
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        Member Since
                                    </span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        Jan 2024
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        Last Login
                                    </span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        Today, 8:12 AM
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        Active Sessions
                                    </span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        3 devices
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/80 dark:bg-[#0A0F1D]">
                        {/* TABS */}
                        <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                            {[
                                { key: "personal" as TabKey, label: "Personal Info" },
                                { key: "security" as TabKey, label: "Security" },
                                { key: "activity" as TabKey, label: "Activity" },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                                        activeTab === tab.key
                                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* PERSONAL */}
                        {activeTab === "personal" && (
                            <div>
                                <div className="mb-5">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Personal Information
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Update your contact details and public
                                        profile.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={personal.name}
                                            onChange={(event) =>
                                                setPersonal({
                                                    ...personal,
                                                    name: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={personal.email}
                                            onChange={(event) =>
                                                setPersonal({
                                                    ...personal,
                                                    email: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            value={personal.phone}
                                            onChange={(event) =>
                                                setPersonal({
                                                    ...personal,
                                                    phone: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Position
                                        </label>
                                        <input
                                            type="text"
                                            value={personal.position}
                                            onChange={(event) =>
                                                setPersonal({
                                                    ...personal,
                                                    position: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Department
                                        </label>
                                        <input
                                            type="text"
                                            value={personal.department}
                                            onChange={(event) =>
                                                setPersonal({
                                                    ...personal,
                                                    department: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Location
                                        </label>
                                        <input
                                            type="text"
                                            value={personal.location}
                                            onChange={(event) =>
                                                setPersonal({
                                                    ...personal,
                                                    location: event.target.value,
                                                })
                                            }
                                            className={inputClass}
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            About
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={personal.bio}
                                            onChange={(event) =>
                                                setPersonal({
                                                    ...personal,
                                                    bio: event.target.value,
                                                })
                                            }
                                            className={`${inputClass} resize-none`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECURITY */}
                        {activeTab === "security" && (
                            <div>
                                <div className="mb-5">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Change Password
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Use a strong password that you do not use
                                        on other websites.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <Lock
                                                size={15}
                                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                type={
                                                    showCurrentPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={passwords.current}
                                                onChange={(event) =>
                                                    setPasswords({
                                                        ...passwords,
                                                        current: event.target.value,
                                                    })
                                                }
                                                className={`${inputClass} pl-9 pr-10`}
                                                placeholder="Enter current password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowCurrentPassword(
                                                        (current) => !current,
                                                    )
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                aria-label="Toggle current password visibility"
                                            >
                                                {showCurrentPassword ? (
                                                    <EyeOff size={16} />
                                                ) : (
                                                    <Eye size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <KeyRound
                                                    size={15}
                                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                />
                                                <input
                                                    type={
                                                        showNewPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    value={passwords.next}
                                                    onChange={(event) =>
                                                        setPasswords({
                                                            ...passwords,
                                                            next: event.target.value,
                                                        })
                                                    }
                                                    className={`${inputClass} pl-9 pr-10`}
                                                    placeholder="Enter new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowNewPassword(
                                                            (current) => !current,
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    aria-label="Toggle new password visibility"
                                                >
                                                    {showNewPassword ? (
                                                        <EyeOff size={16} />
                                                    ) : (
                                                        <Eye size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                Confirm New Password
                                            </label>
                                            <div className="relative">
                                                <KeyRound
                                                    size={15}
                                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                />
                                                <input
                                                    type={
                                                        showConfirmPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    value={passwords.confirm}
                                                    onChange={(event) =>
                                                        setPasswords({
                                                            ...passwords,
                                                            confirm:
                                                                event.target.value,
                                                        })
                                                    }
                                                    className={`${inputClass} pl-9 pr-10`}
                                                    placeholder="Re-enter new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowConfirmPassword(
                                                            (current) => !current,
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    aria-label="Toggle confirm password visibility"
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff size={16} />
                                                    ) : (
                                                        <Eye size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                                        <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Password requirements
                                        </p>

                                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                            {[
                                                {
                                                    met: passwordChecks.length,
                                                    label: "At least 8 characters",
                                                },
                                                {
                                                    met: passwordChecks.uppercase,
                                                    label: "One uppercase letter",
                                                },
                                                {
                                                    met: passwordChecks.lowercase,
                                                    label: "One lowercase letter",
                                                },
                                                {
                                                    met: passwordChecks.number,
                                                    label: "One number",
                                                },
                                                {
                                                    met: passwordChecks.special,
                                                    label: "One special character",
                                                },
                                                {
                                                    met: passwordsMatch,
                                                    label: "Passwords match",
                                                },
                                            ].map((check) => (
                                                <div
                                                    key={check.label}
                                                    className={`flex items-center gap-1.5 text-[11px] ${
                                                        check.met
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : "text-slate-500"
                                                    }`}
                                                >
                                                    <CheckCircle2
                                                        size={13}
                                                        className={
                                                            check.met
                                                                ? "opacity-100"
                                                                : "opacity-40"
                                                        }
                                                    />
                                                    {check.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Active Sessions
                                        </h3>
                                        <p className="mb-3 text-xs text-slate-500">
                                            Devices currently signed in to your
                                            account.
                                        </p>

                                        <div className="space-y-2">
                                            {ACTIVE_SESSIONS.map((session) => (
                                                <div
                                                    key={session.id}
                                                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div>
                                                        <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                                                            {session.device}
                                                            {session.current && (
                                                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                                    Current
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-500">
                                                            {session.location} ·{" "}
                                                            {session.lastActive}
                                                        </p>
                                                    </div>

                                                    {!session.current && (
                                                        <button
                                                            type="button"
                                                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-300"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACTIVITY */}
                        {activeTab === "activity" && (
                            <div>
                                <div className="mb-5">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Recent Activity
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Your latest actions across the ALIBATON
                                        system.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {RECENT_ACTIVITY.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                                        >
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                {activityIcon(item.icon)}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {item.title}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {item.detail}
                                                </p>
                                            </div>

                                            <p className="hidden whitespace-nowrap text-[11px] text-slate-500 sm:block">
                                                {item.time}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                                    <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                                        Activity history older than 90 days is
                                        archived and available in the Activity
                                        Logs module.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SuperAdminLayout>
    );
}
