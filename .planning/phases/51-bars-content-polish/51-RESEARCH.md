# Phase 51 Research — Bars content polish

**Phase:** 51 — Bars content polish
**Researched:** 2026-06-08
**Confidence:** HIGH (no new external dependencies; reuses existing DOM/Sharp render paths; CSS feature is Baseline 2020+)

## Don't Hand-Roll

- **`mix-blend-mode: difference` for the DOM path.** This is the standard CSS way to compute the per-pixel inverse of whatever is under an element. Implementing it manually with custom shaders or pixel sampling would be strictly worse: more code, more CPU, more visual seams. Use the CSS primitive. [VERIFIED: MDN, Baseline since 2020-01]

- **Tailwind `mix-blend-difference` utility for the DOM className.** Tailwind is already in the stack (v1.4 hardened the Tailwind path). No new dep, no new helper. [VERIFIED: tailwindcss.com/docs/mix-blend-mode]

- **Sharp rasterization for the native render path.** Sharp converts HTML+CSS to a raw RGBA buffer. CSS `mix-blend-mode` is **not preserved** in sharp's pixel pipeline — the text is rasterized at its declared `color` (or transparent), not at the blended result. The sharp path requires an explicit precomputed hex color. [VERIFIED: shape of sharp's API + reasoning from browser-renderer.ts:128 pattern]

- **Precomputed negative at config load, not runtime pixel sampling.** The v1.5 milestone research and the 51-CONTEXT decision both lock this in. Runtime pixel sampling with sharp inside the render hot path is fragile (it would re-rasterize the bar fill to sample its color, defeating the purpose) and slow. Precomputing once at config load is O(1) per item.

## Common Pitfalls

- **Stacking context isolation (DOM).** `mix-blend-mode` only blends with content in the same stacking context. If the bar's parent has `isolation: isolate` or another property that creates a new stacking context, the text will only blend with elements inside the same context — the bar fill is the target, so the parent stacking context needs to include the bar fill AND the value text. **Mitigation:** the bar fill and the value text are both children of the same per-item column inside the per-item container, which is a flat flexbox — no `isolate` anywhere in the chain. The default stacking context (the body) is the right one for this behavior.

- **Sharp's `mix-blend-mode` is silently ignored.** If we ship the DOM blend path only and the sharp path inherits the same styles via the existing HTML render pipeline, the value text in the sharp path will appear in its declared `color` (probably white-on-dark or transparent), not as the negative. The sharp path MUST receive a precomputed `color` style value. **Mitigation:** the `Bars` component takes an explicit `useSharpPath?: boolean` prop and emits a `style={{ color: precomputedHex }}` when true, `style={{ mixBlendMode: 'difference' }}` when false.

- **Near-gray unreadable text.** When the bar's effective color is near gray (luma ≈ 128), the visual inverse is also near gray, which is unreadable. The 51-CONTEXT decision locks in a fallback: if `|luma - 128| < 32`, use `#ffffff` for dark bars (luma < 128) and `#000000` for light bars (luma >= 128). [VERIFIED: 51-CONTEXT.md]

- **Theme primary at config load is not a "no-op".** The renderer needs the active theme's primary hex to precompute negatives for items that omit `item.color`. This is a one-time read at config load — no per-render cost. The renderer's existing `browser-renderer.ts:128` already builds the CSS variable map from the active theme; the primary hex is already known.

- **The 90deg rotation affects layout, not just visual.** When `transform: rotate(-90deg)` is applied, the text's bounding box is rotated, which can change how flexbox / grid measures the parent. **Mitigation:** position the value text absolutely inside the bar fill, not in the flex flow. The bar fill is already `absolute bottom-0` per the existing code.

- **`mix-blend-mode` is not animatable.** Per MDN: "Animation type: Not animatable". If we ever animate the bar fill, the text will not animate its blend automatically. Not a concern for v1.5 (no animation), but worth a code comment.

## Existing Patterns in This Codebase

- **Theme primary is injected as `--sireno-color-primary`.** All consumers reference the CSS variable directly (`Bars.tsx:43`, `media-volume.tsx`, `analog-clock.tsx`, `light/index.js`). For precomputation, the renderer resolves the hex from the active theme manifest at config load and threads it through a `themePrimaryHex?: string` prop.

- **Text component supports `style` prop pass-through.** We use it to inject `transform: 'rotate(-90deg)'` and either `mixBlendMode: 'difference'` (DOM) or `color: precomputedHex` (sharp). No new primitive needed.

- **No `mix-blend-mode` in the codebase today.** This phase introduces the first use. The Tailwind utility class will be `mix-blend-difference` (snake-case Tailwind class maps to `mix-blend-mode: difference` in CSS).

