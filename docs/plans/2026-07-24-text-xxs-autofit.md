# Text component: `xxs` size + `autofit` fit mode

- **Date:** 2026-07-24
- **Branch suggestion:** `feat/text-xxs-autofit`
- **Product contract source:** ce-plan-bootstrap
- **Plan depth:** Standard
- **Status:** Draft

## 1. Goal

Two additive extensions to `Text` (`packages/cli/src/ui/primitives/Text.tsx`):

1. **New size `xxs`** — a fixed smaller-than-`xs` step. Use case: ultra-compact chrome (icon overlay labels, status pills, dense metric tables).
2. **New fit mode `autofit`** — dynamically scales font-size **down** so the text fits the container without truncation. Caller specifies a `minSize` (px) and (optionally) a line count. If even `minSize` overflows, fall back to `minSize` + line-clamp ellipsis on the configured `lines`.

Both changes are backward-compatible: every existing `<Text size="…" fit="…" />` call keeps working unchanged.

## 2. Settled decisions

| Decision | Choice | Why |
| --- | --- | --- |
| `xxs` value | `text-[8px]` (Tailwind arbitrary value) | Matches `typography.auxiliary_text.fontSize: 8` in `sirenodeck.json`; **no theme / `@theme` block changes needed** — arbitrary values bypass the theme contract entirely |
| `xxs` CSS layer | Tailwind utility, not `components.css` rule | Co-located with the rest of `SIZE_CLASS`; same lookup path; arbitrary value is deterministic |
| `autofit` driver | JS via `useRef` + `useEffect` + `ResizeObserver` on a wrapper `<span>` | Pure CSS cannot satisfy "fit *or* ellipsis on overflow at minSize" — needs measurement and a state switch |
| `autofit` step strategy | Binary search between `current size` and `minSize`, clamped to integer px | O(log n) re-fits per ResizeObserver tick; linear was deemed wasteful for 6xl → 8px range |
| `autofit` re-fit triggers | (a) text content change, (b) container resize, (c) `size`/`minSize`/`lines` props change | Standard ResizeObserver + dependency-array pattern; matches `useAddonChannel` precedent in `IconLabelProgressSurface.tsx` |
| `autofit` overflow check | Single line: `scrollWidth > clientWidth`. Multi-line: `scrollHeight > clientHeight` (container has explicit `height: lines * lineHeight` em) | Both roll up to the same predicate: text rendered size exceeds available box |
| `autofit` minSize | Required (no default) | Forcing the caller to pick the floor prevents silent unreadable output; default `8` would be invisible on many themes |
| `autofit` ellipsis at floor | Reuse existing multi-line `-webkit-line-clamp` inline style path | Already battle-tested for the `ellipsis` mode |
| `TextFit` shape | Add optional `minSize?: number` field to the existing discriminated union; only meaningful when `type === "autofit"` | Smaller surface than introducing a fourth object variant — matches existing `lines` / `reserveSpace` precedent |
| `RICH_SIZE_TAGS` | Add `"xxs"` to the inline-size-tag set | Same shape as existing `xs`/`sm`/`md` entries; no parser changes |

### Explicit non-decisions (deferred)

- **Auto-grow on the other axis** (fit a fixed pixel budget by *increasing* font-size) — out of scope; the request is shrink-to-fit only.
- **CJK / word-break tuning** — `whitespace-normal break-words` is already applied; we inherit it.
- **Animation on resize** — instant re-fit, no transition; matches the rest of the codebase's instant updates.

## 3. API additions

```ts
// Size: prepend "xxs"
export type TextSize =
  | "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"

// Fit: add "autofit" + optional minSize
export type TextFitType = "ellipsis" | "shrink" | "hidden" | "autofit"
export type TextFit = {
  type: TextFitType
  lines?: 1 | 2 | 3
  reserveSpace?: boolean
  minSize?: number  // px; required when type === "autofit"
}
```

**Usage examples:**

```tsx
// xxs — static
<Text size="xxs" text="•" />

// autofit — shrink to fit, floor at 10px, single line
<Text size="5xl" fit={{ type: "autofit", minSize: 10 }} text={longTitle} />

// autofit — shrink to fit across 2 lines, floor at 12px, then ellipsis
<Text
  size="2xl"
  fit={{ type: "autofit", minSize: 12, lines: 2 }}
  text={subtitle}
/>
```

**Rich-text inline tag:** `<xxs>small caption text</xxs>` (consistent with `<xs>` etc.).

## 4. Files to change

### Source

