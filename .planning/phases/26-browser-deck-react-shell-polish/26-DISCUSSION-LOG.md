---
phase: 26
slug: browser-deck-react-shell-polish
areas_discussed:
  - React boundary
  - Undersized device policy
  - Chrome fidelity
  - Startup mosaic behavior
created: 2026-05-26
---

# Phase 26: Browser Deck React Shell Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 26-browser-deck-react-shell-polish
**Areas discussed:** React boundary, Undersized device policy, Chrome fidelity, Startup mosaic behavior

---

## React boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Keep document string seam | Refactor `button-frame.tsx` and inner deck shell into JSX components, but keep `renderDomDeck()` as the final HTML-document/string boundary. | |
| Make full deck document a React tree | Treat the whole browser deck page as one React document tree and stringify only at the final transport boundary. | ✓ |
| Only convert ButtonFrame | Limit the phase to the default button frame syntax/style and keep the rest of the shell as-is. | |

**User's choice:** `Make full deck document a React tree`
**Notes:** The user explicitly broadened the phase beyond a syntax cleanup. The browser page shell itself becomes the React composition boundary.

| Option | Description | Selected |
|--------|-------------|----------|
| One shared document | Browser mode and emulator mode share one top-level document component. | ✓ |
| Shared core, separate wrappers | Share deck internals but keep different top-level documents for daemon/browser capture and emulator serving. | |
| Separate documents | Treat browser mode and emulator mode as different top-level UIs. | |

**User's choice:** `One shared document (Recommended)`
**Notes:** This preserves the earlier one-real-browser-path principle and avoids the emulator becoming a second UI product.

---

## Undersized device policy

| Option | Description | Selected |
|--------|-------------|----------|
| Render visible subset + persistent warning | Render what the selected virtual device can display and keep a persistent warning visible. | ✓ |
| Render subset + dismissible warning | Render the visible subset, but let the warning be dismissed. | |
| Keep hard error | Preserve the current `Emulator Layout Error` hard-stop page. | |

**User's choice:** `Render visible subset + persistent warning (Recommended)`
**Notes:** This intentionally changes the current Phase 22 policy from hard failure to usable-but-honest degradation.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline shell banner | Put the warning inside the shared deck document above the deck chrome. | ✓ |
| Browser chrome header | Keep the warning outside the shell in page-level chrome. | |
| Per-missing-key markers | Only mark missing/hidden state inside the deck grid. | |

**User's choice:** `Inline shell banner (Recommended)`
**Notes:** The mismatch stays honest inside the same document users are actually rendering, without inventing separate page chrome.

---

## Chrome fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate physical shell | Add bezel, real button gaps, empty wells, and restrained glass/highlight treatment. | ✓ |
| High-fidelity shell | Push hard on reflections, shell depth, and hardware mimicry. | |
| Minimal layout polish | Mostly do the JSX/document refactor with only small shell tweaks. | |

**User's choice:** `Moderate physical shell (Recommended)`
**Notes:** The user wants a more faithful Stream Deck feel without turning the phase into a photoreal hardware-skin project.

---

## Startup mosaic behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Shell-owned full-grid mosaic | Use the shared React document to render all visible keys as a startup mosaic based on `assets/logoFull.png`, then hand off on first real deck render. | |
| Device-size cropped mosaic | Render a cropped mosaic only across visible keys in the selected virtual device. | |
| Static loading card | Keep startup simple with `assets/logoFull.png` in a non-React loading card/state. | ✓ |

**User's choice:** `Static loading card, but without using react as browser is not available at this moment, the simpliest way`
**Notes:** This deliberately keeps startup waiting state on the pre-browser seam rather than forcing the new shared React document to own a state it cannot honestly render yet.

---

## Agent's Discretion

- Exact component/file boundaries for the shared React document and browser shell internals.
- Exact visual implementation of moderate bezel/gap/glass treatment.
- Exact warning copy and styling, as long as it is persistent and inline.
- Exact loading-card implementation details using `assets/logoFull.png` outside the browser-only React path.

## Deferred Ideas

- Photoreal browser shell rendering.
- A browser-owned React startup mosaic that only appears after the browser page already exists.
- Theme-owned outer shell layout or warning surfaces.
- Reverting to a hard error-only undersized-device page in this phase.

---

*Phase: 26-browser-deck-react-shell-polish*
*Discussion log generated: 2026-05-26*
