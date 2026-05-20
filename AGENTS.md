# AI Agent Guidelines (AGENTS.md)

Welcome to the **astorb3d** repository. This guide outline conventions and practices for AI developer agents collaborating on this codebase.

## Core Rules for Agents

1. **Do Not Overcomplicate Styling**:
   - The UI is styled with Vanilla CSS inside the `<style>` block of [astorb3d.html](file:///F:/dev/astorb3d%20-%20Copy/astorb3d.html).
   - Avoid adding external CSS frameworks (such as TailwindCSS) unless explicitly instructed by the user.
2. **WebGL Shaders & Performance**:
   - Asteroid orbits are simulated entirely on the GPU. Do not shift Keplerian orbital calculation loops back to CPU/JavaScript unless there is a specific non-performance-critical diagnostic requirement.
   - Maintain the standard parameters (mean anomaly, argument of perihelion, longitude of ascending node, inclination, eccentricity, semi-major axis) inside the WebGL shader buffers.
3. **Data Pipeline Stability**:
   - If you modify the binary database representation, ensure that both the compiler tool [astorb2bin.js](file:///F:/dev/astorb3d%20-%20Copy/tools/astorb2bin.js) and the buffer loader/reader in [astorb3d.js](file:///F:/dev/astorb3d%20-%20Copy/scripts/js/astorb3d.js) are updated simultaneously to prevent runtime buffer alignment issues.

## Testing & Quality Control

- **Pre-flight Check**: Before declaring a task finished, always run:
  - `npm test` to verify unit tests pass.
  - `npm run lint` to ensure there are no ESLint violations.
  - `npm run format` to auto-format modified files.
- **Unit Tests**:
  - Add test coverage in [astorb-utils.test.mjs](file:///F:/dev/astorb3d%20-%20Copy/tests/astorb-utils.test.mjs) if you add or modify utility functions in [astorb-utils.js](file:///F:/dev/astorb3d%20-%20Copy/scripts/js/astorb-utils.js).
