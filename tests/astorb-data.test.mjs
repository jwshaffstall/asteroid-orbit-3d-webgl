import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const astorbLine = require("../tools/astorb_line.js");
const classify = require("../tools/classify.js");
const converter = require("../tools/astorb2bin.js");
const astro = require("../scripts/js/astorb-astro.js");

const fixturesDir = new URL("./fixtures/", import.meta.url);
const realLines = fs
    .readFileSync(new URL("astorb-lines.dat", fixturesDir), "utf8")
    .split("\n")
    .filter((line) => line.length > 0);
const lineFor = (pattern) => realLines.find((line) => pattern.test(line.slice(0, 26)));
const parse = (pattern) => astorbLine.parseLine(lineFor(pattern)).record;
const EPOCH_JD = 2461300.5;

test("parses Ceres by documented columns", () =>
{
    const ceres = parse(/^ {5}1 Ceres/);
    assert.equal(ceres.number, 1);
    assert.equal(ceres.designation, "Ceres");
    assert.equal(ceres.absoluteMagnitude, 3.34);
    assert.equal(ceres.epoch, "20260917");
    assert.equal(ceres.meanAnomaly, 295.937548);
    assert.equal(ceres.argumentOfPerihelion, 73.20809);
    assert.equal(ceres.longitudeOfAscendingNode, 80.248993);
    assert.equal(ceres.inclination, 10.587505);
    assert.equal(ceres.eccentricity, 0.07975072);
    assert.equal(ceres.semimajorAxis, 2.76592189);
});

test("reads an inclination of 100 deg or more that fills the separating space", () =>
{
    // "297.110640160.418505": the old parser read this inclination as 60.4 deg.
    const dioretsa = parse(/20461 Dioretsa/);
    assert.equal(dioretsa.longitudeOfAscendingNode, 297.11064);
    assert.equal(dioretsa.inclination, 160.418505);
});

test("reads a semimajor axis of 1000 AU or more that fills the separating space", () =>
{
    // "0.996004761037.18993807": the old parser read this as 37.19 AU.
    const distant = parse(/^ {7}2005 VX3/);
    assert.equal(distant.number, null);
    assert.equal(distant.eccentricity, 0.99600476);
    assert.equal(distant.semimajorAxis, 1037.18993807);
});

test("accepts CRLF endings and ignores total line length", () =>
{
    const line = lineFor(/^ {5}1 Ceres/);
    assert.equal(astorbLine.parseLine(line + "\r").record.semimajorAxis, 2.76592189);
    assert.equal(astorbLine.parseLine(line + "   extra").record.semimajorAxis, 2.76592189);
    assert.equal(astorbLine.parseLine(line.slice(0, 182)).record.semimajorAxis, 2.76592189);
});

test("parses unnumbered objects by their provisional designation", () =>
{
    const unnumbered = parse(/^ {7}1927 LA/);
    assert.equal(unnumbered.number, null);
    assert.equal(unnumbered.designation, "1927 LA");
});

test("rejects blank, short, non-numeric and non-elliptic rows with a reason", () =>
{
    const ceres = lineFor(/^ {5}1 Ceres/);
    const replaceAt = (line, start, text) =>
        line.slice(0, start) + text + line.slice(start + text.length);
    assert.equal(astorbLine.parseLine("").error, "blank line");
    assert.match(astorbLine.parseLine(ceres.slice(0, 120)).error, /too short/);
    assert.match(
        astorbLine.parseLine(replaceAt(ceres, 158, "    abcdef")).error,
        /non-numeric eccentricity/
    );
    assert.match(astorbLine.parseLine(replaceAt(ceres, 158, "1.00000000")).error, /not elliptic/);
    assert.match(
        astorbLine.parseLine(replaceAt(ceres, 168, "  -2.76592189")).error,
        /semimajor axis/
    );
    assert.match(astorbLine.parseLine(replaceAt(ceres, 106, "2026091X")).error, /bad epoch/);
    assert.equal(astorbLine.parse(""), null);
});

