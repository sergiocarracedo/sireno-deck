# Phase 62: Overlay autoShow — Discussion Log

**Date:** 2026-06-12
**Mode:** standard
**Facilitator:** discuss-phase workflow

---

## Area 1: Default value + addon plumbing

**Q1: What default should `autoShow` have?**

| Option | Verdict |
|--------|---------|
| `default true` (preserves current behavior) | rejected |
| **`default false`** (aligns with REQUIREMENTS.md) | **selected** |

**User rationale:** Align with the user-facing REQUIREMENTS.md doc. Current configs that rely on auto-show will need `autoShow: true` added explicitly.

**Q2: Can addons set `autoShow`?**

| Option | Verdict |
|--------|---------|
| User config only (single-stage) | rejected |
| **Both user + addons (two-stage)** | **selected** |

**User rationale:** Addons generate deck content. The runtime lets them declare other deck fields (`process_names`); `autoShow` is consistent with that pattern.

**Captured risk:** `default false` + two-stage plumbing means a fresh install of an addon that uses `process_names` will NOT auto-show the overlay until the user or addon adds `autoShow: true`. This is the intended behavior but worth flagging in the CHANGELOG.

**Pre-discussion conflict:** ACTIVEAPP-07 spec text said `default true`, REQUIREMENTS.md:16 said `default false`. User resolved in favor of the doc.

---

## Area 2: Summon semantics

**Q3: When dbltap summons in `autoShow: false` mode, which deck gets summoned?**

| Option | Verdict |
|--------|---------|
| **Live-matching deck** | **selected** |
| Last-dismissed (reuse `restoreLastDismissedOverlay`) | rejected |
| Snapshot when base deck entered | rejected |

**User rationale:** Most responsive — if the user switched apps, they get the new match. `lastDismissedOverlayDeckId` becomes dead code in this mode but stays for the `autoShow: true` path.

**Q4: Should the 2-line variant's "line 2 = overlay deck icon" track the live match?**

| Option | Verdict |
|--------|---------|
| **Yes, live update** | **selected** |
| No, snapshot once | rejected |

**User rationale:** Natural coupling with live-matching summon. The icon and name on line 2 reflect the current matching deck.

**Implementation note:** the dispatcher re-resolves the matching deck on every render. The matching is a cheap substring scan; no perf concern.

---

## Area 3: 2-line button layout

**Q5: How should the 2-line back button be implemented?**

| Option | Verdict |
|--------|---------|
| **Bespoke layout** (clone `OverlayToggleButton` structure) | **selected** |
| Extend `MainLabelSurface` with secondary line prop | rejected |
| Wrap two `MainLabelSurface`s in a parent flex | rejected |

**User rationale:** `MainLabelSurface` is for single-icon surfaces; extending it muddies its job. YAGNI on a shared `DualBadge` component (Phase 61 deferred it).

**Q6: What icon and text sizes fit a 72×72 key for 2-line?**

| Option | Verdict |
|--------|---------|
| **Icon 16, text xs, gap-0.5** | **selected** |
| Icon 18, text sm, gap-1 | rejected |
| Icon 20, text sm, gap-1.5 | rejected |

**User rationale:** Tightest packing. Each row gets ~32px vertical. Matches settings-deck brightness precedent (icon 32 single-row, 2-row splits the budget).

---

## Area 4: API surface + system-back test fix

**Q7: Should `summonOverlay(deckId)` be exposed on the runtime's public API?**

| Option | Verdict |
|--------|---------|
| **Private helper** | **selected** |
| Expose on runtime API (line 109) | rejected |

**User rationale:** Mirrors `dismissOverlay` privacy. No addon needs to summon yet; add the public method when one does.

**Q8: How should the 5 pre-existing `system-back-injection.test.ts` failures be handled?**

| Option | Verdict |
|--------|---------|
| **Include fix in Phase 62** | **selected** |
| Separate quick task | rejected |
| Defer entirely | rejected |

**User rationale:** The dispatcher needs the helper to gate the 2-line variant correctly. Including the fix in Phase 62 keeps the work atomic.

---

## Decisions summary

1. `autoShow: false` default, two-stage plumbing (user + addons).
2. Dbltap summons live-matching deck; 2-line variant tracks live match.
3. Bespoke 2-line layout: icon 16, text xs, gap-0.5.
4. `summonOverlay` is a private helper; 5 pre-existing test failures fixed in Phase 62.

## Agent's Discretion
- Exact regex for emoji extraction in the line 2 icon (re-use Phase 61's `^\p{Extended_Pictographic}` heuristic).
- Whether to add a `data-testid` on the 2-line variant for the new tests.
- Internal naming: `summonOverlay` vs `activateOverlay` vs `showOverlayForDeck` (will pick the clearest during plan-phase).

## Deferred ideas
- `processNamesMatch` exact match (future improvement).
- `DeckConfig.icon` field (future phase).
- Shared `DualBadge` / `OverlayIcon` component (future cleanup).
- Public `summonOverlay` runtime method (when first addon needs it).
- Per-platform 2-line sizing (when first non-72×72 device ships).
