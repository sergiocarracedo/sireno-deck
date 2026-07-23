# Sireno Deck — Agent Instructions

## Source of truth

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the system is wired. Read top-to-bottom on first contact. Section 8 is the working plan; everything else describes the system as it exists today.
- [`docs/STATE.md`](docs/STATE.md) — snapshot of completed and in-progress phases, plus quick-task log.
- [`STRATEGY.md`](STRATEGY.md) — product strategy grounding (populated via `/ce-strategy`).

## Stack

TypeScript (strict, ESM), React 19, Vite 6, Tailwind 4, Node ≥20, pnpm workspace. Full table at `ARCHITECTURE.md §2-3`.

## Conventions

- **No default exports** for new logic — named exports only.
- **Zod schemas** with `.strict()` for config/protocol. No `.refine()`.
- **Boundaries**: oxlint forbids `packages/cli/src/**` → `frontend/` or `emulator/` imports. Cross-process comms go through the WS bridge only.
- **Testing**: vitest, node default; jsdom for `frontend/` and `emulator/`. Co-located `__tests__/` dirs.
- **Lint/format/typecheck**: `pnpm lint && pnpm format && pnpm typecheck` before pushing.
- **ponytail mode**: shortest working solution, stdlib/native first, delete over add. Mark deliberate shortcuts with `ponytail:` comments.

## Workflow (compound-engineering)

- `/ce-compound` — after a non-trivial fix, capture the learning into `docs/solutions/`. One learning per run.
- `/ce-compound-refresh` — when a learning looks stale or drifted.
- `/ce-debug` — for bugs (reproduce, root-cause, fix).
- `/ce-brainstorm` + `/ce-plan` + `/ce-work` — for new features.
- `/lfg` — autonomous end-to-end (plan → work → review → PR).
- `/ce-setup` — verify CE health and `.compound-engineering/config.local.yaml`.

## Verification

After a new feature or a bugfix, run the cli `--emulator` flag and check the emulator (http://127.0.0.1:52938/#/device) and the frontend (http://127.0.0.1:5180)
) using the skill agent-browser to verify the solucion and no other errors

## When stuck

1. Search `docs/solutions/` for the symptom module (`grep -r "<module>" docs/solutions/`).
2. Check `ARCHITECTURE.md` for the affected subsystem.
3. Check `docs/STATE.md` for context on recent phases.
