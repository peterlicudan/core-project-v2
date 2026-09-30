import { Head, useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import UserLayout from "../../Layouts/UserLayout";

import {
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Settings as SettingsIcon,
    ShieldCheck,
    CheckCircle2,
    X,
    KeyRound,
    CircleCheck,
    CircleX,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type UserData = {
    id?: number;
    name?: string;
    email?: string;
};

type PageProps = {
    auth?: {
        user?: UserData;
    };
    flash?: {
        success?: string;
        error?: string;
    };
};

/*
|--------------------------------------------------------------------------
| MAIN COMPONENT
|--------------------------------------------------------------------------
*/

export default function Settings() {
    const { auth, flash } =
        usePage<PageProps>().props;

    const user = auth?.user;

    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [showCurrentPassword, setShowCurrentPassword] =
        useState(false);

    const [showNewPassword, setShowNewPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [successMessage, setSuccessMessage] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    /*
    |--------------------------------------------------------------------------
    | PASSWORD FORM
    |--------------------------------------------------------------------------
    */

    const passwordForm = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    /*
    |--------------------------------------------------------------------------
    | PASSWORD
    |--------------------------------------------------------------------------
    */

    const password =
        passwordForm.data.password;

    const passwordRequirements = {
        length:
            password.length >= 8 &&
            password.length <= 12,

        uppercase:
            /[A-Z]/.test(password),

        lowercase:
            /[a-z]/.test(password),

        number:
            /[0-9]/.test(password),

        special:
            /[^A-Za-z0-9]/.test(password),
    };

    const passwordIsValid =
        passwordRequirements.length &&
        passwordRequirements.uppercase &&
        passwordRequirements.lowercase &&
        passwordRequirements.number &&
        passwordRequirements.special;

    const passwordsMatch =
        passwordForm.data.password_confirmation
            .length > 0 &&
        passwordForm.data.password ===
            passwordForm.data.password_confirmation;

    /*
    |--------------------------------------------------------------------------
    | FLASH MESSAGE
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(
                flash.success
            );
        }

        if (flash?.error) {
            setErrorMessage(
                flash.error
            );
        }
    }, [
        flash?.success,
        flash?.error,
    ]);

    /*
    |--------------------------------------------------------------------------
    | SUCCESS AUTO HIDE
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timer =
            window.setTimeout(() => {
                setSuccessMessage("");
            }, 5000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [successMessage]);

    /*
    |--------------------------------------------------------------------------
    | ERROR AUTO HIDE
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!errorMessage) {
            return;
        }

        const timer =
            window.setTimeout(() => {
                setErrorMessage("");
            }, 6000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [errorMessage]);

    /*
    |--------------------------------------------------------------------------
    | UPDATE PASSWORD
    |--------------------------------------------------------------------------
    */

    const updatePassword = (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        setSuccessMessage("");
        setErrorMessage("");

        if (
            !passwordForm.data.current_password
        ) {
            setErrorMessage(
                "Please enter your current password."
            );

            return;
        }

        if (!passwordIsValid) {
            setErrorMessage(
                "Please complete all password requirements."
            );

            return;
        }

        if (!passwordsMatch) {
            setErrorMessage(
                "New password and confirmation password do not match."
            );

            return;
        }

        passwordForm.put(
            "/password",
            {
                preserveScroll: true,

                onSuccess: () => {
                    passwordForm.reset();

                    setShowCurrentPassword(
                        false
                    );

                    setShowNewPassword(
                        false
                    );

                    setShowConfirmPassword(
                        false
                    );

                    setSuccessMessage(
                        "Your password has been updated successfully."
                    );
                },

                onError: (
                    errors
                ) => {
                    const firstError =
                        Object.values(
                            errors
                        )[0];

                    setErrorMessage(
                        firstError ??
                            "Unable to update your password. Please check your current password."
                    );
                },
            }
        );
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="Settings | ALIBATON" />

            <UserLayout>
                <div className="w-full min-w-0 text-gray-900 dark:text-white">

                    {/* =====================================================
                        SUCCESS TOAST
                    ===================================================== */}

                    {successMessage && (
                        <div className="fixed right-4 top-4 z-[9999] w-[calc(100%-2rem)] max-w-md">
                            <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-gray-50 dark:bg-slate-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>

                                <div className="min-w-0 flex-1">

                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        Successfully Updated
                                    </p>

                                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                                        {successMessage}
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSuccessMessage(
                                            ""
                                        )
                                    }
                                    className="rounded-lg p-1.5 text-gray-500 dark:text-slate-500 transition hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                    aria-label="Close success notification"
                                >
                                    <X size={16} />
                                </button>

                            </div>
                        </div>
                    )}

                    {/* =====================================================
                        ERROR TOAST
                    ===================================================== */}

                    {errorMessage && (
                        <div className="fixed right-4 top-4 z-[9999] w-[calc(100%-2rem)] max-w-md">
                            <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-gray-50 dark:bg-slate-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
                                    <CircleX className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>

                                <div className="min-w-0 flex-1">

                                    <p className="text-sm font-bold text-red-600 dark:text-red-300">
                                        Update Failed
                                    </p>

                                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                                        {errorMessage}
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setErrorMessage(
                                            ""
                                        )
                                    }
                                    className="rounded-lg p-1.5 text-gray-500 dark:text-slate-500 transition hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                                    aria-label="Close error notification"
                                >
                                    <X size={16} />
                                </button>

                            </div>
                        </div>
                    )}

                    {/* =====================================================
                        PAGE HEADER
                    ===================================================== */}

                    <div className="mb-6">

                        <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/10">
                                <SettingsIcon size={21} />
                            </div>

                            <div className="min-w-0">

                                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                                    Settings
                                </h1>

                                <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-500 sm:text-sm">
                                    Manage your account security
                                    and review your account
                                    information.
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* =====================================================
                        ACCOUNT INFORMATION
                    ===================================================== */}

                    <section className="mb-5 rounded-2xl border border-yellow-400/20 bg-white dark:bg-slate-900/90 p-4 shadow-xl shadow-black/20 sm:p-5">

                        <div className="mb-5 flex items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                <User size={18} />
                            </div>

                            <div className="min-w-0">

                                <h2 className="text-base font-bold sm:text-lg">
                                    Account Information
                                </h2>

                                <p className="text-[11px] text-gray-500 dark:text-slate-500 sm:text-xs">
                                    Your account identity is
                                    controlled by the system.
                                </p>

                            </div>

                        </div>

                        {/* ACCOUNT IDENTITY */}

                        <div className="grid gap-4 md:grid-cols-2">

                            {/* FULL NAME */}

                            <ReadOnlyAccountField
                                label="Full Name"
                                value={
                                    user?.name ??
                                    "User"
                                }
                                icon={
                                    <User
                                        size={17}
                                    />
                                }
                            />

                            {/* EMAIL */}

                            <ReadOnlyAccountField
                                label="Email Address"
                                value={
                                    user?.email ??
                                    "No email"
                                }
                                icon={
                                    <Mail
                                        size={17}
                                    />
                                }
                            />

                        </div>

                        {/* LOCKED NOTICE */}

                        <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 p-3.5">

                            <ShieldCheck
                                size={17}
                                className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400"
                            />

                            <p className="text-[11px] leading-relaxed text-gray-500 dark:text-slate-500">
                                Your name and email address
                                are fixed account information
                                and cannot be changed from
                                this page.
                            </p>

                        </div>

                    </section>

                    {/* =====================================================
                        SECURITY
                    ===================================================== */}

                    <section className="mb-5 rounded-2xl border border-yellow-400/20 bg-white dark:bg-slate-900/90 p-4 shadow-xl shadow-black/20 sm:p-5">

                        {/* HEADER */}

                        <div className="mb-5 flex items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-600 dark:text-yellow-400">
                                <ShieldCheck size={18} />
                            </div>

                            <div className="min-w-0">

                                <h2 className="text-base font-bold sm:text-lg">
                                    Security
                                </h2>

                                <p className="text-[11px] text-gray-500 dark:text-slate-500 sm:text-xs">
                                    Protect your account with
                                    a strong password.
                                </p>

                            </div>

                        </div>

                        {/* =================================================
                            SECURITY STATUS
                        ================================================= */}

                        <div className="mb-5 grid gap-3 sm:grid-cols-3">

                            <SecurityStatus
                                icon={
                                    <ShieldCheck
                                        size={15}
                                    />
                                }
                                title="Account"
                                value="Active"
                            />

                            <SecurityStatus
                                icon={
                                    <KeyRound
                                        size={15}
                                    />
                                }
                                title="Password"
                                value="Protected"
                            />

                            <SecurityStatus
                                icon={
                                    <CheckCircle2
                                        size={15}
                                    />
                                }
                                title="Access"
                                value="Authorized"
                            />

                        </div>

                        {/* =================================================
                            CHANGE PASSWORD
                        ================================================= */}

                        <div className="border-t border-gray-200 dark:border-slate-800 pt-5">

                            <div className="mb-4">

                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Change Password
                                </h3>

                                <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-slate-500">
                                    Password must contain
                                    8–12 characters,
                                    including uppercase,
                                    lowercase, number,
                                    and special character.
                                </p>

                            </div>

                            <form
                                onSubmit={
                                    updatePassword
                                }
                            >

                                <div className="grid gap-4 md:grid-cols-3">

                                    {/* CURRENT PASSWORD */}

                                    <PasswordInput
                                        label="Current Password"
                                        value={
                                            passwordForm
                                                .data
                                                .current_password
                                        }
                                        onChange={(
                                            value
                                        ) =>
                                            passwordForm.setData(
                                                "current_password",
                                                value
                                            )
                                        }
                                        show={
                                            showCurrentPassword
                                        }
                                        toggle={() =>
                                            setShowCurrentPassword(
                                                !showCurrentPassword
                                            )
                                        }
                                        error={
                                            passwordForm
                                                .errors
                                                .current_password
                                        }
                                    />

                                    {/* NEW PASSWORD */}

                                    <PasswordInput
                                        label="New Password"
                                        value={
                                            passwordForm
                                                .data
                                                .password
                                        }
                                        onChange={(
                                            value
                                        ) =>
                                            passwordForm.setData(
                                                "password",
                                                value
                                            )
                                        }
                                        show={
                                            showNewPassword
                                        }
                                        toggle={() =>
                                            setShowNewPassword(
                                                !showNewPassword
                                            )
                                        }
                                        error={
                                            passwordForm
                                                .errors
                                                .password
                                        }
                                    />

                                    {/* CONFIRM PASSWORD */}

                                    <PasswordInput
                                        label="Confirm New Password"
                                        value={
                                            passwordForm
                                                .data
                                                .password_confirmation
                                        }
                                        onChange={(
                                            value
                                        ) =>
                                            passwordForm.setData(
                                                "password_confirmation",
                                                value
                                            )
                                        }
                                        show={
                                            showConfirmPassword
                                        }
                                        toggle={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        error={
                                            passwordForm
                                                .errors
                                                .password_confirmation
                                        }
                                    />

                                </div>

                                {/* =================================================
                                    PASSWORD REQUIREMENTS
                                ================================================= */}

                                <div className="mt-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 p-3">

                                    <p className="mb-2 text-[11px] font-bold text-gray-700 dark:text-slate-300">
                                        Password requirements
                                    </p>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">

                                        <PasswordRequirement
                                            valid={
                                                passwordRequirements.length
                                            }
                                            text="8–12 characters"
                                        />

                                        <PasswordRequirement
                                            valid={
                                                passwordRequirements.uppercase
                                            }
                                            text="Uppercase"
                                        />

                                        <PasswordRequirement
                                            valid={
                                                passwordRequirements.lowercase
                                            }
                                            text="Lowercase"
                                        />

                                        <PasswordRequirement
                                            valid={
                                                passwordRequirements.number
                                            }
                                            text="Number"
                                        />

                                        <PasswordRequirement
                                            valid={
                                                passwordRequirements.special
                                            }
                                            text="Special character"
                                        />

                                    </div>

                                </div>

                                {/* =================================================
                                    PASSWORD MATCH
                                ================================================= */}

                                {passwordForm
                                    .data
                                    .password_confirmation
                                    .length > 0 && (
                                    <div className="mt-3">

                                        <PasswordRequirement
                                            valid={
                                                passwordsMatch
                                            }
                                            text="Passwords match"
                                        />

                                    </div>
                                )}

                                {/* =================================================
                                    SERVER ERROR
                                ================================================= */}

                                {(passwordForm
                                    .errors
                                    .current_password ||
                                    passwordForm
                                        .errors
                                        .password ||
                                    passwordForm
                                        .errors
                                        .password_confirmation) && (
                                    <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-3">

                                        <p className="text-xs leading-relaxed text-red-600 dark:text-red-400">
                                            Please correct
                                            the password
                                            errors shown
                                            above.
                                        </p>

                                    </div>
                                )}

                                {/* =================================================
                                    UPDATE PASSWORD
                                ================================================= */}

                                <div className="mt-4 flex justify-end">

                                    <button
                                        type="submit"
                                        disabled={
                                            passwordForm.processing ||
                                            !passwordForm.data.current_password ||
                                            !passwordIsValid ||
                                            !passwordsMatch
                                        }
                                        className="
                                            flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            bg-yellow-400
                                            px-5
                                            py-2.5
                                            text-xs
                                            font-black
                                            text-black
                                            shadow-lg
                                            shadow-yellow-400/10
                                            transition
                                            hover:bg-yellow-300
                                            disabled:cursor-not-allowed
                                            disabled:opacity-40
                                            sm:w-auto
                                        "
                                    >

                                        <Lock
                                            size={16}
                                        />

                                        {passwordForm.processing
                                            ? "Updating..."
                                            : "Update Password"}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </section>



                </div>
            </UserLayout>
        </>
    );
}

/*
|--------------------------------------------------------------------------
| READ-ONLY ACCOUNT FIELD
|--------------------------------------------------------------------------
*/

function ReadOnlyAccountField({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="min-w-0">

            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                {label}
            </label>

            <div className="relative">

                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">
                    {icon}
                </span>

                <input
                    type="text"
                    value={value}
                    readOnly
                    disabled
                    className="
                        h-11
                        w-full
                        cursor-not-allowed
                        rounded-xl
                        border
                        border-gray-200 dark:border-slate-800
                        bg-gray-100 dark:bg-slate-800/60
                        pl-10
                        pr-3
                        text-sm
                        font-medium
                        text-gray-500 dark:text-slate-500
                        outline-none
                    "
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                    Fixed
                </span>

            </div>

        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PASSWORD INPUT
|--------------------------------------------------------------------------
*/

function PasswordInput({
    label,
    value,
    onChange,
    show,
    toggle,
    error,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    show: boolean;
    toggle: () => void;
    error?: string;
}) {
    return (
        <div className="min-w-0">

            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                {label}
            </label>

            <div className="relative">

                <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500"
                />

                <input
                    type={
                        show
                            ? "text"
                            : "password"
                    }
                    value={value}
                    maxLength={12}
                    onChange={(e) =>
                        onChange(
                            e.target.value
                        )
                    }
                    className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-gray-300 dark:border-slate-700
                        bg-gray-100 dark:bg-slate-800
                        pl-10
                        pr-11
                        text-sm
                        text-gray-900 dark:text-white
                        outline-none
                        transition
                        placeholder:text-slate-600
                        focus:border-yellow-400
                        focus:ring-1
                        focus:ring-yellow-400/20
                    "
                    placeholder="8–12 characters"
                />

                <button
                    type="button"
                    onClick={toggle}
                    className="
                        absolute
                        right-2.5
                        top-1/2
                        flex
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        p-1.5
                        text-gray-500 dark:text-slate-500
                        transition
                        hover:bg-gray-200 dark:hover:bg-slate-700
                        hover:text-yellow-600 dark:hover:text-yellow-400
                    "
                    aria-label={
                        show
                            ? `Hide ${label}`
                            : `Show ${label}`
                    }
                >
                    {show ? (
                        <EyeOff size={16} />
                    ) : (
                        <Eye size={16} />
                    )}
                </button>

            </div>

            {error && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

        </div>
    );
}

/*
|--------------------------------------------------------------------------
| PASSWORD REQUIREMENT
|--------------------------------------------------------------------------
*/

function PasswordRequirement({
    valid,
    text,
}: {
    valid: boolean;
    text: string;
}) {
    return (
        <div className="flex items-center gap-1.5">

            {valid ? (
                <CircleCheck
                    size={14}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                />
            ) : (
                <CircleX
                    size={14}
                    className="shrink-0 text-slate-600"
                />
            )}

            <span
                className={`text-[10px] ${
                    valid
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-500 dark:text-slate-500"
                }`}
            >
                {text}
            </span>

        </div>
    );
}

/*
|--------------------------------------------------------------------------
| SECURITY STATUS
|--------------------------------------------------------------------------
*/

function SecurityStatus({
    icon,
    title,
    value,
}: {
    icon: React.ReactNode;
    title: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-800/40 p-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                {icon}
            </div>

            <div className="min-w-0">

                <p className="text-[10px] text-gray-500 dark:text-slate-500">
                    {title}
                </p>

                <p className="mt-0.5 truncate text-xs font-bold text-gray-800 dark:text-slate-200">
                    {value}
                </p>

            </div>

        </div>
    );
}
