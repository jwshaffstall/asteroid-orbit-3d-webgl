import { test, expect } from "vite-plus/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as astro from "../scripts/js/astorb-astro.js";

const require = createRequire(import.meta.url);
const astorbLine = require("../tools/astorb_line.js");
const classify = require("../tools/classify.js");
const converter = require("../tools/astorb2bin.js");

const fixturesDir = new URL("./fixtures/", import.meta.url);
const realLines = fs
    .readFileSync(new URL("astorb-lines.dat", fixturesDir), "utf8")
    .split("\n")
    .filter((line) => line.length > 0);
const lineFor = (pattern) => realLines.find((line) => pattern.test(line.slice(0, 26)));
const parse = (pattern) => astorbLine.parseLine(lineFor(pattern)).record;
const EPOCH_JD = 2461300.5;

const localTempDir = () => {
    const tempDir = path.resolve(fileURLToPath(new URL("../temp/test-tmp/", import.meta.url)));
    fs.mkdirSync(tempDir, { recursive: true });
    return fs.mkdtempSync(path.join(tempDir, "astorb3d-test-"));
};

test("parses Ceres by documented columns", () => {
    const ceres = parse(/^ {5}1 Ceres/);
    expect(ceres.number).toBe(1);
    expect(ceres.designation).toBe("Ceres");
    expect(ceres.absoluteMagnitude).toBe(3.34);
    expect(ceres.epoch).toBe("20260917");
    expect(ceres.meanAnomaly).toBe(295.937548);
    expect(ceres.argumentOfPerihelion).toBe(73.20809);
    expect(ceres.longitudeOfAscendingNode).toBe(80.248993);
    expect(ceres.inclination).toBe(10.587505);
    expect(ceres.eccentricity).toBe(0.07975072);
    expect(ceres.semimajorAxis).toBe(2.76592189);
});

test("reads an inclination of 100 deg or more that fills the separating space", () => {
    // "297.110640160.418505": the old parser read this inclination as 60.4 deg.
    const dioretsa = parse(/20461 Dioretsa/);
    expect(dioretsa.longitudeOfAscendingNode).toBe(297.11064);
    expect(dioretsa.inclination).toBe(160.418505);
});

test("reads a semimajor axis of 1000 AU or more that fills the separating space", () => {
    // "0.996004761037.18993807": the old parser read this as 37.19 AU.
    const distant = parse(/^ {7}2005 VX3/);
    expect(distant.number).toBeNull();
    expect(distant.eccentricity).toBe(0.99600476);
    expect(distant.semimajorAxis).toBe(1037.18993807);
});

test("accepts CRLF endings and ignores total line length", () => {
    const line = lineFor(/^ {5}1 Ceres/);
    expect(astorbLine.parseLine(line + "\r").record.semimajorAxis).toBe(2.76592189);
    expect(astorbLine.parseLine(line + "   extra").record.semimajorAxis).toBe(2.76592189);
    expect(astorbLine.parseLine(line.slice(0, 182)).record.semimajorAxis).toBe(2.76592189);
});

test("parses unnumbered objects by their provisional designation", () => {
    const unnumbered = parse(/^ {7}1927 LA/);
    expect(unnumbered.number).toBeNull();
    expect(unnumbered.designation).toBe("1927 LA");
});

test("rejects blank, short, non-numeric and non-elliptic rows with a reason", () => {
    const ceres = lineFor(/^ {5}1 Ceres/);
    const replaceAt = (line, start, text) =>
        line.slice(0, start) + text + line.slice(start + text.length);
    expect(astorbLine.parseLine("").error).toBe("blank line");
    expect(astorbLine.parseLine(ceres.slice(0, 120)).error).toMatch(/too short/);
    expect(astorbLine.parseLine(replaceAt(ceres, 158, "    abcdef")).error).toMatch(
        /non-numeric eccentricity/
    );
    expect(astorbLine.parseLine(replaceAt(ceres, 158, "1.00000000")).error).toMatch(/not elliptic/);
    expect(astorbLine.parseLine(replaceAt(ceres, 168, "  -2.76592189")).error).toMatch(
        /semimajor axis/
    );
    expect(astorbLine.parseLine(replaceAt(ceres, 106, "2026091X")).error).toMatch(/bad epoch/);
    expect(astorbLine.parse("")).toBeNull();
});

