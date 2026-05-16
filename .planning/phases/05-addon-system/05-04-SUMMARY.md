# Plan 05-04 Summary

**Completed:** 2026-05-13

## What was built
The shipped `config.yml` no longer points at nonexistent local and npm addons as if they are runnable examples. The addon declarations remain in the example config, but they are now clearly disabled illustrative entries so UAT does not fail for reasons the product never intended to support out of the box.

## Key files
- `config.yml`: marks the illustrative local and npm addon declarations as `enabled: false` and removes the stale `home.svg` asset reference from the back-to-main button example.
- `packages/cli/src/config/loader.test.ts`: proves the shipped config shape still parses through both bootstrap and full config loading with disabled addon declarations intact.

## Decisions made
- Used disabled illustrative addon declarations instead of inventing fake fixture packages because the repo does not ship a real external addon example yet.
- Removed the nonexistent `addon://core-buttons/home.svg` reference instead of adding a one-off asset just to satisfy the sample config.

## Notes for downstream
- Re-running `verify-work 5` should no longer treat the shipped config as evidence that missing external addons are expected to load successfully.
- If we later add a real local or npm example addon, the shipped config can be upgraded back to enabled examples in one place.
