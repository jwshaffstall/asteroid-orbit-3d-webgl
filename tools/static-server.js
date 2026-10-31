// static-server.js
// Minimal static file server for screenshots and browser tests (serves the repo root, the way
// GitHub Pages serves the site today). Binds to 127.0.0.1 on a random port.

const fs = require("fs");
const http = require("http");
const path = require("path");

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".bin": "application/octet-stream",
    ".png": "image/png",
    ".svg": "image/svg+xml",
};

// Resolve a URL path inside rootDir, or return null if it escapes it.
const resolveInside = (rootDir, urlPath) =>
{
    let decoded;
    try
    {
        decoded = decodeURIComponent(urlPath.split("?")[0]);
    }
    catch
    {
        return null;
    }
    const requested = decoded === "/" ? "/astorb3d.html" : decoded;
    const filePath = path.resolve(rootDir, "." + requested);
    const relative = path.relative(rootDir, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative))
    {
        return null;
    }
    return filePath;
};

const startStaticServer = (rootDir) =>
{
    const server = http.createServer((req, res) =>
    {
        const filePath = resolveInside(rootDir, req.url || "/");
        if (!filePath)
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
            res.writeHead(200, {
                "Content-Type": contentTypes[ext] || "application/octet-stream",
                "Content-Length": stat.size,
            });
            fs.createReadStream(filePath).pipe(res);
        });
    });
    return new Promise((resolve) =>
    {
        server.listen(0, "127.0.0.1", () =>
        {
            resolve({ server, port: server.address().port });
        });
    });
};

module.exports = { startStaticServer, resolveInside };
