# Phase 31 Discussion Log

**Date:** 2026-05-30
**Mode:** standard
**Phase:** 31 - CLI Dev Watch Mode Argument Forwarding

## Areas Discussed

The user chose `All clear - skip discussion`.

## Options Considered And Outcome

### Gray-area menu presented
- Considered: `Default launch contract`
- Considered: `Arg forwarding shape`
- Considered: `Watch scope boundaries`
- Considered: `Failure UX`
- User choice: `All clear - skip discussion`

## Locked Inputs Carried Forward Without Further Debate

- `cli:dev` remains the full-process `tsx watch` seam for raw source edits.
- Bare `pnpm cli:dev` should still align with the documented default `start --config config.yml` path.
- Forwarded subcommand arguments such as `pnpm cli:dev emulate --port 8912` should reach the real CLI truthfully.
- The phase remains a narrow contract-restoration fix, not a broader CLI/dev-workflow redesign.

## User-Supplied Direction Captured Verbatim

- The new phase exists because after changing the script to accept CLI arguments, running `pnpm cli:dev emulate --port 8912` meant `nothing appened`.

## Areas Delegated To Agent's Discretion

- Exact root-script shape that preserves both default `start --config config.yml` behavior and explicit forwarded args.
- Exact regression-test coverage and README wording needed to keep the contract pinned.

## Deferred Ideas

None.

---
*Audit log only - downstream planning should read `31-CONTEXT.md` instead.*
