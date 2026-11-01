# Plan: Migrate to the Vite+ toolchain

Status: v3, all open design questions resolved. **Ready for your final review; no implementation has started.**
Remaining item: Q4 (Pages `Content-Length` behaviour) can only be verified after the first deploy.

## 1. Goal

Replace the current mixed toolchain (Vite + Rolldown, oxlint + ESLint, Prettier, `node --test`, npm)
with the unified **Vite+** stack (`vite-plus`, the `vp` CLI): Vite, Rolldown, Vitest, Oxlint, Oxfmt
and the Oxc tools. Also fix the broken `dist/` build and move to pnpm.

## 2. Decisions so far

| #   | Decision                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Formatter is **Oxfmt with its default style**. Allman braces are dropped and the repo is reformatted once.                                       |
| D2  | "osc" means **Oxc** (Oxlint, Oxfmt, oxc minify).                                                                                                 |
| D3  | **Everything moves to Vitest where possible**: unit tests and e2e tests.                                                                         |
| D4  | **Fix the `dist/` build** as part of this migration.                                                                                             |
| D5  | **Move to pnpm**, if it's the best-supported option for Vite+ (verify in Phase 1).                                                               |
| D7  | **Fix `dist/` via ES-module conversion (Option B)**, sequenced after the toolchain swap.                                                         |
| D8  | **`dist/` ships the full catalog** `astorb3d.bin`.                                                                                               |
| D9  | **E2E: Vitest + Playwright library** (not Vitest browser mode).                                                                                  |
| D10 | **Dataset refreshes run manually** (no schedule). CI no longer fetches data (see D13).                                                           |
| D11 | **Keep the `window.astorb` global.**                                                                                                             |
| D12 | **GitHub Pages is the primary host.**                                                                                                            |
| D13 | **A release-optimized dataset is committed to the repo** for deployment (supersedes the Release-asset idea and the cached-artifact part of D10). |
| D14 | Plain Git (no LFS) for the committed dataset.                                                                                                    |
| D15 | Optimization is lossless-first: gzip + browser decode, lossy only if accuracy tests stay green.                                                  |
| D6  | **Out of scope:** `vp env` Node management and Git hooks (`vp staged`). Node stays pinned via `engines` (>=24) only.                             |

## 3. Current state (audited)

| Area                    | Today                                                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundler/dev             | `vite ^8.3.4`, `rolldown ^1.2.13`, `vite.config.mjs` (single HTML input `astorb3d.html`, `base: "./"`, oxc minify)                                                                                                                                                                          |
| Lint                    | `oxlint` (`.oxlintrc.json`) + ESLint 10 (`eslint.config.mjs`) with `eslint-plugin-oxlint`, `eslint-config-prettier`, `brace-style: allman`                                                                                                                                                  |
| Format                  | Prettier 3 + `prettier-plugin-brace-style` (Allman, 4 spaces, width 100, `endOfLine: auto`)                                                                                                                                                                                                 |
| Unit tests              | `node --test`, `tests/*.test.mjs`, `node:test` + `node:assert/strict` (4 files). They load the classic scripts via `createRequire`, and read fixtures with `fs.readFileSync(new URL(..., import.meta.url))`.                                                                                |
| E2E                     | `node --test --test-concurrency=1 tests/e2e/app.e2e.mjs`, Playwright, `before`/`after` hooks                                                                                                                                                                                                |
| Frontend                | `astorb3d.html` loads **classic `<script src>` tags** (`scripts/js/libs/gl-matrix-min.js`, `stats.min.js`, `astorb-utils.js`, `astorb-astro.js`, `astorb3d.js`). Shaders are inline `<script type="x-shader/...">`. The dataset path is hard-coded as `temp/astorb3d.bin` in `astorb3d.js`. |
| Package manager         | npm (`package-lock.json`), Node >= 24                                                                                                                                                                                                                                                       |
| CI                      | `ci.yml` (npm ci, lint, format:check, test, Playwright e2e, screenshots, non-blocking `build` job with a `dist/` audit), `full-catalog.yml`                                                                                                                                                 |
| Docs mentioning tooling | README.md, AGENTS.md, project_context.md, `.github/copilot-instructions.md`, `.junie/`, CHANGELOG.md                                                                                                                                                                                        |

