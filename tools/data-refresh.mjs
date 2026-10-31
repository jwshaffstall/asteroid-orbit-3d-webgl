// data-refresh.mjs
// Manual data refresh, run whenever the owner chooses (there is no scheduled job):
//   fetch the latest Lowell catalog -> build the dataset -> fetch Horizons fixtures for its
//   epoch -> rebuild with dwarf-planet elements -> validate -> print a summary and the command
//   that archives the snapshot as a GitHub release asset.
//
// Usage: npm run data:refresh            (download a new snapshot)
//        npm run data:refresh -- --input temp/2026-10-30-astorb.dat   (rebuild from a file)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { fetchCatalog, recordSnapshot, sha256File, LOWELL_URL } from "./fetch-catalog.mjs";

const require = createRequire(import.meta.url);
const minimist = require("minimist");
const converter = require("./astorb2bin.js");
const astro = require("../scripts/js/astorb-astro.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(root, "temp", "astorb3d.bin");
const META = path.join(root, "temp", "astorb3d.meta.json");
const DWARFS = path.join(root, "data", "dwarf-planets.json");

const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: "inherit" });

const main = async () =>
{
    const args = minimist(process.argv.slice(2), { string: ["input", "snapshot-date"] });
    const previous = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, "utf8")) : null;

    let input = args.input ? path.resolve(args.input) : null;
    let snapshotDate = args["snapshot-date"] || null;
    if (!input)
    {
        const snapshot = await fetchCatalog();
        input = snapshot.file;
        snapshotDate = snapshot.date;
    }
    snapshotDate = snapshotDate || (/(\d{4}-\d{2}-\d{2})/.exec(path.basename(input)) || [])[1];
    if (!snapshotDate)
    {
        throw new Error("pass --snapshot-date YYYY-MM-DD (it isn't in the file name)");
    }

    // First pass finds the epoch; then fetch Horizons data for it and build again.
    let meta = await converter.convert({ input, output: OUTPUT, snapshotDate, dwarfs: null });
    run(process.execPath, [path.join("tools", "horizons-fixtures.mjs"), "--epoch", meta.epoch]);
    meta = await converter.convert({ input, output: OUTPUT, snapshotDate, dwarfs: DWARFS });

    // Validation.
    const problems = [];
    const snapshotJd = astro.jdFromYyyymmdd(snapshotDate.replaceAll("-", ""));
    // Lowell's epoch is the JD ending in 00.5 nearest the file date (100-day steps).
    if (Math.abs(meta.epochJd - snapshotJd) > 50)
    {
        problems.push(`epoch ${meta.epoch} is more than 50 days from snapshot ${snapshotDate}`);
    }
    if (previous && Math.abs(meta.recordCount / previous.recordCount - 1) > 0.05)
    {
        problems.push(
            `record count changed by more than 5% (${previous.recordCount} -> ${meta.recordCount})`
        );
    }
    if (meta.rejected > meta.recordCount * 0.001)
    {
        problems.push(`${meta.rejected} rejected records (see temp/astorb3d.rejected.json)`);
    }

    recordSnapshot({
        date: snapshotDate,
        catalog: "Lowell astorb",
        url: LOWELL_URL,
        file: path.basename(input),
        bytes: fs.statSync(input).size,
        sha256: await sha256File(input),
        records: meta.recordCount,
        epoch: meta.epoch,
        releaseAsset: `data-lowell-${snapshotDate.replaceAll("-", "")}`,
        archived: false,
    });

    console.log("\nRunning the accuracy tests against the new epoch...");
    run(process.execPath, ["--test", "tests/astorb-accuracy.test.mjs"]);

    console.log("\nSummary");
    console.log(`  snapshot  ${snapshotDate} (${path.basename(input)})`);
    console.log(`  epoch     ${meta.epoch}`);
    console.log(
        `  records   ${meta.recordCount}` +
            (previous ? ` (was ${previous.recordCount}, epoch ${previous.epoch})` : "")
    );
    console.log(`  rejected  ${meta.rejected}`);
    if (problems.length)
    {
        console.log("\nValidation problems:\n  - " + problems.join("\n  - "));
        process.exitCode = 1;
    }
    const gz = input.endsWith(".gz") ? input : `${input}.gz`;
    console.log("\nTo archive the snapshot (needs a .gz copy):");
    if (!input.endsWith(".gz"))
    {
        console.log(`  gzip -9 -n -k ${path.relative(root, input)}`);
    }
    const tag = `data-lowell-${snapshotDate.replaceAll("-", "")}`;
    console.log(
        `  gh release create ${tag} ${path.relative(root, gz)} --title "Lowell astorb snapshot ${snapshotDate}" --notes "Raw source snapshot; see data/manifest.source.json"`
    );
    console.log('  then set "archived": true for this snapshot in data/manifest.source.json');
};

main().catch((error) =>
{
    console.error(error.message || error);
    process.exit(1);
});
