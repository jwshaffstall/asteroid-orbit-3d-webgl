// astorb2bin.js
// astorb3d
// by John Shaffstall
// Tuesday, October 15, 2013

var fileSystem = require("fs");
var readline = require("readline");
var buffer = require("buffer");
var stream = require('stream');
var assert = require("assert");
var astorb_line = require("./astorb_line.js");

var args = require("optimist")
    .usage("Usage: $0")
    .alias("i", "input")
    .describe("i", "path/to/astorb.dat")
    .alias("o", "output")
    .describe("o", "path/to/output.file")
    .demand(["i", "o"])
    .argv;

var inputFilePath = args.input;
var outputFilePath = args.output;

assert(inputFilePath, "invalid input path");
assert(outputFilePath, "invalid output path")

if (!fileSystem.existsSync(inputFilePath))
{
    console.error("input path does not exist: %s", inputFilePath);
    process.exit(1);
}

console.log("file found at input path: %s", inputFilePath);

var inputFileStats = fileSystem.statSync(inputFilePath);
if (!inputFileStats.isFile())
{
    console.error("input path is not a file: %s", inputFilePath);
    process.exit(1);
}

console.dir(inputFileStats);
var inputFileSize = inputFileStats.size;
console.log("input file size = %d MB", (inputFileSize / (1024.0 * 1024.0)).toFixed(2) );

var inputFileStream = fileSystem.createReadStream(inputFilePath);
var outputFileStream = process.stdout;
var astorbLines = readline.createInterface(inputFileStream, outputFileStream);

var asteroids = [];
var totalEccentricity = 0.0;

astorbLines.on("line", function(line)
{
    var asteroid = astorb_line.parse(line);
    if (asteroid)
    {
        asteroids.push(asteroid);
        totalEccentricity += asteroid.eccentricity;
    }
    else
    {
        console.log("unable to parse line: '%s'", line);
    }
});

function writeAsteroidsBinaryFile(filePath, asteroids)
{
    var asteroidCount = asteroids.length;
    var asteroidFloatCount = 6;
    var bytesPerFloat = 4;

    var byteCount = asteroidCount * asteroidFloatCount * bytesPerFloat;
    var asteroidBuffer = new buffer.Buffer(byteCount);

    for (var asteroidIndex in asteroids)
    {
        var byteOffset = asteroidIndex * asteroidFloatCount * bytesPerFloat;

        var asteroid = asteroids[asteroidIndex];

        asteroidBuffer.writeFloatLE(asteroid.meanAnomaly, byteOffset + 0);
        asteroidBuffer.writeFloatLE(asteroid.argumentOfPerihelion, byteOffset + 4);
        asteroidBuffer.writeFloatLE(asteroid.longitudeOfAscendingNode, byteOffset + 8);
        asteroidBuffer.writeFloatLE(asteroid.inclination, byteOffset + 12);
        asteroidBuffer.writeFloatLE(asteroid.eccentricity, byteOffset + 16);
        asteroidBuffer.writeFloatLE(asteroid.semimajorAxis, byteOffset + 20);
    }

    fileSystem.writeFile(filePath, asteroidBuffer, function(error)
    {
        if (error)
        {
            console.error("error writing asteroids binary file: " + error);
        }
        else
        {
            console.log("no errors writing asteroids binary file");
        }
    });
}

astorbLines.on("close", function()
{
    var asteroidCount = asteroids.length;
    console.log("asteroid count = %d", asteroidCount);

    var averageEccentricity = totalEccentricity / asteroidCount;
    console.log("average eccentricity = %d", averageEccentricity.toFixed(5));

    writeAsteroidsBinaryFile(outputFilePath, asteroids);
});

