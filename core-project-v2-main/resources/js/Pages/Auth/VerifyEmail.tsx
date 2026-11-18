import React from "react";
import { Head, router, usePage } from "@inertiajs/react";
import {
    MailCheck,
    RefreshCw,
    LogOut,
    CheckCircle,
} from "lucide-react";

type PageProps = {
    flash?: {
        status?: string;
        success?: string;
    };
};

export default function VerifyEmail() {
    const { flash } = usePage<PageProps>().props;

    const [sending, setSending] =
        React.useState(false);

    const sendVerificationEmail = () => {
        setSending(true);

        router.post(
            "/email/verification-notification",
            {},
            {
                preserveScroll: true,

                onFinish: () => {
                    setSending(false);
                },
            }
        );
    };

    const logout = () => {
        router.post("/logout");
    };

    return (
        <>
            <Head title="Verify Your Email" />

            <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">

                {/* Background glow */}

                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div className="absolute left-1/2 top-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400/10 blur-[120px]" />
                </div>

                <div className="relative w-full max-w-lg">

                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">

                        {/* HEADER */}

                        <div className="border-b border-white/10 px-6 py-6 text-center sm:px-8">

                            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10">

                                <MailCheck className="h-10 w-10 text-yellow-400" />

                            </div>

                            <h1 className="text-2xl font-bold sm:text-3xl">
                                Verify Your Email
                            </h1>

                            <p className="mt-2 text-sm text-white/50">
                                Welcome to ALIBATON Heavy Equipment
                                & Logistics Management System.
                            </p>

                        </div>

                        {/* CONTENT */}

                        <div className="space-y-6 px-6 py-7 sm:px-8">

                            <div className="rounded-2xl border border-yellow-400/10 bg-yellow-400/5 p-5">

                                <div className="flex gap-3">

                                    <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />

                                    <div>

                                        <p className="font-medium text-white">
                                            Check your email
                                        </p>

                                        <p className="mt-1 text-sm leading-6 text-white/50">
                                            We sent a verification
                                            link to your email
                                            address. Please open
                                            the email and click
                                            the verification link
                                            to activate your
                                            account.
                                        </p>

                                    </div>

                                </div>

                            </div>

                            {/* SUCCESS MESSAGE */}

                            {flash?.status && (
                                <div className="flex items-center gap-3 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-300">

                                    <CheckCircle className="h-5 w-5 shrink-0" />

                                    <span>
                                        {flash.status}
                                    </span>

                                </div>
                            )}

                            {flash?.success && (
                                <div className="flex items-center gap-3 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-300">

                                    <CheckCircle className="h-5 w-5 shrink-0" />

                                    <span>
                                        {flash.success}
                                    </span>

                                </div>
                            )}

                            {/* RESEND */}

                            <button
                                type="button"
                                onClick={
                                    sendVerificationEmail
                                }
                                disabled={sending}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3.5 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                                <RefreshCw
                                    className={`h-5 w-5 ${
                                        sending
                                            ? "animate-spin"
                                            : ""
                                    }`}
                                />

                                {sending
                                    ? "Sending..."
                                    : "Resend Verification Email"}

                            </button>

                            {/* LOGOUT */}

                            <button
                                type="button"
                                onClick={logout}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3.5 font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
                            >

                                <LogOut className="h-5 w-5" />

                                Log Out

                            </button>

                            <p className="text-center text-xs leading-5 text-white/30">
                                You must verify your email before
                                accessing your ALIBATON dashboard.
                            </p>

                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-white/20">
                        © {new Date().getFullYear()} ALIBATON
                        Heavy Equipment & Logistics Management
                        System
                    </p>

                </div>
            </div>
        </>
    );
}
