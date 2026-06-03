# Phase 19: Tailwind Button Theming via Theme CSS Variables - Context

**Gathered:** 2026-05-23
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Connect the browser-rendered button styling layer to the active Sireno theme through global CSS variables and a core-owned utility/theme mapping so browser-authored buttons can use classes such as `text-primary` while resolving against the real Sireno theme. This phase is about theme-token wiring for the browser DOM surface, not a general-purpose styling framework expansion.

## Implementation Decisions

### Theme Variable Surface
- The first rollout should expose the full current resolved theme contract as global CSS variables on the browser deck surface, not a narrow subset.
- CSS variables should use a Sireno-namespaced contract such as `--sireno-color-primary` rather than framework-shaped generic names.
- The exported variable surface should include the current color tokens and typography roles already owned by the theme loader.

### Tailwind Utility Contract
- Core should ship the canonical utility/theme mapping for the browser-rendered surface instead of leaving each addon to wire Tailwind classes independently.
- The first utility rollout should stay narrow and theme-focused: token-backed color and typography utilities only, not a broad Tailwind layout/spacing clone.
- Classes like `text-primary` must resolve against the active Sireno theme through the core-owned CSS variable layer.

### Override Boundaries
- Existing explicit runtime and config overrides remain authoritative.
- The CSS-variable layer should reflect already-resolved runtime/theme values instead of introducing a second precedence system.
- This phase must preserve the established precedence and authoring contracts from earlier phases rather than silently replacing them.

### Author Ergonomics
- Plain DOM `className` usage is the preferred authoring model for builtin buttons and addon authors.
- Core may add small optional helpers where they reduce obvious boilerplate, but helper abstractions must not replace standard React/HTML authoring.
- The phase should keep the Phase 18 direction intact: normal React elements, ordinary DOM styling, no return to a special render DSL.

### Agent's Discretion
- Exact mechanism used to inject the CSS variables and utility mapping into the browser deck page.
- Exact list of typography utility aliases, as long as they map cleanly onto the existing Sireno typography roles.
- Whether the core utility layer is emitted as inline CSS, a generated stylesheet string, or another browser-local mechanism that fits the current renderer architecture.

## Specific Ideas

- `text-primary` should use the global Sireno theme `primary` color.
- Tailwind-style utilities should read from CSS vars backed by the active Sireno theme.
- The desired direction is browser-button theming, not generic Tailwind adoption across unrelated runtime concerns.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-CONTEXT.md`
- `packages/cli/src/config/theme.ts`
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/button-frame.tsx`
- `packages/cli/src/addon/api.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/config/theme.ts`: already resolves the concrete Sireno theme token set and should remain the single source of truth for exported theme values.
- `packages/cli/src/render/dom-host.tsx`: owns the browser deck HTML shell and is the natural place to inject global CSS variables or browser-surface utility CSS.
- `packages/cli/src/render/button-frame.tsx`: currently hardcodes visual styling and will likely need to consume theme-backed styling instead of fixed colors.
- `packages/cli/src/addon/api.ts`: current DOM helpers hardcode text/icon presentation and will need alignment with the new theme-backed utility contract.

### Established Patterns
- Theme/background precedence is already locked; explicit overrides win over deck/theme defaults.
- The browser renderer now owns the only shipped visual path, so the CSS-var contract should attach to that one path rather than adding parallel styling seams.
- Button authors already use normal React/HTML output through `react-dom`; the new theming seam should strengthen that model, not replace it.

### Integration Points
- Browser deck shell styling in `packages/cli/src/render/dom-host.tsx`
- Shared default chrome in `packages/cli/src/render/button-frame.tsx`
- Builtin/addon DOM helper output in `packages/cli/src/addon/api.ts`
- Theme resolution in `packages/cli/src/config/theme.ts`

## Deferred Ideas

- Full Tailwind utility support beyond theme-token-backed color and typography classes.
- A broader CSS-like styling system or layout utility framework.
- Any new capability that changes theme precedence instead of reflecting the existing resolved values.

---
*Phase: 19-tailwind-button-theming-css-vars*
*Context gathered: 2026-05-23*
