# Asteroid Orbit 3D WebGL — Comprehensive Phased Implementation Plan (Revision 2.0)

> **Status:** Revised implementation backlog / AI-agent execution specification — reviewed, **not yet implemented or benchmarked**  
> **Prepared:** October 31, 2026  
> **Revision:** 2.0 — critique-incorporated iteration of the original 408-item plan  
> **Supersedes:** `asteroid-orbit-3d-webgl-implementation-plan.md` (original draft)  
> **Target repository:** <https://github.com/jwshaffstall/asteroid-orbit-3d-webgl> (`master`)  
> **Target deployment:** GitHub Pages, with a static-only runtime and optional future CDN  
> **Primary objective:** Turn the existing large-scale GPU asteroid visualization into a fast-loading, scientifically accountable, maintainable, attractive, and robust browser-based astronomical atlas.  
> **Task notation:** `[ ]` pending; `[x]` verified complete; `[~]` in progress. **`[R1]`** marks the explicitly selected Release 1 critical path; unmarked tasks remain in the full backlog. Priority: **P0** correctness/production blocking, **P1** important, **P2** desirable, **P3** exploratory. A task is not considered complete merely because a coding agent reports success.

---

## Revision 2.0 — What changed and why

This revision **preserves the original comprehensive checklist** and reconciles the detailed critique. It does not treat earlier engineering recommendations as completed code, runtime measurements, or scientific validation.

1. **Resolve progressive-loading contradiction:** Release 1 uses **verified whole-shard reveal**. The first astronomical frame is independent of asteroid data; the first asteroid frame follows a fully verified small bootstrap. True *within-shard progressive rendering* is a later, independently verified feature—not a Release 1 promise.
2. **Establish explicit release boundaries:** a marked ~100-item `[R1]` critical subset and a six-gate release pathway, while preserving the long-term backlog.
3. **Fix parser assumptions:** explicitly handle Lowell's **2018 revised fixed-width format** and 266-column rows, including changed inclination and `a >= 1000 AU` formatting; retain source-snapshot fixtures.
4. **Lock object identity early:** specify stable ID, chunk ID, record index, order, and sidecar schema so selection, filtering, and catalog upgrades do not silently misidentify objects.
5. **Define scientific error budgets:** separate CPU solver numerical error, shader numerical error, planetary approximation accuracy, and real-asteroid physical propagation error; require evidence and stated validity windows for each.
6. **Create a freshness/publishing policy:** immutable snapshots, detected source updates, data-age indicators, reproducible validation, staged publish and rollback.
7. **Make chunk sizes and GPU budgets empirical:** prefer small early shards, then larger bulk shards; benchmark upload time, bandwidth, network latency, cumulative memory, and visible-density cadence.
8. **Clarify integrity and compression:** `crypto.subtle.digest()` is whole-buffer, not streaming; hash canonical decoded shard bytes; stream and independently verify *subblocks* only in an advanced optional phase.
9. **Improve adaptive quality and hosting economics:** never require `navigator.deviceMemory`; track actual WebGL features, measured frame time, sample cardinality, transfer cost, and GitHub Pages published-site and bandwidth budgets.
10. **Split agent PRs:** replace 18 uneven batches with a finer-grained sequence of independently verifiable PRs and explicit dependency/rollback rules.

**User-facing release promise:** An interactive solar-system scene appears without an asteroid download; the *verified* representative belt appears after the small bootstrap completes; each subsequently verified shard adds more asteroids without interrupting interaction; all displayed catalog coverage and scientific caveats remain accurate.

**Correctness versus speed priority:** Integrity and documented numerical validity win over revealing unverified bytes a fraction of a second sooner. The project can later gain verified *sub-shard* publication if tests show that finer granularity materially improves UX.

## 0. Executive decisions and non-negotiable principles

### 0.1 What we are preserving

- [ ] **Retain GPU-based asteroid position evaluation:** no per-frame JavaScript loop through the entire asteroid catalog.
- [ ] Retain a low-overhead rendering architecture based on WebGL point primitives and shared orbital mathematics; avoid per-asteroid scene objects or meshes.
- [ ] Keep GitHub Pages deployment possible **without a server-side API**, user account, or database.
- [ ] Preserve the public-domain intent of the original repository, alongside applicable third-party licenses and dataset attribution.
- [ ] Preserve the current URL (`astorb3d.html`) and shareable entry point or provide an explicit redirect.
- [ ] Preserve backward-compatible user controls during incremental modernization until replacements are demonstrably better.
- [ ] Keep visualization and scientifically justified dynamics explicitly distinguishable; never silently alter catalog trajectories for visual spectacle.

### 0.2 Target capabilities

- [ ] **First visible frame requires no asteroid catalog:** draw the Sun, planet guides, and loading UI immediately after WebGL initialization.
- [ ] **First asteroid frame requires only the small representative bootstrap shard to finish download and hash verification**, not the full catalog. No asteroid bytes are rendered before their verification in Release 1.
- [ ] **Progressively reveal verified independent shards across the overall catalog download** while keeping camera, playback, and controls interactive. True *within-shard* partial rendering is explicitly post-1.0 and subject to separate subblock integrity.
- [ ] Make every asteroid’s source snapshot, epoch, reference frame, units, and propagation assumptions discoverable.
- [ ] Provide accurate, repeatable planet positions using a consistent ephemeris or documented approximation.
- [ ] Support filters, selection, search, explanations, date/time exploration, camera presets, and shareable scene state.
- [ ] Scale quality automatically for mobile, desktop, low-bandwidth, reduced-motion, and battery-sensitive devices.
- [ ] Make data preprocessing deterministic, versioned, tested, and reproducible.
- [ ] Set **measured** performance budgets and validate with real devices; do not claim FPS based solely on draw-call counts.

### 0.3 Scope boundaries

**Within initial modernization:** Keplerian two-body asteroid propagation around the Sun; precomputed/current astorb catalog; authoritative approximate or ephemeris-driven major-planet positions; **preserve a working WebGL 1 baseline for Release 1**, then evaluate a WebGL 2 primary renderer with a measured WebGL 1 fallback; chunked static asset delivery; scientific visualization UI.

**Not initially promised:** an exact N-body gravitational model for ~1.5 million objects; precise individual-asteroid position predictions over centuries; reliable impact predictions; observatory-grade pointing without a validated ephemeris; physically accurate asteroid appearance based solely on orbital elements; full WebGPU replacement.

**Accuracy contract:** A two-body extrapolation from osculating elements is a *local approximation*, not a complete prediction. Lowell states many non-planet-approaching asteroid ephemerides can be accurate within approximately ±50 days of the epoch; this does **not** imply a universal guarantee, especially for near-Earth objects and strongly perturbed cases. Flag predictions outside the validated window. The reference epoch must come from the **catalog**, not an arbitrary code date.

### 0.3a Explicit product-release boundaries

**Release 1.0 (critical path):** robust existing behavior; correct, testable two-body mathematics within an honestly described interval; validated modern-format catalog ingestion; deterministic representative bootstrap; immutable manifest and whole-shard SHA-256 verification; camera/time interaction while loading; progressively added verified GPU buffers; adequate loading/provenance UI; accessible controls; production subpath deployment and CI smoke tests. The project is still a **visualization**, not an authoritative impact/observational prediction service.

**Release 1.1+:** optional intra-shard verified subblocks, worker-based pipeline, advanced compression, adaptive dynamic LOD, deep search/selection, extended UI, offline packs and richer educational overlays.

**Exploratory:** N-body perturbation integration for selected objects, ephemeris interpolation, full WebGPU port, view-dependent distributed catalogs, XR.

**Phase labels describe domains, not a requirement to complete every task in that phase before first release.** Tasks carrying `[R1]` are the release blocking subset; release gates below group these tasks by demonstrable outcomes.

### 0.4 Repository facts established during the review

- Original app: `astorb3d.html`, `scripts/js/astorb3d.js` (~2,400 lines), embedded GLSL ES 1.00 shaders, global `astorb` state.
- Current on-disk asteroid data: `temp/astorb3d.bin`, 35,693,376 bytes; at 24 bytes/record, **1,487,224 records**, approximately **34.04 MiB**.
- Existing six Float32 fields, in order: `M`, `ω`, `Ω`, `i`, `e`, `a`.
- Existing build: Vite 8 / Rolldown; current runtime fetch: XHR of the full `temp/astorb3d.bin` before beginning animation.
- Existing tests focus on formatting helpers; existing screenshot workflow is not an adequate science/performance gate.
- Current `astorb/astorb.dat.gz` is a source snapshot and must not be assumed to match the newest Lowell feed or the hardcoded October 2013 epoch.
- Public Lowell feed is actively maintained; a refreshed source snapshot may contain substantially more records than the committed 2026 binary. Plan for **variable catalog size** and compare resulting records rather than assuming the old count is permanent.

---

### 0.5 Release 1 critical subset / task traceability

The `[R1]` markers are the **explicit release-blocking subset** of the larger backlog. They are not a claim that the underlying tasks have been implemented. Review/adjust membership in the tracking board when a technical dependency is discovered; do not equate *all tasks in a domain phase* with the first release.

- **G1/G2**: startup reliability, keyboard/stride/precision defects, modern-format parser, correct time/planet math, measurable scientific limitations.
- **G3/G4**: immutable manifest, stable identity/index, disjoint nested bootstrap and bulk chunks, verify-then-upload, partial renders and correct failure/retry state.
- **G5/G6**: basic visible coverage/date/completeness/quality UX, actual Pages deployment, browser+scientific CI, documented catalog refresh/rollback and bandwidth budget.

**Tracking guidance:** one issue per `[R1]` checkbox or per independently testable bundle, link its G1–G6 gate and PR number. A checkbox may be checked only when its acceptance evidence exists. Unmarked tasks remain desirable follow-up work; some exploratory sections are intentionally completely outside Release 1.

## 1. Phase 0 — Baseline, inventory, reproducibility, and safety net (**P0**, first)

### Tasks

