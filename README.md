# After Hours — Maze Club

A browser-based maze game built with HTML, CSS, JavaScript, Three.js, and Vite. Its charcoal, olive, cream, and lime palette matches the neighboring After Hours pinball game.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm test` for the core tests, `npm run build` for production files in `dist/`, and `npm run preview` to serve that build. Deploying only requires a static web host.

## CI/CD and GitHub Pages

The **CI and GitHub Pages** workflow in `.github/workflows/ci-pages.yml` uses Node.js 24, installs locked dependencies with `npm ci`, runs the tests, and builds the site on branch pushes and pull requests targeting `main`. Failed tests or builds prevent deployment. Feature branches and pull requests only run checks.

One-time setup in [the repository's Pages settings](https://github.com/JensonChoi/maze-game/settings/pages):

1. Under **Build and deployment**, set **Source** to **GitHub Actions**.
2. Ensure GitHub Actions is enabled and the pinned official `actions/*` actions are allowed by repository or organization policy.
3. Merge the workflow into `main`. Successful pushes to `main` automatically upload `dist/` and deploy it using the `github-pages` environment.

After the workflow is on `main`, you can also open **Actions → CI and GitHub Pages → Run workflow**, select `main`, and run it manually. Other selected branches run checks only. Deployments are serialized to avoid overlapping publication, and the deployment job links to the published site.

Expected URL after a successful deployment: https://JensonChoi.github.io/maze-game/. No custom secret or personal access token is required; the deployment job uses GitHub's temporary token with Pages and OIDC permissions. Private repositories require a GitHub plan that supports Pages; do not change repository visibility just to enable deployment.

CI builds with the repository path as Vite's base so scripts, styles, and the favicon load under `/maze-game/`. To reproduce that build locally:

```sh
npm run build -- --base=/maze-game/
npm run preview
```

Open the preview URL with `/maze-game/` appended. Standard `npm run dev` and `npm run build` still use `/`. If you later configure a custom domain, update the workflow's `PAGES_BASE_PATH` to `/`.

See [Vite's GitHub Pages guide](https://vite.dev/guide/static-deploy.html#github-pages) and [GitHub's custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for hosting requirements.

## Play

- Move with arrow keys, WASD, or the on-screen directional buttons (hold to repeat).
- Reach the light-colored ring to complete the maze and unlock the next level.
- All 20 levels appear on the home page. Completed levels can be replayed.
- Restart returns to the entrance; All levels returns home. There is no time limit.
- Reset progress asks for confirmation before replacing your campaign with 20 new mazes.

## Generation and saving

Seeded randomized depth-first search creates connected, acyclic mazes, from 5×5 cells to 24×24. Breadth-first search verifies connectivity and chooses the farthest cell as the exit. Difficulty increases through size and navigation complexity; random layouts can vary in perceived difficulty.

A versioned campaign seed and completed-level count are stored in `localStorage` under `after-hours-maze.progress`. Layouts and completed levels survive reloads. Unfinished attempts restart at the entrance. Reset replaces only this game's data. If storage is unavailable, the game displays a notice and keeps progress in memory for the current session.

The 3D renderer uses an orthographic camera and instanced walls. A 2D canvas fallback keeps gameplay available when WebGL is unavailable. Layouts adapt to mobile, dialogs support keyboard focus and Escape, and player animation respects reduced-motion preferences. Fonts have local system fallbacks.

Core tests cover 2,000 generated mazes, symmetric walls, connectivity, movement, completion, deterministic seeds, sequential unlocks, persistence, resets, corrupt data, and unavailable storage.