test("classifies known objects by JPL definitions and our precedence", () =>
{
    const classOf = (pattern) => classify.CLASS_NAMES[classify.classify(parse(pattern), EPOCH_JD)];
    assert.equal(classOf(/433 Eros/), "Amor");
    assert.equal(classOf(/99942 Apophis/), "Aten");
    assert.equal(classOf(/624 Hektor/), "Trojan L4");
    assert.equal(classOf(/1172 Aneas/), "Trojan L5");
    assert.equal(classOf(/153 Hilda/), "Hilda");
    assert.equal(classOf(/434 Hungaria/), "Hungaria");
    assert.equal(classOf(/ {5}1 Ceres/), "Middle main belt");
    assert.equal(classOf(/3200 Phaethon/), "Apollo");
    assert.equal(classOf(/20461 Dioretsa/), "Centaur");
    assert.equal(classify.CLASS_NAMES.length, 16);
});

test("converter writes the v1 layout, metadata and a rejection report", async () =>
{
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astorb3d-test-"));
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
    assert.equal(bytes.length, realLines.length * 24);
    const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
    // Record 0 is Ceres: M, w, Omega, i, e, a.
    assert.ok(Math.abs(floats[0] - 295.937548) < 1e-4);
    assert.ok(Math.abs(floats[5] - 2.76592189) < 1e-6);

    assert.equal(meta.recordCount, realLines.length);
    assert.equal(meta.epoch, "2026-09-17");
    assert.equal(meta.epochJd, EPOCH_JD);
    assert.equal(meta.snapshot.date, "2026-10-30");
    assert.match(meta.snapshot.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(meta.bodies).sort(), ["Ceres", "Pallas", "Vesta"]);

    const report = JSON.parse(fs.readFileSync(path.join(dir, "sample.rejected.json"), "utf8"));
    assert.equal(report.total, 2);
    assert.equal(report.reasons["blank line"].count, 1);
    fs.rmSync(dir, { recursive: true, force: true });
});

test("converter propagates a record with a different epoch to the dataset epoch", async () =>
{
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astorb3d-test-"));
    const input = path.join(dir, "sample.dat");
    // Move Ceres's epoch 100 days earlier; the converter must advance M by n * 100 days.
    const ceres = lineFor(/^ {5}1 Ceres/);
    const shifted = ceres.slice(0, 106) + "20260609" + ceres.slice(114);
    fs.writeFileSync(input, [shifted, ...realLines.slice(1)].join("\n") + "\n");
    const output = path.join(dir, "sample.bin");
    const meta = await converter.convert({ input, output, dwarfs: null });
    assert.equal(meta.propagated.count, 1);
    assert.equal(meta.propagated.maxDays, 100);

    const bytes = fs.readFileSync(output);
    const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
    const a = 2.76592189;
    const degreesPerDay = Math.sqrt(astro.MU_SUN_AU3_PER_DAY2 / a ** 3) * astro.RAD2DEG;
    const expected = astro.wrapDegrees(295.937548 + degreesPerDay * 100);
    assert.ok(Math.abs(floats[0] - expected) < 1e-3, `M=${floats[0]} expected ${expected}`);
    fs.rmSync(dir, { recursive: true, force: true });
});

test("the committed fixture dataset covers every class and matches its metadata", () =>
{
    const meta = JSON.parse(
        fs.readFileSync(new URL("astorb-fixture.meta.json", fixturesDir), "utf8")
    );
    const bytes = fs.statSync(new URL("astorb-fixture.bin", fixturesDir)).size;
    assert.equal(bytes, meta.recordCount * 24);
    assert.ok(meta.recordCount > 15000 && meta.recordCount <= 20000);
    for (const name of classify.CLASS_NAMES.slice(0, 15))
    {
        assert.ok(meta.classCounts[name] > 0, `no ${name} in fixture`);
    }
});
