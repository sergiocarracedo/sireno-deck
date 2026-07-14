# Stack

Sireno Deck is a TypeScript monorepo. Single workspace package (`@sireno-deck/cli`) that ships a Node service + three Vite SPAs.

## Languages & runtime

- **TypeScript** 7.0.1-rc (strict, `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`).
- **Node.js** ≥20 LTS (engines field). pnpm 10.26.1.
- **Module system:** ESM (`"type": "module"`). `moduleResolution: "bundler"` for Vite, but service runs native Node.
- **JSX:** `react-jsx`. React 19.

## Frameworks

- **React 19** — frontend SPA rendering, addon UIs, emulator shell.
- **React Router 7** (root dependency `react-router-dom@7.18.1`).
- **Vite 6** — frontend, emulator, and addon frontends.
- **Tailwind 4** (`tailwindcss@4.3.1`, via `@tailwindcss/vite`).

## Core libraries (locked versions)

| Library | Locked | Purpose |
|---------|--------|---------|
| `yargs` | 18.0.0 | CLI command tree |
| `zod` | 4.4.3 | Schemas for addon manifests, protocol messages, config validation |
| `pino` | 10.3.1 | Structured logging |
| `execa` | 9.6.1 | Action executor (`runCommand`, `pasteText` shells out via `/bin/sh -c`) |
| `@elgato-stream-deck/node` | 7.6.3 | Real hardware transport |
| `sharp` | 0.34.5 | Image processing (screenshot → key buffers) |
| `playwright` | 1.61.1 | Headless Chromium for real-mode screenshots |
| `ws` | 8.21.0 | WebSocket bridge (`127.0.0.1`, port 52937 default) |
| `chokidar` | 5.0.0 | File watching for addon subscriptions |
| `yaml` | 2.9.0 | Config file parsing (`config.yml`) |
| `dbus-next` | 0.10.2 | Linux D-Bus (active-app, media/MRPIS) |
| `get-windows` | 9.3.0 | Windows active-app detection |
| `@inquirer/prompts` | 7.0.0 | Interactive CLI prompts (device selection) |

## Build & tooling

- **vitest** 4.1.9 — unit tests. Node default, jsdom for `frontend/` and `emulator/`.
- **oxlint** + **oxfmt** — lint + format. Enforces no `**/frontend/**` / `**/emulator/**` imports inside `packages/cli/src` (decoupling rule).
- **tsx** 4.22.4 — TypeScript execution for dev/start scripts.
- **jsdom** 25.0.1 — DOM environment for frontend/emulator tests.

## TypeScript config

- `tsconfig.base.json` — shared: target ES2022, lib ES2023+DOM, strict mode.
- `packages/cli/tsconfig.json` — extends base, `outDir: dist`, `rootDir: src`.
- Path aliases: `@/*` → `packages/cli/src/*`, also `packages/cli/frontend/src/*`, `packages/cli/emulator/src/*`.

## Workspace

- `pnpm-workspace.yaml`: `packages/*`
- `.npmrc`: `shamefully-hoist=true`, `strict-peer-dependencies=false`, `auto-install-peers=true`

## In-repo paths

```
@sireno-deck/cli       → packages/cli/src/index.ts
sireno-deck/react      → packages/cli/src/api/react/index.ts
@/*                    → packages/cli/src/* (also frontend/, emulator/)
```

## What NOT to use

- **Heavy state libs** (redux, mobx, zustand). Addons use the runtime pub-sub + `useAddonChannel`.
- **CSS-in-JS** (styled-components, emotion). Theme is YAML → CSS variables, applied through `useResolvedTheme`.
- **NestJS-style DI.** Addons expose `onLoad(ctx)` and consume a flat context — no decorator magic.
- **Backend coupling to frontend** — oxlint enforces no imports from `packages/cli/src/` into `packages/cli/frontend/` or `packages/cli/emulator/`. Cross-process comms go through the WS bridge only.
