import React, { FormEvent } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import {
    Mail,
    ArrowLeft,
    Send,
    CheckCircle,
    AlertCircle,
    Loader2,
} from "lucide-react";

type ForgotPasswordProps = {
    status?: string;
};

type ForgotPasswordForm = {
    email: string;
};

export default function ForgotPassword({
    status,
}: ForgotPasswordProps) {
    const { data, setData, post, processing, errors, clearErrors } =
        useForm<ForgotPasswordForm>({
            email: "",
        });

    const email = data.email.trim();

    const emailIsValid =
        email.length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const emailHasError = email.length > 0 && !emailIsValid;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (processing || !emailIsValid) {
            return;
        }

        clearErrors();

        post("/forgot-password", {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Forgot Password | ALIBATON" />

            <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden overflow-y-auto bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
                {/* BACKGROUND */}
                <div
                    className="fixed inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "url('/images/big2.jpg')",
                    }}
                />

                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

                {/* GLOW */}
                <div className="pointer-events-none fixed left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />

                <div className="pointer-events-none fixed bottom-0 right-0 h-80 w-80 rounded-full bg-yellow-400/5 blur-3xl" />

                {/* CONTENT */}
                <div className="relative z-10 w-full max-w-md">
                    {/* CARD */}
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/75 shadow-2xl shadow-black/60 backdrop-blur-2xl">
                        {/* HEADER */}
                        <div className="border-b border-white/10 px-5 py-7 text-center sm:px-8 sm:py-8">
                            {/* ICON */}
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 shadow-lg shadow-yellow-400/5 sm:h-16 sm:w-16">
                                <Mail className="h-7 w-7 text-yellow-400 sm:h-8 sm:w-8" />
                            </div>

                            {/* TITLE */}
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Forgot Password?
                            </h1>

                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/50">
                                No worries. Enter your registered
                                email address and we'll send you a
                                secure password reset link.
                            </p>
                        </div>

                        {/* BODY */}
                        <div className="px-5 py-6 sm:px-8 sm:py-8">
                            {/* SUCCESS */}
                            {status && (
                                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-400/10">
                                        <CheckCircle className="h-5 w-5 text-green-400" />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-green-300">
                                            Email Sent
                                        </p>

                                        <p className="mt-1 wrap-break-word text-xs leading-5 text-green-300/70">
                                            {status}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* SERVER ERROR */}
                            {errors.email && (
                                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-red-300">
                                            Error
                                        </p>

                                        <p className="mt-1 wrap-break-word text-xs leading-5 text-red-300/80">
                                            {errors.email}
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
                                        {/* ICON */}
                                        <Mail
                                            className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                                email.length === 0
                                                    ? "text-white/30"
                                                    : emailIsValid
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                            }`}
                                        />

                                        {/* INPUT */}
                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={data.email}
                                            autoComplete="email"
                                            autoFocus
                                            disabled={processing}
                                            onChange={(event) => {
                                                setData(
                                                    "email",
                                                    event.target.value
                                                );

                                                if (errors.email) {
                                                    clearErrors("email");
                                                }
                                            }}
                                            placeholder="Enter your email address"
                                            className={`w-full rounded-2xl border bg-white/5 py-4 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-white/25 disabled:cursor-not-allowed disabled:opacity-60 ${
                                                email.length === 0
                                                    ? "border-white/10 focus:border-yellow-400/50"
                                                    : emailIsValid
                                                    ? "border-green-400/50 focus:border-green-400"
                                                    : "border-red-400/50 focus:border-red-400"
                                            }`}
                                        />

                                        {/* VALIDATION ICON */}
                                        {email.length > 0 && (
                                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                                {emailIsValid ? (
                                                    <CheckCircle className="h-5 w-5 text-green-400" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* FRONTEND ERROR */}
                                    {emailHasError &&
                                        !errors.email && (
                                            <p className="mt-2 text-xs text-red-400">
                                                Please enter a valid email
                                                address.
                                            </p>
                                        )}
                                </div>

                                {/* INFO BOX */}
                                <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-4">
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400/10">
                                            <Mail className="h-4 w-4 text-yellow-400" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white/80">
                                                Check your inbox
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-white/40">
                                                If an account exists with
                                                this email, you'll receive
                                                instructions to reset your
                                                password.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* SUBMIT */}
                                <button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        !emailIsValid
                                    }
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold transition ${
                                        processing ||
                                        !emailIsValid
                                            ? "cursor-not-allowed bg-white/10 text-white/30"
                                            : "bg-yellow-400 text-black shadow-lg shadow-yellow-400/10 hover:bg-yellow-300 hover:shadow-yellow-400/20"
                                    }`}
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Sending Reset Link...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-5 w-5" />
                                            Send Password Reset Link
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

                    {/* BRAND */}
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
