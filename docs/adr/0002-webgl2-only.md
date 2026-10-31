# WebGL 2 only, with no WebGL 1 fallback

From v2.0, the app requires WebGL 2 and shows a clear message on browsers without it. WebGL 2 is near-universal by 2026 (including iOS Safari since iOS 15), and we rely on it for VAOs, integer and normalized-uint16 attributes, `getBufferSubData` for picking, `R32UI` pick targets and transform feedback. Keeping a WebGL 1 path would double the renderer and test matrix for a very small share of devices. v1.1 still runs on the existing WebGL 1 code.
