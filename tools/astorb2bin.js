// astorb2bin.js
// Convert a Lowell astorb.dat snapshot (plain or .gz) into the v1 dataset:
//   <output>.bin        Float32 LE, 6 floats per record: M, w, Omega, i, e, a (unchanged v1 layout)
//   <output>.meta.json  epoch, record count, source checksum, class counts, body elements
//   <output>.rejected.json  rejection report (counts and sample rows per reason)
//
// Usage: node tools/astorb2bin.js -i temp/2026-10-30-astorb.dat -o temp/astorb3d.bin
//        [--snapshot-date 2026-10-30] [--dwarfs data/dwarf-planets.json] [--source-url URL]

var fileSystem = require("fs");
var path = require("path");
var readline = require("readline");
var zlib = require("zlib");
var nodeCrypto = require("crypto");
var minimist = require("minimist");
var astorbLine = require("./astorb_line.js");
var classify = require("./classify.js");
var astro = require("../scripts/js/astorb-astro.js");

var CONVERTER_VERSION = "1.1.0";
var FLOATS_PER_RECORD = 6;
var BYTES_PER_RECORD = FLOATS_PER_RECORD * 4;
var MAX_SAMPLES_PER_REASON = 10;
// Records whose own epoch is further than this from the dataset epoch are rejected rather
// than propagated: two-body propagation over decades would not be faithful.
var MAX_PROPAGATION_DAYS = 3650;

function printUsage(exitCode) {
    console.log("Usage: node tools/astorb2bin.js -i path/to/astorb.dat[.gz] -o path/to/output.bin");
    console.log("");
    console.log("Options:");
    console.log("  -i, --input         astorb.dat or astorb.dat.gz (required)");
    console.log("  -o, --output        output .bin path (required); .meta.json and");
    console.log("                      .rejected.json are written next to it");
    console.log("  --snapshot-date     YYYY-MM-DD the snapshot was downloaded (default: from");
    console.log("                      a YYYY-MM-DD prefix in the input file name)");
    console.log("  --source-url        where the snapshot came from");
    console.log("  --dwarfs            JSON of dwarf-planet elements at the epoch (from");
    console.log(
        "                      tools/horizons-fixtures.mjs); default data/dwarf-planets.json"
    );
    console.log("  -h, --help          show this help");
    process.exit(typeof exitCode === "number" ? exitCode : 1);
}

// Growable Float32Array / Float64Array without holding millions of JS objects.
function createGrowable(TypedArray, initialLength) {
    var array = new TypedArray(initialLength);
    var length = 0;
    return {
        push: function (value) {
            if (length === array.length) {
                var grown = new TypedArray(array.length * 2);
                grown.set(array);
                array = grown;
            }
            array[length++] = value;
        },
        get length() {
            return length;
        },
        view: function () {
            return array.subarray(0, length);
        },
    };
}

function sha256File(filePath) {
    return new Promise(function (resolve, reject) {
        var hash = nodeCrypto.createHash("sha256");
        fileSystem
            .createReadStream(filePath)
            .on("data", function (chunk) {
                hash.update(chunk);
            })
            .on("error", reject)
            .on("end", function () {
                resolve(hash.digest("hex"));
            });
    });
}

function snapshotDateFromName(filePath) {
    var match = /(\d{4}-\d{2}-\d{2})/.exec(path.basename(filePath));
    return match ? match[1] : null;
}

function bodyElements(record, epochJd) {
    return {
        name: record.designation,
        number: record.number,
        epochJd: epochJd,
        a: record.semimajorAxis,
        e: record.eccentricity,
        i: record.inclination,
        w: record.argumentOfPerihelion,
        O: record.longitudeOfAscendingNode,
        M: record.meanAnomaly,
        source: "catalog",
    };
}

