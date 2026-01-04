// astorb_line.js
// astorb3d
// by John W. Shaffstall
// Tuesday, October 15, 2013

var AstorbLineLength = 267;

function parse_line(line)
{
    var asteroid = null;

    var lineLength = line.length;
    if (lineLength != AstorbLineLength)
    {
        console.log("astorb line is not 255 characters: %d", lineLength);
    }
    else
    {
        // MeanAnomaly = ([115, 125], "deg", "J2000.0")
        // ArgumentOfPerihelion = ([126, 136], "deg", "J2000.0")
        // LongitudeOfAscendingNode = ([137, 147], "deg", "J2000.0")
        // Inclination = ([148, 157], "deg", "J2000.0")
        // Eccentricity = ([158, 168], "", "")
        // SemimajorAxis = ([169, 181], "AU", "")

        var meanAnomaly = parseFloat(line.substr(115, 125-115));
        var argumentOfPerihelion = parseFloat(line.substr(126, 136-126));
        var longitudeOfAscendingNode = parseFloat(line.substr(137, 147-137));
        var inclination = parseFloat(line.substr(148, 157-148));
        var eccentricity = parseFloat(line.substr(158, 168-158));
        var semimajorAxis = parseFloat(line.substr(169, 181-169));

        asteroid =
        {
            meanAnomaly : meanAnomaly,
            argumentOfPerihelion : argumentOfPerihelion,
            longitudeOfAscendingNode : longitudeOfAscendingNode,
            inclination : inclination,
            eccentricity : eccentricity,
            semimajorAxis : semimajorAxis
        };
    }

    return asteroid;
}

exports.parse = parse_line;