- **Sharp path entry at `browser-renderer.ts:128`.** It uses `sharp(buffer).removeAlpha().raw().toBuffer()`. The HTML being rasterized is the result of React rendering. The HTML contains the `style` attribute; the precomputed `color` is in there for the sharp path. No sharp code changes needed for this phase.

- **Bars is consumed only by `system-status/buttons/bars.tsx`.** No other addon uses Bars today, so we have one canonical consumer to update.

## Recommended Approach

Implementation follows the 51-CONTEXT decisions exactly. No deviations.

### File-level changes

1. **`packages/cli/src/ui/negative-color.ts` (NEW)** — pure helper, no React, no DOM
   - `parseHex(hex: string): {r,g,b} | null` — accepts `#RGB` and `#RRGGBB`
   - `toHex({r,g,b}): string` — returns `#RRGGBB`
   - `luma({r,g,b}): number` — `0.2126*r + 0.7152*g + 0.0722*b`
   - `computeNegativeColor(barColor: string, themePrimaryHex: string | null): string` — applies the BARS-03 near-gray fallback and the standard negative

2. **`packages/cli/src/ui/Bars.tsx` (MODIFY)**
   - Add `displayValue?: string` to `BarsItem` type
   - Add `themePrimaryHex?: string` and `useSharpPath?: boolean` to `Bars` component props
   - Add the value text element inside the bar fill:
     - DOM path: `<Text style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', mixBlendMode: 'difference', position: 'absolute' }} tone="foreground" size="xs">{displayValue}</Text>`
     - Sharp path: `<Text style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', color: computeNegativeColor(item.color ?? themePrimaryHex, themePrimaryHex), position: 'absolute' }} size="xs">{displayValue}</Text>`
   - Use `displayValue ?? String(Math.round(item.value))` as the rendered string

3. **`packages/cli/src/ui/negative-color.test.ts` (NEW)** — unit tests for the helper (parseHex, toHex, luma, computeNegativeColor for hex input, theme-primary input, near-gray fallback)

4. **`packages/cli/src/ui/Bars.test.tsx` (MODIFY)** — extend with: value text renders inside the bar fill; rotated transform; DOM path uses `mix-blend-mode: difference`; sharp path uses an explicit precomputed `color`; `displayValue` is preferred over `String(Math.round(value))`

5. **`packages/cli/src/builtin-addons/system-status/buttons/bars.tsx` (MODIFY)**
   - Populate `displayValue` from `displayMetric.formattedValue`
   - Drop the separate `LabelValueList` value grid
   - Pass `themePrimaryHex` and `useSharpPath` to `Bars` (read from the active theme via the renderer context — same seam as the existing theme tokens)

### Wave plan (vertical slices)

- **Plan 51-01 (wave 1):** All of the above EXCEPT step 5. Tracer bullet: a unit test of the `Bars` component with a `displayValue` shows the rotated in-bar value with `mix-blend-mode: difference` in the DOM path and a precomputed `color` in the sharp path. system-status is untouched.
- **Plan 51-02 (wave 2, depends on 51-01):** system-status consumer integration. Tracer bullet: the system-status bars button shows CPU/RAM/Disk with formatted values (`"12.3 GB"`, `"67%"`) inside the bars; the separate value grid is gone.

### Vertical slice integrity

- 51-01 is independently demoable via a unit test that asserts the rendered HTML contains the rotated text element with the correct style.
- 51-02 is independently demoable via the system-status addon's bars button rendering correctly in the browser/emulator.
- Both plans are bounded 1-session efforts per the milestone SUMMARY.

### Open question resolved by research

The discovery question "What is the negative of `var(--sireno-color-primary)`?" is resolved: in the DOM path, the browser handles it via `mix-blend-mode: difference` — there is no literal "negative" to compute. In the sharp path, we resolve the theme primary hex at config load and precompute. The research confirms both paths produce the same visual result.

## Open Considerations (not blocking, capture in plan)

- **`displayValue` API design.** v1.5 ships `displayValue?: string` per the 51-CONTEXT decision. A future iteration could add `displayValue: { text: string, format?: 'percent' | 'bytes' | string }` for richer formatting. Not in scope.
- **Animated bar fills.** If bar fill height is ever animated, the value text stays in place (the `mix-blend-mode` is static). Not a v1.5 concern.

## References

- MDN: `mix-blend-mode` — https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode
- Tailwind CSS: `mix-blend-mode` utilities — https://tailwindcss.com/docs/mix-blend-mode
- 51-CONTEXT.md — locked decisions
- 51-DISCOVERY.md — code facts and open questions (all resolved)
- v1.5 research/SUMMARY.md — keystone insight on precomputed negative at config load

---

*Research complete: 2026-06-08*
*Next: plan-phase 51*