- [ ] **[R1]** Create an implementation tracking issue/board; link this plan and record the baseline commit SHA.
- [ ] Record versions for Node, npm, Vite, Rolldown, browsers, and GitHub Actions runners; pin supported versions and document engines.
- [ ] **[R1]** Run and archive baseline results from `npm ci`, `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, and Playwright screenshot capture (where environment permits).
- [ ] **[R1]** Inspect built `dist` and **prove the asteroid binary is actually deployed** at the URL the runtime requests; treat missing data as a release blocker.
- [ ] **[R1]** Capture the complete current behavior on Chrome, Firefox, Safari, desktop, and at least one iOS/Android device: startup latency, keyboard behavior, controls, draw counts, and UI screenshots.
- [ ] Establish automated screenshots for **first frame**, **first asteroid data**, **50% loading**, **fully loaded**, **dark theme**, and **mobile layout**.
- [ ] **[R1]** Save SHA-256 hashes, source URLs, sizes, parsing statistics, and timestamps of the current catalog artifacts.
- [ ] **[R1]** Create golden fixtures from officially documented and real current-format astorb records: Ceres, e=0/near-1, retrograde/high inclination >99.99999°, `a >= 1000 AU`, optional spaces, LF/CRLF, blank fields, and rejected records; include a vintage pre-2018 fixture.
- [ ] Benchmark baseline median/p95 CPU frame time, measured GPU time if supported, FPS, JS heap, GPU buffer estimate, bytes downloaded, time-to-first-frame, time-to-first-asteroids, and time-to-full-catalog.
- [ ] Document which visuals are intentionally stylized: body radii, point sizes, colors, artificial resonance modifications, moon paths, orbital guides, etc.
- [ ] **[R1]** Add a minimal browser console/WebGL error assertion to smoke tests.
- [ ] **[R1]** Inventory third-party licenses in `scripts/js/libs/` and generated assets; retain required notices.

### Exit criteria

- [ ] Reproducible clean checkout builds and runs in a local production preview.
- [ ] Baseline measurements and screenshots are stored in CI artifacts or project documentation.
- [ ] We know whether the current production asset path works and have a test that catches regressions.
- [ ] Scientific and rendering changes can be compared against representative golden inputs.

---

## 2. Phase 1 — Fix confirmed correctness and runtime defects (**P0**, before new features)

### 2.1 Input, render, shader, and loader defects

- [ ] **[R1]** **Fix double keyboard dispatch:** `setupCameraControls()` currently attaches the same keydown handler to both the canvas and `window`; a focused canvas causes bubbling and duplicate changes. Use one listener, or explicitly prevent duplicate handling, and test focus scenarios.
- [ ] **[R1]** Ignore shortcuts when focus is in an input, select, textarea, or contenteditable region; preserve normal keyboard accessibility.
- [ ] **[R1]** **Fix invalid vertex stride:** the current density-halving scheme multiplies `24` bytes/record by powers of two; WebGL 1 requires `stride <= 255`. Replace with a stable, deterministic draw-count/LOD strategy rather than increasing attribute stride.
- [ ] **[R1]** **Fix vertex precision:** declare `highp` for astronomy vertex computations; inspect `getShaderPrecisionFormat`, document supported precision, and test on actual mobile hardware. Do not silently fall back to inaccurate mediump physics.
- [ ] **[R1]** Convert dangerous constants/time formulas to numerically better-scaled units (e.g. AU and Julian days) and keep rigorous high-precision intermediate calculations on CPU where necessary.
- [ ] **[R1]** Check program and shader compilation/link success; fail visibly and stop initialization when either fails. Provide developer diagnostics and user-friendly fallback text.
- [ ] Check every attribute/uniform binding before use; do not enable `-1` attribute locations, especially in the body shader.
- [ ] Ensure GL program switches and uniform writes use the intended active program.
- [ ] **[R1]** Validate binary byte length is divisible by the exact record size and reject NaN/Infinity, impossible `a`, and incompatible `e` values before upload.
- [ ] **[R1]** Make network failure idempotent: XHR currently can invoke success/error callback through multiple event paths; use a single terminal state.
- [ ] Improve fatal error overlay: retry, details, source URL, and optional reduced-sample mode rather than dismissing the loading UI and leaving a blank canvas.
- [ ] **[R1]** Add `webglcontextlost` and `webglcontextrestored` handling, preserving CPU-side app state and reconstructing all GPU resources on restoration.
- [ ] **[R1]** Fix screenshot utility's `waitForFunction` argument order: `page.waitForFunction(predicate, undefined, { timeout: ... })`; fail CI on a render timeout instead of uploading misleading screenshots as success.
- [ ] Address `requestAnimationFrame` timing spikes after a tab resumes: clamp or explicitly account for long wall-time deltas according to user-selected time policy.
- [ ] Remove or isolate the unused legacy libraries (`sylvester`, `glUtils`) after import/reference verification.
- [ ] Update deprecated `new Buffer(size)` to safe `Buffer.alloc` or direct `DataView`/typed-array generation in converter tooling.

### 2.2 Specific astronomy defects to prevent propagating further

- [ ] **[R1]** Do **not** treat mean longitude `L` as mean anomaly `M`. Source planet elements from a consistently defined reference dataset and compute `M = L - ϖ`, `ω = ϖ - Ω` where the source uses those conventions.
- [ ] Distinguish Earth/Moon barycenter from Earth and represent the selected source appropriately.
- [ ] **[R1]** Remove the hardcoded `2013-10-15` asteroid epoch as an assumed universal epoch. Read the epoch from catalog metadata; verify whether source epochs are uniform or vary per record.
- [ ] **[R1]** Fix inconsistencies between the `astorb_line.js` 267-character expectation, the Python helper's 268-byte expectation (potential newline), and Lowell's 266-column record definition; test actual CRLF/LF and source revisions, **including the January 2018 updated layout** for inclination above 99.99999° and semimajor axis >=1000 AU (optional preceding spaces, F13.7/F13.8). Parse with version-aware official field offsets, not fixed legacy substrings or another magic length.
- [ ] Fix the misleading “astorb line is not 255 characters” diagnostic.
- [ ] Separate visualization-only Trojan/Hilda angle modifications from scientific Kepler propagation; default scientific mode must reproduce the input orbital elements unmodified.
- [ ] Do not depict simplified zero-inclination, arbitrary-phase satellite orbits as precision ephemerides; label them as illustrative until replaced.

### Exit criteria

- [ ] Each fixed bug has a regression test and at least one manual verification case; its PR notes whether it belongs to Release 1 and names the associated G1–G6 gate.
- [ ] No WebGL errors after repeated density changes, resize, keyboard focus, pause/resume, or context loss/recovery.
- [ ] No shader precision failure on the supported mobile device matrix.
- [ ] **[R1]** The same source snapshot and date give deterministic asteroid positions within defined numeric tolerances.

---

## 3. Phase 2 — Scientific time model, coordinates, and validated orbital mechanics (**P0/P1**)

### 3.1 Make chronology explicit

- [ ] **[R1]** Define an internal astronomy time representation based on an absolute Julian date and a documented timescale (TT/TDB as appropriate); show human-facing UTC date/time in the UI.
- [ ] **[R1]** Parse catalog `yyyymmdd` epoch of osculation and translate it deliberately from the Lowell documented historical TDT convention; avoid relying on JavaScript `Date` alone for astronomical precision/time scales.
- [ ] Preserve source epoch, source snapshot, and propagator version in calculation and UI state.
- [ ] **[R1]** Keep simulation time internally as Float64 CPU data; avoid sending huge absolute Unix seconds into a Float32 shader uniform.
- [ ] **[R1]** Use precision-preserving GPU inputs: a catalog-relative day offset within a validated window, or split high/low time/phase, with explicit numeric error analysis.
- [ ] Support rewind, pause, step hour/day/month/year, playback speed, reverse playback, and jump to catalog epoch/current UTC.
- [ ] Define whether huge playback jumps skip or interpolate frames; avoid discontinuities from wall-clock resumption.
- [ ] **[R1]** State the current *displayed date*, catalog epoch, and propagation error caveat adjacent to the timeline.

### 3.2 Implement a tested Kepler reference solver

- [ ] **[R1]** Write a pure TypeScript CPU reference solver with explicit units, orbital elements, frame, and time arguments.
- [ ] **[R1]** Implement the elliptic relation `M = E - e sin(E)` with range normalization and a convergence-bounded Newton or hybrid fallback algorithm.
- [ ] Handle `e = 0`, very high elliptic eccentricity, angles across ±π, negative time, empty input, and invalid entries.
- [ ] **[R1]** Define policy for near-parabolic (`e≈1`) and hyperbolic (`e>1`) asteroids: exclude/flag in baseline, or implement separately rather than forcing them through the elliptic formula.
- [ ] **[R1]** Use orbital-plane coordinates `x' = a(cos E - e)` and `y' = a sqrt(1-e²) sin E`, then the documented 3D orbital-frame rotation.
- [ ] Add a test that returns to the same position after an exact orbital period in the unperturbed model.
- [ ] Add energy, orbital geometry, and orientation invariants (when physically applicable).
- [ ] Implement per-record metadata sufficient to distinguish catalog conventions and optional uncertainties.
- [ ] **[R1]** Validate CPU output against known reference vectors from JPL Horizons or an independently implemented trusted reference.
- [ ] **[R1]** Compare GPU and CPU output in test shaders across representative orbital regimes; specify tolerance in AU/km and angles and document why the selected tolerance is achievable on supported hardware.

### 3.3 Repair planetary and satellite ephemerides

- [ ] **[R1]** Use JPL's published approximate planet elements and *rates*, including the documented applicable date windows, instead of mixing J2000 longitude/mean anomaly fields.
- [ ] Compute `ω` and `M` consistently and incorporate linear secular rates and any documented correction terms for the selected JPL approximation.
- [ ] **[R1]** Choose/label coordinate frame (ecliptic J2000 or other) and apply correct transformations consistently for asteroid and planet geometry.
- [ ] Distinguish ecliptic longitude from sky longitude; do not advertise observational RA/Dec without appropriate transformations and observer location.
- [ ] Document and correctly handle the Earth/Moon barycenter if the source uses it.
- [ ] Add cross-checks for Mercury, Venus, Earth/EMB, Mars, Jupiter, Saturn, Uranus, Neptune at multiple absolute dates.
- [ ] Document that JPL's approximate planetary formula is less accurate than integrated Horizons ephemerides; do not extrapolate beyond fitted windows without warnings.
- [ ] Introduce a separately labeled higher-accuracy ephemeris path for selected bodies (precomputed samples/interpolated ephemerides), if it fits the static hosting model.
- [ ] Eventually replace illustrative moon positions with validated moon ephemerides or disable claims of real-time physical position.

### 3.3a Scientific error budget and validation matrix (mandatory release gate)

Every scientific PR must identify its **reference model, source, units, frame, epoch, time interval, target tolerance, measured maximum/p95 error, and unsupported regimes**. A CPU/GPU match is a *numerical* test; it does **not** establish *physical* accuracy of a two-body asteroid trajectory relative to reality.

| Test family | Proposed initial engineering criterion | Scope and interpretation |
|---|---|---|
| CPU elliptic Kepler residual | `abs(E - e*sin(E) - M) <= 1e-12 rad` for validated routine elliptical fixtures; fallback or explicitly classify difficult convergence cases | Numerical solver convergence, *not* JPL positional accuracy |
| CPU coordinate/invariant tests | Agreement with independent double-precision test oracle and transforms at an agreed tight absolute/relative tolerance (candidate `<=1e-10 AU` for moderate synthetic examples) | Record conditions and floating-point methodology; adjust only with documented evidence |
| GPU vs CPU orbital positions | Candidate initial *visual* limit `<=1e-4 AU` for well-conditioned moderate-orbit fixtures within declared catalog-relative window; aim to tighten after real hardware measurements | Must include max/p95 and selected mobile GPUs; **not** acceptable automatically for close-up/precision inspector |
| Planet approximation vs Horizons | Evaluate each body/date against JPL nominal longitude/latitude/radius accuracy and actual sampled test vectors; do not set a universal 1-km requirement | Report per-body, per-epoch numbers and fit validity; distinguish EMB from Earth's center |
| Asteroid catalog vs physical ephemeris | Per-population error evaluation on independent objects across signed time deltas (e.g. 0, ±1, ±7, ±30, ±50, ±365 days) | Two-body error depends on perturbations, source uncertainty, orbital class and epoch; **no blanket ±50-day guarantee** |
| Pixel relevance | Project 3D numerical error into pixels at preset camera scales; require a non-misleading zoom/focus design | Near-object inspector may need higher-precision CPU/ephemeris evaluation |

**Policy:** Numeric values above are *proposed engineering test thresholds to calibrate*, not claims that the implementation meets them. If a threshold fails, preserve test evidence and adjust algorithm, supported domain, warning policy or explicitly approved target rather than silently loosening the test. Keep a manifest-linked `accuracyPolicyVersion` and publish measured limitations in the UI and documentation.

**Required fixtures:** JPL-derived time-specific planet/EMB vectors with documented timescale and frame; canonical circular/eccentric/inclined/retrograde artificial ellipses; real Lowell objects in several populations; edge cases (large `a`, `e` near 1, negative offsets, inconsistent source epochs). Test angular wrapping and solver fallbacks without assuming all records are elliptical.


### 3.4 Distinguish science from illustration

- [ ] **[R1]** Offer **Scientific (unmodified Keplerian)** as the default dynamics mode.
- [ ] Allow an optional **Illustrative Resonances** mode if desired, with a tooltip that these are procedural effects, not an N-body solution.
- [ ] **[R1]** Warn when selected date falls outside a defensible validity window of the source/propagator.
- [ ] Treat close approaches and impact-related claims as high-stakes scientific features requiring independent ephemeris validation; do not infer safety/collision likelihood from simple point overlap.

### Exit criteria

- [ ] Reference planet/body cases pass published or independently reproducible comparisons.
- [ ] The displayed date, catalog epoch, and coordinate frame are unambiguous.
- [ ] Scientific mode exhibits no undocumented orbital forcing or visually driven trajectory adjustments.
- [ ] We have explicit, tested tolerance and validity policies rather than an unsubstantiated “high accuracy” claim.

---

## 4. Phase 3 — Modular TypeScript architecture, state boundaries, and developer tooling (**P1**, parallelizable)

- [ ] **[R1]** Migrate the global-state 2,400-line `scripts/js/astorb3d.js` incrementally to ES modules / strict TypeScript, preserving a working app at every PR.
- [ ] Extract separate subsystems: `AppController`, `SimulationClock`, `AstronomyCore`, `CatalogParser`, `CatalogLoader`, `CatalogScheduler`, `GpuCatalogStore`, `AsteroidRenderer`, `BodyRenderer`, `CameraController`, `DisplaySettings`, `UI`, and `Diagnostics`.
- [ ] **[R1]** Extract vertex and fragment GLSL files from `astorb3d.html` and import as Vite raw assets (or use a shader build step) with documented shader source mappings.
- [ ] **[R1]** Use discriminated typed states for loader lifecycle: `idle`, `bootstrap`, `streaming`, `complete`, `partial-failure`, `error`, `cancelled`.
- [ ] Separate **render state** (GPU buffers, VAOs, shaders) from **simulation state** (time, epoch, reference frame, options) and **catalog state** (manifest, download coverage, record metadata).
- [ ] Replace ad-hoc globals with explicit interfaces and deterministic module boundaries; eliminate implicit dependence on HTML script ordering.
- [ ] Prefer dependency injection for time, fetch, WebGL adapter, and catalog decoding to make tests deterministic.
- [ ] Add typed error results and structured diagnostics for individual chunk failures.
- [ ] Retain lean vanilla HTML/CSS/TS UI unless an identified interaction requires a framework.
- [ ] **[R1]** Define ownership and disposal for every GPU resource, event listener, timer, worker, abort controller, and network request.
- [ ] Add `tsconfig.json` with strict mode and appropriate DOM/worker libs; avoid `any` in astronomy/data boundaries.
- [ ] **[R1]** Extend `npm` scripts to include `typecheck`, `lint`, `format:check`, `test:unit`, `test:integration`, `test:e2e`, `test:science`, `test:perf`, `build`, `preview`, `data:build`, and `data:validate`.
- [ ] Keep package versions pinned via lockfile; document dependency compatibility with the existing Vite 8/Rolldown configuration.
- [ ] Update `README.md`, `AGENTS.md`, and `project_context.md` for new architecture; remove machine-specific `file:///F:/...` links.

