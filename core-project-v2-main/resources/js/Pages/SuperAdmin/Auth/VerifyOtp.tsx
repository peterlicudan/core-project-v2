import React, { useState, useRef, useEffect } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import {
    ShieldCheck,
    HardHat,
    ArrowRight,
    Loader2,
    RotateCcw,
    Mail,
    Clock,
    ArrowLeft,
} from "lucide-react";

type VerifyOtpProps = {
    email: string;
    expiresInSeconds: number;
};

export default function VerifyOtp({ email, expiresInSeconds }: VerifyOtpProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: "",
    });

    const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
    const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds || 300);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const getRoute = (name: string, fallback: string) => {
        if (typeof window !== "undefined" && (window as any).route) {
            return (window as any).route(name);
        }
        return fallback;
    };

    // Countdown timer for expiry
    useEffect(() => {
        if (secondsLeft <= 0) return;
        const timer = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [secondsLeft]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Auto-focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Format time as MM:SS
    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    // Handle digit input
    const handleDigitChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newDigits = [...digits];
        newDigits[index] = value;
        setDigits(newDigits);
        setData("code", newDigits.join(""));

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspace
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowRight" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle paste (e.g., paste "123456")
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;
        const newDigits = [...digits];
        for (let i = 0; i < pasted.length; i++) {
            newDigits[i] = pasted[i];
        }
        setDigits(newDigits);
        setData("code", newDigits.join(""));
        // Focus the next empty input or last one
        const nextEmpty = newDigits.findIndex((d) => !d);
        inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    };

    // Submit OTP
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.code.length !== 6) return;

        post(getRoute("superadmin.otp.verify", "/superadmin/verify-otp"), {
            onError: () => {
                // Clear digits on error
                setDigits(["", "", "", "", "", ""]);
                setData("code", "");
                inputRefs.current[0]?.focus();
            },
        });
    };

    // Resend OTP
    const resend = () => {
        if (resendCooldown > 0 || resending) return;
        setResending(true);

        post(getRoute("superadmin.otp.resend", "/superadmin/resend-otp"), {
            onSuccess: () => {
                setSecondsLeft(expiresInSeconds || 300);
                setResendCooldown(60);
                setDigits(["", "", "", "", "", ""]);
                setData("code", "");
                inputRefs.current[0]?.focus();
            },
            onFinish: () => setResending(false),
        });
    };

    return (
        <>
            <Head title="Verify OTP — Super Admin" />

            <div className="min-h-screen bg-slate-50 dark:bg-[#050810] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
                {/* Background lighting */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/[0.08] blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-blue-600/[0.04] blur-[100px] rounded-full pointer-events-none" />

                {/* Grid texture */}
                <div
                    className="absolute inset-0 opacity-[0.015] pointer-events-none"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                />

                {/* Corner accents */}
                <div className="absolute inset-4 sm:inset-8 pointer-events-none hidden lg:block opacity-40">
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-amber-500/30" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-amber-500/30" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-amber-500/30" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-500/30" />
                </div>

                <div className="relative z-10 w-full max-w-[460px]">
                    {/* Brand header */}
                    <div className="mb-6 flex flex-col items-center text-center">
                        <div className="relative mb-3.5 group">
                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 opacity-30 blur-md group-hover:opacity-50 transition duration-500" />
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 dark:from-[#121929] to-white dark:to-[#0A0F1D] border border-amber-500/30 flex items-center justify-center shadow-xl">
                                <HardHat
                                    size={22}
                                    className="text-amber-400 drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]"
                                    strokeWidth={2.2}
                                />
                            </div>
                        </div>

                        <h1 className="text-[26px] leading-none font-black tracking-tight text-slate-900 dark:text-white">
                            ALI
                            <span className="bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                                BATON
                            </span>
                        </h1>

                        <div className="flex items-center gap-2.5 mt-2 mb-1.5">
                            <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-500/50" />
                            <div className="w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                            <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-500/50" />
                        </div>

                        <p className="text-[10px] tracking-[0.2em] text-slate-600 dark:text-slate-400 uppercase font-semibold">
                            Heavy Equipment &amp; Logistics
                        </p>
                    </div>

                    {/* Main card */}
                    <div className="relative bg-white/90 dark:bg-[#0A0F1D]/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-black/60">
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

                        <div className="px-9 pt-8 pb-6 border-b border-slate-200 dark:border-slate-800/60 text-center">
                            <div className="flex justify-center mb-3">
                                <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                                    <ShieldCheck size={20} className="text-amber-400" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Verify Your Identity
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                Enter the 6-digit code sent to your email
                            </p>
                        </div>

                        <div className="px-9 py-7">
                            {/* Email display */}
                            <div className="mb-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#050810] px-4 py-3 flex items-center gap-3">
                                <Mail size={16} className="text-amber-400/70 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                        Verification code sent to
                                    </p>
                                    <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
                                        {email}
                                    </p>
                                </div>
                            </div>

                            {/* Expiry timer */}
                            <div className="mb-5 flex items-center justify-center gap-2 text-xs">
                                <Clock size={13} className={secondsLeft <= 60 ? "text-rose-400" : "text-slate-500"} />
                                <span className={secondsLeft <= 60 ? "text-rose-400 font-semibold" : "text-slate-600 dark:text-slate-400"}>
                                    {secondsLeft > 0 ? (
                                        <>Expires in <strong>{formatTime(secondsLeft)}</strong></>
                                    ) : (
                                        <>Code expired — please resend</>
                                    )}
                                </span>
                            </div>

                            <form onSubmit={submit} className="space-y-5">
                                {/* 6-digit OTP inputs */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-3 text-center">
                                        Enter 6-digit code
                                    </label>
                                    <div className="flex justify-center gap-2 sm:gap-2.5">
                                        {digits.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={(el) => {
                                                    inputRefs.current[index] = el;
                                                }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleDigitChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                onPaste={handlePaste}
                                                disabled={processing}
                                                className="w-11 h-14 sm:w-12 sm:h-15 text-center text-xl font-bold rounded-xl bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none transition-all duration-200 focus:border-amber-500/70 focus:ring-4 focus:ring-amber-500/10 disabled:opacity-50"
                                                autoComplete="one-time-code"
                                            />
                                        ))}
                                    </div>
                                    {errors.code && (
                                        <p className="text-rose-400 text-xs mt-3 flex items-center justify-center gap-1.5 font-medium">
                                            <span className="w-1 h-1 rounded-full bg-rose-400" />
                                            {errors.code}
                                        </p>
                                    )}
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={processing || data.code.length !== 6}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-[#0A0F1D] font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Verifying…
                                        </>
                                    ) : (
                                        <>
                                            Verify &amp; Access Dashboard
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Resend + Back */}
                            <div className="mt-5 flex items-center justify-between text-xs">
                                <Link
                                    href={getRoute("superadmin.login", "/superadmin/login")}
                                    className="text-slate-600 dark:text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 font-medium"
                                >
                                    <ArrowLeft size={13} />
                                    Back to login
                                </Link>

                                <button
                                    type="button"
                                    onClick={resend}
                                    disabled={resendCooldown > 0 || resending}
                                    className="text-amber-400 hover:text-amber-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-medium"
                                >
                                    <RotateCcw size={13} className={resending ? "animate-spin" : ""} />
                                    {resendCooldown > 0
                                        ? `Resend in ${resendCooldown}s`
                                        : resending
                                        ? "Sending…"
                                        : "Resend code"}
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-9 py-4 border-t border-slate-200 dark:border-slate-800/60 bg-slate-100 dark:bg-[#070B16]">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck
                                    size={15}
                                    className="text-amber-500/70 shrink-0"
                                />
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    Two-factor authentication protects your account. Never share your code.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col items-center gap-1.5 text-xs text-slate-500">
                        <p className="tracking-wide">
                            © {new Date().getFullYear()}{" "}
                            <span className="text-slate-600 dark:text-slate-400 font-semibold">
                                ALIBATON
                            </span>{" "}
                            — All Rights Reserved
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
