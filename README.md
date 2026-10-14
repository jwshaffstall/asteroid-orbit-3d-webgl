# asteroid-orbit-3d-webgl

Visualize the Asteroid Orbital Elements Database (astorb.dat) with your web browser in 3D.

[https://jwshaffstall.github.io/asteroid-orbit-3d-webgl/astorb3d.html](https://jwshaffstall.github.io/asteroid-orbit-3d-webgl/astorb3d.html)

![QR code for astorb3d.html](assets/astorb3d-qr.png)

## Overview

This project renders asteroid orbits alongside major solar system bodies using WebGL. The app
loads a preprocessed binary buffer of orbital elements, turns each record into a GPU-friendly
vertex, and animates Keplerian motion entirely on the GPU shader pipeline for speed. The UI
includes time controls, motion blur, and a light/dark theme toggle so you can explore how
orbital parameters shape the asteroid belt visually.

## Highlights

- **WebGL-first rendering**: asteroids are drawn as point sprites while planets/dwarf planets
  get their own point shader for higher visibility.
- **Live controls**: speed up, slow down, reverse, and pause the simulation without restarting
  the renderer.
- **Orbit labeling**: optional labels help call out the major planet orbits and dwarf planets.
- **Loading diagnostics**: a progress overlay and status bar show download rate and draw counts.

## Controls

- **Mouse / touch**: drag to orbit the camera around the ecliptic, scroll/pinch to zoom.
- **Keyboard**: Space toggles pause, Arrow Up/Down changes the time scale, and `0`/`O` resets time.
- **On-screen buttons**: mirror the same time, rendering, and display toggles for touch devices.

## Data pipeline

The runtime loads a binary file (`temp/astorb3d.bin`) containing Float32 orbital elements per
asteroid in the following order: mean anomaly, argument of perihelion, longitude of ascending
node, inclination, eccentricity, and semimajor axis. The `scripts/python/astorb.py` helper
documents the source field layout from the original `astorb.dat` file, while the WebGL app
streams that data into GPU buffers for real-time animation.

### Source data

The Asteroid Orbital Elements Database
[https://asteroid.lowell.edu/astorb/](https://asteroid.lowell.edu/astorb/)

- **Epoch**: the elements are osculating orbital elements at the 2013-10-15 epoch, so the
  simulation starts from that date. The data is over a decade old; refresh it from Lowell if
  you need current elements.
- **Why the 35 MB binary is committed**: `temp/astorb3d.bin` is checked in on purpose so the
  GitHub Pages site can fetch it directly with no build step.

### Rebuilding the binary

The converter accepts the gzipped database straight from the repo, no manual gunzip needed:

```bash
node tools/astorb2bin.js -i astorb/astorb.dat.gz -o temp/astorb3d.bin
```

`tools/astorb2bin.js` parses each 267-character `astorb.dat` record (see
`tools/astorb_line.js`), writes the six orbital elements per asteroid as little-endian
Float32, and the app loads that buffer verbatim into a WebGL vertex buffer. Keep the field
order in sync between the converter and the loader if you ever change the layout.
