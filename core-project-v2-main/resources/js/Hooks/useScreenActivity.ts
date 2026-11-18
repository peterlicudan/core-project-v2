import { useEffect, useRef } from "react";

/*
|--------------------------------------------------------------------------
| Screen Activity Tracking
|--------------------------------------------------------------------------
|
| The server only sees HTTP requests, so a user who is actively typing or
| moving the mouse but has not navigated anywhere would still be treated as
| idle and logged out.
|
| This hook reports genuine on-screen interaction so the idle window in
| App\Http\Middleware\CheckIdleSession reflects real activity. A request is
| only sent when something actually happened, and at most once per throttle
| window, so an idle tab generates no traffic at all.
|
*/

const ACTIVITY_EVENTS = [
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "wheel",
    "scroll",
];

const THROTTLE_MS = 30_000;
const POLL_MS = 5_000;

const getCsrfToken = (): string =>
    document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") || "";

export default function useScreenActivity(
    endpoint: string = "/session/activity",
    enabled: boolean = true,
) {
    const dirtyRef = useRef(false);
    const lastSentRef = useRef(0);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const markActive = () => {
            dirtyRef.current = true;
        };

        ACTIVITY_EVENTS.forEach((eventName) =>
            window.addEventListener(eventName, markActive, { passive: true }),
        );

        const interval = window.setInterval(() => {
            if (!dirtyRef.current) {
                return;
            }

            const now = Date.now();

            if (now - lastSentRef.current < THROTTLE_MS) {
                return;
            }

            dirtyRef.current = false;
            lastSentRef.current = now;

            fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                credentials: "same-origin",
            }).catch(() => {
                // The idle window will simply elapse if this cannot be sent.
            });
        }, POLL_MS);

        return () => {
            ACTIVITY_EVENTS.forEach((eventName) =>
                window.removeEventListener(eventName, markActive),
            );

            window.clearInterval(interval);
        };
    }, [endpoint, enabled]);
}
