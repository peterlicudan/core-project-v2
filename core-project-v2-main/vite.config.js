import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,
        hmr: {
            host: "127.0.0.1",
        },
    },

    plugins: [
        laravel({
            input: [
                "resources/css/app.css",
                "resources/js/app.tsx",
            ],
            refresh: true,
        }),

        react(),

        tailwindcss(),
    ],

    build: {
        // The PDF chunk is intentionally large (jsPDF + html2canvas) and is
        // only downloaded when a report/export page is opened.
        chunkSizeWarningLimit: 650,
        rollupOptions: {
            output: {
                manualChunks: {
                    // React is a hard dependency of Inertia, so group them to
                    // avoid an empty standalone React chunk.
                    inertia: ["react", "react-dom", "@inertiajs/react"],
                    charts: ["recharts"],
                    pdf: ["jspdf", "html2canvas"],
                    icons: ["lucide-react"],
                },
            },
        },
    },
});
