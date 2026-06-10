---
title: Always spread existing state when updating Map<key, object> gesture/timer state
date: 2026-06-10
category: best-practices
module: deck/runtime
problem_type: best_practice
severity: medium
tags:
  - gesture-state
  - map-state
  - object-spread
  - concurrent-state
  - state-management
  - timer-management
applies_when:
  - Using `Map<string, object>` to track per-key state with multiple concurrent fields
  - Any pattern where multiple independent timers or state flags coexist on the same key
  - Updating partial state on a value stored in a Map without a reducer pattern
---

# Always spread existing state when updating Map<key, object> gesture/timer state

## Context

The deck runtime uses a `Map<string, ButtonGestureState>` to track per-button gesture state. Each entry can hold up to three fields: `holdTimer`, `holdTriggered`, and `pendingDblTapTimer`. Different code paths update different subsets of these fields — the hold path writes `holdTimer` and `holdTriggered`, while the double-tap path writes `pendingDblTapTimer`.

## Guidance

When updating an object value inside a `Map`, always spread the existing state before writing new fields. Otherwise, concurrent state fields are silently dropped:

```typescript
// ❌ BAD: replaces entire state, drops existing fields
gestureStates.set(stateKey, { holdTimer: undefined, holdTriggered: true })
gestureStates.set(stateKey, { pendingDblTapTimer: timer })

// ✅ GOOD: preserves existing fields from other code paths
gestureStates.set(stateKey, { ...gs, holdTimer, holdTriggered: false })
gestureStates.set(stateKey, { ...gs, pendingDblTapTimer: timer })
```

The same principle applies to any `Map<K, object>` where multiple concurrent properties are managed by different event handlers or callbacks — it's *not* a reducer store with atomic updates.

## Why This Matters

The old pattern (`set(key, { newField: val })`) looks benign but causes data loss when two independent events operate on the same key. For example:

1. User presses a button → `handlePress` sets `{ holdTimer, holdTriggered: false }` (drops any existing `pendingDblTapTimer`)
2. User releases → `handleRelease` checks `gs?.holdTimer` — works fine
3. User taps again → `onKeyEvent` checks `gs?.pendingDblTapTimer` — **it's gone**, the double-tap window was silently erased

The fix (`{ ...gs, holdTimer, holdTriggered: false }`) costs one extra property spread and prevents a subtle, hard-to-reproduce race condition.

## When to Apply

- Any time you use `map.set(key, partialObject)` — if the partial object might coexist with other state fields on the same key, spread first.
- In event-driven systems (keyboard, gesture, mouse, timer) where multiple callbacks can interleave on the same resource.
- When the Map value type has optional fields managed by independent code paths — that's a strong signal that { ...existing, field } is required.

## Examples

```typescript
// Before: hold path replaces state
gestureStates.set(stateKey, {
  holdTimer: undefined,
  holdTriggered: true,
}) // 💥 drops pendingDblTapTimer if it was set

// After: hold path preserves existing
const gs = gestureStates.get(stateKey)
gestureStates.set(stateKey, {
  ...gs,
  holdTimer: undefined,
  holdTriggered: true,
}) // ✅ pendingDblTapTimer survives
```

## Related

- [AGENTS.md Principle #2: Minimal Fix, Surgical Change](../../../../../AGENTS.md) — this fix is a one-line change that prevents a subtle data-loss bug
