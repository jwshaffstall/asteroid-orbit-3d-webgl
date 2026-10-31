# astorb3d v2 — Integrated Implementation Plan

Oct 31, 2026 · @John Shaffstall

## Overview

Fix the astronomy first, then stream the 1.58M-asteroid dataset in small, verified chunks that render as they arrive, then layer on performance, accuracy, UX and new features. There are 11 phases (0–10), shipped as four releases over about 14–18 weeks of solo work. Each phase ends in a gate you can test.

This plan merges `plans/archive/plan.md` (Revision 3) and `plans/archive/plan-alternative.md` (Revision 2.0) and is the plan of record. `plan.md` supplies the backbone: phases, releases, the compact v2 record format and concrete numbers. The alternative supplies integrity checks, a first scene that doesn't wait for data, object identity, the counter semantics, hosting budgets, the error-budget framing and agent guardrails, plus four current-code bugs that `plan.md` missed (all confirmed against `master` @ f6ea7dc). The conflicts and how they were resolved are listed below.

**Guiding principles**

- **Correct before pretty.** Every physics change is checked against JPL Horizons vectors in CI. Visual effects never change catalog trajectories.
- **The scene comes first, the data second.** The Sun, planets and controls appear without waiting for any asteroid bytes. The first asteroids follow within \~1 s on broadband, and the rest arrive while you interact.
- **Only verified bytes are drawn.** Each chunk is length-, schema- and hash-checked before it reaches the GPU. A bad chunk is dropped and retried. It never shows up half-drawn.
- **Reproducible data.** Anyone can rebuild the exact shipped dataset from a script and an archived, checksummed source file. The live URLs change daily, so they are for refreshes, not for reproducing a build.
- **One source of truth.** One Kepler solver (shared by JS, shader snippet and tests), one data spec, one agent-guidance file.
- **Write it once.** Structural code is written in its final module layout; nothing is rewritten in the legacy script first.
- **An educational scientific visualization.** Positions are correct within a stated tolerance and honestly labeled; it is not a research tool, an ephemeris or a prediction service. Terms are defined in `GLOSSARY.md`.
- **Honest about limits.** The UI always shows the displayed date, the epoch, the model (two-body), and an accuracy caveat when you are past the validated window.
- **Agent-friendly slices.** Each checkbox is sized for one PR with its own test. Any PR that changes a constraint stated in `AGENTS.md` / `CLAUDE.md` updates those files in the same PR.

Checkbox key: `[x]` done and verified, `[~]` partly done (see its note), `[ ]` not started.

Effort key: **S** ≈ 1–2 days, **M** ≈ 3–5 days, **L** ≈ 1–2 weeks, **L+** ≈ 3 weeks or more, of solo or agent-assisted work.

### Releases

| Release | Phases    | What users get                                                                                                                                     | Effort (solo) |
| ------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| v1.1    | 0, 1, 2   | Correct planet positions on the data's real epoch, a freshly rebuilt catalog, input and rendering bug fixes, data attribution, on the existing app | 1.5–2.5 weeks |
| v2.0    | 8a, 3, 4  | Modular codebase; scene before data; first verified asteroids in about 1 s; full catalog streams smoothly on an iPhone 13 Pro                      | 5.5–7.5 weeks |
| v2.1    | 5, 6a, 7a | Real dates, real moon orbits, speed slider, share links, pick / search / filter, Jupiter co-rotating view                                          | 4.5–5.5 weeks |
| v2.2    | 6b, 7b    | UX polish, linked plots, new color modes                                                                                                           | 2.5–3.5 weeks |

Phases 8b (tests), 9 (CI and deploy) and 10 (docs) run continuously and are included in those estimates.

Order: Phase 0 → 1 → 2 (ship **v1.1**) → 8a → 3 → 4 (ship **v2.0**) → 5, 6a, 7a in any order (ship **v2.1**) → 6b, 7b (ship **v2.2**). Phases 1 and 2 can run in parallel. 8a comes before streaming so the loader is written once.

### How the two plans were reconciled

| Question               | `plan.md`                                          | `plan-alternative.md`                                     | Decision and why                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Record format          | 16-byte quantized records (a float32 + 6 × uint16) | Keep 24-byte float32; quantize only after an error budget | **16-byte, with the error budget written first** (Phase 3). The position error from quantization is fixed (it doesn't grow with time), ≈ a·0.0055° ≈ 3e−4 AU at 3 AU, which is under 1 px at every preset view. If the closest zoom makes it visible, that zoom gets a floor or a full-precision path for the selected object. A one-third smaller download is worth it. |
| WebGL version          | WebGL 2 required from 8a                           | Keep WebGL 1 for Release 1, WebGL 2 later                 | **WebGL 2 required from v2.0.** Support is near-universal by 2026, and one renderer is half the test matrix. v1.1 still runs on the existing WebGL 1 code.                                                                                                                                                                                                               |
| GPU buffers            | One preallocated buffer, prefix draw count         | One buffer per chunk                                      | **One buffer, filled in order.** One draw call, and LOD is a single draw count. A chunk that arrives out of order waits for the ones before it. The low-memory cap stops streaming early instead of allocating per chunk.                                                                                                                                                |
| Integrity              | Content-hashed file names only                     | SHA-256 verify every chunk before drawing                 | **Both.** `crypto.subtle.digest` on 1 MiB takes a few ms. Verify-then-upload is the contract; intra-chunk streaming display is out of scope.                                                                                                                                                                                                                             |
| First chunk            | Brightest-first, 65,536 records                    | Stratified-sample bootstrap of 32,768                     | **Small chunk 0 (16,384 records, 256 KiB), then 65,536-record chunks.** Brightest-first is the default; Phase 3 compares it by screenshot against stratified and random orders before locking in. Every order keeps lower detail a strict prefix of higher detail.                                                                                                       |
| Web Worker             | Decode in a worker and keep the CPU copy there     | Worker only if profiling warrants                         | **No worker in v2.0.** `DecompressionStream` already runs off the main thread, and de-planarizing 1 MiB costs \~1–2 ms on the main thread. A pick reads 16 bytes back from the GPU. 7a adds a worker only for filter counts and the 2D plots.                                                                                                                            |
| Service worker         | In v2.0                                            | Optional, not Release 1                                   | **Cut altogether** (Oct 31 decision). Content-hashed chunks already cache well in the HTTP cache, and a broken service worker is the hardest bug to ship a fix for.                                                                                                                                                                                                      |
| Resonance block        | Delete                                             | Keep as an optional "illustrative" mode                   | **Delete.** It invents libration terms and slows Hildas to 1.29× Jupiter's mean motion; correct two-body motion from a correct epoch already shows the structure.                                                                                                                                                                                                        |
| Release structure      | 4 releases                                         | Release 1 with gates G1–G6 and 31 PRs                     | **4 releases**, with the alternative's evidence-based gates folded into each phase gate.                                                                                                                                                                                                                                                                                 |
| Stable object identity | Designations file in record order                  | Full `stableObjectId ↔ recordKey` contract                | **Lightweight version:** share links and pinned objects use the designation (e.g. `1`, `2004 MN4`), never the record index. A designations file in record order resolves designation to index, and it is tied to the manifest version.                                                                                                                                   |
| DE440, families        | DE440 and families cut to stretch                  | Ephemeris path in the future backlog                      | **Stretch.**                                                                                                                                                                                                                                                                                                                                                             |

---

## Phase 0 — Baseline and safety net (S–M)

Goal: a green CI baseline, a reproducible dataset from either of two sources, and reference truth to test against, before anything changes.

**Repo hygiene and tooling (do first, so later diffs are clean)**

- [x] Tag current `master` as `v1-baseline` so every later screenshot and benchmark has a comparison point. _(Done Oct 31: local tag on `9322001`; push it with `git push origin v1-baseline`.)_
- [x] Keep Prettier (the codebase's Allman brace style depends on `prettier-plugin-brace-style`) and remove `oxfmt`; remove lint rules duplicated between ESLint and oxlint. Land the resulting reformat as one commit and add it to `.git-blame-ignore-revs`. _(Done: `oxfmt` removed; `eslint-plugin-oxlint` turns off the 69 ESLint rules oxlint already runs. No reformat was needed (only the archived plan failed the check; it's now in `.prettierignore`), so there is no blame-ignore commit.)_
- [x] Node 24 LTS in CI and `engines` (Node 22 is in maintenance by late 2026; 24 strips TypeScript types natively, which Phase 8a relies on). Current major versions of the checkout, setup-node and upload-artifact actions; `npm ci` instead of `npm install`; cache Playwright browsers. _(Done: `engines.node >= 24`; checkout/setup-node/upload-artifact v7, cache v6.)_
- [x] Inventory third-party licenses in `scripts/js/libs/` and keep the required notices. _(Done: `THIRD_PARTY_NOTICES.md`; gl-matrix 2.2.0 is BSD-2-Clause, stats.js is MIT.)_
- [x] Source plans moved to `plans/archive/` (accepted Oct 31, 2026).
- [x] Raw catalogs in `temp/` (`*.dat`, `*.dat.gz`) are gitignored, so a 423 MB source file can't be committed by accident. Add `.junie/` too if it shouldn't be tracked (`.idea/` already is ignored).

