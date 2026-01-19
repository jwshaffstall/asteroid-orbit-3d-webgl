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
streamlines that data into GPU buffers for realtime animation.

### Source Data

The Asteroid Orbital Elements Database
[https://asteroid.lowell.edu/astorb/](https://asteroid.lowell.edu/astorb/)
