# Phase 5 Discussion Log — Overlay Decks

**Date:** 2026-07-17
**Mode:** deep
**Phase:** 05-overlay-decks

---

## Area 1 — Window-name match shape

**Options considered:**
- **A (chosen):** Keep globs (`*`, `?`, `|`, case-insensitive). Spotify-on-chrome = `*Spotify*`. No schema change.
- **B:** Add optional regex literal syntax `/(...)/i`. Backward compatible but extra code + docs.
- **C:** Replace globs with full regex. Breaking change.
- **D:** Rename `window_name` → `window_title`. Deprecate old name.

**Decision:** A — keep current globs. The user's regex-literal example was illustrative, not prescriptive.

---

## Area 2 — autoShow semantics

**Options considered:**
- **A:** `false` = available only; `true` = instant flip. **(Chosen, recommended.)**
- **B:** `true` = arm-only, flip on first dbltap (no dbltap needed once armed).
- **C:** `autoShow=true` means a single tap on toggle flips (no dbltap required once armed).
- **D:** Drop `autoShow`; every matching overlay auto-shows.

**Decision:** A. `autoShow` is read at trigger-match time; instant flip when true, available-only when false.

---

## Area 3 — Independent overlay nav history

**Options considered:**
- **A (chosen, recommended):** Separate `overlayNavStack` per overlay deck (`Map<overlayDeckId, string[]>`). Regular layer keeps `navStack`.
- **B:** Single shared `overlayNavStack`.
- **C:** No isolation; overlay is a transient deck with no internal navigation.

**Decision:** A — per-overlay-deck stack. User explicitly required "each overlay main deck generates a different history".

**Follow-up: retention**
- **X (chosen, recommended):** Persist for session lifetime.
- **Y:** Reset on dismiss.
- **Z:** Persist only while trigger remains matched.

**Decision:** X. Re-activating a previously used overlay restores where the user was.

**Follow-up: empty overlay history back behaviour**
- **P (chosen, recommended):** Dismiss overlay and return to regular layer.
- **Q:** No-op (user must dbltap toggle).

**Decision:** P.

---

## Area 4 — OverlayToggle gesture + icon

**Icon source options:**
- **A (chosen, recommended):** Runtime plumbs `overlayDeckIcon` via `deck-config` message.
- **B:** Hardcode `icon://layers`.
- **C:** Frontend queries addon registry by deckId.

**Decision:** A.

**Gesture options:**
- **A:** tap on overlay-toggle. **(User originally asked for dbltap.)**
- **B (chosen):** dbltap on overlay-toggle — matches user spec.
- **C:** Both tap and dbltap.

**Decision:** B.

---

## Area 5 — Back-button onhold jump

**Target options:**
- **A (chosen, recommended):** Jump to `navStack[0]` (the isMain deck).
- **B:** Jump to top of regular navStack (`navStack[navStack.length-1]`).
- **C:** Same as dbltap toggle (dismiss overlay).

**Decision:** A. Matches user's literal spec: "Back button onhold gesture must navigate to deck layer main deck".

---

## Area 6 — Trigger semantics + multi-overlay priority

**AND/OR semantics:**
- User correction: triggers use **AND** between `process_name` and `window_name`. Both are optional. OR within a field.
- **(Confirmed):** A field with no patterns is treated as a pass.

**Multi-overlay priority options:**
- **A (chosen, recommended):** Most-specific wins (both-field beats single-field); tie-break by config declaration order.
- **B:** First-declared wins.
- **C:** Last-declared wins.

**Decision:** A.

---

## Area 7 (extra) — Overlay deck's n-1 button shape

**Options:**
- **A (chosen, recommended):** Same SplitSurface as regular decks (back + overlay-toggle).
- **B:** Single overlay-toggle button (no back).

**Decision:** A. User spec said overlay n-1 should still split back + toggle overlay.

---

## Deferred ideas

- Lock deck → future phase.
- Per-overlay custom toggle icon override → future polish phase.
- Layer-flip animations → future polish phase.
- Disambiguation UI when multiple overlays match → future if needed.

---

## Areas delegated to Agent's Discretion

- Exact frontend rendering of the matched deck icon inside the SplitSurface.
- Whether dbltap indicator stays `dbltap` or flips to `tap` once toggle becomes the primary affordance (recommendation: keep `dbltap`).
- Polling interval (1s) and debounce (200ms) for active-app snapshots.
- Back-button hold behaviour inside regular layer (no-op vs pop-to-root) — pre-existing, not in phase scope.

---
