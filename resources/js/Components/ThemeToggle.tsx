import { Moon, Sun } from "lucide-react";
import { useTheme } from "../Hooks/useTheme";   //

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="
                inline-flex h-10 w-10 items-center justify-center rounded-xl
                border border-slate-200 bg-white text-slate-600 transition
                hover:border-yellow-400/60 hover:text-yellow-500
                dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-400
                dark:hover:border-yellow-400/40 dark:hover:text-yellow-400
            "
        >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}