### Suggested organization

```text
src/
  main.ts
  app/{state,controller,settings,capabilities}.ts
  astronomy/{time,units,frames,kepler,planet-ephemeris,validation}.ts
  catalog/{schema,manifest,parser,loader,scheduler,worker-client}.ts
  rendering/{context,renderer,gpu-catalog-store,asteroids,bodies,orbits,camera,quality}.ts
  rendering/shaders/{asteroid.vert.glsl,asteroid.frag.glsl,body.vert.glsl,body.frag.glsl}
  ui/{toolbar,timeline,loader-status,search,selection,details,legend,accessibility}.ts
  workers/catalog.worker.ts
  diagnostics/{metrics,errors}.ts
public/catalog/<version>/
  manifest.json
  bootstrap.bin
  shards/0000.bin ...
tools/{build-catalog,validate-catalog,build-reference-fixtures,benchmark}.ts
tests/{unit,integration,science,webgl,e2e,performance}/
.github/workflows/{ci,deploy}.yml
```

### Exit criteria

- [ ] Source modules can be tested without launching the entire browser app.
- [ ] Physics results remain stable through mechanical refactoring.
- [ ] `tsc --noEmit` or equivalent strict typecheck passes, and public API boundaries are documented.

---

## 5. Phase 4 — Versioned, validated, reproducible astronomy catalog (**P0/P1**)

### 5.1 Source ingestion and provenance

- [ ] **[R1]** Fetch from the current official Lowell endpoint or import an explicitly frozen source snapshot with attribution; record URL, UTC retrieval timestamp, source SHA-256, format version, record count, and epoch distribution.
- [ ] **[R1]** Preserve an immutable source snapshot manifest for reproducible builds; support manually pinned offline builds.
- [ ] **[R1]** Validate each supported fixed-width schema against current official Lowell astorb reference: 266-column records (excluding line terminators), January 2018 Fortran-format revision, inclinations over 99.99999°, and large semimajor axes using F13.7/F13.8 with optional preceding whitespace; unit-test offsets from authoritative fixtures.
- [ ] **[R1]** Parse numbered designation or provisional designation, name, source epoch, six orbital elements, and metadata needed for stable identity/filtering; preserve normalized raw identifier fields and reject ambiguous identity collisions rather than inventing synthetic matches.
- [ ] **[R1]** Enforce finite numeric values and defensible physical ranges; classify unparseable/non-elliptic records and produce a detailed machine-readable rejection report.
- [ ] Track duplicate identifiers, missing identifiers, unusual eccentricities, out-of-range semimajor axes, and catalog changes.
- [ ] **[R1]** Define stable asteroid identity independent of file record order; preserve designation/number when available.
- [ ] **[R1]** Ensure data creation is deterministic for a pinned source snapshot and converter version, including ordering and float rounding.
- [ ] Stream source parsing from disk rather than storing enormous arrays of objects in Node memory; avoid deprecated Buffer construction.
- [ ] Ensure output files are atomically written and never published partially.
- [ ] **[R1]** Write a converter audit summary: accepted, rejected, duplicates, non-elliptic, samples, min/max values, epoch ranges, total output bytes, hashes.

### 5.1a Stable object identity and lookup/index contract (**must freeze before sharding**)

- [ ] **[R1]** Define `stableObjectId` with an explicitly versioned namespace, preferring a numbered minor-planet designation when available and canonicalized official provisional designation otherwise; document normalization, aliases and identifier collisions.
- [ ] **[R1]** Define per-snapshot `recordKey = (catalogVersion, chunkId, recordIndex)`, which is *not* the same as persistent `stableObjectId` across snapshot rebuilds.
- [ ] **[R1]** Specify **one-to-one** `stableObjectId -> recordKey`, plus a reverse `recordKey -> stableObjectId` table; encode index type, offsets, byte order, checksum, and snapshot version exactly.
- [ ] **[R1]** Create a compact, deterministic metadata index/sidecar keyed to the **same immutable catalogVersion**; lazy-load name/identity indexes, possibly prefix/search partitions, rather than a giant JSON object at startup.
- [ ] Define missing-ID handling: explicit rejected/anonymous source record policy, duplicate numbered/provisional aliases, normalized designation precedence, and collision audit.
- [ ] **[R1]** Test catalog reordering and multi-snapshot transitions: stable identity survives a reordered shard partition, while `recordKey` is regenerated and no stale index is trusted.
- [ ] Define selected-object behavior if the desired shard is not downloaded: resolve identity from index, prioritize fetch, and show an informative loading/unavailable state (never select the wrong point).
- [ ] **[R1]** Keep the bootstrap **disjoint** from bulk shards, and confirm ID uniqueness over the full accepted set (including objects inserted into bootstrap through noteworthy-object priority).

Example *illustrative* data contract:

```ts
type StableObjectId = `number:${number}` | `designation:${string}`;
type RecordKey = { catalogVersion: string; chunkId: string; recordIndex: number };
type IndexEntry = { stableObjectId: StableObjectId; record: RecordKey; name?: string };
```

Do **not** use name strings or array index alone as a stable identity. This schema is an RFC starting point and needs actual source-catalog collision/alias fixtures before freezing.

### 5.2 Proposed catalog v2 format (decision to lock with a small RFC)

**Recommended v2 approach:** a small JSON **manifest** and independent binary shards; each shard has a fixed record size of **24 bytes** for the existing six Float32 orbital fields initially. Move optional names/IDs/classes/uncertainties into sidecar metadata so the core renderer remains efficient. Manifest includes the effective epoch model, units, frame, and record format.

- [ ] Define a manifest `schemaVersion` (structure compatibility), `catalogVersion` (immutable content identity), and `indexVersion`/`accuracyPolicyVersion` where appropriate; pin IDs, indices, URLs and hashes to the *same* catalog snapshot.
- [ ] **[R1]** Include `source.name`, `source.url`, `source.retrievedAtUtc`, `source.sha256`, `createdAt`, `converterVersion`, `referenceFrame`, `timeScale`, **typed** `epochPolicy`, `recordLayout`, `recordCount`, `totalDecodedBytes`, `index` metadata, `accuracyPolicyVersion`, and ordered chunk metadata; avoid invalid placeholder-valued JSON fields.
- [ ] Define endianness as little-endian and exact Float32 order as `M_deg`, `omega_deg`, `Omega_deg`, `i_deg`, `e`, `a_AU` (or choose radians deliberately, versioning the change).
- [ ] **[R1]** Include `recordSize=24` **only when a uniform epoch allows that layout**; otherwise extend/version orbital records or use a validated epoch table. For each shard include `recordCount`, **decoded** `byteLength`, decoded SHA-256, URL, priority, optionally transferred size/encoding, and spatial/classification stats.
- [ ] Record whether all input rows share one epoch; if not, **do not discard per-object epoch**. Either propagate source anomalies to a common epoch with justified numerical validation or version the record/index format to carry epoch per object; do not simply replace distinct epochs with a catalog-level timestamp.
- [ ] Document what is and is not represented by the six orbital floats, particularly designation/identity and uncertainties.
- [ ] Add a **required minimal ID↔recordKey sidecar** for identity and future selection, with optional lazy name/class/uncertainty metadata indexes version-linked to exact chunk ordering.
- [ ] Avoid dumping millions of verbose JSON objects into the initial page download; use paged/compact metadata and load on demand.
- [ ] Produce both a small fixture catalog for CI and a full catalog artifact for production.
- [ ] Document licensing/source citation obligations of source datasets and any added astronomical catalogs.

### 5.3 Order data for progressive visual representativeness

A naïve prefix of the source file is **not** a representative asteroid sample. The startup shard must be selected across the complete catalog, not simply the first N numbered records.

- [ ] Define reproducible deterministic **nested** stratified sampling across orbital populations/parameters (`a`, `e`, `i`, notable groups); use stable object IDs and versioned seeds so lower-detail levels are immutable subsets of higher detail for a given catalog snapshot.
- [ ] Use a stable seed and identity-aware selection; avoid nondeterministic builds or unstable visual jumps.
- [ ] Start with approximately **32,768** representative records (**786,432 bytes; 768 KiB**) in `bootstrap.bin`.
- [ ] Add optional tiny essential-object metadata for notable objects if not included naturally; avoid duplication in the final record set.
- [ ] **[R1]** **Benchmark and choose** early-density shards (candidate `128–512 KiB` decoded) versus bulk shards (candidate `1–3 MiB` decoded), preserving exact 24-byte alignment and a disjoint partition; `131,072 × 24 = 3 MiB` remains a bulk-shard comparison point, not a hardcoded invariant.
- [ ] Verify that the bootstrap set and all shards form a **one-to-one partition of the accepted catalog**: no duplicates, no omissions.
- [ ] Guarantee stable rendering of early points as later chunks arrive; new data should add density, not reorder or teleport existing points.
- [ ] Benchmark bootstrap and early/bulk shard sizes (e.g. 128 KiB, 256 KiB, 512 KiB, 768 KiB, 1 MiB, 1.5 MiB, 3 MiB) under desktop broadband and high-latency/throttled mobile, measuring **time between visible density increments**, hash latency, GPU upload p95, total requests, and cache reuse.

### Example manifest (illustrative, syntactically valid JSON; RFC subject to change)

```json
{
  "schemaVersion": 2,
  "catalogVersion": "lowell-immutable-snapshot-hash",
  "source": {
    "name": "Lowell astorb",
    "url": "https://asteroid.lowell.edu/astorb/",
    "retrievedAtUtc": "2026-10-31T00:00:00Z",
    "sha256": "SOURCE_SHA256_HEX"
  },
  "referenceFrame": "ecliptic-J2000",
  "timeScale": "TT",
  "epochPolicy": { "kind": "uniform", "epochJulianDateTT": 2460000.5 },
  "recordLayout": {
    "endianness": "little",
    "recordBytes": 24,
    "fields": ["M_deg", "omega_deg", "Omega_deg", "i_deg", "e", "a_AU"]
  },
  "accuracyPolicyVersion": "accuracy-policy-v1",
  "recordCount": 1487224,
  "totalDecodedBytes": 35693376,
  "index": {
    "url": "index/objects.bin",
    "format": "identity-recordkey-v1",
    "sha256": "INDEX_SHA256_HEX"
  },
  "chunks": [
    {
      "id": "bootstrap",
      "url": "bootstrap.bin",
      "priority": 0,
      "recordCount": 32768,
      "decodedByteLength": 786432,
      "decodedSha256": "BOOTSTRAP_SHA256_HEX",
      "compression": "none"
    },
    {
      "id": "0000",
      "url": "shards/0000.bin",
      "priority": 1,
      "recordCount": 131072,
      "decodedByteLength": 3145728,
      "decodedSha256": "SHARD_SHA256_HEX",
      "compression": "none"
    }
  ]
}
```

