---
title: Playwright runtime first-run install without npm
date: 2026-08-11
category: docs/solutions/build/
module: packages/cli
problem_type: tooling_decision
component: build
severity: medium
applies_when:
  - An installer ships a CLI that renders via Playwright but must not bundle browser binaries or require npm at runtime
tags: [playwright, browsers, first-run, no-npm, PLAYWRIGHT_BROWSERS_PATH]
---

# Playwright runtime first-run install without npm

## Context

`sireno-deck` renders deck screenshots and browser surfaces via Playwright (`src/render/browser-renderer.ts:101-102` does `await import("playwright")`). Vendoring browser binaries into the installer would bloat it (~150MB) and duplicate what the CDN already serves per-platform. The installer must therefore download the browser on first run — without npm, which the target user does not have.

## Guidance

### Download by shelling out to the bundled playwright CLI

The `playwright` package is external to the tsdown bundle but present in the installed tree. Its `cli.js` can install a browser without npm:

```bash
node <root>/node_modules/playwright/cli.js install chromium
```

`src/cli/first-run.ts` spawns this with `process.execPath` (the node that launched the app) and `stdio: "inherit"` so the user sees download progress. This is the same browser the app uses — the chromium headless shell — so no extra channels.

### Redirect browsers into the app's cache and keep the env var set

Browsers land in `~/.cache/sireno-deck/playwright/`:

```ts
const browsersPath =
  process.env["PLAYWRIGHT_BROWSERS_PATH"] ??
  join(homedir(), ".cache", "sireno-deck", "playwright")
process.env["PLAYWRIGHT_BROWSERS_PATH"] = browsersPath
```

Setting the env var on the parent process matters: the spawned daemon inherits it, so `browser-renderer`'s runtime `playwright.launch()` finds the browser without extra config. "Already satisfied" is detected by listing the dir for a `chromium-*` entry — cheap and avoids a re-download on every run.

### Offline failure mode

Download failures are logged loudly and the run continues: browser output is one optional output type (hardware output still works). This is a deliberate deviation from an earlier plan that exited non-zero — blocking the whole app on an offline first run is worse than a degraded browser surface. If offline-first-run blocking is ever wanted, gate it behind a config flag.

### First-run gating

A flag file `~/.config/sireno-deck/first-run.json` (`{ "version": 1 }`) stamps completion so the download + wizard prompt run exactly once. Query commands (`--help`, `--version`, `-V`, `system-requirements`) and non-installed dev builds never trigger first-run — the gate is `SIRENO_INSTALL_ROOT` being set plus a real command word in `argv`.

## When to Apply

- Shipping Playwright-based rendering in an installer that must not depend on npm.
- Any first-run network fetch that must be idempotent and invisible on subsequent runs.
- Setting `PLAYWRIGHT_BROWSERS_PATH` on a parent that spawns children needing browsers.

## Related

- `packages/cli/src/cli/first-run.ts` — orchestration (playwright bootstrap + flag file)
- `packages/cli/src/render/browser-renderer.ts` — the runtime consumer
- `docs/solutions/build/installer-runtime-tree-pnpm-deploy.md` — how the playwright package lands in the tree
