// build-fixture.js
// Build the deterministic ~20,000-record fixture dataset used by PR CI and browser tests:
// every record of the rare dynamical classes (up to a cap), then evenly spaced records of the
// common ones, in catalog order. No randomness, so the same snapshot always gives the same file.
//
// Usage: node tools/build-fixture.js -i temp/2026-10-30-astorb.dat -o tests/fixtures/astorb-fixture.bin

var fileSystem = require("fs");
var os = require("os");
var path = require("path");
var readline = require("readline");
var zlib = require("zlib");
var minimist = require("minimist");
var astorbLine = require("./astorb_line.js");
var classify = require("./classify.js");
var astro = require("../scripts/js/astorb-astro.js");
var converter = require("./astorb2bin.js");

var TARGET_RECORDS = 20000;
var PER_CLASS_CAP = 1500;

async function readLines(inputPath) {
    var stream = fileSystem.createReadStream(inputPath);
    if (/\.gz$/i.test(inputPath)) {
        stream = stream.pipe(zlib.createGunzip());
    }
    var lines = [];
    var classes = [];
    var reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (var line of reader) {
        var result = astorbLine.parseLine(line);
        if (!result.record) {
            continue;
        }
        lines.push(line);
        classes.push(classify.classify(result.record, astro.jdFromYyyymmdd(result.record.epoch)));
    }
    return { lines: lines, classes: classes };
}

async function main() {
    var args = minimist(process.argv.slice(2), { alias: { i: "input", o: "output" } });
    if (!args.input || !args.output) {
        console.error(
            "Usage: node tools/build-fixture.js -i astorb.dat -o tests/fixtures/astorb-fixture.bin"
        );
        process.exit(1);
    }
    var data = await readLines(args.input);
    var byClass = {};
    data.classes.forEach(function (code, index) {
        (byClass[code] = byClass[code] || []).push(index);
    });

    // Quota per class: everything up to the cap; the remainder of the target goes to the
    // classes that hit the cap, in proportion to their size.
    var codes = Object.keys(byClass).map(Number);
    var quota = {};
    var used = 0;
    var capped = [];
    codes.forEach(function (code) {
        var size = byClass[code].length;
        quota[code] = Math.min(size, PER_CLASS_CAP);
        used += quota[code];
        if (size > PER_CLASS_CAP) {
            capped.push(code);
        }
    });
    var cappedTotal = capped.reduce(function (sum, code) {
        return sum + byClass[code].length;
    }, 0);
    var remaining = Math.max(0, TARGET_RECORDS - used);
    capped.forEach(function (code) {
        var extra = Math.floor((remaining * byClass[code].length) / cappedTotal);
        quota[code] = Math.min(byClass[code].length, quota[code] + extra);
    });

    var selected = [];
    codes.forEach(function (code) {
        var members = byClass[code];
        var take = quota[code];
        for (var k = 0; k < take; k++) {
            selected.push(members[Math.floor((k * members.length) / take)]);
        }
    });
    selected.sort(function (x, y) {
        return x - y;
    });

    var temporary = path.join(os.tmpdir(), "astorb3d-fixture-" + process.pid + ".dat");
    fileSystem.writeFileSync(
        temporary,
        selected
            .map(function (index) {
                return data.lines[index];
            })
            .join("\n") + "\n"
    );
    try {
        await converter.convert({
            input: temporary,
            output: args.output,
            snapshotDate: args["snapshot-date"] || null,
            dwarfs: path.join(__dirname, "..", "data", "dwarf-planets.json"),
        });
    } finally {
        fileSystem.unlinkSync(temporary);
    }
    // The fixture is derived data; record what it was sampled from.
    var metaPath = args.output.replace(/\.bin$/i, "") + ".meta.json";
    var meta = JSON.parse(fileSystem.readFileSync(metaPath, "utf8"));
    meta.fixture = {
        sampledFrom: path.basename(args.input),
        targetRecords: TARGET_RECORDS,
        perClassCap: PER_CLASS_CAP,
    };
    meta.snapshot.file = path.basename(args.input) + " (sampled)";
    fileSystem.writeFileSync(metaPath, JSON.stringify(meta, null, 4) + "\n");
    // A sample has no rejections worth keeping; the full build's report is the audit trail.
    fileSystem.rmSync(args.output.replace(/\.bin$/i, "") + ".rejected.json", { force: true });
}

main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
