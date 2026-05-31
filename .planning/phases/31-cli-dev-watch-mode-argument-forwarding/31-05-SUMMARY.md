# Plan 31-05 Summary

**Completed:** 2026-06-01

## What was built
Plan 31-05 closed the last remaining Phase 31 rerun gap by restoring the live worktree `cli:dev` seam back to the exact launcher contract that the phase had already verified earlier. The root script once again uses the full `pnpm exec tsx watch` seam with the full include graph, the launcher stays a narrow argv resolver with only the product-required `--` sentinel normalization, and the active UAT history now points the last bare-path rerun failure at this live-seam restoration instead of the already-closed runtime defects from `31-03` and `31-04`.

## Key files
- `package.json`: restores the verified workspace-root `cli:dev` watch command with the full include graph and `pnpm exec` wrapper.
- `packages/cli/src/cli/dev-watch.ts`: removes local debug logging drift while preserving only the narrow default-start plus forwarded-args contract, including `pnpm` sentinel stripping.
- `packages/cli/src/cli/dev-watch.test.ts`: adds the focused sentinel regression so the live launcher seam now proves `pnpm run cli:dev -- emulate ...` resolves to the same contract the shipped root-script regression expects.
- `.planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-UAT.md`: preserves the failed bare rerun report while pointing it at `31-05-PLAN.md` as the live-seam restoration plan.

## Decisions made
- Left `packages/cli/src/cli/commands/start.test.ts` untouched because the existing dirty file already asserted the correct contract and passed the exact plan verification gate; touching it would have risked trampling unrelated local work.
- Kept sentinel stripping in `dev-watch.ts` because the shipped regression and focused launcher tests now explicitly treat `pnpm run cli:dev -- emulate ...` as part of the live contract.
- Treated the final rerun failure as worktree drift rather than reopening the already-closed `31-03` and `31-04` runtime bugs.

## Deviations
- The plan listed `packages/cli/src/cli/commands/start.test.ts` as a touched file, but no edit was required in the end because the existing local copy already matched the verified contract and passed the exact regression test gate.

## Notes for downstream
- The next workflow step is `verify-work 31` again, now against the restored live worktree seam rather than the drifted variant that caused rerun attempt 2 to fail on the bare path.
