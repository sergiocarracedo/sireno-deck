# Phase 62: Overlay autoShow — Context

**Gathered:** 2026-06-12
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a `autoShow: boolean` field to `DeckConfig` that lets a deck opt out of the auto-overlay behavior when its `process_names` match the active app. When `autoShow: false`:

1. The matching overlay is **not** auto-displayed on active-app change.
2. The system back button in the base deck's last position renders a 2-line variant: line 1 = back icon + "Tap", line 2 = overlay deck icon + "2xTap".
3. Double-tapping the system back button summons the matching overlay deck (the inverse of `dismissOverlay()`).

**Out of scope:** any other overlay behavior changes, new visual variants for the back button, deck icon field additions, settings-deck layout changes (Phase 63), chrome deck extensions (Phase 64).

</domain>

<decisions>
## Implementation Decisions

### Default + addon plumbing
- **`autoShow` defaults to `false`.** This is a **breaking change** for existing configs that rely on auto-show — they must add `autoShow: true` explicitly. Aligns with `REQUIREMENTS.md:16` (user-facing doc), overrides `ACTIVEAPP-07` spec text. Migration note will be added to CHANGELOG.
- **Addons can set `autoShow`.** Two-stage plumbing: field lives in `RawDeckSchema` (bootstrap) AND `AddonGeneratedDeck` (`addon/api.ts:36-42`), and is merged in both bootstrap→expanded passes (`schemas.ts:480-482` and `641-647`).

### Summon semantics
- **Dbltap summons the live-matching deck.** System-back `onDblTap` in `autoShow: false` mode re-calls `findActiveAppDeckFor(activeOwnerName)` at the moment of the dbltap. If no deck matches, no-op.
- **2-line variant tracks live match.** The "line 2" icon and name re-render when the matching deck changes (active app switches). The dispatcher resolves the matching deck from the live active-app state on every render.
- **`lastDismissedOverlayDeckId` becomes dead code in `autoShow: false` mode** but stays for the `autoShow: true` path. No removal.