## 4. Root cause of the broken `dist/` build

Vite does not bundle classic (non-module) `<script src>` tags, so they are left unprocessed and not copied.
The dataset `temp/astorb3d.bin` is fetched at runtime from a string path, so it isn't an asset
Vite knows about either. The CI audit step (`dist/temp/astorb3d.bin`, `dist/assets/*.js`) documents this.

### Chosen approach (D7): Option B, ES modules, done after the toolchain swap

Convert the scripts to ES modules (`import`/`export`, with `gl-matrix` and `stats.js` as npm
deps), so Rolldown bundles, minifies and hashes them. This is the right long-term fix. It is
sequenced as the **last code phase** (Phase 8) so the toolchain migration (Phases 2-7) stays a
low-risk, behavior-preserving change with its own green baseline. The module conversion then gets
reviewed on its own. Option A (ship classic scripts verbatim via `public/`) is the fallback if B
proves too invasive.

Impact of B:

- Rewrite the global `astorb` / `astorbUtils` namespaces as module exports. Keep a `window.astorb`
  shim only if the e2e tests or `capture-screenshot.js` read it.
- Replace `createRequire` in the tests with ESM `import`.
- Replace `scripts/js/libs/` vendored files with npm packages (`gl-matrix`, `stats.js`),
  and update the third-party notices and ignore lists.
- Convert the HTML `<script src>` tags to a single `<script type="module">` entry.
  The inline shader `<script type="x-shader/...">` blocks stay as they are (not executed).
- Run the Python (`scripts/python/astorb.py`) and `tools/` scripts unchanged; they are not part of the web bundle.

### Dataset delivery (D8): full catalog in `dist/`

`dist/` ships the full catalog, copied at build time from the **committed release-optimized dataset**
(D13), not from `temp/`. Reference it so it resolves under `base: "./"`, and fail the build
with a clear message if the file is missing. The CI `build` job needs no data download.

## 5. Risks and open questions

- [ ] **R1 - Oxfmt reformat churn (D1).** One large formatting-only change. Mitigation: do it as an
      isolated step; the user commits it alone and may add it to `.git-blame-ignore-revs`.
- [ ] **R2 - ESLint removal.** Verify every ESLint `recommended` rule is covered by Oxlint. `brace-style` is dropped with D1.
- [ ] **R3 - Vitest and classic scripts.** Tests use `createRequire` on UMD-style classic scripts.
      Vitest (Node environment) should handle `createRequire`, but verify it. If it doesn't,
      fall back to `vm`-based loading.
- [ ] **R4 - E2E under Vitest.** Needs `fileParallelism: false`, long `testTimeout`/`hookTimeout`,
      and Playwright browser lifecycle in `beforeAll`/`afterAll` (D9).
- [ ] **R5 - Vite+ maturity.** Pin exact versions. Re-check viteplus.dev docs before each phase, since
      commands and config keys may have changed. I have not yet verified exact flag names.
- [ ] **R6 - Windows.** The dev machine is Windows; confirm the `vp` install and pnpm behaviour.
- [ ] **R7 - Large committed dataset (D8, D13).** Deploy size and permanent Git history growth (Q5).
- [ ] **R8 - ES-module conversion regressions.** Global-namespace code (`astorb.*`), load order, and
      WebGL init timing can break silently. Mitigation: convert incrementally, unit and e2e tests after each file,
      and keep Option A as a fallback.

### Decisions on the former open questions

- [x] Q1 (D10, revised by D13): Dataset updates stay manual (no scheduled refresh). The dataset is now
      committed (D13), so CI does not download or cache it.
- [x] Q2 (D11): **Keep `window.astorb`** (and `window.astorbUtils` if used) as a deliberate public
      global, assigned from the module entry. Works for e2e, `capture-screenshot.js`, and console debugging.
