# 16-byte quantized records

Dataset v2 stores each record in 16 bytes: the semi-major axis as float32 at offset 0 (period errors compound over time, so it stays at full precision), then M, ω, Ω, i and e as normalized uint16, then 12 bits of H and 4 bits of dynamical class. That cuts the download and GPU memory by a third compared with six float32s (25.3 MB vs 37.9 MB for the Oct 2026 snapshot). The angle quantization (0.0055°) gives a fixed position error, about 3e−4 AU at 3 AU, that doesn't grow with time and is under a pixel at every preset view, which is well inside what a faithful visualization needs (ADR 0001). The float32 sits first because WebGL requires attribute offsets to be multiples of the type size.

## Consequences

- Changing the layout means bumping the manifest's `schemaVersion` and updating the spec, converter and decoder together.
- Info cards show elements at the quantized precision; that is enough for display.
