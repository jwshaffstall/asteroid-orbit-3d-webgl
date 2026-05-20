# Project Context: astorb3d

This document acts as an entry point and context provider for future AI agent sessions working on this repository.

## Project Overview

**astorb3d** is a real-time, WebGL-first 3D visualization of the asteroid belt using Lowell Observatory's Asteroid Orbital Elements Database (`astorb.dat`). Keplerian orbital elements are preprocessed into a compact binary format and rendered as dynamic point sprites, with motion integrated entirely within WebGL shaders on the GPU.

- **URL/Page**: `astorb3d.html`
- **Main Script**: `scripts/js/astorb3d.js`
- **Unit Tests**: `tests/astorb-utils.test.mjs`

---

## Directory Map

- `astorb3d.html`: Main page layout, UI panel templates, light/dark theme CSS variables, and inline WebGL vertex & fragment shaders (`shader-vs`, `shader-fs`, `shader-bodies-vs`, `shader-bodies-fs`).
- `astorb/`:
  - `astorb.dat.gz`: Gzipped source orbital elements database.
  - `astorb.txt`: Database formatting notes.
  - `astorb_landmarks.txt`: Pre-defined list of landmark orbital bodies.
- `scripts/`:
  - `js/`:
    - `astorb3d.js`: WebGL setup, shaders compilation, frame integration loop, simulation time scaling, and mouse/keyboard event handlers.
    - `astorb-utils.js`: Formatting and calculations (byte formatting, loading ratios, status message builder).
    - `libs/`: Dependencies (gl-matrix-min.js, sylvester.src.js, glUtils.js, stats.min.js).
  - `python/`:
    - `astorb.py`: Python layout dictionary reference mapping standard Lowell columns.
- `tools/`:
  - `astorb2bin.js`: Parses the plain-text `astorb.dat` database file and outputs a compiled Float32 binary file (`temp/astorb3d.bin`).
  - `astorb_line.js`: Helper module to parse a single line of standard Lowell `astorb.dat` schema.
  - `capture-screenshot.js`: Playwright screenshot generation tool.
  - `generate-qr.js`: QR code generator for deployment linking.
- `tests/`:
  - `astorb-utils.test.mjs`: Tests for utility functions.

---

## Architecture & Rendering Pipeline

1. **GPU Keplerian Motion**: 
   Rather than updating positions on the CPU, asteroid orbits are integrated in the WebGL vertex shader. Shaders load Float32 buffers containing Keplerian elements:
   - Mean anomaly
   - Argument of perihelion
   - Longitude of ascending node
   - Inclination
   - Eccentricity
   - Semi-major axis
   
   The vertex shader calculates position directly at any given simulation time $T$ using Kepler's Equation.
   
2. **Interactivity**:
   - Pause / Resume controls.
   - Time scale multiplier adjustment (positive and negative time motion).
   - Camera orbital control via click-and-drag (mouse) or swipe (touch), and zoom (scroll/pinch).

---

## Development Scripts & Utilities

These are the npm scripts defined in `package.json`:

| Command | Action |
|---|---|
| `npm test` | Runs the test suite using Node's native test runner (`node --test`). |
| `npm run lint` | Runs `eslint` on the codebase. |
| `npm run format` | Runs `prettier` to format all code files. |
| `npm run format:check` | Verifies code conforms to prettier config without writing modifications. |
| `npm run screenshot` | Captures a screenshot of the simulation using Playwright. |
| `npm run generate-qr` | Generates QR code for local access representation. |

### Data Conversion
To rebuild the binary data buffer from an updated database:
```bash
node tools/astorb2bin.js -i astorb/astorb.dat -o temp/astorb3d.bin
```
