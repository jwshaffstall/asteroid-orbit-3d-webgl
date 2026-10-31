# Performance notes

Rough numbers for comparison between releases, not gates (owner decision, Oct 31 2026: the bar is "plays smoothly on an iPhone 13 Pro" and on desktop). Reference devices: the owner's desktop and an iPhone 13 Pro (iOS Safari, 3× display; Safari usually runs `requestAnimationFrame` at 60 Hz).

## v1.1 (Oct 2026 snapshot)

| Item                                                           | Value                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Records                                                        | 1,579,394                                                                     |
| `temp/astorb3d.bin`                                            | 37,905,456 bytes (37.9 MB), uncompressed; GitHub Pages may gzip it in transit |
| `temp/astorb3d.meta.json`                                      | ~4 KB                                                                         |
| Headless Chromium + SwiftShader (software WebGL), full catalog | first frame within ~6 s of page load, including the local download            |
| Desktop FPS                                                    | _to measure on the owner's desktop_                                           |
| iPhone 13 Pro FPS                                              | _to measure: open the live site, watch the stats.js panel (top right)_        |

## Hosting budget

GitHub Pages documents a 1 GB published-site limit and a soft 100 GB/month bandwidth limit. One uncached full load of v1.1 transfers ~38 MB, so ~2,600 uncached visits ≈ 100 GB. v2.0's 16-byte, gzipped chunks (ADR 0003) cut this substantially.
