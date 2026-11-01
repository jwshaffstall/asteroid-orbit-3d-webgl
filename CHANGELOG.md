# Changelog

## v1.1 — unreleased

Correct astronomy on the existing app, with a fresh catalog.

### Fixed

- **Planets and asteroids now share one correct epoch.** The app used a hard-coded 2013 epoch for asteroid data of a different, unknown date, and Earth's elements had mean longitude stored as mean anomaly, which put Earth about 94° away from its real position. Planets now use JPL's approximate elements and rates (Standish Table 1), evaluated at the sim date; all eight are within 0.08° of JPL Horizons in tests.
- **Retrograde and very distant asteroids.** The catalog parser read inclinations of 100° or more (160 objects, such as 20461 Dioretsa at 160.4°) and semi-major axes of 1000 AU or more one column off. It now reads Lowell's documented columns.
- **Invented resonance motion removed.** The shader nudged Trojans and Hildas with made-up libration terms (slowing Hildas from 1.50× to 1.29× Jupiter's mean motion). All asteroids now follow plain two-body motion.
- **Shader precision**: the orbit math now runs in highp (mediump can't represent the Sun's gravitational parameter in AU/s² or times in seconds), with a clear message on GPUs that lack it. The "Angular Velocity" color mode no longer depends on values below mediump's range.
- Kepler solver: Danby's starting value and 7 Newton iterations, mirrored and tested in JS.
- Keys acted twice when the canvas had focus (Space paused then resumed, ↑ sped up 4×). Shortcuts now fire once, ignore auto-repeat for toggles, and stay out of the way while a button has focus.
- Halving the asteroid density four or more times made all asteroids vanish (WebGL stride limit). Density now changes the drawn count.
- Changing the point size silently switched cinematic mode off.
- Returning to a background tab no longer jumps the simulation forward by minutes × the speed.
- Additive asteroid blending no longer writes depth, so overlaps don't depend on draw order.
- The data download no longer times out after 45 seconds on slow connections, and a failed download reports once.

### Changed

- New catalog: Lowell astorb snapshot of 2026-10-30, 1,579,394 asteroids, epoch 2026-09-17 (was 1,487,224 of unknown date).
- The app opens at today's date; the status bar shows the sim date, with notices outside 1800–2050 and beyond ±100 years. Time is limited to ±1,000 years from the epoch. "Reset Time" is now "Now".
- Ceres comes from its catalog row; Pluto, Haumea, Makemake and Eris from JPL Horizons elements at the epoch.
- Lowell's required data credits are shown in the page footer and README.
- Deterministic URL options for sharing views and tests: `?t=`, `&cam=`, `&color=`, `&paused=1`.

### Development

- Shared, tested astronomy module (`scripts/js/astorb-astro.js`); converter with metadata, rejection report and byte-identical rebuilds; manual `pnpm run data:refresh`; JPL Horizons fixtures; a deterministic 20k-record fixture dataset; Playwright browser tests; CI on Node 24 with smoke screenshots.
- Removed unused `sylvester` and `glUtils`, and the old 2013 catalog from the working tree.

### Toolchain & Architecture (Vite+ Migration)

- **Vite+ Unified Toolchain**:
    - Replaced disparate dev tools with Vite+ (`vp` CLI, Vite 8 / Rolldown / Vitest / Oxlint / Oxfmt).
    - Switched package manager to `pnpm@12.16.1` with `pnpm-lock.yaml`.
    - Replaced ESLint with Oxlint (`vp lint` / `vp check`), achieving sub-200ms zero-warning lint passes.
    - Replaced Prettier with Oxfmt (`vp fmt`), adopting standard 1TBS brace style and LF line endings across the repository.
    - Migrated unit and E2E tests to Vitest (`vite-plus/test`), executing 42 unit tests in ~250ms.
- **ES Module Conversion & Production `dist/` Build**:
    - Converted frontend application files (`astorb3d.js`, `astorb-utils.js`, `astorb-astro.js`) to ES modules with standard imports and exports.
    - Replaced vendored libraries (`scripts/js/libs/`) with npm dependencies `gl-matrix` and `stats.js`.
    - Maintained `window.astorb`, `window.astorbUtils`, `window.astorbAstro` globals for debugging and automated testing.
    - Fixed production build (`vp build`): Rolldown bundles and minifies assets to `dist/assets/main-*.js` (48.55 kB) and copies the release dataset (`dist/data/release/astorb3d.bin`).
    - Added committed release dataset pipeline in `data/release/` validated by `tools/data-release.mjs` and `tests/astorb-release.test.mjs`.
    - Added GitHub Pages deployment workflow (`.github/workflows/deploy-pages.yml`) with `.nojekyll` and relative path support.
    - Updated CI workflows (`ci.yml`, `full-catalog.yml`) with pnpm, `vp check`, unit tests, Playwright browser tests, and a blocking `build` job with `dist/` audit.