**Cautions:** The example epoch is a **dummy numeric value** for illustrating typed JSON; it must come from the actual catalog and should never be hardcoded into implementation. Example hashes are invalid placeholders, and the `chunks` array is intentionally incomplete. The count is the historical committed binary, **not** the expected count of a newly downloaded source snapshot. If per-record epochs are required, change `epochPolicy` and `recordLayout` together rather than retaining a misleading six-float layout.

### 5.4 Source freshness, snapshot lifecycle, and safe promotion

- [ ] Publish exact `retrievedAtUtc`, `catalogEpochJulianDateTT` **when uniform**, `publishedAtUtc`, conversion SHA/version, date coverage and model validity in both manifest and UI.
- [ ] Establish a release 1 refresh policy: **check upstream for changes at least weekly**; rebuild and publish only after parser, science, integrity and deployment gates pass. Faster source updates are optional, not a guarantee.
- [ ] Document difference among *catalog download date*, *epoch of osculation*, *viewer-selected date*, and *data publication date*; never substitute one for another.
- [ ] Define visible freshness states (current source snapshot, old snapshot, beyond validated propagation interval, source unreachable/unknown) without falsely promising a universal expiry interval.
- [ ] Detect source changes using metadata/checksum and maintain an audit log; require snapshot pinning for reproducible science tests.
- [ ] Stage a new immutable catalog and sidecars, validate in a preview deployment, then switch the small manifest pointer; retain previous version and rollback procedure.
- [ ] Do not continuously rebuild an enormous source catalog in regular lightweight PR CI; use small fixtures for PRs and a separate controlled refresh workflow for production.

### Exit criteria

- [ ] Rebuild produces matching hashes for a pinned source and converter version.
- [ ] Every published shard passes byte-length, record-count, schema, and integrity checks.
- [ ] The manifest fully describes the chosen epoch/frame semantics and all published assets.
- [ ] Bootstrap + all shards exactly cover the catalog with no duplicated object identity.

---

## 6. Phase 5 — Progressive catalog loading, verified reveal, and resilient delivery (**P0**, centerpiece)

### 6.0 Strict streaming contracts: two stages, different integrity guarantees

| Attribute | **Release 1: verified-shard progressive reveal (required)** | **Post-1.0: verified subshard streaming (optional)** |
|---|---|---|
| Earliest scene | Before network/data load | Same |
| Earliest asteroid | **After full bootstrap file has been received, decoded, SHA-256 verified, and uploaded** | After first independently verified small subblock is uploaded |
| Bulk update cadence | When each *whole* independent shard verifies | More often, as subblocks verify |
| SHA verification | Whole-buffer `crypto.subtle.digest` per shard | Independent subblock hashes or Merkle proofs; whole-shard checksum as extra audit |
| Drawn bytes | **Only verified records; never provisional** | Only separately verified subblock records; no unverified provisional display by default |
| Memory bound | Bounded by one or a few in-flight shard buffers + active GPU buffers and staging | Bounded subblocks and backpressure |
| Failure | Discard failed shard; keep previous verified shards | Discard failed subblock; keep prior verified blocks |
| Release blocker? | **Yes** | **No; follow benchmarks** |

**Terminology:** "progressive" in Release 1 means *across independently fetched files while the overall dataset remains incomplete*. Consuming a `ReadableStream` for an updating progress counter is not the same as *showing unverified records from that stream*. Integrity requires received and decoded bytes to be checked before a shard becomes visible.

### 6.1 Product behavior: start rendering before download completes

- [ ] **[R1]** Split app initialization into **renderer startup** and **catalog loading**: do not make `requestAnimationFrame()` conditional on successful full-catalog download.
- [ ] **[R1]** On app startup: initialize canvas and shaders; draw Sun/planets/orbit guides immediately; start animation loop; asynchronously fetch catalog manifest. If a body/planet ephemeris still needs data, draw an explicit reference-axis/guide placeholder rather than inventing a position.
- [ ] **[R1]** After manifest validation: fetch `bootstrap.bin`, verify its **entire decoded SHA-256 and schema**, upload it, and reveal it before any bulk shard; subsequent **verified** independent shards appear progressively while the rest of the catalog downloads.
- [ ] **[R1]** **Release 1:** render bootstrap asteroid records only **after the entire bootstrap file passes length/schema/decoded SHA-256 checks** and the GPU upload is committed. **Optional later:** render individually verified subblocks before the enclosing shard completes; never blur these two acceptance contracts.
- [ ] Continue requesting remaining shards in prioritized order while drawing all currently loaded records.
- [ ] Ensure pause, reverse, camera rotation, zoom, display settings, and search (when available) continue operating during download.
- [ ] **[R1]** Display separate progress indicators for **network bytes**, **parsed/validated records**, **uploaded records**, and **visible records**; never confuse 100% bytes received with completed GPU upload.
- [ ] Show accurate total count and fraction of catalog available; indicate when filters intentionally display fewer points than are loaded.
- [ ] **[R1]** Support partial completion if one chunk fails; keep valid chunks rendered and expose retry.
- [ ] Explicitly distinguish *bootstrap sample*, *partial catalog*, and *complete catalog* states.

### 6.2 Preferred transport: static manifest + independently fetchable shards

- [ ] **[R1]** Use normal same-origin `fetch()` requests for immutable chunk URLs; no API backend required.
- [ ] Prefer static `.bin` shards first; benchmark HTTP content compression at deployment host but do not assume it is available or controllable.
- [ ] **Release 1:** use `fetch()` with `arrayBuffer()` for bounded small shards, or `Response.body.getReader()` solely for per-request network-progress/backpressure while assembling a full shard; **do not publish any records until full verification**. Network read boundaries are arbitrary and not record-aligned.
- [ ] **Optional subshard mode only:** carry 0..23 incomplete bytes across arbitrary stream reads and parse solely complete records after authenticating each independently verified block.
- [ ] Convert only whole, validated records from a **verified shard (Release 1)** or verified subblock (optional); never draw incomplete records, unverified data, or GPU memory that belongs to a failed snapshot.
- [ ] **Optional subshard mode:** coalesce verified small blocks into measured 128–512 KiB-or-smaller aligned upload batches; in Release 1, upload a verified complete shard with budgeted/queued GPU work.
- [ ] Move parsing/hash verification to a dedicated worker **only if main-thread profiling warrants it**; release 1 may use the simpler main-thread path with scheduled uploads. Keep rendering/WebGL on main thread initially. `SubtleCrypto.digest()` accepts a complete ArrayBuffer, not a ReadableStream.
- [ ] Limit concurrent shard requests (initial trial: 2–4); use device/network-aware adaptation and prioritize bootstrap and user-interest shards.
- [ ] **[R1]** Use `AbortController` to cancel obsolete catalog versions or user-initiated reloads without throwing stale errors into current state.
- [ ] **[R1]** Retry failed chunks with bounded exponential backoff plus jitter; never retry corrupt content indefinitely. Validate manifest↔chunk match.
- [ ] Separate download states and rendering states so a stalled network does not stall the animation frame loop.
- [ ] **[R1]** **Mandatory Release 1:** buffer a bounded whole decoded shard, verify declared size, record layout/semantics, and `decodedSha256` via `crypto.subtle.digest`, then schedule GPU upload and draw. Never accept a partial/shard-provisional draw in this mode.
- [ ] **[R1]** **Freeze the integrity decision:** Release 1 uses whole-shard verify-then-render. A separate RFC and PR gate is required for post-1.0 **independently hashed subblocks**; rollback-only provisional rendering is not the preferred design and should not be default.
- [ ] **[R1]** During any shard version/hash mismatch, do not silently mix data from two catalog snapshots.
- [ ] Make network errors (`404`, `5xx`, offline, aborted, truncated, invalid JSON, unsupported schema) recoverable and visible.

### 6.3 GPU storage model and upload lifecycle

**Recommended first implementation:** **one GPU vertex buffer per shard**, sized to that shard, with `uploadedRecordCount` tracked per buffer. This avoids allocating the complete catalog GPU buffer before the initial render, avoids invalid stride tricks, makes rollback straightforward, and costs only approximately one draw call per loaded shard at render time.

- [ ] Define `GpuChunk` state: `id`, `buffer`, `capacityRecords`, `uploadedRecords`, `verified`, `drawEnabled`, `byteLength`, `version`, and lifecycle/disposal flags.
- [ ] **[R1]** Release 1: **allocate GPU buffer only after shard verification** (or reserve safely without enabling draws) using the manifest-validated decoded length; never render unverified capacity.
- [ ] **[R1]** Upload only verified whole records at exact byte offsets; for Release 1 benchmark a single `bufferData`/`bufferSubData` upload versus a bounded per-frame upload queue. Track committed records separately from bytes received; never count records visible until upload finishes.
- [ ] **[R1]** Track the count of records **fully committed to the GPU**, and `gl.drawArrays(gl.POINTS, 0, uploadedRecords)` for each enabled shard.
- [ ] For WebGL 2, use VAOs to bind each chunk's attributes efficiently; for WebGL 1, use carefully controlled attribute pointer binding.
- [ ] Keep stride at 24 bytes for the six-float format; density control must operate on which buffers/records are drawn, **not** on a stride exceeding WebGL limits.
- [ ] **[R1]** Benchmark a one-time verified shard upload against chunked, frame-budgeted GPU uploads (candidate CPU scheduling budget ~1–2 ms/frame, adjustable); upload pauses must not block camera input. Do not assume `bufferSubData` time alone captures driver stalls.
- [ ] Avoid constructing a permanent 34+ MiB JavaScript `Float32Array` in the browser. Use a bounded per-shard staging buffer plus GPU memory.
- [ ] Avoid allocating full-catalog GPU capacity before useful data arrives on low-memory devices.
- [ ] Recreate chunk buffers in order and resume cleanly after WebGL context loss; optionally reuse cached verified bytes to avoid refetch.
- [ ] Provide a memory budget and eviction/LOD policy for devices unable to fit the full dataset.
- [ ] Keep draw-call growth bounded: ~12–16 asteroid chunk draws per frame at current count is an appropriate starting hypothesis, to be measured.

### 6.4 Scheduling, representativeness, visibility, and priority

- [ ] Load bootstrap first; order remaining shards to improve perceived spatial coverage, not merely source record number.
- [ ] Define optional priority categories (visible/selected asteroid family, near-Earth objects, popular named objects) and allow scheduler updates without mixing catalog versions.
- [ ] Make deterministic quality presets (Low/Medium/High/Full) select **stable** catalog subsets; avoid randomly changing visible points between frames.
- [ ] Ensure a user selecting High from Low triggers higher-priority requests for **stable nested LOD tiers**; existing visible records stay fixed and new levels are a strict superset for the same version. If a shard is partly outside a requested tier, define stable intra-shard index ordering or explicit tier grouping.
- [ ] Support deliberate pause/resume of **downloads** separately from pause/resume of **simulation time**.
- [ ] Set a default bandwidth-conservative policy for `saveData`/slow connections; let the user opt into Full catalog.
- [ ] Use document visibility and power-saving signals to throttle rendering and/or prefetch while preserving user intent.

### 6.4a Measurable scheduling and resource ceilings

- [ ] Define default scheduler policy as **bootstrap first, then smaller early-coverage shards, then bulk**, maintaining a bounded number of in-flight requests (candidate 2 on slow connections, 3–4 on fast connections; tune empirically).
- [ ] Define separate `networkBytesReceived`, `decodedBytesVerified`, `gpuRecordsCommitted`, `visibleRecords`, `filteredRecords`, and `catalogTotal` counters; no double-count when retry, abort, or switch snapshot occurs.
- [ ] Establish candidate GPU-upload scheduling budget (1–2 ms CPU time/frame), maximum staging memory (e.g. `2–4 × maximumShardDecodedBytes` pending real-device measurements), and backpressure when queue is full.
- [ ] Measure `T_scene`, `T_bootstrap_verified`, `T_first_asteroid_visible`, inter-shard visibility gap p50/p95, JS blocking duration, GPU upload p95, peak staging/JS/GPU memory, total requests, and transferred bytes.
- [ ] When a browser hints save-data or constrained hardware, default to an explicit smaller detail tier; never hide missing objects behind an unlabeled 'complete' status.
- [ ] Test order-independent completion and long-running playback: no duplicates, corrupted offsets, unbounded retained staging arrays or progressively growing event listeners.

