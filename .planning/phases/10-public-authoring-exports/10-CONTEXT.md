# Phase 10: Public Authoring Exports - Context

**Gathered:** 2026-05-16
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 is a gap-closure phase that fixes the release-facing addon authoring surface. The goal is not to change the render/runtime contract, but to make the documented package entrypoints actually shippable by aligning public source facades, `package.json#exports`, build output, docs/example imports, and release-facing verification.

</domain>

<decisions>
## Implementation Decisions

### Public helper import shape
- Helper constructors should be imported from `sireno-deck-cli`.
- Do not expose helper constructors through repo-shaped internal module paths such as `sireno-deck-cli/render` unless planning discovers a hard blocker.
- `sireno-deck-cli/jsx` remains the explicit JSX opt-in subpath.

### Build strategy
- Add explicit public facade entrypoints for the documented package surface.
- Build output must intentionally emit the files promised by `packages/cli/package.json`.
- Do not solve this by redefining the package exports around incidental internal build layout.

### Verification shape
- Phase 10 should include:
  - a build verification step that checks the emitted files promised by `package.json#exports`
  - a release-facing authoring check that resolves imports against the built package surface rather than repo-local source paths
  - docs/example alignment so the shipped authoring guidance points at the real public imports

### Scope guardrails
- Treat this as a packaging/public-API phase, not a render-feature phase.
- Keep the existing non-DOM render contract intact.
- Do not widen helper semantics, JSX intrinsic elements, or runtime behavior unless required to make the documented public surface shippable.

### Agent's Discretion
- Exact facade file layout and file names.
- Exact release-facing verification mechanics.
- Exact docs/example edits once the public imports are finalized.

</decisions>

<specifics>
## Specific Ideas

- Add one narrow root entrypoint that re-exports the helper-based authoring API currently used from `src/render/reconciler.ts`.
- Keep `src/render/jsx.ts` as the explicit opt-in stub, but ensure the build emits it to the path promised by the package exports.
- Replace the Phase 9 example's repo-local helper import with the real public package import so the example stops cheating.
- Add one release-facing check that fails if docs/examples only work through `paths` mapping or direct source inclusion.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md`
- `.planning/phases/10-public-authoring-exports/10-DISCOVERY.md`
- `README.md`
- `packages/cli/package.json`
- `packages/cli/tsdown.config.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/jsx.ts`
- `packages/cli/src/render/jsx.d.ts`
- `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx`
- `packages/cli/fixtures/phase-9/tsconfig.jsx-authoring-example.json`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/package.json` already declares the intended public contract for the package root and `./jsx`.
- `packages/cli/src/render/reconciler.ts` already exports the helper constructors that docs describe as the non-JSX alternative.
- `packages/cli/src/render/jsx.ts` and `packages/cli/src/render/jsx.d.ts` already define the explicit JSX opt-in seam.
- The Phase 9 example already demonstrates both JSX and helper forms side by side, so it can be reused once its imports target the real public package surface.

### Established Patterns
- Public package contracts should be explicit and narrow.
- Verification should cover the real shipped surface, not only repo-local or source-only paths.
- The render contract remains non-DOM and should not be redesigned in this phase.

### Integration Points
- `packages/cli/tsdown.config.ts` must emit the public package surface promised by `packages/cli/package.json`.
- The root package export should expose the helper authoring API used by addon authors.
- `README.md` and the Phase 9 fixture/example should point at the same public imports that the build emits.
- Verification should prove both emitted artifact existence and authoring-import resolution from built output.

</code_context>

<deferred>
## Deferred Ideas

- Additional public render subpaths beyond the existing `sireno-deck-cli/jsx` entrypoint.
- Broader addon authoring API redesign or richer helper abstractions.
- Any changes to scheduler ownership, render behavior, or the shape of custom intrinsic elements.

</deferred>

---
*Phase: 10-public-authoring-exports*
*Context gathered: 2026-05-16*
