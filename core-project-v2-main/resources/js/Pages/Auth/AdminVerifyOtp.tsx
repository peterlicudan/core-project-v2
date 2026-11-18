import { Head, router, useForm, usePage } from "@inertiajs/react";
import type { PageProps as InertiaPageProps } from "@inertiajs/core";
import {
    ShieldCheck,
    Mail,
    ArrowRight,
    RefreshCw,
    Clock,
    AlertCircle,
    ArrowLeft,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

interface PageProps extends InertiaPageProps {
    email: string;
    expiresInSeconds: number;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function AdminVerifyOtp() {
    const { email, expiresInSeconds, flash } = usePage<PageProps>().props;

    const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);
    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);

    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: "",
    });

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const interval = window.setInterval(() => {
            setSecondsLeft((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => window.clearInterval(interval);
    }, [secondsLeft]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const interval = window.setInterval(() => {
            setResendCooldown((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => window.clearInterval(interval);
    }, [resendCooldown]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];

        if (value.length > 1) {
            const digits = value.split("").slice(0, 6 - index);
            digits.forEach((digit, i) => {
                if (index + i < 6) {
                    newOtp[index + i] = digit;
                }
            });
            setOtp(newOtp);
            setData("code", newOtp.join(""));
            const nextIndex = Math.min(index + digits.length, 5);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        newOtp[index] = value;
        setOtp(newOtp);
        setData("code", newOtp.join(""));

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (
        index: number,
        e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            const newOtp = [...otp];

            if (otp[index]) {
                newOtp[index] = "";
                setOtp(newOtp);
                setData("code", newOtp.join(""));
            } else if (index > 0) {
                newOtp[index - 1] = "";
                setOtp(newOtp);
                setData("code", newOtp.join(""));
                inputRefs.current[index - 1]?.focus();
            }
        }

        if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        if (e.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();

        const fullCode = otp.join("");

        if (fullCode.length !== 6) return;

        post("/admin/verify-otp", {
            onFinish: () => {
                setOtp(["", "", "", "", "", ""]);
                setData("code", "");
                inputRefs.current[0]?.focus();
            },
        });
    };

    const handleResend = () => {
        if (resendCooldown > 0 || isResending) return;

        setIsResending(true);

        router.post(
            "/admin/resend-otp",
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResendCooldown(60);
                    setSecondsLeft(expiresInSeconds);
                    setOtp(["", "", "", "", "", ""]);
                    setData("code", "");
                    inputRefs.current[0]?.focus();
                },
                onFinish: () => setIsResending(false),
            },
        );
    };

    const isExpired = secondsLeft <= 0;

    return (
        <>
            <Head title="Verify OTP | ALIBATON" />

            <div className="min-h-screen bg-black text-white">
                <div className="grid min-h-screen lg:grid-cols-2">

                    {/* LEFT SIDE */}
                    <div className="relative hidden overflow-hidden lg:flex">
                        <img
                            src="/images/big2.jpg"
                            alt="ALIBATON"
                            className="absolute inset-0 h-full w-full object-cover"
                        />

                        <div className="absolute inset-0 bg-black/75" />

                        <div className="relative z-10 flex w-full flex-col justify-between p-12">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-400/30 bg-yellow-400/10">
                                    <ShieldCheck
                                        size={26}
                                        className="text-yellow-400"
                                    />
                                </div>

                                <div>
                                    <h1 className="text-2xl font-black tracking-[0.25em] text-yellow-400">
                                        ALIBATON
                                    </h1>

                                    <p className="text-xs tracking-widest text-gray-400">
                                        ADMINISTRATOR
                                    </p>
                                </div>
                            </div>

                            <div className="max-w-xl">
                                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
                                    Two-Factor Authentication
                                </p>

                                <h2 className="text-5xl font-black leading-tight">
                                    Verify.
                                    <br />
                                    Secure.
                                    <br />
                                    Access.
                                </h2>

                                <p className="mt-6 max-w-lg text-gray-300">
                                    Enter the verification code sent to your
                                    email to complete sign-in.
                                </p>
                            </div>

                            <div className="text-sm text-gray-500">
                                © {new Date().getFullYear()} ALIBATON.
                                All rights reserved.
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 py-10 sm:px-8">
                        <div className="w-full max-w-md">

                            <div className="mb-10 text-center lg:hidden">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
                                    <ShieldCheck
                                        size={30}
                                        className="text-yellow-400"
                                    />
                                </div>

                                <h1 className="text-2xl font-black tracking-[0.25em] text-yellow-400">
                                    ALIBATON
                                </h1>

                                <p className="mt-1 text-xs tracking-widest text-gray-500">
                                    ADMINISTRATOR
                                </p>
                            </div>

                            <div className="mb-8">
                                <div className="mb-4 inline-flex rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
                                    <Mail
                                        size={24}
                                        className="text-yellow-400"
                                    />
                                </div>

                                <h2 className="text-3xl font-black">
                                    Check your email
                                </h2>

                                <p className="mt-2 text-gray-500">
                                    We sent a 6-digit verification code to{" "}
                                    <span className="font-semibold text-gray-300">
                                        {email}
                                    </span>
                                </p>
                            </div>

                            {flash?.success && (
                                <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-400">
                                    <ShieldCheck className="h-5 w-5 shrink-0" />
                                    <p className="text-sm">{flash.success}</p>
                                </div>
                            )}

                            {flash?.error && (
                                <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p className="text-sm">{flash.error}</p>
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-6">

                                <div>
                                    <label className="mb-3 block text-sm font-semibold text-gray-300">
                                        Verification Code
                                    </label>

                                    <div className="flex justify-between gap-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={(el) => {
                                                    inputRefs.current[index] =
                                                        el;
                                                }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={digit}
                                                onChange={(e) =>
                                                    handleChange(
                                                        index,
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) =>
                                                    handleKeyDown(index, e)
                                                }
                                                onFocus={(e) =>
                                                    e.target.select()
                                                }
                                                disabled={
                                                    processing || isExpired
                                                }
                                                className="h-14 w-full rounded-xl border border-white/10 bg-black/40 text-center text-2xl font-black text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                        ))}
                                    </div>

                                    {errors.code && (
                                        <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400">
                                            <AlertCircle size={14} />
                                            {errors.code}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Clock
                                            size={16}
                                            className={
                                                isExpired
                                                    ? "text-red-400"
                                                    : "text-yellow-400"
                                            }
                                        />
                                        <span className="text-xs font-semibold text-gray-400">
                                            {isExpired
                                                ? "Code expired"
                                                : "Code expires in"}
                                        </span>
                                    </div>

                                    <span
                                        className={`font-mono text-lg font-black ${
                                            isExpired
                                                ? "text-red-400"
                                                : secondsLeft <= 60
                                                  ? "text-orange-400"
                                                  : "text-yellow-400"
                                        }`}
                                    >
                                        {formatTime(secondsLeft)}
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        otp.join("").length !== 6 ||
                                        isExpired
                                    }
                                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3.5 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing
                                        ? "Verifying..."
                                        : "Verify Code"}

                                    {!processing && (
                                        <ArrowRight
                                            size={19}
                                            className="transition-transform group-hover:translate-x-1"
                                        />
                                    )}
                                </button>

                                <div className="text-center">
                                    <p className="text-sm text-gray-500">
                                        Didn't receive the code?{" "}
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={
                                                resendCooldown > 0 ||
                                                isResending
                                            }
                                            className="font-semibold text-yellow-400 transition hover:text-yellow-300 disabled:cursor-not-allowed disabled:text-gray-600"
                                        >
                                            {isResending ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <RefreshCw
                                                        size={12}
                                                        className="animate-spin"
                                                    />
                                                    Sending...
                                                </span>
                                            ) : resendCooldown > 0 ? (
                                                `Resend in ${resendCooldown}s`
                                            ) : (
                                                "Resend code"
                                            )}
                                        </button>
                                    </p>
                                </div>

                            </form>

                            <div className="mt-6 text-center">
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.visit("/admin/login")
                                    }
                                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition hover:text-gray-300"
                                >
                                    <ArrowLeft size={14} />
                                    Back to login
                                </button>
                            </div>

                            <div className="mt-8 rounded-xl border border-yellow-400/10 bg-yellow-400/3 p-4">
                                <div className="flex gap-3">
                                    <ShieldCheck
                                        size={20}
                                        className="mt-0.5 shrink-0 text-yellow-400"
                                    />

                                    <div>
                                        <p className="text-sm font-semibold text-gray-300">
                                            Two-Factor Authentication
                                        </p>

                                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                            This extra step keeps your account
                                            secure. Never share this code with
                                            anyone.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
