# Gemini Agent Guidelines (GEMINI.md)

This file contains custom development instructions for Gemini-based agents working on **astorb3d**.

## UI/UX & Styling Guidelines
- **Premium Aesthetics**: Maintain the modern dark mode and light theme color palettes defined as CSS variables in [astorb3d.html](file:///F:/dev/astorb3d%20-%20Copy/astorb3d.html). Keep the design looking sleek, scientific, and responsive.
- **Dynamic Interaction**: Prioritize micro-animations, clean hover states, and smooth transition effects for panel displays, control buttons, and canvas focus indicators.
- **Responsive Layout**: Ensure that canvas rendering scaling works correctly on both high-DPI desktop displays and mobile touch devices.

## Development Workflow & Tooling
- **Verification**:
  - Always run `npm test` and `npm run lint` inside the workspace directory (`F:\dev\astorb3d - Copy`) after making changes.
- **File Edits**:
  - Use `replace_file_content` for singular contiguous blocks of edits.
  - Use `multi_replace_file_content` when editing non-contiguous parts of the large `astorb3d.js` file (75+ KB) or `astorb3d.html` file to minimize overhead and prevent token bloat.
- **External Resources**:
  - Refer to [project_context.md](file:///F:/dev/astorb3d%20-%20Copy/project_context.md) for database structure and command guides.
