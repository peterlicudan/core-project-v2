import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import {
    Eye,
    EyeOff,
    LockKeyhole,
    ShieldCheck,
    HardHat,
    ArrowRight,
    Loader2,
    CheckCircle,
    XCircle,
    User,
    Mail,
    Clock,
} from "lucide-react";

type AcceptInviteProps = {
    token: string;
    name: string;
    email: string;
    expiresAt: string;
};

function PasswordRule({ valid, text }: { valid: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-2 text-xs ${valid ? "text-emerald-400" : "text-slate-500"}`}>
            {valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
            <span>{text}</span>
        </div>
    );
}

export default function AcceptInvite({ token, name, email, expiresAt }: AcceptInviteProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        password: "",
        password_confirmation: "",
    });

    const getRoute = (name: string, fallback: string) => {
        if (typeof window !== "undefined" && (window as any).route) {
            return (window as any).route(name);
        }
        return fallback;
    };

    // Live password validation
    const passwordHasMinLength = data.password.length >= 12;
    const passwordHasUppercase = /[A-Z]/.test(data.password);
    const passwordHasLowercase = /[a-z]/.test(data.password);
    const passwordHasNumber = /[0-9]/.test(data.password);
    const passwordHasSpecial = /[^A-Za-z0-9]/.test(data.password);

    const passwordValid =
        passwordHasMinLength &&
        passwordHasUppercase &&
        passwordHasLowercase &&
        passwordHasNumber &&
        passwordHasSpecial;

    const passwordMatch =
        data.password.length > 0 && data.password === data.password_confirmation;

    const formValid = passwordValid && passwordMatch;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formValid) return;

        post(getRoute("admin.accept-invite.accept", "/admin/accept-invite"), {
            onFinish: () => reset("password", "password_confirmation"),
        });
    };

    return (
        <>
            <Head title="Accept Admin Invitation" />

            <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
                {/* Background */}
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

                <div className="relative z-10 w-full max-w-[480px]">
                    {/* Brand */}
                    <div className="mb-6 flex flex-col items-center text-center">
                        <div className="relative mb-3.5 group">
                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 opacity-30 blur-md group-hover:opacity-50 transition duration-500" />
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#121929] to-[#0A0F1D] border border-amber-500/30 flex items-center justify-center shadow-xl">
                                <HardHat
                                    size={22}
                                    className="text-amber-400 drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]"
                                    strokeWidth={2.2}
                                />
                            </div>
                        </div>

                        <h1 className="text-[26px] leading-none font-black tracking-tight text-white">
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

                        <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase font-semibold">
                            Heavy Equipment &amp; Logistics
                        </p>
                    </div>

                    {/* Card */}
                    <div className="relative bg-[#0A0F1D]/80 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-black/60">
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

                        <div className="px-9 pt-8 pb-6 border-b border-slate-800/60 text-center">
                            <div className="flex justify-center mb-3">
                                <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                                    <ShieldCheck size={20} className="text-amber-400" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                Accept Your Invitation
                            </h2>
                            <p className="text-slate-400 text-xs mt-1">
                                Set your password to activate your admin account.
                            </p>
                        </div>

                        <div className="px-9 py-7">
                            {/* Account info */}
                            <div className="mb-5 rounded-xl border border-slate-800 bg-[#050810] px-4 py-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <User size={13} className="text-amber-400/70" />
                                    <p className="text-sm font-semibold text-white">{name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={13} className="text-amber-400/70" />
                                    <p className="text-xs text-slate-400 truncate">{email}</p>
                                </div>
                            </div>

                            {/* Expiry warning */}
                            <div className="mb-5 flex items-center justify-center gap-2 text-xs">
                                <Clock size={13} className="text-amber-400" />
                                <span className="text-slate-400">
                                    Link expires <strong className="text-amber-400">{expiresAt}</strong>
                                </span>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <LockKeyhole
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-colors group-focus-within:text-amber-400"
                                        />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={data.password}
                                            onChange={(e) => setData("password", e.target.value)}
                                            placeholder="Enter a strong password"
                                            required
                                            className="w-full h-12 pl-10 pr-11 rounded-xl bg-[#050810] border border-slate-800 text-white text-sm placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-amber-500/70 focus:ring-4 focus:ring-amber-500/10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-rose-400 text-xs mt-1.5 flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-rose-400" />
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                {/* Confirm */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        Confirm Password
                                    </label>
                                    <div className="relative group">
                                        <LockKeyhole
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-colors group-focus-within:text-amber-400"
                                        />
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            value={data.password_confirmation}
                                            onChange={(e) => setData("password_confirmation", e.target.value)}
                                            placeholder="Confirm your password"
                                            required
                                            className="w-full h-12 pl-10 pr-11 rounded-xl bg-[#050810] border border-slate-800 text-white text-sm placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-amber-500/70 focus:ring-4 focus:ring-amber-500/10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors p-1"
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {data.password_confirmation.length > 0 && (
                                        <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${passwordMatch ? "text-emerald-400" : "text-rose-400"}`}>
                                            {passwordMatch ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {passwordMatch ? "Passwords match" : "Passwords do not match"}
                                        </p>
                                    )}
                                </div>

                                {/* Password Requirements */}
                                {data.password.length > 0 && (
                                    <div className="rounded-xl border border-slate-800 bg-[#050810] p-3">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                                            Password requirements
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            <PasswordRule valid={passwordHasMinLength} text="12+ characters" />
                                            <PasswordRule valid={passwordHasUppercase} text="Uppercase letter" />
                                            <PasswordRule valid={passwordHasLowercase} text="Lowercase letter" />
                                            <PasswordRule valid={passwordHasNumber} text="Number" />
                                            <PasswordRule valid={passwordHasSpecial} text="Special character" />
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={processing || !formValid}
                                    className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-[#0A0F1D] font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Activating...
                                        </>
                                    ) : (
                                        <>
                                            Activate Account
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Back to login */}
                            <div className="mt-5 text-center">
                                <Link
                                    href={getRoute("admin.login", "/admin/login")}
                                    className="text-xs text-slate-500 hover:text-amber-400 transition-colors font-medium"
                                >
                                    Back to login
                                </Link>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-9 py-4 border-t border-slate-800/60 bg-[#070B16]">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck size={15} className="text-amber-500/70 shrink-0" />
                                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                    Your password is encrypted and never stored in plain text.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col items-center gap-1.5 text-xs text-slate-500">
                        <p className="tracking-wide">
                            © {new Date().getFullYear()}{" "}
                            <span className="text-slate-400 font-semibold">ALIBATON</span>{" "}
                            — All Rights Reserved
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}