---
status: testing
phase: 06-lock-deck
source: 06-{01,02,03}-PLAN-SUMMARY.md
started: 2026-07-17T20:35:00Z
updated: 2026-07-17T20:35:00Z
---

## Current Test

number: 1
name: Lock config schema accepts the documented shape
expected: |
  A config with `lock: { buttons: [...] }` validates without error against the new `LockSchema`. A config with `lock:` omitted validates (optional). A config with `lock.buttons: []` validates but falls back to default. An unknown field on `lock:` is rejected (.strict()).
awaiting: user response

## Tests

### 1. Lock config schema accepts the documented shape
expected: Run `pnpm --filter @sireno-deck/cli exec vitest run config/__tests__/validation.test.ts` — fixtures with `lock: { buttons: [...] }` and `lock: {}` pass; `lock: { foo: 1 }` is rejected.
result: pending

### 2. Default 3-button HH:MM deck on lock with no user config
expected: With no `lock:` block, when the OS locks, the active deck is `lock:deck` with exactly 3 buttons of type `date-time:locked-time-tile` with slots `hour`, `separator`, `minute`. Test: `lock-deck.test.ts:uses default 3-button time deck when lockConfig.buttons is absent`.
result: pending

### 3. User-defined `lock.buttons` synthesize into lock deck
expected: With `lock: { buttons: [{type: 'core:change-deck', config: {deck: 'system'}, position: 0}] }`, the active lock deck has 1 button of type `core:change-deck` with that config. Test: `lock-deck.test.ts:uses user-defined buttons when lockConfig.buttons is non-empty`.
result: pending

### 4. Non-folder actions suppressed on lock deck
expected: With `lock: { buttons: [{type: 'core:action', actions: {tap: 'paste://x'}}] }` and lock active, tapping that button does NOT call `dispatch` (no paste fires). Test: `lock-deck.test.ts:suppresses non-folder actions on lock deck`.
result: pending

### 5. Folder-nav escape (core:change-deck) clears lock + dispatches
expected: With `lock: { buttons: [{type: 'core:change-deck', config: {deck: 'system'}}] }` and lock active, tapping that button calls the addon's onTap handler (which publishes `runtime:navigate-deck`), clears `lockActive`, and the user ends up on the `system` deck. Test: `lock-deck.test.ts:folder-nav button (core:change-deck) escapes lock and dispatches`.
result: pending

### 6. core:page-nav is also a valid escape
expected: Both `core:change-deck` AND `core:page-nav` are recognized as folder-nav escape types. Test: covered by the same pre-check branch (whitelist `LOCK_FOLDER_NAV_TYPES`).
result: pending

### 7. System buttons (n-1) not injected under lock mode
expected: When `lockActive=true`, `injectSystemButtons(decks, keyCount, {lockActive: true})` produces no n-1 system button (no `core:back`, no `core:settings-entry`). Test: `system-back-injection.test.ts` (existing test extended).
result: pending

### 8. Regular deck restored on OS unlock (no overlay was active)
expected: User navigates from main to media, OS locks, OS unlocks → user ends on media (regular nav-stack restore). Test: `overlay-lock-resume.test.ts:regular deck restored on unlock when no overlay was active`.
result: pending

### 9. Overlay auto-resumes on unlock if trigger still matches
expected: Spotify overlay active → OS locks → OS unlocks while Spotify is still active app → overlay auto-resumes (nav stack preserved). Test: `overlay-lock-resume.test.ts:overlay auto-resumes on unlock if trigger still matches`.
result: pending

### 10. Overlay dismissed + regular deck restored when trigger no longer matches
expected: Spotify overlay active → OS locks → active app changes to Firefox → OS unlocks → overlay dismissed, user ends on the regular deck that was behind the overlay (not the overlay deck). Test: `overlay-lock-resume.test.ts:overlay dismissed + regular deck restored on unlock when trigger no longer matches`.
result: pending

### 11. Folder-escape is sticky (no auto-restore on subsequent OS unlock)
expected: User escapes via `core:change-deck` during lock, then OS unlocks → user stays on the folder deck; no re-lock from the unlock event. Test: `overlay-lock-resume.test.ts:lock → folder-escape → OS unlock → no auto-restore (escape is sticky)`.
result: pending

### 12. runtime:lock-mode pubsub event fires on transitions
expected: Subscribers receive `{active: true, reason: 'session-locked'}` on lock entry, `{active: false, reason: 'session-unlocked'}` on unlock, `{active: false, reason: 'escape'}` on folder-nav escape. Tests: `lock-deck.test.ts` (3 pubsub tests).
result: pending

### 13. Snapshot refresh on consecutive lock events
expected: If a second `state === 'locked'` event arrives while already locked, the pre-lock snapshot is refreshed (captures the latest regular deck). Test: `overlay-lock-resume.test.ts:snapshot refreshes on consecutive lock events`.
result: pending

### 14. Orphan `session.locked_deck` schema field is removed
expected: A config with `session: { locked_deck: '...' }` is rejected (strict schema). The `session.locked_deck` field no longer appears in `config/__tests__/validation.test.ts` fixtures.
result: pending

### 15. No protocol message changes (backend-only per CONTEXT)
expected: `protocol-internal.ts` and `deck-config.ts` are NOT modified for lock mode — the lock deck flows through the existing `deck-config` protocol like any other deck (synthesized at runtime, not registered in the static decks list).
result: pending

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0

## Gaps

[none yet]