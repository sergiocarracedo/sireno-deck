# Plan 31-06 Summary

**Completed:** 2026-06-01

## What was built
Plan 31-06 closed the last remaining Phase 31 rerun blocker by fixing the root script one layer earlier than the launcher/runtime seam. The workspace-root `cli:dev` command now passes its `tsx watch --include` globs to `tsx` literally instead of letting zsh expand missing repo-root patterns first, so bare and forwarded runs can reach the already-repaired launcher/runtime seam instead of dying at the shell with `zsh: no matches found`.

## Key files
- `package.json`: shell-proofs the workspace-root `cli:dev` watch command by quoting the `--include` glob arguments while preserving the verified `pnpm exec tsx watch` seam and launcher target.
- `packages/cli/src/cli/commands/start.test.ts`: tightens the shipped root-script regression so the shell-safe quoted include graph is pinned in the repo-owned test seam.
- `.planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-UAT.md`: preserves the rerun-attempt-3 shell failure reports while recording that `31-06` now closes that root-script seam and that a fresh manual rerun is the next honest step.

## Decisions made
- Kept the fix at the root script layer instead of widening the launcher again because the diagnosed failure happened before `dev-watch.ts` ran at all.
- Preserved the same logical watch graph and `pnpm exec tsx watch` wrapper; only the shell-safety of the include args changed.
- Left the README untouched because the docs were already truthful; the root script was the lying seam in practice.

## Deviations
- None.

## Notes for downstream
- The next workflow step is `verify-work 31` again, now that the runtime bugs, live-seam drift, and zsh shell-glob failure are all closed.
