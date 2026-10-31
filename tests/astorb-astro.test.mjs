import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const astro = require("../scripts/js/astorb-astro.js");

const ECCENTRICITIES = [0, 0.2, 0.5, 0.9, 0.99];
const GRID = 4000;

const forEachGridPoint = (callback) =>
{
    for (const e of ECCENTRICITIES)
    {
        for (let k = 0; k <= GRID; k++)
        {
            // Cover several turns, negative time and the +/-pi wrap.
            const M = -3 * Math.PI + (6 * Math.PI * k) / GRID;
            callback(M, e);
        }
    }
};

test("solveKepler satisfies Kepler's equation to 1e-12 rad", () =>
{
    let worst = 0;
    forEachGridPoint((M, e) =>
    {
        const E = astro.solveKepler(M, e);
        const residual = Math.abs(astro.wrapPi(E - e * Math.sin(E) - M));
        worst = Math.max(worst, residual);
    });
    assert.ok(worst < 1e-12, `worst residual ${worst}`);
});

test("solveKeplerF32 (the GLSL mirror) tracks solveKepler", () =>
{
    // Float32 rounding inside the iteration is amplified near perihelion by 1 / (1 - e cos E):
    // the reachable floor is ~1e-6 rad at e = 0.9 and ~7e-6 rad at e = 0.99, far below
    // anything visible.
    // Both solvers get the same float32-reduced M that the shader sees, so this measures the
    // solver alone. (The reduction's own rounding, ~1 ulp of M, is real shader behavior.)
    forEachGridPoint((M, e) =>
    {
        const reference = astro.solveKepler(astro.reduceMeanAnomalyF32(M), e);
        const gpu = astro.solveKeplerF32(M, e);
        const error = Math.abs(astro.wrapPi(gpu - reference));
        const tolerance = e <= 0.9 ? 2e-6 : 1e-5;
        assert.ok(error < tolerance, `M=${M} e=${e} error=${error}`);
    });
});

test("the GPU iteration count is the smallest that converges at e = 0.99", () =>
{
    const worstAt = (iterations) =>
    {
        let worst = 0;
        for (let k = 0; k <= GRID; k++)
        {
            const M = -Math.PI + (2 * Math.PI * k) / GRID;
            const error = Math.abs(
                astro.wrapPi(astro.solveKeplerF32(M, 0.99, iterations) - astro.solveKepler(M, 0.99))
            );
            worst = Math.max(worst, error);
        }
        return worst;
    };
    assert.ok(worstAt(astro.KEPLER_GPU_ITERATIONS) < 1e-5);
    assert.ok(worstAt(astro.KEPLER_GPU_ITERATIONS - 1) >= 1e-5);
});

test("keplerPosition returns to the same point after exactly one period", () =>
{
    const elements = { a: 2.7, e: 0.3, i: 12, w: 40, O: 80, M: 123 };
    const periodSeconds = 2 * Math.PI * Math.sqrt(elements.a ** 3 / astro.MU_SUN_AU3_PER_S2);
    const start = astro.keplerPosition(elements, 0);
    const later = astro.keplerPosition(elements, periodSeconds);
    for (let axis = 0; axis < 3; axis++)
    {
        assert.ok(Math.abs(start[axis] - later[axis]) < 1e-9);
    }
});

test("keplerPosition puts perihelion at distance a(1 - e) along w from the node", () =>
{
    const elements = { a: 2, e: 0.5, i: 0, w: 90, O: 0, M: 0 };
    const [x, y, z] = astro.keplerPosition(elements, 0);
    assert.ok(Math.abs(x) < 1e-12);
    assert.ok(Math.abs(y - 1) < 1e-12);
    assert.equal(z, 0);
});

test("planet elements convert L and varpi instead of using L as M (Earth at J2000)", () =>
{
    const earth = astro.planetElementsAt("Earth", astro.JD_J2000);
    assert.ok(Math.abs(earth.M - 357.52688973) < 1e-6, `M=${earth.M}`);
    assert.ok(Math.abs(earth.w - 102.93768193) < 1e-6, `w=${earth.w}`);
    assert.equal(earth.O, 0);

    const [x, y] = astro.planetPosition("Earth", astro.JD_J2000);
    const longitude = astro.wrapDegrees(Math.atan2(y, x) * astro.RAD2DEG);
    // The old hand-converted table put Earth at ~194 deg; the real value is ~100.4 deg.
    assert.ok(Math.abs(longitude - 100.4) < 0.2, `longitude=${longitude}`);
});

test("Julian Date helpers round-trip and parse YYYYMMDD", () =>
{
    assert.equal(astro.jdFromYyyymmdd("20260917"), 2461300.5);
    assert.equal(astro.isoDateFromJd(2461300.5), "2026-09-17");
    assert.equal(astro.jdFromUnixMs(Date.UTC(2000, 0, 1, 12)), astro.JD_J2000);
    assert.ok(Number.isNaN(astro.jdFromYyyymmdd("2026-09")));
    assert.equal(astro.yearFromJd(2461300.5), 2026);
});

test("angle helpers wrap correctly", () =>
{
    assert.ok(Math.abs(astro.wrapPi(3 * Math.PI) + Math.PI) < 1e-12);
    assert.equal(astro.wrapDegrees(-10), 350);
    assert.ok(Math.abs(astro.angleBetweenDegrees([1, 0, 0], [0, 1, 0]) - 90) < 1e-12);
});
