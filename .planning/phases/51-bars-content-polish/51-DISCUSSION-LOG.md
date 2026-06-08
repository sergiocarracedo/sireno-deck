# Phase 51 Discussion Log — Bars content polish

**Phase:** 51
**Discussed:** 2026-06-08
**Mode:** discuss (standard, not deep)

## Areas explored

### UX-1: system-status value grid (kept or dropped)

**Question:** The system-status addon currently renders the value as a separate grid below the bars. After phase 51, the value moves inside the bar (rotated 90deg). What should happen to the separate value grid?

**Options presented:**
1. **Keep the value grid** — less risky, no UX regression; the in-bar value is a bonus.
2. **Drop the value grid** — cleaner; rotated in-bar value is the only place the number lives. Risk: rotated 90deg is harder to read at a glance.
3. **Configurable per-button** — add `showValueGrid` flag, default true. Most flexible; small schema change.

**Recommendation:** Keep the value grid (less risk, no breaking change).

**User chose:** **Drop the value grid.** The user accepts the trade-off: rotated in-bar value is the canonical surface, the separate grid is noise. This means the system-status addon's `bars.tsx` is a substantive change, not just a passthrough.

**Reasoning captured:** The user prefers clean surfaces over backwards-compatible defaults when the new surface is honest and complete. The 90deg rotation is part of the contract.

---

### UX-2: value format inside the bar

**Question:** `BarsItem` has `value: number`. What string should the value text render?

**Options presented:**
1. **Add `displayValue?: string` to BarsItem, prefer it** (recommended) — system-status passes "12.3 GB" / "67%"; other consumers omit and get `String(Math.round(value))`.
2. **Render `value: number` as a percentage** — `(value / maxValue * 100)` rounded. Forces all consumers to a 0..maxValue scale.
3. **Render `value: number` as raw** — just `String(value)`. Simplest, consumers wanting "GB" / "%" handle that elsewhere.

**Recommendation:** Add `displayValue?: string` and prefer it. Schema change is additive.

**User chose:** **Add `displayValue?: string` and prefer it.** Confirmed recommended approach.

**Reasoning captured:** system-status already has formatted strings via `displayMetric.formattedValue`; threading them through as `displayValue` is the lowest-friction change. The rounded-number fallback is a sane default for future consumers.

---

### UX-3: negative of `var(--sireno-color-primary)`

**Question:** When `item.color` is undefined, the bar fill is the theme primary via `var(--sireno-color-primary)`. How do we compute the value text color so it is the visual negative of the bar fill?

**Options presented:**
1. **`mix-blend-mode: difference` for DOM, precompute for sharp** (recommended) — DOM lets the browser invert; sharp reads the active theme primary at config load and precomputes the complement.
2. **Precompute only** — both DOM and sharp use the precomputed color; no `mix-blend-mode`. Requires reading the active theme manifest at config load.
3. **DOM blend only, skip sharp parity** — sharp path uses a static high-contrast color; may not match DOM.

**Recommendation:** `mix-blend-mode: difference` for DOM, precompute for sharp. Cleanest implementation, works in both paths, adapts to runtime theme switches.

**User chose:** **mix-blend-mode for DOM, precompute for sharp.** Confirmed recommended approach.

**Reasoning captured:** The DOM blend path is the elegant solution when it works; the sharp path can't render `mix-blend-mode` and needs an explicit color. Resolving the theme primary at config load is a one-time cost; the renderer already knows the active theme.

---

## Out-of-scope items surfaced

- **Per-bar typography overrides** — not in phase 51. Captured in CONTEXT.md "Deferred ideas".
- **Animated bar fills** — not in phase 51. Captured in CONTEXT.md "Deferred ideas".
- **`value: { displayValue, format }` object form** — premature; the optional `displayValue?: string` field is enough for v1.5. Captured in CONTEXT.md "Deferred ideas".

## Wrap-up

User confirmed all 3 areas discussed. CONTEXT.md generated. Ready for `plan-phase 51`.
