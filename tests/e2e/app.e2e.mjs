// Browser tests (Playwright + Vitest) against the 20k-record fixture dataset.
// Run with `npm run test:e2e`. Uses headless Chromium with SwiftShader WebGL.

import { test, expect, beforeAll, afterAll } from "vite-plus/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const { startStaticServer } = require("../../tools/static-server.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = "data=tests/fixtures/astorb-fixture.bin&debug=1";
let server;
let port;
let browser;

beforeAll(async () => {
    ({ server, port } = await startStaticServer(root));
    browser = await chromium.launch({
        headless: true,
        args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
});

afterAll(async () => {
    await browser?.close();
    server?.close();
});

// Open the app, collect console errors, and wait for the first rendered frame.
const openApp = async (query = "", contextOptions = { viewport: { width: 1280, height: 720 } }) => {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/astorb3d.html?${FIXTURE}&${query}`);
    await page.waitForFunction(() => window.__astorbFirstFrameRendered === true, undefined, {
        timeout: 60000,
    });
    return { page, context, errors };
};

// Count lit pixels in the WebGL canvas right after the app draws a frame.
const litPixels = (page) =>
    page.evaluate(
        () =>
            new Promise((resolve) => {
                requestAnimationFrame(() => {
                    const source = document.getElementById("astorb3dCanvas");
                    const copy = document.createElement("canvas");
                    copy.width = source.width;
                    copy.height = source.height;
                    const context = copy.getContext("2d");
                    context.drawImage(source, 0, 0);
                    const data = context.getImageData(0, 0, copy.width, copy.height).data;
                    let lit = 0;
                    for (let index = 0; index < data.length; index += 4) {
                        if (data[index] + data[index + 1] + data[index + 2] > 30) lit++;
                    }
                    resolve(lit);
                });
            })
    );

test("loads the fixture dataset at its epoch with no console or WebGL errors for 10 s", async () => {
    const { page, context, errors } = await openApp("t=0");
    const state = await page.evaluate(() => ({
        count: window.astorb.asteroidCount,
        epochJd: window.astorb.epoch.jd,
        epochLabel: document.getElementById("dataEpoch").textContent,
        snapshotLabel: document.getElementById("dataSnapshot").textContent,
    }));
    expect(state.count).toBe(19994);
    expect(state.epochJd).toBe(2461300.5);
    expect(state.epochLabel).toBe("2026-09-17");
    expect(state.snapshotLabel).toBe("2026-10-30");
    await page.waitForTimeout(10000);
    expect(await page.evaluate(() => window.__astorbGlErrors || 0)).toBe(0);
    expect(errors).toEqual([]);
    expect(await litPixels(page)).toBeGreaterThan(1000);
    await context.close();
});

test("opens at today's date unless ?t= pins it", async () => {
    const { page, context } = await openApp("paused=1");
    const status = await page.evaluate(() => {
        window.astorb.frameCount = 9; // force a status refresh on the next frame
        return new Promise((resolve) =>
            requestAnimationFrame(() =>
                resolve(document.getElementById("statusDisplay").textContent)
            )
        );
    });
    const today = new Date().toISOString().slice(0, 10);
    expect(status).toMatch(new RegExp(`Date: ${today}`));
    await context.close();
});

test("Space toggles pause exactly once with the canvas focused", async () => {
    const { page, context } = await openApp("t=0");
    await page.click("#astorb3dCanvas");
    const before = await page.evaluate(() => window.astorb.time.paused);
    await page.keyboard.press("Space");
    expect(await page.evaluate(() => window.astorb.time.paused)).toBe(!before);
    await page.keyboard.press("ArrowUp");
    // One press doubles the speed once (it used to be applied twice: 4x).
    expect(await page.evaluate(() => window.astorb.time.timeScale)).toBe(2e6);
    await context.close();
});

test("shortcuts are ignored while a button has focus", async () => {
    const { page, context } = await openApp("t=0");
    await page.focus("#themeToggleButton");
    const scale = await page.evaluate(() => window.astorb.time.timeScale);
    await page.keyboard.press("ArrowUp");
    expect(await page.evaluate(() => window.astorb.time.timeScale)).toBe(scale);
    await context.close();
});

test("changing the point size leaves cinematic mode on", async () => {
    const { page, context } = await openApp("t=0");
    await page.click("#cinematicModeButton");
    await page.click("#pointSizeButton");
    expect(await page.evaluate(() => window.astorb.cinematicMode.enabled)).toBe(true);
    expect(await page.textContent("#cinematicModeButton")).toMatch(/On/);
    await context.close();
});

test("ten density halvings and doublings give zero WebGL errors and a non-empty frame", async () => {
    const { page, context, errors } = await openApp("t=0&paused=1");
    for (let step = 0; step < 10; step++) {
        await page.click("#asteroidHalfButton", { force: true });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    }
    const smallest = await page.evaluate(() => window.astorb.asteroidDrawCount);
    expect(smallest).toBe(Math.ceil(19994 / 1024));
    for (let step = 0; step < 10; step++) {
        await page.click("#asteroidDoubleButton", { force: true });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    }
    expect(await page.evaluate(() => window.astorb.asteroidDrawCount)).toBe(19994);
    expect(await page.evaluate(() => window.__astorbGlErrors || 0)).toBe(0);
    expect(await litPixels(page)).toBeGreaterThan(1000);
    expect(errors).toEqual([]);
    await context.close();
});

test("renders on an iPhone 13 Pro-sized viewport", async () => {
    const { page, context, errors } = await openApp("t=0", {
        ...devices["iPhone 13 Pro"],
        deviceScaleFactor: 1,
    });
    expect(await litPixels(page)).toBeGreaterThan(500);
    expect(await page.evaluate(() => window.__astorbGlErrors || 0)).toBe(0);
    expect(errors).toEqual([]);
    await context.close();
});
