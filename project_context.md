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
- `data/`:
    - `release/`: committed production dataset (`astorb3d.bin`, `astorb3d.meta.json`).
    - `manifest.source.json`: archived snapshots and checksums.
    - `dwarf-planets.json`: Horizons elements at the epoch.
- `scripts/js/`:
    - `astorb3d.js`: WebGL setup, render loop, time, camera, controls, URL options (ES module entry).
    - `astorb-astro.js`: shared, tested astronomy (ES module). `solveKeplerF32()` mirrors the GLSL solver.
    - `astorb-utils.js`: formatting and status-text helpers (ES module).
- `scripts/python/astorb.py`: reference mapping of Lowell's columns.
- `temp/`: intermediate scratch and local test files (gitignored).
- `tools/`:
    - `astorb_line.js`: parses one astorb record by documented columns.
    - `classify.js`: dynamical class (JPL definitions + Hungaria/Hilda boxes, fixed precedence).
    - `astorb2bin.js`: snapshot → v1 dataset + metadata + rejection report.
    - `data-release.mjs`: creates release dataset bundle in `data/release/`.
    - `fetch-catalog.mjs`, `data-refresh.mjs`: manual data refresh.
    - `horizons-fixtures.mjs`: JPL Horizons reference vectors and dwarf-planet elements.
    - `build-fixture.js`: the deterministic ~20k-record fixture dataset for CI.
    - `capture-screenshot.js`, `static-server.js`: browser screenshots and the test server.
- `tests/fixtures/`: real catalog lines, the fixture dataset, Horizons vectors.

---

## Architecture & Rendering Pipeline

1. **Dataset (v1)**: `data/release/astorb3d.bin` is Float32 LE, 6 floats (24 bytes) per record in this order: mean anomaly, argument of perihelion, longitude of ascending node, inclination, eccentricity, semi-major axis (degrees and AU). `data/release/astorb3d.meta.json` carries the epoch, record count and snapshot checksum. The app loads the metadata first, then the binary.
2. **Time**: the epoch is the internal time origin; `simTime` is seconds since the epoch and the app opens at today's date. Planets are evaluated in float64 JS at the sim date; asteroids in the shader with `time` = seconds since the epoch (highp), clamped to ±1,000 years.
3. **GPU Keplerian motion**: the vertex shader reduces M to [−π, π), starts from Danby's guess and runs 7 Newton iterations (`KEPLER_GPU_ITERATIONS`). Keep it in sync with `solveKeplerF32()`.
4. **Interactivity**: pause/resume, speed, reverse, jump to now, density (prefix draw count), camera drag/zoom, deterministic URL options (`?t=&cam=&color=&paused=1&debug=1&data=`).

---

## Development Scripts & Utilities

| Command                   | Action                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| `pnpm run dev`            | Development server with hot reload via Vite+ (`vp dev`).                   |
| `pnpm run build`          | Production build to `dist/` bundling JS and release dataset (`vp build`).  |
| `pnpm run preview`        | Preview production `dist/` build locally (`vp preview`).                   |
| `pnpm test`               | Unit, data and accuracy tests with Vitest (`vp test --project=unit --run`) |
| `pnpm run test:e2e`       | Browser tests with Playwright and Vitest (`vp test --project=e2e --run`).  |
| `pnpm run check`          | Unified check running linter and format checker (`vp check`).              |
| `pnpm run lint`           | oxlint via Vite+ (`vp lint`).                                              |
| `pnpm run format`         | Oxfmt (`vp fmt --write`, default 1TBS style).                              |
| `pnpm run format:check`   | Verify formatting without writing (`vp fmt --check`).                      |
| `pnpm run screenshot`     | Deterministic screenshot (`--query`, `--mobile`, `--output`).              |
| `pnpm run data:release`   | Package validated release dataset into `data/release/`.                    |
| `pnpm run data:refresh`   | Manual refresh: fetch, build, Horizons fixtures, validate, summary.        |
| `pnpm run data:fixture`   | Rebuild the CI fixture dataset.                                            |
| `pnpm run data:horizons`  | Regenerate Horizons fixtures (`-- --epoch YYYY-MM-DD`).                    |
| `pnpm run deps:install`   | Install dependencies cleanly via pnpm (`pnpm install`).                    |
| `pnpm run deps:update`    | Update dependencies to latest compatible versions (`pnpm update`).         |
| `pnpm run deps:audit`     | Check installed dependencies for security advisories (`pnpm audit`).       |
| `pnpm run deps:audit:fix` | Fix security advisories automatically (`pnpm audit --fix`).                |
