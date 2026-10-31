# AI Agent Guidelines (AGENTS.md)

Welcome to the **astorb3d** repository. This guide outlines conventions and practices for AI developer agents collaborating on this codebase. Start with [project_context.md](project_context.md) (map and commands), [GLOSSARY.md](GLOSSARY.md) (terms) and [docs/adr/](docs/adr/) (decisions). The roadmap is [plans/plan-integrated.md](plans/plan-integrated.md).

## Core Rules for Agents

1. **Do Not Overcomplicate Styling**: the UI is styled with vanilla CSS in the `<style>` block of [astorb3d.html](astorb3d.html), using the existing CSS custom properties for theming. No CSS frameworks unless explicitly asked.
2. **GPU-first orbital math**: asteroid positions are computed in the vertex shader. Never move per-asteroid Kepler math into a JavaScript frame loop.
3. **One Kepler solver**: the GLSL solver in `astorb3d.html` and `solveKeplerF32()` in [scripts/js/astorb-astro.js](scripts/js/astorb-astro.js) must stay step-for-step identical (start value, M reduction, iteration count). Change both together; the unit tests check the mirror.
4. **Data pipeline stability**: the v1 record is 6 × float32 (M, ω, Ω, i, e, a). If the layout changes, update [tools/astorb2bin.js](tools/astorb2bin.js), the loader in [scripts/js/astorb3d.js](scripts/js/astorb3d.js), the metadata format and the docs in the same PR. Never hand-edit generated data (`temp/astorb3d.*`, `tests/fixtures/*`, `data/*.json`); regenerate it with the `npm run data:*` scripts.
5. **Physics changes need Horizons-backed tests**: keep `tests/astorb-accuracy.test.mjs` passing. Never quietly change units, frames, angle conventions or the epoch. The goal is a faithful visualization, not an ephemeris (ADR 0001).
6. **Parse astorb by documented columns**: see [tools/astorb_line.js](tools/astorb_line.js). Inclinations ≥ 100° and semi-major axes ≥ 1000 AU fill their separating space; never split on whitespace or depend on line length.

## Testing & Quality Control

Before declaring a task finished, run:

- `npm test` — unit, data and accuracy tests.
- `npm run test:e2e` — browser tests (Playwright, fixture dataset).
- `npm run lint` — must report zero errors.
- `npm run format` — formats modified files.

If you add or modify functions in `astorb-utils.js` or `astorb-astro.js`, add tests in `tests/`.
