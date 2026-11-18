import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./Context/ThemeContext";

const appName =
    import.meta.env.VITE_APP_NAME || "ALIBATON";

/*
|--------------------------------------------------------------------------
| LAZY PAGE RESOLUTION
|--------------------------------------------------------------------------
|
| `eager: true` used to bundle every Inertia page and component into the
| main app chunk (~3 MB). Resolving pages lazily makes Vite emit one chunk
| per page, so the initial admin/staff page only downloads what it needs.
|
*/

const pages = import.meta.glob("./Pages/**/*.tsx");

const components = import.meta.glob("./Components/**/*.tsx");

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) => {
        const page = pages[`./Pages/${name}.tsx`];

        if (page) {
            return page().then(
                (module) =>
                    (module as { default: React.ComponentType }).default
            );
        }

        const component =
            components[
                `./Components/${name.replace(
                    /^Components\//,
                    ""
                )}.tsx`
            ];

        if (component) {
            return component().then(
                (module) =>
                    (module as { default: React.ComponentType }).default
            );
        }

        console.error("PAGE NOT FOUND:", name);

        console.log(
            "AVAILABLE PAGES:",
            Object.keys(pages)
        );

        throw new Error(`Missing page: ${name}`);
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
