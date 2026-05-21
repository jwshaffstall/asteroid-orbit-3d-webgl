# Claude Agent Guidelines (CLAUDE.md)

This file contains custom development instructions for Claude-based agents working on **astorb3d**.

## Project Quick Reference

- **Entry point**: [astorb3d.html](file:///F:/dev/astorb3d%20-%20Copy/astorb3d.html) — single-page app with inline CSS and WebGL shaders.
- **Main logic**: [astorb3d.js](file:///F:/dev/astorb3d%20-%20Copy/scripts/js/astorb3d.js) (~75 KB) — WebGL setup, rendering loop, camera, UI event handlers.
- **Utilities**: [astorb-utils.js](file:///F:/dev/astorb3d%20-%20Copy/scripts/js/astorb-utils.js) — formatting helpers and status text builder.
- **Data compiler**: [astorb2bin.js](file:///F:/dev/astorb3d%20-%20Copy/tools/astorb2bin.js) — converts `astorb.dat` → `temp/astorb3d.bin` (Float32 LE, 6 floats per asteroid).
- **Full context**: [project_context.md](file:///F:/dev/astorb3d%20-%20Copy/project_context.md) — directory map, architecture, and command reference.

## Verification Commands

Always run these before declaring a task complete:

```bash
npm test          # Node.js native test runner — all tests must pass
npm run lint      # ESLint — must produce zero errors
npm run format    # Prettier — auto-format modified files
```

## Editing Large Files

- `astorb3d.js` and `astorb3d.html` are large files. When editing non-contiguous sections, prefer `multi_replace_file_content` over multiple sequential `replace_file_content` calls to reduce overhead.
- Never replace the entire contents of these files wholesale — target only the specific lines that need to change.

## Key Constraints

1. **GPU-first orbital math**: Keplerian motion is computed in the WebGL vertex shader. Do not move orbital integration to JavaScript unless explicitly asked for a non-rendering diagnostic purpose.
2. **Binary buffer alignment**: The 6-float record layout (mean anomaly, argument of perihelion, longitude of ascending node, inclination, eccentricity, semi-major axis) must stay in sync between `astorb2bin.js` (writer) and `astorb3d.js` (reader). Always update both if the schema changes.
3. **Vanilla CSS only**: Styling lives in the `<style>` block of `astorb3d.html` using CSS custom properties for theming. Do not introduce CSS frameworks unless the user requests one.
4. **Test coverage**: If you add or modify functions in `astorb-utils.js`, add corresponding tests in [astorb-utils.test.mjs](file:///F:/dev/astorb3d%20-%20Copy/tests/astorb-utils.test.mjs).

## Style & Design

- Preserve the existing dark/light theme CSS variable system (`--page-bg`, `--panel-bg`, `--button-bg`, etc.).
- Maintain the scientific, sleek aesthetic — monospace typography, subtle hover states, smooth transitions.
- Ensure touch and high-DPI display compatibility when modifying canvas or layout code.