### 2-line button layout
- **Bespoke layout** for the 2-line back button (clones `OverlayToggleButton`'s `flex flex-col` structure). `MainLabelSurface` is for single-icon surfaces; not extended. No shared `DualBadge` component — YAGNI.
- **Icon size 16, Text size xs, gap-0.5.** Tightest packing for a 72×72 key. Each row gets ~32px vertical.

### API surface + system-back test fix
- **`summonOverlay(deckId)` is a private helper** in `runtime.ts`, defined next to `dismissOverlay` at line 1479. Not exposed on the public runtime API (mirrors `dismissOverlay` privacy).
- **Phase 62 includes the fix for the 5 pre-existing failures in `system-back-injection.test.ts`.** The dispatcher needs `shouldInjectSystemBack` to be correct for the 2-line variant gating. Fix is part of the same plan; no separate quick task.

</decisions>

<specifics>
## Specific Ideas

- **Migration: `default false` is a breaking change.** Existing user configs that have `process_names` set will need `autoShow: true` added explicitly. Mention in CHANGELOG and in the verification doc.
- **Decision conflict resolved:** the 07 spec text said `default true`, `REQUIREMENTS.md:16` said `default false`. User picked `default false` to align with the user-facing doc. CONTEXT.md is the source of truth from now on.
- **`processNamesMatch` is a substring match** (`runtime.ts:174-192`), not exact. Users may write `process_names: ['code']` expecting exact match and find it matches "Code", "Visual Studio Code", "Code - OSS", "VSCode Helper". Not in scope to fix here, but worth a follow-up note.
- **Pre-existing collision check** at `runtime.ts:387-394` still warns at startup if multiple decks share a process name. Works fine with `autoShow: false` — no change needed.
- **The 2-line variant only renders on subdecks** (not main deck with settings, not main deck without settings). The dispatcher logic at `system-buttons.ts:27-57` already routes main-deck-with-settings to SYSTEM_SETTINGS, so the 2-line variant only ever appears in the `shouldInjectSystemBack(deck, ...)` branch.
- **No-op if no live match.** If the user dbltaps the back button when no deck matches, the dbltap is a no-op. No error, no toast. The 2-line variant itself disappears (reverts to normal back) when no match exists.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/deck/runtime.ts:174-192` — `processNamesMatch` (substring match, NOT exact)
- `packages/cli/src/deck/runtime.ts:383-395` — startup collision warning
- `packages/cli/src/deck/runtime.ts:437-451` — `overlayDeckId` state, `lastDismissedOverlayDeckId`, `getDisplayDeckId` precedence
- `packages/cli/src/deck/runtime.ts:1060-1124` — system-back `onTap`/`onDblTap`/`onHold` (the dispatcher for the new 2-line variant)
- `packages/cli/src/deck/runtime.ts:1446-1501` — `findActiveAppDeckFor`, `handleActiveAppChange`, `dismissOverlay`, `restoreLastDismissedOverlay`
- `packages/cli/src/deck/runtime.ts:1719-1751` — active-app monitor wiring
- `packages/cli/src/deck/system-buttons/SystemBackButton.tsx` — current single-icon back button (uses `MainLabelSurface` with `backIconOverride='undo2'` after Phase 61)
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx` — structural model for the 2-line layout (flex flex-col, icon + label rows, badge overlay)
- `packages/cli/src/deck/system-buttons/system-buttons.ts:27-57` — `getLastPositionSystemButton` dispatcher
- `packages/cli/src/deck/system-back-injection.ts:6-12` — `shouldInjectSystemBack` (the stub with 5 broken tests)
- `packages/cli/src/deck/__tests__/system-back-injection.test.ts` — 5 pre-existing failing assertions to fix
- `packages/cli/src/core/schemas.ts:131-139, 185-195, 480-482, 641-647` — DeckConfig, RawDeckSchema, two-stage merges
- `packages/cli/src/addon/api.ts:36-42` — `AddonGeneratedDeck` (needs the new field)
- `packages/cli/src/core/schemas.test.ts:101-168` — `process_names` test pattern (mirror for `autoShow`)
- `packages/cli/src/deck/__tests__/runtime.test.ts:4454-4927` — overlay lifecycle test block (extend with `autoShow: false` cases)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`OverlayToggleButton`** — `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx:30-50` — structural model for the 2-line layout (flex flex-col, icon + label rows, badge overlay). Clone structure, do not import.
- **`MainLabelSurface`** — `packages/cli/src/ui/surfaces/MainLabelSurface.tsx` — single-icon primitive. Not used for the 2-line variant but stays in `SystemBackButton` for the normal (non-pending-overlay) case.
- **`<Icon>`** — `packages/cli/src/ui/Icon.tsx` — lucide icon renderer. `<Icon name="undo2" size={16} />` for the 2-line back icon.
- **`<Text>`** — `packages/cli/src/ui/Text.tsx` — text renderer. Use `size="xs"` for the 2-line label.
- **`<ButtonSurface>`** — `packages/cli/src/addon/api.ts:281-297` — strips extra props. Place `data-sireno-overlay-toggle="true"` (or new `data-sireno-system-back="2-line-pending"`) on an inner element.

### Established Patterns
- **System buttons are stateless React components, not `defineMountedButton`.** Tap/dbltap/hold wired via inline object literals at the call site (`runtime.ts:1060-1124`).
- **Active-app provider is platform-abstracted** — `packages/cli/src/system/active-app/{linux,darwin,windows,wayland-gnome,unsupported,index}.ts`. 500ms poll on all platforms.
- **Two-stage schema merge** — `process_names` is set in bootstrap (`RawDeckSchema`) and merged in two passes (`schemas.ts:480-482, 641-647`). The addon path falls back to the expanded addon's generated deck if the bootstrap deck didn't set it.
- **`findActiveAppDeckFor` is first-match-wins** — no priority/specificity. Startup warns on collision.

### Integration Points
- **`handleActiveAppChange`** at `runtime.ts:1457-1477` is the single gate that flips `overlayDeckId`. Adding the `autoShow: false` check happens here.
- **`getLastPositionSystemButton`** at `system-buttons.ts:27-57` is the dispatcher. The 2-line variant is a new branch in the `shouldInjectSystemBack` path, gated on `autoShow: false` + live match.
- **System back `onDblTap`** at `runtime.ts:1115-1121` gains a new branch: if 2-line variant is active, call `summonOverlay(matchingDeckId)`. The existing two branches (dismiss overlay, restore last-dismissed) stay intact.
- **`system-back-injection.ts`** needs to know the 2-line variant trigger. The 5 broken tests assert on richer logic (allow_reserved_slot_override, user-button-claims-slot, locked-session-on-subdeck, main-deck-injection) that the stub doesn't implement.

</code_context>

<deferred>
## Deferred Ideas

- **`processNamesMatch` exact match** — the substring match is a UX footgun. Out of scope for Phase 62; flag for a future improvement phase.
- **Add deck-level `icon` field** — the 2-line variant's "line 2" icon currently uses the `OverlayToggleButton`-style emoji-extraction heuristic. A proper `icon?: string` field on `DeckConfig` would be cleaner. Out of scope; flag for a future phase.
- **Shared `DualBadge` or `OverlayIcon` component** between `OverlayToggleButton` (Phase 61) and the new 2-line back button. YAGNI now, flag for cleanup.
- **Public `summonOverlay` runtime method** — currently private. If addons need to summon overlays in the future, expose it. Not needed for Phase 62.
- **Animation/transition on overlay toggle** — out of scope.
- **Per-platform 2-line variant sizing** — current decision is global (icon 16, text xs, gap-0.5). Could be platform-specific if a device has different key sizes. Not needed.

</deferred>

---
*Phase: 62-overlay-autoshow*
*Context gathered: 2026-06-12*
