# Quick Task 009 Summary

**Task:** capture frontend/emulator vite stderr in CLI

**Completed:** 2026-06-29

## What was done

Modified `spawnFrontendVite` and `spawnEmulatorVite` in `emulator-mode.ts` to capture stderr output from vite processes and include it in error messages when a process exits before becoming ready or times out. Previously, stderr was only logged at `debug` level (invisible without `--verbose`), leaving users with cryptic messages like `frontend exited (code=0) before becoming ready` and no indication of why.

## Files changed

- `packages/cli/src/cli/commands/emulator-mode.ts`: both spawn functions now collect stderr chunks and append them to the exit-before-ready and timeout error messages (truncated to 2000 chars)

## Commit

47d9e8f
