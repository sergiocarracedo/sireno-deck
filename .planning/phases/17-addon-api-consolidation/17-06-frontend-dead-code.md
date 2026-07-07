# Plan 17-06 — Frontend Dead Code: `button-action` Handler

## Gap

`frontend/src/App.tsx:116-128` handles `message.type === 'button-action'` from the WS bridge:

```tsx
if (message.type === 'button-action') {
  const buttonId = String(message.position)
  setGestures((prev) => {
    const next = { ...prev }
    if (gesture === 'hold') {
      next[buttonId] = { pressed: true, isTapping: false, isHolding: true, holdProgress: 1 }
    } else {
      next[buttonId] = { pressed: true, isTapping: true, isHolding: false, holdProgress: 0 }
    }
    return next
  })
}
```

The CLI **never sends `button-action` server→client**. The only sender is the emulator frontend (`emulator/src/App.tsx:120-127`), which sends client→server. So the `gestures` state in the frontend app is always `EMPTY_GESTURE`.

The `gestures` prop passed to `Deck.tsx` (`gestureMap`) is built from this empty state:
```tsx
const gestureMap: ButtonGestureMap = Object.fromEntries(
  deck.buttons.map((b) => [b.id, gestures[b.id] ?? EMPTY_GESTURE]),
)
```

This means `Deck.tsx` also always receives `EMPTY_GESTURE` for every button.

## Changes

### `frontend/src/App.tsx`

**Delete** the `button-action` handler block (lines 116-128).
**Delete** the `gestures` state and `EMPTY_GESTURE` constant (lines 29-34, 89).
**Delete** the `gestureMap` derivation (lines 144-146).
**Delete** the `gestures` prop from `Deck` component usage (line 152):
```tsx
// Before:
<Deck deck={deck} gestures={gestureMap} />
// After:
<Deck deck={deck} />
```

### `frontend/src/components/Deck.tsx`

Check if `gestures` prop is used anywhere. If it's only passed in as a prop but not consumed, remove it from the interface:
```tsx
// Before:
interface DeckProps { deck: DeckState; gestures: ButtonGestureMap }

// After:
interface DeckProps { deck: DeckState }
```

If `gestures` is actually used for visual feedback (hold progress, tap indicator), then the dead code is in the **server** (it should send `button-action` to the frontend), not here. Investigate before deleting.

**Decision:** Based on the report, `gestures` is only populated from the server-side `button-action` message which never arrives. So `gestures` in the frontend is always `EMPTY_GESTURE`. Delete the prop.

### Delete unused imports

If `gestureMap`/`gestures` are removed, check for unused imports: `ButtonGestureMap`, `ButtonGestureState`.

## Files

- `packages/cli/frontend/src/App.tsx`
- `packages/cli/frontend/src/components/Deck.tsx`

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

Note: The `frontend` package has no tests in the current suite. Typecheck and lint only.

## Risk

Low — confirmed dead code path (server never sends `button-action` to frontend).
