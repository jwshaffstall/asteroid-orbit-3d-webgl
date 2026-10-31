# astorb3d v2 — Phased Implementation Plan

Oct 31, 2026 · @John Shaffstall

## Overview

Fix the astronomy first, then stream the 1.49M-asteroid dataset in \~1 MB chunks that render as they arrive, then layer on performance, accuracy, UX and new features. The plan has 11 phases (0–10) shipped as four releases over about 15–19 weeks of solo work; each phase ends in a gate you can test.

**Revision 2 changes:** planet mean motion and secular rates moved into Phase 1; accuracy gates matched to JPL's published model errors; record layout fixed (wider H range, class enum, no PHA bit); structural rewrites moved from Phase 2 into Phase 8a; WebGL 2 required; CI runs on a fixture dataset; MPCORB promoted to a first-class data source; Lowell attribution made concrete; releases v1.1–v2.2 added; Phases 6 and 7 split into a/b; large items broken into PR-sized steps.

**Revision 3 changes (code review against `master` @ f6ea7dc):**

- **v1.1 needs a rebuilt dataset.** The shipped `temp/astorb3d.bin` (1,487,224 records) was built from a catalog that isn't in the repo, so its epoch is unknown; the committed `astorb.dat.gz` is the 2013 one. Phase 1 now rebuilds the v1 binary from a freshly fetched, archived catalog. The epoch goes in a sidecar `astorb3d.meta.json`, so the v1 binary format doesn't change twice (once now, again in Phase 3).
- **MPCORB epochs differ between records.** The converter now propagates every record to one common epoch, instead of "asserting or grouping by epoch". Refresh checks now allow for MPCORB's 200-day standard epochs.
- **The v2 record layout breaks WebGL alignment.** In Revision 2, the float32 `a` sat at byte offset 10, and WebGL rejects attribute offsets that aren't a multiple of the type size. `a` now comes first.
- **Accuracy gates are now set per planet.** A flat 0.5° would hide a 100× regression on Mercury (nominal error 15″). Phases 1 and 5 now use the same thresholds, since the model in that date range is the same.
- **Kepler solver:** the JS reference converges fully, a float32 mirror of the GLSL is tested via `Math.fround`, and the starting guess is Danby's for all e. Early exit in Phase 4 is only kept if benchmarks show a gain: GPU lanes wait for their slowest neighbour, so the saving is small.
- **Deploy-order hazard:** the live site serves the repo root, including `temp/astorb3d.bin`. Data moves out of `master` only after `dist/` deploys are live (Phase 8a step 1). Rewriting git history to purge old blobs is now an explicit decision, not a default.
- **Moved earlier:** formatter and linter consolidation, plus the Node and Actions upgrades, move to Phase 0 so the big diffs that follow are clean. Node 24 LTS replaces 22. It runs `.ts` tests natively, which shapes the TS config.
- **Phase 4 gate:** measured with adaptive quality off. Otherwise the adaptive draw count makes the gate pass by definition.
- **Cut to stretch:** DE440 mode (the Standish worst case, 0.17°, is under a pixel at nearly every zoom) and asteroid-family highlighting.
- **Smaller fixes:** golden screenshots in Phase 0 are a reference, not a gate; the URL hash overrides `localStorage`; the sim clamp respects the planet table's 3000 AD limit; agent-guidance files are updated in the same PR as the change they describe; stale plan drafts are deleted.

Guiding principles:

- **Correct before pretty.** Every physics change is checked against JPL Horizons vectors in CI.
- **First pixels fast.** Something on screen within \~1 s on broadband; the full catalog keeps arriving while you interact.
- **Reproducible data.** Anyone can rebuild the exact shipped dataset from a script and an archived source file with a checksum. The live URLs change daily, so they are for refreshes, not for reproducing a build.
- **One source of truth.** One Kepler solver (shared by JS, shader snippet and tests), one data spec, one agent-guidance file.
- **Write it once.** Structural code is written in its final module layout; nothing is rewritten in the legacy script first.
- **Agent-friendly slices.** Each checkbox is sized for one PR with its own test.
- **Docs move with code.** Any PR that changes a constraint stated in `AGENTS.md` / `CLAUDE.md` (data schema, file names, commands) updates those files in the same PR.

Effort key: **S** ≈ 1–2 days, **M** ≈ 3–5 days, **L** ≈ 1–2 weeks, **L+** ≈ 3 weeks or more, of solo or agent-assisted work.

**Releases**

| Release | Phases    | What users get                                                                                                                        | Effort (solo) |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| v1.1    | 0, 1, 2   | Correct planet positions on the data's real epoch, a freshly rebuilt catalog, keyboard fixes and data attribution on the existing app | 2–3 weeks     |
| v2.0    | 8a, 3, 4  | Modular codebase; first asteroids in ≤ 1 s; full catalog streams at 60 FPS on phones                                                  | 6–8 weeks     |
| v2.1    | 5, 6a, 7a | Real dates, speed slider, share links, pick / search / filter, Jupiter co-rotating view                                               | 4.5–5.5 weeks |
| v2.2    | 6b, 7b    | UX polish, linked plots, new color modes                                                                                              | 2.5–3.5 weeks |

Phases 8b (tests), 9 (CI and deploy) and 10 (docs) run continuously and are included in those estimates.

&#91;embedded content: phase map · 11 phases, dependencies top to bottom\]

Phases 1 and 2 can run in parallel and ship as v1.1; the 8a module split comes before streaming so the loader is written once; v2.0 ships after Phase 4; 5, 6a and 7a then make v2.1, and 6b and 7b make v2.2.

## Phase 0 — Baseline and safety net (S–M)

Goal: a green CI baseline, a reproducible dataset from either of two sources, and reference truth to test against, before anything changes.

**Repo hygiene and tooling (do first, so later diffs are clean)**

