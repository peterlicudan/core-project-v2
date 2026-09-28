import type { FormEvent } from 'react';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
    } = useForm({
        password: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        post('/confirm-password', {
            onFinish: () => {
                reset('password');
            },
        });
    };

    return (
        <>
            <Head title="Confirm Password" />

            <div className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-white">
                <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center justify-center">
                    <div className="w-full rounded-2xl border border-yellow-400/20 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                        {/* ALIBATON HEADER */}
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl font-black tracking-wide text-yellow-400">
                                ALIBATON
                            </h1>

                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                                Heavy Equipment &amp; Logistics
                            </p>
                        </div>

                        {/* TITLE */}
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-white">
                                Confirm Password
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-white/60">
                                This is a secure area of the application.
                                Please confirm your password before
                                continuing.
                            </p>
                        </div>

                        {/* FORM */}
                        <form
                            onSubmit={submit}
                            className="space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-semibold text-white/80"
                                >
                                    Password
                                </label>

                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    autoFocus
                                    autoComplete="current-password"
                                    onChange={(e) =>
                                        setData(
                                            'password',
                                            e.target.value,
                                        )
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20"
                                    placeholder="Enter your password"
                                />

                                {errors.password && (
                                    <p className="mt-2 text-sm text-red-400">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing
                                    ? 'Confirming...'
                                    : 'Confirm'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}