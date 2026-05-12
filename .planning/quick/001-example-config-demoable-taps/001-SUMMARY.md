# Quick Task 001 Summary

**Task:** update example config so taps are demoable in UAT
**Completed:** 2026-05-12

## What was done
Updated the repo root `config.yml` so it no longer demonstrates only passive display buttons. The example now includes an `action` button that runs a safe demo command, a `change-deck` button that opens a real sub-deck, and a sub-deck with visible buttons so the generated back button can be exercised on hardware.

## Files changed
- `config.yml`: added action and change-deck examples plus an `apps` sub-deck for manual Phase 3 UAT.

## Commit
`ea5b2d6` feat(quick-001): add tappable example config
