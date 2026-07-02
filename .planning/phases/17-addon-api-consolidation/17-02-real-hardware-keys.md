# Plan 17-02 — Real Hardware Keys (SDK Key Events)

## Gap

`device/stream-deck.ts:16-24` — `StreamDeckDevice` has no key-event subscription. The `@elgato-stream-deck/node` SDK handle (`openStreamDeck()`) is an `EventEmitter` that emits `"down"` and `"up"` events, but the wrapper discards them. Real hardware key presses never reach `runtime.dispatchGesture`.

## Two-Commit Structure

### 17-02a — Research (no code change, produces RESEARCH.md)

Read `node_modules/@elgato-stream-deck/node/dist/` (or `types/` if bundled) to confirm:

1. The `handle` returned by `openStreamDeck(path, opts)` is an `EventEmitter`.
2. It emits `"down"` and `"up"` events.
3. Exact payload shape: `{ type: "down" | "up"; keyIndex: number; timestamp: number }` or similar.
4. Does the SDK expose a way to get `keyIndex` from the raw event? Does the `CONTROLS` array map by index?
5. Is there a `removeListener` / cleanup method?

Write findings to `17-02-RESEARCH.md` in the phase dir.

### 17-02b — Implementation

#### `hardware/key-listener.ts` (new file)

```ts
export interface KeyEvent {
  readonly type: "down" | "up"
  readonly keyIndex: number
  readonly timestamp: number
}

export type KeyEventHandler = (event: KeyEvent) => void

export interface KeyListener {
  readonly onKeyEvent: (handler: KeyEventHandler) => () => void
}
```

Wraps SDK event subscription. Returns a cleanup function (unsubscribes the handler).

#### `device/stream-deck.ts`

Extend `StreamDeckDevice` interface:

```ts
export interface StreamDeckDevice {
  // ...existing 5 methods...
  /** Subscribe to hardware key events. Returns an unsubscribe function. */
  onKeyEvent(handler: KeyEventHandler): () => void
}
```

Implementation:

```ts
const handle = await openStreamDeck(targetInfo.path, {})

return {
  // ...existing 4 methods...
  onKeyEvent(handler) {
    const listener = (e: unknown) => {
      // parse SDK event shape (confirmed in 17-02a)
      handler({ type: e.type, keyIndex: e.keyIndex, timestamp: Date.now() })
    }
    handle.on("down", listener)
    handle.on("up", listener)
    return () => {
      handle.removeListener("down", listener)
      handle.removeListener("up", listener)
    }
  },
}
```

#### `cli/commands/real-mode.ts`

Wire `device.onKeyEvent` → `runtime.dispatchGesture`:

```ts
// in runRealMode(...) after device is connected:
const unsubscribe = device.onKeyEvent((event) => {
  if (event.type === "down") {
    runtime.dispatchGesture(/* keyIndex → buttonId */, "tap")
  }
})
// track unsubscribe for cleanup
```

**Note:** `runtime.dispatchGesture` takes `buttonId: string`, but key events provide `keyIndex: number`. Need to look up the button ID for the current deck at that index. This is the same mapping already used by `emulator-mode.ts:460-486`.

## Files

### Commit A (research)
- `.planning/phases/17-addon-api-consolidation/17-02-RESEARCH.md` — findings from SDK type inspection

### Commit B (implementation)
- `packages/cli/src/hardware/key-listener.ts` (new)
- `packages/cli/src/device/stream-deck.ts` — extend `StreamDeckDevice` interface + implementation
- `packages/cli/src/cli/commands/real-mode.ts` — wire events into dispatchGesture

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

## Risk

Medium — depends on 17-02a confirming the SDK event API. If the SDK doesn't expose `"down"`/`"up"` events, this plan pivots to a polling approach or direct property access.