- `packages/cli/src/ui/primitives/Text.tsx`
  - **`SIZE_CLASS`** (line 54): add `xxs: "text-[8px]"`.
  - **`RICH_SIZE_TAGS`** (line 74): add `"xxs"`.
  - **`TextFitType`** (line 314): add `"autofit"`.
  - **`TextFit`** (line 318): add `minSize?: number`.
  - **`resolveTextFit()`** (around line 282): require `minSize` when `type === "autofit"`; default `lines: 1`; ignore `reserveSpace` (autofit always reserves the right amount of space because it owns font-size). Throw with a clear message if `minSize` is missing — caller error.
  - **`Text` component** (line 376): when `resolvedFit.type === "autofit"`:
    - Render the existing `<span>` wrapper with a `ref`.
    - Add a `useEffect` that runs the **measure-and-step loop**:
      1. Read `containerRef.current.getBoundingClientRect()` and `scrollWidth` / `scrollHeight`.
      2. If overflow → reduce font-size by binary-search step between current and `minSize`. Re-apply inline `style.fontSize`. Loop until it fits or floor hit.
      3. If floor hit and **still** overflows → keep `minSize` and apply the existing multi-line ellipsis inline styles (`display:-webkit-box; -webkit-line-clamp: N`) with `lines` clamped to [1, 3].
    - Subscribe a `ResizeObserver` on `containerRef.current`; re-run the loop on each tick.
    - Re-run on `text`, `size`, `minSize`, `lines` changes.
    - **Cleanup**: `observer.disconnect()` in the effect return.
  - Add `data-sireno-text-fit="autofit"` and `data-sireno-text-autofit-state="fit|ellipsis"` for test hooks and emulator inspection (mirrors the existing `data-sireno-text-shrink-state="pending"` attribute).

### Tests

- `packages/cli/src/ui/primitives/__tests__/Text.test.tsx`
  - **Note (test drift):** the existing file references `ResolvedTextFit`, `"wrap"` mode, `"line-clamp"` type, `MAX_LINE_CLAMP = 6`, and default `fit: "wrap"` — none of which exist in the current source. These tests are **forward-looking / aspirational**. Two options:
    - **Ponytail choice (recommended):** leave the existing drift alone in *this* plan. Add only the new tests for `xxs` + `autofit`. File a separate "test-drift cleanup" ticket so the cleanup PR is reviewable on its own.
    - Otherwise: this plan would expand to a refactor of the test file beyond the requested change.
  - **New tests:**
    - `resolveTextFit({ type: "autofit", minSize: 10 })` returns the same object (idempotent).
    - `resolveTextFit({ type: "autofit" })` throws with a message naming `minSize`.
    - `resolveTextFit({ type: "autofit", minSize: 10, lines: 7 })` clamps to 3.
    - `resolveTextFit({ type: "autofit", minSize: 10, lines: 0 })` clamps to 1.
    - `<Text size="xxs" />` renders `class` containing `text-[8px]`.
    - `<Text text="x"><xxs>x</xxs></Text>` renders the `xxs` rich tag (assert the rendered span has the `xxs` class).
    - `<Text fit={{ type: "autofit", minSize: 10 }} text="…" />` mounts with a `ResizeObserver` instance reachable via `data-sireno-text-fit="autofit"`; `data-sireno-text-autofit-state="fit"` after first fit cycle (jsdom polyfill: `vi.stubGlobal('ResizeObserver', ResizeObserverMock)` from `__tests__/setup.ts` if present; otherwise inline a 10-line mock).
    - **Overflow → ellipsis path**: render a container with a tiny `clientWidth` mock; assert `data-sireno-text-autofit-state="ellipsis"` and that `-webkit-line-clamp` is set to the configured `lines`.

### Re-exports / theme

- `packages/cli/src/ui/primitives/index.ts` — no change (`Text`, `TextSize`, `TextFit`, `TextFitType` are already re-exported).
- `packages/cli/src/ui/theme-presentation.tsx` — no change (it imports `TextProps` which is unchanged in shape).
- `packages/cli/src/themes/default/components.css` — no change.
- `packages/cli/frontend/.sireno-deck/theme.css` — generated, no edit.

## 5. Implementation order

1. **Static `xxs` first** — smallest, no React hooks, safest diff. `SIZE_CLASS` + `RICH_SIZE_TAGS` + tests.
2. **Fit type extension** — `TextFitType` + `TextFit` shape + `resolveTextFit` (incl. throw on missing `minSize`) + tests.
3. **Autofit implementation** — extract a `useAutofit(ref, { size, minSize, lines, text })` hook inside `Text.tsx` (file-local; not exported) that returns `{ fontSize, state }`. Wire it into the render path.
4. **Test harness for `ResizeObserver`** — add a tiny mock at the top of the test file (or `__tests__/setup.ts` if it exists). No production dependency.
5. **Verify** — `pnpm lint && pnpm format && pnpm typecheck && pnpm test` then emulator run.

## 6. Test scenarios

For each scenario, the test file path is `packages/cli/src/ui/primitives/__tests__/Text.test.tsx` unless noted.

### `xxs` (static)

