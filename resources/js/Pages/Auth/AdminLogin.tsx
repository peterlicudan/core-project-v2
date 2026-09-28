import { Head, useForm } from "@inertiajs/react";
import {
    ShieldCheck,
    Mail,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
} from "lucide-react";
import { FormEvent, useState } from "react";

export default function AdminLogin() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();

        post("/admin/login", {
            onFinish: () => {
                reset("password");
            },
        });
    };

    return (
        <>
            <Head title="Admin Login | ALIBATON" />

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

                            {/* LOGO */}
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

                            {/* TEXT */}
                            <div className="max-w-xl">

                                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
                                    Admin Control Center
                                </p>

                                <h2 className="text-5xl font-black leading-tight">
                                    Power.
                                    <br />
                                    Precision.
                                    <br />
                                    Reliability.
                                </h2>

                                <p className="mt-6 max-w-lg text-gray-300">
                                    Secure access to the ALIBATON Heavy
                                    Equipment & Logistics Management System.
                                </p>

                            </div>

                            {/* FOOTER */}
                            <div className="text-sm text-gray-500">
                                © {new Date().getFullYear()} ALIBATON.
                                All rights reserved.
                            </div>

                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 py-10 sm:px-8">

                        <div className="w-full max-w-md">

                            {/* MOBILE LOGO */}
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

                            {/* HEADER */}
                            <div className="mb-8">

                                <div className="mb-4 inline-flex rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-3">
                                    <ShieldCheck
                                        size={24}
                                        className="text-yellow-400"
                                    />
                                </div>

                                <h2 className="text-3xl font-black">
                                    Admin Login
                                </h2>

                                <p className="mt-2 text-gray-500">
                                    Sign in to access the ALIBATON Admin
                                    Control Center.
                                </p>

                            </div>

                            {/* FORM */}
                            <form
                                onSubmit={submit}
                                className="space-y-5"
                            >

                                {/* EMAIL */}
                                <div>

                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-sm font-semibold text-gray-300"
                                    >
                                        Admin Email
                                    </label>

                                    <div className="relative">

                                        <Mail
                                            size={19}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                                        />

                                        <input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) =>
                                                setData(
                                                    "email",
                                                    e.target.value
                                                )
                                            }
                                            autoComplete="username"
                                            autoFocus
                                            maxLength={255}
                                            placeholder="admin@alibaton.com"
                                            className="w-full rounded-xl border border-white/10 bg-black/40 py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20"
                                        />

                                    </div>

                                    {errors.email && (
                                        <p className="mt-2 text-sm text-red-400">
                                            {errors.email}
                                        </p>
                                    )}

                                </div>

                                {/* PASSWORD */}
                                <div>

                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-sm font-semibold text-gray-300"
                                    >
                                        Password
                                    </label>

                                    <div className="relative">

                                        <LockKeyhole
                                            size={19}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                                        />

                                        <input
                                            id="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={data.password}
                                            onChange={(e) =>
                                                setData(
                                                    "password",
                                                    e.target.value
                                                )
                                            }
                                            autoComplete="current-password"
                                            minLength={8}
                                            maxLength={32}
                                            placeholder="Enter your password"
                                            className="w-full rounded-xl border border-white/10 bg-black/40 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    !showPassword
                                                )
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-yellow-400"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={19} />
                                            ) : (
                                                <Eye size={19} />
                                            )}
                                        </button>

                                    </div>

                                    {errors.password && (
                                        <p className="mt-2 text-sm text-red-400">
                                            {errors.password}
                                        </p>
                                    )}

                                </div>

                                {/* REMEMBER */}
                                <div className="flex items-center gap-3">



                                </div>

                                {/* LOGIN BUTTON */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3.5 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >

                                    {processing
                                        ? "Signing in..."
                                        : "Sign In as Administrator"}

                                    {!processing && (
                                        <ArrowRight
                                            size={19}
                                            className="transition-transform group-hover:translate-x-1"
                                        />
                                    )}

                                </button>

                            </form>

                            {/* SECURITY NOTICE */}
                            <div className="mt-8 rounded-xl border border-yellow-400/10 bg-yellow-400/3 p-4">

                                <div className="flex gap-3">

                                    <ShieldCheck
                                        size={20}
                                        className="mt-0.5 shrink-0 text-yellow-400"
                                    />

                                    <div>

                                        <p className="text-sm font-semibold text-gray-300">
                                            Administrator Access
                                        </p>

                                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                            This area is restricted to
                                            authorized ALIBATON administrators
                                            only.
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
