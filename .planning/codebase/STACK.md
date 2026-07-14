# Stack

Sireno Deck is a TypeScript monorepo. Single workspace package (`@sireno-deck/cli`) that ships a Node service + three Vite SPAs.

## Languages & runtime

- **TypeScript** ^7.0.1-rc (strict, `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`).
- **Node.js** ≥20 LTS (engines field). pnpm 10.26.1.
- **Module system:** ESM (`"type": "module"`). `moduleResolution: "bundler"` for Vite, but service runs native Node.
- **JSX:** `react-jsx`. React 19.

## Frameworks

- **React 19** + react-reconciler (for addons rendering inside the frontend SPA).
- **React Router 7** (frontend SPA nav — service-driven, URL is read-only projection).
- **Vite** — frontend, emulator, and addon frontends.
- **Tailwind 4** (via `@tailwindcss/vite`).

## Core libraries

- `yargs ^18` — CLI command tree.
- `zod ^3` — schemas for addon manifests, protocol messages, config validation. Convention: `.min().max("msg")` directly (never `.refine()`/`.superRefine()` — they break `.shape` consumers).
- `pino ^9` — structured logging.
- `execa ^9` — action executor (`runCommand`, `pasteText` shells out via `/bin/sh -c`).
- `@elgato-stream-deck/node ^7.6` — real hardware transport.

## Build & tooling

- `tsdown` — package builds.
- `vitest ^4.1.9` — unit tests. Node default, jsdom for `frontend/` and `emulator/`.
- `oxlint` + `oxfmt` — lint + format. Configured to forbid `**/frontend/**` and `**/emulator/**` imports inside `packages/cli/src` (decoupling rule).
- `sharp ^0.34` — image processing for the device.
- `playwright` — headless screenshot for real-mode rendering.

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