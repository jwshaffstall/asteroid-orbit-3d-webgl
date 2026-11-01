// classify.js
// Dynamical class of an asteroid from its orbital elements.
//
// Boundaries follow the JPL Small-Body Database orbit-class definitions
// (https://ssd.jpl.nasa.gov/sb/orbits.html) where JPL defines them. JPL has no Hungaria or
// Hilda class, so those use documented a / e / i boxes. Overlaps are resolved by precedence:
// each record gets the FIRST class that matches, in the order of CLASS_ORDER below
// (planet-crossers first, then the resonant groups, then the generic belt classes).

var astro = require("../scripts/js/astorb-astro.js");

// Index = the 4-bit class code stored in dataset v2 records. Never reorder; append only.
var CLASS_NAMES = [
    "Atira",
    "Aten",
    "Apollo",
    "Amor",
    "Mars-crosser",
    "Hungaria",
    "Inner main belt",
    "Middle main belt",
    "Outer main belt",
    "Hilda",
    "Trojan L4",
    "Trojan L5",
    "Centaur",
    "TNO",
    "Other",
    "Reserved",
];

var CLASS = {};
CLASS_NAMES.forEach(function (name, index) {
    CLASS[name] = index;
});

// Precedence order (first match wins).
var CLASS_ORDER = [
    "Atira",
    "Aten",
    "Apollo",
    "Amor",
    "Mars-crosser",
    "Trojan",
    "Hilda",
    "Hungaria",
    "Inner main belt",
    "Middle main belt",
    "Outer main belt",
    "Centaur",
    "TNO",
];

// Test for each class in CLASS_ORDER; o = { a, e, i, q, Q } (AU, degrees).
var RULES = {
    Atira: function (o) {
        return o.a < 1.0 && o.Q < 0.983;
    },
    Aten: function (o) {
        return o.a < 1.0 && o.Q >= 0.983;
    },
    Apollo: function (o) {
        return o.a >= 1.0 && o.q < 1.017;
    },
    Amor: function (o) {
        return o.a >= 1.0 && o.q >= 1.017 && o.q < 1.3;
    },
    "Mars-crosser": function (o) {
        return o.q >= 1.3 && o.q < 1.666 && o.a < 3.2;
    },
    Trojan: function (o) {
        return o.a > 4.6 && o.a < 5.5 && o.e < 0.3;
    },
    // Hilda group (3:2 resonance with Jupiter).
    Hilda: function (o) {
        return o.a > 3.7 && o.a < 4.2 && o.e < 0.3 && o.i < 20;
    },
    // Hungaria group (inside the main belt's inner edge, high inclination).
    Hungaria: function (o) {
        return o.a > 1.78 && o.a < 2.06 && o.e < 0.18 && o.i > 16 && o.i < 34;
    },
    "Inner main belt": function (o) {
        return o.a < 2.0 && o.q >= 1.666;
    },
    "Middle main belt": function (o) {
        return o.a >= 2.0 && o.a < 3.2 && o.q >= 1.666;
    },
    "Outer main belt": function (o) {
        return o.a >= 3.2 && o.a < 4.6;
    },
    Centaur: function (o) {
        return o.a >= 5.5 && o.a < 30.1;
    },
    TNO: function (o) {
        return o.a >= 30.1;
    },
};

// Mean longitude difference from Jupiter at the given Julian Date, in (-180, 180] degrees.
// Positive means the object leads Jupiter (L4); negative means it trails (L5).
var longitudeFromJupiter = function (elements, jd) {
    var jupiter = astro.planetElementsAt("Jupiter", jd);
    var lambdaJupiter = jupiter.O + jupiter.w + jupiter.M;
    var lambda =
        elements.longitudeOfAscendingNode + elements.argumentOfPerihelion + elements.meanAnomaly;
    var difference = astro.wrapDegrees(lambda - lambdaJupiter);
    return difference > 180 ? difference - 360 : difference;
};

// elements: a parsed astorb record (see astorb_line.js); jd: the epoch as a Julian Date.
// Returns the class code (index into CLASS_NAMES).
function classify(elements, jd) {
    var a = elements.semimajorAxis;
    var e = elements.eccentricity;
    var orbit = { a: a, e: e, i: elements.inclination, q: a * (1 - e), Q: a * (1 + e) };
    for (var index = 0; index < CLASS_ORDER.length; index++) {
        var name = CLASS_ORDER[index];
        if (RULES[name](orbit)) {
            if (name === "Trojan") {
                return longitudeFromJupiter(elements, jd) > 0
                    ? CLASS["Trojan L4"]
                    : CLASS["Trojan L5"];
            }
            return CLASS[name];
        }
    }
    return CLASS.Other;
}

exports.CLASS_NAMES = CLASS_NAMES;
exports.CLASS = CLASS;
exports.classify = classify;
exports.longitudeFromJupiter = longitudeFromJupiter;
