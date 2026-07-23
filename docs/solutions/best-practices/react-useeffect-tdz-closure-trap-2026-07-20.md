---
title: React useEffect TDZ trap — never reference a const from inside the constructor that creates it
date: 2026-07-20
category: best-practices
module: react
problem_type: best_practice
severity: high
tags: [react, useeffect, tdz, temporal-dead-zone, closure, useRef]
---

# React useEffect TDZ trap — never reference a const from inside the constructor that creates it

## Context

When initializing a side-effecty object in `useEffect`, the temptation is:

```tsx
useEffect(() => {
  const client = createWsClient({
    onStatus: (status) => {
      setAttempt(client.attemptCount())  // ❌ TDZ crash
    }
  })
}, [])
```

The error: `Cannot access 'client' before initialization`.

## Guidance

`createWsClient` typically fires its constructor synchronously (calling `void open()` → emitting the first `onStatus` event). That callback runs **before** the `const client = ...` assignment completes. The closure captures the binding, which is still in the temporal dead zone.

Three fixes, ordered by simplicity:

**A. Use `useRef` and assign before reading (recommended)**
```tsx
const clientRef = useRef<WsClient | null>(null)
useEffect(() => {
  clientRef.current = createWsClient({
    onStatus: (status) => {
      setAttempt(clientRef.current?.attemptCount() ?? 0)  // safe
    }
  })
}, [])
```

**B. Defer the constructor side-effect (constructor is pure)**
Change `createWsClient` to NOT auto-open; add explicit `client.connect()` after assignment.

**C. Use a `let` and assign first, then pass**
Mutates less idiomatic but works.

## Why This Matters

The crash is silent in tests (no test fixture calls `useEffect`). It only manifests in the browser at first mount. Without a try/catch in the effect, the error bubbles to the React error boundary and tears down the whole tree. Bonus damage: React 18 StrictMode runs effects twice in dev, so the first mount's TDZ crash happens before the second can stabilize.

The `useRef` pattern fixes both — the ref is assigned synchronously, the constructor's callback reads it on the next microtask (which always comes after the assignment completes).

## When to Apply

- Any `useEffect` that creates an object and immediately registers a callback on it
- The callback reads from the created object (state, count, config, methods)
- The constructor fires side-effects synchronously

## Examples

```tsx
// ❌ Crash: TDZ on first status event
const client = createWsClient({
  onStatus: (status) => setAttempt(client.attemptCount())
})

// ✅ Works: ref is set before any callback fires
clientRef.current = createWsClient({
  onStatus: (status) => setAttempt(clientRef.current?.attemptCount() ?? 0)
})

// ✅ Also works: defer the side-effect
const client = createWsClient({ onStatus: ... })  // pure factory
client.connect()                                  // explicit side-effect
```

## Related

- Vite `useSearchParams` and similar react-router hooks require a Router context (HashRouter or BrowserRouter) above the component that calls them — same "use the right wrapper" pattern.
- React 18 StrictMode runs effects twice in development; anything that depends on effect order (like "fire once and never again") needs a guard like a module-level `_initialized` flag or `useRef(false)`.
