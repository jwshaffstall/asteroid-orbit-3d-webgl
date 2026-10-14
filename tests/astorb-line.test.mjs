import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const astorbLine = require("../tools/astorb_line.js");

// Field layout mirrors tools/astorb_line.js (0-based [start, start + width)).
const LINE_LENGTH = 267;
const FIELD_COLUMNS = {
    meanAnomaly: [115, 10],
    argumentOfPerihelion: [126, 10],
    longitudeOfAscendingNode: [137, 10],
    inclination: [148, 9],
    eccentricity: [158, 10],
    semimajorAxis: [169, 12],
};

function makeAstorbLine(fields)
{
    const chars = Array.from({ length: LINE_LENGTH }, () => " ");
    for (const [name, [start, width]] of Object.entries(FIELD_COLUMNS))
    {
        const text = String(fields[name]);
        for (let i = 0; i < text.length && i < width; i++)
        {
            chars[start + i] = text[i];
        }
    }
    return chars.join("");
}

test("parse extracts the six orbital elements from a valid 267-char line", () =>
{
    const fields = {
        meanAnomaly: "123.456789",
        argumentOfPerihelion: "45.678912",
        longitudeOfAscendingNode: "210.123456",
        inclination: "10.54321",
        eccentricity: "0.123456",
        semimajorAxis: "2.76751234",
    };
    const asteroid = astorbLine.parse(makeAstorbLine(fields));

    assert.ok(asteroid);
    assert.equal(asteroid.meanAnomaly, Number(fields.meanAnomaly));
    assert.equal(asteroid.argumentOfPerihelion, Number(fields.argumentOfPerihelion));
    assert.equal(asteroid.longitudeOfAscendingNode, Number(fields.longitudeOfAscendingNode));
    assert.equal(asteroid.inclination, Number(fields.inclination));
    assert.equal(asteroid.eccentricity, Number(fields.eccentricity));
    assert.equal(asteroid.semimajorAxis, Number(fields.semimajorAxis));
});

test("parse tolerates fields padded with whitespace", () =>
{
    const line = makeAstorbLine({
        meanAnomaly: "  12.5",
        argumentOfPerihelion: "  200.25",
        longitudeOfAscendingNode: "300.75  ",
        inclination: " 5.5",
        eccentricity: " 0.05",
        semimajorAxis: "  3.1",
    });
    const asteroid = astorbLine.parse(line);

    assert.ok(asteroid);
    assert.equal(asteroid.meanAnomaly, 12.5);
    assert.equal(asteroid.eccentricity, 0.05);
    assert.equal(asteroid.semimajorAxis, 3.1);
});

test("parse returns null for lines that are not 267 characters", () =>
{
    const valid = makeAstorbLine({
        meanAnomaly: "1",
        argumentOfPerihelion: "2",
        longitudeOfAscendingNode: "3",
        inclination: "4",
        eccentricity: "0.1",
        semimajorAxis: "2.5",
    });

    assert.equal(astorbLine.parse(valid.slice(0, LINE_LENGTH - 1)), null);
    assert.equal(astorbLine.parse(valid + " "), null);
    assert.equal(astorbLine.parse(""), null);
});