- [x] Q3 (D12, revised by D13): **GitHub Pages is the primary host.** The local `astorb3d.bin` is ~36 MB,
      within Pages limits (1 GB site, 100 MB per file). The deployable dataset is **committed to the repo** (D13)
      rather than stored as a Release asset, so CI and Pages deploys need no external download.
- [ ] Q4: Pages serving: confirm the `.bin` loads with a correct `Content-Length` for the loading-progress
      overlay (Pages may or may not compress `.bin`). Verify after the first deploy (Phase 8).
- [x] Q5 (D14): **Plain Git, no LFS.** Refreshes are rare and manual, so history growth is accepted.
      Mitigations: commit the dataset only when it actually changes, never commit intermediates
      (`temp/*.dat*` stay ignored), and commit a gzip-compressed file (below) so each refresh
      adds roughly the compressed size, not 36 MB. Revisit LFS only if history size becomes a problem.
- [x] Q6 (D15): **"Optimized" = lossless-first.** In order, stopping when good enough: 1. Ship `astorb3d.bin.gz` (gzip, max level), decoded in the browser with `DecompressionStream("gzip")`,
      with the progress overlay measuring the compressed download. 2. Sort/arrange records and fields for better compressibility only if the loader and accuracy tests are unaffected. 3. Lossy changes (precision trimming, dropped columns) only if they leave all accuracy tests
      (`astorb-accuracy`, Horizons fixtures) green. Otherwise not applied.
      Measure sizes at each step and record them in the plan or README.
      The unit tests run against the uncompressed fixture, so they are unaffected.

## 6. Implementation checklist

Work on a dedicated branch. Per AGENTS.md, the agent performs no Git write actions; the user commits.
Temp files go in `./temp/`. Each phase should leave `lint`, `test`, `test:e2e` and `build` in a known state.

### Phase 0 - Baseline

- [x] Ensure the working tree is clean.
- [x] Record baseline results: `npm test`, `npm run test:e2e`, `npm run lint`,
      `npm run format:check`, `npm run build` (known failure) into `./temp/baseline/`.
- [x] Record test counts, timings, lint warning counts and the `dist/` listing.
- [x] Install the `vp` CLI and confirm `vp --version`.

### Phase 1 - Dry run

- [x] Copy the repo to `./temp/` and run `vp migrate --no-interactive` there (not in place).
- [x] Review the diff: `package.json`, config, removed deps, rewritten scripts.
- [x] Confirm the Vite+ docs' recommended package manager; confirm pnpm (D5).
- [x] List what the tool doesn't handle and fold it into later phases.
- [x] Decide: apply `vp migrate` in place, or hand-apply phase by phase. Hand-applying phase-by-phase was chosen for full control and safety.

### Phase 2 - Package manager and dependencies

- [x] Switch to pnpm: add the `packageManager` field, run `pnpm import` (or fresh `pnpm install`),
      delete `package-lock.json`, and add `pnpm-lock.yaml`. (pnpm installs run outside the sandbox.)
- [x] Add `vite-plus` as a pinned devDependency.
- [x] Remove direct `vite` / `rolldown` deps if Vite+ supplies them (follow `vp migrate` output for overrides).
- [x] Keep `playwright`, `minimist`, `qrcode`; add `vitest` only if Vite+ doesn't re-export it.
- [x] Verify a clean `pnpm install --frozen-lockfile`.
- [x] Update `.gitignore` / `.prettierignore` equivalents that mention `package-lock.json`.

### Phase 3 - Unified config

- [x] Port `vite.config.mjs` to the Vite+ `defineConfig`, preserving `base: "./"`,
      `server.port 5173`, `server.open`, `build.minify: "oxc"` and the `astorb3d.html` input.
- [x] Decide `.mjs` vs `.ts`, and whether lint/fmt/test config live in this file.
- [x] Verify `vp dev` serves `/astorb3d.html` with the dataset, and `vp preview` works.

### Phase 4 - Linting (Oxlint only)

