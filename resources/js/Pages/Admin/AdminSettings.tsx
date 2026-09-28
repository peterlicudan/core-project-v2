import { Head, useForm, usePage } from "@inertiajs/react";
import type { PageProps } from "@inertiajs/core";
import {
    Settings,
    User,
    Lock,
    Save,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    X,
    Check,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import AdminSidebar from "../../Components/Admin/AdminSidebar";

// ===========================================================
// TYPES
// ===========================================================

interface AuthUser {
    id: number;
    name: string;
    email: string;
    role?: string;
}

interface FlashMessages {
    success?: string;
    error?: string;
}

interface AdminSettingsPageProps extends PageProps {
    auth: {
        user: AuthUser | null;
    };
    flash?: FlashMessages;
}

interface RequirementRowProps {
    met: boolean;
    label: string;
}

// ===========================================================
// COMPONENT
// ===========================================================

export default function AdminSettings() {
    const { auth, flash } = usePage<AdminSettingsPageProps>().props;

    const [successMessage, setSuccessMessage] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Password visibility toggles
    const [showCurrentPassword, setShowCurrentPassword] =
        useState<boolean>(false);
    const [showNewPassword, setShowNewPassword] =
        useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState<boolean>(false);

    // Profile form
    const profileForm = useForm({
        name: auth?.user?.name ?? "Administrator",
        email: auth?.user?.email ?? "admin@alibaton.com",
    });

    // Password form
    const passwordForm = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    // ===========================================================
    // PASSWORD REQUIREMENTS
    // ===========================================================

    const passwordValue: string = passwordForm.data.password || "";

    const passwordChecks = useMemo(() => {
        return {
            length: passwordValue.length >= 8,
            uppercase: /[A-Z]/.test(passwordValue),
            lowercase: /[a-z]/.test(passwordValue),
            number: /[0-9]/.test(passwordValue),
            special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]/.test(
                passwordValue
            ),
        };
    }, [passwordValue]);

    const allRequirementsMet: boolean = useMemo(() => {
        return Object.values(passwordChecks).every(Boolean);
    }, [passwordChecks]);

    const passwordsMatch: boolean = useMemo(() => {
        if (!passwordForm.data.password_confirmation) return false;
        return (
            passwordForm.data.password ===
            passwordForm.data.password_confirmation
        );
    }, [
        passwordForm.data.password,
        passwordForm.data.password_confirmation,
    ]);

    // Auto-dismiss messages
    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage("");
                setErrorMessage("");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    // Show flash messages from backend
    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
        }
        if (flash?.error) {
            setErrorMessage(flash.error);
        }
    }, [flash]);

    // Handle profile update
    const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSuccessMessage("");
        setErrorMessage("");

        profileForm.put("/admin/settings/profile", {
            preserveScroll: true,
            onSuccess: () => {
                setSuccessMessage("Profile updated successfully.");
            },
            onError: () => {
                setErrorMessage("Please fix the errors below.");
            },
        });
    };

    // Handle password update
    const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSuccessMessage("");
        setErrorMessage("");

        // Frontend check bago mag-submit
        if (!allRequirementsMet) {
            setErrorMessage(
                "Password must meet all the requirements listed below."
            );
            return;
        }

        if (!passwordsMatch) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        passwordForm.put("/admin/settings/password", {
            preserveScroll: true,
            onSuccess: () => {
                setSuccessMessage("Password changed successfully.");
                passwordForm.reset();
                setShowCurrentPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
            },
            onError: () => {
                setErrorMessage("Please fix the errors below.");
            },
        });
    };

    return (
        <>
            <Head title="Admin Settings" />

            <AdminSidebar />

            <main className="min-h-screen bg-black text-white pt-16 lg:ml-72 lg:pt-0">
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-4xl">

                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400/10">
                                    <Settings className="h-6 w-6 text-yellow-400" />
                                </div>

                                <div>
                                    <h1 className="text-3xl font-black">
                                        Settings
                                    </h1>

                                    <p className="mt-1 text-white/50">
                                        Manage administrator account settings.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Flash Messages */}
                        {successMessage && (
                            <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-400">
                                <CheckCircle className="h-5 w-5 shrink-0" />
                                <p className="text-sm">{successMessage}</p>
                            </div>
                        )}

                        {errorMessage && (
                            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p className="text-sm">{errorMessage}</p>
                            </div>
                        )}

                        <div className="space-y-5">

                            {/* ============================= */}
                            {/* Change Password Form          */}
                            {/* ============================= */}
                            <form onSubmit={handlePasswordSubmit}>
                                <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
                                    <div className="flex items-center gap-3">
                                        <Lock className="h-5 w-5 text-yellow-400" />

                                        <h2 className="font-bold">
                                            Change Password
                                        </h2>
                                    </div>

                                    <div className="mt-5 space-y-4">

                                        {/* Current Password */}
                                        <div>
                                            <div className="relative">
                                                <input
                                                    type={
                                                        showCurrentPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="Current password"
                                                    value={
                                                        passwordForm.data
                                                            .current_password
                                                    }
                                                    onChange={(e) =>
                                                        passwordForm.setData(
                                                            "current_password",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 outline-none focus:border-yellow-400/50"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowCurrentPassword(
                                                            (prev) => !prev
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-yellow-400"
                                                    aria-label={
                                                        showCurrentPassword
                                                            ? "Hide password"
                                                            : "Show password"
                                                    }
                                                >
                                                    {showCurrentPassword ? (
                                                        <EyeOff className="h-5 w-5" />
                                                    ) : (
                                                        <Eye className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>

                                            {passwordForm.errors
                                                .current_password && (
                                                <p className="mt-1 text-sm text-red-400">
                                                    {
                                                        passwordForm.errors
                                                            .current_password
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        {/* New Password */}
                                        <div>
                                            <div className="relative">
                                                <input
                                                    type={
                                                        showNewPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="New password"
                                                    value={
                                                        passwordForm.data
                                                            .password
                                                    }
                                                    onChange={(e) =>
                                                        passwordForm.setData(
                                                            "password",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 outline-none focus:border-yellow-400/50"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowNewPassword(
                                                            (prev) => !prev
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-yellow-400"
                                                    aria-label={
                                                        showNewPassword
                                                            ? "Hide password"
                                                            : "Show password"
                                                    }
                                                >
                                                    {showNewPassword ? (
                                                        <EyeOff className="h-5 w-5" />
                                                    ) : (
                                                        <Eye className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>

                                            {/* PASSWORD REQUIREMENTS */}
                                            {passwordValue.length > 0 && (
                                                <div className="mt-3 rounded-xl border border-white/10 bg-white/3 p-4">
                                                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/50">
                                                        Password Requirements
                                                    </p>

                                                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        <RequirementRow
                                                            met={
                                                                passwordChecks.length
                                                            }
                                                            label="At least 8 characters"
                                                        />
                                                        <RequirementRow
                                                            met={
                                                                passwordChecks.uppercase
                                                            }
                                                            label="One uppercase letter (A-Z)"
                                                        />
                                                        <RequirementRow
                                                            met={
                                                                passwordChecks.lowercase
                                                            }
                                                            label="One lowercase letter (a-z)"
                                                        />
                                                        <RequirementRow
                                                            met={
                                                                passwordChecks.number
                                                            }
                                                            label="One number (0-9)"
                                                        />
                                                        <RequirementRow
                                                            met={
                                                                passwordChecks.special
                                                            }
                                                            label="One special character (!@#$...)"
                                                        />
                                                    </ul>
                                                </div>
                                            )}

                                            {passwordForm.errors.password && (
                                                <p className="mt-1 text-sm text-red-400">
                                                    {
                                                        passwordForm.errors
                                                            .password
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        {/* Confirm New Password */}
                                        <div>
                                            <div className="relative">
                                                <input
                                                    type={
                                                        showConfirmPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="Confirm new password"
                                                    value={
                                                        passwordForm.data
                                                            .password_confirmation
                                                    }
                                                    onChange={(e) =>
                                                        passwordForm.setData(
                                                            "password_confirmation",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 outline-none focus:border-yellow-400/50"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowConfirmPassword(
                                                            (prev) => !prev
                                                        )
                                                    }
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-yellow-400"
                                                    aria-label={
                                                        showConfirmPassword
                                                            ? "Hide password"
                                                            : "Show password"
                                                    }
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-5 w-5" />
                                                    ) : (
                                                        <Eye className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>

                                            {/* MATCH INDICATOR */}
                                            {passwordForm.data
                                                .password_confirmation
                                                .length > 0 && (
                                                <p
                                                    className={`mt-2 flex items-center gap-1.5 text-xs ${
                                                        passwordsMatch
                                                            ? "text-green-400"
                                                            : "text-red-400"
                                                    }`}
                                                >
                                                    {passwordsMatch ? (
                                                        <>
                                                            <Check
                                                                className="h-3.5 w-3.5"
                                                                strokeWidth={3}
                                                            />
                                                            Passwords match
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X
                                                                className="h-3.5 w-3.5"
                                                                strokeWidth={3}
                                                            />
                                                            Passwords do not match
                                                        </>
                                                    )}
                                                </p>
                                            )}

                                            {passwordForm.errors
                                                .password_confirmation && (
                                                <p className="mt-1 text-sm text-red-400">
                                                    {
                                                        passwordForm.errors
                                                            .password_confirmation
                                                    }
                                                </p>
                                            )}
                                        </div>

                                    </div>

                                    <div className="mt-5 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={
                                                passwordForm.processing ||
                                                !allRequirementsMet ||
                                                !passwordsMatch
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Save className="h-4 w-4" />
                                            {passwordForm.processing
                                                ? "Updating..."
                                                : "Update Password"}
                                        </button>
                                    </div>
                                </div>
                            </form>

                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

// ===========================================================
// REQUIREMENT ROW COMPONENT
// ===========================================================
// ⚠️ Nasa labas ng AdminSettings() — ito ang dahilan ng red line
// kanina. Dapat nasa labas ng component para hindi
// mag-recreate sa bawat render at hindi mag-cause ng type error.

const RequirementRow = ({ met, label }: RequirementRowProps) => (
    <li className="flex items-center gap-2 text-xs">
        <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                met
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/5 text-white/30"
            }`}
        >
            {met ? (
                <Check className="h-3 w-3" strokeWidth={3} />
            ) : (
                <X className="h-3 w-3" strokeWidth={3} />
            )}
        </span>

        <span
            className={met ? "text-green-400" : "text-white/40"}
        >
            {label}
        </span>
    </li>
);
