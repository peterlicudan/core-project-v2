import { RefreshCw, Circle } from "lucide-react";

interface LiveRefreshIndicatorProps {
    refresh: () => void | Promise<void>;
    refreshing?: boolean;
    now?: Date;
}

export default function LiveRefreshIndicator({
    refresh,
    refreshing = false,
    now = new Date(),
}: LiveRefreshIndicatorProps) {
    const formattedTime = now.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <RefreshCw
                    size={14}
                    className={refreshing ? "animate-spin" : ""}
                />

                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Circle
                    size={7}
                    fill="currentColor"
                    className="text-emerald-400"
                />

                <span>Live</span>

                <span className="text-gray-600">•</span>

                <span className="tabular-nums">{formattedTime}</span>
            </div>
        </div>
    );
}
