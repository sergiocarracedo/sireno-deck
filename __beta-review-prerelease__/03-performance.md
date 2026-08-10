# 03 — Performance

No profiling was run. This report flags visible patterns that cause unnecessary work. Real numbers need a profiling pass (Chrome DevTools for frontend, `node --cpu-prof` for daemon).

---

## [P1] [P2] Frontend App.tsx re-renders every 250ms unconditionally

**Evidence:** `packages/cli/frontend/src/App.tsx:319-331`

```tsx
useEffect(() => {
  const timer = setInterval(() => {
    setDeck((prev) => {
      const now = Date.now()
      const remaining = prev.buttonErrors.filter(
        (e) => now - e.timestamp < 5000,
      )
      if (remaining.length === prev.buttonErrors.length) return prev
      return { ...prev, buttonErrors: remaining }
    })
  }, 250)
  return () => clearInterval(timer)
}, [])
```

The timer fires every 250ms regardless of whether button errors exist. When none exist, `remaining.length === prev.buttonErrors.length` saves a state update (good), but the interval callback still runs and `setDeck` still executes the updater function.

**Impact:** Wakes the CPU 4 times per second for a no-op. Minor battery impact on laptops. More importantly, if button errors are ever present, this triggers React reconciliation of the entire deck UI tree every 250ms until the errors expire.

**Effort:** Low — either clear the interval when `buttonErrors` is empty, or use a ref to track expiring timestamps and only set the interval when errors exist.

**Fix sketch:**

```tsx
useEffect(() => {
  if (deck.buttonErrors.length === 0) return
  const timer = setInterval(() => {
    /* ... */
  }, 250)
  return () => clearInterval(timer)
}, [deck.buttonErrors.length])
```

---

## [P2] [P3] Emulator App.tsx has same 250ms unconditional timer

**Evidence:** `packages/cli/emulator/src/App.tsx:201-206`

```tsx
useEffect(() => {
  const timer = setInterval(() => setNow(Date.now()), 250)
  return () => clearInterval(timer)
}, [])
```

Tracks "now" for a disconnected overlay. Runs every 250ms regardless of connection state. Should only run while disconnected.

**Impact:** Same as P1 — unnecessary CPU wake 4x/sec.

**Effort:** Low — gate on `connected === false`.

---

## [P3] [P3] Gesture detection uses JS timers instead of native events

**Evidence:** `packages/cli/frontend/src/components/Deck.tsx:142-218`

Double-tap detection uses `setTimeout` / `clearTimeout` with a 300ms window. Hold detection uses a 500ms timer. These are JS-level workarounds for what `dblclick` and `pointerdown`/`pointerup` with duration measurement can handle natively.

**Impact:** Creates a 300ms forced delay on every single tap (the tap doesn't fire until the double-tap timeout expires). This is felt as latency.

**Fix:** Use `"dblclick"` native event for double-tap, `pointerdown` timestamp diff for hold duration. Or — better — remove gesture detection entirely from the frontend (see architecture report [A2]).

---

## [P4] [P4] Lint gate OOMs

**Evidence:** `pnpm lint` did not complete — process ran out of memory. Beta review showed 4 lint errors; this review could not verify improvement or regression.

**Impact:** Cannot run lint as a CI gate. A lint regression could land unnoticed.

**Effort:** Unknown — investigate whether the OOM is caused by a specific file (e.g. `run.ts`, `runtime.test.ts`) or a general oxlint configuration issue. Splitting monoliths (see code-smells report) may also help lint complete.

---

## [P5] [P3] Unnecessary `buttonErrors` filtering on every bridge message

**Evidence:** `packages/cli/frontend/src/App.tsx` — the `setDeck` updater runs `.filter()` on `buttonErrors` array inside every state update triggered by WS messages. `Array.prototype.filter` creates a new array even when nothing is filtered.

**Impact:** Per-message garbage allocation. If `buttonErrors` is large (many buttons with errors), the filter allocates a full new array on every WS message.

**Fix sketch:** Only filter on the 250ms timer (and only when errors actually exist), not on every state update.