**Data**

- [x] Write `tools/fetch-catalog.mjs` for Lowell astorb (download page <https://asteroid.lowell.edu/astorb/>, confirmed working on Oct 30, 2026; record the exact file URL the script uses). **Lowell is the only source.** If it's down, retry another day; MPCORB is documented as plan B, and its parser is a stretch item. _(Done: the file URL is `https://ftp.lowell.edu/pub/elgb/astorb.dat.gz` (108.97 MB); `npm run data:fetch`.)_
- [~] **First snapshot, already downloaded:** `temp/2026-10-30-astorb.dat` (Lowell, uncompressed, 423,277,592 bytes, SHA-256 `4e3d54fbbf74bf9575f359f66d2f5f14c8066858b08e4a1fed059e00cf9dba73`). Checked on Oct 31: 1,579,394 records, every line exactly 267 characters with LF endings, and **one shared epoch, 2026-09-17** (JD 2461300.5). That is 92,170 more records than the shipped binary. This file is the v1.1 source; archive it gzipped as release asset `data-lowell-20261030`. _(Partly done: `temp/2026-10-30-astorb.dat.gz` created with `gzip -9 -n` (sha256 `4c6e1c7d…75ed`) and recorded in `data/manifest.source.json`. **Owner:** upload it with the `gh release create data-lowell-20261030 …` command that `npm run data:refresh` prints, then set `archived: true`.)_
- [~] Archive each fetched raw file as a GitHub release asset (`data-<source>-<YYYYMMDD>`), and record its SHA-256, download date, source, record count and epoch distribution in `data/manifest.source.json`. The build reads from the archived asset by checksum. That is what makes the build reproducible. _(Partly done: `data/manifest.source.json` and the tooling exist; the upload itself is the owner's step (it publishes a public release).)_
- [x] Add parser fixtures parsed by **field offsets, not line length**: Lowell's records (267 characters per line in the Oct 2026 file; the docs say 266 columns, so the parser must not depend on either number) with LF and CRLF endings; Lowell's 2018 format changes (inclinations above 99.99999°, a ≥ 1000 AU written as F13.7 instead of F13.8, an optional leading space before i and a, asteroid numbers stored as character fields); blank and rejected rows. Today's code expects 255, 267 or 268 characters depending on the file. _(Done: `tests/fixtures/astorb-lines.dat` holds 13 real lines incl. 20461 Dioretsa (i = 160.4°) and 2005 VX3 (a = 1037 AU); the old parser misread both, and the shipped binary had zero objects with i ≥ 100° vs 160 in the catalog.)_
- [x] Stop tracking the 2013 `astorb/astorb.dat.gz` (623,669 records) on `master`; it contradicts the shipped binary (1,487,224 records) and nothing loads it. Leave `temp/astorb3d.bin` in place: the live site serves it from the repo root until Phase 8a switches deploys to `dist/`. **Decided:** git history is left alone (no `filter-repo`, no force-push); old data blobs stay in history. _(Done: untracked and gitignored; history untouched.)_

**Reference truth and harness**

- [x] Fix the screenshot tool: `page.waitForFunction(fn, { timeout })` passes the options object as the function's argument, so the 120 s timeout is ignored and the default 30 s applies. Use `waitForFunction(fn, undefined, { timeout })`. Make a render timeout fail the job instead of uploading a blank screenshot as a success. _(Done; also replaced its static server, whose `startsWith` path check could be bypassed by a sibling directory sharing the prefix, with `tools/static-server.js`.)_
- [x] Add deterministic URL parameters (`?t=<seconds>&cam=<az,el,dist>&color=<n>&paused=1`) so screenshots and tests render an identical frame every run. _(Done, plus `&debug=1` (counts `gl.getError()`) and `&data=<relative .bin>` (tests load the fixture).)_
- [x] Capture 2 smoke screenshots (one fixed time and camera, one mobile viewport); upload as CI artifacts and re-baseline them at the end of Phase 1. _(Done in `.github/workflows/ci.yml` on the fixture dataset; full-catalog screenshots in the on-demand `full-catalog.yml`.)_
- [x] Add a smoke test that fails on any console error or `gl.getError()` during a 10-second run. _(Done: `tests/e2e/app.e2e.mjs`, 10-second run with `?debug=1`.)_
- [~] Write a short perf note in `docs/perf.md`: download size and rough FPS on the owner's desktop and **iPhone 13 Pro** (iOS Safari, 3× display; Safari usually runs `requestAnimationFrame` at 60 Hz). For comparison only, not a gate. _(Partly done: `docs/perf.md` has sizes and a headless timing; desktop and iPhone FPS are for the owner to fill in.)_
- [x] Pull JPL Horizons heliocentric ecliptic J2000 state vectors into `tests/fixtures/horizons/` for the epoch, epoch ±50 days and epoch ±10 years. Bodies: the eight planets (Earth as the Earth–Moon barycenter), Ceres, Vesta, 624 Hektor (Trojan L4), 1172 Äneas (Trojan L5), 153 Hilda, 433 Eros (NEO), 3200 Phaethon (e ≈ 0.89), Pluto, and the major moons for Phase 5. Commit the fetch script (`tools/horizons-fixtures.mjs`) so the fixtures can be regenerated for a new epoch. _(Done: `npm run data:horizons -- --epoch YYYY-MM-DD`; also writes `data/dwarf-planets.json`. Pluto is included; the major moons are deferred to Phase 5, which is when they're needed.)_
- [x] Build a deterministic \~20,000-record fixture dataset sampled across every dynamical class, for PR CI and visual tests. The full catalog runs only in the on-demand full-catalog job (Phase 9), since software-rendered WebGL is too slow for 1.58M points on every PR. _(Done: `tests/fixtures/astorb-fixture.bin`, 19,994 records, all 15 classes, byte-identical rebuilds; `npm run data:fixture`.)_
- [x] Get `npm ci`, `npm test`, `npm run lint`, `npm run format:check` and `npm run build` running in CI. Mark the known-broken build step as expected-fail until Phase 8a fixes it: today `dist/` contains neither the classic scripts nor `temp/astorb3d.bin`, and an audit step in CI proves this. _(Done: `ci.yml`; the `build` job is `continue-on-error` with a `dist/` audit until Phase 8a.)_

**Gate:** CI green on the baseline; the dataset rebuilds from an archived source file with one command, and its checksum matches; Horizons fixtures and the fixture dataset committed; the screenshot job fails on a real timeout.

_Status (Oct 31, 2026): met locally (tests, lint, format, browser tests, byte-identical rebuild from the archived `.gz`). CI runs once the branch is pushed; the release-asset upload is the owner's step._

## Phase 1 — Astronomical correctness (M)

Goal: planets and asteroids share one correct epoch, and the scene is a faithful two-body simulation: no planet or spot-checked asteroid is visibly off from where Horizons puts it (ADR 0001).

**Dataset for v1.1**

- [x] **Decided:** v1.1 commits the rebuilt binary to git once (37.9 MB, under GitHub's 50 MB warning); from v2.0 on, datasets never go into git. Rebuild `temp/astorb3d.bin` in the **unchanged** v1 layout (6 × float32) from the archived catalog, using the existing `astorb2bin.js` with the Phase 1 parser fixes. Write `temp/astorb3d.meta.json` next to it with the epoch (JD), record count, source and source SHA-256. The v1 binary gets no header, so its format only changes once, in Phase 3. _(Done: 1,579,394 records, 37,905,456 bytes, epoch 2026-09-17; also writes `temp/astorb3d.rejected.json`. `npm run data:build` rebuilds it byte-identically from the archived `.gz`.)_
- [x] Validate in the converter: the byte length is a multiple of 24; no NaN or Infinity; reject e ≥ 1 and a ≤ 0. Log how many were dropped, with sample rows, to a rejection report. _(Done: 0 rejected in the Oct 2026 snapshot.)_

**Planets**

- [x] Fix Earth: today the code stores ϖ in the ω field (102.94°), L in the M field (100.46°) and Ω = −11.26°, which puts Earth at about 194° heliocentric longitude at J2000 instead of \~100.46°. Use the Standish J2000 values consistently: a = 1.00000261, e = 0.01671123, i = −0.00001531°, Ω = 0°, ω = ϖ − Ω = 102.93768193°, M = L − ϖ = 357.52688973°.
- [x] Generate all planet elements with a script (`tools/planet-elements.mjs`) from Standish Table 1 (valid 1800–2050), converting ϖ and L to ω and M in code, so no hand conversion can drift again. The other planets have the same kind of hand conversion (Mars ω and M are rounded); replace them all. _(Done differently: no generated file. `planetElementsAt()` in `scripts/js/astorb-astro.js` holds Table 1 verbatim and converts ϖ and L to ω and M in code at runtime, which meets the same goal with one less artifact.)_
- [x] Propagate planets with the table's own rates: L(T) = L₀ + L̇·T with T in Julian centuries from J2000, plus the per-century rates for a, e, i, ϖ and Ω. Stop deriving planet mean motion from μ☉ alone: that ignores each planet's mass and puts Jupiter about 0.3° off by 2025. _(Done: worst planet vs Horizons is Saturn at 0.074°.)_
- [x] Note in code that the table gives the Earth–Moon barycenter; Earth's \~4,700 km offset from it is under 0.002° as seen from the Sun.
- [x] Take dwarf-planet elements from the same epoch as the asteroids: Ceres (and Pallas, Vesta for highlighting) straight from their catalog rows; Pluto, Haumea, Makemake, Eris from Horizons at the epoch, generated by the fixture script rather than pasted in by hand. _(Done via `temp/astorb3d.meta.json` → `bodies`; Pallas and Vesta are in the metadata, ready for highlighting.)_
- [x] Label moon orbits "illustrative" in the UI until Phase 5 gives them real planes and phases. _(Done in the help panel.)_

**Epoch**

- [x] Parse each record's epoch (columns 107–114, YYYYMMDD) and treat it as a UTC date; the 69 s TT/UTC difference is invisible here. Lowell records share one epoch; assert that, and log any exceptions.
- [x] Any record whose epoch differs from the dataset epoch is propagated to it in the converter with two-body mean motion: M ← M + n·Δt. This is cheap insurance for Lowell and a prerequisite for a future MPCORB source. Log how many were propagated and the largest Δt. _(Done and tested; records more than 10 years off are rejected instead.)_
- [x] At runtime, read the epoch from `astorb3d.meta.json` (the v2 manifest from Phase 3 on). The epoch is the internal time origin (t_sim = 0); the app **opens at today's date** (sim date = now), not at the epoch. Delete the hard-coded `Date.UTC(2013, 9, 15, …)` constant and the "October 15, 2013" comments. The deterministic `?t=` parameter still pins an exact sim date for tests. _(Done. The header comment "Tuesday, October 15, 2013" in the source files is the author's date and was kept.)_
- [x] Evaluate planets at T = (epoch − J2000 + t_sim) in Julian centuries, from the metadata value, in float64 in JS.

**Shader physics**

- [x] Delete the Jupiter resonance block (Trojan and Hilda mean-motion blending plus invented libration terms). It slows Hildas from 1.50× to 1.29× Jupiter's mean motion. Plain two-body motion from a correct epoch keeps Trojans and Hildas in place for decades. It also removes `exp`/`pow` work for every vertex.
- [x] Switch every vertex shader (and every fragment shader that uses these values) to `precision highp float;`. μ = 3.96e−14 and time in seconds both fall outside mediump's guaranteed range. Check `getShaderPrecisionFormat(VERTEX_SHADER, HIGH_FLOAT)` at startup and show a clear message if highp isn't available, instead of silently drawing wrong orbits. _(Done. Also found that the default "Angular Velocity" color mode passed ~1e-8 rad/s to a mediump fragment shader, below its range; it now uses rad/day.)_
- [x] Improve the Kepler solver: reduce M to \[−π, π\]; use Danby's starting value E₀ = M + 0.85·e·sign(sin M) for every e; use a fixed iteration count picked by test (the smallest count that meets the float32 tolerance at e = 0.99 for all M; expected 5–6). _(Done with **7** iterations: 6 leaves 1.9e-4 rad of error at e = 0.99, 7 reaches the float32 floor.)_
- [x] JS gets two functions from one source: `solveKepler()` (float64, iterates until |ΔE| < 1e−12, at most 50 times) as the reference, and `solveKeplerF32()`, which mirrors the GLSL step for step using `Math.fround`, as the stand-in for the shader under test. _(Done; plus `reduceMeanAnomalyF32()` mirroring the shader's float32 reduction of M.)_
- [x] Clamp the reachable sim range to ±1,000 years from the epoch. Show "planet positions approximate" outside 1800–2050 (Standish Table 1's fitted range, used everywhere) and a notice past ±100 years, since two-body drift and float32 phase error both grow with time.

**Tests**

- [x] Kepler: `solveKepler` residual < 1e−12 rad at e = 0, 0.2, 0.5, 0.9, 0.99 over a dense M grid, including negative time and wrap across ±π; return to the same position after exactly one period. `solveKeplerF32` within 2e−6 rad of `solveKepler` on the same grid. _(Done. `solveKeplerF32` is compared on the same float32-reduced M the shader sees: within 2e-6 rad for e ≤ 0.9; float32 conditioning near e = 1 needs 1e-5 at e = 0.99.)_
- [x] Planet tests (bug catchers, not precision certificates): every planet's heliocentric direction within 0.5° of Horizons at the epoch and at ±10 years. Include an explicit test that Earth's L isn't used as M. _(Done, including a regression test that the old Earth elements would fail.)_
- [x] Asteroid spot checks: Ceres, Vesta, Hektor, Äneas, Hilda, Eros, Phaethon within 0.5° of Horizons at epoch ±50 days. _(Done, plus Pluto from Horizons elements.)_

**Gate:** all accuracy tests pass; a screenshot with `?t=0` (sim date = epoch) shows Earth, Mars and Jupiter where Horizons puts them at the epoch; smoke screenshots re-baselined.

_Status (Oct 31, 2026): met. Planets within 0.074° of Horizons (Saturn worst), asteroid spot checks and Pluto within 0.5°; `npm run screenshot` at `?t=0` shows the epoch date 2026-09-17._

## Phase 2 — Quick fixes and the v1.1 release (S)

Goal: ship Phase 1's correctness work on the existing app within days. Only small, local fixes belong here; structural rewrites wait for Phase 8a so they are written once, in the new module layout.

**Fixes**

- [x] Remove the canvas `keydown` listener (`astorb3d.js:1546`) and keep only the window one; today a focused canvas gets every key twice (Space pauses then unpauses, arrows change speed 4×, R randomizes twice).
- [x] Ignore `event.repeat` for toggles; skip shortcuts while focus is in a button, input, select, textarea or contenteditable element.
- [x] **Fix the density LOD stride bug.** Halving density doubles the attribute stride (24 B × 2ᵏ, up to the record count), but WebGL caps stride at 255 bytes, so from the 4th halving on, `vertexAttribPointer` raises `INVALID_VALUE` and the asteroids vanish. Replace it with a prefix draw count (`drawArrays(0, n)`) at stride 24; Phase 4 keeps the same approach.
- [x] Make the XHR loader settle once: `onreadystatechange`, `onerror` and `ontimeout` can each call the callback, so a single failure can trigger it twice. Keep one terminal state. _(Done; also raised the 45 s timeout, which failed the 38 MB download below ~7 Mbit/s, to 5 minutes.)_
- [x] Clamp the per-frame wall-clock delta (e.g. to 100 ms) so returning to a background tab doesn't jump the simulation by minutes × timeScale.
- [x] Check every attribute and uniform location before use; never `enableVertexAttribArray(-1)`, especially in the body shader.
- [x] Stop the Point Size handler from resetting `cinematicMode` (it silently turns cinematic off while the button still reads "On").
- [x] Disable `depthMask` during the additive asteroid pass; additive blending with depth writes makes results depend on draw order.
- [x] Add the data attribution Lowell requires to the page footer and README: NASA grant NAG5-4741 (PI E. Bowell), the Lowell Observatory endowment, NASA PDART grant NNX16AG52G (PI N. Moskovitz), and the citation DOI 10.1016/j.ascom.2022.100661. The footer shows the epoch and snapshot date from `astorb3d.meta.json`.
- [x] Fix small defects: dead `if (event)` in mouseup; `</br>` → `<br>`; parser message says 255 but checks 267; Python shebang `#!usr/bin/env` → `#!/usr/bin/env`; `new Buffer()` → `Buffer.alloc()`; `for…in` over arrays → indexed loop (`astorb2bin.js:115`).
- [x] Delete the unused vendored libraries `sylvester.src.js` and `glUtils.js` (their `<script>` tags are already commented out) along with the commented-out tags.

**Moved to Phase 8a** (structural, written once in the new layout): render loop decoupled from data loading, Pointer Events input, wheel normalization, log rewrite, precomputed label points, reused body buffer, load-error UI with Retry, context-loss handling, canvas background decision.

**Release**

- [ ] Tag and deploy v1.1 with a changelog entry. It deploys the same way as today (repo root); the move to `dist/` comes in Phase 8a. The live site shows planets and asteroids on the same, correct epoch, and the HUD or footer names that epoch.

**Tests**

- [x] Playwright: Space toggles pause exactly once with the canvas focused; Point Size leaves cinematic mode unchanged; ten density halvings and doublings produce zero GL errors and a non-empty frame; no console errors during a 10-second run. _(Done: `npm run test:e2e`, 7 tests, also on an iPhone 13 Pro-sized viewport.)_

**Gate:** input and density tests pass; Phase 1 accuracy gates met; v1.1 is live.

_Status (Oct 31, 2026): input, density and accuracy gates met on branch `feature/v1.1`. v1.1 is not live yet: merge to `master`, push, tag `v1.1` (Pages deploys `master` from the repo root)._

## Phase 3 — Data format v2 and verified progressive streaming (L)

Goal: the scene renders with no asteroid data; the first verified asteroids render within \~1 s; the rest stream in as \~1 MB chunks while the user is already interacting. The download is 25.3 MB before compression for the Oct 2026 catalog (1,579,394 × 16 bytes), against 37.9 MB in the v1 format. Builds on the Phase 8a module layout and WebGL 2.

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

- [ ] Note the quantization error in `docs/data-format.md` (one line: a fixed ≈ a·0.0055°, under a pixel at every preset view; see ADR 0003).

Classes (one per record): Atira, Aten, Apollo, Amor, Mars-crosser, Hungaria, inner / middle / outer main belt, Hilda, Trojan L4, Trojan L5, Centaur, TNO, other, reserved. Boundaries follow the **JPL Small-Body Database orbit-class definitions** where JPL has them (Atira, Aten, Apollo, Amor, Mars-crosser, inner / middle / outer belt, Trojan, Centaur, TNO), plus documented a / e / i boxes for Hungaria and Hilda, which JPL doesn't define. They are written down in `docs/data-format.md` with the JPL citation. Each record gets the **first** class that matches, in this order: Atira → Aten → Apollo → Amor → Mars-crosser → Trojan L4 / L5 → Hilda → Hungaria → inner / middle / outer belt → Centaur → TNO → other. Telling L4 from L5 needs Jupiter's mean longitude at the epoch, which comes from the Phase 1 planet module. The wider H range covers small NEOs, which reach H ≈ 33. There is no PHA flag: it needs Earth MOID, which the catalog doesn't provide. Designations, names and orbit-uncertainty values go in optional side files loaded on demand (Phase 7).

**File structure**

- [ ] `manifest.json`: `schemaVersion`, `catalogVersion` (hash of the content), record count, epoch (JD, UTC), reference frame (ecliptic J2000), data source with URL, snapshot date and SHA-256, converter version, quantization parameters, class table, and a chunk list (file name, record count, decoded byte length, decoded SHA-256, a/H range).
- [ ] Chunk 0 holds 16,384 records (256 KiB) for a fast first frame; every later chunk holds 65,536 records (1 MiB), 25 chunks for the Oct 2026 catalog. Names are content-hashed (`chunk-00-<hash>.bin`), so browsers can cache them forever. The sizes are benchmarked once (Phase 4 measurement) before being locked in.
- [ ] Store each chunk byte-planar (all M bytes, then all ω bytes, …) and gzip it; measure the real ratio and record it in `docs/perf.md`. The SHA-256 covers the **decoded**, de-planarized bytes, so the hash doesn't depend on how the host compresses.
- [ ] Order records brightest-first (lowest H) across the whole file, with ties broken by catalog number, then designation, so the output is deterministic. There is no secondary sort inside chunks, so the drawn range is always one contiguous prefix, and every LOD level is a strict subset of the next. Compare by screenshot against a stratified sample (by a, e, i and class) and a seeded random shuffle before locking the order in. Brightest-first leaves faint NEOs out of the early chunks.

**Converter**

- [ ] Replace `astorb2bin.js` with `tools/build-dataset.mjs`: stream the Lowell snapshot directly from gzip without building millions of JS objects; parse, validate, propagate to the common epoch, classify, sort, quantize, and write chunks plus manifest atomically (to a temp directory, then rename). Output must be byte-identical across runs (fixed gzip level, no timestamps in gzip headers).
- [ ] Write an audit report next to the output: accepted, rejected (by reason, with samples), duplicates, propagated records, min/max per field, epoch range, output bytes, hashes.
- [ ] In the same PR, update `AGENTS.md` / `CLAUDE.md` / `project_context.md`: the 6-float layout constraint and the `astorb2bin.js` reference become the v2 spec and `build-dataset.mjs`.
- [ ] Unit tests: parser fixtures from Phase 0; quantization round-trip error within the table's precision; class assignment on known objects (Eros = Amor, Apophis = Aten, Hektor = Trojan L4, Äneas = Trojan L5, 153 Hilda = Hilda, 434 Hungaria = Hungaria); manifest schema validation (malformed, wrong version, zero records, duplicate chunk names); chunks cover every accepted record exactly once; byte-identical rebuild.

**Streaming loader**

1. Start the render loop and draw the Sun, planets, orbit guides and controls **before** any catalog request. Nothing in the loop waits on the network.
2. Fetch `manifest.json`; allocate one GPU buffer for the full record count (25.3 MB of VRAM for the Oct 2026 catalog) and the VAO bindings.
3. Fetch chunk 0, then the rest with 3–4 requests in parallel (2 on slow connections), using `fetch()` + `ReadableStream` for byte progress only.
4. Decompress with `DecompressionStream('gzip')` (fflate fallback), de-planarize, check the decoded length and `crypto.subtle.digest('SHA-256')` against the manifest. A mismatch counts as a failed chunk. Records from an unverified chunk never reach the GPU.
5. `bufferSubData` the verified chunk into its slot and raise the draw count. A chunk that arrives out of order waits until the chunks before it land, so the drawn range stays a prefix.
6. New chunks fade in over \~0.5 s via a per-draw opacity uniform on that chunk's range.

- [ ] One manifest per session: each load runs under an `AbortController`, and a stale request (from a reload or a newer manifest) can't publish into the current buffer. Two catalog versions are never mixed.
- [ ] Retry each chunk independently with exponential backoff plus jitter, up to a fixed limit; retry a hash mismatch once with `cache: 'reload'`, then mark the chunk failed. A failed chunk shows a small warning with a Retry button and never stops the app.
- [ ] Replace the full-screen overlay with a non-blocking progress pill. Its counters are kept separate: **downloaded ≠ verified ≠ on GPU ≠ visible**. For example: "412,000 / 1,579,394 asteroids · 9.8 / 16.0 MB". States: Scene ready → Loading → Partial (n failed) → Complete. The UI never says "Complete" when only part of the catalog is shown.
- [ ] Respect `navigator.connection.saveData` and slow `effectiveType` where supported (Safari and Firefox lack the API): load chunks 0–3 by default, with a "Load full catalog (≈ N MB)" button.
- [ ] Optional memory cap: where `navigator.deviceMemory` ≤ 2 (Chromium only), stop streaming at a lower cap. Never require the API: Safari, and so the iPhone, doesn't have it, and there frame-time adaptation (Phase 4) does the job.
- [ ] Build data URLs from `import.meta.env.BASE_URL`, so they work under the GitHub Pages subpath.
- [ ] Keep the v1 loader behind `?data=v1` for one release, then delete it.

**Tests**

- [ ] PR CI on the fixture dataset: with all catalog requests blocked, the scene is interactive and no asteroids are drawn; chunks become visible in order; the draw count rises monotonically; a truncated chunk and a chunk with a flipped byte are rejected, never drawn, and recovered by retry; an out-of-order arrival doesn't open a gap; the counters agree in every state.
- [ ] On demand (the full-catalog job in Phase 9), with throttled network (Fast 3G and 4G): the full catalog loads, and time to first asteroids is recorded (reported, not gated).

**Gate:** scene visible with the network blocked; first verified asteroids appear long before the full catalog finishes (aim: \~1 s on broadband); streaming doesn't visibly stutter on the iPhone 13 Pro; no unverified record is ever drawn.

## Phase 4 — Runtime rendering performance (M)

Goal: the full catalog plays smoothly on an iPhone 13 Pro and on desktop, and the GPU idles when nothing moves. Completes release v2.0.

**GPU pipeline (WebGL 2, required since Phase 8a)**

- [ ] Bind the v2 record through a VAO: one `float` (a, offset 0), one normalized `4 × uint16 → vec4` (M, ω, Ω, i, offset 4), one normalized `uint16 → float` (e, offset 12), and one integer attribute via `vertexAttribIPointer` (H + class, offset 14). No attribute re-specification per frame.
- [ ] Benchmark an early-exit Kepler loop (up to 8 iterations, exit at |ΔE| < 1e−6) against the Phase 1 fixed count; keep it only if it measurably wins. Lanes in a GPU warp wait for the slowest one, and records aren't sorted by e, so the gain may be small.
- [ ] Store mean motion n and √(1 − e²) per record (or precomputed orientation factors) only if benchmarks show the shader is ALU-bound, counting the extra download and VRAM; skip if bandwidth-bound.
- [ ] Trim unused varyings, and branch on color mode only where it measurably helps.
- [ ] Prefix-count LOD only (`drawArrays(0, n)`); never discard millions of vertices in the shader when a smaller draw count does the same job.
- [ ] Add adaptive quality: adjust DPR first, then the draw count, from frame-time percentiles with hysteresis so it doesn't oscillate. It never triggers network requests or reshuffles points. Show when it is active ("showing 900k of 1.58M"), and allow turning it off.
- [ ] Draw planet and dwarf-planet orbit lines from precomputed positions with a small line shader and one color per orbit.

**Trails**

- [ ] Replace 3× redraw motion blur with a ping-pong framebuffer that fades the previous frame: one asteroid draw, trails of any length.
- [ ] Clear (or fade within a few frames) the trail buffer while the camera moves, since feedback trails smear the whole scene under camera motion; let trails rebuild once the camera has been still for \~200 ms.
- [ ] Keep the old blur only if side-by-side screenshots show it clearly better.

**CPU and power**

- [ ] Render only when something changes: sim time running, camera moving, a chunk fade-in active, trails still decaying, or any state change. Otherwise skip the frame. Pause entirely when the document is hidden or the canvas has zero size.
- [ ] Cap device pixel ratio at 2 (3× phones otherwise shade 2.25× the pixels for no visible gain); add a quality setting.
- [ ] Cache uniform values and skip redundant `useProgram`/uniform calls.
- [ ] Update the status bar every 250 ms from cached elements.
- [ ] Bounded allocation in the hot path: no per-frame typed-array or object allocation (check the GC with the performance panel).

**Measurement**

- [ ] Profile with Spector.js and the browser performance panel; record GPU ms (via `EXT_disjoint_timer_query_webgl2` where available; Safari doesn't have it, and CPU time is never reported as GPU time), CPU ms and FPS at 1/2/4 px on the desktop and the iPhone 13 Pro in `docs/perf.md`. Profile the iPhone through Safari Web Inspector over USB.
- [ ] Add a `?bench=1` mode that runs a fixed 20-second camera path with adaptive quality off and prints frame-time percentiles. Use it for the one-time chunk-size benchmark (256 KiB / 1 MiB / 2 MiB): time to first asteroids, gap between visible updates, upload p95, request count.
- [ ] Synthetic scale tests at 100k, 500k, 1M and 2M records, so catalog growth doesn't surprise us.

**Release**

- [ ] Tag and deploy v2.0 once Phases 8a, 3 and 4 pass their gates.

**Gate:** with adaptive quality **off**, the full catalog at 2 px plays smoothly (no visible stutter, about 60 FPS) on the iPhone 13 Pro in Safari, measured with `?bench=1`, with no regression from the previous release; when idle (paused, still camera) the app skips frames; v2.0 is live.

## Phase 5 — Dates, moons and honest labels (S–M)

Goal: the sim shows real calendar dates, moons move in their real planes, and the app labels where two-body motion stops being trustworthy. Part of release v2.1.

**Time and dates**

- [ ] Keep sim time as a float64 JD (UTC) in JS; pass float32 seconds-from-epoch to the shader each frame.
- [ ] Show the simulated UTC date and Julian Date in the HUD instead of "Time: X years", next to the epoch and the snapshot date.
- [ ] Add "Jump to date" (date picker), "Epoch", and "Now" (sets sim time to the real current time at 1× speed for a live view); step by day / month / year; reverse playback.

**Planets** (secular rates already landed in Phase 1)

**Moons**

- [ ] **Kept in v2.1:** give moons real orbital planes (inclination and node relative to the ecliptic via each planet's pole) and correct phase at the epoch from Horizons; Triton stays retrograde. Remove the "illustrative" label once the moon spot checks (within 0.5° of Horizons as seen from the parent planet, at the epoch) pass.
- [ ] Add a moon-distance exaggeration control so moons sit visibly outside their planet's sprite, labeled as not to scale.

**Honesty about limits**

- [ ] Show an "accuracy horizon" indicator: green within ±50 days of the epoch, amber to ±10 years, red beyond, with a one-line explanation of two-body drift. There is **one** HUD indicator, based on the main belt; its tooltip says NEOs drift faster and that this isn't a prediction service. Each info card (Phase 7a) shows the caveat for that object's dynamical class.
- [ ] Say in the About panel how planets are computed (JPL's approximate elements, fitted for 1800–2050) and that positions outside that range are approximate.
- [ ] Add a size-scale toggle: true physical radii versus the current log-exaggerated sizes, labeled clearly.

**Gate:** HUD dates correct in UTC; moons pass their spot checks; the accuracy indicator and the "approximate" notices appear at the right sim dates.

## Phase 6 — User experience (6a M, 6b M)

Goal: the canvas gets most of the screen, controls read in plain units, and any view can be shared as a link. Split so the essentials ship in v2.1 and the polish in v2.2.

**6a — Essentials (v2.1)**

- [ ] Give the canvas the space: debug log behind a Debug toggle (it takes 160 px today), smaller header.
- [ ] Replace double/halve buttons with a log-scale speed slider from 1 s/s to 10 yr/s, plus presets (Real time, 1 day/s, 1 month/s, 1 year/s); show speed in human units ("1 year / second") instead of "1.0e+6x". **The app opens at today's date, playing at the current default speed (10⁶×, shown as "≈ 12 days / second")**; a Now button returns to today.
- [ ] Add a timeline scrubber spanning the accuracy horizon, with the epoch and today marked.
- [ ] Encode time, speed, camera, color mode, point size, filters and the selected object's **designation** in the URL hash; a Share button copies the link. Reuse the Phase 0 deterministic parameters' parser; validate the length and range of every value.
- [ ] Remember preferences in `localStorage` (wrapped in try/catch). Precedence: URL hash > stored preferences > defaults, so a shared link always reproduces the sender's view.
- [ ] Show a legend for the active color mode: gradient, value range and units.
- [ ] **Find the coolest palette we can and make it the default** (owner decision, Oct 31: looks first, colorblind safety not a goal for now). Prototype several candidates side by side in a throwaway page (for example magma, inferno, turbo, a custom deep-space gradient), compare them in the belt and Trojan preset views on desktop and the iPhone, and keep the current palettes as options.
- [ ] Show buttons as toggles with `aria-pressed`; throttle screen-reader status updates to every few seconds and announce only major transitions politely; check contrast in both themes.
- [ ] Touch targets ≥ 44 px; safe-area padding; Fullscreen button; block iOS pull-to-refresh on the canvas only.
- [ ] Allow page zoom outside the canvas (drop `user-scalable=no` and `maximum-scale=1`).
- [ ] Honor `prefers-reduced-motion`: no cinematic mode or trails by default.
- [ ] First-visit hint overlay ("Drag to orbit · pinch to zoom · tap a dot for details"), dismissible and reopenable from Help. Ship it with 7a, since "tap a dot" needs picking.

**Gate 6a:** Lighthouse accessibility ≥ 90; a shared link reproduces the exact view, including the selected object; the canvas occupies ≥ 75% of a phone screen with controls collapsed.

**6b — Polish (v2.2)**

- [ ] Group controls into Time / View / Display / Data, with icons and tooltips, in a side drawer on desktop and a bottom sheet on mobile.
- [ ] Add a `?` overlay listing every keyboard shortcut, plus keyboard camera control (WASD, or Shift + arrows, since plain arrows change speed).
- [ ] Camera damping and inertia (off with reduced motion); double-click or double-tap a planet to focus and follow it; Reset View button.
- [ ] Preset views: top-down, edge-on ecliptic, inner system, asteroid belt, outer system, Jupiter co-rotating frame (from Phase 7a).
- [ ] Two-finger pan on touch; right-drag pan with a mouse.
- [ ] Distinct planet-orbit colors; keep labels from overlapping with a screen-space collision pass.
- [ ] Screenshot button that saves a PNG of the current frame with the date, catalog version and data credit stamped in a corner.

**Gate 6b:** every control reachable by keyboard; no overlapping labels in the six preset views.

## Phase 7 — New features (7a L, 7b M)

Goal: turn the visualization into an explorer — pick, search and filter individual asteroids, and see the dynamics that make the belt interesting. 7a ships in v2.1, 7b in v2.2.

**7a — Pick, search, filter, co-rotating view (v2.1)**

- [ ] GPU picking: on click or tap, render record index + 1 into a small `R32UI` offscreen target around the pointer, read back a 9 × 9 px block (larger on touch), and take the nearest non-zero hit. 1–2 px points are too small to hit exactly. Read the picked record's 16 bytes back with `getBufferSubData`.
- [ ] Build the designations side file in the Phase 3 converter: one gzip file in record order, tied to the manifest's `catalogVersion` (and listed in the manifest with its hash), decoding numbers stored as character fields. Audit duplicate and missing designations at build time. Measure its size and record it in `docs/perf.md`.
- [ ] Info card: number and name (inserted with `textContent`, never `innerHTML`), a / e / i, perihelion and aphelion, period, H, estimated diameter range (D = 1329 km / √p × 10^(−H/5) for albedo p = 0.05–0.25), dynamical class, epoch and accuracy caveat, and a link to the JPL Small-Body Database page.
- [ ] Draw the picked object's full orbit and keep it highlighted; allow pinning several.
- [ ] Search by number or name with autocomplete, loading the designations file only when the search box first opens; selecting flies the camera to the object and opens its card. If the object's chunk hasn't loaded yet, move that chunk to the front of the queue and show "loading…". Never select the wrong point.
- [ ] Population toggles from the class enum: NEOs (Atira, Aten, Apollo, Amor), Mars-crossers, Hungarias, inner / middle / outer main belt, Hildas, Jupiter Trojans (L4 and L5 separately), Centaurs, TNOs.
- [ ] Range sliders for a, e, i and H, applied on the GPU with uniforms (discard). A live count of visible objects is computed in a Web Worker that holds a decoded copy (debounced), and the count shows both "visible / loaded" and "loaded / total".
- [ ] Jupiter co-rotating frame: rotate the scene by −λ_Jupiter(t) so Trojans hold their positions around L4/L5 and the Hilda triangle keeps its shape.

**Gate 7a:** clicking any dot opens a correct info card in < 100 ms; search finds Ceres, Eros and 624 Hektor, including before their chunk has loaded; the co-rotating view shows the Trojan clouds holding their positions over 100 simulated years.

**7b — Analysis views and extras (v2.2)**

- [ ] Linked 2D panels: an a-histogram (Kirkwood gaps), a–e and a–i scatter plots; brushing a range filters the 3D view. Draw them from the worker's copy (or GPU-rendered points), not 1.58M SVG nodes, and label them "sample" while the catalog is incomplete.
- [ ] New color modes: by H (size proxy), by dynamical class, by Tisserand parameter relative to Jupiter, and by orbit uncertainty from an optional side file.
- [ ] Export the selected objects' elements to CSV / JSON, with catalog version, epoch and source.

**Gate 7b:** brushing in a 2D panel filters the 3D view within one frame.

**Stretch (after v2.2)**

- [ ] Optional DE440 planet mode: our own Chebyshev fit to DE440 for 1900–2100, lazily loaded. Measure its size before committing to it. Cut from v2.1 because Standish's worst case (0.17°) is under a pixel at nearly every zoom level.
- [ ] A higher-accuracy path for the selected object: precomputed Horizons samples, interpolated, for NEOs and close-up inspection.
- [ ] Asteroid-family highlighting (Vesta, Flora, Themis, Koronis, Eos, Hungaria) from a published family-membership list, loaded on demand. It needs a list that matches the catalog by number, plus checks on its license and attribution.
- [ ] Guided tours (Kirkwood gaps, Trojans, NEOs, inclination) and an optional illustrative starfield.
- [ ] MPCORB as a second source: its own parser (packed designations, packed epochs, header), fixtures, and the converter's epoch propagation exercised for real.
- [ ] Comets from the MPC comet elements file, with a universal-variable solver for parabolic and hyperbolic orbits.
- [ ] WebXR mode; WebGPU compute benchmark branch.
- [ ] Close-approach list for NEOs from a public API, if CORS permits. Never infer close approaches from on-screen proximity.

## Phase 8 — Architecture refactor and tests (8a M–L, 8b continuous)

Goal: replace the 2,400-line global script with small typed modules and one shared Kepler solver, absorbing the structural fixes moved out of Phase 2. 8a runs right after v1.1 and before Phase 3, so the streaming loader is written once in the new structure.

**8a — Module split and structural fixes, as PR-sized steps**

1. Load the existing code through a Vite ES-module entry, unchanged. Move the data into `public/`, so `dist/` contains every script and the data and `npm run build` works. Switch GitHub Pages to deploy `dist/` with the Pages deploy action in the same step (Phase 9 hardens it); a post-deploy smoke test fetches the data URL under the real subpath. Only after this step can data leave `master`.
2. Require WebGL 2 and show a clear, readable message on browsers without it (no WebGL 1 path to maintain). Check shader compile and link status and show a visible error instead of a blank canvas.
3. Decouple the render loop from data loading: the scene, planets and controls run with zero asteroid records (the base for Phase 3's loader).
4. Extract `astro/` (Kepler, elements, planets, time) with unit tests, plus the shared `shaders/kepler.glsl` snippet. `solveKeplerF32` and the GLSL come from the same reviewed step sequence; a test fails if they diverge.
5. Extract `render/` passes with VAOs; reuse one preallocated body buffer with `bufferSubData`; precompute orbit-label points once and search them only when the camera moves; handle `webglcontextlost` / `webglcontextrestored` by rebuilding every GPU resource from CPU state (and re-fetching chunks from the HTTP cache), tested with `WEBGL_lose_context`.
6. Extract `ui/`: Pointer Events with `setPointerCapture` and `pointercancel`; `wheel` with `{ passive: false }` and `deltaMode` normalization; log rebuilt with `createElement` + `textContent`, capped at 200 entries, behind the Debug toggle; load errors with status and a Retry button; one decided canvas background (space stays dark, unused `--canvas-bg` removed).
7. Add one state store with subscriptions; UI renders from state, replacing the scattered `refresh*Controls()` calls. Every listener, timer, request and GPU resource has an owner that disposes of it.
8. Replace vendored gl-matrix 2.2.0 and stats.js with current npm packages.
9. New modules are written as `.ts` from the start. Existing code turns on type checking one folder at a time: `astro/` and `data/` in 8a; `render/` and `ui/` move to 8b and may land after v2.0. Set `strict` and `erasableSyntaxOnly` in `tsconfig.json` so Node 24 runs the tests without a build step. That means no TS `enum`s (the class table is a `const` object) and no parameter properties.

Target layout:

```
src/
  astro/   kepler.ts, elements.ts, planets.ts, moons.ts, time.ts   (pure, no DOM)
  data/    manifest.ts, loader.ts, verify.ts, classify.ts
  render/  context.ts, programs.ts, asteroids.ts, bodies.ts, orbits.ts, labels.ts, picking.ts
  ui/      controls.ts, hud.ts, url-state.ts, theme.ts, input.ts, styles.css
  state.ts (one store + subscribe), app.ts (loop)
shaders/  asteroid.vert, asteroid.frag, bodies.vert, bodies.frag, kepler.glsl
tools/    fetch-catalog.mjs, build-dataset.mjs, planet-elements.mjs, horizons-fixtures.mjs
```

CSS stays vanilla, in the existing custom-property theme system (`--page-bg`, `--panel-bg`, `--button-bg`, …); it may move from the inline `<style>` block to `src/ui/styles.css`, and the agent-guidance files are updated to match in the same PR. `astorb3d.html` stays the entry URL (or redirects), so existing links keep working.

**Gate 8a:** no globals; the scene runs with all catalog requests blocked; one Kepler implementation in JS and one in GLSL, both tested against the same fixtures; the `dist/` build is what's deployed and it works under the Pages subpath; CPU frame time with labels on at least 80% lower than the Phase 0 baseline.

**8b — Tests (continuous, every phase)**

- [ ] Unit: Kepler solver accuracy, including `solveKeplerF32` vs `solveKepler`; element conversions and secular rates; epoch and JD conversions; epoch propagation; quantization round trip; parser edge cases; manifest schema; URL-state round trip; class assignment on known objects.
- [ ] Integration (Playwright, fixture dataset): app loads; scene before data; first chunk renders; corrupt and missing chunks; controls act once per input; mobile viewport; context loss before, during and after loading; no console errors.
- [ ] Visual regression: pixel diff with tolerance at fixed time and camera, rendered with SwiftShader on the fixture dataset.
- [ ] Cross-browser smoke: Chromium, Firefox and WebKit in CI; a manual iOS / Android pass before each release, recorded in the release notes.
- [ ] On demand: full-catalog visual run and throttled streaming run (see Phase 9).
- [ ] Coverage ≥ 90% for `astro/` and `data/`.
- [ ] Type checking enabled for `render/` and `ui/`.

**Gate 8b:** coverage target met; PR CI finishes in under 10 minutes.

## Phase 9 — Build, deploy and CI (S–M, continuous)

Goal: every PR is checked end to end in minutes, releases deploy from the build output, and the dataset refreshes on a schedule without bloating the repo. (Tool consolidation and the Node and Actions upgrades are in Phase 0; the switch to `dist/` deploys is in Phase 8a step 1.)

**Build**

- [ ] Keep `base: "./"` (or set the explicit `/asteroid-orbit-3d-webgl/` base) and confirm every asset URL loads under the real Pages subpath, not only under `vite preview`.
- [ ] Replace the screenshot tool's ad-hoc static file server with `vite preview`, which also removes its path-handling risk.

**Pull-request CI (fixture dataset)**

- [ ] Steps: install → lint → format check → typecheck → unit tests → build → `dist/` audit (manifest and every chunk present, hashes match) → Playwright smoke + visual diff → bundle-size budget; target under 10 minutes.
- [ ] Lighthouse CI: accessibility ≥ 90 (no performance budget).
- [ ] Replace the current `screenshot.yml` (runs on every PR with Node 20) with the Playwright job above.

**Full-catalog CI (on demand, no schedule)**

- [ ] A `workflow_dispatch` job that runs the full-catalog visual run and the throttled streaming run (Fast 3G and 4G). Run it before each release and after each data refresh.

**Deploy and releases**

- [ ] Deploy `dist/` to GitHub Pages on every merge to `master`, gated on the PR checks; fail the deploy on missing chunks, mismatched hashes, an empty catalog, or a first-asteroid timeout in the post-deploy smoke test.
- [ ] Content-hashed file names for code and data, since Pages can't set custom cache headers.
- [ ] Rollback: keep the previous dataset's chunks deployed next to the new ones for one release, so reverting means redeploying the previous manifest.
- [ ] Tag v1.1, v2.0, v2.1 and v2.2 with GitHub release notes generated from `CHANGELOG.md`.

**Hosting budget**

- [ ] GitHub Pages documents a 1 GB published-site limit and a soft 100 GB/month bandwidth limit. Measure the real transferred bytes per full load (after gzip) and record them in `docs/perf.md`. For scale: the v1 binary alone is 35.7 MB per uncached visit, so \~3,000 visits ≈ 107 GB.
- [ ] Track the published size in CI. Set a trigger (for example, sustained traffic above 50% of the soft limit) for moving chunks to a CDN, with the app shell staying on Pages. Candidate: jsDelivr serving from a data branch or release (check its terms and size limits), or an object store.

**Data refresh**

- [ ] **Manual refresh only**, run whenever the owner chooses; there is no scheduled job. One command (`npm run data:refresh`): fetch the latest Lowell catalog → build chunks → validate → print a summary (record count, epoch, changes from the current dataset) and the `gh release` command that archives the snapshot. A `workflow_dispatch` workflow that does the same and opens a PR is optional. Never fetch the raw upstream catalog at runtime.
- [ ] Validation compares against the last snapshot: record count within ±5%. Epoch check: Lowell's epoch is the JD ending in 00.5 nearest the file date and steps every 100 days (`astorb/astorb.txt`), so require |epoch − snapshot date| ≤ 50 days (it can be in the future). Horizons spot checks pass after regenerating fixtures for the new epoch.
- [ ] Store data chunks outside `master` history (release assets fetched at build time, or a dedicated data branch), once `dist/` deploys are live. The repo currently carries \~80 MB of data blobs (45 MB gz + 35.7 MB bin).

**Gate:** a fresh clone builds and deploys a working site with one command; a manual data refresh rebuilds and validates with one command; the on-demand full-catalog job passes.

## Phase 10 — Docs and agent guidance (S, plus a slice at the end of each phase)

Goal: one accurate source of guidance for people and agents, and a README that says what the app shows, how accurate it is, and where the data comes from.

- [ ] README: hero screenshot or GIF, live link, feature list, controls, dev setup, and the data refresh command.
- [ ] README accuracy paragraph: two-body propagation from the epoch, JPL's approximate planet elements (fitted for 1800–2050), what the accuracy indicator means, and that this is a faithful visualization, not an ephemeris or impact-prediction service (ADR 0001).
- [ ] README data credits, matching the in-app footer from Phase 2: NASA grant NAG5-4741 (PI E. Bowell), the Lowell Observatory endowment, NASA PDART grant NNX16AG52G (PI N. Moskovitz), citation DOI 10.1016/j.ascom.2022.100661; JPL for planet elements and Horizons.
- [ ] Merge `project_context.md` and `.github/copilot-instructions.md` into `AGENTS.md` as the single agent file; replace the broken `file:///F:/dev/astorb3d - Copy/...` links with relative links. Reduce `CLAUDE.md` and `GEMINI.md` (where present) to a one-line pointer to `AGENTS.md`. Stale constraints in them (the 6-float layout, `astorb2bin.js`, the inline `<style>` block) are fixed as each phase changes them, not here.
- [ ] New docs: `docs/data-format.md` (the v2 spec, class boundaries and precedence, the quantization note), `docs/architecture.md` (module map), `docs/perf.md` (rough numbers, hosting budget), `CHANGELOG.md`. Decisions go in `docs/adr/`; terms go in `GLOSSARY.md`.
- [ ] License files for bundled third-party code (gl-matrix, fflate and others).

**Agent rules (go into `AGENTS.md`)**

- Work on one checkbox or one PR-sized slice at a time. Name the gate it moves and the test that proves it up front.
- Physics changes need Horizons-backed tests. Never quietly change units, frames, angle conventions, the epoch or the binary layout. A data-format change bumps `schemaVersion` and updates the spec, converter and decoder together.
- Keep asteroid propagation on the GPU; no per-asteroid JS loops in the frame.
- Never hand-edit generated data. Never hard-code the record count; the catalog grows.
- Never draw unverified records. In code, UI and docs, keep the terms distinct: _downloaded ≠ verified ≠ on GPU ≠ visible_.
- Structural code goes in the module layout, never the legacy script. No new runtime dependencies, frameworks or CSS libraries without a measured reason.
- Run the full pre-flight (`npm test`, `npm run lint`, `npm run format`, typecheck, build) before declaring done. Check a box only when the evidence for it exists.
- Handoff: changed files, behavior change, commands and results, screenshots or benchmarks where relevant, remaining risks, and the next smallest unblocking step.

**Gate:** a new contributor or agent can go from clone to a passing PR using only the README and `AGENTS.md`.

## Definition of done, decisions and risks

**Owner decisions (resolved Oct 31, 2026)**

- [x] Git history: leave the old data blobs in history; no rewrite or force-push.
- [x] Performance: no hard numeric targets for now. The bar is "works well on the owner's iPhone 13 Pro" (and desktop). Numbers are measured and recorded so regressions are visible, but they don't gate releases.
- [x] Data source: Lowell only; use `temp/2026-10-30-astorb.dat` (epoch 2026-09-17) for v1.1. The MPCORB fallback is deferred to stretch.
- [x] CI: no scheduled jobs; the full-catalog job runs on demand.
- [x] Service worker: cut altogether.
- [x] Explorer features: all of 7a and 7b are kept, including the uncertainty color mode and CSV / JSON export.
- [x] This integrated plan accepted; source plans moved to `plans/archive/`.

**v1.1 is done when**

- [x] Every planet is within 0.5° of Horizons at the epoch and at ±10 years, and the epoch comes from the snapshot itself, recorded in `astorb3d.meta.json`.
- [~] The shipped binary is rebuilt from an archived, checksummed source. _(Rebuilt and checksummed; the release-asset upload is pending.)_
- [x] Keyboard shortcuts act once per input; density changes never raise GL errors; cinematic mode survives a point-size change.
- [x] Lowell's required attribution is visible in the app and README.
- [ ] v1.1 is tagged and live.

**v2.0 is done when**

- [ ] The scene renders with the catalog blocked; the first verified asteroids render within 1 s on broadband; the full catalog streams without dropped frames; no unverified record is ever drawn.
- [ ] The full catalog plays smoothly on the iPhone 13 Pro in Safari with adaptive quality off.
- [ ] The dataset rebuilds byte-identically from the archived snapshot and its checksum.
- [ ] `npm run build` output is what's deployed under the Pages subpath; PR CI and the on-demand full-catalog job pass.
- [ ] README and `AGENTS.md` are accurate and are the only guidance files (other agent files are pointers).

**v2.1 and v2.2** are done when the gates of their phases (5, 6a, 7a; then 6b, 7b) pass.

**Risks**

| Risk                                                                 | Impact                                              | Mitigation                                                                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Lowell catalog unavailable or layout changes                         | A refresh can't run                                 | Refreshes are manual: retry later. The current dataset keeps working. Parser fixtures catch layout changes; MPCORB is plan B (stretch) |
| A snapshot's records carry mixed epochs                              | Objects drawn at the wrong phase                    | Converter propagates every record to the common epoch; count and max Δt logged; Horizons spot checks                                   |
| Moving data out of `master` before `dist/` deploys                   | Live site 404s on its data                          | Data moves only after Phase 8a step 1; post-deploy smoke test fetches the data URL                                                     |
| Quantization error visible at close zoom                             | Selected objects visibly off their true orbit       | Error budget written before the converter; zoom floor or full-precision path for the selected object                                   |
| Corrupt or stale chunk from a cache or CDN                           | Wrong orbits drawn as if real                       | SHA-256 per decoded chunk, verified before upload; one manifest per session; immutable hashed names                                    |
| GitHub Pages bandwidth (soft 100 GB/month)                           | Throttling or a policy notice                       | Smaller v2 format plus gzip, browser HTTP cache, `saveData` defaults; measured budget and a CDN trigger                                |
| Schedule slips past the 14–18 week estimate                          | Late v2                                             | Four releases, so users get value at each step; DE440 and families already cut to stretch                                              |
| Float32 time precision far from the epoch                            | Visible jitter past a few centuries                 | Clamp to ±1,000 years; "approximate" notices; accuracy indicator                                                                       |
| `DecompressionStream` missing on older browsers (Safari before 16.4) | Streaming fails                                     | fflate fallback                                                                                                                        |
| GPU memory on low-end phones (25.3 MB vertex buffer)                 | Crashes or context loss                             | Optional `deviceMemory` cap; adaptive quality; context-loss handling that rebuilds from the HTTP cache                                 |
| Brightest-first ordering biases the early view                       | NEOs and faint populations absent from early frames | Screenshot comparison against stratified and random orders in Phase 3                                                                  |
| WebGL 2 requirement excludes a few old devices                       | Some users see a message instead of the app         | Clear message with a link to a static screenshot gallery                                                                               |
| Users read the app as a prediction tool                              | Misleading claims about NEOs                        | Accuracy horizon, model label and caveats always visible; no close-approach inference from on-screen proximity                         |
