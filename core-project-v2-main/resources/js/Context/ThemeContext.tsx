import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeContextType = {
    isDarkMode: boolean;
    toggleTheme: () => void;
    setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            // Keep this key in sync with the inline script in
            // resources/views/app.blade.php ("alibaton-theme").
            const saved =
                localStorage.getItem('alibaton-theme') ??
                localStorage.getItem('theme');
            if (saved === 'dark') return true;
            if (saved === 'light') return false;
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return true;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('alibaton-theme', isDarkMode ? 'dark' : 'light');
            // Remove the legacy key so it can't fight the new one.
            localStorage.removeItem('theme');
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const setDarkMode = (value: boolean) => {
        setIsDarkMode(value);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}