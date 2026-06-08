# Phase 54 Discussion Log — Settings deck with brightness controls

**Phase:** 54
**Discussed:** 2026-06-08
**Mode:** discuss (standard, not deep)

## Areas explored

### Logo+version surface: shared component vs inline duplicate (selected, refined)

**Initial question:** Logo+version currently lives in `system-back-button.tsx`. For the settings addon, do we extract into a shared component or duplicate inline?

**User clarification (in answer):** "Important, setting desk is not an addon, it's part of the core."

**Refined question:** Where does the logo+version element live now that the settings deck is core-managed?

**Options presented (refined):**
1. **Move into core, system-back-button imports it** (recommended) — new `packages/cli/src/ui/LogoVersion.tsx`; system-back-button imports it; the core-managed settings deck imports it.
2. **Keep data in system-back-button, render inline in settings** — duplicate the data reads.
3. **Single core helper, both consumers render own JSX** — small helper for the data; consumers render.

**User chose:** **Move into core, system-back-button imports it** (recommended). Confirmed.

**Reasoning captured:** The logo+version is a small, shared surface. Extracting it into `@/ui/LogoVersion` is the cleanest move. Both consumers (system-back-button's isMainDeck branch and the new core-managed settings deck) import the same element.

---

### Settings button on main deck: always-settings vs config-gated (selected)

**Question:** Should the main deck's reserved slot unconditionally become a settings button, or should it be config-gated (settings button only when a config flag is set)?

**Options presented:**
1. **Always settings button** (recommended) — breaking change for everyone; the settings deck exists for a reason.
2. **Config-gated via a new flag** — additive; users opt in to the breaking change.
3. **Config-gated via existing main_deck behavior** — settings button when the user has registered a settings addon.

**User chose:** **Always settings button** (recommended). Confirmed.

**Reasoning captured:** The settings deck is core-managed (per the clarification), so the main-deck reserved slot is unconditionally the settings button. The core ensures a default `settings` deck exists in the runtime's deck map, so the button always has a target. Backwards compat: old configs without a `settings` deck key fall back to the v1.4 logo+version on the main deck (no crash, no broken navigation).

---

### Brightness step granularity: 10% / 5% / 25% (selected)

**Question:** The settings deck's brightness up/down buttons adjust by how much per tap?

**Options presented:**
1. **10% steps as per ROADMAP** (recommended) — coarse but predictable.
2. **5% steps** — finer control.
3. **25% steps** — matches the phase-53 builtin-brightness-button.

**User chose:** **10% steps as per ROADMAP** (recommended). Confirmed.

**Reasoning captured:** ROADMAP says 10%. The two surfaces (settings up/down vs standalone brightness button) have different UX roles: the standalone button is "cycle through presets" (25% steps), the settings up/down is "fine-tune" (10% steps). Both are valid; the difference is intentional.

---

### Settings deck back button: standard vs custom (selected)

**Question:** The settings deck's reserved slot is what back-button affordance?

**Options presented:**
1. **Standard chevron+Back** (recommended) — same as every other subdeck.
2. **Custom "← Main" label** — distinguishes the settings deck as special.
3. **Standard chevron+Back with a different tone** — subtle distinction.

**User chose:** **Standard chevron+Back** (recommended). Confirmed.

**Reasoning captured:** The settings deck is just a subdeck. The standard back affordance is the right UX. A custom label would add an icon-override path through the back button code for no real benefit.

---

## Out-of-scope items surfaced

- **Brightness slider (continuous)** — out of scope; the up/down buttons are the starting point.
- **Settings deck for language / theme picker / addon enable-disable** — out of scope per the v1.5 prompt.
- **Auto-brightness policy** — out of scope.
- **A "sireno info" page** — out of scope; logo+version is the minimum viable info.
- **A settings gear icon** on the main-deck reserved slot — small visual upgrade; out of scope.

## Wrap-up

User confirmed all 4 decisions (with the clarification that the settings deck is core-managed, not a built-in addon). CONTEXT.md generated. Ready for `plan-phase 54`.
