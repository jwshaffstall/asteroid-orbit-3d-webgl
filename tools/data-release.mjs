// data-release.mjs
// Prepares and validates the release-optimized dataset in data/release/astorb3d.bin
//
// Usage: node tools/data-release.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_BIN = path.join(root, "temp", "astorb3d.bin");
const SOURCE_META = path.join(root, "temp", "astorb3d.meta.json");
const RELEASE_DIR = path.join(root, "data", "release");
const RELEASE_BIN = path.join(RELEASE_DIR, "astorb3d.bin");
const RELEASE_META = path.join(RELEASE_DIR, "astorb3d.meta.json");

const sha256File = (filePath) =>
    new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", reject);
    });

export const prepareReleaseDataset = async () => {
    if (!fs.existsSync(SOURCE_BIN)) {
        throw new Error(
            `Source dataset not found at ${SOURCE_BIN}. Run 'pnpm run data:refresh' first.`
        );
    }
    if (!fs.existsSync(SOURCE_META)) {
        throw new Error(
            `Source metadata not found at ${SOURCE_META}. Run 'pnpm run data:refresh' first.`
        );
    }

    fs.mkdirSync(RELEASE_DIR, { recursive: true });

    const meta = JSON.parse(fs.readFileSync(SOURCE_META, "utf8"));
    const stat = fs.statSync(SOURCE_BIN);
    const expectedBytes = meta.recordCount * 24;

    if (stat.size !== expectedBytes) {
        throw new Error(
            `Dataset size mismatch: expected ${expectedBytes} bytes for ${meta.recordCount} records, got ${stat.size}`
        );
    }

    fs.copyFileSync(SOURCE_BIN, RELEASE_BIN);

    const binSha256 = await sha256File(RELEASE_BIN);
    meta.binSha256 = binSha256;
    fs.writeFileSync(RELEASE_META, JSON.stringify(meta, null, 4) + "\n");

    console.log(`Release dataset prepared in ${path.relative(root, RELEASE_DIR)}:`);
    console.log(`  Records: ${meta.recordCount}`);
    console.log(`  Epoch: ${meta.epoch} (JD ${meta.epochJd})`);
    console.log(`  Size: ${stat.size} bytes`);
    console.log(`  SHA256: ${binSha256}`);
    return meta;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    prepareReleaseDataset().catch((err) => {
        console.error(err.message || err);
        process.exit(1);
    });
}
