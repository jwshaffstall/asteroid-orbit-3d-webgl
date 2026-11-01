export const formatNumber = function (value) {
    if (value === null || value === undefined) {
        return "--";
    }
    return Number(value).toLocaleString("en-US");
};

export const formatAsteroidPercent = function (current, total) {
    if (!total) {
        return "0%";
    }
    const percent = (current / total) * 100;
    return percent.toFixed(1) + "%";
};

export const formatBytes = function (bytes) {
    if (bytes === null || bytes === undefined || isNaN(bytes)) {
        return "--";
    }
    if (bytes === 0) {
        return "0 B";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, index);
    return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + " " + units[index];
};

export const formatBitsPerSecond = function (bitsPerSecond) {
    if (!bitsPerSecond || !isFinite(bitsPerSecond)) {
        return "--";
    }
    const units = ["bps", "Kbps", "Mbps", "Gbps"];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bitsPerSecond) / Math.log(1000)));
    const value = bitsPerSecond / Math.pow(1000, index);
    return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + " " + units[index];
};

export const clamp = function (value, min, max) {
    return Math.max(min, Math.min(max, value));
};

// Days per Julian year, and the reachable sim range around the epoch.
export const DAYS_PER_YEAR = 365.25;
export const SIM_LIMIT_YEARS = 1000;
export const PLANET_TABLE_FROM_YEAR = 1800;
export const PLANET_TABLE_TO_YEAR = 2050;

// One-line caveat for the status bar, or "" when the sim date is within the comfortable
// range. daysFromEpoch: sim date minus epoch, in days; year: the sim date's calendar year.
export const accuracyNotice = function (daysFromEpoch, year) {
    const years = Math.abs(Number(daysFromEpoch) || 0) / DAYS_PER_YEAR;
    if (years >= SIM_LIMIT_YEARS - 1e-9) {
        return "At the ±1,000-year limit";
    }
    if (years > 100) {
        return "Over 100 years from the epoch: positions are rough";
    }
    if (year < PLANET_TABLE_FROM_YEAR || year > PLANET_TABLE_TO_YEAR) {
        return "Planet positions approximate outside 1800–2050";
    }
    return "";
};

export const buildStatusText = function (input) {
    const safe = input || {};
    const pauseStatus = safe.paused ? "[PAUSED]" : "[RUNNING]";
    const directionLabel = safe.timeScale >= 0 ? "Forward" : "Reverse";
    const asteroidCount = safe.asteroidCount || 0;
    const asteroidDrawCount = safe.asteroidDrawCount || 0;
    const percent = formatAsteroidPercent(asteroidDrawCount, asteroidCount);
    let when;
    if (safe.simDate) {
        when = " Date: " + safe.simDate;
    } else {
        const years = Number(safe.simTime || 0) / (DAYS_PER_YEAR * 24 * 3600);
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

const astorbUtils = {
    formatNumber,
    formatAsteroidPercent,
    formatBytes,
    formatBitsPerSecond,
    clamp,
    DAYS_PER_YEAR,
    SIM_LIMIT_YEARS,
    PLANET_TABLE_FROM_YEAR,
    PLANET_TABLE_TO_YEAR,
    accuracyNotice,
    buildStatusText,
};

if (typeof window !== "undefined") {
    window.astorbUtils = astorbUtils;
}

export default astorbUtils;
