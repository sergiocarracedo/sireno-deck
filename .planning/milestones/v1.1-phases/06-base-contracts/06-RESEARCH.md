# Phase 6: Base Contracts — Research

**Researched:** 2026-05-14
**Phase goal:** Keep the existing addon/runtime/reconciler architecture intact while fixing date-time live refresh and making custom deck elements first-class in TypeScript authoring.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|---------------------|-----|------------|
| Typed JSX for custom deck elements | Add a dedicated TypeScript-only JSX types entrypoint that declares `JSX.IntrinsicElements` for `deck-button`, `deck-text`, and `deck-surface` | TypeScript already typechecks intrinsic JSX tags through `JSX.IntrinsicElements`; this fits the user's explicit opt-in decision without changing runtime behavior | [CITED: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/tsxElementResolution1.errors.txt] [CITED: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/jsxElementType.errors.txt] |
| Live date/time formatting | Use `Intl.DateTimeFormat` rather than hand-rolled string templates for digital date/time output | Locale-aware formatting and `formatToParts()` already cover custom date/time composition safely | [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat] |
| Polling implementation | Reuse the existing core polling scheduler and runtime refresh hooks instead of addon-local timers | Phase context explicitly keeps scheduling core-owned, and the current runtime already centralizes refresh plus render sequencing | [VERIFIED: packages/cli/src/deck/runtime.ts] [VERIFIED: packages/cli/src/render/scheduler.ts] |
| Config enforcement for refresh cadence | Validate `interval_ms` in schema instead of silently coercing or clamping at runtime | Timer APIs tolerate invalid/coerced values poorly; explicit validation preserves truthful config and avoids hidden hot loops | [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout] [VERIFIED: packages/cli/src/core/schemas.ts] |

## Common Pitfalls

### Ambient JSX types leaking across the whole repo
**What goes wrong:** Declaring global intrinsic JSX types unconditionally makes Stream Deck-specific tags appear valid everywhere in the repo, including code that should never know about addon rendering.  
**Why:** TypeScript resolves JSX element names through `JSX.IntrinsicElements`, and ambient declarations are global by default.  
**How to avoid:** Keep the JSX declarations behind a dedicated opt-in types entrypoint for addon authors and built-in addons, matching the user decision for explicit opt-in. [CITED: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/tsxElementResolution1.errors.txt]

### Treating `interval_ms` as a harmless small-number knob
**What goes wrong:** Very small intervals create much more aggressive real polling than the config suggests.  
**Why:** The current scheduler computes `intervalMs + baseOffset + jitter`, and jitter defaults to `75ms`; with a `100ms` interval, the first task can run near `25ms`. The scheduler also re-arms after each run completes.  
**How to avoid:** Enforce the user-chosen `500ms` minimum in validation for this phase and keep any sub-500ms redesign out of scope. [VERIFIED: packages/cli/src/render/scheduler.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

### Adding JSX support by widening the render contract
**What goes wrong:** A typing-only ergonomics change turns into an API redesign, which then drags Phase 2 text/wrapper decisions into Phase 6.  
**Why:** The current reconciler already has a narrow set of custom props and helper constructors; expanding props now would lock premature renderer semantics.  
**How to avoid:** Type exactly the current intrinsic elements and props, and defer new props to later phases that explicitly own those decisions. [VERIFIED: packages/cli/src/render/reconciler.ts] [VERIFIED: .planning/phases/06-base-contracts/06-CONTEXT.md]

### Digital date/time relying on incidental re-renders
**What goes wrong:** The built-in `date-time` button renders `new Date()` but never updates unless something else causes a re-render.  
**Why:** The addon definition currently lacks `defaultIntervalMs`, and the runtime only starts polling from scheduler-owned cadence data.  
**How to avoid:** Give the button a default cadence through the addon definition and make runtime polling honor validated `interval_ms` overrides. [VERIFIED: builtin-addons/date-time/src/index.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]

## Existing Patterns in This Codebase

- **Custom intrinsic render helpers:** `packages/cli/src/render/reconciler.ts` already exports `createDeckButtonElement`, `createDeckTextElement`, and `createDeckSurfaceElement`; typed JSX should map directly to these existing props and node names. [VERIFIED: packages/cli/src/render/reconciler.ts]
- **Runtime-owned refresh loop:** `packages/cli/src/deck/runtime.ts` owns instance creation, `refresh()` invocation, and subsequent re-rendering; this is the right place to reconcile `defaultIntervalMs` with `interval_ms`. [VERIFIED: packages/cli/src/deck/runtime.ts]
- **Config metadata preservation:** `packages/cli/src/core/schemas.ts` already validates config with path-aware `ConfigValidationError`; interval validation should reuse that path-aware failure model. [VERIFIED: packages/cli/src/core/schemas.ts]
- **Render-contract tests already exist:** `packages/cli/src/render/reconciler.test.ts` asserts current render descriptions for the custom elements, so JSX typing work can add type-level and behavior-level tests without inventing a new harness. [VERIFIED: packages/cli/src/render/reconciler.test.ts]
- **Theme schema is still narrow:** `packages/cli/src/config/theme.ts` only understands color tokens today, which reinforces that typography expansion belongs to Phase 7 rather than this phase. [VERIFIED: packages/cli/src/config/theme.ts]

## Recommended Approach

Phase 6 should stay surgical. Add a dedicated TypeScript-only JSX types entrypoint that addon projects explicitly opt into, and type only the three existing intrinsic elements with their current prop shapes. [CITED: https://github.com/microsoft/typescript/blob/main/tests/baselines/reference/jsxElementType.errors.txt] [VERIFIED: packages/cli/src/render/reconciler.ts]

In parallel, fix the live digital date/time path by making the runtime choose scheduler cadence from validated `interval_ms` when present, otherwise from `defaultIntervalMs`, and give the built-in `date-time` definition an explicit default interval. Enforce the agreed `500ms` minimum in schema validation rather than burying that policy in scheduler behavior. Format the displayed values through `Intl.DateTimeFormat` so the button stops baking locale assumptions into ad hoc string building. [CITED: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat] [VERIFIED: packages/cli/src/core/schemas.ts] [VERIFIED: packages/cli/src/deck/runtime.ts] [VERIFIED: builtin-addons/date-time/src/index.ts]
