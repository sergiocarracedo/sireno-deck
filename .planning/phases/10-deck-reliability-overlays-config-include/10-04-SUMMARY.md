# Plan 10-04 Summary

**Completed:** 2026-07-21

## What was built

Added a `assetsReady` state gate in `App.tsx` that blocks the deck's first paint until the WebSocket `assets` message has been received and the asset cache populated. While waiting, a small `<div class="deck-loading">Loading…</div>` skeleton renders instead of the deck — preventing the broken-icon fallback on cold-start.

## Key files

- `packages/cli/frontend/src/App.tsx`: added `assetsReady` state; flipped to `true` inside the `onMessage` handler when `message.type === "assets"`; gated the `<Deck>` render on `assetsReady`.
- `packages/cli/frontend/src/__tests__/asset-timing-gate.test.tsx`: new test asserting that the loading skeleton renders before the `assets` message arrives and that the deck renders after.

## Decisions made

- Used a one-way `assetsReady` flag (false → true, never back) because the asset cache is global and persistent — once assets have arrived, they stay available for the rest of the session.
- Did NOT also gate on `deck-config` arrival. The asset cache and the deck-config message are independent — assets typically arrive just after deck-config. Once assets are in the cache, the deck renders correctly even if deck-config was the very first message.
- Existing `useRef` pattern was already correct (verified in audit task 10-04-01): `clientRef.current = client` is assigned synchronously before `client.connect()` opens the socket, and the `onStatus` callback reads `clientRef.current?.getAttempt()` safely on the next microtask. No fix needed.
- Used `data-testid="deck-loading"` on the loading div so tests can target it directly without coupling to text content.

## Notes for downstream

- All 25 existing frontend tests pass. The new test (`asset-timing-gate.test.tsx`) brings the total to 26 passing.
- The `ws-integration.test.tsx` placeholder file still fails (no test suite in it) — pre-existing, not introduced by this plan.
- The `assets` message handler still calls `setAsset(asset.id, asset.src)` for each asset (line 175-177) before flipping the gate. This ensures the cache is populated when the deck renders.
- If a future change adds a "show cache immediately on reconnect" optimization, the gate logic may need to consider whether the cache had assets from a prior session — currently it does NOT (the gate flips false on each fresh mount, which is correct for cold-start but means the loading skeleton shows briefly on every reconnect).