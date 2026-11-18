import React, { FormEvent, useEffect, useRef, useState } from "react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    Mail,
    ShieldCheck,
    RefreshCw,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

type PageProps = {
    email: string;
    expiresAt?: string | null;
    attemptsLeft?: number;
    errors?: {
        otp?: string;
    };
    flash?: {
        success?: string;
    };
};

export default function VerifyOtp() {
    const { email, expiresAt, attemptsLeft, errors, flash } =
        usePage<PageProps>().props;

    /*
    |--------------------------------------------------------------------------
    | OTP EXPIRY COUNTDOWN — 5 minutes
    |--------------------------------------------------------------------------
    */

    const [timeLeft, setTimeLeft] = useState(300);

    const [resending, setResending] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | ATTEMPTS — default 3
    |--------------------------------------------------------------------------
    */

    const [attempts, setAttempts] = useState(attemptsLeft ?? 3);

    /*
    |--------------------------------------------------------------------------
    | RESEND COOLDOWN
    |--------------------------------------------------------------------------
    | 1st resend: 30s
    | 2nd resend: 60s
    | 3rd resend: 90s
    | 4th+ : 120s (max)
    */

    const [resendCooldown, setResendCooldown] = useState(0);

    const [resendCount, setResendCount] = useState(0);

    const { data, setData, post, processing, reset } = useForm({
        otp: "",
    });

    /*
    |--------------------------------------------------------------------------
    | OTP DIGITS — one input box per number
    |--------------------------------------------------------------------------
    */

    const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);

    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | MASK EMAIL
    |--------------------------------------------------------------------------
    |
    | Ipakita ang first 2 at last 2 characters ng local part.
    | Palitan ng asterisk ang lahat ng nasa gitna.
    |
    | jhonpeterlicudan73@gmail.com
    |      ↓
    | jh***************73@gmail.com
    |
    */

    const maskEmail = (value: string): string => {
        if (!value || !value.includes("@")) {
            return value;
        }

        const [localPart, domain] = value.split("@");

        if (localPart.length <= 4) {
            const visible = localPart[0] ?? "";
            const masked = "*".repeat(Math.max(localPart.length - 1, 1));
            return `${visible}${masked}@${domain}`;
        }

        const first = localPart.slice(0, 2);
        const last = localPart.slice(-2);
        const masked = "*".repeat(localPart.length - 4);

        return `${first}${masked}${last}@${domain}`;
    };

    /*
    |--------------------------------------------------------------------------
    | OTP EXPIRY TIMER
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!expiresAt) {
            return;
        }

        const updateTimer = () => {
            const expiration = new Date(expiresAt).getTime();
            const now = new Date().getTime();
            const difference = Math.max(
                0,
                Math.floor((expiration - now) / 1000),
            );
            setTimeLeft(difference);
        };

        updateTimer();

        const interval = window.setInterval(updateTimer, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [expiresAt]);

    /*
    |--------------------------------------------------------------------------
    | RESEND COOLDOWN TIMER
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (resendCooldown <= 0) {
            return;
        }

        const interval = window.setInterval(() => {
            setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [resendCooldown]);

    /*
    |--------------------------------------------------------------------------
    | SYNC ATTEMPTS FROM PROPS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (typeof attemptsLeft === "number") {
            setAttempts(attemptsLeft);
        }
    }, [attemptsLeft]);

    /*
    |--------------------------------------------------------------------------
    | FORMAT TIME
    |--------------------------------------------------------------------------
    */

    const minutes = Math.floor(timeLeft / 60)
        .toString()
        .padStart(2, "0");

    const seconds = (timeLeft % 60).toString().padStart(2, "0");

    /*
    |--------------------------------------------------------------------------
    | OTP INPUT
    |--------------------------------------------------------------------------
    */

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) {
            return;
        }

        const newDigits = [...digits];

        if (value.length > 1) {
            const chars = value.split("").slice(0, 6 - index);

            chars.forEach((char, i) => {
                if (index + i < 6) {
                    newDigits[index + i] = char;
                }
            });

            setDigits(newDigits);
            setData("otp", newDigits.join(""));

            inputRefs.current[Math.min(index + chars.length, 5)]?.focus();

            return;
        }

        newDigits[index] = value;
        setDigits(newDigits);
        setData("otp", newDigits.join(""));

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (
        index: number,
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key === "Backspace") {
            event.preventDefault();

            const newDigits = [...digits];

            if (digits[index]) {
                newDigits[index] = "";
            } else if (index > 0) {
                newDigits[index - 1] = "";
                inputRefs.current[index - 1]?.focus();
            }

            setDigits(newDigits);
            setData("otp", newDigits.join(""));

            return;
        }

        if (event.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        if (event.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    /*
    |--------------------------------------------------------------------------
    | SUBMIT OTP
    |--------------------------------------------------------------------------
    */

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (data.otp.length !== 6) {
            return;
        }

        post("/verify-otp", {
            replace: true,
            onError: () => {
                setAttempts((prev) => Math.max(0, prev - 1));
            },
        });
    };

    /*
    |--------------------------------------------------------------------------
    | RESEND OTP — MAY INCREASING COOLDOWN
    |--------------------------------------------------------------------------
    */

    const resendOtp = () => {
        if (resending || resendCooldown > 0) {
            return;
        }

        setResending(true);

        router.post(
            "/verify-otp/resend",
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setTimeLeft(300);
                    setAttempts(3);
                    setDigits(["", "", "", "", "", ""]);
                    reset("otp");
                    inputRefs.current[0]?.focus();

                    const nextCount = resendCount + 1;
                    const nextCooldown = Math.min(30 * nextCount, 120);

                    setResendCount(nextCount);
                    setResendCooldown(nextCooldown);
                },

                onFinish: () => {
                    setResending(false);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | BACK TO LOGIN — MAY LOGOUT
    |--------------------------------------------------------------------------
    */

    const backToLogin = () => {
        router.post(
            "/logout",
            {},
            {
                onFinish: () => {
                    router.visit("/login");
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <>
            <Head title="Verify Login" />

            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-8 text-white">
                {/* BACKGROUND */}

                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: "url('/images/big2.jpg')",
                    }}
                />

                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

                {/* CARD */}

                <div className="relative z-10 w-full max-w-md">
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-2xl">
                        {/* HEADER */}

                        <div className="border-b border-white/10 px-6 py-8 text-center sm:px-8">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
                                <ShieldCheck className="h-8 w-8 text-yellow-400" />
                            </div>

                            <h1 className="text-2xl font-bold">
                                Verify Your Login
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-white/50">
                                We sent a verification code to your email.
                            </p>
                        </div>

                        {/* CONTENT */}

                        <div className="space-y-6 px-6 py-7 sm:px-8">
                            {/* EMAIL */}

                            <div className="flex items-center gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10">
                                    <Mail className="h-5 w-5 text-yellow-400" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs text-white/40">
                                        Verification email
                                    </p>

                                    <p className="truncate text-sm font-medium text-white">
                                        {maskEmail(email)}
                                    </p>
                                </div>
                            </div>

                            {/* ATTEMPTS WARNING */}

                            {attempts < 3 && attempts > 0 && (
                                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-300">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                                    <div className="min-w-0">
                                        <p className="font-bold">
                                            Warning:{" "}
                                            {attempts === 1
                                                ? "1 attempt remaining"
                                                : `${attempts} attempts remaining`}
                                        </p>

                                        <p className="mt-0.5 text-xs text-amber-300/70">
                                            Please enter the correct 6-digit
                                            code. After 3 failed attempts, you
                                            will be logged out.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ATTEMPTS EXHAUSTED */}

                            {attempts === 0 && (
                                <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                                    <div className="min-w-0">
                                        <p className="font-bold">
                                            Too many failed attempts
                                        </p>

                                        <p className="mt-0.5 text-xs text-red-300/70">
                                            Please click "Back to login" and
                                            try again.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* SUCCESS */}

                            {flash?.success && (
                                <div className="flex items-start gap-3 rounded-xl border border-green-400/20 bg-green-400/10 p-4 text-sm text-green-300">
                                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />

                                    <span>{flash.success}</span>
                                </div>
                            )}

                            {/* ERROR */}

                            {errors?.otp && (
                                <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                                    <div className="min-w-0">
                                        <p className="font-bold">
                                            Verification Failed
                                        </p>

                                        <p className="mt-0.5">
                                            {errors.otp}
                                        </p>

                                        {attempts > 0 && (
                                            <p className="mt-1 text-xs text-red-300/60">
                                                Make sure you enter the latest
                                                6-digit code sent to your email.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* FORM */}

                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <label className="mb-3 block text-center text-sm font-medium text-white/70">
                                        Enter 6-digit verification code
                                    </label>

                                    <div className="flex justify-between gap-2">
                                        {digits.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={(el) => {
                                                    inputRefs.current[index] = el;
                                                }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={digit}
                                                onChange={(event) =>
                                                    handleOtpChange(
                                                        index,
                                                        event.target.value,
                                                    )
                                                }
                                                onKeyDown={(event) =>
                                                    handleOtpKeyDown(index, event)
                                                }
                                                onFocus={(event) =>
                                                    event.target.select()
                                                }
                                                autoComplete={
                                                    index === 0
                                                        ? "one-time-code"
                                                        : "off"
                                                }
                                                disabled={attempts === 0}
                                                className={`h-14 w-full rounded-xl border bg-black/40 text-center text-2xl font-black text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                                    data.otp.length === 6
                                                        ? "border-green-400/50"
                                                        : "border-white/10 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* TIMER */}

                                <div className="text-center">
                                    {timeLeft > 0 ? (
                                        <p className="text-sm text-white/40">
                                            Code expires in{" "}
                                            <span className="font-semibold text-yellow-400">
                                                {minutes}:{seconds}
                                            </span>
                                        </p>
                                    ) : (
                                        <p className="text-sm text-red-400">
                                            This code has expired.
                                        </p>
                                    )}
                                </div>

                                {/* VERIFY BUTTON */}

                                <button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        data.otp.length !== 6 ||
                                        attempts === 0
                                    }
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-semibold transition ${
                                        processing ||
                                        data.otp.length !== 6 ||
                                        attempts === 0
                                            ? "cursor-not-allowed bg-white/10 text-white/30"
                                            : "bg-yellow-400 text-black hover:bg-yellow-300"
                                    }`}
                                >
                                    {processing ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="h-4 w-4" />
                                            Verify & Continue
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* RESEND */}

                            <div className="border-t border-white/10 pt-5 text-center">
                                <p className="mb-3 text-sm text-white/40">
                                    Didn't receive the code?
                                </p>

                                <button
                                    type="button"
                                    onClick={resendOtp}
                                    disabled={
                                        resending || resendCooldown > 0
                                    }
                                    className="inline-flex items-center gap-2 text-sm font-medium text-yellow-400 transition hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${
                                            resending ? "animate-spin" : ""
                                        }`}
                                    />

                                    {resending
                                        ? "Sending..."
                                        : resendCooldown > 0
                                          ? `Resend in ${resendCooldown}s`
                                          : "Resend verification code"}
                                </button>

                                {resendCount > 0 && resendCooldown > 0 && (
                                    <p className="mt-2 text-[11px] text-white/30">
                                        Cooldown increases with each resend
                                    </p>
                                )}
                            </div>

                            {/* BACK */}

                            <button
                                type="button"
                                onClick={backToLogin}
                                disabled={processing || resending}
                                className="mx-auto flex items-center gap-2 text-sm text-white/40 transition hover:text-white disabled:opacity-50"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to login
                            </button>
                        </div>
                    </div>

                    {/* BRAND */}

                    <p className="mt-6 text-center text-xs tracking-wide text-white/30">
                        ALIBATON Heavy Equipment & Logistics Management System
                    </p>
                </div>
            </div>
        </>
    );
}
