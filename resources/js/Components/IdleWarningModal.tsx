import { AlertTriangle, Clock } from 'lucide-react';

interface IdleWarningModalProps {
    secondsLeft: number;
    onStayLoggedIn: () => void;
    onLogoutNow: () => void;
}

export default function IdleWarningModal({
    secondsLeft,
    onStayLoggedIn,
    onLogoutNow,
}: IdleWarningModalProps) {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-yellow-400/20 bg-slate-900 shadow-2xl">
                {/* HEADER */}
                <div className="border-b border-slate-800 bg-yellow-400/5 p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
                            <AlertTriangle
                                size={26}
                                className="text-yellow-400"
                            />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-wide text-white">
                                Session Expiring
                            </h2>
                            <p className="text-xs text-slate-400">
                                You've been idle for a while
                            </p>
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-5 sm:p-6">
                    <p className="text-sm leading-6 text-slate-300">
                        Your session will automatically end due to
                        inactivity. Any unsaved changes may be lost.
                    </p>

                    {/* COUNTDOWN */}
                    <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
                        <Clock size={22} className="text-yellow-400" />
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Logging out in
                            </p>
                            <p className="mt-1 font-mono text-3xl font-black text-yellow-400">
                                {formattedTime}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex flex-col gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-end sm:p-6">
                    <button
                        type="button"
                        onClick={onLogoutNow}
                        className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
                    >
                        Logout Now
                    </button>
                    <button
                        type="button"
                        onClick={onStayLoggedIn}
                        className="rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
                    >
                        Stay Logged In
                    </button>
                </div>
            </div>
        </div>
    );
}
