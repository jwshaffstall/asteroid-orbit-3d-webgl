# Copilot Instructions for asteroid-orbit-3d-webgl

## Project Overview

This is a 3D WebGL visualization project that renders asteroid orbital elements from the Asteroid Orbital Elements Database (astorb.dat). The application runs entirely in the browser using WebGL for rendering and JavaScript for orbital mechanics calculations.

## Technology Stack

- **Frontend**: Modern ES Modules, WebGL, HTML5 Canvas
- **Graphics**: WebGL with GLSL shaders (vertex and fragment shaders)
- **Math Library**: `gl-matrix` from npm
- **Performance Monitor**: `stats.js` from npm
- **Toolchain**: Vite+ (`vp`) powered by Vite, Rolldown, Vitest, Oxlint, and Oxfmt
- **Package Manager**: pnpm (`pnpm@12.16.1`)
- **Dependencies**: Minimal dependencies - `gl-matrix`, `stats.js`, `playwright` (dev), `vite-plus` (dev), `minimist`, `qrcode`

## JavaScript Coding Standards

### Code Style and Formatting

- Formatter: Oxfmt (via `pnpm run format` / `vp fmt`)
- Indentation: 4 spaces
- Double quotes, semicolons, standard 1TBS brace style
- Line endings: LF
- Linter: Oxlint (via `pnpm run lint` / `pnpm run check`)

### Architecture and Modules

- ES Modules: Use standard `import` / `export`
- Public API / Debugging: Assign `window.astorb`, `window.astorbUtils`, `window.astorbAstro` from module entrypoints for runtime console inspection and e2e testing
- Tests: Vitest (`import { test, expect } from "vite-plus/test"`)

### Naming Conventions

- **Variables and functions**: camelCase (e.g., `formatNumber`, `updateLoadingOverlay`)
- **Constants**: camelCase for shader constants (e.g., `pi`, `muSun`, `jupiterSemimajorAxis`)
- **DOM element IDs**: camelCase (e.g., `astorb3dCanvas`, `loadingOverlay`)
- **File names**: kebab-case for tools (e.g., `astorb2bin.js`, `generate-qr.js`)

### Function Conventions

- Always validate inputs and handle null/undefined gracefully
- Return fallback values (e.g., "--") for invalid or missing data
- Use early returns for error conditions
- Keep functions focused on a single responsibility

### Example Patterns

```javascript
// Good: Defensive programming with fallbacks
astorb.formatNumber = function (value) {
    if (value === null || value === undefined) {
        return "--";
    }
    return Number(value).toLocaleString("en-US");
};

// Good: Namespace pattern
var astorb = astorb || {};

// Good: IIFE for browser compatibility
(function () {
    var requestAnimationFrame =
        window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();
```

## WebGL and Graphics Programming

### GLSL Shader Guidelines