**Release 1 rule:** downloading a bulk shard is concurrent with rendering the *already verified* bootstrap and earlier shards; the current bulk shard is not visible until its own validation succeeds.

### 6.5 Compression, range requests, and advanced transports (incremental, optional)

- [ ] Measure actual CDN/GitHub Pages response headers, transfer sizes, cache behavior, and content encodings before choosing compression.
- [ ] If shipping raw `.bin.gz` shards, specify encoding explicitly and test actual response headers; when served as raw gzip bytes, decode via `DecompressionStream("gzip")` where supported and use a vetted permissive fallback only if justified. **Hash the canonical decoded byte sequence** matching `decodedByteLength`/`decodedSha256`; optionally also hash transfer bytes separately.
- [ ] **Do not decompress twice:** if a server serves a file with `Content-Encoding: gzip`, Fetch ordinarily exposes an already-decoded response body; coordinate packaging/header behavior and tests.
- [ ] Keep shards independently decompressible; a gzip stream that spans the whole catalog defeats random shard retrieval and rollback. `fetch()` often exposes already decompressed data when the server uses `Content-Encoding`; test header behavior before choosing path.
- [ ] Compare uncompressed `.bin`, gzip and Brotli/zstd where actually supported by target browsers/host; choose on measured bytes+CPU+first-asteroid latency, not compression ratio alone.
- [ ] If trying HTTP Range requests for a monolithic legacy binary, require a verified `206 Partial Content` response and correct `Content-Range`; handle `200 OK` as a full response without duplicating data. Range support is **not** a deployment assumption.
- [ ] Prefer immutable URL/versioned shard directories and a small current-manifest pointer for cache safety.
- [ ] Optional service worker: cache the manifest and selected verified shards; enforce storage budgets and version-safe cleanup. Do not require offline support for first release.

### 6.6 Example lifecycle (behavioral pseudocode)

```ts
startRenderer();
startAnimationLoop();                    // Does not depend on asteroid fetch success.

const manifest = await loadAndValidateManifest();
const session = createCatalogSession(manifest.catalogVersion);

// Release 1: no bootstrap record becomes visible until whole-file verification.
const bootstrap = await fetchVerifyDecode(manifest.bootstrap, manifest, session);
await gpuCatalogStore.uploadWithFrameBudget(bootstrap, session);
gpuCatalogStore.enableVerifiedChunk(bootstrap.id, session);
updateCoverageAndProgress();

// Independent files can download concurrently; a completed file is published
// only after full decoded-byte integrity checks and a committed GPU upload.
await runBoundedShardQueue(manifest.shards, {
    concurrency: chooseConcurrency(),
    session,
    onVerifiedChunk: async (shard) => {
        if (!session.isCurrent()) return; // Prevent stale snapshot publication.
        await gpuCatalogStore.uploadWithFrameBudget(shard, session);
        gpuCatalogStore.enableVerifiedChunk(shard.id, session);
        updateCoverageAndProgress();
    },
    onChunkError: (err, meta) => reportRecoverableFailure(err, meta),
});
```

**Optional verified-subblock mode (post-1.0):** split each chunk into independently hashed record-aligned blocks (or use a validated Merkle root/proof scheme), verify each block **before** GPU upload, carry incomplete records across raw network reads, and keep exactly version-linked block offsets. `crypto.subtle.digest()` cannot hash a stream directly; an independently vetted incremental hash can be considered but does not by itself authenticate a prefix against a whole-file hash. Provisional rendering/rollback is an experimental alternative, never the Release 1 contract.

### Exit criteria (mandatory automation)

- [ ] **[R1]** **First scene appears before the first asteroid data fetch finishes.**
- [ ] **[R1]** **First asteroids appear after verified bootstrap download, substantially before the full catalog completes**, under specified network throttle profiles; never promise sub-bootstrap-byte rendering in Release 1.
- [ ] Confirm 25%, 50%, and 75% catalog states are visibly populated and fully interactive.
- [ ] Artificially split network responses at every possible byte offset around record boundaries (including 1-byte reads); parser never corrupts records.
- [ ] Network disconnect, one missing shard, checksum mismatch, retry, cancel, and reload preserve valid existing rendering without deadlocks.
- [ ] Memory is bounded by configured shard staging + active GPU buffers, rather than two or more mandatory full-copy raw catalogs.
- [ ] Final record counts exactly equal manifest counts on successful completion.
- [ ] **[R1]** Production GitHub Pages preview serves the manifest and every shard at expected base-path-aware URLs.

---

## 7. Phase 6 — GPU shader and numerical performance (**P1**, measure first)

- [ ] **[R1]** Establish CPU/GPU timing baselines for isolated asteroid-only rendering and full application.
- [ ] **[R1]** Port shaders to GLSL ES 3.00 for the WebGL 2 path while keeping a known-good WebGL 1 implementation where supported.
- [ ] Replace `mediump` astronomical intermediate math with well-tested high precision and appropriately scaled variables; use CPU Float64 for source epoch/time calculations.
- [ ] **[R1]** Use orbital-plane formulation and precomputed orientation factors where profiling confirms a win over repeated sine/cosine for `ω`, `Ω`, and `i` per vertex.
- [ ] Compare data variants: existing 24-byte records versus enriched/preprocessed orientation data; account for bytes downloaded, GPU memory, shader cost, cache bandwidth, and mobile hardware.
- [ ] Investigate optional compact/quantized catalogs **only** after a documented per-field error-budget analysis; never silently sacrifice angular/position precision merely to reduce payload bytes.
- [ ] Compare fixed ten-step Newton iteration with bounded adaptive/hybrid solver approximations; never lower iteration counts solely for speed without CPU/GPU error verification across eccentricities.
- [ ] Avoid NaN/Inf propagation from invalid orbital elements; exclude or classify unsuitable records at conversion time.
- [ ] Reduce wasted vertex varyings and remove unused shader computations per chosen color mode when worthwhile.
- [ ] Replace heuristic resonance calculations in the scientific path; avoid expensive `exp`/`pow` work for all asteroids unless a selected visualization specifically needs it.
- [ ] Move small planet, dwarf, and moon updates to reusable CPU typed arrays and `bufferSubData` rather than allocating new arrays each frame.
- [ ] Precompute orbital-label sample positions / nearest anchors where possible; current label updates repeatedly solve many Kepler positions every animation frame.
- [ ] Update label positions only on significant camera changes or at a bounded UI frequency, not at full frame rate.
- [ ] Reduce redundant GL uniform/attribute state changes and bind operations; use WebGL 2 VAOs.
- [ ] Do not overdraw orbital guide paths at maximum density/opacity; benchmark line rendering cost.
- [ ] Investigate multi-sample trails with render targets instead of repeating full asteroid draws if three-pass blur becomes a bottleneck.
- [ ] Support stable downsampling by draw count or precomputed LOD tiers; never shader-discard millions of vertices when lower bandwidth/draw counts can avoid the work.
- [ ] Optionally benchmark shader `sin`/`cos` and phase normalization variants across mobile and desktop GPUs.

### Exit criteria

- [ ] No numeric regressions outside explicitly documented tolerance.
- [ ] Each optimization has before/after measurements and a hardware/platform note.
- [ ] Complexity added to shaders is justified by measured end-to-end benefit, including network+memory impact.

---

## 8. Phase 7 — Adaptive quality, rendering lifecycle, and performance observability (**P1**)

- [ ] Define named quality profiles: **Auto, Battery Saver, Balanced, High, Full Catalog**; make overrides understandable.
- [ ] **[R1]** Track moving frame-time percentiles and adapt DPR, number of **already verified, stable LOD** asteroid records, point size, guide visibility, and blur with hysteresis; avoid oscillation, network re-fetches, or reshuffling selected IDs.
- [ ] Set target budgets **subject to device benchmarks**: desktop ~60 FPS; constrained mobile ~30–60 FPS; stable interaction more important than visual density.
- [ ] **[R1]** Define quality caps from actual WebGL capability queries, precision support, observed allocations/frame time and optional coarse device hints; **do not require `navigator.deviceMemory`** (limited support and intentionally imprecise). Treat absent device hints as normal.
- [ ] Cap DPR on high-resolution phones by default; prioritize readability and smoothness over filling every physical pixel.
- [ ] Pause or throttle `requestAnimationFrame` when document is hidden, canvas has zero size, or browser has paused animation; handle time catch-up explicitly.
- [ ] Add an FPS/CPU-frame-time overlay and GPU timer query where supported; avoid presenting CPU frame duration as GPU time.
- [ ] Add frame-time percentiles, catalog network throughput, parse time, hash time, GPU upload time, loaded record count, visible record count, and draw-call count.
- [ ] Provide a diagnostics export (JSON) with no personal/user-identifying information by default.
- [ ] Benchmark desktop integrated/discrete GPUs and Safari/Chrome/Firefox across mobile hardware; do not infer WebGL compatibility from one Chromium run.
- [ ] Add controlled synthetic limits for 10k, 100k, 500k, 1M, 2M, and future larger catalogs.
- [ ] Define no-allocation or bounded-allocation goals for hot-path render functions; profile GC pauses.
- [ ] Consider offscreen rendering/worker WebGL only after cross-browser support and measured main-thread contention justify it.

### Exit criteria

- [ ] Auto quality avoids sustained severe frame drops in the target device matrix.
- [ ] Profiling reveals whether bottlenecks are download, JS parse, GPU upload, vertex arithmetic, blending/fill, or DOM labels.
- [ ] Performance diagnostics can be reproduced from an automated benchmark harness.

---

## 9. Phase 8 — Interaction, UX, accessibility, and polished application behavior (**P1/P2**)

### 9.1 Application shell and loading UX

- [ ] Replace the overwhelming flat control row with a responsive layout: compact primary toolbar plus collapsible panels for **Time**, **Display**, **Objects**, **Layers**, **Performance**, and **Help**.
- [ ] Use dark astronomical canvas by default or let saved settings choose it; keep high-contrast readable controls.
- [ ] Keep the canvas usable while loading; do not place a full-screen modal spinner over an interactive scene.
- [ ] Add discreet bottom-corner progress bar: e.g. `Loading asteroid catalog: 420,000 / 1,487,224 (28.2%)`; show loaded/visible separately.
- [ ] Show `Fast preview ready`, `Full catalog loading`, `Partial dataset`, and `Complete` clearly.
- [ ] Provide **Pause download**, **Resume**, **Retry failed chunks**, and **Reduce data usage** where relevant.
- [ ] Offer explicit data usage and total approximate download size before opting into full catalog on constrained networks.
- [ ] Show nonblocking notifications for asset failures and recovery, while continuing to render valid data.
- [ ] Add an initial first-use hint with mouse, trackpad, touch, and keyboard controls; make it dismissible and rediscoverable.

### 9.1a Mandatory early UI slice (ship with progressive-loading MVP)

- [ ] **[R1]** Show a compact, nonblocking catalog stage indicator: `Scene ready` → `Bootstrap downloading` → `Bootstrap verifying` → `Asteroids visible` → `Filling catalog` → `Complete` / `Partial`.
- [ ] **[R1]** Provide understandable *visible objects / verified loaded objects / total objects* counts, and a distinct transfer progress (when total transferred bytes are known).
- [ ] **[R1]** Expose **Preview / More asteroids / Full catalog** and an understandable optional data-usage estimate; support pause downloads separately from pause simulation.
- [ ] **[R1]** Show absolute display date, source catalog epoch and age, model label (two-body approximation), and an accuracy caveat at all times, including incomplete loading.
- [ ] **[R1]** Keep mobile controls touch-accessible and keyboard actions single-fire, with a brief, dismissible camera/zoom hint. Treat these as **Release 1** UX, not deferred polish.


### 9.2 Camera and time controls

