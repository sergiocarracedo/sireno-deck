# Phase 24: Mounted Addon Render Contract - Research

**Researched:** 2026-05-26
**Phase goal:** Replace the current instance-first addon button contract with a mounted active-deck React view contract backed by a core-owned addon store, while keeping Node as the owner of hardware semantics, navigation, polling, invalidation, and command execution.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| React-facing subscription to core-owned addon state | Use React's external-store contract (`useSyncExternalStore`) for any mounted component that reads runtime-owned addon store data | React's official guidance says `useSyncExternalStore` is the purpose-built API for integrating mutable stores outside React, with strict `subscribe` / `getSnapshot` semantics and cached immutable snapshots | [CITED: https://react.dev/reference/react/useSyncExternalStore] |
| Long-lived mounted active-deck tree in the browser page | Use one browser-side React root per deck page and update it with repeated `root.render(...)` calls instead of inventing a custom remount/update protocol | React officially supports updating an existing root by calling `root.render(...)` repeatedly, and preserves state when the tree structure matches. That fits the chosen "persistent mounted tree for the active deck" model | [CITED: https://react.dev/reference/react-dom/client/createRoot] |
| Non-interactive HTML generation for browser rendering | Keep `renderToStaticMarkup(...)` only for truly static output and do not stretch it into a fake mounted runtime | React explicitly documents `renderToStaticMarkup` as non-interactive HTML that cannot be hydrated and is not the right primitive for interactive or mounted trees | [CITED: https://react.dev/reference/react-dom/server/renderToStaticMarkup] |
| Addon-state bridge semantics | Keep the durable addon store core-owned and expose it to React as a narrow runtime seam, rather than moving durable state ownership into component-local React state | The phase context explicitly keeps Node authoritative for runtime behavior and session durability, while React is only the mounted active-deck view. Existing runtime ownership in `runtime.ts` already matches that boundary | [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`], [VERIFIED: `packages/cli/src/deck/runtime.ts`] |
| Migration of existing built-ins and fixtures | Plan an explicit compatibility adapter or coordinated contract switch instead of editing all built-ins/tests ad hoc | The current codebase still hard-depends on `createInstance(...)`, `defaultIntervalMs`, and direct instance handler invocation across runtime code, built-ins, and tests. Silent piecemeal migration will create drift and break verification | [VERIFIED: `packages/cli/src/addon/api.ts`], [VERIFIED: `packages/cli/src/deck/runtime.ts`], [VERIFIED: grep scan of `packages/cli/src/**/*.ts*` for `createInstance`, `defaultIntervalMs`, `onTap`, `onPress`, `onRelease`] |

## Common Pitfalls

### Treating the mounted tree as the new runtime owner
**What goes wrong:** React components start owning hardware semantics, navigation, or polling decisions instead of only rendering the active deck view. [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`]
**Why:** A mounted browser tree makes it tempting to let components register behavior directly, but the existing runtime already owns `onKeyEvent`, `handlePress`, `handleRelease`, `handleTap`, deck activation, and polling lifecycle. [VERIFIED: `packages/cli/src/deck/runtime.ts`]
**How to avoid:** Keep Node authoritative for event semantics and lifecycle. Treat React as the projection layer fed by runtime-managed props, methods, and store snapshots. [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`] [VERIFIED: `packages/cli/src/deck/runtime.ts`]

### Building an external store that violates React snapshot rules
**What goes wrong:** The mounted deck re-renders too often, loops, or resubscribes constantly because store snapshots are recreated every read or the subscribe function identity changes. [CITED: https://react.dev/reference/react/useSyncExternalStore]
**Why:** React requires `getSnapshot` to return the same value until the underlying store actually changes, and warns that passing a new `subscribe` function causes resubscription. [CITED: https://react.dev/reference/react/useSyncExternalStore]
**How to avoid:** Make the addon store expose stable `subscribe` functions and cached immutable snapshots keyed by addon/button scope. Do not compute fresh wrapper objects on every read unless the underlying state changed. [CITED: https://react.dev/reference/react/useSyncExternalStore] [ASSUMED]

### Assuming `renderToStaticMarkup` can be incrementally upgraded into a mounted runtime
**What goes wrong:** Planning tries to preserve the current `renderToStaticMarkup(...)` path and bolt on interactive behavior later, which leaves the phase half-mounted and conceptually split. [VERIFIED: `packages/cli/src/render/dom-host.tsx`]
**Why:** React documents `renderToStaticMarkup` as non-hydratable, non-interactive output. The current dom host serializes per-slot HTML strings, which is aligned with static rendering, not with a persistent mounted root. [CITED: https://react.dev/reference/react-dom/server/renderToStaticMarkup] [VERIFIED: `packages/cli/src/render/dom-host.tsx`]
**How to avoid:** Treat Phase 24 as a real renderer-host boundary change for the active deck path: mount a real root in the persistent browser page, and keep static markup only where output is intentionally static. [CITED: https://react.dev/reference/react-dom/client/createRoot] [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`]

### Underestimating migration blast radius
**What goes wrong:** The plan focuses only on API types and mounted rendering, but built-in buttons, loader fixtures, runtime tests, and addon examples still assume instance objects. [VERIFIED: `packages/cli/src/addon/api.ts`] [VERIFIED: grep scan of `packages/cli/src/**/*.ts*` for `createInstance`, `defaultIntervalMs`, `onTap`, `onPress`, `onRelease`]
**Why:** The current architecture document, runtime flow, and tests are still written around `createDeckRuntime()` instantiating button instances and React being a structural DSL for non-DOM rendering. [VERIFIED: `.planning/codebase/ARCHITECTURE.md`] [VERIFIED: `packages/cli/src/deck/runtime.ts`]
**How to avoid:** Make migration a first-class planning slice with explicit proof fixtures and focused tests. Either ship a compatibility adapter for old definitions or choose a clearly coordinated breaking switch and migrate the shipped built-ins in the same phase. [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`] [ASSUMED]

### Repeating the fixture-path mistakes during proof migration
**What goes wrong:** New Phase 24 fixtures pass in package-scoped runs but fail from the workspace root because proof assets or fixture configs are resolved from `process.cwd()`. [VERIFIED: `.planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md`]
**Why:** This repo already hit that exact trap in Phase 11 tests. Mounted-deck migration will add more fixtures and review assets, so the same mistake is easy to repeat. [VERIFIED: `.planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md`]
**How to avoid:** Resolve committed fixtures relative to the test file with `import.meta.url`, and treat fixture/test harness changes as part of the migration slice, not cleanup left for later. [VERIFIED: `.planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md`]

## Existing Patterns in This Codebase

- **Runtime-owned orchestration already exists and should stay central:** `packages/cli/src/deck/runtime.ts` owns instance caching, invalidation, deck activation/deactivation, lock transitions, polling, and key-event semantics. Phase 24 should refactor that seam, not bypass it. [VERIFIED: `packages/cli/src/deck/runtime.ts`]

- **The browser renderer already provides the right long-lived page seam:** `packages/cli/src/render/browser-renderer.ts` keeps one persistent page/context, updates HTML through `updateDeck(...)`, coalesces captures with `latestVersion` / `renderedVersion`, and clamps media recapture intervals. That is the natural host for an active mounted deck root. [VERIFIED: `packages/cli/src/render/browser-renderer.ts`]

- **The current DOM host is explicitly static:** `packages/cli/src/render/dom-host.tsx` uses `renderToStaticMarkup(...)`, wraps content with `buttonFrame`, and emits one HTML string per visible deck render. This is the exact seam that Phase 24 will replace or heavily adapt. [VERIFIED: `packages/cli/src/render/dom-host.tsx`]

- **Addon methods already expose the right imperative bridge:** `AddonButtonMethods` already carries `invalidate`, `navigateToDeck`, `goBack`, `runCommand`, and `getActiveDeckId`. Phase 24 can preserve these as runtime-owned methods passed into render props rather than inventing a second bridge API. [VERIFIED: `packages/cli/src/addon/api.ts`]

- **Polling remains runtime-owned today:** `startActiveDeckPolling(...)` derives interval from button config / instance defaults and calls `refresh?.()` before re-rendering. Even after the contract switch, the authoritative scheduling seam should remain in core rather than moving into React effects. [VERIFIED: `packages/cli/src/deck/runtime.ts`]

- **The architecture docs currently contradict the new direction:** `.planning/codebase/ARCHITECTURE.md` still names `Stateful button instances` and says rendering is intentionally not DOM-based. Plans must acknowledge that Phase 24 is deliberately changing those assumptions and should include doc updates as part of the migration. [VERIFIED: `.planning/codebase/ARCHITECTURE.md`] [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`]

- **Past render work warns against widening primitives casually:** the stored solution about bespoke live visuals recommends keeping renderer changes narrow and anchored to real review paths. That argues for changing the contract only where Phase 24 actually needs it, not opportunistically redesigning unrelated visual primitives. [VERIFIED: `.planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md`]

## Recommended Approach

Plan Phase 24 as an explicit four-part migration, not as a cosmetic authoring cleanup. [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`] Confidence: HIGH

First, define the new button contract and the migration boundary in `packages/cli/src/addon/api.ts` and `packages/cli/src/deck/runtime.ts`. The key decision is whether to ship a temporary compatibility adapter from old `createInstance(...)` definitions to the new `render(props)` contract or to do a coordinated breaking switch. Because the repo still has heavy built-in/test dependence on the instance contract, the safer planning default is an explicit compatibility seam first, then builtin/fixture migration immediately after. [VERIFIED: `packages/cli/src/addon/api.ts`] [VERIFIED: `packages/cli/src/deck/runtime.ts`] [VERIFIED: `.planning/codebase/ARCHITECTURE.md`] Confidence: HIGH

Second, add a core-owned addon store with button-local isolation and addon-wide coordinated access, and expose it to mounted React through stable external-store semantics. The runtime should continue to own lifetime, mutation entrypoints, and snapshot invalidation; React should only subscribe and render. `useSyncExternalStore` is the right React-side contract if a hook layer appears later, but the first rollout can stay props-first as the phase context requires. [CITED: https://react.dev/reference/react/useSyncExternalStore] [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`] Confidence: HIGH

Third, replace the active-deck static markup path with a real mounted root inside the persistent browser page. Keep one active deck tree mounted while that deck is active, update it via repeated root renders, and unmount it on deck exit/navigation. Do not push hardware semantics, polling, or command execution into the browser tree. The renderer should remain a rasterization/transport seam beneath the Node runtime even though the active deck becomes mounted React. [CITED: https://react.dev/reference/react-dom/client/createRoot] [CITED: https://react.dev/reference/react-dom/server/renderToStaticMarkup] [VERIFIED: `packages/cli/src/render/browser-renderer.ts`] [VERIFIED: `packages/cli/src/render/dom-host.tsx`] [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`] Confidence: HIGH

Fourth, make migration proof non-negotiable: move built-in buttons, test helpers, fixtures, and review assets onto the new seam in the same phase, and update architecture/planning docs so the repo no longer lies about instance-first rendering. Anchor all new fixtures to file-relative paths and keep at least one committed reviewable proof that exercises the mounted active-deck path end to end. [VERIFIED: `.planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md`] [VERIFIED: `.planning/codebase/ARCHITECTURE.md`] Confidence: HIGH

## Source Notes

- Official React docs were read directly for `useSyncExternalStore`, `createRoot`, and `renderToStaticMarkup`. [CITED: https://react.dev/reference/react/useSyncExternalStore] [CITED: https://react.dev/reference/react-dom/client/createRoot] [CITED: https://react.dev/reference/react-dom/server/renderToStaticMarkup]
- No separate `.planning/DECISIONS.md` exists in this repo, so active decisions were taken from `.planning/STATE.md`, `.planning/PROJECT.md`, and the Phase 24 context file. [VERIFIED: glob of `.planning/DECISIONS.md`] [VERIFIED: `.planning/STATE.md`] [VERIFIED: `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`]

---
*Phase: 24-mounted-addon-render-contract*
*Research gathered: 2026-05-26*
