# Repository Guidelines

## Project Structure & Module Organization

This is a static browser game using HTML, CSS, JavaScript ES modules, Three.js, and Vite.

- `index.html`: page structure, controls, and confirmation dialogs.
- `src/main.js`: navigation, input handling, and UI updates.
- `src/maze.js`: seeded generation, connectivity checks, and movement rules.
- `src/progress.js`: progress validation and localStorage persistence.
- `src/renderer.js`: Three.js rendering and the 2D canvas fallback.
- `src/style.css`: responsive layout and the charcoal, olive, cream, and lime palette.
- `test/`: core tests; `public/`: static assets. Generated `dist/` and `node_modules/` are ignored.

## Build, Test, and Development Commands

- `npm install`: install dependencies; commit lockfile changes when dependencies change.
- `npm run dev`: start Vite; open the printed local URL.
- `npm test`: run Node’s built-in test runner.
- `npm run build`: generate the production site in `dist/`.
- `npm run preview`: serve the production build locally.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single-quoted JavaScript strings, and explicit `.js` import extensions. Prefer `const` unless reassignment is necessary. Use camelCase for functions and variables, PascalCase for classes, and UPPER_SNAKE_CASE for constants. Keep generation and persistence independent of DOM rendering. No formatter or lint script is configured; follow surrounding code without unrelated reformatting.

## Testing Guidelines

Use `node:test` and `node:assert/strict`. Name files `test/<module>.test.js` and describe expected behavior in test titles. No numeric coverage threshold is configured. Preserve checks across all 20 levels and multiple seeds for connectivity, symmetric walls, deterministic layouts, collisions, and completion. Cover sequential unlocks, reload persistence, invalid saved data, reset isolation, and unavailable storage when changing progress behavior.

Run tests and the production build before submitting changes. For UI changes, check desktop/mobile layouts, keyboard/touch controls, dialog focus, reset cancellation/confirmation, and reload behavior. Report any checks you cannot perform.

## Commit & Pull Request Guidelines

This checkout has no Git metadata, so existing commit conventions cannot be verified. Use concise imperative messages, such as “Fix touch movement after restarting.” Keep changes focused. PRs should describe the behavior change, link relevant issues, list validation results, and include screenshots for visual changes.

## Progress Compatibility

Preserve versioned data under `after-hours-maze.progress`. Handle invalid data and storage failures gracefully. Reset only this game’s data and retain its confirmation dialog. Keep seeded layouts stable across reloads and guarantee every generated maze is solvable.