- `SIZE_CLASS["xxs"] === "text-[8px]"`.
- `<Text size="xxs" text="hi" />` renders a span with `text-[8px]` in its class list.
- `<Text text="<xxs>hi</xxs>" />` renders a child span with `text-[8px]` (rich-text parser picks up `xxs` tag).

### `autofit` (resolveTextFit)

- Input `{ type: "autofit", minSize: 10 }` → returned object is the same shape; no defaults applied.
- Input `{ type: "autofit" }` → throws `Error` whose message mentions `minSize`.
- Input `{ type: "autofit", minSize: 10, lines: 7 }` → `lines === 3`.
- Input `{ type: "autofit", minSize: 10, lines: 0 }` → `lines === 1`.
- Input `{ type: "autofit", minSize: 10, reserveSpace: true }` → `reserveSpace` is ignored (autofit reserves its own space).

### `autofit` (component, ResizeObserver mocked)

- Renders with `data-sireno-text-fit="autofit"`.
- On mount, after the first observer callback fires: `data-sireno-text-autofit-state` is either `"fit"` or `"ellipsis"` (never `"pending"`).
- **Fit path**: container wide enough → `state === "fit"`, `style.fontSize` equals the resolved size (no clamp applied).
- **Step path**: container width artificially set to 50% of natural width → `state === "fit"`, `style.fontSize` is between `minSize` and the starting size.
- **Ellipsis path**: container width set to 1px → `state === "ellipsis"`, `style.fontSize === \`${minSize}px\``, `-webkit-line-clamp` equals configured `lines`.
- **Re-fit on resize**: container width grows after first fit → `style.fontSize` increases back (up to the starting size).
- **Cleanup**: unmounting the component calls `observer.disconnect()` (assert via the mock).

### Existing behavior (regression)

- `<Text size="xs" fit="ellipsis" text="…" />` unchanged.
- `<Text fit="shrink" … />` still emits `data-sireno-text-shrink-state="pending"`.
- Rich-text inline tags `<xs>`, `<sm>`, … `<5xl>` still work.

## 7. Assumptions

- Tailwind v4 arbitrary values (`text-[8px]`) are guaranteed to emit a working class by the project's existing toolchain — they already work elsewhere (`Icon.tsx` uses `style={{ fontSize: \`${size}px\` }}`, but arbitrary value classes are also used in the codebase; will be confirmed by the build step).
- `ResizeObserver` is available in jsdom **or** a 5-line polyfill is acceptable in the test file (no production polyfill needed — every runtime is a modern browser or Electron with native `ResizeObserver`).
- The frontend (Vue) emulator does NOT override `Text` via `useThemeUiPresentation` for the demos that exercise this feature. If it does, the test must run on the *backend* `Text` only (current precedent — Text tests render the backend primitive directly).
- "Min font size" semantics: `minSize` is the **floor** for the autofit shrink. It is not a target. The caller picks it knowing the smallest legible size for their theme.
- The 3-line cap (`MAX_LINE_CLAMP = 3`) applies to autofit's ellipsis fallback too. If a caller wants 4 lines at the floor, they must use a non-autofit mode.

## 8. Out of scope

- **Auto-grow** (fit a fixed budget by *increasing* font-size) — different problem, different API; request was shrink-only.
- **Smooth / animated transitions on resize** — instant re-fit matches the codebase.
- **Theme-aware `minSize` defaults** (e.g., read from `typography.auxiliary_text.fontSize`) — keeps the API explicit; caller decides.
- **Fixing the existing test drift** in `Text.test.tsx` (`ResolvedTextFit`, `wrap`, `MAX_LINE_CLAMP = 6`, etc.) — separate ticket; this plan does not touch those tests.
- **Migration of any existing `fit` call sites** to `autofit` — no consumer changes; autofit is opt-in.
- **Tailwind `@theme` block entries for `xxs`** — the arbitrary value path is sufficient and avoids touching the theme generator.
- **Per-locale font-size presets** (CJK often wants different default sizes) — not requested.
- **Frontend (Vue) emulator primitives** — backend `Text` only; the emulator already delegates to the backend via the bridge.

## 9. Verification

Per AGENTS.md recipe:

```sh
pnpm lint && pnpm format && pnpm typecheck && pnpm test
pnpm --filter @sireno-deck/cli run dev -- --emulator
# open http://127.0.0.1:52938/#/device and http://127.0.0.1:5180
# confirm a button with <Text size="xxs" /> renders visibly smaller than xs
# confirm a button with <Text fit={{ type: "autofit", minSize: 10 }} text="…" /> renders at a size that fits the button without truncation in the emulator
# confirm a forced-overflow button (set `text` to a 200-char string with minSize: 8, lines: 1) clamps to one line with ellipsis at 8px
```

Capture a screenshot of each of the three emulator states for the PR body.