async function convert(options) {
    var inputPath = options.input;
    var outputPath = options.output;
    var stats = fileSystem.statSync(inputPath);
    if (!stats.isFile()) {
        throw new Error("input path is not a file: " + inputPath);
    }
    console.log("input: %s (%s MB)", inputPath, (stats.size / 1048576).toFixed(1));
    var sourceSha256 = await sha256File(inputPath);
    console.log("sha256: %s", sourceSha256);

    var stream = fileSystem.createReadStream(inputPath);
    if (/\.gz$/i.test(inputPath)) {
        stream = stream.pipe(zlib.createGunzip());
    }
    var lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

    var initial = Math.max(1024, Math.ceil(stats.size / 267) + 16);
    var floats = createGrowable(Float32Array, initial * FLOATS_PER_RECORD);
    var meanAnomalies = createGrowable(Float64Array, initial);
    var semimajorAxes = createGrowable(Float64Array, initial);
    var epochs = createGrowable(Float64Array, initial);
    var rejected = {};
    var epochCounts = {};
    var catalogBodies = {};
    var lineCount = 0;

    var reject = function (reason, line) {
        var entry = rejected[reason] || (rejected[reason] = { count: 0, samples: [] });
        entry.count++;
        if (entry.samples.length < MAX_SAMPLES_PER_REASON) {
            entry.samples.push(line);
        }
    };

    for await (var line of lines) {
        lineCount++;
        var result = astorbLine.parseLine(line);
        if (!result.record) {
            reject(result.error, result.line);
            continue;
        }
        var record = result.record;
        var epochJd = astro.jdFromYyyymmdd(record.epoch);
        epochCounts[record.epoch] = (epochCounts[record.epoch] || 0) + 1;
        if (record.number === 1 || record.number === 2 || record.number === 4) {
            catalogBodies[record.number] = record;
        }
        floats.push(record.meanAnomaly);
        floats.push(record.argumentOfPerihelion);
        floats.push(record.longitudeOfAscendingNode);
        floats.push(record.inclination);
        floats.push(record.eccentricity);
        floats.push(record.semimajorAxis);
        meanAnomalies.push(record.meanAnomaly);
        semimajorAxes.push(record.semimajorAxis);
        epochs.push(epochJd);
    }

    // The dataset epoch is the epoch shared by the most records (Lowell: all of them).
    var epochKeys = Object.keys(epochCounts);
    if (epochKeys.length === 0) {
        throw new Error("no valid records in " + inputPath);
    }
    var datasetEpoch = epochKeys.reduce(function (best, key) {
        return epochCounts[key] > epochCounts[best] ? key : best;
    });
    var datasetEpochJd = astro.jdFromYyyymmdd(datasetEpoch);
    if (epochKeys.length > 1) {
        console.warn(
            "warning: %d distinct epochs; dataset epoch %s",
            epochKeys.length,
            datasetEpoch
        );
    }

    // Propagate any record with a different epoch to the dataset epoch: M <- M + n * dt.
    var allFloats = floats.view();
    var allEpochs = epochs.view();
    var propagated = 0;
    var maxPropagationDays = 0;
    var keep = new Uint8Array(allEpochs.length).fill(1);
    for (var index = 0; index < allEpochs.length; index++) {
        var deltaDays = datasetEpochJd - allEpochs[index];
        if (deltaDays === 0) {
            continue;
        }
        if (Math.abs(deltaDays) > MAX_PROPAGATION_DAYS) {
            keep[index] = 0;
            reject(
                "epoch more than " + MAX_PROPAGATION_DAYS + " days from dataset epoch",
                "#" + index
            );
            continue;
        }
        var a = semimajorAxes.view()[index];
        var meanMotionDegPerDay =
            Math.sqrt(astro.MU_SUN_AU3_PER_DAY2 / (a * a * a)) * astro.RAD2DEG;
        var propagatedM = astro.wrapDegrees(
            meanAnomalies.view()[index] + meanMotionDegPerDay * deltaDays
        );
        allFloats[index * FLOATS_PER_RECORD] = propagatedM;
        propagated++;
        maxPropagationDays = Math.max(maxPropagationDays, Math.abs(deltaDays));
    }

    var keptCount = 0;
    for (var k = 0; k < keep.length; k++) {
        keptCount += keep[k];
    }
    var output = new Float32Array(keptCount * FLOATS_PER_RECORD);
    var classCounts = {};
    classify.CLASS_NAMES.forEach(function (name) {
        classCounts[name] = 0;
    });
    var cursor = 0;
    for (var r = 0; r < keep.length; r++) {
        if (!keep[r]) {
            continue;
        }
        var base = r * FLOATS_PER_RECORD;
        var values = allFloats.subarray(base, base + FLOATS_PER_RECORD);
        // Every value must survive the float32 conversion as a finite number.
        for (var f = 0; f < FLOATS_PER_RECORD; f++) {
            if (!Number.isFinite(values[f])) {
                throw new Error("non-finite value in record " + r);
            }
        }
        output.set(values, cursor * FLOATS_PER_RECORD);
        var classCode = classify.classify(
            {
                meanAnomaly: values[0],
                argumentOfPerihelion: values[1],
                longitudeOfAscendingNode: values[2],
                inclination: values[3],
                eccentricity: values[4],
                semimajorAxis: values[5],
            },
            datasetEpochJd
        );
        classCounts[classify.CLASS_NAMES[classCode]]++;
        cursor++;
    }

    var bytes = Buffer.from(output.buffer, output.byteOffset, output.byteLength);
    if (bytes.length % BYTES_PER_RECORD !== 0 || bytes.length / BYTES_PER_RECORD !== keptCount) {
        throw new Error("output byte length is not a whole number of records");
    }

    var outputBase = outputPath.replace(/\.bin$/i, "");
    var metaPath = outputBase + ".meta.json";
    var rejectedPath = outputBase + ".rejected.json";

    var bodies = {};
    [1, 2, 4].forEach(function (number) {
        if (catalogBodies[number]) {
            var body = bodyElements(catalogBodies[number], datasetEpochJd);
            bodies[body.name] = body;
        }
    });
    if (options.dwarfs && fileSystem.existsSync(options.dwarfs)) {
        var dwarfs = JSON.parse(fileSystem.readFileSync(options.dwarfs, "utf8"));
        if (Math.abs(dwarfs.epochJd - datasetEpochJd) > 1e-6) {
            console.warn(
                "warning: %s is for JD %s, not the dataset epoch %s; regenerate it with " +
                    "tools/horizons-fixtures.mjs --epoch %s",
                options.dwarfs,
                dwarfs.epochJd,
                datasetEpochJd,
                datasetEpoch
            );
        } else {
            dwarfs.bodies.forEach(function (body) {
                bodies[body.name] = body;
            });
        }
    }

    var rejectedTotal = Object.keys(rejected).reduce(function (sum, key) {
        return sum + rejected[key].count;
    }, 0);

    var meta = {
        format: "astorb3d-v1",
        converterVersion: CONVERTER_VERSION,
        recordLayout: {
            endianness: "little",
            bytesPerRecord: BYTES_PER_RECORD,
            fields: ["M_deg", "w_deg", "Omega_deg", "i_deg", "e", "a_AU"],
        },
        recordCount: keptCount,
        epoch: astro.isoDateFromJd(datasetEpochJd),
        epochJd: datasetEpochJd,
        referenceFrame: "ecliptic-J2000",
        snapshot: {
            catalog: "Lowell astorb",
            date: options.snapshotDate || null,
            url: options.sourceUrl || "https://ftp.lowell.edu/pub/elgb/astorb.dat.gz",
            file: path.basename(inputPath),
            bytes: stats.size,
            sha256: sourceSha256,
        },
        lines: lineCount,
        rejected: rejectedTotal,
        propagated: { count: propagated, maxDays: maxPropagationDays },
        classCounts: classCounts,
        bodies: bodies,
    };

    fileSystem.writeFileSync(outputPath, bytes);
    fileSystem.writeFileSync(metaPath, JSON.stringify(meta, null, 4) + "\n");
    fileSystem.writeFileSync(
        rejectedPath,
        JSON.stringify({ total: rejectedTotal, reasons: rejected }, null, 4) + "\n"
    );

    console.log(
        "records: %d written, %d rejected, %d propagated",
        keptCount,
        rejectedTotal,
        propagated
    );
    console.log("epoch: %s (JD %s)", meta.epoch, datasetEpochJd);
    console.log("wrote %s (%d bytes), %s, %s", outputPath, bytes.length, metaPath, rejectedPath);
    return meta;
}

if (require.main === module) {
    var args = minimist(process.argv.slice(2), {
        alias: { i: "input", o: "output", h: "help" },
        string: ["input", "output", "snapshot-date", "source-url", "dwarfs"],
        boolean: ["help"],
        default: { dwarfs: path.join(__dirname, "..", "data", "dwarf-planets.json") },
        unknown: function (arg) {
            if (arg && arg[0] === "-") {
                console.error("Unknown option: %s", arg);
                printUsage(1);
                return false;
            }
            return true;
        },
    });
    if (args.help) {
        printUsage(0);
    }
    if (!args.input || !args.output) {
        printUsage(1);
    }
    if (!fileSystem.existsSync(args.input)) {
        console.error("input path does not exist: %s", args.input);
        process.exit(1);
    }
    convert({
        input: args.input,
        output: args.output,
        snapshotDate: args["snapshot-date"] || snapshotDateFromName(args.input),
        sourceUrl: args["source-url"],
        dwarfs: args.dwarfs,
    }).catch(function (error) {
        console.error(error);
        process.exit(1);
    });
}

exports.convert = convert;
exports.CONVERTER_VERSION = CONVERTER_VERSION;