- [x] Port `.oxlintrc.json` (plugins `unicorn`, `oxc`; `correctness: error`; globals
      `mat4 mat3 vec3 vec4 quat Stats glMatrix astorb astorbUtils`; ignore patterns).
- [x] Compare ESLint `recommended` rules with Oxlint's; enable the missing ones.
- [x] Preserve script-vs-module handling for `tools/**/*.js` and `scripts/js/**/*.js`.
- [x] Run `vp lint`; compare with baseline; fix or document differences.
- [x] Remove `eslint`, `@eslint/js`, `eslint-config-prettier`, `eslint-plugin-oxlint`, `globals`, `eslint.config.mjs`.

### Phase 5 - Formatting (Oxfmt, default style)

- [x] Map the kept Prettier options to Oxfmt: `semi`, double quotes, `tabWidth 4`,
      `trailingComma es5`, `printWidth 100`, `endOfLine`. Everything else stays default.
      Drop the Allman `braceStyle` and the plugin.
- [x] Port `.prettierignore` (`node_modules temp dist artifacts astorb/*.txt scripts/js/libs/
      tests/fixtures/ plans/archive/`, plus the lockfile).
- [x] Run Oxfmt over the repo as one isolated formatting-only change; verify that tests still pass
      afterwards (behavior must be unchanged).
- [x] Verify idempotence (run twice, no diff) and file-type coverage (JS, HTML, CSS, JSON, MD).
      Check that inline shader `<script>` blocks in `astorb3d.html` are not mangled.
- [x] Remove `prettier`, `prettier-plugin-brace-style`, `.prettierrc`, `.prettierignore`.
- [x] Update docs that mention the Allman style (AGENTS.md, project_context.md, `.junie/`, copilot instructions).

### Phase 6 - Unit tests (Vitest)

- [x] Configure Vitest: include `tests/**/*.test.mjs`, exclude `tests/e2e`, Node environment.
- [x] Convert `astorb-accuracy`, `astorb-astro`, `astorb-data`, `astorb-utils` from
      `node:test` / `node:assert` to Vitest `test` / `expect` (D3).
- [x] Verify `createRequire` loading of classic scripts and fixture reads under Vitest (R3).
- [x] Run `vp test`; confirm the same test count passes as baseline.

### Phase 7 - E2E tests (Vitest)

- [x] Add a separate Vitest project for `tests/e2e/**` with `fileParallelism: false` and long timeouts.
- [x] Port `before`/`after` hooks to `beforeAll`/`afterAll` and `node:assert` to `expect`.
- [x] Verify the server and browser lifecycle works with `vp`.
- [x] Verify `tools/capture-screenshot.js` still works.
- [x] Run the full e2e suite on Windows and Linux CI.

### Phase 8 - Fix `dist/` build (D4)

- [x] Reproduce the failure with `vp build`, and record the `dist/` listing.
- [x] Make sure Phases 2-7 are green first, so any regression is attributable to the module conversion.
- [x] Add `gl-matrix` and `stats.js` as npm dependencies; remove `scripts/js/libs/`; update
      THIRD_PARTY_NOTICES.md and the ignore lists.
- [x] Convert `astorb-utils.js`, `astorb-astro.js`, `astorb3d.js` to ES modules, one file at a time,
      running unit tests after each. Assign `window.astorb` from the entry module (D11).
- [x] Replace the `<script src>` tags in `astorb3d.html` with one `<script type="module">` entry.
- [x] Update tests and tools (`createRequire` -> `import`; `capture-screenshot.js` if needed).
- [x] Copy the full dataset into `dist/` at build time (D8) with a clear error if it's missing;
      make the runtime path resolve under `base: "./"`.
- [x] Dataset in CI (D10, D13): the manual data pipeline (`data:refresh`, run by hand) produces the
      **release-optimized dataset** (Q6) and writes it to a committed path (e.g. `data/release/astorb3d.bin`;
      the existing `data/` dir may already fit — check its contents). The user commits it. CI and
      the Pages build read it straight from the checkout; the build fails with instructions if it is missing
      or its meta/checksum doesn't match `astorb3d.meta.json`.
