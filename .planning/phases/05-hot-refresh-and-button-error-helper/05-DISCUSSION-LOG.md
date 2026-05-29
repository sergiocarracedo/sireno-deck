---
phase: 5
slug: hot-refresh-and-button-error-helper
areas_discussed:
  - Hot refresh scope
  - Error helper surface
  - Diagnostic contract
  - Refresh trigger policy
created: 2026-05-30
---

# Phase 5: Hot Refresh and Button Error Helper - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 05-hot-refresh-and-button-error-helper
**Areas discussed:** Hot refresh scope, Error helper surface, Diagnostic contract, Refresh trigger policy

---

## Hot refresh scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both seams | Treat the existing `tsx watch` dev loop and the in-process `start.ts` reload path as one Phase 5 contract with explicit boundaries for each. | ✓ |
| Dev loop only | Limit Phase 5 to the external `cli:dev` / `tsx watch` workflow. | |
| In-process only | Limit Phase 5 to `start.ts` runtime reload behavior. | |

**User's choice:** `Both seams`
**Notes:** The repo already ships both refresh seams. Phase 5 should make them honest together instead of pretending one of them is not part of the live product path.

---

## Error helper surface

| Option | Description | Selected |
|--------|-------------|----------|
| Button helper plus full-deck config | Use the new helper for button-facing runtime/render/action failures, but keep invalid config reloads on the existing temporary full-deck error surface. | ✓ |
| One shared primitive everywhere | Promote the new helper into the general runtime error surface, including config reload failures. | |
| Button helper only for mounted | Keep the helper narrow and use it only for mounted button/runtime failures. | |

**User's choice:** `Button helper plus full-deck config`
**Notes:** This preserves the already-proven config reload fallback deck while still adding the new compact button-facing error contract Phase 5 was meant to deliver.

---

## Diagnostic contract

| Option | Description | Selected |
|--------|-------------|----------|
| Deck+button aware logs | Require logs to include deck id, button position, button type, and error code, while keeping the button UI compact. | ✓ |
| Minimal logs only | Only require the four-digit code and a compact log line. | |
| Verbose user-visible details | Expose richer diagnostic detail directly on the button/deck surface. | |

**User's choice:** `Deck+button aware logs`
**Notes:** The useful detail belongs in logs, not in cramped button UI. The compact button surface should point operators to richer runtime context rather than trying to carry it all visually.

---

## Refresh trigger policy

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit full reload first | Prefer honest full runtime rebuild/reload behavior first, and only use narrower invalidation where the runtime already owns that seam explicitly. | ✓ |
| Mixed targeted refresh | Add narrower button/render refresh behavior for some source edits while falling back to full reload elsewhere. | |
| Aggressive fine-grained refresh | Aim for the narrowest possible refresh path for render/source edits even if it expands runtime complexity. | |

**User's choice:** `Explicit full reload first`
**Notes:** This keeps runtime truth understandable. Fine-grained refresh can only earn its way in where the existing runtime seam already owns invalidation explicitly.

---

## Agent's Discretion

- Exact watch/reload ownership boundary between the external `tsx watch` loop and the in-process `start.ts` reload graph.
- Exact runtime hook where the shared button-facing error helper should be wired with the least contract churn.
- Exact four-digit error-code allocation and logging shape needed to keep diagnostics useful without inventing a whole new error platform.

## Deferred Ideas

- Global error-surface unification across every runtime/config/startup failure.
- Aggressive fine-grained refresh across arbitrary source edits.
- Broader runtime architecture rewrites beyond the honest hot-refresh and button-error seams in scope here.

---

*Phase: 05-hot-refresh-and-button-error-helper*
*Discussion log generated: 2026-05-30*
