# Phase 21: Theme Font Assets For Browser Rendering - Context

**Gathered:** 2026-05-24
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Ensure browser-rendered typography can use theme-packaged font assets through the existing theme stylesheet path so themes no longer depend only on host-installed fonts or broken relative font references. This phase hardens theme font delivery for the browser-rendered surface; it does not add a broader theme DSL, font-management subsystem, or a local browser deck emulator.

## Implementation Decisions

### Theme Font Declaration
- Theme-packaged fonts remain CSS-native through `@font-face` in theme stylesheets; this phase should not introduce a new manifest font DSL.
- The existing theme stylesheet asset path remains the source of truth for browser font delivery.
- Theme typography roles continue naming families through `typography.main_text`, `typography.auxiliary_text`, and `typography.monospace`.

### Validation and Failure Boundary
- Theme loading should hard-fail for missing stylesheet files and broken CSS `url(...)` references used by theme font assets.
- Theme loading should not validate that a `typography.*.font_family` value is backed by a matching `@font-face` declaration.
- A theme may still load even when it names custom typography families without shipping stylesheet assets that define them.

### Browser Fallback Behavior
- If the browser cannot resolve a theme typography family from shipped `@font-face` rules, rendering should fall back silently through normal browser/system font resolution.
- Core should not append its own generic or curated fallback stack to theme-authored typography families.
- The emitted browser typography CSS should stay aligned with the theme-authored family names rather than rewriting them into a stronger fallback contract.

### Verification Surface
- Phase proof should include focused automated coverage plus one committed browser review fixture.
- The committed fixture should visibly depend on a packaged custom font so the proof shows real browser-rendered typography impact rather than only CSS injection text.
- Manual device UAT is not required by the discussion unless planning later uncovers another browser-path gap similar to Phase 20.

### Agent's Discretion
- Exact CSS parsing or loader implementation details, as long as the chosen approach preserves the CSS-first authoring contract and existing path-aware failure style for missing assets.
- Exact fixture theme/content shape used to prove visibly different packaged typography on the browser path.
- Whether the focused proof lives mainly in `packages/cli/src/config/theme.test.ts`, `packages/cli/src/render/dom-host.test.tsx`, or adjacent browser-renderer coverage, as long as the committed fixture remains reviewable.

## Specific Ideas

- Keep using ordinary theme CSS `@font-face` rules instead of mirroring them into manifest metadata.
- The browser fixture should use typography that is obviously wrong or materially different when the packaged font is absent, so the proof is honest.
- This phase should strengthen the already-shipped browser theme asset seam rather than inventing another parallel asset declaration mechanism.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/19-tailwind-button-theming-css-vars/19-CONTEXT.md`
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-CONTEXT.md`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/config/theme.test.ts`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/dom-host.test.tsx`
- `packages/cli/src/render/theme-utilities.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/config/theme.ts`: already loads theme stylesheets, rewrites relative CSS `url(...)` references, and hard-fails when referenced assets are missing.
- `packages/cli/src/config/theme.test.ts`: already proves missing theme CSS font asset paths fail loudly during theme loading.
- `packages/cli/src/render/dom-host.tsx`: injects the resolved theme stylesheet text into the browser deck document.
- `packages/cli/src/render/dom-host.test.tsx`: already checks that theme asset CSS and rewritten `file://` URLs appear in the browser HTML shell.
- `packages/cli/src/render/theme-utilities.ts`: exports the typography role CSS variables and utility classes (`font-main`, `font-aux`, `font-mono`) that ultimately consume the theme family names.

### Established Patterns
- Theme/browser asset delivery already uses ordinary CSS plus loader-side URL rewriting rather than a custom styling DSL.
- Path-aware loader failures are already the standard for broken theme assets and should remain the boundary for this phase.
- Browser-rendered typography already flows through the resolved theme tokens and utility classes, so this phase should harden that existing path instead of adding a new rendering seam.

### Integration Points
- Theme package loading and stylesheet URL rewriting in `packages/cli/src/config/theme.ts`
- Theme font asset regression coverage in `packages/cli/src/config/theme.test.ts`
- Browser document stylesheet injection in `packages/cli/src/render/dom-host.tsx`
- Browser host verification in `packages/cli/src/render/dom-host.test.tsx`
- Typography utility emission in `packages/cli/src/render/theme-utilities.ts`

## Deferred Ideas

- Local browser deck emulation for users and developers, including device-size emulation, mouse interaction, and hardware-free preview/debugging.
- Any browser-executed deck experience intended as a Stream Deck substitute rather than a development/demo surface.
- A manifest-level font DSL or broader font-management subsystem.

---
*Phase: 21-theme-font-assets-for-browser-rendering*
*Context gathered: 2026-05-24*
