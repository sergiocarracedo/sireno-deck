# Phase 24: Mounted Addon Render Contract - Context

**Gathered:** 2026-05-26
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Replace the current instance-first addon button runtime contract with a mounted active-deck React view contract backed by a core-owned addon store, while keeping Node as the owner of hardware events, navigation, polling, lock-mode transitions, invalidation, and command execution. This phase broadens the original roadmap idea well beyond dropping the `createInstance(...).render()` wrapper: it introduces definition-level runtime handlers, a persistent mounted React tree for the active deck only, explicit props-driven store access, and addon-scoped state coordination that survives deck changes for one runtime session. It does not add persistence across daemon restarts, preserve inactive deck component trees across navigation, or move hardware/input ownership into React.

## Implementation Decisions

### Runtime Ownership Boundary
- Node remains the real runtime owner for hardware key events, press/release/tap semantics, navigation, lock/unlock transitions, polling, invalidation, and command execution.
- React becomes the mounted active-deck view layer, not the owner of hardware semantics or durable runtime state.
- Definition-level runtime handlers such as `onTap`, `onPress`, and `onRelease` should remain outside React component lifecycle registration.

### Mounted Active-Deck Model
- The active deck should exist as a persistent mounted React tree while that deck remains active.
- Inactive decks should unmount on navigation; component-local React state is therefore non-durable across deck changes.
- `buttonFrame` should continue to wrap button render output unless a button explicitly opts into full-surface rendering.

### Addon Store Contract
- Core should provide both button-local state access and addon-wide coordinated access to addon button state.
- Button-local state is the primary isolation boundary; addon-wide access exists for cross-button coordination rather than as an unstructured global bag.
- Store lifetime is one runtime session only: state survives navigation and ordinary deck changes, but resets when runtime state is rebuilt.
- Transient input state such as `pressed` and `frameState` should remain runtime-driven render props rather than being mirrored into the durable store.

### Render and Handler API Shape
- Button definitions should move from `createInstance(...) => { render, onTap, ... }` toward a direct definition contract with `render(props)` plus optional definition-level runtime handlers.
- The mounted render entry should use explicit props for config, button metadata, theme, host context, runtime methods, transient runtime state, and store snapshots/mutators.
- The first rollout should stay props-first rather than introducing React hook/context magic for store access.
- The render entry should support ordinary TSX/JSX authoring while remaining a runtime-controlled mount point inside the deck shell.

### Migration and Planning Implications
- This is no longer a narrow authoring cleanup; planning must treat it as an addon/runtime contract migration phase.
- Existing built-in buttons, shipped fixtures, tests, and addon authoring docs currently assume the instance-first contract and will need either a compatibility adapter or a coordinated breaking-contract migration.
- Planning should explicitly account for runtime store infrastructure, active-deck mounted rendering integration, and migration proof coverage together.

### Agent's Discretion
- Exact TypeScript names and generic parameter shape for render/runtime props and the new button definition type.
- Exact storage internals for button-local and addon-wide coordinated state.
- Whether the migration path uses a temporary compatibility adapter or an explicit coordinated contract switch, as long as planning makes that choice visible and testable.

## Specific Ideas

- The addon store should feel like a runtime-owned session state seam, not like React context pretending to be persistence.
- Mounted active-deck React should improve author ergonomics, but not erase the existing Node-owned runtime boundaries that already handle hardware honestly.
- Addon-wide state access should help with coordinated behaviors like selection, paging, or shared external status without encouraging accidental coupling between unrelated buttons.
- The phase should make regular React button authoring more natural while still keeping renderer and runtime responsibilities explicit.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-CONTEXT.md`
- `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/browser-renderer.ts`
- `packages/cli/src/render/scheduler.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/addon/api.ts`: defines the current instance-first addon button contract through `createInstance(...)` and the shared `ButtonSurface` helper plus runtime methods already passed into button instances.
- `packages/cli/src/deck/runtime.ts`: owns instance caching, runtime event dispatch, deck activation/deactivation, polling lifecycle, session-lock transitions, and render invalidation; this is the core seam that must stay authoritative for runtime behavior.
- `packages/cli/src/render/dom-host.tsx`: currently renders button content through `renderToStaticMarkup(...)`, wraps non-full-surface content in `buttonFrame`, and treats React as a render-description layer rather than a persistent app runtime.
- `packages/cli/src/render/browser-renderer.ts`: already owns the persistent browser page, screenshot capture, sample-interval handling, and per-key cropping, so planning must be explicit about how an active mounted deck tree fits into that renderer boundary.

### Established Patterns
- Runtime owns behavior while renderer/transport remain subordinate seams beneath it.
- Button instance state currently survives ordinary deck navigation only because runtime caches instances by `deckId:keyIndex`, not because React owns state.
- The browser path already has the heaviest work in page render/screenshot/cropping, so Phase 24 should be justified as an authoring/runtime-contract change rather than a pure performance optimization.
- Existing phases prefer explicit lifecycle ownership and honest failure boundaries over hidden magic.

### Integration Points
- Replace or adapt the current `AddonButtonDefinition.createInstance(...)` contract in `packages/cli/src/addon/api.ts`.
- Refactor `packages/cli/src/deck/runtime.ts` so runtime handlers and addon store lifetime remain in Node while render data flows into a mounted active-deck tree.
- Update `packages/cli/src/render/dom-host.tsx` and related browser-renderer seams to host a persistent mounted active-deck React tree rather than only serializing static per-render markup.
- Migrate built-in buttons and proof fixtures to the new render/handler/store contract or introduce an explicit compatibility layer during transition.

## Deferred Ideas

- Persisting addon store state across config reloads or daemon restarts.
- Preserving inactive deck React trees across navigation.
- Hook-based Sireno context APIs layered on top of the explicit props contract.
- Moving hardware event registration or action semantics into React components.

---
*Phase: 24-mounted-addon-render-contract*
*Context gathered: 2026-05-26*
