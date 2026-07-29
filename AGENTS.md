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

## Worktrees

All feature branches live in dedicated worktrees under `/works/__worktrees/opensource/sireno-deck-2/<branch-name>`. **Never create a worktree inside the repo** (the `.worktrees/` path in `.gitignore` is legacy drift, not a convention).

### Create

- New branch: `git worktree add /works/__worktrees/opensource/sireno-deck-2/<branch-name> -b <branch-name>`
- Existing branch: `git worktree add /works/__worktrees/opensource/sireno-deck-2/<branch-name> <branch-name>`
- All subsequent repo commands run from the new path.

### Remove (safe)

- `git status` must be clean in the worktree. If dirty, snapshot first:
  - `git stash push -m "<branch>-snapshot-<date>"` for tracked changes
  - `git stash push -u -m "<branch>-snapshot-<date>"` to also capture untracked files
- `git worktree remove /works/__worktrees/opensource/sireno-deck-2/<branch-name>` (no `--force`)
- Optionally `git branch -d <branch-name>` to drop the branch ref (only safe if fully merged; refuses otherwise)
- `git worktree prune` to drop stale metadata

### NEVER do

- `rm -rf` on a worktree directory — destroys uncommitted work without warning.
- `git worktree remove --force` — skips the dirty-check.
- `git branch -D <branch>` — deletes unmerged branches, losing the only ref to those commits.
- `git worktree prune` while live worktrees still reference those paths.

### Recover / bring back a deleted worktree

Worktrees are disposable; branches and stashes are not.

- **Branch ref still exists** (typical case): `git worktree add /works/__worktrees/opensource/sireno-deck-2/<branch-name> <branch-name>` rebuilds the directory and checks out the branch tip. **No data loss.**
- **Branch ref was deleted but commits exist**: `git reflog --all | grep <branch>` to find the last commit SHA, then `git branch <branch> <sha>` to recreate, then the worktree-add command above.
- **Uncommitted changes were lost** (you did `rm -rf`): only recoverable if previously stashed — `git stash list | grep <branch>` then `git stash apply`.
- **You `git worktree remove --force`'d**: same as `rm -rf`; recoverable only via stash reflog (`git stash list`, then `git stash apply`).

If in doubt: **do not remove**. Stash first (`git stash push -u -m "<branch>-snapshot-<date>"`), then remove the worktree, leaving the branch ref and stash intact. Drop the stash only after confirming the work is committed elsewhere.

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
