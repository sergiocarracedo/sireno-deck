# Sireno Deck — Agent Instructions

## Source of truth

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the system is wired. Read top-to-bottom on first contact; describes the system as it exists today.
- [`docs/solutions/`](docs/solutions/) — institutional learnings captured after non-trivial fixes; index file pending (`docs/solutions/README.md`).
- [`STRATEGY.md`](STRATEGY.md) — product strategy grounding (populated via `/ce-strategy`).
- [`RELEASING.md`](RELEASING.md) — release flow, npm Trusted Publishing setup, package list.

## Stack

TypeScript (strict, ESM), React 19, Vite 6, Tailwind 4, Node ≥20, pnpm workspace. Full table at `ARCHITECTURE.md §2-3`.

## Conventions

- **No default exports** for new logic — named exports only. Existing default exports in `packages/cli/src/builtin-addons/*/index.ts` predate this rule and are kept for addon-API compatibility; new modules should not add them.
- **Zod schemas** with `.strict()` for config/protocol. Avoid `.refine()`; if cross-field validation is required, prefer composition (`z.intersection`) or a follow-up `.superRefine` with explicit error codes.
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
- **`lsof` + `kill -9` on user-facing ports** (e.g. `lsof -ti :5180 | xargs kill -9`) — this kills **every** process holding that port, including unrelated browser tabs and other user apps. Use only `kill` on the project's own named processes.
- **`kill -9` on processes you did not start** — always verify the target is the daemon (`sirenodeck`) before killing.

### Recover / bring back a deleted worktree

Worktrees are disposable; branches and stashes are not.

- **Branch ref still exists** (typical case): `git worktree add /works/__worktrees/opensource/sireno-deck-2/<branch-name> <branch-name>` rebuilds the directory and checks out the branch tip. **No data loss.**
- **Branch ref was deleted but commits exist**: `git reflog --all | grep <branch>` to find the last commit SHA, then `git branch <branch> <sha>` to recreate, then the worktree-add command above.
- **Uncommitted changes were lost** (you did `rm -rf`): only recoverable if previously stashed — `git stash list | grep <branch>` then `git stash apply`.
- **You `git worktree remove --force`'d**: same as `rm -rf`; recoverable only via stash reflog (`git stash list`, then `git stash apply`).

If in doubt: **do not remove**. Stash first (`git stash push -u -m "<branch>-snapshot-<date>"`), then remove the worktree, leaving the branch ref and stash intact. Drop the stash only after confirming the work is committed elsewhere.

### Safely stopping the daemon

To stop a running `sirenodeck` daemon started by this session:

```bash
# Find only sirenodeck processes (not unrelated apps on the same ports)
ps aux | grep sirenodeck | grep -v grep
# Kill only those PIDs
kill <PID>
```

Or use the daemon's stop command if a pidfile exists. Never use `lsof | xargs kill` on ports used by user apps (Chrome, Slack, etc).

## Workflow (compound-engineering)

- `/ce-compound` — after a non-trivial fix, capture the learning into `docs/solutions/`. One learning per run.
- `/ce-compound-refresh` — when a learning looks stale or drifted.
- `/ce-debug` — for bugs (reproduce, root-cause, fix).
- `/ce-brainstorm` + `/ce-plan` + `/ce-work` — for new features.
- `/lfg` — autonomous end-to-end (plan → work → review → PR).
- `/ce-setup` — verify CE health and `.compound-engineering/config.local.yaml`.

## Verification

After any change that touches the WebSocket bridge, the session provider, the runtime, the frontend, or the emulator:

1. `pnpm lint && pnpm format && pnpm typecheck`
2. `pnpm test --run`
3. Start the emulator:
   ```bash
   node packages/cli/bin/sireno.js run --config config.yml --emulator --port 52937 --dev
   ```
4. With `agent-browser`, verify both surfaces:
   ```bash
   # Open emulator — wait for WS open, confirm no iframe freeze
   agent-browser open "http://127.0.0.1:52938/#/device"
   agent-browser wait "ws://127.0.0.1:52937"  # wait for WS to connect
   agent-browser eval "document.querySelectorAll('iframe').length"  # should be ≥1
   agent-browser snapshot  # should show deck grid, not "loading…"

   # Open frontend — confirm it shows main deck, not /decks/core:lock
   agent-browser open "http://127.0.0.1:5180/"
   agent-browser eval "window.location.pathname"  # should be /decks/main
   agent-browser eval "document.querySelectorAll('[data-button-type]').length"  # should be >0
   ```
5. Stop the daemon (`Ctrl+C`) and confirm it exits cleanly.

If the emulator iframe shows "loading…" indefinitely, check the bridge WS port matches the iframe's `VITE_WS_URL` env. If the frontend redirects to `/decks/core:lock`, the session provider is reporting `locked` — check `docs/solutions/runtime-errors/session-lock-provider-never-fires.md` for the idle-monitor state machine fix.

## When stuck

1. Search `docs/solutions/` for the symptom module (`grep -r "<module>" docs/solutions/`).
2. Check `ARCHITECTURE.md` for the affected subsystem.
3. Check `__beta-review__/*.md` for context on review-driven tracking.
