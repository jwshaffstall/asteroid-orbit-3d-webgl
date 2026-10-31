(function (root, factory)
{
    if (typeof module === "object" && module.exports)
    {
        module.exports = factory();
    }
    else
    {
        root.astorbUtils = factory();
    }
})(typeof self !== "undefined" ? self : this, function ()
{
    var formatNumber = function (value)
    {
        if (value === null || value === undefined)
        {
            return "--";
        }
        return Number(value).toLocaleString("en-US");
    };

    var formatAsteroidPercent = function (current, total)
    {
        if (!total)
        {
            return "0%";
        }
        var percent = (current / total) * 100;
        return percent.toFixed(1) + "%";
    };

    var formatBytes = function (bytes)
    {
        if (bytes === null || bytes === undefined || isNaN(bytes))
        {
            return "--";
        }
        if (bytes === 0)
        {
            return "0 B";
        }
        var units = ["B", "KB", "MB", "GB", "TB"];
        var index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
        var value = bytes / Math.pow(1024, index);
        return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + " " + units[index];
    };

    var formatBitsPerSecond = function (bitsPerSecond)
    {
        if (!bitsPerSecond || !isFinite(bitsPerSecond))
        {
            return "--";
        }
        var units = ["bps", "Kbps", "Mbps", "Gbps"];
        var index = Math.min(
            units.length - 1,
            Math.floor(Math.log(bitsPerSecond) / Math.log(1000))
        );
        var value = bitsPerSecond / Math.pow(1000, index);
        return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + " " + units[index];
    };

    var clamp = function (value, min, max)
    {
        return Math.max(min, Math.min(max, value));
    };

    // Days per Julian year, and the reachable sim range around the epoch.
    var DAYS_PER_YEAR = 365.25;
    var SIM_LIMIT_YEARS = 1000;
    var PLANET_TABLE_FROM_YEAR = 1800;
    var PLANET_TABLE_TO_YEAR = 2050;

    // One-line caveat for the status bar, or "" when the sim date is within the comfortable
    // range. daysFromEpoch: sim date minus epoch, in days; year: the sim date's calendar year.
    var accuracyNotice = function (daysFromEpoch, year)
    {
        var years = Math.abs(Number(daysFromEpoch) || 0) / DAYS_PER_YEAR;
        if (years >= SIM_LIMIT_YEARS - 1e-9)
        {
            return "At the ±1,000-year limit";
        }
        if (years > 100)
        {
            return "Over 100 years from the epoch: positions are rough";
        }
        if (year < PLANET_TABLE_FROM_YEAR || year > PLANET_TABLE_TO_YEAR)
        {
            return "Planet positions approximate outside 1800–2050";
        }
        return "";
    };

    var buildStatusText = function (input)
    {
        var safe = input || {};
        var pauseStatus = safe.paused ? "[PAUSED]" : "[RUNNING]";
        var directionLabel = safe.timeScale >= 0 ? "Forward" : "Reverse";
        var asteroidCount = safe.asteroidCount || 0;
        var asteroidDrawCount = safe.asteroidDrawCount || 0;
        var percent = formatAsteroidPercent(asteroidDrawCount, asteroidCount);
        var when;
        if (safe.simDate)
        {
            when = " Date: " + safe.simDate;
        }
        else
        {
            var years = Number(safe.simTime || 0) / (DAYS_PER_YEAR * 24 * 3600);
            when = " Time: " + years.toFixed(2) + " years";
        }

        return (
            pauseStatus +
            when +
            " | " +
            "Asteroids: " +
            formatNumber(asteroidDrawCount) +
            " / " +
            formatNumber(asteroidCount) +
            " (" +
            percent +
            ") | " +
            "Speed: " +
            Math.abs(Number(safe.timeScale || 0)).toExponential(1) +
            "x (" +
            directionLabel +
            ")" +
            (safe.notice ? " | " + safe.notice : "")
        );
    };

    return {
        formatNumber: formatNumber,
        formatAsteroidPercent: formatAsteroidPercent,
        formatBytes: formatBytes,
        formatBitsPerSecond: formatBitsPerSecond,
        clamp: clamp,
        accuracyNotice: accuracyNotice,
        buildStatusText: buildStatusText,
    };
});
