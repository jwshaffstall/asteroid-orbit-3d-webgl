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
