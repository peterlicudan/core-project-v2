import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

interface UseIdleLogoutOptions {
    timeout?: number;
    warningDuration?: number;
    logoutUrl: string;
    redirectUrl: string;
    onLogout?: () => void;
}

export function useIdleLogout({
    timeout = 5 * 60 * 1000,          // ✅ 5 minutes
    warningDuration = 30 * 1000,      // ✅ 30 seconds warning
    logoutUrl,
    redirectUrl,
    onLogout,
}: UseIdleLogoutOptions) {
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(
        Math.floor(warningDuration / 1000),
    );

    const logoutTimerRef = useRef<number | null>(null);
    const warningTimerRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);
    const showWarningRef = useRef(false);

    const clearAllTimers = () => {
        if (logoutTimerRef.current) {
            window.clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        if (warningTimerRef.current) {
            window.clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    };

    const performLogout = () => {
        clearAllTimers();
        setShowWarning(false);
        showWarningRef.current = false;

        if (onLogout) onLogout();

        router.post(
            logoutUrl,                    // ✅ dynamic
            {},
            {
                onFinish: () => {
                    window.location.href = redirectUrl;  // ✅ dynamic
                },
            },
        );
    };

    const startWarningCountdown = () => {
        showWarningRef.current = true;
        setShowWarning(true);
        setSecondsLeft(Math.floor(warningDuration / 1000));

        countdownIntervalRef.current = window.setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    if (countdownIntervalRef.current) {
                        window.clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const resetTimers = () => {
        if (showWarningRef.current) return;

        clearAllTimers();
        setShowWarning(false);

        warningTimerRef.current = window.setTimeout(() => {
            startWarningCountdown();
        }, timeout - warningDuration);

        logoutTimerRef.current = window.setTimeout(() => {
            performLogout();
        }, timeout);
    };

    const stayLoggedIn = () => {
        showWarningRef.current = false;
        setShowWarning(false);
        clearAllTimers();
        resetTimers();
    };

    useEffect(() => {
        const activityEvents = [
            'mousemove',     // ✅ mouse gumagalaw → reset
            'mousedown',
            'click',
            'keydown',
            'scroll',
            'touchstart',
            'touchmove',
        ];

        let throttleTimer: number | null = null;
        const handleActivity = () => {
            if (showWarningRef.current) return;
            if (throttleTimer) return;

            throttleTimer = window.setTimeout(() => {
                resetTimers();
                throttleTimer = null;
            }, 1000);
        };

        activityEvents.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        resetTimers();

        return () => {
            activityEvents.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            if (throttleTimer) window.clearTimeout(throttleTimer);
            clearAllTimers();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        showWarning,
        secondsLeft,
        stayLoggedIn,
    };
}
