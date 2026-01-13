const fs = require("fs");
const http = require("http");
const path = require("path");
const minimist = require("minimist");
const { chromium } = require("playwright");

const args = minimist(process.argv.slice(2));
const outputPath = args.output || path.join("artifacts", "astorb3d.png");
const rootDir = path.resolve(__dirname, "..");

const contentTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".bin": "application/octet-stream",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
};

const ensureDir = (filePath) =>
{
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
};

const createServer = () =>
{
    const server = http.createServer((req, res) =>
    {
        const requestedPath = decodeURIComponent(req.url.split("?")[0]);
        const safePath = requestedPath === "/" ? "/astorb3d.html" : requestedPath;
        const filePath = path.join(rootDir, safePath);

        if (!filePath.startsWith(rootDir))
        {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }

        fs.stat(filePath, (err, stat) =>
        {
            if (err || !stat.isFile())
            {
                res.writeHead(404);
                res.end("Not found");
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
            fs.createReadStream(filePath).pipe(res);
        });
    });

    return new Promise((resolve) =>
    {
        server.listen(0, "127.0.0.1", () =>
        {
            const { port } = server.address();
            resolve({ server, port });
        });
    });
};

const captureScreenshot = async () =>
{
    const { server, port } = await createServer();
    let browser;

    try
    {
        browser = await chromium.launch({
            headless: true,
            args: ["--use-gl=swiftshader", "--enable-webgl", "--disable-dev-shm-usage"],
        });
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
        const url = `http://127.0.0.1:${port}/astorb3d.html`;

        await page.goto(url, { waitUntil: "domcontentloaded" });
        try
        {
            await page.waitForFunction(
                () =>
                    window.__astorbDataLoaded === true &&
                    window.__astorbFirstFrameRendered === true,
                { timeout: 120000 }
            );
        }
        catch (error)
        {
            console.error(
                "Timed out waiting for astorb render, capturing screenshot anyway.",
                error
            );
        }

        ensureDir(outputPath);
        await page.screenshot({ path: outputPath, fullPage: true });
        console.log(`Saved screenshot to ${outputPath}`);
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
