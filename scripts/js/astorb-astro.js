// astorb-astro.js
// Shared astronomy: Kepler solvers, Standish planet elements, Julian dates.
// Loaded as a classic script in the browser (window.astorbAstro) and with require() in Node tests.
// The GLSL solver in astorb3d.html mirrors solveKeplerF32() step for step; keep them in sync.

(function (root, factory)
{
    if (typeof module === "object" && module.exports)
    {
        module.exports = factory();
    }
    else
    {
        root.astorbAstro = factory();
    }
})(typeof self !== "undefined" ? self : this, function ()
{
    var TWO_PI = 2.0 * Math.PI;
    var DEG2RAD = Math.PI / 180.0;
    var RAD2DEG = 180.0 / Math.PI;

    // Gaussian gravitational constant k = 0.01720209895 rad/day; mu = k^2 AU^3/day^2.
    var MU_SUN_AU3_PER_DAY2 = 0.01720209895 * 0.01720209895;
    var SECONDS_PER_DAY = 86400.0;
    var MU_SUN_AU3_PER_S2 = MU_SUN_AU3_PER_DAY2 / (SECONDS_PER_DAY * SECONDS_PER_DAY);

    var JD_UNIX_EPOCH = 2440587.5; // 1970-01-01T00:00:00Z
    var JD_J2000 = 2451545.0; // 2000-01-01T12:00:00 (TT); treated as UTC here (ADR 0001).
    var DAYS_PER_JULIAN_CENTURY = 36525.0;

    // Fixed Newton iteration count used by the GPU solver. Chosen by test (see
    // tests/astorb-astro.test.mjs): the smallest count that keeps solveKeplerF32 within
    // tolerance of solveKepler for every M at e = 0.99.
    var KEPLER_GPU_ITERATIONS = 7;

    // Reduce an angle in radians to [-pi, pi).
    var wrapPi = function (angle)
    {
        var wrapped = (angle + Math.PI) % TWO_PI;
        if (wrapped < 0)
        {
            wrapped += TWO_PI;
        }
        return wrapped - Math.PI;
    };

    // Reduce an angle in degrees to [0, 360).
    var wrapDegrees = function (degrees)
    {
        var wrapped = degrees % 360.0;
        return wrapped < 0 ? wrapped + 360.0 : wrapped;
    };

    // Reference elliptic Kepler solver in float64. Returns the eccentric anomaly E (radians,
    // same branch as wrapPi(M)) for mean anomaly M (radians) and 0 <= e < 1.
    var solveKepler = function (meanAnomaly, eccentricity)
    {
        var M = wrapPi(meanAnomaly);
        var e = eccentricity;
        var E = M + 0.85 * e * (Math.sin(M) >= 0 ? 1.0 : -1.0);
        for (var iteration = 0; iteration < 50; iteration++)
        {
            var delta = (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
            E -= delta;
            if (Math.abs(delta) < 1e-12)
            {
                break;
            }
        }
        return E;
    };

    // Float32 mirror of the GLSL solver: same start value, same fixed iteration count, every
    // intermediate rounded to float32. Used in tests as the stand-in for the shader.
    // Float32 mirror of the shader's reduction of M to [-pi, pi):
    // GLSL M = mod(M + pi, two_pi) - pi, with mod(x, y) = x - y * floor(x / y).
    var reduceMeanAnomalyF32 = function (meanAnomaly)
    {
        var f = Math.fround;
        var pi = f(Math.PI);
        var twoPi = f(TWO_PI);
        var shifted = f(f(meanAnomaly) + pi);
        return f(f(shifted - f(twoPi * Math.floor(f(shifted / twoPi)))) - pi);
    };

    var solveKeplerF32 = function (meanAnomaly, eccentricity, iterations)
    {
        var f = Math.fround;
        var count = iterations === undefined ? KEPLER_GPU_ITERATIONS : iterations;
        var M = reduceMeanAnomalyF32(meanAnomaly);
        var e = f(eccentricity);
        var E = f(M + f(f(0.85 * e) * (f(Math.sin(M)) >= 0 ? 1.0 : -1.0)));
        for (var iteration = 0; iteration < count; iteration++)
        {
            var sinE = f(Math.sin(E));
            var cosE = f(Math.cos(E));
            var numerator = f(f(E - f(e * sinE)) - M);
            var denominator = f(1.0 - f(e * cosE));
            E = f(E - f(numerator / denominator));
        }
        return E;
    };

    // Heliocentric ecliptic J2000 position (AU) from elements in degrees:
    // { a, e, i, w (argument of perihelion), O (ascending node), M (mean anomaly at epoch) }.
    // dtSeconds is the time since the elements' epoch; meanMotion (rad/s) defaults to two-body.
    var keplerPosition = function (elements, dtSeconds, meanMotion)
    {
        var a = elements.a;
        var e = elements.e;
        var n = meanMotion === undefined ? Math.sqrt(MU_SUN_AU3_PER_S2 / (a * a * a)) : meanMotion;
        var M = elements.M * DEG2RAD + n * (dtSeconds || 0);
        var E = solveKepler(M, e);
        var cosE = Math.cos(E);
        var sinE = Math.sin(E);
        // Orbital-plane coordinates, then rotate by w, i, O.
        var xOrb = a * (cosE - e);
        var yOrb = a * Math.sqrt(1.0 - e * e) * sinE;
        var w = elements.w * DEG2RAD;
        var O = elements.O * DEG2RAD;
        var inc = elements.i * DEG2RAD;
        var cosW = Math.cos(w);
        var sinW = Math.sin(w);
        var cosO = Math.cos(O);
        var sinO = Math.sin(O);
        var cosI = Math.cos(inc);
        var sinI = Math.sin(inc);
        var x =
            (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb;
        var y =
            (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb;
        var z = sinW * sinI * xOrb + cosW * sinI * yOrb;
        return [x, y, z];
    };

    // E. M. Standish, "Keplerian Elements for Approximate Positions of the Major Planets",
    // Table 1 (valid 1800 AD - 2050 AD), JPL Solar System Dynamics. Mean ecliptic and equinox
    // of J2000. Each row: [value at J2000, rate per Julian century] for
    // a (AU), e, I (deg), L (mean longitude, deg), varpi (longitude of perihelion, deg),
    // Omega (longitude of ascending node, deg). "Earth" is the Earth-Moon barycenter: Earth's
    // ~4,700 km offset from it is under 0.002 deg as seen from the Sun, invisible here.
    var STANDISH_TABLE_1 = {
        Mercury: {
            a: [0.38709927, 0.00000037],
            e: [0.20563593, 0.00001906],
            I: [7.00497902, -0.00594749],
            L: [252.2503235, 149472.67411175],
            varpi: [77.45779628, 0.16047689],
            Omega: [48.33076593, -0.12534081],
        },
        Venus: {
            a: [0.72333566, 0.0000039],
            e: [0.00677672, -0.00004107],
            I: [3.39467605, -0.0007889],
            L: [181.9790995, 58517.81538729],
            varpi: [131.60246718, 0.00268329],
            Omega: [76.67984255, -0.27769418],
        },
        Earth: {
            a: [1.00000261, 0.00000562],
            e: [0.01671123, -0.00004392],
            I: [-0.00001531, -0.01294668],
            L: [100.46457166, 35999.37244981],
            varpi: [102.93768193, 0.32327364],
            Omega: [0.0, 0.0],
        },
        Mars: {
            a: [1.52371034, 0.00001847],
            e: [0.0933941, 0.00007882],
            I: [1.84969142, -0.00813131],
            L: [-4.55343205, 19140.30268499],
            varpi: [-23.94362959, 0.44441088],
            Omega: [49.55953891, -0.29257343],
        },
        Jupiter: {
            a: [5.202887, -0.00011607],
            e: [0.04838624, -0.00013253],
            I: [1.30439695, -0.00183714],
            L: [34.39644051, 3034.74612775],
            varpi: [14.72847983, 0.21252668],
            Omega: [100.47390909, 0.20469106],
        },
        Saturn: {
            a: [9.53667594, -0.0012506],
            e: [0.05386179, -0.00050991],
            I: [2.48599187, 0.00193609],
            L: [49.95424423, 1222.49362201],
            varpi: [92.59887831, -0.41897216],
            Omega: [113.66242448, -0.28867794],
        },
        Uranus: {
            a: [19.18916464, -0.00196176],
            e: [0.04725744, -0.00004397],
            I: [0.77263783, -0.00242939],
            L: [313.23810451, 428.48202785],
            varpi: [170.9542763, 0.40805281],
            Omega: [74.01692503, 0.04240589],
        },
        Neptune: {
            a: [30.06992276, 0.00026291],
            e: [0.00859048, 0.00005105],
            I: [1.77004347, 0.00035372],
            L: [-55.12002969, 218.45945325],
            varpi: [44.96476227, -0.32241464],
            Omega: [131.78422574, -0.00508664],
        },
    };
    var PLANET_NAMES = [
        "Mercury",
        "Venus",
        "Earth",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
    ];
    var STANDISH_VALID_FROM_YEAR = 1800;
    var STANDISH_VALID_TO_YEAR = 2050;

    var julianCenturiesSinceJ2000 = function (jd)
    {
        return (jd - JD_J2000) / DAYS_PER_JULIAN_CENTURY;
    };

    // Planet elements at Julian Date jd, converted to the { a, e, i, w, O, M } form used by
    // keplerPosition (degrees): w = varpi - Omega, M = L - varpi. The conversion is done here,
    // in code, so no hand-converted table can drift again.
    var planetElementsAt = function (name, jd)
    {
        var row = STANDISH_TABLE_1[name];
        if (!row)
        {
            throw new Error("unknown planet: " + name);
        }
        var T = julianCenturiesSinceJ2000(jd);
        var value = function (key)
        {
            return row[key][0] + row[key][1] * T;
        };
        var L = value("L");
        var varpi = value("varpi");
        var Omega = value("Omega");
        return {
            a: value("a"),
            e: value("e"),
            i: value("I"),
            w: wrapDegrees(varpi - Omega),
            O: wrapDegrees(Omega),
            M: wrapDegrees(L - varpi),
        };
    };

    // Heliocentric ecliptic J2000 position (AU) of a planet at Julian Date jd.
    var planetPosition = function (name, jd)
    {
        return keplerPosition(planetElementsAt(name, jd), 0);
    };

    var jdFromUnixMs = function (unixMs)
    {
        return unixMs / (SECONDS_PER_DAY * 1000.0) + JD_UNIX_EPOCH;
    };

    var unixMsFromJd = function (jd)
    {
        return (jd - JD_UNIX_EPOCH) * SECONDS_PER_DAY * 1000.0;
    };

    // "20260917" (YYYYMMDD, 0h) -> Julian Date.
    var jdFromYyyymmdd = function (text)
    {
        var match = /^(\d{4})(\d{2})(\d{2})$/.exec(String(text).trim());
        if (!match)
        {
            return NaN;
        }
        var ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return jdFromUnixMs(ms);
    };

    // Julian Date -> "YYYY-MM-DD" (UTC). Works for years 1-9999 only, which covers the
    // reachable sim range around any modern epoch.
    var isoDateFromJd = function (jd)
    {
        var date = new Date(unixMsFromJd(jd));
        if (isNaN(date.getTime()))
        {
            return "--";
        }
        return date.toISOString().slice(0, 10);
    };

    var yearFromJd = function (jd)
    {
        return new Date(unixMsFromJd(jd)).getUTCFullYear();
    };

    // Angle in degrees between two position vectors as seen from the origin (the Sun).
    var angleBetweenDegrees = function (u, v)
    {
        var dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
        var lu = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
        var lv = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        var cosine = Math.max(-1, Math.min(1, dot / (lu * lv)));
        return Math.acos(cosine) * RAD2DEG;
    };

    return {
        TWO_PI: TWO_PI,
        DEG2RAD: DEG2RAD,
        RAD2DEG: RAD2DEG,
        MU_SUN_AU3_PER_S2: MU_SUN_AU3_PER_S2,
        MU_SUN_AU3_PER_DAY2: MU_SUN_AU3_PER_DAY2,
        SECONDS_PER_DAY: SECONDS_PER_DAY,
        JD_J2000: JD_J2000,
        KEPLER_GPU_ITERATIONS: KEPLER_GPU_ITERATIONS,
        STANDISH_TABLE_1: STANDISH_TABLE_1,
        STANDISH_VALID_FROM_YEAR: STANDISH_VALID_FROM_YEAR,
        STANDISH_VALID_TO_YEAR: STANDISH_VALID_TO_YEAR,
        PLANET_NAMES: PLANET_NAMES,
        wrapPi: wrapPi,
        wrapDegrees: wrapDegrees,
        solveKepler: solveKepler,
        solveKeplerF32: solveKeplerF32,
        reduceMeanAnomalyF32: reduceMeanAnomalyF32,
        keplerPosition: keplerPosition,
        planetElementsAt: planetElementsAt,
        planetPosition: planetPosition,
        julianCenturiesSinceJ2000: julianCenturiesSinceJ2000,
        jdFromUnixMs: jdFromUnixMs,
        unixMsFromJd: unixMsFromJd,
        jdFromYyyymmdd: jdFromYyyymmdd,
        isoDateFromJd: isoDateFromJd,
        yearFromJd: yearFromJd,
        angleBetweenDegrees: angleBetweenDegrees,
    };
});
