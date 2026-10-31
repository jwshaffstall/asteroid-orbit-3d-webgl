import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const utils = require("../scripts/js/astorb-utils.js");

test("formatBytes handles common sizes", () =>
{
    assert.equal(utils.formatBytes(0), "0 B");
    assert.equal(utils.formatBytes(1024), "1.0 KB");
    assert.equal(utils.formatBytes(1048576), "1.0 MB");
});

test("formatAsteroidPercent handles empty and non-empty totals", () =>
{
    assert.equal(utils.formatAsteroidPercent(5, 0), "0%");
    assert.equal(utils.formatAsteroidPercent(50, 200), "25.0%");
});

test("buildStatusText includes key simulation fields", () =>
{
    const status = utils.buildStatusText({
        simTime: 365.25 * 24 * 3600,
        paused: false,
        timeScale: -200000,
        asteroidCount: 200,
        asteroidDrawCount: 100,
    });

    assert.match(status, /\[RUNNING\]/);
    assert.match(status, /Time: 1\.00 years/);
    assert.match(status, /Asteroids: 100 \/ 200 \(50\.0%\)/);
    assert.match(status, /Reverse/);
});

test("buildStatusText shows the sim date and any notice", () =>
{
    const status = utils.buildStatusText({
        simDate: "2026-10-31",
        notice: "Planet positions approximate outside 1800–2050",
        paused: true,
        timeScale: 1e6,
        asteroidCount: 10,
        asteroidDrawCount: 10,
    });
    assert.match(status, /^\[PAUSED\] Date: 2026-10-31 \|/);
    assert.match(status, /Forward\) \| Planet positions approximate/);
    assert.doesNotMatch(utils.buildStatusText({ simDate: "2026-10-31" }), /\| $/);
});

test("accuracyNotice flags dates far from the epoch or outside the planet table", () =>
{
    assert.equal(utils.accuracyNotice(44, 2026), "");
    assert.equal(utils.accuracyNotice(-365.25 * 30, 1996), "");
    assert.match(utils.accuracyNotice(365.25 * 40, 2066), /1800–2050/);
    assert.match(utils.accuracyNotice(-365.25 * 250, 1776), /Over 100 years/);
    assert.match(utils.accuracyNotice(365.25 * 1000, 3026), /limit/);
});
