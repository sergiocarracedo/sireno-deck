# Phase 13: Global Wrapper/Style Primitives - Context

**Gathered:** 2026-05-18
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 introduces globally reusable wrapper and style primitives that addons can register through validated public contracts, and that button render surfaces can reference by id. The phase should prove that registry-owned primitives work beyond addon-local rendering without turning the renderer into a broad CSS-like styling system or forcing every bespoke variant through a new abstraction layer.

</domain>

<decisions>
## Implementation Decisions

### Primitive Shape
- Phase 13 should model wrappers and styles as separate primitive types, not one combined visual primitive blob.
- Primitive definitions should live in the addon registry alongside other addon-owned definitions.
- Primitive ids should use global namespaced identifiers so reuse works across built-ins and addons without collisions.

### Reference Model
- Public render surfaces should reference primitives directly with narrow ids such as `wrapper_id` and `style_id`.
- The first rollout should support those references on `deck-button` and `deck-surface` button collections.
- Explicit button props such as `background`, `fit`, and variant-specific fields should remain authoritative even when a primitive id is present.

### Validation Boundary
- Config-authored primitive references must fail during config validation with the existing path-aware diagnostics.
- Addon-authored JSX/render references must fail before rendering, during render-contract collection or runtime validation, not after pixels are generated.
- If a referenced primitive comes from an addon that is not loaded, Phase 13 should hard-fail as an unknown reference.
- Phase 13 validation should check primitive existence and primitive kind (`wrapper_id` must point to a wrapper, `style_id` to a style), but should not attempt a full compatibility matrix yet.

### Reuse Scope
- The first consuming render path should be the shared/default button path.
- Bespoke variants should stay outside the first primitive rollout unless a low-risk reuse point is obvious during planning or research.
- The phase must prove reuse beyond one addon-local implementation by having addon-registered primitives consumed outside the defining addon's own local render code.
- The shipped result should include at least one bundled primitive so the contract has a real product-visible consumer, not only a fixture-only demo.

### Agent's Discretion
- Exact TypeScript/API names for primitive definition types and registry methods.
- Exact config field names that map onto `wrapper_id` and `style_id`.
- Exact bundled primitive chosen as the first real product-visible consumer.
- Exact test and fixture shape used to prove cross-boundary primitive reuse.

</decisions>

<specifics>
## Specific Ideas

- The current render contract already prefers narrow explicit props like `background`, `fit`, and `wrapper`, so Phase 13 should extend that style rather than introducing a nested styling DSL.
- The current addon registry only knows buttons, decks, and assets; primitive registration should feel like the next honest extension of that registry rather than a side channel.
- The first rollout should stay on the shared/default path that Phases 7 and 12 already hardened, instead of dragging `analog-clock` or `calendar-sheet` through a premature common abstraction.
- The minimal convincing proof is: one addon registers primitives, the shared/default path consumes them through public ids, and at least one bundled primitive uses the same contract in the shipped product surface.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/12-backgrounds-text-fitting/12-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/addon/registry.ts`
- `packages/cli/src/core/schemas.ts`
- `packages/cli/src/render/types.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/text-image.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/addon/registry.ts`: already owns global addon-backed registration for buttons, decks, and assets, so Phase 13 primitives should likely extend this registry rather than inventing a separate store.
- `packages/cli/src/addon/api.ts`: defines the public addon contract and is the natural seam for new wrapper/style primitive definition types.
- `packages/cli/src/render/types.ts`: already carries narrow explicit render props and is the public contract seam for adding `wrapper_id` and `style_id`.
- `packages/cli/src/render/reconciler.ts`: transports render props from JSX/helpers into runtime render descriptions and is the right place to preserve primitive ids from addon-authored render output.
- `packages/cli/src/render/text-image.ts`: still owns the shared/default visual path and is the safest first consumer for primitive-backed wrapper/style behavior.

### Established Patterns
- The codebase prefers explicit narrow contracts over broad style systems.
- Core-owned validation should reject invalid config or references before runtime behavior becomes ambiguous.
- Registry-backed extension is already the established pattern for addon-owned capabilities.
- Background and fit behavior were deliberately kept as explicit props in Phase 12, so primitives should compose with them rather than replacing them.

### Integration Points
- Primitive definition types will likely connect `packages/cli/src/addon/api.ts` and `packages/cli/src/addon/registry.ts`.
- Primitive ids will likely connect config validation in `packages/cli/src/core/schemas.ts`, public render props in `packages/cli/src/render/types.ts`, and render-description transport in `packages/cli/src/render/reconciler.ts`.
- The first product-visible primitive consumer will likely connect registry-loaded definitions to the shared/default rendering path in `packages/cli/src/render/text-image.ts`.

</code_context>

<deferred>
## Deferred Ideas

- Full CSS-like styling system.
- Theme alias indirection for primitive references.
- Forcing `deck-text` and every bespoke variant onto the first primitive rollout.
- Deep primitive compatibility matrices beyond existence and kind validation.

</deferred>

---
*Phase: 13-global-wrapper-style-primitives*
*Context gathered: 2026-05-18*
