import React, { FormEvent, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import {
    Lock,
    Mail,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    Loader2,
    KeyRound,
    X,
} from "lucide-react";

type ResetPasswordProps = {
    token: string;
    email: string;
};

type ResetPasswordForm = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

type PasswordRequirementProps = {
    valid: boolean;
    text: string;
};

function PasswordRequirement({
    valid,
    text,
}: PasswordRequirementProps) {
    return (
        <div
            className={`flex items-center gap-2 text-xs ${
                valid ? "text-green-400" : "text-white/40"
            }`}
        >
            {valid ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
            )}

            <span>{text}</span>
        </div>
    );
}

export default function ResetPassword({
    token,
    email,
}: ResetPasswordProps) {
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
    } = useForm<ResetPasswordForm>({
        token: token ?? "",
        email: email ?? "",
        password: "",
        password_confirmation: "",
    });

    const [showPassword, setShowPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [showSuccess, setShowSuccess] =
        useState(false);

    /*
    |--------------------------------------------------------------------------
    | EMAIL VALIDATION
    |--------------------------------------------------------------------------
    */

    const emailIsValid =
        data.email.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            data.email.trim()
        );

    /*
    |--------------------------------------------------------------------------
    | PASSWORD VALIDATION
    |--------------------------------------------------------------------------
    */

    const passwordHasMinLength =
        data.password.length >= 8;

    const passwordHasUppercase =
        /[A-Z]/.test(data.password);

    const passwordHasLowercase =
        /[a-z]/.test(data.password);

    const passwordHasNumber =
        /[0-9]/.test(data.password);

    const passwordHasSpecial =
        /[^A-Za-z0-9]/.test(data.password);

    const passwordIsValid =
        passwordHasMinLength &&
        passwordHasUppercase &&
        passwordHasLowercase &&
        passwordHasNumber &&
        passwordHasSpecial;

    /*
    |--------------------------------------------------------------------------
    | PASSWORD MATCH
    |--------------------------------------------------------------------------
    */

    const passwordsMatch =
        data.password.length > 0 &&
        data.password_confirmation.length > 0 &&
        data.password === data.password_confirmation;

    /*
    |--------------------------------------------------------------------------
    | FORM VALIDATION
    |--------------------------------------------------------------------------
    */

    const formIsValid =
        data.token.length > 0 &&
        emailIsValid &&
        passwordIsValid &&
        passwordsMatch;

    /*
    |--------------------------------------------------------------------------
    | SUBMIT
    |--------------------------------------------------------------------------
    */

    const submit = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (processing || !formIsValid) {
            return;
        }

        post("/reset-password", {
            preserveScroll: true,

            onSuccess: () => {
                reset(
                    "password",
                    "password_confirmation"
                );

                setShowSuccess(true);
            },
        });
    };

    /*
    |--------------------------------------------------------------------------
    | SUCCESS NOTIFICATION
    |--------------------------------------------------------------------------
    */

    if (showSuccess) {
        return (
            <>
                <Head title="Password Reset Successful | ALIBATON" />

                <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 text-white">

                    {/* BACKGROUND */}

                    <div
                        className="fixed inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage:
                                "url('/images/big2.jpg')",
                        }}
                    />

                    <div className="fixed inset-0 bg-black/85 backdrop-blur-md" />

                    {/* GLOW */}

                    <div className="pointer-events-none fixed left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-400/10 blur-3xl" />

                    {/* SUCCESS CARD */}

                    <div className="relative z-10 w-full max-w-md">

                        <div className="rounded-3xl border border-green-400/20 bg-black/80 p-8 text-center shadow-2xl shadow-black/70 backdrop-blur-2xl sm:p-10">

                            {/* CLOSE */}

                            <button
                                type="button"
                                onClick={() =>
                                    setShowSuccess(false)
                                }
                                className="absolute right-5 top-5 rounded-xl p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* SUCCESS ICON */}

                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-400/30 bg-green-400/10 shadow-lg shadow-green-400/10">

                                <CheckCircle className="h-10 w-10 text-green-400" />

                            </div>

                            {/* TITLE */}

                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Password Reset Successful
                            </h1>

                            {/* MESSAGE */}

                            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/50">
                                Your password has been changed
                                successfully. You can now log in
                                using your new password.
                            </p>

                            {/* SUCCESS STATUS */}

                            <div className="mt-6 rounded-2xl border border-green-400/10 bg-green-400/5 px-4 py-3">

                                <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-400">

                                    <CheckCircle className="h-4 w-4" />

                                    Password updated successfully

                                </div>

                            </div>

                            {/* LOGIN BUTTON */}

                            <Link
                                href="/login"
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-5 py-4 text-sm font-bold text-black shadow-lg shadow-yellow-400/10 transition hover:bg-yellow-300 hover:shadow-yellow-400/20"
                            >
                                <ArrowLeft className="h-5 w-5" />

                                Continue to Login
                            </Link>

                            {/* BRAND */}

                            <div className="mt-7 border-t border-white/10 pt-6">

                                <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
                                    ALIBATON
                                </p>

                                <p className="mt-1 text-[10px] tracking-[0.18em] text-white/30">
                                    HEAVY EQUIPMENT & LOGISTICS
                                </p>

                                <p className="mt-3 text-[10px] tracking-wide text-white/20">
                                    POWER • PRECISION • RELIABILITY
                                </p>

                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RESET PASSWORD PAGE
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="Reset Password | ALIBATON" />

            <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden overflow-y-auto bg-black px-4 py-8 text-white sm:px-6 lg:px-8">

                {/* BACKGROUND */}

                <div
                    className="fixed inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "url('/images/big2.jpg')",
                    }}
                />

                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" />

                {/* GLOW */}

                <div className="pointer-events-none fixed left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

                <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-yellow-400/5 blur-3xl" />

                <div className="pointer-events-none fixed left-0 top-0 h-64 w-64 rounded-full bg-yellow-400/5 blur-3xl" />

                {/* MAIN */}

                <div className="relative z-10 w-full max-w-md">

                    {/* CARD */}

                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/75 shadow-2xl shadow-black/70 backdrop-blur-2xl">

                        {/* HEADER */}

                        <div className="border-b border-white/10 px-6 py-8 text-center sm:px-8">

                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 shadow-lg shadow-yellow-400/10">

                                <KeyRound className="h-8 w-8 text-yellow-400" />

                            </div>

                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Reset Password
                            </h1>

                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/50">
                                Create a new secure password
                                for your ALIBATON account.
                            </p>

                        </div>

                        {/* CONTENT */}

                        <div className="px-6 py-7 sm:px-8 sm:py-8">

                            {/* ERRORS */}

                            {errors.email && (
                                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">

                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                                    <div className="min-w-0">

                                        <p className="text-sm font-semibold text-red-300">
                                            Reset Error
                                        </p>

                                        <p className="mt-1 wrap-break-word text-xs leading-5 text-red-300/80">
                                            {errors.email}
                                        </p>

                                    </div>
                                </div>
                            )}

                            {errors.password && (
                                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">

                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                                    <div className="min-w-0">

                                        <p className="text-sm font-semibold text-red-300">
                                            Password Error
                                        </p>

                                        <p className="mt-1 wrap-break-word text-xs leading-5 text-red-300/80">
                                            {errors.password}
                                        </p>

                                    </div>
                                </div>
                            )}

                            {errors.password_confirmation && (
                                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">

                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                                    <div className="min-w-0">

                                        <p className="text-sm font-semibold text-red-300">
                                            Confirmation Error
                                        </p>

                                        <p className="mt-1 wrap-break-word text-xs leading-5 text-red-300/80">
                                            {errors.password_confirmation}
                                        </p>

                                    </div>
                                </div>
                            )}

                            {/* FORM */}

                            <form
                                onSubmit={submit}
                                className="space-y-5"
                            >

                                {/* EMAIL */}

                                <div>

                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-sm font-medium text-white/70"
                                    >
                                        Email Address
                                    </label>

                                    <div className="relative">

                                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-yellow-400" />

                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={data.email}
                                            autoComplete="username"
                                            disabled={processing}
                                            onChange={(event) =>
                                                setData(
                                                    "email",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your email"
                                            className={`w-full rounded-2xl border bg-white/5 py-4 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-white/25 disabled:cursor-not-allowed disabled:opacity-60 ${
                                                emailIsValid
                                                    ? "border-green-400/50 focus:border-green-400"
                                                    : "border-white/10 focus:border-yellow-400/50"
                                            }`}
                                        />

                                        {data.email.length > 0 && (
                                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">

                                                {emailIsValid ? (
                                                    <CheckCircle className="h-5 w-5 text-green-400" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                                )}

                                            </div>
                                        )}

                                    </div>
                                </div>

                                {/* PASSWORD */}

                                <div>

                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-sm font-medium text-white/70"
                                    >
                                        New Password
                                    </label>

                                    <div className="relative">

                                        <Lock
                                            className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                                data.password.length ===
                                                0
                                                    ? "text-yellow-400"
                                                    : passwordIsValid
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                            }`}
                                        />

                                        <input
                                            id="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password"
                                            value={data.password}
                                            autoComplete="new-password"
                                            autoFocus
                                            disabled={processing}
                                            onChange={(event) =>
                                                setData(
                                                    "password",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your new password"
                                            className={`w-full rounded-2xl border bg-white/5 py-4 pl-12 pr-14 text-sm text-white outline-none transition placeholder:text-white/25 ${
                                                data.password.length ===
                                                0
                                                    ? "border-white/10 focus:border-yellow-400/50"
                                                    : passwordIsValid
                                                    ? "border-green-400/50 focus:border-green-400"
                                                    : "border-red-400/50 focus:border-red-400"
                                            }`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (value) => !value
                                                )
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-yellow-400"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>

                                    </div>

                                    {data.password.length > 0 && (
                                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/3 p-4">

                                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
                                                Password Requirements
                                            </p>

                                            <div className="grid gap-2 sm:grid-cols-2">

                                                <PasswordRequirement
                                                    valid={
                                                        passwordHasMinLength
                                                    }
                                                    text="At least 8 characters"
                                                />

                                                <PasswordRequirement
                                                    valid={
                                                        passwordHasUppercase
                                                    }
                                                    text="One uppercase letter"
                                                />

                                                <PasswordRequirement
                                                    valid={
                                                        passwordHasLowercase
                                                    }
                                                    text="One lowercase letter"
                                                />

                                                <PasswordRequirement
                                                    valid={
                                                        passwordHasNumber
                                                    }
                                                    text="One number"
                                                />

                                                <PasswordRequirement
                                                    valid={
                                                        passwordHasSpecial
                                                    }
                                                    text="One special character"
                                                />

                                            </div>

                                        </div>
                                    )}

                                </div>

                                {/* CONFIRM PASSWORD */}

                                <div>

                                    <label
                                        htmlFor="password_confirmation"
                                        className="mb-2 block text-sm font-medium text-white/70"
                                    >
                                        Confirm Password
                                    </label>

                                    <div className="relative">

                                        <Lock
                                            className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                                data.password_confirmation
                                                    .length === 0
                                                    ? "text-yellow-400"
                                                    : passwordsMatch
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                            }`}
                                        />

                                        <input
                                            id="password_confirmation"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password_confirmation"
                                            value={
                                                data.password_confirmation
                                            }
                                            autoComplete="new-password"
                                            disabled={processing}
                                            onChange={(event) =>
                                                setData(
                                                    "password_confirmation",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Confirm your new password"
                                            className={`w-full rounded-2xl border bg-white/5 py-4 pl-12 pr-14 text-sm text-white outline-none transition placeholder:text-white/25 ${
                                                data.password_confirmation
                                                    .length === 0
                                                    ? "border-white/10 focus:border-yellow-400/50"
                                                    : passwordsMatch
                                                    ? "border-green-400/50 focus:border-green-400"
                                                    : "border-red-400/50 focus:border-red-400"
                                            }`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (value) => !value
                                                )
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-yellow-400"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>

                                    </div>

                                    {data.password_confirmation.length >
                                        0 && (
                                        <div
                                            className={`mt-2 flex items-center gap-2 text-xs ${
                                                passwordsMatch
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {passwordsMatch ? (
                                                <CheckCircle className="h-4 w-4" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4" />
                                            )}

                                            <span>
                                                {passwordsMatch
                                                    ? "Passwords match."
                                                    : "Passwords do not match."}
                                            </span>
                                        </div>
                                    )}

                                </div>

                                {/* SECURITY */}

                                <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-4">

                                    <div className="flex gap-3">

                                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                            <Lock className="h-4 w-4 text-yellow-400" />
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-white/80">
                                                Keep your account secure
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-white/40">
                                                Use a strong password that
                                                you do not use on other
                                                websites.
                                            </p>
                                        </div>

                                    </div>

                                </div>

                                {/* BUTTON */}

                                <button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        !formIsValid
                                    }
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold transition ${
                                        processing ||
                                        !formIsValid
                                            ? "cursor-not-allowed bg-white/10 text-white/30"
                                            : "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10 hover:bg-yellow-300"
                                    }`}
                                >

                                    {processing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />

                                            Resetting Password...
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound className="h-5 w-5" />

                                            Reset Password
                                        </>
                                    )}

                                </button>

                            </form>

                            {/* BACK TO LOGIN */}

                            <div className="mt-7 border-t border-white/10 pt-6">

                                <Link
                                    href="/login"
                                    className="mx-auto flex w-fit items-center gap-2 text-sm font-medium text-white/50 transition hover:text-yellow-400"
                                >
                                    <ArrowLeft className="h-4 w-4" />

                                    Back to Login
                                </Link>

                            </div>

                        </div>
                    </div>

                    {/* BRANDING */}

                    <div className="mt-6 text-center">

                        <p className="text-sm font-bold tracking-[0.25em] text-yellow-400">
                            ALIBATON
                        </p>

                        <p className="mt-1 text-[10px] tracking-[0.18em] text-white/30">
                            HEAVY EQUIPMENT & LOGISTICS
                        </p>

                        <p className="mt-3 text-[10px] tracking-wide text-white/20">
                            POWER • PRECISION • RELIABILITY
                        </p>

                    </div>

                </div>
            </div>
        </>
    );
}

