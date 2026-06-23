# AGENTS.md

> Project-level rules for AI agents working on sireno-deck-2.
> Generated as part of learnship /new-project bootstrap.

## Project at a glance

- Single-package pnpm workspace (`packages/cli`)
- TypeScript 7.0 RC, ES2022 + DOM lib
- React 19 + Tailwind 4 (frontend only, in Phase 04+)
- Node ≥ 20

## Commands

From repo root:

| Command                            | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `pnpm test`                        | Run all vitest tests once (`vitest run`)                          |
| `pnpm test:watch`                  | Run vitest in watch mode                                          |
| `pnpm typecheck`                   | Run `tsc --noEmit` across all packages                            |
| `pnpm lint`                        | Run `oxlint packages` (may OOM in some envs — fallback below)     |
| `pnpm --filter sireno-deck-2 lint` | Per-package lint (more reliable than root-level)                  |
| `pnpm format`                      | Run `oxfmt .` to write formatting                                 |
| `pnpm format:check`                | Run `oxfmt --check .` (CI-safe)                                   |
| `pnpm build`                       | Run `pnpm -r build`                                               |
| `pnpm dev`                         | Run `pnpm --filter sireno-deck-2 run dev` (CLI in foreground dev) |

Run the CLI in dev:

```
node packages/cli/bin/sireno.js <command>
```

Or via the workspace package:

```
pnpm --filter sireno-deck-2 exec sireno <command>
```

## Code conventions

- **Indentation:** 2 spaces, no tabs (see `oxfmt.json`)
- **Quotes:** single quotes
- **Semicolons:** none
- **Trailing commas:** all
- **Print width:** 110
- **Imports:** relative imports within a folder must include `.ts`/`.tsx` extension; cross-folder imports prefer the `@/` alias
- **No comments** unless the user explicitly asks
- **File layout:** entrypoints are `index.ts`/`index.tsx`; large files split into a folder with sub-files
- **Decoupling:** the React frontend cannot import from CLI or emulator code. Use `src/api/` (Phase 04) for shared types
- **Tests:** colocated in `__tests__/` folders; cover behavior, not implementation

## Architecture rules

- All cross-package code lives in `packages/cli`. No other packages in the workspace.
- Sub-path exports: `.`, `./api`, `./react`, `./vite` (the last three are placeholders until Phase 04).
- Addon contract: `SIRENO_ADDON_API_VERSION = 3`. Lifecycle hooks are only `onTap`, `onDblTap`, `onHold`, `dispose`. No `onPress`/`onRelease`/`onActivate`/`onDeactivate`/`poll`/`refresh` — use pub-sub channels for state updates.
- Gesture state machine outputs only `tap | dbl-tap | hold`. No `press-then-release`.
- WS protocol version: 3. No `snapshot` message. `button-action` carries `gesture`.
- Icon resolution goes through `resolveIconRef(ref, ctx)` — never inline-resolve icons.
- Reserved slot `n-1` is always injected; never check for `allow_reserved_slot_override`.

## When adding a new module

1. Create the file under the right `src/` subfolder.
2. Add tests colocated in `__tests__/` (same parent folder).
3. Update the relevant `index.ts` barrel if one exists for the folder.
4. Run `pnpm typecheck && pnpm --filter sireno-deck-2 lint && pnpm format:check && pnpm test`.
5. Update `.planning/PLAN.md` if the change is structural (new module = new section).
6. Update `.planning/STATE.md` if a phase boundary is crossed.

## Known dev-env quirks

- `pnpm lint` (root) may OOM in this environment due to a 697KB `configuration_schema.json` somewhere in `node_modules`. The per-package variant (`pnpm --filter sireno-deck-2 lint`) works fine.
- `tsc` 7.0.1-rc does not allow `baseUrl` in tsconfig — use paths relative to the tsconfig file itself.
- `verbatimModuleSyntax: true` is OFF because extensionless imports are needed for tsx and yargs.
- `exactOptionalPropertyTypes: false` because yargs types conflict.
- The CLI `bin/sireno.js` spawns `node_modules/.bin/tsx` with `TSX_TSCONFIG_PATH` set; this works around tsx's inability to resolve paths in some scenarios.

## Planning artifacts

- `.planning/PLAN.md` — canonical plan with full locked decisions
- `.planning/PROJECT.md` — project metadata + requirements
- `.planning/ROADMAP.md` — milestone + phases
- `.planning/STATE.md` — current phase tracker
- `.planning/config.json` — learnship settings (do not edit casually)
- `.planning/phases/` — per-phase PHASE.md + SUMMARY.md + CONTEXT.md

When working on a phase:

- Before doing work, read `.planning/phases/[NN-slug]/PHASE.md`
- After completing a plan, write a `*-SUMMARY.md` to that phase directory
- After completing a phase, run `/verify-work [N]`
- Never modify another phase's directory

## Current Phase

**Milestone:** v0.1.0
**Phase:** 05 — emulator ✓ complete → Phase 06 — hardware
**Status:** verified (239 tests passing: 224 cli + 15 frontend-emulator)
**Last updated:** 2026-06-23
