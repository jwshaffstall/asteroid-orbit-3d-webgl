// fetch-catalog.mjs
// Download a Lowell astorb snapshot and record it in data/manifest.source.json.
//
// Usage: node tools/fetch-catalog.mjs [--out temp]
// Writes temp/<YYYY-MM-DD>-astorb.dat.gz (the snapshot date is today, UTC). Lowell is the only
// source (ADR 0001 / plan); if it's down, try again another day. MPCORB is plan B (stretch).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const minimist = require("minimist");

export const LOWELL_URL = "https://ftp.lowell.edu/pub/elgb/astorb.dat.gz";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "data", "manifest.source.json");

export const readSourceManifest = () =>
    fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
        : { description: "", snapshots: [] };

export const writeSourceManifest = (manifest) =>
{
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n");
};

export const sha256File = async (filePath) =>
{
    const hash = crypto.createHash("sha256");
    await pipeline(fs.createReadStream(filePath), hash);
    return hash.digest("hex");
};

export const fetchCatalog = async ({ outDir = path.join(root, "temp") } = {}) =>
{
    const date = new Date().toISOString().slice(0, 10);
    const outPath = path.join(outDir, `${date}-astorb.dat.gz`);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`downloading ${LOWELL_URL}`);
    const response = await fetch(LOWELL_URL);
    if (!response.ok || !response.body)
    {
        throw new Error(`Lowell download failed: HTTP ${response.status}. Try again later.`);
    }
    const partial = outPath + ".partial";
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial));
    fs.renameSync(partial, outPath);
    const bytes = fs.statSync(outPath).size;
    const sha256 = await sha256File(outPath);
    console.log(`saved ${path.relative(root, outPath)} (${bytes} bytes, sha256 ${sha256})`);
    return { date, file: outPath, bytes, sha256, url: LOWELL_URL };
};

// Record (or update) a snapshot entry, keyed by its date.
export const recordSnapshot = (entry) =>
{
    const manifest = readSourceManifest();
    manifest.snapshots = manifest.snapshots.filter((snapshot) => snapshot.date !== entry.date);
    manifest.snapshots.push(entry);
    manifest.snapshots.sort((x, y) => x.date.localeCompare(y.date));
    writeSourceManifest(manifest);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
    const args = minimist(process.argv.slice(2), { string: ["out"] });
    fetchCatalog({ outDir: args.out ? path.resolve(args.out) : undefined })
        .then((snapshot) =>
        {
            recordSnapshot({
                date: snapshot.date,
                catalog: "Lowell astorb",
                url: snapshot.url,
                file: path.basename(snapshot.file),
                bytes: snapshot.bytes,
                sha256: snapshot.sha256,
                releaseAsset: `data-lowell-${snapshot.date.replaceAll("-", "")}`,
                archived: false,
            });
            console.log("recorded in data/manifest.source.json");
        })
        .catch((error) =>
        {
            console.error(error.message);
            process.exit(1);
        });
}