- [ ] Support orbit, smooth zoom, pan, focus target, home reset, and camera presets: Top-down ecliptic, Edge-on, Inner Solar System, Asteroid Belt, Jupiter Trojans, Kuiper Belt.
- [ ] Implement camera inertia carefully and offer a reduced-motion off switch.
- [ ] Support mouse, trackpad, touch/pinch, stylus, keyboard, and optionally gamepad based on platform testing.
- [ ] Use Pointer Events where appropriate to reduce duplicated mouse/touch code and handle pointer cancellation.
- [ ] Add camera bookmark/share state and smooth fly-to animation with sensible min/max zoom.
- [ ] Add a timeline with absolute UTC date, epoch jump, now, step, pause, reverse, and logarithmic playback speed controls.
- [ ] Show elapsed simulation time and time scale in understandable units (e.g. `30 simulation days / real second`) rather than only a raw multiplier.
- [ ] Show a scientific accuracy caveat when the requested date exceeds the catalog's supported propagation window.
- [ ] Support scrubbing without accumulating unbounded time error.

### 9.3 Object exploration

- [ ] Implement GPU/CPU-assisted picking for Sun, planets, dwarf planets, and notable asteroids; click/tap selection should produce a clear focus outline.
- [ ] Add searchable asteroid ID/name/designation metadata via a compact lookup index, with loading state for records not yet cached.
- [ ] Show inspector card: object name/designation, source, epoch, semimajor axis (AU), eccentricity, inclination, orbital period, perihelion/aphelion distances, and a quality caveat.
- [ ] Optional persistent selected-object orbit line, labeled perihelion/aphelion/nodes, and side-by-side comparison.
- [ ] Focus/select an object whose shard has not downloaded yet by prioritizing the required shard when index metadata permits.
- [ ] Add scientific legend explaining each color mode and units; no unexplained red/green heatmap.
- [ ] Show data completeness and query/filter coverage when not all shards are present.

### 9.4 Accessibility and international usability

- [ ] Remove `maximum-scale=1`/`user-scalable=no` constraints that unnecessarily block accessibility zoom; ensure canvas touch gestures do not break page controls.
- [ ] Make controls reachable via keyboard with visible focus, semantic labels, ARIA expanded states, meaningful shortcuts, and no duplicate shortcut event handling.
- [ ] Avoid using color alone to convey orbital categories and enable color-vision-deficiency-friendly palettes.
- [ ] Do not set aggressively updating frame/status text as continuously announced `aria-live`; throttle summaries and use polite status for major transitions.
- [ ] Respect `prefers-reduced-motion`, `prefers-contrast`, and device settings as appropriate; provide manual overrides.
- [ ] Increase touch-target size, ensure safe-area spacing, and verify landscape and portrait layouts.
- [ ] Provide keyboard-usable alternatives for camera/orbit operations where possible.
- [ ] Use units, timezone, and locale consistently; explicitly label AU, kilometers, Julian date, UTC, and simulation date.
- [ ] Save preferences locally without requiring identity, analytics, or external services.

### Exit criteria

- [ ] Core controls are functional during partial loading and from keyboard/touch.
- [ ] A first-time user can understand date, scale, source, current view, and completeness without reading the README.
- [ ] Accessibility smoke checks pass and manual keyboard/screen-reader test findings are documented.

---

## 10. Phase 9 — Scientific exploration, filters, and analysis features (**P2**)

- [ ] Add layers for major planets, dwarf planets, moons, numbered/un-numbered asteroids, main belt, near-Earth objects, Trojans, Hildas, and additional populations where classification is grounded in source data.
- [ ] Add numerical filters for semimajor axis, eccentricity, inclination, perihelion/aphelion distance, absolute magnitude (if source contains it), and designated orbital family.
- [ ] Show a compact histogram/scatterplot for the selected catalog subset, including sample-vs-full completeness.
- [ ] Add color modes for orbital inclination, eccentricity, semimajor axis, approximate period, source classification, and uncertainty where available.
- [ ] Mark mean-motion resonances in a scientifically explained way; do **not** synthesize resonant libration as if it were an accurate gravitational integration.
- [ ] Add specific educational views for the Kirkwood gaps, Jupiter Trojan populations, resonances, and inclined/retrograde orbits.
- [ ] Allow an asteroid-versus-planet comparison inspector, including orbital size and period.
- [ ] Provide orbit-only/position-only overlays and a way to distinguish heliocentric positions from plotted osculating paths.
- [ ] Optionally precompute known close-approach events from authoritative ephemeris data; do **not** declare collision risk by nearest projected pixel distance.
- [ ] Add export of selected object parameters to CSV/JSON with source and date provenance.
- [ ] Allow shareable URL state for selected object, time, camera, visible layers, and rendering mode; validate URL input size and range.
- [ ] Add guided tours: asteroid belt basics, inner solar system, resonances, near-Earth objects, and 3D inclination.
- [ ] Add optional side-by-side comparison of data snapshots, showing newly added/removed or changed orbital solutions with appropriate caveats.

### Exit criteria

- [ ] Every filter has documented semantics and correct counts, even during partial loading.
- [ ] A selected object's displayed elements and metadata refer to the correct immutable catalog snapshot.
- [ ] Scientific/educational labels avoid misleading claims about accuracy and future trajectories.

---

## 11. Phase 10 — Visual quality and cinematic presentation (**P2**)

- [ ] Provide physically inspired, non-misleading point sprite appearance (soft antialiasing, limited glow) with selection highlighting.
- [ ] Separate *physically scaled* from *visually exaggerated* body radius modes; label exaggeration in the UI.
- [ ] Add quality-tiered orbit guide styles, opacity, dashed/solid distinctions, and depth cueing.
- [ ] Tune additive blending/depth tests deliberately so points do not vanish or over-brighten unpredictably; document tradeoffs.
- [ ] Offer dark/night/neutral themes and palettes with clearly named visualization semantics.
- [ ] Consider a simple Milky Way/starfield backdrop as an **optional illustrative layer**; do not confuse it with a precise celestial sphere.
- [ ] Improve point-size behavior with DPI, zoom, and frame scaling; cap extreme sizes.
- [ ] Add a Sun treatment that remains visible and legible at wide AU ranges without pretending the stylized halo is to physical scale.
- [ ] Support screenshot capture with optional overlays, watermark/source text, and display date/catalog version.
- [ ] Refine cinematic mode, camera tour presets, smooth transitions, and optional trails; respect reduced motion.
- [ ] Benchmark any postprocessing before making it a default on mobile.

---

## 12. Phase 11 — Offline behavior, caching, reliability, and security (**P1/P2**)

- [ ] **[R1]** Version all static data paths to prevent mixing new manifest metadata with stale shards on CDN/browser caches.
- [ ] **[R1]** Use integrity checks for **decoded** whole shards in Release 1 and separately authenticated subblocks if added later; reject corrupt/truncated data before GPU publication, retain healthy prior chunks, retry with bounded policy.
- [ ] Avoid `innerHTML` for untrusted catalog names, source metadata, or URL state; use text nodes/validated URLs.
- [ ] Audit the local screenshot file server for path traversal or prefix-bypass issues before reusing it beyond CI; prefer Vite preview or a proven static server.
- [ ] Use a restrictive CSP compatible with the final shader loading strategy and GitHub Pages capabilities; document any unavoidable inline styles/scripts.
- [ ] Keep same-origin fetches for catalog data where possible; document CORS assumptions when adding CDN mirrors.
- [ ] Avoid unnecessary analytics, cookies, trackers, external requests, or collection of user information; keep telemetry opt-in if added.
- [ ] Provide graceful renderer fallback when WebGL is absent (readable explanatory page and optionally static diagram), without a blank screen.
- [ ] Detect and recover from lost graphics context; test via `WEBGL_lose_context` where supported.
- [ ] Optionally register a service worker to cache the app shell, bootstrap, and user-requested shards; enforce quotas and remove outdated versions.
- [ ] For an offline mode, make **which snapshot and which subset are cached** visible; never claim an offline full catalog if only bootstrap is stored.
- [ ] Define behavior for low storage, quota exceeded, private browsing, intermittent connections, and browser eviction.
- [ ] Add clear error dialogs for unsupported manifest versions, WebGL errors, and 404 deployments.
- [ ] Keep catalog update process reproducible and auditable; no runtime direct fetch of unbounded untrusted upstream raw catalogs.

---

## 13. Phase 12 — Automated quality, mathematical tests, CI, and release gates (**P0/P1**, continuous)

### 13.1 Unit and scientific correctness

- [ ] **[R1]** Test file parsing against official fixed-width sample records and real current records; validate line terminators, missing fields, invalid numerics, and incorrect column count.
- [ ] **[R1]** Test determinism and complete partition of every shard; enforce stable ID mapping and no duplicate records.
- [ ] Test low-level shader buffer layout against manifest schema/endianness/record size.
- [ ] Add reference orbital fixtures across circular, low-e, high-e, inclined, retrograde, negative-time, and catalog-epoch cases.
- [ ] **[R1]** Verify orbital period consistency, frame transformations, and Kepler residuals.
- [ ] **[R1]** Test JPL planet-angle transformations and dated comparison cases; explicitly test Earth's `L` is not mistaken for `M`.
- [ ] **[R1]** Test precision over the declared date window and report max/median errors rather than using only exact-value snapshots.
- [ ] Verify warning transitions outside the validated epoch horizon.

### 13.2 Streaming/fault-injection

- [ ] **[R1]** Test manifest load states: malformed JSON, wrong version, 404, zero records, excessive catalog count, duplicate chunk IDs, path traversal, and invalid checksum format.
- [ ] Test arbitrary network fragmentation: split records at offsets 1–23, deliver very small and variable chunks, truncate at EOF, and reject trailing incomplete records.
- [ ] Test `Response.body === null` fallback when streaming is unavailable.
- [ ] Test out-of-order shard completion, duplicate responses, retries, cancellation, resume, and catalog version replacement.
- [ ] **[R1]** Inject one corrupt chunk; ensure unaffected chunks remain visible, failed chunk is not counted as complete, and retry clears the failure.
- [ ] Confirm loaded/visible/total statistics are internally consistent in all states.
- [ ] Test mid-load user interactions and all buttons without stopping animation.
- [ ] Test `200` vs `206` paths if legacy Range support is introduced; no incorrect offset or duplicate data.
- [ ] Test compressed-content handling separately for raw gzip objects and server `Content-Encoding`-compressed resources.

### 13.2a Required streaming acceptance matrix and distinction

| Scenario | Release 1 expected behavior |
|---|---|
| All asteroid requests blocked | Immediate interactive scene remains visible, no fake asteroid positions |
| Bootstrap 1 byte short or hash changed | No bootstrap asteroids drawn; recoverable error and retry |
| Bootstrap successfully verified | Full representative bootstrap becomes visible, while bulk loading continues |
| One bulk shard stalled | Previously verified records remain animated; UI shows missing count |
| One bulk shard returns corrupt bytes | Whole shard rejected; no provisional GPU visibility |
| 25%, 50%, 75% of **verified** records | Correct loaded/visible counters and animated visible distribution |
| Two shards finish out of order | Valid independent IDs/offsets, no duplication or wrong record selection |
| User pauses downloads, not simulation | Animation keeps running while requests stop cleanly |
| Catalog pointer changes during session | Existing snapshot stays internally version-consistent, or complete validated version switch occurs |
| Context loss during verified bulk downloads | Verified resources reconstructed, no double uploads or lost coverage |
| Later authenticated subblocks | Separate tests for all 1..23 byte boundary splits; **not required for Release 1** |

**Definition:** A network download's reported `response.body` progress, a decoded/verified shard's publication, and a visible point's contribution are three distinct asynchronous milestones. Smoke tests should assert all three instead of only `fetch()` completion.

### 13.3 WebGL and browser integration

- [ ] Test shader compile/link and GL state errors on WebGL 1 and WebGL 2 paths.
- [ ] Test focus and keyboard behavior on canvas, window, and controls to prevent double dispatch.
- [ ] Test repeated density changes beyond previous stride limit, device resize, DPR changes, orientation changes, and full-screen transitions.
- [ ] Test simulated context loss/restoration before load, during partial load, and after full load.
- [ ] Test progress and first-visible-asteroid states under network throttling.
- [ ] Test reduced-motion, zoom accessibility, aria labels, touch navigation, and dark/light contrast.
- [ ] Add rendering snapshots with documented nondeterministic tolerance and a WebGL capability report.
- [ ] Cross-browser smoke matrix: Chromium, Firefox, WebKit; manual or hosted-device coverage for desktop Chrome/Safari/Firefox and iOS/Android browsers.

### 13.4 Performance and production

