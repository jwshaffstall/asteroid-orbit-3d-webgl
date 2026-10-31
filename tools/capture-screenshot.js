// capture-screenshot.js
// Capture a deterministic screenshot of the app with headless Chromium (SwiftShader WebGL).
//
// Usage: node tools/capture-screenshot.js [--output artifacts/astorb3d.png]
//        [--query "t=0&cam=0,20,12&paused=1"] [--width 1280 --height 720] [--mobile]
// The query string is passed to astorb3d.html (see astorb.readUrlOptions). Exits non-zero if
// the scene doesn't finish rendering, rather than saving a misleading blank screenshot.

const fs = require("fs");
const path = require("path");
const minimist = require("minimist");
const { chromium, devices } = require("playwright");
const { startStaticServer } = require("./static-server.js");

const args = minimist(process.argv.slice(2), {
    string: ["output", "query"],
    boolean: ["mobile"],
    default: { query: "t=0&cam=0,20,12&paused=1" },
});
const outputPath = args.output || path.join("artifacts", "astorb3d.png");
const rootDir = path.resolve(__dirname, "..");
const RENDER_TIMEOUT_MS = 120000;

const captureScreenshot = async () =>
{
    const { server, port } = await startStaticServer(rootDir);
    let browser;
    try
    {
        browser = await chromium.launch({
            headless: true,
            args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        });
        const context = await browser.newContext(
            args.mobile
                ? { ...devices["iPhone 13 Pro"], deviceScaleFactor: 1 }
                : {
                      viewport: {
                          width: Number(args.width) || 1280,
                          height: Number(args.height) || 720,
                      },
                  }
        );
        const page = await context.newPage();
        const consoleErrors = [];
        page.on("console", (message) =>
        {
            if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => consoleErrors.push(error.message));

        await page.goto(`http://127.0.0.1:${port}/astorb3d.html?${args.query}`, {
            waitUntil: "domcontentloaded",
        });
        // waitForFunction(fn, arg, options): the options object is the THIRD argument.
        await page.waitForFunction(
            () => window.__astorbDataLoaded === true && window.__astorbFirstFrameRendered === true,
            undefined,
            { timeout: RENDER_TIMEOUT_MS }
        );
        // Let a few more frames draw so the status bar and labels settle.
        await page.waitForTimeout(500);

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        await page.screenshot({ path: outputPath, fullPage: true });
        console.log(`Saved screenshot to ${outputPath}`);
        if (consoleErrors.length)
        {
            console.error("Console errors:\n" + consoleErrors.join("\n"));
            process.exitCode = 1;
        }
    }
    finally
    {
        if (browser)
        {
            await browser.close();
        }
        server.close();
    }
};

captureScreenshot().catch((error) =>
{
    console.error(error);
    process.exitCode = 1;
});
