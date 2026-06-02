# Phase 33: Add full tailwind support - Context

**Gathered:** 2026-06-02
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current handwritten Sireno utility-sheet approach on the browser-rendered UI surface with real Tailwind support so shared UI components, built-in addons, theme TSX, and local addon-authored TSX can rely on a truthful utility-first styling contract. Keep Sireno theme resolution authoritative and preserve only the Sireno-specific runtime CSS glue that Tailwind does not naturally own.

</domain>

<decisions>
## Implementation Decisions

### Tailwind Adoption Model
- Phase 33 means real Tailwind integration, not a larger Sireno-owned utility clone.
- Tailwind-generated CSS becomes the canonical browser utility surface for shipped UI.
- Shared UI and built-in browser-rendered surfaces should hard-cut onto canonical Tailwind utilities in this phase rather than preserving two long-lived authoring models.
- Real Tailwind tooling is in scope: config, content scanning, build integration, and truthful watch behavior.

### Theme Token Bridge
- Sireno theme resolution remains the source of truth for browser theming.
- Tailwind should expose the full resolved Sireno browser theme contract rather than a narrow subset.
- Shipped browser surfaces should keep color and typography styling constrained to Sireno-backed tokens instead of introducing an independent Tailwind theme system.

### Authoring and Scan Boundary
- First-class Tailwind authoring must cover core/shared UI, built-in addons, theme TSX, and local addon folders that participate in the workspace development loop.
- Dynamic utility needs must go through an explicit safelist-generation contract rather than runtime CSS compilation magic.
- Local addon/theme authors participate in the shared workspace Tailwind scanning and watch contract instead of relying on CLI-side auto-discovery of arbitrary source trees.

### Runtime Delivery Model
- Tailwind CSS should be delivered to the browser-rendered deck as a prebuilt stylesheet asset.
- Sireno-owned injected CSS should shrink to product-specific glue only: theme variable wiring, rich-text helpers, shrink-fit behavior, marquee behavior, and similar runtime-only rules.
- `pnpm cli:dev` must remain the truthful dev seam for Tailwind config/content changes.

### Agent's Discretion
- Exact Tailwind config/module layout and build wiring, as long as it supports the locked browser authoring surfaces and truthful dev loop.
- Exact safelist-generation mechanism for bounded dynamic utility needs.
- Exact split between prebuilt Tailwind CSS and the remaining Sireno-owned runtime CSS glue.
- Exact migration sequencing for removing generic utility definitions from the current handwritten stylesheet while keeping the cutover reviewable.

</decisions>

<specifics>
## Specific Ideas

- The current `packages/cli/src/render/theme-utilities.ts` utility sheet should stop being the primary generic utility source and become a narrower Sireno-specific CSS seam.
- `packages/cli/src/render/dom-host-deck-document.tsx` is the current browser document injection seam and will need to load the Tailwind-generated stylesheet truthfully.
- `packages/cli/src/themes/utils/cn.ts` already uses `tailwind-merge`, which fits the move to real Tailwind rather than a handwritten compatibility layer.
- The user wants honest support for a utility-first styling contract across shared components, themes, and addon-authored TSX, not just built-in-only cleanup.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`
- `.planning/phases/29-built-in-addon-tsx-hard-cut-tailwind-cleanup/29-CONTEXT.md`
- `packages/cli/src/render/theme-utilities.ts`
- `packages/cli/src/render/dom-host-deck-document.tsx`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/themes/utils/cn.ts`
- `packages/cli/src/ui/Text.tsx`
- `package.json`
- `packages/cli/package.json`

No external specs - requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/render/dom-host-deck-document.tsx` already owns browser document assembly and stylesheet injection, so it is the natural seam for loading Tailwind output.
- `packages/cli/src/themes/utils/cn.ts` already wraps `clsx` plus `tailwind-merge`, so no new class-composition helper is needed.
- Shared TSX UI components already exist under `packages/cli/src/ui/` and are the most obvious first consumers for the Tailwind hard cut.

### Established Patterns
- Phase 19 locked Sireno-owned resolved theme variables as the browser theming truth through `--sireno-*` tokens.
- Phases 28 and 29 explicitly stopped short of real Tailwind adoption; they kept a curated Tailwind-style utility layer and treated full Tailwind as deferred scope.
- The repo's truthful browser dev seam is `pnpm cli:dev`, so Tailwind integration must fit that workflow rather than introducing a separate pretend-authoring path.

### Integration Points
- Replace or narrow the generic utility output in `packages/cli/src/render/theme-utilities.ts`.
- Update the browser document/style delivery path in `packages/cli/src/render/dom-host-deck-document.tsx` and related render-host seams.
- Migrate shared UI and built-in browser TSX from handwritten utility assumptions to canonical Tailwind utilities.
- Add truthful Tailwind config/build/watch wiring through workspace and CLI package scripts.

</code_context>

<deferred>
## Deferred Ideas

- First-class Tailwind support for arbitrary installed npm addon package trees outside the workspace contract.
- Runtime auto-compilation of arbitrary dynamic utility strings.
- Replacing Sireno theme precedence or resolved token ownership with a Tailwind-owned theme system.

</deferred>

---
*Phase: 33-add-full-tailwind-support*
*Context gathered: 2026-06-02*