- [ ] Collect device-specific benchmarks and track regressions rather than enforcing one universal GPU time across CI machines.
- [ ] Establish budgets for initial JS/CSS, manifest size, bootstrap bytes, time-to-first-scene, time-to-first-asteroids, RAM peak, draw calls, p95 frame time, and total static-data transfer.
- [ ] Consider initial *candidate* goals: shell first frame <1 s on representative desktop broadband, bootstrap visual <3 s, ~60 FPS desktop / 30–60 FPS adaptive mobile; revise against empirical targets and network profiles.
- [ ] **[R1]** Enforce CI tests for `npm ci`, lint, format, TypeScript, unit, science, integration, browser smoke, production build, and built-artifact existence.
- [ ] Verify the actual generated `dist` contains manifest + every expected shard and that all URLs load with the GitHub Pages repository base path.
- [ ] Fail deployment on mismatched hashes, missing shards, missing index HTML, empty catalog, or first-asteroid render timeout.
- [ ] Save benchmark and screenshot artifacts on CI/PR; use targeted workflow cache, not stale source datasets hidden inside caches.

---

## 14. Phase 13 — GitHub Pages build, deployment, provenance, and release management (**P0/P1**)

- [ ] **[R1]** Set an explicit Vite `base` appropriate for `/asteroid-orbit-3d-webgl/` or verify that the current relative `./` approach behaves correctly on every page and asset URL; do not assume generated URLs work when opened directly.
- [ ] **[R1]** Use Vite `publicDir` or explicit data-copy output to package `catalog/<version>/manifest.json` and all `.bin` shards; hard-coded `temp/astorb3d.bin` is no longer the only runtime data asset.
- [ ] **[R1]** Use `import.meta.env.BASE_URL` consistently for programmatic data URL construction; avoid accidental site-root absolute paths on GitHub Pages.
- [ ] Keep deployable catalog shards immutable and a lightweight version pointer/manifest that can be updated atomically.
- [ ] **[R1]** Create a GitHub Actions workflow for clean install, data validation, typecheck/lint/tests, production build, browser smoke test, and Pages deployment.
- [ ] Test release under `vite preview` and actual GitHub Pages (different headers and base-path behavior can matter).
- [ ] **[R1]** Define a clear catalog update workflow: fetch/verify source → convert → validate → publish new immutable directory → test → switch current pointer.
- [ ] Decide whether large binary artifacts belong in Git history, Git LFS, GitHub release assets, an object store/CDN, or deployment artifacts; evaluate GitHub Pages publication/repository limits, caching, and bandwidth before scaling.
- [ ] **[R1]** Add provenance panel, source citation, changelog, known limitations, license inventory, and contributor/developer instructions.
- [ ] Provide upgrade/rollback procedures that keep the previous known-good manifest and chunks addressable.
- [ ] Add a release checklist and automated rollback/feature-flag approach for the new loader/renderer.

### 13.1 Cost, hosting, and freshness policy

- [ ] Track publish directory size (GitHub Pages published-site limit **1 GB**), deployment duration and static requests; fail early before a deployment can exceed supported limits.
- [ ] **[R1]** Estimate monthly traffic using `monthlyTransfer = fullLoadSessions × averageBytesFetchedPerSession + partialLoadSessions × theirAverageBytes`; benchmark gzip/cache and default tier usage. GitHub Pages documents a **soft 100 GB/month bandwidth limit**, so do not model it as unlimited free CDN traffic.
- [ ] Include an initial scenario: 3,000 uncached downloads of the existing 35,693,376-byte dataset alone transfer ~107.1 GB (before the HTML/JS/index and protocol overhead), near/above the documented soft monthly limit. Refresh with measured *transferred* bytes rather than raw bytes.
- [ ] Define a trigger for migrating large immutable shards to a suitable CDN/object store (sustained soft-limit risk, catalog growth, or unacceptable latency), leaving the app shell eligible for GitHub Pages.
- [ ] Verify the source update workflow and visible freshness date at least weekly; pin old immutable snapshot for rollback and scientifically reproducible comparisons.
- [ ] Test asset URLs and hashes on a real repository-subpath deployment, not just local Vite preview; use `import.meta.env.BASE_URL` for generated runtime fetch URLs.


### Exit criteria

- [ ] A clean clone, one reproducible build, and one tested Pages deployment are sufficient to reproduce the interactive application and its catalog.
- [ ] A failed dataset update does not corrupt the currently deployed catalog or strand clients with a mismatched manifest.

---

## 15. Phase 14 — High-value future scientific and rendering extensions (**P3**, not blocking 1.0)

- [ ] For selected bodies, add authoritative precomputed ephemeris samples with interpolation, uncertainty and timescale provenance instead of long-range unperturbed extrapolation.
- [ ] Explore a **hybrid** system: bulk GPU two-body propagation for overview; higher-accuracy CPU/SPICE/Horizons-derived path for selected or near-Earth objects when appropriate.
- [ ] Explore numerically integrated perturbations from major planets for a *small selected subset* using a validated integration engine; do not call this a full-catalog N-body simulation.
- [ ] Add historical catalog snapshots and explain how revised observations change osculating elements.
- [ ] Consider lightweight data products for known asteroid families, resonance groups, and taxonomy.
- [ ] Add optional approximate asteroid physical sizes/brightness only where backed by actual source data; otherwise clearly mark procedural scaling.
- [ ] Evaluate WebGPU compute and render pipelines in a separate benchmark branch, preserving WebGL fallback and measuring total benefits.
- [ ] Consider multi-resolution catalogs for tens of millions of objects, spatial/bin indexes, view-dependent request priorities, and GPU frustum/tile-based selection.
- [ ] Add WebXR/immersive exploration only after desktop/mobile correctness and accessibility are established.
- [ ] Explore educational overlays for orbital transfer geometry, gravitational influence, or other phenomena with model assumptions prominently documented.

---

## 16. Reference measurements, quantitative targets, and release definitions

### 16.1 First-release budgets (provisional targets; validate empirically)

| Metric | Proposed initial target | Measurement / qualification |
|---|---|---|
| First scene | <1 s on representative desktop broadband after document ready | Does **not** depend on catalog transfer |
| First asteroids | Candidate <3 s on representative desktop broadband | **Only after full bootstrap hash verification/upload**, not within unfinished bootstrap; throttle tests separately |
| Bootstrap transfer | ~768 KiB raw | ~32,768 × 24 bytes; compression optional |
| Shards | Early candidates 128–512 KiB; bulk candidates 1–3 MiB decoded | Benchmark visible-update cadence, hashes, and requests; sizes not fixed in contract |
| Complete old snapshot | 1,487,224 objects, ~34.04 MiB raw | Current frozen sample only; live source count may grow |
| Desktop rendering | ≥60 FPS when hardware supports | At defined resolution/quality; report p95 frame time |
| Mobile rendering | adaptive 30–60 FPS | Test real browsers, power/thermals; no universal guarantee |
| Unnecessary full JS catalog copy | zero required | Bounded per-shard staging + GPU buffers |
| Runtime duplicate IDs | zero | Manifest-converter identity validation |
| Partial-record drawing | zero | Byte-aligned upload logic and tests |
| Silent data/version corruption | zero tolerated | Hash/schema validation, retry, explicit errors |
| Science validation | documented numerical + physical error budgets per model/window | CPU solver, GPU approximation, planet ephemerides and asteroid two-body propagation are distinct tests |

### 16.1a Six release acceptance gates and evidence

| Gate | Completion condition | Required proof |
|---|---|---|
| **G1 Stable app** | Known keyboard/stride/error/shader issues fixed; first scene independent of catalog | Automated focus/stride/WebGL smoke + network-blocked first scene |
| **G2 Scientific baseline** | Modern Lowell parser works; JPL planet angle/time/frame conventions correct; documented tolerance matrix | Official 2018/modern parser fixtures, Kepler reference test vectors, source/date warnings |
| **G3 Reproducible data** | Versioned immutable manifest, epoch policy, disjoint bootstrap/shards and stable identity index | Rebuild SHA repeatability, exact ID↔record bijection and no missing/duplicate records |
| **G4 Progressive MVP** | Verified bootstrap visible first; later verified shards added while rendering remains responsive | Throttled network capture, hash corruption/retry tests, per-shard GPU commit count |
| **G5 Deployment/UX** | Real Pages deployment loads data and UI explains completeness/date/model; accessible essential controls | Subpath URL smoke, keyboard/mobile checks, source age and bandwidth affordances |
| **G6 Release reliability** | Regression/science/perf gates, rollback and freshness policy documented | Signed-off CI matrix, scenario report, reproducible release artifact and rollback dry run |

**Strict Release 1 stop condition:** G1–G6 must pass. Advanced subshard byte assembly, worker pipelines, service worker offline caching, WebGPU and polished guided exploration are **not** G1–G6 prerequisites.


### 16.2 “Definition of done” for every PR

- [ ] Scope is small enough to review; breaking schema changes have versioning and migration instructions.
- [ ] The code path is tested and benchmarks are included for performance changes.
- [ ] The change does not regress deterministic scientific test vectors or secretly substitute illustrative physics.
- [ ] `npm ci`, typecheck, lint, format check, tests, build, and relevant browser smoke tests pass.
- [ ] Screenshots or a short screen recording accompany meaningful visual/UX changes.
- [ ] Docs, README, agent instructions, manifest schema, and release notes are updated when the public contract changes.
- [ ] Resource ownership and error/cancel/retry paths are covered, especially for WebGL and streaming.
- [ ] No unnecessary new runtime dependencies or restrictive licenses.
- [ ] The application works from a production preview with a realistic **subpath** base URL.

### 16.3 Recommended milestone sequence (go/no-go gates)

1. **G1 — Stable application:** baseline, keydown/stride fixes, WebGL precision/errors, independently starting render loop.
2. **G2 — Scientific baseline:** validated 2018+ Lowell parser, consistent planet times/angles/frames, reference solver, published numeric-versus-physical error budgets.
3. **G3 — Reproducible data:** catalog schema/epoch/identity RFC, representative nested LOD bootstrap, immutable verified shard/index outputs, freshness metadata.
4. **G4 — Progressive verified reveal:** manifest-driven scheduler, whole-shard SHA verification, per-shard GPU draws, accurate progress and partial-failure handling.
5. **G5 — Deploy and basic experience:** real GitHub Pages subpath, core accessibility, minimal date/completeness/quality UI and transfer policy, mobile checks.
6. **G6 — Release hardening:** science/browser/integrity/low-bandwidth tests, performance budgets, refresh/rollback and source documentation.

**Post-1.0 tracks:** advanced verified subblocks (only if measured), worker/codec evaluation, rich explorer/search/filters, camera polish, shader and frame-loop profiling, offline caching and precision-object inspection.

### 16.4 Suggested **31 scoped pull requests + one follow-up epic** (32 planning entries)

