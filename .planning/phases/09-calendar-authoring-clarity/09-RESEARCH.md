# Phase 9: Calendar + Authoring Clarity - Research

**Researched:** 2026-05-16
**Phase goal:** Complete the milestone with a readable tear-sheet calendar visual and docs/examples that clearly explain the non-DOM custom render contract.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| Calendar visual integration | Reuse the existing `deck-button` variant seam and add `variant: "calendar-sheet"` instead of inventing new render nodes or scene primitives | Phase 8 already proved a bespoke live visual can stay inside the narrow `deck-button` render contract without forcing wrapper usage or widening the renderer. The same pattern fits a tear-sheet calendar better than a broader API expansion. | [VERIFIED: .planning/phases/08-clock-visuals/08-CONTEXT.md, .planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md, packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts, packages/cli/src/render/text-image.ts] |
| Calendar refresh ownership | Keep the default cadence on the addon definition with `defaultIntervalMs`, and let `interval_ms` remain the override path | Phase 6 locked the refresh contract: core owns scheduling, addon buttons declare defaults, and config overrides cadence through `interval_ms`. Phase 9 should apply that existing rule rather than creating calendar-local timing logic. | [VERIFIED: .planning/phases/06-base-contracts/06-CONTEXT.md, .planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md, builtin-addons/date-time/src/index.ts] |
| Tear-sheet readability | Use a dominant day number plus small weekday/month context instead of a mini month grid | The roadmap explicitly rules out a cramped month grid. The chosen tear-sheet layout is the smallest readable shape on a 72x72 key and keeps the calendar visually distinct from the existing digital and analog date/time buttons. | [VERIFIED: .planning/ROADMAP.md, .planning/REQUIREMENTS.md, .planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md] |
| JSX/custom-element authoring clarity | Document the existing explicit JSX opt-in entrypoint (`sireno-deck-cli/jsx`) alongside helper-based authoring instead of inventing a new authoring layer | Phase 6 already shipped a working explicit JSX entrypoint and fixture. The Phase 9 docs requirement is clarity, not a new API. The shortest path is to explain the existing non-DOM contract with one focused guide and one concrete addon-style example. | [VERIFIED: packages/cli/package.json, packages/cli/src/render/jsx.d.ts, .planning/phases/06-base-contracts/06-01-SUMMARY.md, .planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md] |
| Review-path regression protection | Anchor tests and fixtures to the exact shipped review surface, not only synthetic token or render mutations | Phase 7 already showed that synthetic tests can pass while real UAT still sucks. Phase 9 should inherit that lesson for both the calendar visual and the docs/example surface. | [VERIFIED: .planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md, .planning/phases/08-clock-visuals/08-02-SUMMARY.md] |

## Common Pitfalls

### Letting the tear-sheet drift into a tiny month grid
**What goes wrong:** The visual tries to show too much calendar structure on one key and becomes illegible.  
**Why:** Calendar features tempt broader scope than the device surface can support. The milestone explicitly rejects a dense month-grid layout.  
**How to avoid:** Keep one large day number and only minimal supporting weekday/month text. Treat anything denser as a future feature, not a Phase 9 “nice to have.” [VERIFIED: .planning/ROADMAP.md, .planning/REQUIREMENTS.md, .planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md]

### Treating `60000ms` cadence like a free pass to ignore rollover behavior
**What goes wrong:** The code hardcodes assumptions that only make sense for a once-a-day refresh or tests literal midnight behavior in flaky ways.  
**Why:** Calendar visuals change slowly, so it is easy to under-specify what the scheduler contract actually guarantees.  
**How to avoid:** Verify the contract at the definition/runtime seam (`defaultIntervalMs: 60000` plus `interval_ms` override compatibility) and keep UAT focused on the real shipped review path rather than brittle midnight simulations. [VERIFIED: .planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md, builtin-addons/date-time/src/index.ts]

### Writing docs prose without a runnable authoring example
**What goes wrong:** The docs say “this is not the DOM,” but addon authors still do not know what to import, how to opt into JSX, or how helper-based authoring differs.  
**Why:** Conceptual explanations decay fast unless they are anchored to real code in the repo.  
**How to avoid:** Pair the focused docs page with one explicit addon-style example that uses the current `sireno-deck-cli/jsx` opt-in path and the existing helper API. [VERIFIED: packages/cli/package.json, packages/cli/src/render/jsx.d.ts, .planning/phases/06-base-contracts/06-01-SUMMARY.md]

### Repeating the Phase 7 review-path mistake
**What goes wrong:** Unit tests pass for a calendar renderer branch, but the actual shipped config or docs/example path is broken or misleading in review.  
**Why:** Synthetic tests do not automatically prove the real user-facing review surface.  
**How to avoid:** Ship a committed Phase 9 review fixture and verify the docs/example path directly, not just the internal renderer branch. [VERIFIED: .planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md, .planning/phases/08-clock-visuals/08-02-SUMMARY.md]

## Existing Patterns in This Codebase

- **Separate built-in button types inside one addon:** `builtin-addons/date-time/src/index.ts` already exposes separate `date-time` and `analog-clock` button definitions. `calendar-sheet` should become the third sibling type rather than another large variant union inside the digital schema. [VERIFIED: builtin-addons/date-time/src/index.ts, builtin-addons/date-time/src/index.test.ts]
- **Narrow variant-based render seam:** `packages/cli/src/render/types.ts`, `packages/cli/src/render/reconciler.ts`, and `packages/cli/src/render/text-image.ts` already carry bespoke visuals through a `variant` union on `deck-button`. [VERIFIED: packages/cli/src/render/types.ts, packages/cli/src/render/reconciler.ts, packages/cli/src/render/text-image.ts]
- **Explicit JSX opt-in already exists:** `packages/cli/package.json` exports `./jsx`, and `packages/cli/src/render/jsx.d.ts` declares `deck-button`, `deck-text`, and `deck-surface` as custom intrinsic elements. [VERIFIED: packages/cli/package.json, packages/cli/src/render/jsx.d.ts]
- **Helper/JSX parity tests already exist:** `packages/cli/src/render/reconciler.test.tsx` already asserts helper-authored and JSX-authored output stay aligned, including bespoke variant cases. Phase 9 docs/examples can lean on that tested contract rather than implying a separate authoring path. [VERIFIED: packages/cli/src/render/reconciler.test.tsx]

## Recommended Approach

Split Phase 9 into two vertical slices.

First, add `calendar-sheet` as a third bundled date/time button type that renders through `deck-button` plus `variant: "calendar-sheet"`, uses a `60000ms` default cadence, and produces a clear tear-sheet visual with a dominant day number and minimal weekday/month context. Anchor that slice with addon tests, renderer tests, and a committed review fixture. [VERIFIED: builtin-addons/date-time/src/index.ts, .planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md, .planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md]

Second, ship one focused docs page plus one explicit addon-style example that explains the non-DOM custom render contract using the already-shipped `sireno-deck-cli/jsx` opt-in entrypoint and helper alternative. Verify that both the docs narrative and example stay aligned with the real package API and review path. [VERIFIED: packages/cli/package.json, packages/cli/src/render/jsx.d.ts, .planning/phases/06-base-contracts/06-01-SUMMARY.md, .planning/phases/09-calendar-authoring-clarity/09-CONTEXT.md]
