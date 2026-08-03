---
title: "buttonColor and variant are orthogonal axes — do not coerce one into the other"
date: 2026-08-03
category: docs/solutions/conventions/
module: packages/cli/src/deck/
problem_type: convention
component: theme_architecture
severity: medium
applies_when:
  - Editing addon deck entries that set `variant` or `buttonColor`
  - Adding new values to either enum
  - Adding a new theme
symptoms:
  - An addon sets `buttonColor: "cyan"` on its deck and the rendered button shows the *highlighted* theme colour instead of cyan
  - A user expects button A and button B to share a hue but get different colours because button A's `variant: "warning"` wins
  - Console shows `[sireno-deck] addon "x" uses deprecated buttonColor: "blue"` even though buttonColor is still a valid manifest field
tags:
  - buttonColor
  - variant
  - theme
  - orthogonality
related_components:
  - packages/cli/src/addon/api.ts
  - packages/cli/src/deck/deck-config.ts
  - packages/cli/src/cli/commands/addon-decks.ts
  - packages/cli/src/themes/manifest.ts
  - packages/cli/src/themes/css.ts
  - packages/cli/frontend/src/components/Deck.tsx
---

## Rule

`buttonColor` and `variant` are two independent axes on `AddonGeneratedDeck` /
`RuntimeDeck`:

- `variant` — **semantic state**. Values like `highlighted`, `warning`,
  `success`, `error`. Use it when the colour carries meaning (recording,
  paused, errored). Themes must declare these five as required variants.
- `buttonColor` — **per-button hue customisation**. Closed core enum
  `"blue" | "green" | "purple" | "cyan" | "magenta" | "amber" | "lime"`.
  Use it to distinguish buttons inside a deck by colour (e.g. six
  app-shortcut buttons, each a different hue) without claiming semantic
  meaning. Themes are authoritative — they opt in to each core name
  (or declare additional theme-specific names like riptide's
  `neon-pink`) by adding a `variants.<name>` entry to their manifest.
  Names not declared in the active theme fall back to `default` with a
  console.warn at render time (ButtonFrame).

The two are never coerced. The fallback chain at
`packages/cli/frontend/src/components/Deck.tsx` resolves the effective
visual variant as:

```ts
effectiveVariant = button.variant ?? variant ?? buttonColor ?? "default"
```

i.e. semantic wins over hue, hue wins over default. A button with both
`variant: "highlighted"` _and_ `buttonColor: "cyan"` will render as
highlighted — the hue is a hint, not an override of semantic state.

## What not to do

Do **not** flatten `buttonColor` into `variant` at the CLI/runtime
boundary. A previous attempt did exactly that (`packages/cli/src/deck/variant-migration.ts`,
since deleted), mapping `blue → highlighted`, `green → success`,
`purple → highlighted` with a `console.warn`. This collapsed the two
axes and made `buttonColor` meaningless as a customisation knob. It
also produced noisy warnings for every legitimate use of buttonColor.

If you find yourself reaching for a mapping table from `buttonColor` to
`variant`, stop. The two are independent and the mapping is wrong by
construction.

## Adding a new enum value

1. Extend the closed union in **six** type locations (they must stay in sync):
   - `packages/cli/src/addon/api.ts` (manifest API)
   - `packages/cli/src/deck/runtime/runtime.ts` (RuntimeButton, RuntimeDeck)
   - `packages/cli/src/cli/commands/addon-decks.ts` (AddonGeneratedDeck local interface)
   - `packages/cli/frontend/src/components/Deck.tsx` (DeckButton, DeckButtonCellProps)
   - `packages/cli/frontend/src/App.tsx` (surface cast in the WS handler)
   - Each addon package that exports its own `buttonColor?` type (e.g.
     `packages/addons/app-shortcuts/src/types.ts`,
     `packages/addons/pomodoro/src/types.ts`)
2. Extend the Zod `ButtonColorSchema` enum in
   `packages/cli/src/config/schemas.ts` (closed core set). User-config
   decks validate against this list at startup; themes can declare
   additional theme-specific names but the Zod schema will reject them
   in user config — by design, so typos fail-fast.
3. Plumb `buttonColor` through the runtime if not already done:
   - `packages/cli/src/cli/commands/run.ts` — both the non-paginated
     `positionButtons(...).map(...)` branch (around line 665) and the
     paginated `pages.map((p) => mappedButtons)` branch (around line 709).
     The paginated branch must hoist `buttonColor` to top-level
     alongside `variant`; the existing `...rest` merge into `mergedConfig`
     would otherwise land it inside `config`.
   - `packages/cli/src/deck/deck-config.ts` — the surface builder at the
     bottom of `buildDeckConfigMessage` forwards `b.buttonColor` into
     the WS surface for the frontend.
4. Declare the variant in every theme that should support it. Themes
   that omit it will trigger a console.warn at render time when a
   button uses the new value. Required locations:
   - `packages/cli/src/themes/default/sirenodeck.json`
   - `packages/cli/src/themes/light/sirenodeck.json`
   - `packages/themes/riptide/sirenodeck.json` (and any sibling-theme manifests under `packages/themes/`)
5. Add a test in `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts`
   that exercises the new value through `materializeAddonDecks` and
   asserts it round-trips without coercion.
6. Add a `ButtonDefSchema — buttonColor field` block to
   `packages/cli/src/config/__tests__/schemas.test.ts` mirroring the
   existing `variant` block (accepts each enum value, rejects unknown
   strings, rejects theme-extras).
7. Update the `it.each` matrix in
   `packages/cli/src/ui/__tests__/ButtonFrame.test.tsx` and
   `packages/cli/src/themes/__tests__/css.test.ts` to cover the new
   CSS var emission and ButtonFrame resolution.

## Adding a new theme

When authoring a new theme under `packages/themes/<name>/`, declare
**all five required variants** (`default`, `highlighted`, `warning`,
`success`, `error`) plus any optional ones (e.g. riptide's `neon-pink`,
the seven `buttonColor` names). The css emitter treats variant values
as opaque strings, so names like `cyan` pass through to CSS vars
`--sireno-variant-cyan-{bg,border,fg,glow}` without further validation.

## See also

- `packages/cli/src/themes/manifest.ts` — required variant keys.
- `packages/cli/src/themes/css.ts` — variant-to-CSS var emission.
- `packages/cli/src/ui/ButtonFrame.tsx` — runtime resolution + warn on unknown.
