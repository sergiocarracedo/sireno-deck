# Phase 57 — Discussion Log

**Date:** 2026-06-11
**Mode:** standard
**Facilitator:** opencode

## Areas Discussed

### 1. RES-01 profiling scope

**Question:** How deep should the profiling go to find the back button delay root cause?

| Option | Description | Verdict |
|---|---|---|
| **A. Instrumented runs only** | Add `pino` debug logs at runtime.ts hop boundaries, run back-button scenario in emulator + real hardware if available, measure ms per hop. | **SELECTED** |
| B. Static analysis only | Read code, identify awaits/loops/missing memoization, rank by complexity. Theoretical only. | Not selected |
| C. Full: static + instrumented + CPU profile | Run all three. Most thorough. | Not selected |
| D. Emulator-only, skip real hardware | Measure runtime + browser path only, miss USB transport delay. | Not selected |

**Rationale:** Instrumented runs give empirical data with low overhead. Static analysis is too theoretical; CPU profile is heavyweight and may not be available in CI. Real hardware USB transport is the biggest unknown — if the 1s delay is the USB write, we need real hardware runs to catch it.

---

### 2. RES-02 pasteText design

**Question:** How should the paste keystroke be plumbed into `pasteText`?

| Option | Description | Verdict |
|---|---|---|
| **A. pasteText wired in runtime** | `methods.pasteText` becomes a thin wrapper in `createDeckRuntime` that calls `keyMacroProvider.send(platformPasteKey)` after `clipboardy.write()`. `clipboard.ts` stays pure. | **SELECTED** |
| B. pasteText with keyMacroProvider arg | Extend `pasteText(text, provider?)` to accept a callback. Testable, explicit. | Not selected |
| C. New methods.sendText() | New `methods.sendText(text, pasteKey)` API. `pasteText` becomes legacy. | Not selected |
| D. Caller responsibility | Keep `clipboard.ts` pure. Update `emojiEntryButton.onTap` to call `methods.keyMacro('ctrl+v')` after `methods.pasteText(emoji)`. | Not selected |

**Rationale:** Option A keeps the existing `methods.pasteText` API surface identical (zero addon migration cost), keeps `clipboard.ts` testable as a pure function, and centralizes the platform-aware paste key in one place. Option D pushes complexity into every addon that wants to paste — bad ergonomics.

**Platform paste key:**
- Linux/Windows: `ctrl+v`
- macOS: `cmd+v`
- Pure-Wayland: `keyMacroProvider` returns `unsupported` adapter → keystroke is a no-op, `clipboardy.write` still runs (preserves Wayland behavior).

---

### 3. RES-03 category audit depth

**Question:** How deep should the emoji category audit go?

| Option | Description | Verdict |
|---|---|---|
| **A. Data audit only** | Confirm data has no overlap, document finding, move on. | **SELECTED** |
| B. Data + launcher + visual audit | Audit launcher grid + rendering for visual confusion. | Not selected |
| C. Drop RES-03 entirely | Mark resolved, defer to UX feedback backlog, remove from scope. | Not selected |

**Rationale:** Already verified via `comm -12`: `smileys` (41 chars) and `people` (41 chars) share zero emoji. The data is clean. User's perception of "duplication" is likely visual (the 2×3 launcher grid contains `😂` which also appears in the smileys category), and that's a UX feedback issue, not a data integrity issue.

**Backlog note:** Launcher grid (😂 🔥 ❤️ ⭐ 🍕 🎵) noted for UX feedback.

---

### 4. Research output format

**Question:** How should Phase 57 deliverables be captured?

| Option | Description | Verdict |
|---|---|---|
| **A. Single RESEARCH.md** | One `57-RESEARCH.md` with three sections (RES-01, RES-02, RES-03). | **SELECTED** |
| B. One SUMMARY.md per research item | Three docs. More granular, more files. | Not selected |
| C. Inline in plan-phase briefs | Findings captured directly in Phase 58/59/62 PLAN.md. | Not selected |
| D. STATE.md entries only | Loose notes, easy to lose. | Not selected |

**Rationale:** Single atomic research doc is easy to reference. Downstream plan-phase reads it once to build implementation plans. Splitting into three docs creates search overhead without value.

---

## Agent's Discretion

- Exact log line format and pino level for the instrumentation (consistent with existing runtime pino usage).
- Whether to add an opt-in flag to disable the new `pasteText` keystroke (recommend: yes, escape hatch, defaults to keystroke).

---

## Deferred Ideas

- User perception of "smiles/people duplicated" — UX feedback backlog
- Static analysis of render pipeline — re-evaluate if instrumented runs don't pinpoint
- CPU profile (`--prof` / `clinic.js`) — only if pino debug logs don't reveal hotspot
- Opt-in flag for paste keystroke — agent's discretion

---

*Discussion log — audit trail only. Downstream agents use CONTEXT.md, not this file.*
