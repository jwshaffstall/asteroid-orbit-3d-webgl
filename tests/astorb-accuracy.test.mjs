// Bug-catcher accuracy tests against JPL Horizons (ADR 0001): they exist to catch mistakes like
// the old hand-converted Earth elements (~94 deg off), not to certify precision.
// Regenerate the fixtures with `node tools/horizons-fixtures.mjs --epoch YYYY-MM-DD` when the
// dataset epoch changes.

import { test, expect } from "vite-plus/test";
import fs from "node:fs";
import { createRequire } from "node:module";
import * as astro from "../scripts/js/astorb-astro.js";

const require = createRequire(import.meta.url);
const astorbLine = require("../tools/astorb_line.js");

const readJson = (relative) =>
    JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), "utf8"));
const horizons = readJson("./fixtures/horizons/vectors.json");
const dwarfs = readJson("../data/dwarf-planets.json");
const catalog = fs
    .readFileSync(new URL("./fixtures/astorb-lines.dat", import.meta.url), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => astorbLine.parseLine(line).record);

const TOLERANCE_DEGREES = 0.5;
const SECONDS_PER_DAY = astro.SECONDS_PER_DAY;

const elementsFromRecord = (record) => ({
    a: record.semimajorAxis,
    e: record.eccentricity,
    i: record.inclination,
    w: record.argumentOfPerihelion,
    O: record.longitudeOfAscendingNode,
    M: record.meanAnomaly,
});

const assertClose = (name, jd, computed, reference) => {
    const angle = astro.angleBetweenDegrees(computed, reference);
    expect(angle).toBeLessThan(TOLERANCE_DEGREES);
    return angle;
};

test("fixtures are for the dataset epoch", () => {
    const meta = readJson("../temp/astorb3d.meta.json");
    expect(horizons.epochJd).toBe(meta.epochJd);
    expect(dwarfs.epochJd).toBe(meta.epochJd);
});

for (const name of astro.PLANET_NAMES) {
    test(`${name} is within ${TOLERANCE_DEGREES} deg of Horizons at epoch, +/-50 days and +/-10 years`, () => {
        const samples = horizons.bodies[name].samples;
        expect(samples.length).toBe(5);
        for (const sample of samples) {
            assertClose(name, sample.jd, astro.planetPosition(name, sample.jd), sample.position);
        }
    });
}

const SPOT_CHECKS = {
    Ceres: 1,
    Vesta: 4,
    Hilda: 153,
    Eros: 433,
    Hektor: 624,
    Aeneas: 1172,
    Phaethon: 3200,
};

for (const [name, number] of Object.entries(SPOT_CHECKS)) {
    test(`${name} propagated from catalog elements is within ${TOLERANCE_DEGREES} deg of Horizons at epoch +/-50 days`, () => {
        const record = catalog.find((entry) => entry.number === number);
        expect(record).toBeTruthy();
        const epochJd = astro.jdFromYyyymmdd(record.epoch);
        const near = horizons.bodies[name].samples.filter(
            (sample) => Math.abs(sample.jd - epochJd) <= 50
        );
        expect(near.length).toBe(3);
        for (const sample of near) {
            const position = astro.keplerPosition(
                elementsFromRecord(record),
                (sample.jd - epochJd) * SECONDS_PER_DAY
            );
            assertClose(name, sample.jd, position, sample.position);
        }
    });
}

test("Pluto from Horizons elements at the epoch matches Horizons vectors at +/-50 days", () => {
    const pluto = dwarfs.bodies.find((body) => body.name === "Pluto");
    const near = horizons.bodies.Pluto.samples.filter(
        (sample) => Math.abs(sample.jd - pluto.epochJd) <= 50
    );
    for (const sample of near) {
        const position = astro.keplerPosition(pluto, (sample.jd - pluto.epochJd) * SECONDS_PER_DAY);
        assertClose("Pluto", sample.jd, position, sample.position);
    }
});

test("the old hand-converted Earth elements would have failed this test", () => {
    // Regression guard: the pre-v1.1 table stored L as M and varpi as w.
    const oldEarth = {
        a: 1.00000261,
        e: 0.01671123,
        i: -0.00001531,
        w: 102.93768193,
        O: -11.26064,
        M: 100.464571,
    };
    const sample = horizons.bodies.Earth.samples.find((entry) => entry.jd === horizons.epochJd);
    const dtSeconds = (sample.jd - astro.JD_J2000) * SECONDS_PER_DAY;
    const angle = astro.angleBetweenDegrees(
        astro.keplerPosition(oldEarth, dtSeconds),
        sample.position
    );
    expect(angle).toBeGreaterThan(10);
});
