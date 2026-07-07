# Quick Task 009 Plan: capture vite stderr in exit/timeout errors

## Task 1: Include stderr in vite spawn error messages

**Files:** `packages/cli/src/cli/commands/emulator-mode.ts`

**Action:**
In both `spawnFrontendVite` and `spawnEmulatorVite`:

1. Add a `stderrChunks: string[]` to collect stderr output
2. In the `exit` handler, accumulate stderr into the error message (truncated to 2000 chars) so users see why the process failed
3. In the `timeout` handler, also include accumulated stderr so the timeout error is actionable

**Verify:** `pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test`

**Done:** Both spawn functions include captured stderr in their error messages when a vite process exits before becoming ready or times out.
