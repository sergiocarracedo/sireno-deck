---
title: Adding a new field to CoreDeckConfigSchema — 5 loader seams
date: 2026-06-17
category: best-practices
module: core/schemas
problem_type: best_practice
severity: medium
tags: schema, loader, deck-config, yoda-loader
---

# Adding a new field to CoreDeckConfigSchema — 5 loader seams

## Context

Phase 72 BUG-04 required adding an optional `icon?: string` to `CoreDeckConfigSchema` so overlay decks could carry a visual identifier. The first instinct was to add the field to the schema and move on. The plan-checker caught it: the field is dropped at the loader seam unless carried through 5 distinct edit sites. This documents the pattern so future CoreDeckConfig additions don't repeat the same mistake.

## Guidance

When adding a new optional field to `CoreDeckConfigSchema`, the field must be carried through **5 loader seams** or it will be silently dropped:

1. **`CoreDeckConfigSchema` definition** (line ~213 in `packages/cli/src/core/schemas.ts`):
   ```typescript
   const CoreDeckConfigSchema = z
     .object({
       autoShow: z.boolean().default(false),
       background: z.string().min(1).optional(),
       icon: z.string().min(1).optional(),       // NEW FIELD
       system: z.boolean().optional(),
     })
     .strict()
   ```

2. **`DeckConfig` interface** (line ~190):
   ```typescript
   export interface DeckConfig {
     allow_reserved_slot_override?: boolean
     autoShow?: boolean
     background?: string
     deckType?: string
     icon?: string                              // NEW FIELD
     id: string
     keyCount?: number
     // ...
   }
   ```

3. **`getDeckPayload` exclusion list** (line ~388-402): Add the field to the filter chain so addons don't try to validate it as a config field:
   ```typescript
   ([key]) =>
     key !== 'autoShow' &&
     key !== 'background' &&
     key !== 'buttons' &&
     key !== 'icon' &&                          // NEW EXCLUSION
     key !== 'id' &&
     key !== 'name' &&
     key !== 'type',
   ```

4. **Both `expandDecks` call sites** (non-addon line ~470, addon line ~509-511): Pass the field into the `CoreDeckConfigSchema.safeParse` call:
   ```typescript
   const parsedCoreDeckConfig = CoreDeckConfigSchema.safeParse({
     background: deck.background,
     icon: deck.icon,                            // NEW
   })
   ```
   And the deck-builder spread at the non-addon site (line ~480-495):
   ```typescript
   decks[deckKey] = {
     ...(parsedCoreDeckConfig.data.background !== undefined
       ? { background: parsedCoreDeckConfig.data.background }
       : {}),
     ...(parsedCoreDeckConfig.data.icon !== undefined
       ? { icon: parsedCoreDeckConfig.data.icon }   // NEW
       : {}),
     // ...
   }
   ```
   And the addon-generated deck overlay (line ~549-557): overlay `icon` similar to `background`:
   ```typescript
   const coreOverlay: { background?: string; icon?: string } = {}
   if (parsedCoreDeckConfig.data.background !== undefined) {
     coreOverlay.background = parsedCoreDeckConfig.data.background
   }
   if (parsedCoreDeckConfig.data.icon !== undefined) {        // NEW
     coreOverlay.icon = parsedCoreDeckConfig.data.icon
   }
   ```

5. **Final `decks[deckKey]` builder** (line ~654-691): Mirror the `background` pattern:
   ```typescript
   decks[deckKey] = {
     ...(bootstrap.decks[deckKey]?.background !== undefined
       ? { background: bootstrap.decks[deckKey]?.background }
       : {}),
     ...(bootstrap.decks[deckKey]?.icon !== undefined       // NEW
       ? { icon: bootstrap.decks[deckKey]?.icon }
       : {}),
     // ...
   }
   ```

## Why This Matters

`RawDeckSchema` uses `.passthrough()`, so unknown fields in the user's YAML survive the bootstrap parse. But `CoreDeckConfigSchema` is `.strict()` and drops unknown fields. The `expandDecks` function then takes the raw deck and parses its core fields against the strict schema. If the field isn't in the strict schema, it's dropped at that seam. The final `decks[deckKey]` builder then spreads from `bootstrap.decks[deckKey]`, but the field has already been filtered out by `CoreDeckConfigSchema.safeParse`.

The 5 seams correspond to 5 distinct code paths that touch the deck object during loading. Missing any one of them means the field is lost in some configurations (e.g. addon-deck vs non-addon-deck, final-pass vs initial-pass).

## When to Apply

Use this checklist whenever:
- Adding a new field to `CoreDeckConfigSchema` (current or future versions)
- Adding a new field to any `.strict()` zod schema in the schemas module
- Adding a new field to a Bootstrap schema and wondering why it's not reaching the runtime

## Examples

**Before (broken)** — adding `icon` to the schema but forgetting the loader seams:
```yaml
# User's config
decks:
  chrome_overlay:
    icon: "icon://chrome"
```
The schema accepts the field, but `runtimeDecks['chrome_overlay'].icon === undefined`. The icon is dropped at the loader seam.

**After (correct)** — all 5 seams updated, the icon reaches the runtime and is used by `OverlayToggleButton`'s render path.

**Validation:** add a round-trip test that asserts the field survives `validateConfig` to the final deck builder:
```typescript
it('preserves a configured icon string on a regular deck', () => {
  const result = validateConfig(config, registry)
  expect(result.decks?.main?.icon).toBe('icon://app-window')
})
```

## Related

- `.planning/solutions/best-practices/gesture-state-spread-not-replace-2026-06-10.md` — same "easy to miss a seam" pattern, different module
- `.planning/research/ARCHITECTURE.md` (v1.7) — Section on loader-seam considerations
- Phase 72-01 plan-checker finding (the source of this pattern): "the field is added at 1 site but dropped at 4 others if only the schema is touched"
