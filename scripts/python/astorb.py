#!usr/bin/env python

from mmap import mmap
import os
from os import path
import datetime

"""
(13)Mean anomaly, deg.
(14)Argument of perihelion, deg (J2000.0).
(15)Longitude of ascending node, deg (J2000.0).
(16)Inclination, deg (J2000.0).
(17)Eccentricity.
(18)Semimajor axis, AU.
"""

class AstorbIdentifier:
    Identifier = ([7, 26], "", "")

    def __init__(self):
        pass


class AstorbEpoch:

    J2000 = datetime.datetime(2000, 1, 1, 12, 0, 0)

    def __init__(self, line):
        year = 0
        month = 0
        day = 0

        date = datetime.datetime(year, month, day, 12, 0, 0)
        dateSinceJ2000 = date - AstorbEpoch.J2000

        self.date = date
        self.dateSinceJ2000 = dateSinceJ2000

class AstorbOrbitalElements:
    MeanAnomaly = ([115, 125], "deg", "J2000.0")
    ArgumentOfPerihelion = ([126, 136], "deg", "J2000.0")
    LongitudeOfAscendingNode = ([137, 147], "deg", "J2000.0")
    Inclination = ([148, 157], "deg", "J2000.0")
    Eccentricity = ([158, 168], "", "")
    SemimajorAxis = ([169, 181], "AU", "")

    def __init__(self, line):
        assert AstorbLine.IsValid(line),\
            "invalid astorb line: %s" %(line)


class AstorbLine:
    CharacterCount = 268

    @staticmethod
    def IsValid(line):
        lineCharacterCount = len(line)
        isValid = lineCharacterCount == AstorbLine.CharacterCount
        return isValid

    def __init__(self, line):
        lineCharacterCount = len(line)
        assert lineCharacterCount == AstorbLine.CharacterCount,\
            "astorb line character count is not %d: %s"\
            %(AstorbLine.CharacterCount, lineCharacterCount)


def ValidateAstorb(astorbFilePath):
    assert path.isfile(astorbFilePath),\
        "could not find astorb file: %s" %(astorbFilePath)

    lineCount = 0
    validLineCount = 0
    invalidLineCount = 0

    with open(astorbFilePath, "rb") as astorbFile:
        # mappedAstorbFile = mmap(astorbFile.fileno(), 0)
        for line in astorbFile:
            lineCount += 1

            isValid = AstorbLine.IsValid(line)
            if isValid:
                validLineCount += 1
            else:
                invalidLineCount += 1

    print("%s: %d" % (astorbFilePath, lineCount))
    print("valid: %d" % (validLineCount))
    print("invalid: %d" % (invalidLineCount))

if __name__ == "__main__":
    workingDirectory = os.getcwd()
    print("working directory: %s" % (workingDirectory))

    astorbFilePath = "../../astorb/astorb.dat"
    ValidateAstorb(astorbFilePath)
