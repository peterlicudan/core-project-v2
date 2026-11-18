import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import {
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    ShieldCheck,
    HardHat,
    ArrowRight,
    Loader2,
} from "lucide-react";

type LoginProps = {
    status?: string;
};

export default function Login({ status }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    // Safe route helper para hindi mag-crash kahit wala o hindi pa loaded ang Ziggy
    const getRoute = (name: string, fallback: string) => {
        if (typeof window !== "undefined" && (window as any).route) {
            return (window as any).route(name);
        }
        return fallback;
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // ✅ SUPERADMIN login route — hindi default 'login'
        post(getRoute("superadmin.login.store", "/superadmin/login"), {
            onFinish: () => reset("password"),
        });
    };

    return (
        <>
            <Head title="Super Admin Login" />

            <div className="min-h-screen bg-slate-50 dark:bg-[#050810] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
                {/* Immersive background lighting */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/[0.08] blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-blue-600/[0.04] blur-[100px] rounded-full pointer-events-none" />

                {/* Refined subtle grid texture */}
                <div
                    className="absolute inset-0 opacity-[0.015] pointer-events-none"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                />

                {/* Industrial decorative corner accents */}
                <div className="absolute inset-4 sm:inset-8 pointer-events-none hidden lg:block opacity-40">
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-amber-500/30" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-amber-500/30" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-amber-500/30" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-500/30" />
                </div>

                {/*inalaki ang max-width mula 420px patungong 460px para lumaki ang login form*/}
                <div className="relative z-10 w-full max-w-[460px]">
                    {/* ============================================
                        BRAND HEADER (Pinamaliit ang font at spacing)
                    ============================================ */}
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

                        {/* Pinamaliit ang text sa taas */}
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

                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/10 bg-amber-500/[0.04] px-3 py-0.5 backdrop-blur-md">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            <span className="text-[9px] tracking-[0.12em] text-emerald-400 font-medium uppercase">
                                Secure Admin Portal
                            </span>
                        </div>
                    </div>

                    {/* ============================================
                        MAIN CARD (Pinalaki at pinaluwang)
                    ============================================ */}
                    <div className="relative bg-white/90 dark:bg-[#0A0F1D]/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-black/60">
                        {/* Top glowing edge line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

                        <div className="px-9 pt-8 pb-6 border-b border-slate-200 dark:border-slate-800/60 text-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Administrator Sign-In
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                Enter your credentials to manage operations.
                            </p>
                        </div>

                        <div className="px-9 py-7">
                            {status && (
                                <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-4.5">
                                {/* Email Field */}
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                                    >
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <Mail
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-colors group-focus-within:text-amber-400"
                                        />
                                        <input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) =>
                                                setData("email", e.target.value)
                                            }
                                            placeholder="name@alibaton.com"
                                            autoComplete="username"
                                            required
                                            className="w-full h-12 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-amber-500/70 focus:ring-4 focus:ring-amber-500/10 shadow-inner"
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1.5 font-medium">
                                            <span className="w-1 h-1 rounded-full bg-rose-400" />
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div>
                                    <div className="mb-1.5">
                                        <label
                                            htmlFor="password"
                                            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                                        >
                                            Password
                                        </label>
                                    </div>
                                    <div className="relative group">
                                        <LockKeyhole
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-colors group-focus-within:text-amber-400"
                                        />
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={data.password}
                                            onChange={(e) =>
                                                setData("password", e.target.value)
                                            }
                                            placeholder="••••••••••••"
                                            autoComplete="current-password"
                                            maxLength={64}
                                            required
                                            className="w-full h-12 pl-10 pr-11 rounded-xl bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-amber-500/70 focus:ring-4 focus:ring-amber-500/10 shadow-inner"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors p-1"
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>

                                    {/* ✅ Forgot Password Link — SUPERADMIN URL */}
                                    <div className="mt-2 flex justify-start">
                                        <Link
                                            href="/superadmin/forgot-password"
                                            className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>

                                    {errors.password && (
                                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1.5 font-medium">
                                            <span className="w-1 h-1 rounded-full bg-rose-400" />
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-[#0A0F1D] font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2
                                                size={18}
                                                className="animate-spin"
                                            />
                                            Authenticating…
                                        </>
                                    ) : (
                                        <>
                                            Access Dashboard
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Card Footer Warning */}
                        <div className="px-9 py-4 border-t border-slate-200 dark:border-slate-800/60 bg-slate-100 dark:bg-[#070B16]">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck
                                    size={15}
                                    className="text-amber-500/70 shrink-0"
                                />
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    Encrypted corporate gateway. Unauthorized access attempts are tracked.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ============================================
                        OUTSIDE FOOTER INFO
                    ============================================ */}
                    <div className="mt-6 flex flex-col items-center gap-1.5 text-xs text-slate-500">
                        <p className="tracking-wide">
                            © {new Date().getFullYear()}{" "}
                            <span className="text-slate-600 dark:text-slate-400 font-semibold">
                                ALIBATON
                            </span>{" "}
                            — All Rights Reserved
                        </p>
                        <div className="flex items-center gap-3 text-[11px]" />
                    </div>
                </div>
            </div>
        </>
    );
}