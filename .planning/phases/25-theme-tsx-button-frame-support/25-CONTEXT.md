# Phase 25: Theme TSX Button Frame Support - Context

**Gathered:** 2026-05-26
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Let manifest-backed themes provide their runtime `buttonFrame` through `.tsx` authoring in addition to `.js`, so theme-owned frame rendering follows the same React/TSX authoring direction already established for browser-rendered buttons and already prepared in `packages/cli/src/themes/default`. This phase is about making the existing theme runtime entry contract honestly support `.ts` and `.tsx` entries for both built-in and custom themes. It does not add a second theme runtime entrypoint, broaden theme runtime responsibilities beyond `buttonFrame`, or introduce project-aware TypeScript behaviors such as path aliases or external workspace imports.

## Implementation Decisions

### Theme Runtime Entrypoint Contract
- `manifest.main` remains the only supported theme runtime entrypoint.
- The runtime entry may be authored as `.js`, `.jsx`, `.ts`, or `.tsx`.
- Phase 25 should not introduce a special-case `buttonFrame` file path or any parallel theme-runtime contract.

### Supported Theme Scope
- TSX theme-entry support applies equally to built-in themes and custom manifest-backed filesystem themes.
- The repo should use the same public contract it claims to support externally; this phase should not be "built-ins only" or "custom themes only".

### Export Contract
- Theme runtime export lookup should stay tolerant for this phase.
- The loader should continue accepting `buttonFrame`, `ButtonFrame`, `default.buttonFrame`, or `default.ButtonFrame`.
- Phase 25 should not tighten export naming into a compatibility-breaking migration; the change is about authoring format support, not API narrowing.

### Import Boundary Rules
- Theme runtime files may use normal relative imports within the theme package root.
- Escaping outside the theme package root is not part of the supported contract.
- Theme TSX support should stay self-contained and portable, matching the narrow honesty used for raw-source addon loading.

### Agent's Discretion
- Exact runtime import implementation details, as long as the public contract remains one `manifest.main` entry with `.js/.jsx/.ts/.tsx` support.
- Exact validation and error wording used when a theme runtime entry escapes the package root or fails to export a usable `buttonFrame`.
- Exact focused verification coverage, as long as it proves both built-in and custom manifest-backed themes can load a TSX-authored frame through the real theme resolver path.

## Specific Ideas

- `packages/cli/src/themes/default` should serve as the honest in-repo proof that themes can use `index.ts` plus `ButtonFrame.tsx`.
- This phase should feel like making the existing Phase 20 theme runtime contract truthful, not like inventing a broader theme plugin system.
- The implementation should preserve the current React component-style authoring ergonomics without forcing a stricter export shape just because TSX is now involved.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/phases/20-theme-packages-and-locked-time-layout/20-CONTEXT.md`
- `.planning/phases/21-theme-font-assets-for-browser-rendering/21-CONTEXT.md`
- `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-CONTEXT.md`
- `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/config/theme.test.ts`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/themes/default/manifest.yml`
- `packages/cli/src/themes/default/index.ts`
- `packages/cli/src/themes/default/ButtonFrame.tsx`
- `packages/cli/src/themes/light/index.js`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/config/theme.ts`: already resolves manifest-backed themes, imports the runtime entry, probes `.ts` and `.tsx` relative imports, and collects runtime file paths for watching/reload behavior.
- `packages/cli/src/config/theme.test.ts`: already verifies theme runtime loading, cache-busting reload behavior, stylesheet asset failures, and built-in theme resolution; it is the natural seam for Phase 25 regression coverage.
- `packages/cli/src/render/dom-host.tsx`: already consumes `button.theme?.buttonFrame ?? defaultButtonFrame`, so this phase should stay focused on theme resolution rather than rendering-contract redesign.
- `packages/cli/src/themes/default/manifest.yml`, `index.ts`, and `ButtonFrame.tsx`: already form the in-repo proof target for a TSX-authored theme frame.

### Established Patterns
- Phase 20 already locked theme packages around a manifest-backed runtime entry plus theme-owned `buttonFrame` behavior.
- Phase 23 already established a narrow, honest `tsx`-backed raw-source loading philosophy: explicit entrypoints, relative-import support, and no project-aware TypeScript magic.
- Phase 24 kept React as the mounted view layer while preserving Node-owned runtime boundaries; Phase 25 should follow that same minimal-contract discipline instead of broadening theme runtime scope.
- Existing planning decisions prefer one honest public contract rather than special internal-only behavior for shipped built-ins.

### Integration Points
- Keep `packages/cli/src/config/theme.ts` as the single place that defines which manifest runtime entry formats and relative imports are supported.
- Update `packages/cli/src/config/theme.test.ts` so built-in and custom theme tests prove TSX theme-entry loading through the actual resolver path.
- Use `packages/cli/src/themes/default` as the shipped proof theme for TSX authoring, while preserving compatibility for existing JS-authored themes such as `packages/cli/src/themes/light/index.js`.

## Deferred Ideas

- Adding a separate manifest field dedicated to `buttonFrame`.
- Broadening theme runtime exports beyond the existing `buttonFrame` contract.
- Supporting TypeScript path aliases, project references, or imports outside the theme package root.
- Tightening the export API to require only one exact export name in this phase.

---
*Phase: 25-theme-tsx-button-frame-support*
*Context gathered: 2026-05-26*
