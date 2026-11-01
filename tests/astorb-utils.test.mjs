import { test, expect } from "vite-plus/test";
import * as utils from "../scripts/js/astorb-utils.js";

test("formatBytes handles common sizes", () => {
    expect(utils.formatBytes(0)).toBe("0 B");
    expect(utils.formatBytes(1024)).toBe("1.0 KB");
    expect(utils.formatBytes(1048576)).toBe("1.0 MB");
});

test("formatAsteroidPercent handles empty and non-empty totals", () => {
    expect(utils.formatAsteroidPercent(5, 0)).toBe("0%");
    expect(utils.formatAsteroidPercent(50, 200)).toBe("25.0%");
});

test("buildStatusText includes key simulation fields", () => {
    const status = utils.buildStatusText({
        simTime: 365.25 * 24 * 3600,
        paused: false,
        timeScale: -200000,
        asteroidCount: 200,
        asteroidDrawCount: 100,
    });

    expect(status).toMatch(/\[RUNNING\]/);
    expect(status).toMatch(/Time: 1\.00 years/);
    expect(status).toMatch(/Asteroids: 100 \/ 200 \(50\.0%\)/);
    expect(status).toMatch(/Reverse/);
});

test("buildStatusText shows the sim date and any notice", () => {
    const status = utils.buildStatusText({
        simDate: "2026-10-31",
        notice: "Planet positions approximate outside 1800–2050",
        paused: true,
        timeScale: 1e6,
        asteroidCount: 10,
        asteroidDrawCount: 10,
    });
    expect(status).toMatch(/^\[PAUSED\] Date: 2026-10-31 \|/);
    expect(status).toMatch(/Forward\) \| Planet positions approximate/);
    expect(utils.buildStatusText({ simDate: "2026-10-31" })).not.toMatch(/\| $/);
});

test("accuracyNotice flags dates far from the epoch or outside the planet table", () => {
    expect(utils.accuracyNotice(44, 2026)).toBe("");
    expect(utils.accuracyNotice(-365.25 * 30, 1996)).toBe("");
    expect(utils.accuracyNotice(365.25 * 40, 2066)).toMatch(/1800–2050/);
    expect(utils.accuracyNotice(-365.25 * 250, 1776)).toMatch(/Over 100 years/);
    expect(utils.accuracyNotice(365.25 * 1000, 3026)).toMatch(/limit/);
});
