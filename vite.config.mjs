import { defineConfig } from "vite-plus";
import fs from "node:fs";
import { resolve } from "path";

function releaseDatasetPlugin() {
    return {
        name: "release-dataset-plugin",
        generateBundle() {
            const releaseBin = resolve(import.meta.dirname, "data/release/astorb3d.bin");
            const releaseMeta = resolve(import.meta.dirname, "data/release/astorb3d.meta.json");

            if (!fs.existsSync(releaseBin)) {
                this.error(
                    "Missing committed release dataset at 'data/release/astorb3d.bin'.\n" +
                        "Run 'pnpm run data:release' or ensure the file is checked out."
                );
            }

            this.emitFile({
                type: "asset",
                fileName: "data/release/astorb3d.bin",
                source: fs.readFileSync(releaseBin),
            });

            if (fs.existsSync(releaseMeta)) {
                this.emitFile({
                    type: "asset",
                    fileName: "data/release/astorb3d.meta.json",
                    source: fs.readFileSync(releaseMeta),
                });
            }
        },
    };
}

export default defineConfig({
    base: "./",
    plugins: [releaseDatasetPlugin()],
    server: {
        port: 5173,
        open: "/astorb3d.html",
    },
    fmt: {
        semi: true,
        singleQuote: false,
        tabWidth: 4,
        trailingComma: "es5",
        printWidth: 100,
        endOfLine: "lf",
        ignorePatterns: [
            "node_modules/**",
            "temp/**",
            "dist/**",
            "artifacts/**",
            "pnpm-lock.yaml",
            "astorb/*.txt",
            "tests/fixtures/**",
            "plans/archive/**",
        ],
    },
    test: {
        projects: [
            {
                test: {
                    name: "unit",
                    include: ["tests/**/*.test.mjs"],
                    exclude: ["tests/e2e/**", "node_modules/**"],
                    environment: "node",
                },
            },
            {
                test: {
                    name: "e2e",
                    include: ["tests/e2e/**/*.e2e.mjs"],
                    environment: "node",
                    fileParallelism: false,
                    testTimeout: 60000,
                    hookTimeout: 30000,
                },
            },
        ],
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
