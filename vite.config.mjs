import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    base: "./",
    server: {
        port: 5173,
        open: "/astorb3d.html",
    },
    build: {
        minify: "oxc",
        rolldownOptions: {
            input: {
                main: resolve(import.meta.dirname, "astorb3d.html"),
            },
        },
    },
});