| PR | Work unit | Depends on | Independent proof / gate |
|---|---|---|---|
| 01 | Baseline commands, source inventory, current binary/Pages asset audit | None | CI artifact baseline; G1 |
| 02 | Focused keyboard double-dispatch/input regression fix | 01 | One keydown = one action; G1 |
| 03 | Remove invalid vertex stride and add deterministic legacy draw-count cap | 01 | 10 density toggles, zero GL errors; G1 |
| 04 | Shader `highp`, capability checks, failure overlays | 01 | GPU shader precision tests; G1 |
| 05 | Defensive legacy fetch, GL lifecycle/context loss, screenshot wait fix | 01 | Fault-injected smoke; G1 |
| 06 | Decouple render loop from all asteroid network promises | 02–05 | Scene while all catalog URLs blocked; G1 |
| 07 | Strict CPU Kepler reference solver + invariants | 01 | Fixture/oracle residual suite; G2 |
| 08 | Astronomical time, frame and epoch value types | 07 | UTC/TT cases, angle wrapping; G2 |
| 09 | JPL planet/EMB table and formula correction | 07–08 | Dated Horizons comparisons; G2 |
| 10 | Remove illustrative resonance perturbations from scientific default | 07 | Exact unmodified propagation fixture; G2 |
| 11 | Lowell 2018+ parser fixtures and field offsets | 01 | 266-column/large-a/high-i tests; G2 |
| 12 | Scientific error-budget report and UI policy skeleton | 07–11 | CPU/GPU/physical errors separated; G2 |
| 13 | Catalog schema/epoch/identity RFC (`schemaVersion`, `catalogVersion`) | 08,11 | Reviewed fixture schema and invalid inputs; G3 |
| 14 | Stable ID normalizer, collision audit and ID↔recordKey index | 13 | Reordering/no-alias-confusion tests; G3 |
| 15 | Deterministic source converter, rejected-record audit | 11,13 | Reproducible hashes; G3 |
| 16 | Nested representative bootstrap + disjoint shard partitioning | 14–15 | All objects covered exactly once; G3 |
| 17 | Manifest generator/validator + immutable decoded-shard checksums | 13,16 | Manifest and checksum validator; G3 |
| 18 | Static assets + relative/Pages-base URL loader and deploy preview | 17 | Built dist and real subpath asset probes; G5 |
| 19 | Bootstrap fetch and whole-file hash/semantic verification | 06,17 | Corrupt/truncated bootstrap never drawn; G4 |
| 20 | Verified-shard GPU upload/store/lifecycle | 19 | Correct GPU committed record counts; G4 |
| 21 | Bulk fetch concurrency, retries, cancellation, stale-version fencing | 17,20 | 404, abort, out-of-order integrity tests; G4 |
| 22 | Progressive multi-shard draw and exact visible/loaded counts | 20–21 | 25/50/75% partial displays; G4 |
| 23 | Early UX: coverage/date/quality/accuracy label and download controls | 12,22 | Keyboard+mobile user-journey checks; G5 |
| 24 | Mobile input/accessible controls, reduced-motion and safe areas | 23 | Screen-reader/keyboard/touch matrix; G5 |
| 25 | GPU upload/backpressure and chunk-size benchmarks | 22 | p95 frame/upload and first-density metrics; G4/G6 |
| 26 | Freshness checks, validated publication, rollback and cost budgets | 18,22 | Staged release+revert drill; G6 |
| 27 | Cross-browser/context-loss and network fragmentation CI suite | 22–25 | Chromium/Firefox/WebKit scenario matrix; G6 |
| 28 | Release 1 documentation, provenance, full integrity/perf sign-off | 01–27 as applicable | G1–G6 passed; tag 1.0 |
| 29 | Optional independently verified subblock format and stream assembly | 28, benchmark decision | 1-byte splits, subblock hash proof; post-1.0 |
| 30 | Optional worker, compression and cache evaluation as separate follow-up experiments | 28–29 as needed | Reproducible A/B benchmark; post-1.0 |
| 31 | Rich search/selection, stable object inspector and prioritized fetch | 14,22,28 | ID correctness with not-yet-loaded shard; post-1.0 |
| 32 | Shader performance, adaptive LOD/quality and advanced explorer UX follow-up epics | 25,28 | Further split into scoped PRs per feature; post-1.0 |

**PR policy:** Entry 32 is an *epic placeholder*, **not** authorization for one enormous PR. Split work by individual perf hypothesis, UI feature, or scientific capability. Any PR estimated to change multiple independent public contracts should be split. Use feature flags for invasive changes; no worker/compression/TypeScript-wide refactor is a gate on PR 28 unless a measured blocker demands it.

---

## 17. Risks and explicit tradeoff decisions

| Risk | Impact | Mitigation / decision |
|---|---|---|
| **Current catalog schema/epoch mismatches** | Plausible but incorrect trajectories | Validate schema from official source; preserve epoch; science tests |
| **Insufficient vertex precision** | NaNs or frozen/corrupt orbit motion on mobile | Highp + scaled time + test supported GPUs |
| **Chunk ordering biases first frame** | Misleading asteroid-belt distribution | Stratified representative deterministic bootstrap |
| **Streaming integrity contract confusion** | May render unverified orbital data or break progress | **Release 1 verify whole shard before display**; optionally verify each independent subblock later |
| **Catalog source grows substantially** | Download, storage, GPU memory strain | Manifest-sized chunks, memory budgets, adaptive quality |
| **A network shard is missing** | Incomplete view or blocked loading | Chunk isolation, retry, partial rendering, clear completeness |
| **Compressed shard headers differ by host** | Double decompression or broken stream | Test actual `Content-Encoding` and raw gzip handling |
| **GitHub Pages cache changes mid-session** | Manifest and shard version mismatch | Immutable versioned directories + hashes |
| **Higher shader data footprint** | Bandwidth/memory worse than compute saved | Benchmark network+GPU total cost before adopting precomputed orientation |
| **Inaccurate resonance effects** | False impression of N-body physics | Scientific default, marked illustration mode |
| **Planets and asteroids use mismatched frames** | Coherent-looking but incorrect geometry | Shared frame/epoch conversion and reference tests |
| **Overly ambitious full TypeScript rewrite** | Long regression-heavy PR | Incremental modular extraction with fixed golden results |
| **Performance overclaims** | Misleading user expectations | Targets labeled provisional; report measured hardware/configurations |
| **Abandoned WebGL 1 users** | Reduced device/browser coverage | Profile fallback value and document intentional support policy |
| **Third-party licensing** | Distribution non-compliance | Audit vendored libraries and catalog requirements |

---

## 18. AI coding-agent workflow and guardrails

Each agent should work from a **single scoped PR batch**, not attempt the entire modernization in one unreviewable rewrite.

### Required preparation

- [ ] Read `README.md`, `AGENTS.md`, `project_context.md`, `package.json`, `vite.config.mjs`, the relevant source module, and this plan.
- [ ] Confirm baseline SHA, branch, run commands, and clean working tree before changing files.
- [ ] Identify related tasks, dependencies, interface contracts, and acceptance criteria.
- [ ] Define expected scientific behavior or rendering baseline **before** changing logic.

### Implementation constraints

- [ ] Maintain runnable vertical slices and useful checkpoints rather than extensive dormant scaffolding.
- [ ] Do not replace GPU bulk propagation with CPU per-object loops.
- [ ] Do not quietly change astronomical units, frames, angle definitions, epoch, or binary layout.
- [ ] Do not claim a physically correct model without tests against an independent reference.
- [ ] Do not add speculative dependencies or migrate to Three.js/WebGPU without a measured reason and explicit scope change.
- [ ] Do not hardcode the frozen ~1.49M object count as a permanent catalog limit.
- [ ] Do not block animation on download completion; **Release 1 renders only complete, verified shards** (first bootstrap, then bulk). Never show unverified or incomplete records as scientifically sourced data.
- [ ] Treat data provenance, schema versions, hashes, manifest paths, and abort/retry semantics as part of the public architecture contract.
- [ ] Preserve clear scientific versus illustrative display modes.
- [ ] Keep license policy permissive; retain required licenses for embedded dependencies.

### Scoped planning contract for coding agents

- [ ] Work on **one numbered PR unit** or a narrower issue with file/module boundaries, required fixtures, commands, rollback approach, and a pass/fail gate named up front.
- [ ] Do not claim full `Phase X` is complete if only its `[R1]` subset is implemented; label post-1.0 work explicitly.
- [ ] Before changing the converter or renderer, show an epoch/frame/identity schema compatibility matrix and the exact golden records used.
- [ ] Never introduce a subshard publication path into the Release 1 verified-shard loader without an approved versioned RFC and a separate acceptance test.
- [ ] Verify release-boundary terminology in code/UI/docs: *downloaded ≠ decoded ≠ verified ≠ uploaded ≠ visible*.


### Required agent handoff

- [ ] State changed files, behavior changed, test commands/results, significant findings, remaining risks, and links to any generated screenshots/benchmarks.
- [ ] Attach a minimal reproducible benchmark or reference case for science/performance-sensitive changes.
- [ ] Explicitly update completed checklist items only when verified.
- [ ] Propose the next smallest dependency-unblocking PR with acceptance criteria.

---

## 19. Source documentation and implementation references

Primary source and data semantics:

1. Lowell Observatory, Asteroid Orbital Elements Database: <https://asteroid.lowell.edu/astorb/>
2. Lowell historical fixed-width astorb format and epoch details: <https://ftp.lowell.edu/pub/elgb/astorb.html>
3. Lowell 2018 revised format, large semimajor axes and inclination notes: <https://comet.lowell.edu/astorb/>  
   Lowell astorbDB docs and modern query alternatives: <https://asteroid.lowell.edu/docs/>
4. NASA/JPL approximate planet positions, rates, frames and validity ranges: <https://ssd.jpl.nasa.gov/planets/approx_pos.html>
5. JPL Horizons: <https://ssd.jpl.nasa.gov/horizons/>

Browser/build implementation references:

6. MDN Streams API and readable-stream consumption: <https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams>
7. MDN WebGL `vertexAttribPointer` documentation: <https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer>
8. MDN shader precision and WebGL best practices: <https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices>
9. MDN `getShaderPrecisionFormat`: <https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getShaderPrecisionFormat>
10. MDN `DecompressionStream`: <https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream>
11. MDN WebGL context restoration: <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event>
12. Vite asset packaging, public paths and Pages deployment: <https://vite.dev/guide/assets>, <https://vite.dev/guide/build>, <https://vite.dev/guide/static-deploy>
13. Web Crypto digest buffering semantics (not streaming): <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest>
14. Browser approximate/limited `deviceMemory`: <https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory>
15. GitHub Pages published-site, build, and bandwidth limits: <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>

**Note about review coverage:** The source code, tooling, repository structure, and commit history were reviewed. Proposed performance targets have *not* been validated by running the current demo on physical GPUs; they are acceptance targets pending benchmarking. Likewise, current exact source-feed record counts and GitHub Pages response behavior should be measured during the implementation, not assumed from the older committed catalog.

---

## 19.1 Verified reference facts underpinning revision 2.0

- **Lowell Observatory:** official modern astorb overview describes 266-column records and a daily maintained catalog; revised 2018 Fortran format documents inclinations over 99.99999° and semimajor axes above 1000 AU. The fetched source size is **not** the 2013/legacy `temp/astorb3d.bin` record count.
- **JPL:** approximate planetary positions are least-squares approximations over stated fitted date windows; `M = L - ϖ` and `ω = ϖ - Ω` are not interchangeable with using raw table `L` as `M`.
- **Web Crypto:** `SubtleCrypto.digest()` does not provide incremental streaming input. Whole-buffer verification is therefore a good fit for small immutable files.
- **Vite:** exact static assets are copied from `public`; JavaScript-generated subpath URLs should use the configured base path (`import.meta.env.BASE_URL`).
- **GitHub Pages:** official documentation currently lists a **1 GB published-site maximum** and **100 GB/month soft bandwidth limit**; publication strategy must account for actual traffic and catalog growth.
- **Browser adaptive quality:** `navigator.deviceMemory` is coarse, intentionally privacy-limited and not available everywhere; frame measurement and runtime capability probing must work without it.

The source links above are used as reference *requirements*. Actual response headers, GPU precision, catalog epochs, source record counts, performance metrics, and cache/traffic behavior remain implementation-time measurements.

## 20. Recommended very next actions

- [ ] **1.** Land PR 01: baseline tests, screenshot smoke, and asset/deployment inventory.
- [ ] **2.** Land PRs 02–05: fix duplicate keydown, invalid stride, GPU precision, timestamp/epoch handling, planetary element conventions, and establish astronomy reference tests.
- [ ] **3.** Design and approve the `catalog-v2` manifest/schema RFC; make the timestamp/epoch policy part of the format.
- [ ] **4.** Implement the verified representative `bootstrap.bin`, a stable ID↔recordKey index, and empirically sized early/bulk shards; prove nested LOD and exact no-duplicate/no-omission coverage.
- [ ] **5.** Decouple render loop from download; implement verified-shard manifest fetch, bounded whole-shard hash verification and per-shard GPU upload; intentionally **defer intra-shard display** to a post-1.0 RFC.
- [ ] **6.** Demonstrate a throttled-network video: scene renders immediately; representative asteroids appear; the belt fills in while the camera remains interactive; data integrity and progress are accurate.
- [ ] **7.** Only after the above works: optimize shaders/LOD, improve UI, implement search and scientific exploration, and consider advanced streaming/compression paths.

**Success looks like this:** A user opens the site, sees an interactive solar system almost immediately, watches a scientifically labeled and visibly representative asteroid sample appear **after the bootstrap is verified**, and can rotate/zoom/change time while subsequent **independently verified whole shards** arrive. The scene becomes denser without interrupting the experience, remains stable on a phone, and makes it clear which positions are catalog-derived, which are approximations, and which visuals are intentionally illustrative.
