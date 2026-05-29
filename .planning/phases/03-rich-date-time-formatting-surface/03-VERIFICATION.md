# Phase 3 Verification

**Date:** 2026-05-29
**Status:** passed_after_03-03_gap_closure

## Verification Summary

Phase 3 passes verification after closure plan `03-03-PLAN.md` and the rerun UAT committed in `bea2860`. The original manual UAT correctly found that the committed review path never encoded a real size delta: the main-deck time line used inner `<xl>` tags inside a built-in date-time button already rendered through outer `Text size="xl"`, so the first line could not look larger. That gap was closed by moving the review path and mounted proof onto the existing shared `<2xl>` token and by widening the shared size ladder in `packages/cli/src/render/theme-utilities.ts` so adjacent levels read more distinctly. The original failed UAT evidence remains preserved in `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md`, and the rerun confirmed the visual result on the real emulator path before Phase 4 cleanup moved on to the next verification seams.

## Must-Have Checks

### 03-01
- Automated pass retained: `packages/cli/src/ui/Text.tsx` parses string children through one strict-whitelist nested mini markup language instead of delegating rich rendering to widgets or themes.
- Automated pass retained: the grammar supports `|`, `*...*`, shared size tags, existing tone-token tags, and `<blink>...</blink>` through one core render path.
- Automated pass retained: invalid or unsupported markup falls back to the original literal source text.
- Automated pass retained: theme wrappers remain outer metadata observers and do not become inner markup owners.

### 03-02
- Automated pass retained: built-in date-time keeps one `format` field and Day.js as the token engine while preserving markup literals around token expansion.
- Automated pass retained: invalid formatted markup still falls back to literal output after token expansion rather than partially rendering broken structure.
- Automated pass retained: blink behavior is documented and reviewed honestly as always-on product behavior.
- Passed after `03-03-PLAN.md`: the committed emulator review path and mounted proof now use the existing shared `<2xl>` token above the outer `Text size="xl"` shell, so the larger-first-line contract is encoded honestly on the real review path.

### 03-03
- Passed: `packages/cli/fixtures/phase-22/config.emulator-demo.yml` now asks for `<2xl>` on the main `HH` and `mm` segments, so the review fixture finally requests a genuinely larger-than-baseline time line.
- Passed: `packages/cli/src/render/theme-utilities.ts` keeps the same public size vocabulary but widens the shared size ladder (`xs 0.7`, `sm 0.85`, `lg 1.2`, `xl 1.4`, `2xl 1.75`) so adjacent `Text` sizes are more visibly distinct.
- Passed: `packages/cli/src/builtin-addons/date-time/index.test.ts` now proves the corrected mounted rich date-time contract against `2xl`, split blink-colon output, and the real fallback path instead of only parser survival.
- Passed: `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md` still preserves the original report, root_cause analysis, and rerun path while documenting what `03-03-PLAN.md` changed before the next manual check.

## Requirement Coverage

- Retained pass: `TRF-05` remains satisfied by `packages/cli/src/ui/Text.tsx` owning the strict-whitelist nested rich-markup parser/render seam and `packages/cli/src/builtin-addons/date-time/format.ts` preserving markup literals so the single-field date-time `format` contract still runs through Day.js first.
- Retained pass: `TRF-06` remains satisfied by shared rich text supporting line breaks, highlight shorthand, size tags, blink spans, and tone-token tags with deterministic literal fallback, while `packages/cli/src/render/dom-host.test.tsx` proves theme wrappers stay outer observers.
- Closed by `03-03-PLAN.md`: the Phase 3 review fixture and mounted proof now encode the user-visible size contrast they claim by using the existing `2xl` token over the outer `xl` shell and by widening the shared size ladder.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx`
  - rerun after `03-03-PLAN.md`: passes with the widened shared size ladder assertion (`font-size:calc(var(--sireno-font-aux-size, 16px) * 0.85)`) still proving the theme seam honestly
- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/date-time/index.test.ts src/render/dom-host.test.tsx`
  - rerun after `03-03-PLAN.md`: verifies the corrected `2xl` date-time review contract plus the widened size ladder through both focused suites
- `rg -n "03-03-PLAN.md|2xl|root_cause|size ladder|larger" .planning/phases/03-rich-date-time-formatting-surface/03-UAT.md .planning/phases/03-rich-date-time-formatting-surface/03-VERIFICATION.md packages/cli/src/render/theme-utilities.ts`
  - confirms the preserved root_cause evidence, explicit `03-03-PLAN.md` rerun path, `2xl` review-token fix, and updated size ladder wording all live in the committed artifacts
- `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md`
  - manual UAT rerun result: `1 passed, 0 issues`
  - preserved gap history: `rerun_passed_via_03-03-PLAN.md` with the original user report and root-cause record still intact below the passing rerun result
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`
  - outer built-in date-time shell still renders through `Text size="xl"`
- `packages/cli/fixtures/phase-22/config.emulator-demo.yml`
  - committed review path now uses inner `<2xl>` on the main time line, which exceeds the outer shell baseline instead of matching it
- `packages/cli/src/render/theme-utilities.ts`
  - shared size utilities now keep the same public tokens while widening the size ladder enough that `xl` and `2xl` no longer read as a near-miss on the review path

## Residual Notes

- Phase 3 core behavior and the `03-03` size-contrast closure are now implemented, verified in code, and confirmed by the rerun UAT, while the original failed history remains preserved in `.planning/phases/03-rich-date-time-formatting-surface/03-UAT.md` rather than being rewritten away.
- No new public size name was introduced; the closure uses the existing shared `2xl` token and a wider shared size ladder instead of widget-local styling.
- Next at the time of closure was `/review`, and active workflow routing has since moved forward into Phase 4 verification-and-contract cleanup work.