- [ ] Tag current `master` as `v1-baseline` so every later screenshot and benchmark has a comparison point.
- [ ] Keep Prettier (the codebase's Allman brace style depends on `prettier-plugin-brace-style`) and remove `oxfmt`; remove lint rules duplicated between ESLint and oxlint. Land the resulting reformat as one commit and add it to `.git-blame-ignore-revs`.
- [ ] Node 24 LTS in CI and `engines` (Node 22 is in maintenance by late 2026; 24 strips TypeScript types natively, which Phase 8a relies on). Current major versions of the checkout, setup-node and upload-artifact actions; `npm ci` instead of `npm install`; cache Playwright browsers.
- [ ] Superseded by `plans/plan-integrated.md` (merges this plan with `plans/plan-alternative.md`); move both source plans to `plans/archive/` once it is accepted. Add `.idea/` and `.junie/` to `.gitignore` if they aren't already ignored.

**Data**

- [ ] Write `tools/fetch-catalog.mjs` with two first-class sources: Lowell astorb over HTTPS (`https://ftp.lowell.edu/pub/elgb/astorb.dat.gz`, \~112 MB; FTP is no longer supported) and the MPC's `MPCORB.DAT.gz` with its own parser. Lowell's page currently reports its database service as unavailable, so the script falls back automatically and records which source it used. **Verify both URLs and their file sizes when you implement this; don't trust the values in this plan.**
- [ ] Archive each fetched raw file as a GitHub release asset (`data-<source>-<YYYYMMDD>`), and record its SHA-256, download date, source, record count and epoch(s) in `data/manifest.source.json`. The build reads from the archived asset by checksum. That is what makes the build reproducible.
- [ ] Add parser fixtures for Lowell's 2018 format changes: inclinations above 99.99999°, a ≥ 1000 AU written as F13.7 instead of F13.8, an optional leading space before i and a, and asteroid numbers stored as character fields. Add MPCORB fixtures for packed designations, packed epochs and the file header.
- [ ] Stop tracking the 2013 `astorb/astorb.dat.gz` (623,669 records) on `master`; it contradicts the shipped binary (1,487,224 records) and nothing loads it. Leave `temp/astorb3d.bin` in place: the live site serves it from the repo root until Phase 8a switches deploys to `dist/`. **Decision for the owner:** whether to purge old data blobs from history (`git filter-repo` plus a force-push, which breaks every existing clone and fork) or to leave history alone. Default: leave it alone.

**Reference truth and harness**

- [ ] Add deterministic URL parameters (`?t=<seconds>&cam=<az,el,dist>&color=<n>&paused=1`) so screenshots and tests render an identical frame every run.
- [ ] Capture golden screenshots at 3 fixed times and 3 camera views using the existing Playwright tool; upload as CI artifacts. These are a reference only: Phase 1 is meant to change them, and they are re-baselined at the end of Phase 1.
- [ ] Record a performance baseline in `docs/perf.md`: download time, time to first frame, FPS at 1/2/4 px, on a desktop GPU and a mid-range phone. Name the exact devices; every later perf gate uses them.
- [ ] Pull JPL Horizons heliocentric ecliptic J2000 state vectors into `tests/fixtures/horizons/` for the data epoch, epoch ±50 days, and epoch ±10 years. Bodies: Mercury, Venus, Earth–Moon barycenter, Mars, Jupiter, Saturn, Uranus, Neptune, Ceres, Pallas, Vesta, 624 Hektor (Trojan L4), 1172 Äneas (Trojan L5), 153 Hilda, 434 Hungaria, 433 Eros (NEO), 3200 Phaethon (e ≈ 0.89), Pluto. Commit the fetch script with them so the fixtures can be regenerated for a new data epoch.
- [ ] Build a deterministic \~20,000-record fixture dataset sampled across every dynamical class, for PR CI and visual tests. The full catalog runs only in nightly jobs, since software-rendered WebGL is too slow for 1.49M points on every PR.
- [ ] Get `npm ci`, `npm test`, `npm run lint`, `npm run format:check` and `npm run build` running in CI; mark the known-broken build step as expected-fail until Phase 8a fixes it.

**Gate:** CI green on the baseline; the dataset rebuilds from an archived source file with one command, and its checksum matches; Horizons fixtures and the fixture dataset committed.

## Phase 1 — Astronomical correctness (M)

Goal: planets and asteroids share one correct epoch, and every planet stays within its per-planet threshold of Horizons from the data epoch out to ±10 years.

**Dataset for v1.1**

- [ ] Rebuild `temp/astorb3d.bin` in the **unchanged** v1 layout (6 × float32) from the archived catalog, using the existing `astorb2bin.js` with the Phase 1 parser fixes. Write `temp/astorb3d.meta.json` next to it with the epoch (JD), record count, source and source SHA-256. The v1 binary gets no header, so its format only changes once, in Phase 3.

**Planets**

- [ ] Fix Earth: today the code stores ϖ in the ω field (102.94°), L in the M field (100.46°) and Ω = −11.26°, which puts Earth at about 194° heliocentric longitude at J2000 instead of \~100.46°. Use the Standish J2000 values consistently: a = 1.00000261, e = 0.01671123, i = −0.00001531°, Ω = 0°, ω = ϖ − Ω = 102.93768193°, M = L − ϖ = 357.52688973°.
- [ ] Generate all planet elements with a script (`tools/planet-elements.mjs`) from Standish Table 1 (valid 1800–2050), converting ϖ and L to ω and M in code, so no hand conversion can drift again. The other planets have the same kind of hand conversion (Mars ω and M are rounded); replace them all.
- [ ] Propagate planets with the table's own rates: L(T) = L₀ + L̇·T with T in Julian centuries from J2000, plus the per-century rates for a, e, i, ϖ and Ω. Stop deriving planet mean motion from μ☉ alone: that ignores each planet's mass and puts Jupiter about 0.3° off by 2025.
- [ ] Note in code that the table gives the Earth–Moon barycenter; Earth's \~4,700 km offset from it is under 0.002° as seen from the Sun.
- [ ] Take dwarf-planet elements from the same epoch as the asteroids: Ceres (and Pallas, Vesta for highlighting) straight from their catalog rows; Pluto, Haumea, Makemake, Eris from Horizons at the data epoch, generated by the fixture script rather than pasted in by hand.

**Epoch**

- [ ] Parse each record's epoch (Lowell: columns 107–114, YYYYMMDD; MPCORB: packed epoch). Lowell records share one epoch; assert that, and log any exceptions.
- [ ] Records whose epoch differs from the dataset epoch (common in MPCORB) are propagated to it in the converter with two-body mean motion: M ← M + n·Δt. Log how many were propagated and the largest Δt.
- [ ] At runtime, read the epoch from `astorb3d.meta.json` (the v2 manifest from Phase 3 on). Set sim time 0 from it and delete the hard-coded `Date.UTC(2013, 9, 15, …)` constant and the "October 15, 2013" comments.
- [ ] Evaluate planets at T = (epoch_data − J2000 + t_sim) in Julian centuries, from the metadata value, in float64 in JS.

**Shader physics**

- [ ] Delete the Jupiter resonance block (Trojan and Hilda mean-motion blending plus invented libration terms). It slows Hildas from 1.50× to 1.29× Jupiter's mean motion. Plain two-body motion from a correct epoch keeps Trojans and Hildas in place for decades.
- [ ] Switch every vertex shader (and every fragment shader that uses these values) to `precision highp float;`. μ = 3.96e−14 and time in seconds both fall outside mediump's guaranteed range.
- [ ] Improve the Kepler solver: reduce M to \[−π, π\]; use Danby's starting value E₀ = M + 0.85·e·sign(sin M) for every e; use a fixed iteration count picked by test (the smallest count that meets the float32 tolerance at e = 0.99 for all M; expected 5–6).
- [ ] JS gets two functions from one source: `solveKepler()` (float64, iterates until |ΔE| < 1e−12, at most 50 times) as the reference, and `solveKeplerF32()`, which mirrors the GLSL step for step using `Math.fround`, as the stand-in for the shader under test.
- [ ] Reject e ≥ 1 and a ≤ 0 in the converter and log how many were dropped.
- [ ] Clamp the reachable sim range to ±1,000 years from the epoch, and never past 3000 AD (the limit of the Standish long-span table used from Phase 5). Show a notice past ±100 years: float32 phase error and two-body drift both grow with time.

**Tests**

- [ ] Kepler: `solveKepler` residual < 1e−12 rad at e = 0, 0.2, 0.5, 0.9, 0.99 over a dense M grid; `solveKeplerF32` within 2e−6 rad of `solveKepler` on the same grid.
- [ ] Planet tests, per planet, at the data epoch and at ±10 years: heliocentric longitude within 1.5× Standish's nominal Table 1 error (Mercury 15″, Venus 20″, EMB 20″, Mars 40″, Jupiter 400″, Saturn 600″, Uranus 50″, Neptune 10″), with a floor of 60″ for epoch and float effects. Also check latitude and distance.
- [ ] Asteroid spot checks: Ceres, Vesta, Hektor, Äneas, Hilda, Hungaria, Eros, Phaethon within 0.1° at epoch ±50 days.

**Gate:** all accuracy tests pass; a screenshot at t = 0 shows Earth, Mars and Jupiter where Horizons puts them on the data epoch; golden screenshots re-baselined.

## Phase 2 — Quick fixes and the v1.1 release (S)

Goal: ship Phase 1's correctness work on the existing app within days. Only small, local fixes belong here; structural rewrites wait for Phase 8a so they are written once, in the new module layout.

**Fixes**

- [ ] Remove the canvas `keydown` listener (`astorb3d.js:1546`) and keep only the window one; today a focused canvas gets every key twice (Space pauses then unpauses, arrows change speed 4×, R randomizes twice).
- [ ] Ignore `event.repeat` for toggles; skip shortcuts while focus is in a button or input.
- [ ] Stop the Point Size handler from resetting `cinematicMode` (it silently turns cinematic off while the button still reads "On").
- [ ] Disable `depthMask` during the additive asteroid pass; additive blending with depth writes makes results depend on draw order.
- [ ] Add the data attribution Lowell requires to the page footer and README: NASA grant NAG5-4741 (PI E. Bowell), the Lowell Observatory endowment, NASA PDART grant NNX16AG52G (PI N. Moskovitz), and the citation DOI 10.1016/j.ascom.2022.100661. If the v1.1 dataset came from MPCORB, credit the MPC as well. The footer shows the data source and epoch from `astorb3d.meta.json`.
- [ ] Fix small defects: dead `if (event)` in mouseup; `</br>` → `<br>`; parser message says 255 but checks 267; Python shebang `#!usr/bin/env` → `#!/usr/bin/env`; `new Buffer()` → `Buffer.alloc()`; `for…in` over arrays → indexed loop (`astorb2bin.js:115`).
- [ ] Delete the unused vendored libraries `sylvester.src.js` and `glUtils.js` (their `<script>` tags are already commented out) along with the commented-out tags.

**Moved to Phase 8a** (structural, written once in the new layout): Pointer Events input, wheel normalization, log rewrite, precomputed label points, reused body buffer, load-error UI with Retry, context-loss handling, canvas background decision.

**Release**

- [ ] Tag and deploy v1.1 with a changelog entry. It deploys the same way as today (repo root); the move to `dist/` comes in Phase 8a. The live site shows planets and asteroids on the same, correct epoch, and the HUD or footer names that epoch.

**Tests**

- [ ] Playwright: Space toggles pause exactly once with the canvas focused; Point Size leaves cinematic mode unchanged; no console errors during a 10-second run.

**Gate:** input tests pass; Phase 1 accuracy gates met; v1.1 is live.

## Phase 3 — Data format v2 and progressive streaming (L)

Goal: the first asteroids render within \~1 s, and the rest stream in as \~1 MB chunks while the user is already interacting. The download shrinks from 35.7 MB to 23.8 MB before compression. Builds on the Phase 8a module layout and WebGL 2.

**Record layout (16 bytes, down from 24; every field naturally aligned)**

| Offset | Field                | Storage                         | Range                            | Precision                                       |
| ------ | -------------------- | ------------------------------- | -------------------------------- | ----------------------------------------------- |
| 0      | Semi-major axis a    | float32                         | 0.4–1,000+ AU                    | full (period errors compound, so no quantizing) |
| 4      | Mean anomaly M       | uint16, normalized              | 0–360°                           | 0.0055°                                         |
| 6      | Arg. of perihelion ω | uint16, normalized              | 0–360°                           | 0.0055°                                         |
| 8      | Long. of node Ω      | uint16, normalized              | 0–360°                           | 0.0055°                                         |
| 10     | Inclination i        | uint16, normalized              | 0–180°                           | 0.0027°                                         |
| 12     | Eccentricity e       | uint16, normalized              | 0–1                              | 1.5e−5                                          |
| 14     | H + class            | uint16: 12 bits H, 4 bits class | H −2.00 to 38.95 mag; 16 classes | 0.01 mag                                        |

WebGL requires every attribute offset and the stride to be a multiple of the attribute's type size, so the float32 must sit at offset 0, 4, 8 or 12; offset 0 keeps M, ω, Ω, i contiguous for one `vec4` binding.

Classes (one per record): Atira, Aten, Apollo, Amor, Mars-crosser, Hungaria, inner / middle / outer main belt, Hilda, Trojan L4, Trojan L5, Centaur, TNO, other, reserved. Classification boundaries are written down in `docs/data-format.md`. Telling L4 from L5 needs Jupiter's mean longitude at the data epoch, which comes from the Phase 1 planet module. The wider H range covers small NEOs, which reach H ≈ 33. There is no PHA flag: it needs Earth MOID, which the catalog doesn't provide. Designations, names and orbit-uncertainty values go in optional side files loaded on demand (Phase 7).

**File structure**

- [ ] `manifest.json`: format version, record count, epoch (JD), data source and its SHA-256, quantization parameters, class table, and a chunk list (file name, byte length, record count, content hash, a/H range).
- [ ] Chunk files of 65,536 records (1 MiB) each, about 23 chunks, with content-hashed names (`chunk-00-<hash>.bin`) so browsers can cache them forever.
- [ ] Store each chunk byte-planar (all M bytes, then all ω bytes, …) and gzip it; measure the real ratio and record it in `docs/perf.md`.
- [ ] Order records brightest-first (lowest H) across the whole file, with ties broken by catalog number, then designation, so the output is deterministic. There is no secondary sort inside chunks, so the drawn range is always one contiguous prefix. Chunk 0 holds the \~65k largest asteroids, enough to show the belt, Kirkwood gaps, Hildas and Trojans. Compare against a random shuffle by screenshot before locking it in.

**Converter**

- [ ] Replace `astorb2bin.js` with `tools/build-dataset.mjs`: read either source (astorb or MPCORB) directly from gzip, parse, validate, propagate to the common epoch, classify, sort, quantize, and write chunks plus manifest. Output must be byte-identical across runs (fixed gzip level, no timestamps in gzip headers).
- [ ] In the same PR, update `AGENTS.md` / `CLAUDE.md` / `project_context.md`: the 6-float layout constraint and the `astorb2bin.js` reference become the v2 spec and `build-dataset.mjs`.
- [ ] Unit tests: parser fixtures from Phase 0; quantization round-trip error within the table's precision; class assignment on known objects (Eros = Amor, Hektor = Trojan L4, Äneas = Trojan L5, 153 Hilda = Hilda, 434 Hungaria = Hungaria); manifest schema validation; byte-identical rebuild.

**Streaming loader**

1. Fetch `manifest.json`; allocate one GPU buffer for the full record count (23.8 MB of VRAM) and the VAO bindings.
2. Fetch chunks with 3–4 requests in parallel, using `fetch()` + `ReadableStream` for per-chunk byte progress.
3. Decompress (`DecompressionStream('gzip')`, with an fflate fallback) and de-planarize in a Web Worker; transfer a copy of the ArrayBuffer to the main thread.
4. On the main thread, `bufferSubData` the chunk into its slot in manifest order and raise the draw count. Chunks that arrive out of order wait until the chunks before them land, so the drawn range stays a prefix.
5. Keep rendering every frame; new chunks fade in over \~0.5 s via a per-draw opacity uniform on that chunk's range.

- [ ] The worker keeps the decoded records and answers lookups by index for picking, info cards and filter counts, so the main thread holds no CPU copy. SharedArrayBuffer is not an option: it needs cross-origin isolation headers that GitHub Pages can't set.
- [ ] Retry each chunk independently with backoff; a failed chunk shows a small warning and never stops the app.
- [ ] Replace the full-screen overlay with a non-blocking progress pill ("412,000 / 1,487,224 asteroids · 9.8 / 23.8 MB"); show the overlay only until chunk 0 lands.
- [ ] Respect `navigator.connection.saveData` and slow `effectiveType` (where supported; Safari and Firefox lack the API): load chunks 0–3 by default with a "Load full catalog" button.
- [ ] Cap total records on low-memory devices (`navigator.deviceMemory` ≤ 2, Chromium only); stop streaming at the cap and let the worker drop its copy (picking then reads the record back from the GPU with WebGL 2 `getBufferSubData`).
- [ ] Cache with a small hand-written service worker: data chunks are cache-first, since a content hash never changes; the app shell is network-first with a version check, and shows an "Update available — reload" prompt when newer; old caches are purged on activate. Include a `?nosw=1` escape hatch and an unregister path, since a broken service worker is the hardest bug to ship a fix for.
- [ ] Keep the v1 loader behind `?data=v1` for one release, then delete it.

**Tests**

- [ ] PR CI on the fixture dataset: chunks load in order; draw count rises monotonically; one injected failed chunk is retried; an out-of-order arrival doesn't open a gap.
- [ ] Nightly on the full catalog with throttled network (Fast 3G and 4G): first frame within 1.5 s on 4G; frame time stays under 16 ms while chunks arrive.

**Gate:** time to first asteroids ≤ 1 s on broadband (≥ 10× faster than v1); full catalog streams without dropped frames; repeat visit loads from cache.

## Phase 4 — Runtime rendering performance (M)

Goal: a steady 60 FPS with all 1.49M asteroids on a mid-range phone, and near-zero GPU use when nothing moves. Completes release v2.0.

**GPU pipeline (WebGL 2, required since Phase 8a)**

- [ ] Bind the v2 record through a VAO: one `float` (a, offset 0), one normalized `4 × uint16 → vec4` (M, ω, Ω, i, offset 4), one normalized `uint16 → float` (e, offset 12), and one integer attribute via `vertexAttribIPointer` (H + class, offset 14). No attribute re-specification per frame.
- [ ] Benchmark an early-exit Kepler loop (up to 8 iterations, exit at |ΔE| < 1e−6) against the Phase 1 fixed count; keep it only if it measurably wins. Lanes in a GPU warp wait for the slowest one, and records aren't sorted by e, so the gain may be small.
- [ ] Store mean motion n and √(1 − e²) per record only if benchmarks show the shader is ALU-bound; skip if bandwidth-bound.
- [ ] Replace stride-based level of detail with prefix-count LOD (`drawArrays(0, n)`).
- [ ] Add adaptive quality: adjust the draw count from frame-time feedback to hold a target FPS. Show when it is active ("showing 900k of 1.49M"), and allow turning it off.
- [ ] Draw planet and dwarf-planet orbit lines from precomputed positions with a small line shader and one color per orbit.

**Trails**

- [ ] Replace 3× redraw motion blur with a ping-pong framebuffer that fades the previous frame: one asteroid draw, trails of any length.
- [ ] Clear (or fade within a few frames) the trail buffer while the camera moves, since feedback trails smear the whole scene under camera motion; let trails rebuild once the camera has been still for \~200 ms.
- [ ] Keep the old blur only if side-by-side screenshots show it clearly better.

**CPU and power**

- [ ] Render only when something changes: sim time running, camera moving, a chunk fade-in active, trails still decaying, or any state change. Otherwise skip the frame.
- [ ] Cap device pixel ratio at 2 (3× phones otherwise shade 2.25× the pixels for no visible gain); add a quality setting.
- [ ] Cache uniform values and skip redundant `useProgram`/uniform calls.
- [ ] Update the status bar every 250 ms from cached elements.

**Measurement**

- [ ] Profile with Spector.js and the browser performance panel; record GPU ms, CPU ms and FPS at 1/2/4 px on the Phase 0 reference devices in `docs/perf.md`.
- [ ] Add a `?bench=1` mode that runs a fixed 20-second camera path with adaptive quality off and prints frame-time percentiles.

**Release**

- [ ] Tag and deploy v2.0 once Phases 8a, 3 and 4 pass their gates.

**Gate:** with adaptive quality **off**, p95 frame time ≤ 16.7 ms with the full catalog on the reference mid-range phone at 2 px; idle (paused, still camera) GPU use near zero; v2.0 is live.

## Phase 5 — Higher accuracy (S–M)

Goal: the sim shows real calendar dates, planets stay accurate over the full reachable time range, and the app is honest about where two-body motion stops being trustworthy. Part of release v2.1.

**Time and dates**

- [ ] Show the simulated UTC date and Julian Date in the HUD instead of "Time: X years".
- [ ] Add "Jump to date" (date picker) and "Now" (sets sim time to the real current time at 1× speed for a live view).
- [ ] Keep sim time as a float64 JD offset in JS; pass seconds-from-epoch to the shader each frame.

**Planets** (secular rates already landed in Phase 1)

- [ ] Switch to Standish's long-span table (3000 BC–3000 AD, with the extra Jupiter–Neptune correction terms) outside 1800–2050.

**Moons**

- [ ] Give moons real orbital planes (inclination and node relative to the ecliptic via each planet's pole) and correct phase at the epoch from Horizons; Triton stays retrograde.
- [ ] Add a moon-distance exaggeration control so moons sit visibly outside their planet's sprite, labeled as not to scale.

**Honesty about limits**

- [ ] Show an "accuracy horizon" indicator: green within ±50 days of the epoch (arcsecond-level for most main-belt objects), amber to ±10 years, red beyond, with a one-line explanation of two-body drift.
- [ ] State the planet model's nominal error in the UI's About panel (Standish 1800–2050: worst case Saturn, 600″; long-span table outside that).
- [ ] Add a size-scale toggle: true physical radii versus the current log-exaggerated sizes, labeled clearly.

**Validation harness**

- [ ] Compare GPU positions (via transform-feedback readback) with the JS solver and the Horizons fixtures for the sample set; nightly CI fails if error regresses past thresholds.
- [ ] Publish the results table in `docs/accuracy.md`.

**Gate:** every planet within its Phase 1 per-planet threshold across 1950–2050, and within 1.5× the long-span table's nominal error at 1000 AD and 2900 AD; asteroid sample within 0.1° at epoch ±50 days; GPU matches `solveKeplerF32` to 1e−5 rad; HUD dates correct.

## Phase 6 — User experience (6a M, 6b M)

Goal: the canvas gets most of the screen, controls read in plain units, and any view can be shared as a link. Split so the essentials ship in v2.1 and the polish in v2.2.

**6a — Essentials (v2.1)**

- [ ] Give the canvas the space: debug log behind a Debug toggle (it takes 160 px today), smaller header.
- [ ] Replace double/halve buttons with a log-scale speed slider from 1 s/s to 10 yr/s, plus presets (Real time, 1 day/s, 1 month/s, 1 year/s); show speed in human units ("1 year / second") instead of "1.0e+6x".
- [ ] Add a timeline scrubber spanning the accuracy horizon, with the epoch and today marked.
- [ ] Encode time, speed, camera, color mode, point size and filters in the URL hash; a Share button copies the link. Reuse the Phase 0 deterministic parameters' parser rather than adding a second one.
- [ ] Remember preferences in `localStorage` (wrapped in try/catch). Precedence: URL hash > stored preferences > defaults, so a shared link always reproduces the sender's view.
- [ ] Show a legend for the active color mode: gradient, value range and units; default to colorblind-safe palettes (viridis, cividis), with the current palettes as options.
- [ ] Show buttons as toggles with `aria-pressed`; throttle screen-reader status updates to every few seconds; check contrast in both themes.
- [ ] Touch targets ≥ 44 px; Fullscreen button; block iOS pull-to-refresh on the canvas only.
- [ ] Allow page zoom outside the canvas (drop `user-scalable=no`).
- [ ] Honor `prefers-reduced-motion`: no cinematic mode or trails by default.
- [ ] First-visit hint overlay ("Drag to orbit · pinch to zoom · tap a dot for details"), dismissible. Ship it with 7a, since "tap a dot" needs picking.

**Gate 6a:** Lighthouse accessibility ≥ 90; a shared link reproduces the exact view; the canvas occupies ≥ 75% of a phone screen with controls collapsed.

**6b — Polish (v2.2)**

- [ ] Group controls into Time / View / Display / Data, with icons and tooltips, in a side drawer on desktop and a bottom sheet on mobile.
- [ ] Add a `?` overlay listing every keyboard shortcut, plus keyboard camera control (WASD, or Shift + arrows, since plain arrows change speed).
- [ ] Camera damping and inertia; double-click or double-tap a planet to focus and follow it; Reset View button.
- [ ] Preset views: top-down, edge-on ecliptic, inner system, outer system, Jupiter co-rotating frame (from Phase 7a).
- [ ] Two-finger pan on touch; right-drag pan with a mouse.
- [ ] Distinct planet-orbit colors; keep labels from overlapping with a screen-space collision pass.
- [ ] Screenshot button that saves a PNG of the current frame (render one frame with `preserveDrawingBuffer`, or read pixels right after drawing).

**Gate 6b:** every control reachable by keyboard; no overlapping labels in the five preset views.

## Phase 7 — New features (7a L, 7b M)

Goal: turn the visualization into an explorer — pick, search and filter individual asteroids, and see the dynamics that make the belt interesting. 7a ships in v2.1, 7b in v2.2.

**7a — Pick, search, filter, co-rotating view (v2.1)**

- [ ] GPU picking: on click or tap, render record index + 1 into a small `R32UI` offscreen target around the pointer, read back a 9 × 9 px block (larger on touch), and take the nearest non-zero hit. 1–2 px points are too small to hit exactly.
- [ ] Info card from the worker's record lookup (Phase 3): number and name, a / e / i, perihelion and aphelion, period, H, estimated diameter range (D = 1329 km / √p × 10^(−H/5) for albedo p = 0.05–0.25), dynamical class, and a link to the JPL Small-Body Database page.
- [ ] Draw the picked object's full orbit and keep it highlighted; allow pinning several.
- [ ] Build the designations side file in the Phase 3 converter: one gzip file in record order, decoding numbers stored as character fields; measure its size and record it in `docs/perf.md`.
- [ ] Search by number or name with autocomplete, loading the designations file only when the search box first opens; selecting flies the camera to the object and opens its card.
- [ ] Population toggles from the class enum: NEOs (Atira, Aten, Apollo, Amor), Mars-crossers, Hungarias, inner / middle / outer main belt, Hildas, Jupiter Trojans (L4 and L5 separately), Centaurs, TNOs.
- [ ] Range sliders for a, e, i and H, applied on the GPU with uniforms (discard), with a live count of visible objects computed by the worker from its copy (debounced).
- [ ] Jupiter co-rotating frame: rotate the scene by −λ_Jupiter(t) so Trojans hold their positions around L4/L5 and the Hilda triangle keeps its shape.

**Gate 7a:** clicking any dot opens a correct info card in < 100 ms; search finds Ceres, Eros and 624 Hektor; the co-rotating view shows the Trojan clouds holding their positions over 100 simulated years.

**7b — Analysis views and extras (v2.2)**

- [ ] Linked 2D panels: an a-histogram (Kirkwood gaps), a–e and a–i scatter plots; brushing a range filters the 3D view. Draw them from the worker's copy (or GPU-rendered points), not 1.49M SVG nodes.
- [ ] New color modes: by H (size proxy), by dynamical class, by Tisserand parameter relative to Jupiter, and by orbit uncertainty from an optional side file.

**Gate 7b:** brushing in a 2D panel filters the 3D view within one frame.

**Stretch (after v2.2)**

- [ ] Optional DE440 planet mode: our own Chebyshev fit to DE440 for 1900–2100, lazily loaded. Measure its size before committing to it. Cut from v2.1 because Standish's worst case (0.17°) is under a pixel at nearly every zoom level.
- [ ] Asteroid-family highlighting (Vesta, Flora, Themis, Koronis, Eos, Hungaria) from a published family-membership list, loaded on demand. It needs a list that matches the catalog by number, plus checks on its license and attribution.
- [ ] Comets from the MPC comet elements file, with a universal-variable solver for parabolic and hyperbolic orbits.
- [ ] WebXR mode for headset viewing.
- [ ] Close-approach list for NEOs from a public API, if CORS permits.

## Phase 8 — Architecture refactor and tests (8a M–L, 8b continuous)

Goal: replace the 2,400-line global script with small typed modules and one shared Kepler solver, absorbing the structural fixes moved out of Phase 2. 8a runs right after v1.1 and before Phase 3, so the streaming loader is written once in the new structure.

**8a — Module split and structural fixes, as PR-sized steps**

1. Load the existing code through a Vite ES-module entry, unchanged. Move the data into `public/`, so `dist/` contains every script and the data and `npm run build` works. Switch GitHub Pages to deploy `dist/` with the Pages deploy action in the same step (Phase 9 hardens it). Only after this step can data leave `master`.
2. Require WebGL 2 and show a clear message on browsers without it (no WebGL 1 path to maintain).
3. Extract `astro/` (Kepler, elements, planets, time) with unit tests, plus the shared `shaders/kepler.glsl` snippet. `solveKeplerF32` and the GLSL come from the same reviewed step sequence; a test fails if they diverge.
4. Extract `render/` passes with VAOs; reuse one preallocated body buffer with `bufferSubData`; precompute orbit-label points once and search them only when the camera moves; handle `webglcontextlost` / `webglcontextrestored`.
5. Extract `ui/`: Pointer Events with `setPointerCapture` and `pointercancel`; `wheel` with `{ passive: false }` and `deltaMode` normalization; log rebuilt with `createElement` + `textContent`, capped at 200 entries, behind the Debug toggle; load errors with status and a Retry button; one decided canvas background (space stays dark, unused `--canvas-bg` removed).
6. Add one state store with subscriptions; UI renders from state, replacing the scattered `refresh*Controls()` calls.
7. Replace vendored gl-matrix 2.2.0 and stats.js with current npm packages.
8. New modules are written as `.ts` from the start. Existing code turns on type checking one folder at a time: `astro/` and `data/` in 8a; `render/` and `ui/` move to 8b and may land after v2.0. Set `erasableSyntaxOnly` in `tsconfig.json` so Node 24 runs the tests without a build step. That means no TS `enum`s (the class table is a `const` object) and no parameter properties.

Target layout:

```
src/
  astro/   kepler.ts, elements.ts, planets.ts, moons.ts, time.ts   (pure, no DOM)
  data/    manifest.ts, loader.ts, decode.worker.ts, classify.ts
  render/  context.ts, programs.ts, asteroids.ts, bodies.ts, orbits.ts, labels.ts, picking.ts
  ui/      controls.ts, hud.ts, url-state.ts, theme.ts, input.ts
  state.ts (one store + subscribe), app.ts (loop)
shaders/  asteroid.vert, asteroid.frag, bodies.vert, bodies.frag, kepler.glsl
tools/    fetch-catalog.mjs, build-dataset.mjs, planet-elements.mjs, horizons-fixtures.mjs
```

CSS stays vanilla, in the existing custom-property theme system; it may move from the inline `<style>` block to `src/ui/styles.css`, and the agent-guidance files are updated to match in the same PR.

**Gate 8a:** no globals; one Kepler implementation in JS and one in GLSL, both tested against the same fixtures; the `dist/` build is what's deployed and it works; CPU frame time with labels on at least 80% lower than the Phase 0 baseline.

**8b — Tests (continuous, every phase)**

- [ ] Unit: Kepler solver accuracy; element conversions and secular rates; epoch and JD conversions; epoch propagation; quantization round trip; parser edge cases for both sources; manifest schema; URL-state round trip; class assignment on known objects.
- [ ] Integration (Playwright, fixture dataset): app loads; first chunk renders; controls act once per input; mobile viewport; no console errors.
- [ ] Visual regression: pixel diff with tolerance at fixed time and camera, rendered with SwiftShader on the fixture dataset.
- [ ] Nightly: full-catalog visual run, throttled streaming run, and the GPU-vs-Horizons accuracy run.
- [ ] Coverage ≥ 90% for `astro/` and `data/`.
- [ ] Type checking enabled for `render/` and `ui/`.

**Gate 8b:** coverage target met; PR CI finishes in under 10 minutes.

## Phase 9 — Build, deploy and CI (S–M, continuous)

Goal: every PR is checked end to end in minutes, releases deploy from the build output, and the dataset refreshes on a schedule without bloating the repo. (Tool consolidation and the Node and Actions upgrades moved to Phase 0; the switch to `dist/` deploys moved to Phase 8a step 1.)

**Build**

- [ ] Keep `base: "./"` so the site works under the GitHub Pages subpath.

**Pull-request CI (fixture dataset)**

- [ ] Steps: install → lint → format check → typecheck → unit tests → build → Playwright smoke + visual diff → bundle-size budget → manifest validation; target under 10 minutes.
- [ ] Lighthouse CI budget: performance and accessibility ≥ 90.
- [ ] Replace the current `screenshot.yml` (runs on every PR with Node 20) with the Playwright job above.

**Nightly CI (full catalog)**

- [ ] Full-catalog visual run, throttled streaming run (Fast 3G and 4G), and the GPU-vs-Horizons accuracy run; failures open an issue (deduplicated: one open issue per failing job).

**Deploy and releases**

- [ ] Deploy `dist/` to GitHub Pages on every merge to `master` (set up in Phase 8a step 1; this item adds the release tagging and protects the deploy with the PR checks).
- [ ] Content-hashed file names for code and data, since Pages can't set custom cache headers.
- [ ] Tag v1.1, v2.0, v2.1 and v2.2 with GitHub release notes generated from `CHANGELOG.md`.

**Data refresh**

- [ ] Scheduled monthly workflow: fetch the latest catalog (Lowell first, MPCORB on failure) → archive it as a release asset → build chunks → validate → open a PR with the new manifest and the source used.
- [ ] Validation compares against the last run **from the same source**: record count within ±5%. Epoch age: Lowell ≤ 60 days old; MPCORB ≤ 250 days (MPC uses standard epochs 200 days apart). Horizons spot checks pass after regenerating fixtures for the new epoch. A switch of source is flagged in the PR body for review.
- [ ] Store data chunks outside `master` history (release assets fetched at build time, or a dedicated data branch), once `dist/` deploys are live. The repo currently carries \~80 MB of data blobs (45 MB gz + 35.7 MB bin).

**Gate:** a fresh clone builds and deploys a working site with one command; monthly data PRs arrive and pass CI on their own; nightly runs green for a week.

## Phase 10 — Docs and agent guidance (S, plus a slice at the end of each phase)

Goal: one accurate source of guidance for people and agents, and a README that says what the app shows, how accurate it is, and where the data comes from.

- [ ] README: hero screenshot or GIF, live link, feature list, controls, dev setup, and the data rebuild command for both sources.
- [ ] README accuracy statement: two-body propagation for asteroids, the accuracy horizon, and the planet model's nominal error (Standish 1800–2050, worst case Saturn at 600″; long-span table outside that).
- [ ] README data credits, matching the in-app footer from Phase 2: NASA grant NAG5-4741 (PI E. Bowell), the Lowell Observatory endowment, NASA PDART grant NNX16AG52G (PI N. Moskovitz), citation DOI 10.1016/j.ascom.2022.100661; MPC credit when MPCORB is the source; JPL for planet elements and Horizons.
- [ ] Merge `project_context.md` and `.github/copilot-instructions.md` into `AGENTS.md` as the single agent file; replace the broken `file:///F:/dev/astorb3d - Copy/...` links with relative links. Reduce `CLAUDE.md` and `GEMINI.md` (where present) to a one-line pointer to `AGENTS.md`. Stale constraints in them (the 6-float layout, `astorb2bin.js`, the inline `<style>` block) are fixed as each phase changes them, not here.
- [ ] Agent rules: physics changes need Horizons-backed tests; any data-format change bumps the manifest version and updates the spec, converter and decoder together; never hand-edit generated data; structural code goes in the module layout, never the legacy script; run the full pre-flight before declaring done.
- [ ] New docs: `docs/data-format.md` (the v2 spec, including the class enum and its boundaries), `docs/architecture.md` (module map), `docs/accuracy.md` (validation table), `docs/perf.md` (benchmarks and reference devices), `CHANGELOG.md`.
- [ ] License files for bundled third-party code (gl-matrix, fflate and others).

**Gate:** a new contributor or agent can go from clone to a passing PR using only the README and `AGENTS.md`.

## Definition of done, risks and ordering

Order: Phase 0 → 1 → 2 (ship **v1.1**) → 8a → 3 → 4 (ship **v2.0**) → 5, 6a, 7a in any order (ship **v2.1**) → 6b, 7b (ship **v2.2**). Phases 8b and 9 run continuously; a Phase 10 slice closes every phase. The phase map in the Overview shows the same dependencies.

**Owner decisions needed before or during Phase 0**

- [ ] Purge old data blobs from git history (force-push), or leave history as is (default)?
- [ ] Which reference desktop and mid-range phone the perf gates use.
- [ ] Data source for v1.1 if Lowell is still down: MPCORB (default) or wait.

**v1.1 is done when**

- [ ] Every planet is within its per-planet threshold of Horizons at the data epoch and at ±10 years, and time 0 comes from the data's own epoch, recorded in `astorb3d.meta.json`.
- [ ] The shipped binary is rebuilt from an archived, checksummed source.
- [ ] Keyboard shortcuts act once per input; cinematic mode survives a point-size change.
- [ ] Lowell's required attribution (and MPC's, if used) is visible in the app and README.
- [ ] v1.1 is tagged and live.

**v2.0 is done when**

- [ ] First asteroids render within 1 s on broadband; the full catalog streams without dropped frames; repeat visits load from cache.
- [ ] p95 frame time ≤ 16.7 ms with the full catalog on the reference mid-range phone, adaptive quality off.
- [ ] The dataset rebuilds byte-identically from either archived source and its checksum.
- [ ] `npm run build` output is what's deployed; PR and nightly CI are green.
- [ ] README and `AGENTS.md` are accurate and are the only guidance files (other agent files are pointers).

**v2.1 and v2.2** are done when the gates of their phases (5, 6a, 7a; then 6b, 7b) pass.

**Risks**

| Risk                                                                                                        | Impact                                      | Mitigation                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Lowell catalog unavailable or layout changes (its page already reports the database service as unavailable) | Data refresh breaks                         | MPCORB as a first-class source with automatic fallback; parser fixtures for both; validation step in the refresh job |
| MPCORB records carry mixed epochs                                                                           | Objects drawn at the wrong phase            | Converter propagates every record to the common epoch; count and max Δt logged; Horizons spot checks                 |
| Moving data out of `master` before `dist/` deploys                                                          | Live site 404s on its data                  | Data moves only after Phase 8a step 1; deploy smoke test checks the data URL                                         |
| Schedule slips past the 15–19 week estimate                                                                 | Late v2                                     | Four releases, so users get value at each step; DE440 and families already cut to stretch                            |
| Float32 time precision far from the epoch                                                                   | Visible jitter past a few centuries         | Clamp to ±1,000 years and 3000 AD; accuracy-horizon indicator                                                        |
| `DecompressionStream` missing on older browsers (Safari before 16.4)                                        | Streaming fails                             | fflate fallback in the worker                                                                                        |
| GPU and worker memory on low-end phones (23.8 MB vertex buffer plus a 23.8 MB worker copy)                  | Crashes or context loss                     | `deviceMemory` cap where available; worker drops its copy and picking reads back from the GPU; context-loss handling |
| Service worker serves a stale or broken shell                                                               | Fixes can't reach users                     | Network-first shell, version check, `?nosw=1` escape hatch, tested unregister path                                   |
| Brightest-first ordering biases the early view toward large objects                                         | Early frames look sparser in some regions   | Compare against a random shuffle in Phase 3 and pick by screenshot                                                   |
| WebGL 2 requirement excludes a few old devices                                                              | Some users see a message instead of the app | Clear message with a link to a static screenshot gallery                                                             |
