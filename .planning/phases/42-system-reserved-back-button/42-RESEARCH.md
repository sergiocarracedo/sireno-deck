---
phase: 42
date: 2026-06-04
sources:
  - /works/opensource/sireno-deck/.planning/research/v1.4/ARCHITECTURE.md
  - /works/opensource/sireno-deck/.planning/research/v1.4/PITFALLS.md
  - /works/opensource/sireno-deck/.planning/phases/42-system-reserved-back-button/42-CONTEXT.md
---

# Phase 42 Research — System-Reserved Back Button

## Don't Hand-Roll

- **Don't build a custom deck layout validator.** Zod's `refine()` + the existing schema is sufficient. Reuse `validateConfig()` in `core/schemas.ts`.
- **Don't introduce a new hold-timer constant.** The 600ms threshold in `addon/api.ts:85` is the existing contract. Phase 34 (button action commands) already wired it.
- **Don't add a new addon-registered button for the back button.** The back button is universal, not author-defined. Inject at runtime instead.
- **Don't bypass `controller.goBack()` / `controller.restoreStack()`.** Those are the canonical navigation primitives. Reuse them.

## Common Pitfalls

- **Lock-session deck does not get a reserved slot.** If validation doesn't skip the lock deck, locked-mode navigation gets corrupted. [HIGH: CONTEXT.md]
- **Override flag must be honored at runtime, not just validation.** If validation accepts the override but the runtime still injects the system back button, the user gets a duplicated button. [HIGH]
- **Back button hold needs to clear any pending tap-triggered goBack.** Otherwise a long press could fire BOTH the tap and the hold. [MEDIUM]
- **Reserved slot index changes with `keyCount`.** On 8-key device, reserved is position 7; on 32-key, position 31. Validation must use `keyCount - 1` dynamically. [HIGH]
- **Theme override should be opt-in, not required.** A theme without the override asset must still work (falls back to core default). [HIGH: CONTEXT.md]
- **Stack-based goBack at the main deck is a no-op** — but the main deck shouldn't have the back button rendered at all. The home indicator is separate. [HIGH: CONTEXT.md]

## Existing Patterns in This Codebase

- **`defineMountedButton`** in `addon/api.ts` — the standard button authoring pattern. Not used here because the back button is core-injected, not addon-defined
- **`useButtonActionCommand`** in `addon/api.ts` — already supports tap/hold via the action-command contract
- **Deck layout is `keyCount`-driven** via `resolveDeckLayout(keyCount)` in `browser-renderer.ts`
- **Config validation is zod-based** in `core/schemas.ts`
- **Theme assets** declared in `theme.assets` manifest, served at runtime via `__sireno/assets?path=...` endpoint
- **Color tokens** in `tailwind.browser.generated.css` (`tone-foreground`, `tone-primary`)

## Recommended Approach

### File structure

- `packages/cli/src/core/schemas.ts` — add `allow_reserved_slot_override` field, add reserved-slot validation
- `packages/cli/src/core/schemas.test.ts` — add tests for new validation
- `packages/cli/src/deck/runtime.ts` — inject system back button or home indicator at reserved slot
- `packages/cli/src/deck/system-back-button.tsx` — new component for the back button visual + gestures
- `packages/cli/src/deck/system-back-button.test.tsx` — tests for tap, hold, and override paths

### Reserved slot computation

```ts
// In deck rendering code
function getReservedSlotPosition(keyCount: number): number {
  return keyCount - 1
}
```

### Validation in zod

```ts
// in core/schemas.ts
.refine(
  (config) => {
    if (config.allow_reserved_slot_override) return true
    for (const deck of Object.values(config.decks ?? {})) {
      if (deck.id === config.session?.locked_deck) continue // skip lock deck
      const reserved = (deck.buttons?.length ?? 0) > 0 ? deck.keyCount - 1 : -1
      if (deck.buttons?.some((b) => b.position === reserved)) {
        return false
      }
    }
    return true
  },
  { message: 'Button at reserved slot cannot be claimed by addons...' }
)
```

### Runtime injection

In `deck/runtime.ts`, after user-defined buttons are placed:
- If deck is the locked-session deck, skip injection
- If `allow_reserved_slot_override` is true for the deck, skip injection (addon owns the slot)
- Otherwise, inject the system back button (or home indicator for main deck) at position `keyCount - 1`

### Back button component

```tsx
// packages/cli/src/deck/system-back-button.tsx
export function SystemBackButton({ isMainDeck, onTap, onHold }: {
  isMainDeck: boolean
  onTap: () => void
  onHold: () => void
}) {
  if (isMainDeck) {
    return <ButtonSurface><span className="opacity-30">Home</span></ButtonSurface>
  }
  return (
    <ButtonSurface>
      <button onClick={onTap} onPointerDown={...} onPointerUp={...}>
        <Icon icon="chevron-left" />
        <Text>Back</Text>
      </button>
    </ButtonSurface>
  )
}
```

The hold gesture uses the existing 600ms threshold (reuse the pattern from `media-player-button.tsx`).

### Theme override

Themes can declare an `assets/system-back.svg` in their manifest. The runtime checks for this asset first; falls back to the default chevron + "Back" label if not present.

### Out of scope (deferred)

- Per-language back button labels
- Back button history visualization
- Custom back-button animations
- Configurable back button position