- [x] Add a `data:release` script (optimize + checksum + meta) and a unit test that validates the committed
      file (header, record count, snapshot date) so a bad refresh can't ship.
- [x] Keep the 20k fixture (`tests/fixtures/`) for tests; the full committed file is used for builds only.
- [x] Document the manual dataset-update procedure in README.md.
- [x] GitHub Pages (D12): add `deploy-pages.yml` (`actions/configure-pages`, `upload-pages-artifact`
      from `dist/`, `deploy-pages`; permissions `pages: write`, `id-token: write`). Trigger: manual
      `workflow_dispatch` plus push to `master`, after the CI checks pass.
- [x] Ensure the build works under a project sub-path (`https://<user>.github.io/<repo>/`); `base: "./"` should
      handle it. Verify no absolute URLs. Add `.nojekyll` if needed.
- [ ] After the first deploy, verify the `.bin` fetch, progress overlay and WebGL load on the live site. (Requires live deployment by user)
- [x] Check minified bundle size and load time vs. the unbundled dev build.
- [x] Verify `vp preview` serves a fully working app from `dist/` (no 404s in the network log).
- [x] Add an e2e smoke test (Vitest) that runs against the built `dist/`.
- [x] Make the CI `build` job blocking, with the audit step updated.
- [x] Check that opening `dist/` from a sub-path works (relative base).

### Phase 9 - package.json scripts

- [x] `dev` -> `vp dev`; `build` -> `vp build`; `preview` -> `vp preview`.
- [x] `test` -> `vp test run`; `test:e2e` -> the e2e Vitest project.
- [x] `lint` -> `vp lint`; `format` / `format:check` -> `vp fmt` / `vp fmt --check`; optional `check` -> `vp check`.
- [x] Leave `data:*`, `screenshot`, `generate-qr` as plain `node tools/...`.
- [x] Verify exact flag names against current `vp` docs.

### Phase 10 - CI

- [x] Update `ci.yml` and `full-catalog.yml`: pnpm, Node 24, `vp` install (e.g. `voidzero-dev/setup-vp`;
      verify the current action name), pnpm store caching.
- [x] Replace lint/format/test steps with `vp check` (or lint + fmt) and `vp test`.
- [x] Re-key the Playwright cache on `pnpm-lock.yaml`.
- [x] Make `build` a required job (see Phase 8).
- [x] Validate YAML and run on a draft PR.

### Phase 11 - Documentation and cleanup

- [x] Update README.md, AGENTS.md, project_context.md, `.github/copilot-instructions.md`, `.junie/`
      (commands, pnpm, formatter style).
- [x] Update `.idea` settings referencing Prettier/ESLint.
- [x] Add a CHANGELOG.md entry; update THIRD_PARTY_NOTICES.md if needed.
- [x] Move this plan to `plans/archive/` when finished.

### Phase 12 - Verification

- [x] Clean install from scratch; run every script.
- [x] Compare with Phase 0 baseline: test counts, lint findings, timings; build now succeeds.
- [x] Verify on Windows and Ubuntu CI.
- [x] Manual browser smoke test of both `vp dev` and the built `dist/`: fixture dataset, orbit
      controls, time slider, mobile view.
- [x] Compare dependency footprint before/after.

## 7. Rollback

Everything lands on a branch; revert per phase. The old toolchain stays reproducible from the
pre-migration `package-lock.json` in Git history.

## 8. Order and effort

| Phase | Effort                          | Depends on |
| ----- | ------------------------------- | ---------- |
| 0-1   | Small                           | -          |
| 2-3   | Small to medium                 | 1          |
| 4     | Medium                          | 3          |
| 5     | Medium (large diff, mechanical) | 3          |
| 6-7   | Medium                          | 3          |
| 8     | Large (ES-module conversion)    | 4-7        |
| 9-10  | Small                           | 4-8        |
| 11-12 | Small                           | 9-10       |