- Use `precision mediump float` for most shaders (or `lowp` for less critical calculations)
- Declare all uniforms and attributes explicitly at the top of shaders
- Use descriptive names with prefixes: `a` for attributes, `u` for uniforms, `v` for varyings
- Use inline comments with `//` for explaining values: `const float muSun = 3.96401599E-14; // AU^3/s^2`
- Include comments for complex mathematical operations (e.g., Kepler's equation iterations)
- Clamp values to prevent undefined behavior: `clamp(value, min, max)`

### WebGL Best Practices

- Always check for null/undefined when accessing WebGL resources
- Use `gl.getParameter(gl.MAX_VERTEX_ATTRIBS)` and similar to respect hardware limits
- Clean up WebGL resources properly (delete buffers, textures, shaders when done)
- Handle WebGL context loss gracefully
- Use point sprites (`gl.POINTS`) for efficient particle rendering

### Astronomical Calculations

- Follow established orbital mechanics formulas (Kepler's equations)
- Use consistent units: Astronomical Units (AU) for distance, radians for angles, seconds for time
- Document the physical meaning of constants with inline comments (e.g., `const float muSun = 3.96401599E-14; // AU^3/s^2`)
- Include iterative solvers with defined iteration counts (e.g., 30 iterations for eccentric anomaly)
- Apply resonance adjustments for specific asteroid groups (Trojans, Hildas)

## HTML and CSS Standards

### CSS Organization

- Use CSS custom properties (variables) for theming: `--page-bg`, `--button-text`, etc.
- Support both light and dark themes with separate color schemes
- Use flexbox for responsive layouts
- Include mobile-first responsive design with media queries
- Support safe areas for mobile devices: `env(safe-area-inset-top)`

### Accessibility

- Include proper ARIA labels: `aria-label`, `aria-hidden`
- Use semantic HTML elements
- Ensure keyboard navigation with `tabindex` where appropriate
- Provide visual focus indicators (`:focus`, `:focus-visible`)
- Use `touch-action` CSS property for touch device optimization

## Node.js Tooling

### Command-Line Tools

- Use `minimist` for argument parsing with clear aliases
- Provide helpful usage messages with `--help` flag
- Follow Unix exit code conventions: 0 for success, non-zero for errors
- Validate required arguments and provide clear error messages
- Use `console.error()` for error messages, `console.log()` for standard output

### Scripts in package.json

- Keep scripts simple and focused
- Use descriptive script names that indicate purpose
- Current scripts: `screenshot`, `generate-qr` (for tooling)

## Security and Best Practices

### General Security

- Never commit secrets or API keys
- Validate and sanitize all external data (especially from astorb.dat file)
- Use defensive programming practices (bounds checking, null checks)
- Handle errors gracefully without exposing internal details

### Performance

- Use efficient WebGL rendering techniques (minimize state changes)
- Batch similar operations together
- Use appropriate precision (`mediump` over `highp` when sufficient)
- Profile performance-critical code paths
- Consider memory usage for large datasets (asteroid database)

### Browser Compatibility

- Test across major browsers (Chrome, Firefox, Safari, Edge)
- Provide fallbacks for older API implementations
- Use feature detection over browser detection
- Support mobile browsers with touch interactions

## Testing and Development

### Manual Testing

- Test with different asteroid counts (half, double buttons)
- Verify all color modes work correctly
- Test all control buttons (pause, time controls, theme toggle)
- Test on both desktop and mobile devices
- Verify loading overlay behavior

### Code Changes

- Make minimal, focused changes
- Test changes in the browser before committing
- Verify WebGL rendering still works correctly
- Check console for WebGL errors or warnings
- Ensure no regressions in existing functionality

## Documentation

### Code Comments

- Comment complex mathematical operations and algorithms
- Explain non-obvious WebGL state or shader behavior
- Document physical constants with units
- Keep comments concise and focused on "why" not "what"
- Update comments when code changes

### Inline Documentation

- Use JSDoc-style comments for public API functions
- Document function parameters and return values
- Include examples for non-obvious usage patterns

## File Organization

- `astorb3d.html` - Main application HTML
- `scripts/js/astorb3d.js` - Core WebGL and orbital mechanics entry module
- `scripts/js/astorb-utils.js` - Formatting, color helpers, and DOM UI utilities (ES module)
- `scripts/js/astorb-astro.js` - Astronomical Kepler solvers and Julian Date routines (ES module)
- `data/release/` - Committed release dataset (`astorb3d.bin` and `astorb3d.meta.json`)
- `tests/` - Vitest unit tests and e2e tests
- `tools/` - Node.js tooling for data pipelines, release verification, and screenshots
- `assets/` - Static images, badges, and documentation assets

## Important Notes

- Development server: `pnpm run dev` (powered by Vite+)
- Production build: `pnpm run build` (Rolldown bundles JS into `dist/assets/`, copies dataset into `dist/data/release/`)
- Production preview: `pnpm run preview`
- Linting and formatting: `pnpm run check` (Oxlint + Oxfmt)
- All calculations happen in real-time on the GPU via shaders
- The application handles large datasets (~1.5M asteroids) efficiently
- Focus on maintaining performance while adding features
- Preserve the existing visual design and user experience
- Focus on maintaining performance while adding features
- Preserve the existing visual design and user experience
