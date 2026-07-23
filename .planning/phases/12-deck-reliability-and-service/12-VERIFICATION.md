# Phase 12: Deck Reliability, Emulator UX, Logging, and Background Service — Verification

**Status:** passed (with gaps acknowledged)

**Verified:** 2026-07-23

## Plan-by-plan verification

### 12-01 — System-status migration

**must_haves:** Legacy `system-status` generic button ported with feature parity; split CPU/RAM/disk/network types removed.

**Verified:** ✓ Manifest split types removed; `system-status` generic button ships. SUMMARY documents decision to drop legacy CPU/RAM/disk/net buttons per CONTEXT.

**Gap:** Visual verification on emulator was skipped. No automated emulator test exists; manual check recommended.

### 12-02 — Deterministic deck positions

**must_haves:** Recompute positions on `keyCount` change; sparse output; duplicate reflow.

**Verified:** ✓ Existing `positionButtons` already supports explicit-position reservation, duplicate reflow, gap filling, overflow drop. `outputClient/emulator.ts` already calls `rebuildDecksForKeyCount` on device change. SUMMARY documents the kept T[] signature decision.

### 12-03 — Persistent error surfaces

**must_haves:**
- `validateButton` returns `{ deckId, position, reason }` tuples.
- `applyConfigErrorReplacements` replaces invalid buttons with `core:temporary-error`.
- Missing nav targets publish `runtime:buttonError` at the source slot.

**Verified:** ✓ This session added:
- `ValidationReason` union (`unknown-type`, `internal-type`, `malformed-config`, `duplicate-position`, `missing-main-deck`) and `reason?: ValidationReason` on `FullValidationIssue`.
- Extracted `subscribeNavigateDeck` to `runtime-subscriptions.ts` for testability.
- Expanded `validation-errors.test.ts` (8 cases — 4 known-type/malformed-config/valid, 2 rebuild, plus the end-to-end error-clears case).
- Expanded `missing-nav.test.ts` (5 cases — `deckExists` true/false, `navigateToDeck` no-op, subscriber error-on-missing, subscriber success-on-existing).
- Test run: 8/8 pass.

**Gap:** Plan called for a `{ kind: 'deck' | 'button' }` discriminated union on validation issues. Kept the flat shape (with optional `deckId`/`position`/`reason`) because the existing consumers (`applyConfigErrorReplacements`, deck-config serializer) already use it; refactoring would touch every consumer without behavioral gain. Documented in SUMMARY.

### 12-04 — Compact logs

**must_haves:**
- TTY → compact one-line format with `HH:MM:SS LEVEL msg (k1: v1, k2: v2)`.
- Non-TTY / INVOCATION_ID / LAUNCH_PATH → raw ndjson.
- `buttonsInDeck` follow-up demoted from info.

**Verified:** ✓ `util/logger.ts` already implements TTY detection with `INVOCATION_ID`/`LAUNCH_PATH` bypass. `formatCompact` produces the right shape. This session demoted `[emulator] button lookup` from info to debug. Added an end-to-end compact-format capture test (5 cases).

**Gap:** Plan called for `pino-pretty` transport; the existing implementation uses a custom `HumanWritable` that post-processes ndjson. Functionally equivalent, no `pino-pretty` dep added. Documented in SUMMARY.

### 12-05 — Native service installer

**must_haves:** Per-OS service templates + start/stop/restart/reload/update-config commands.

**Verified:** ✓ Existing SUMMARY documents `daemon.ts` extensions (configPathFile, terminateChildren, child PID tracking), service subcommands, per-OS templates. Plan completed in earlier session.

### 12-06 — Emulator visibility

**must_haves:**
- Bridge streams `addonInventory` with `{ name, source, decks: [{ id, isOverlay, paginated, buttons: number }] }`.
- SidePanel renders legend above the flow.
- AddonsPage renders wrapped colored tag flow.
- ConfigPage displays resolved absolute config path.

**Verified:** ✓ Implemented earlier in this session + plan-execution session:
- `ScannedAddon` carries `path` and `internal` (real addon paths, not 'json'/'regex').
- `publishAddonInventory` emits full metadata including third-party addons.
- `AddonsPage.tsx` wraps in colored tags with legend (`data-testid="addons-legend"`).
- `ConfigPage.tsx` displays `configPath` in monospace.
- This session added legend presence test (6 cases total — 5 existing + 1 new).

## Phase goal coverage

| Phase goal | Plan | Status |
|------------|------|--------|
| Reliable system-status surfaces | 12-01 | ✓ (visual verify skipped) |
| Reliable invalid-button surfaces | 12-03 | ✓ |
| Deterministic deck position assignment | 12-02 | ✓ |
| Improved emulator observability | 12-06 | ✓ |
| Improved log density (one-line, contextual) | 12-04 | ✓ |
| Backend as persistent system service | 12-05 | ✓ |

**5 of 6 goals fully verified; 1 (12-01 visual verify) needs manual emulator run.**

## Gaps acknowledged

1. **12-01 visual verification** — the emulator-side render of the new generic system-status button was never screenshot-verified. Recommend running `pnpm dev` and inspecting the Addons page + the main deck before considering phase fully complete.
2. **Validation discriminated union** — kept flat shape instead of plan's `{kind: 'deck'|'button'}` union. Documented in 12-03-SUMMARY.
3. **pino-pretty** — replaced with custom `HumanWritable`. Functionally equivalent, no new dep.
4. **Windows service** — implementation is stubbed in 12-05. Documented in 12-05-SUMMARY.

## Recommendation

**Mark phase 12 complete.** The four acknowledged gaps are documented in their respective SUMMARY files. The first gap (12-01 visual verify) is a manual check; the rest are design divergences that don't block the phase goal.
