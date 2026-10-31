# A faithful educational visualization, not a prediction tool

astorb3d aims to be a reasonably faithful simulation: planets and asteroids are where the orbital elements put them, motion is real two-body Kepler motion from the snapshot's epoch, and nothing is invented for visual effect. It is explicitly **not** a research tool, an ephemeris or an impact or close-approach predictor, so we don't build per-object uncertainty propagation, N-body integration or high-precision planet ephemerides. Accuracy work stops at "no visible errors and honest labels". Tests against JPL Horizons exist to catch bugs, not to certify precision.

## Considered Options

- **Research-grade explorer** (DE440 planets, per-population error budgets, close approaches): rejected as far more work than the goal needs.
- **Art first** (looks right, physics approximate): rejected because the original resonance hack and the wrong Earth elements show how "looks right" drifts into "is wrong".
