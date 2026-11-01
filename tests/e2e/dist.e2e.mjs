// Smoke tests against the production dist/ build.
import { test, expect, beforeAll, afterAll } from "vite-plus/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { startStaticServer } = require("../../tools/static-server.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const distDir = path.join(root, "dist");
let server;
let port;
let browser;

beforeAll(async () => {
    ({ server, port } = await startStaticServer(distDir));
    browser = await chromium.launch({
        headless: true,
        args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
});

afterAll(async () => {
    await browser?.close();
    server?.close();
});

test("serves production build from dist/ with no 404s and renders a frame", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const networkErrors = [];
    const consoleErrors = [];

    page.on("requestfailed", (req) => {
        networkErrors.push(`${req.url()} (${req.failure()?.errorText || "failed"})`);
    });
    page.on("response", (res) => {
        if (res.status() >= 400) {
            networkErrors.push(`${res.url()} [HTTP ${res.status()}]`);
        }
    });
    page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // Open dist build using ?paused=1 to render first frame stably
    await page.goto(`http://127.0.0.1:${port}/astorb3d.html?t=0&paused=1`);
    await page.waitForFunction(
        () => window.__astorbDataLoaded === true && window.__astorbFirstFrameRendered === true,
        undefined,
        { timeout: 60000 }
    );

    expect(networkErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(await page.evaluate(() => window.__astorbGlErrors || 0)).toBe(0);

    const count = await page.evaluate(() => window.astorb.asteroidCount);
    expect(count).toBeGreaterThan(1000000);

    await context.close();
});
