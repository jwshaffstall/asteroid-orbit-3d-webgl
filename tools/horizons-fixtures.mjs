// horizons-fixtures.mjs
// Fetch JPL Horizons reference data for a dataset epoch:
//   tests/fixtures/horizons/vectors.json  heliocentric ecliptic J2000 positions (AU) of the
//                                         planets and spot-check asteroids at epoch, +/-50 days
//                                         and +/-10 years (bug-catcher tests, ADR 0001)
//   data/dwarf-planets.json               osculating heliocentric elements of Pluto, Haumea,
//                                         Makemake and Eris at the epoch (used by astorb2bin.js)
//
// Usage: node tools/horizons-fixtures.mjs --epoch 2026-09-17
// Regenerate whenever the dataset epoch changes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const minimist = require("minimist");
const astro = require("../scripts/js/astorb-astro.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://ssd.jpl.nasa.gov/api/horizons.api";

// Planets use system barycenters (Standish's elements describe barycenters; "Earth" is the
// Earth-Moon barycenter). Small bodies use the "<number>;" small-body syntax.
const VECTOR_BODIES = [
    { name: "Mercury", command: "1" },
    { name: "Venus", command: "2" },
    { name: "Earth", command: "3" },
    { name: "Mars", command: "4" },
    { name: "Jupiter", command: "5" },
    { name: "Saturn", command: "6" },
    { name: "Uranus", command: "7" },
    { name: "Neptune", command: "8" },
    { name: "Pluto", command: "9" },
    { name: "Ceres", command: "1;", number: 1 },
    { name: "Vesta", command: "4;", number: 4 },
    { name: "Hilda", command: "153;", number: 153 },
    { name: "Eros", command: "433;", number: 433 },
    { name: "Hektor", command: "624;", number: 624 },
    { name: "Aeneas", command: "1172;", number: 1172 },
    { name: "Phaethon", command: "3200;", number: 3200 },
];

const DWARF_BODIES = [
    { name: "Pluto", command: "999" },
    { name: "Haumea", command: "136108;" },
    { name: "Makemake", command: "136472;" },
    { name: "Eris", command: "136199;" },
];

const DAY_OFFSETS = [0, -50, 50, -3652.5, 3652.5];

const query = async (params) =>
{
    const search = new URLSearchParams({ format: "json", OBJ_DATA: "NO", MAKE_EPHEM: "YES" });
    for (const [key, value] of Object.entries(params))
    {
        search.set(key, `'${value}'`);
    }
    for (let attempt = 1; attempt <= 3; attempt++)
    {
        const response = await fetch(`${API}?${search}`);
        if (response.ok)
        {
            const json = await response.json();
            if (json.error)
            {
                throw new Error(`Horizons error for ${params.COMMAND}: ${json.error}`);
            }
            return json.result;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
    throw new Error(`Horizons request failed for ${params.COMMAND}`);
};

const csvRows = (result) =>
{
    const start = result.indexOf("$$SOE");
    const end = result.indexOf("$$EOE");
    if (start < 0 || end < 0)
    {
        throw new Error("no ephemeris block in Horizons result:\n" + result.slice(0, 2000));
    }
    return result
        .slice(start + 5, end)
        .trim()
        .split("\n")
        .map((line) => line.split(",").map((cell) => cell.trim()));
};

const common = {
    CENTER: "500@10",
    REF_PLANE: "ECLIPTIC",
    REF_SYSTEM: "ICRF",
    OUT_UNITS: "AU-D",
    CSV_FORMAT: "YES",
};

const main = async () =>
{
    const args = minimist(process.argv.slice(2), { string: ["epoch"] });
    if (!args.epoch || !/^\d{4}-\d{2}-\d{2}$/.test(args.epoch))
    {
        console.error("Usage: node tools/horizons-fixtures.mjs --epoch YYYY-MM-DD");
        process.exit(1);
    }
    const epochJd = astro.jdFromYyyymmdd(args.epoch.replaceAll("-", ""));
    const times = DAY_OFFSETS.map((offset) => epochJd + offset);

    const vectors = {
        source: "JPL Horizons API",
        generated: new Date().toISOString().slice(0, 10),
        frame: "heliocentric ecliptic J2000, AU",
        epochJd,
        dayOffsets: DAY_OFFSETS,
        bodies: {},
    };
    for (const body of VECTOR_BODIES)
    {
        const result = await query({
            ...common,
            COMMAND: body.command,
            EPHEM_TYPE: "VECTORS",
            VEC_TABLE: "1",
            TLIST: times.join(" "),
        });
        const samples = csvRows(result).map((row) => ({
            jd: Number(row[0]),
            position: [Number(row[2]), Number(row[3]), Number(row[4])],
        }));
        vectors.bodies[body.name] = { command: body.command, number: body.number, samples };
        console.log(`vectors: ${body.name} (${samples.length} samples)`);
    }

    const dwarfs = {
        source: "JPL Horizons API, osculating heliocentric ecliptic J2000 elements",
        generated: vectors.generated,
        epochJd,
        bodies: [],
    };
    for (const body of DWARF_BODIES)
    {
        const result = await query({
            ...common,
            COMMAND: body.command,
            EPHEM_TYPE: "ELEMENTS",
            TLIST: String(epochJd),
        });
        // JDTDB, Calendar, EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR
        const row = csvRows(result)[0];
        dwarfs.bodies.push({
            name: body.name,
            epochJd,
            a: Number(row[11]),
            e: Number(row[2]),
            i: Number(row[4]),
            w: Number(row[6]),
            O: Number(row[5]),
            M: Number(row[9]),
            source: "horizons",
        });
        console.log(`elements: ${body.name}`);
    }

    const vectorsPath = path.join(root, "tests", "fixtures", "horizons", "vectors.json");
    const dwarfsPath = path.join(root, "data", "dwarf-planets.json");
    fs.mkdirSync(path.dirname(vectorsPath), { recursive: true });
    fs.mkdirSync(path.dirname(dwarfsPath), { recursive: true });
    fs.writeFileSync(vectorsPath, JSON.stringify(vectors, null, 2) + "\n");
    fs.writeFileSync(dwarfsPath, JSON.stringify(dwarfs, null, 4) + "\n");
    console.log(`wrote ${path.relative(root, vectorsPath)} and ${path.relative(root, dwarfsPath)}`);
};

main().catch((error) =>
{
    console.error(error);
    process.exit(1);
});
