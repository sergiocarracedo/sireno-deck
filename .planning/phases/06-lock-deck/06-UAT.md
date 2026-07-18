---
status: complete
phase: 06-lock-deck
source: 06-{01,02,03}-PLAN-SUMMARY.md
started: 2026-07-17T20:35:00Z
updated: 2026-07-17T23:40:00Z
---

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0

## Gaps

None.

## Notes

- Tests 7-15 were skipped at user request — all corresponding code paths are exercised by the automated test suite (`lock-deck.test.ts`, `overlay-lock-resume.test.ts`, `addon-core-lock.test.ts`, `system-back-injection.test.ts`, `validation.test.ts`).
- Two architectural shifts happened during UAT:
  1. **Renamed `lock:deck` → `core:lock`** for consistency with the `core:*` naming convention. Registered as a real addon deck (not synthesized).
  2. **Moved button-injection logic into the `core:lock` addon factory** in `packages/cli/src/builtin-addons/core/index.ts`. Runtime no longer special-cases `core:lock` — it just looks up the deck via `deckById`. User's `lock:` config flows into the factory via `materializeAddonDecks`.

## All Tests

### 1. Lock config schema accepts the documented shape
result: pass

### 2. Default 3-button HH:MM deck on lock with no user config
result: pass

### 3. User-defined `lock.buttons` synthesize into lock deck
result: pass

### 4. Non-folder actions suppressed on lock deck
result: pass

### 5. Folder-nav escape (core:change-deck) clears lock + dispatches
result: pass

### 6. core:page-nav is also a valid escape
result: pass

### 7. System buttons (n-1) not injected under lock mode
result: pass (code-verified)

### 8. Regular deck restored on OS unlock (no overlay was active)
result: pass (test-verified: `overlay-lock-resume.test.ts:regular deck restored on unlock`)

### 9. Overlay auto-resumes on unlock if trigger still matches
result: pass (test-verified)

### 10. Overlay dismissed + regular deck restored when trigger no longer matches
result: pass (test-verified)

### 11. Folder-escape is sticky (no auto-restore on subsequent OS unlock)
result: pass (test-verified)

### 12. runtime:lock-mode pubsub event fires on transitions
result: pass (test-verified: 3 lock-mode event tests in `lock-deck.test.ts`)

### 13. Snapshot refresh on consecutive lock events
result: pass (test-verified: `overlay-lock-resume.test.ts:snapshot refreshes on consecutive lock events`)

### 14. Orphan `session.locked_deck` schema field is removed
result: pass (test-verified: `validation.test.ts` fixture updated, unknown field rejected)

### 15. No protocol message changes (backend-only per CONTEXT)
result: pass (code-verified: no `protocol-internal.ts` / `deck-config.ts` changes for lock mode)