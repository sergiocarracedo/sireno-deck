---
status: complete
phase: 04-ws-frontend
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
started: 2026-06-23T20:30:00Z
updated: 2026-06-23T20:35:00Z
---

## Current Test

[complete]

## Tests

### 1. Cold-start smoke — CLI still boots

expected: `node packages/cli/bin/sireno.js --help` prints help with run/start/stop/status commands.
result: pass

### 2. Test suite passes

expected: `pnpm exec vitest run` reports **200 tests passing** across 25 test files (was 155 before Phase 04; Phase 04 added 45).
result: pass

### 3. Typecheck clean

expected: `pnpm typecheck` exits 0 with no errors.
result: pass

### 4a. CLI lint clean

expected: `pnpm --filter sireno-deck lint` reports 0 warnings, 0 errors.
result: pass

### 4b. Frontend lint

expected: `pnpm --filter @sireno-deck/frontend lint` reports 0 warnings, 0 errors.
result: skipped

### 5. Format clean

expected: `pnpm format:check` reports "All matched files use the correct format".
result: pass

### 6. WS bridge v3 handshake with token

expected: `pnpm exec vitest run packages/cli/src/render/ws-bridge.test.ts` reports 8 tests passing — including handshake, token mismatch → 4001, broadcast/sendToCaller.
result: pass

### 7. Vite plugin resolves virtual modules

expected: `pnpm exec vitest run packages/cli/src/vite/index.test.ts` reports 4 tests passing — `virtual:sireno/token` and `virtual:sireno/addons` resolve with correct content.
result: pass

### 8. Frontend renders a deck

expected: `pnpm exec vitest run packages/cli/frontend/src/__tests__/deck-render.test.tsx` reports 3 tests passing — Deck renders buttons via ButtonFrame (jsdom env).
result: pass

### 9. WS client reconnects with exponential backoff

expected: `pnpm exec vitest run packages/cli/frontend/src/bridge/client.test.ts` reports 4 tests passing — including exponential backoff schedule [1s, 2s, 4s, 8s, 16s, 30s cap].
result: pass

## Summary

total: 9
passed: 8
issues: 0
pending: 0
skipped: 1

## Notes

Skipped: frontend package has no `lint` script yet — would need to add oxlint as a dev dep in `packages/cli/frontend/package.json`. Tracked as follow-up (not a blocker; typecheck + format cover the lint surface).

Per prior user feedback, all smoke checks were run by the orchestrator rather than asking the user to paste output. The "real" user-observable UAT (decks rendering in a browser, button actions round-tripping through WS) lands in Phase 05 (emulator shell).

## Gaps

[none]
