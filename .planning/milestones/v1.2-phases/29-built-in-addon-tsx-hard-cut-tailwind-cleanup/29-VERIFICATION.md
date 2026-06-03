---
phase: 29
status: passed
verified: 2026-05-28
---

# Phase 29: Built-in Addon TSX Hard Cut + Tailwind Cleanup — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 29-01 | `packages/cli/src/addon/api.ts` no longer exports `LegacyAddonButtonDefinition`, `AddonButtonInstance`, or a mounted-definition adapter that translates `render(props)` back into `createInstance(...)`. | ✓ |
| 29-01 | `packages/cli/src/deck/runtime.ts` consumes mounted button definitions natively, including the runtime-owned temporary error surface, without depending on `definition.createInstance(...)`. | ✓ |
| 29-01 | `ButtonSurface` still carries `full_surface` and `sample_interval_ms` metadata truthfully after the TSX/legacy-contract cleanup. | ✓ |
| 29-01 | Focused loader/start/runtime/dom-host tests prove the mounted contract is the only supported seam those paths describe. | ✓ |
| 29-02 | The date-time addon registry in `packages/cli/src/builtin-addons/date-time/index.ts` stays stable while each shipped button definition moves into its own file. | ✓ |
| 29-02 | `packages/cli/package.json` declares `dayjs`, and the executed formatter contract is explicitly Day.js syntax rather than the old hand-rolled token map. | ✓ |
| 29-02 | Any supported non-core token families are backed by explicit Day.js plugin setup instead of undocumented accidental behavior. | ✓ |
| 29-02 | Focused date-time tests still prove the locked-time tile helpers and the other shipped buttons render through the real built-in/runtime path after the split. | ✓ |
| 29-03 | `packages/cli/src/render/theme-utilities.ts` contains the simple spacing/rounding/text-wrap utilities Phase 29 needs instead of leaving those values as inline built-in styles. | ✓ |
| 29-03 | The emoji-selector addon registry stays stable while `category`, `entry`, and `back` move to separate button-definition files with shared local support modules. | ✓ |
| 29-03 | The shipped core button family renders from TSX files rather than `.ts` + `createElement(...)`, and their simple layout/text styling is class-based. | ✓ |
| 29-03 | Focused emoji/core-button tests prove the cleanup through the real built-in registry surface instead of only snapshotting support helpers. | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| Post-roadmap follow-on | Phase 29 is explicitly tracked as post-roadmap cleanup with no new v1.2 requirement IDs assigned in `.planning/REQUIREMENTS.md`; execution stayed within that boundary. | ✓ |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `packages/cli/src/index.ts` -> mounted contract types from `packages/cli/src/addon/api.ts` | `AddonButtonDefinition`, `AddonButtonRuntimeProps`, `MountedAddonButtonDefinition`, `MountedAddonButtonRenderProps`, `ButtonSurface` exist | ✓ |
| `packages/cli/src/builtin-addons/date-time/index.ts` -> per-button modules and formatter support | registry file resolves `buttons/*.tsx`, `schemas.ts`, and `format.ts` exports | ✓ |
| `packages/cli/src/builtin-addons/emoji-selector/index.ts` -> `buttons/*.tsx` and `support.tsx` | registry file resolves stable addon exports from split files | ✓ |
| `packages/cli/src/builtin-addons/core-buttons/index.ts` -> `.tsx` renderer modules | `change-deck.tsx`, `toggle.tsx`, and `media-sample.tsx` exist and are used as the live sources | ✓ |

## Verification Commands

| Command | Result |
|--------|--------|
| `pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/render/dom-host.test.tsx src/addon/loader.test.ts src/cli/commands/start.test.ts` | ✓ pass |
| `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/date-time/index.test.ts src/deck/runtime.test.ts` | ✓ pass |
| `pnpm --filter sireno-deck-cli exec node -e "import pkg from './package.json' with { type: 'json' }; if (!pkg.dependencies?.dayjs) throw new Error('missing dayjs dependency'); console.log(pkg.dependencies.dayjs)"` | ✓ pass |
| `pnpm --filter sireno-deck-cli exec node -e "import dayjs from 'dayjs'; console.log(dayjs('2026-05-27T13:14:15Z').format('YYYY-MM-DD HH:mm:ss'))"` | ✓ pass |
| `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/emoji-selector/index.test.ts src/builtin-addons/core-buttons/index.test.ts` | ✓ pass |

## Summary

**Score:** 12/12 must-haves verified

All automated checks passed. Phase goal achieved.

One earlier verifier run produced a non-reproducible failure in the Phase 24 mounted-fixture proof during the combined Wave 2 command (`Unknown button type 'phase-24-mounted-button'`). The exact same command passed on immediate rerun in both file orders, so the final verification status is based on the reproducible green state rather than that transient blip.