test("classifies known objects by JPL definitions and our precedence", () => {
    const classOf = (pattern) => classify.CLASS_NAMES[classify.classify(parse(pattern), EPOCH_JD)];
    expect(classOf(/433 Eros/)).toBe("Amor");
    expect(classOf(/99942 Apophis/)).toBe("Aten");
    expect(classOf(/624 Hektor/)).toBe("Trojan L4");
    expect(classOf(/1172 Aneas/)).toBe("Trojan L5");
    expect(classOf(/153 Hilda/)).toBe("Hilda");
    expect(classOf(/434 Hungaria/)).toBe("Hungaria");
    expect(classOf(/ {5}1 Ceres/)).toBe("Middle main belt");
    expect(classOf(/3200 Phaethon/)).toBe("Apollo");
    expect(classOf(/20461 Dioretsa/)).toBe("Centaur");
    expect(classify.CLASS_NAMES.length).toBe(16);
});

test("converter writes the v1 layout, metadata and a rejection report", async () => {
    const dir = localTempDir();
    const input = path.join(dir, "2026-10-30-sample.dat");
    fs.writeFileSync(input, realLines.join("\r\n") + "\r\n\r\nnot a record\r\n");
    const output = path.join(dir, "sample.bin");
    const meta = await converter.convert({
        input,
        output,
        snapshotDate: "2026-10-30",
        dwarfs: null,
    });

    const bytes = fs.readFileSync(output);
    expect(bytes.length).toBe(realLines.length * 24);
    const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
    // Record 0 is Ceres: M, w, Omega, i, e, a.
    expect(Math.abs(floats[0] - 295.937548)).toBeLessThan(1e-4);
    expect(Math.abs(floats[5] - 2.76592189)).toBeLessThan(1e-6);

    expect(meta.recordCount).toBe(realLines.length);
    expect(meta.epoch).toBe("2026-09-17");
    expect(meta.epochJd).toBe(EPOCH_JD);
    expect(meta.snapshot.date).toBe("2026-10-30");
    expect(meta.snapshot.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(meta.bodies).sort()).toEqual(["Ceres", "Pallas", "Vesta"]);

    const report = JSON.parse(fs.readFileSync(path.join(dir, "sample.rejected.json"), "utf8"));
    expect(report.total).toBe(2);
    expect(report.reasons["blank line"].count).toBe(1);
    fs.rmSync(dir, { recursive: true, force: true });
});

test("converter propagates a record with a different epoch to the dataset epoch", async () => {
    const dir = localTempDir();
    const input = path.join(dir, "sample.dat");
    // Move Ceres's epoch 100 days earlier; the converter must advance M by n * 100 days.
    const ceres = lineFor(/^ {5}1 Ceres/);
    const shifted = ceres.slice(0, 106) + "20260609" + ceres.slice(114);
    fs.writeFileSync(input, [shifted, ...realLines.slice(1)].join("\n") + "\n");
    const output = path.join(dir, "sample.bin");
    const meta = await converter.convert({ input, output, dwarfs: null });
    expect(meta.propagated.count).toBe(1);
    expect(meta.propagated.maxDays).toBe(100);

    const bytes = fs.readFileSync(output);
    const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
    const a = 2.76592189;
    const degreesPerDay = Math.sqrt(astro.MU_SUN_AU3_PER_DAY2 / a ** 3) * astro.RAD2DEG;
    const expected = astro.wrapDegrees(295.937548 + degreesPerDay * 100);
    expect(Math.abs(floats[0] - expected)).toBeLessThan(1e-3);
    fs.rmSync(dir, { recursive: true, force: true });
});

test("the committed fixture dataset covers every class and matches its metadata", () => {
    const meta = JSON.parse(
        fs.readFileSync(new URL("astorb-fixture.meta.json", fixturesDir), "utf8")
    );
    const bytes = fs.statSync(new URL("astorb-fixture.bin", fixturesDir)).size;
    expect(bytes).toBe(meta.recordCount * 24);
    expect(meta.recordCount).toBeGreaterThan(15000);
    expect(meta.recordCount).toBeLessThanOrEqual(20000);
    for (const name of classify.CLASS_NAMES.slice(0, 15)) {
        expect(meta.classCounts[name]).toBeGreaterThan(0);
    }
});
