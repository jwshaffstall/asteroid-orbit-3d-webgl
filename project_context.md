# Project Context: astorb3d

This document acts as an entry point and context provider for future AI agent sessions working on this repository. Terms are defined in [GLOSSARY.md](GLOSSARY.md); decisions are recorded in [docs/adr/](docs/adr/); the roadmap is [plans/plan-integrated.md](plans/plan-integrated.md).

## Project Overview

**astorb3d** is a faithful, educational WebGL visualization of ~1.58 million asteroids from Lowell Observatory's astorb catalog (ADR 0001). Each asteroid moves by two-body Kepler motion from the snapshot's epoch, computed in the vertex shader on the GPU; planets use JPL's approximate elements (Standish Table 1). It is not an ephemeris or prediction service.

- **URL/Page**: `astorb3d.html`
- **Main Script**: `scripts/js/astorb3d.js`
- **Shared astronomy**: `scripts/js/astorb-astro.js` (Kepler solvers, planet elements, Julian dates)
- **Tests**: `tests/*.test.mjs` (unit, data, accuracy) and `tests/e2e/app.e2e.mjs` (browser)

---

## Directory Map

- `astorb3d.html`: page layout, theme CSS variables, and inline WebGL shaders (`shader-vs`, `shader-fs`, `shader-bodies-vs`, `shader-bodies-fs`).
- `astorb/`: `astorb.txt` (Lowell's record format notes), `astorb_landmarks.txt`. The old 2013 `astorb.dat.gz` is no longer tracked.
- `data/`: `manifest.source.json` (archived snapshots and checksums), `dwarf-planets.json` (Horizons elements at the epoch).
- `scripts/js/`:
    - `astorb3d.js`: WebGL setup, render loop, time, camera, controls, URL options.
    - `astorb-astro.js`: shared, tested astronomy. `solveKeplerF32()` mirrors the GLSL solver.
    - `astorb-utils.js`: formatting and status-text helpers.
    - `libs/`: gl-matrix 2.2.0, stats.js (see `THIRD_PARTY_NOTICES.md`).
- `scripts/python/astorb.py`: reference mapping of Lowell's columns.
- `temp/`: the v1 dataset (`astorb3d.bin`, `astorb3d.meta.json`, `astorb3d.rejected.json`). Raw snapshots (`*.dat`, `*.dat.gz`) are gitignored and archived as release assets.
- `tools/`:
    - `astorb_line.js`: parses one astorb record by documented columns.
    - `classify.js`: dynamical class (JPL definitions + Hungaria/Hilda boxes, fixed precedence).
    - `astorb2bin.js`: snapshot → v1 dataset + metadata + rejection report.
    - `fetch-catalog.mjs`, `data-refresh.mjs`: manual data refresh.
    - `horizons-fixtures.mjs`: JPL Horizons reference vectors and dwarf-planet elements.
    - `build-fixture.js`: the deterministic ~20k-record fixture dataset for CI.
    - `capture-screenshot.js`, `static-server.js`: browser screenshots and the test server.
- `tests/fixtures/`: real catalog lines, the fixture dataset, Horizons vectors.

---

## Architecture & Rendering Pipeline

1. **Dataset (v1)**: `temp/astorb3d.bin` is Float32 LE, 6 floats (24 bytes) per record in this order: mean anomaly, argument of perihelion, longitude of ascending node, inclination, eccentricity, semi-major axis (degrees and AU). `temp/astorb3d.meta.json` carries the epoch, record count and snapshot checksum. The app loads the metadata first, then the binary.
2. **Time**: the epoch is the internal time origin; `simTime` is seconds since the epoch and the app opens at today's date. Planets are evaluated in float64 JS at the sim date; asteroids in the shader with `time` = seconds since the epoch (highp), clamped to ±1,000 years.
3. **GPU Keplerian motion**: the vertex shader reduces M to [−π, π), starts from Danby's guess and runs 7 Newton iterations (`KEPLER_GPU_ITERATIONS`). Keep it in sync with `solveKeplerF32()`.
4. **Interactivity**: pause/resume, speed, reverse, jump to now, density (prefix draw count), camera drag/zoom, deterministic URL options (`?t=&cam=&color=&paused=1&debug=1&data=`).

---

## Development Scripts & Utilities

| Command                 | Action                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| `npm test`              | Unit, data and Horizons accuracy tests (`node --test`).                  |
| `npm run test:e2e`      | Browser tests with Playwright on the fixture dataset.                    |
| `npm run lint`          | oxlint, then ESLint (rules oxlint covers are turned off in ESLint).      |
| `npm run format`        | Prettier (Allman braces via `prettier-plugin-brace-style`).              |
| `npm run format:check`  | Verify formatting without writing.                                       |
| `npm run screenshot`    | Deterministic screenshot (`--query`, `--mobile`, `--output`).            |
| `npm run data:build`    | Rebuild `temp/astorb3d.bin` from the archived snapshot (byte-identical). |
| `npm run data:refresh`  | Manual refresh: fetch, build, Horizons fixtures, validate, summary.      |
| `npm run data:fixture`  | Rebuild the CI fixture dataset.                                          |
| `npm run data:horizons` | Regenerate Horizons fixtures (`-- --epoch YYYY-MM-DD`).                  |
