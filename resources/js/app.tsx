import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./Context/ThemeContext";

const appName =
    import.meta.env.VITE_APP_NAME || "ALIBATON";

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) => {
        const pages = import.meta.glob(
            [
                "./Pages/**/*.tsx",
                "./Components/**/*.tsx",
            ],
            {
                eager: true,
            }
        );

        const page = pages[
            `./Pages/${name}.tsx`
        ] as {
            default: React.ComponentType;
        } | undefined;

        if (page) {
            return page.default;
        }

        const component = pages[
            `./Components/${name.replace(
                /^Components\//,
                ""
            )}.tsx`
        ] as {
            default: React.ComponentType;
        } | undefined;

        if (component) {
            return component.default;
        }

        console.error(
            "PAGE NOT FOUND:",
            name
        );

        console.log(
            "AVAILABLE PAGES:",
            Object.keys(pages)
        );

        throw new Error(
            `Missing page: ${name}`
        );
    },

    setup({ el, App, props }) {
        createRoot(el).render(
            <ThemeProvider>
                <App {...props} />
            </ThemeProvider>
        );
    },

    progress: {
        color: "#FACC15",
    },
});
