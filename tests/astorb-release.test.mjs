// Validates the committed release dataset in data/release/
import { test, expect } from "vite-plus/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_BIN = path.join(root, "data", "release", "astorb3d.bin");
const RELEASE_META = path.join(root, "data", "release", "astorb3d.meta.json");

test("committed release dataset exists and matches metadata", () => {
    expect(fs.existsSync(RELEASE_BIN)).toBe(true);
    expect(fs.existsSync(RELEASE_META)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(RELEASE_META, "utf8"));
    const stat = fs.statSync(RELEASE_BIN);

    expect(meta.recordCount).toBeGreaterThan(1000000);
    expect(stat.size).toBe(meta.recordCount * 24);
    expect(meta.epochJd).toBeGreaterThan(2400000);
    expect(meta.snapshot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify first record floats (Ceres)
    const fd = fs.openSync(RELEASE_BIN, "r");
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);

    const floats = new Float32Array(buffer.buffer, buffer.byteOffset, 6);
    // [M, w, Omega, i, e, a]
    const [, , , , e, a] = floats;
    expect(a).toBeGreaterThan(2.5);
    expect(a).toBeLessThan(3.0);
    expect(e).toBeGreaterThan(0.05);
    expect(e).toBeLessThan(0.12);
});
