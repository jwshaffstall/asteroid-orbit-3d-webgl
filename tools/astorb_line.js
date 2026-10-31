// astorb_line.js
// Parse one record of Lowell's astorb.dat by documented column positions.
//
// Record format (astorb/astorb.txt, revised Jan 2018):
//   A6,1X,A18,1X,A15,1X,A5,1X,F5.2,1X,A4,1X,A5,1X,A4,1X,6I4,1X,2I5,1X,I4,2I2.2,1X,
//   3(F10.6,1X),F9.6,1X,F10.8,1X,F12.8, ...
// Since 2018, an inclination of 100 deg or more and a semimajor axis of 1000 AU or more take
// one more character, filling the separating space before them (for example
// "297.110640160.418505" is Omega then i). So i is read from columns 148-157 and a from
// 169-181, each including that optional leading space. The parser never depends on the total
// line length (the docs say 266 columns; the Oct 2026 file has 267).

// [start, end) as 0-based string offsets, from the 1-based Fortran columns.
var FIELDS = {
    number: [0, 6], // cols 1-6, blank if unnumbered
    designation: [7, 25], // cols 8-25, name or provisional designation
    absoluteMagnitude: [42, 47], // cols 43-47, H
    slope: [48, 53], // cols 49-53, G
    epoch: [106, 114], // cols 107-114, YYYYMMDD
    meanAnomaly: [115, 125], // cols 116-125
    argumentOfPerihelion: [126, 136], // cols 127-136
    longitudeOfAscendingNode: [137, 147], // cols 138-147
    inclination: [147, 157], // cols 148-157 (incl. optional leading space)
    eccentricity: [158, 168], // cols 159-168
    semimajorAxis: [168, 181], // cols 169-181 (incl. optional leading space)
};

var MINIMUM_LINE_LENGTH = FIELDS.semimajorAxis[1];

var field = function (line, name)
{
    var range = FIELDS[name];
    return line.slice(range[0], range[1]).trim();
};

// Strict decimal parse: rejects blanks and trailing junk that parseFloat would accept.
var parseNumber = function (text)
{
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text))
    {
        return NaN;
    }
    return Number(text);
};

// Returns { record } for a valid elliptic orbit, or { error, line } explaining the rejection.
function parseLine(rawLine)
{
    var line = String(rawLine).replace(/\r$/, "");
    if (line.trim() === "")
    {
        return { error: "blank line", line: line };
    }
    if (line.length < MINIMUM_LINE_LENGTH)
    {
        return { error: "line too short (" + line.length + " chars)", line: line };
    }

    var record = {
        number: field(line, "number") === "" ? null : Number(field(line, "number")),
        designation: field(line, "designation"),
        absoluteMagnitude: parseNumber(field(line, "absoluteMagnitude")),
        slope: parseNumber(field(line, "slope")),
        epoch: field(line, "epoch"),
        meanAnomaly: parseNumber(field(line, "meanAnomaly")),
        argumentOfPerihelion: parseNumber(field(line, "argumentOfPerihelion")),
        longitudeOfAscendingNode: parseNumber(field(line, "longitudeOfAscendingNode")),
        inclination: parseNumber(field(line, "inclination")),
        eccentricity: parseNumber(field(line, "eccentricity")),
        semimajorAxis: parseNumber(field(line, "semimajorAxis")),
    };

    if (record.number !== null && !Number.isInteger(record.number))
    {
        return { error: "bad asteroid number", line: line };
    }
    if (!/^\d{8}$/.test(record.epoch))
    {
        return { error: "bad epoch", line: line };
    }
    var orbitalFields = [
        "meanAnomaly",
        "argumentOfPerihelion",
        "longitudeOfAscendingNode",
        "inclination",
        "eccentricity",
        "semimajorAxis",
    ];
    for (var index = 0; index < orbitalFields.length; index++)
    {
        if (!Number.isFinite(record[orbitalFields[index]]))
        {
            return { error: "non-numeric " + orbitalFields[index], line: line };
        }
    }
    if (record.semimajorAxis <= 0)
    {
        return { error: "semimajor axis <= 0", line: line };
    }
    if (record.eccentricity < 0 || record.eccentricity >= 1)
    {
        return { error: "not elliptic (e >= 1)", line: line };
    }
    if (record.inclination < 0 || record.inclination > 180)
    {
        return { error: "inclination out of range", line: line };
    }

    return { record: record };
}

exports.FIELDS = FIELDS;
exports.parseLine = parseLine;
// Backwards-compatible shape used by older callers: the record, or null.
exports.parse = function (line)
{
    return parseLine(line).record || null;
};
