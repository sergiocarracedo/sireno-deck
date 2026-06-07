## [11:10] Frame the HID shim downscope in 49-CONTEXT.md

**Context:** Phase 49's CONTEXT locked a per-OS HID keyboard-stroke shim (xdotool / osascript / PowerShell SendKeys). The implementation never shipped — `entry.tsx` kept using the `pasteText` clipboard path. The post-ship amendment A1 supersedes the original.

**Paths considered:**
- **A — SUPERSEDED (chosen):** Mark the original HID shim section as superseded by A1. Explicit, honest, preserves the original spec as historical context.
- **B — "Future" with current state "clipboardy":** Diplomatic, hides the gap. Risk: silent drift between docs and code.
- **C — Rewrite in place:** Erases the original decision context. Lossy.

**Chosen:** A

**Rationale:** CONTEXT is the source of truth. Hiding a downscope in a "future work" note creates a silent contract that doesn't reflect what shipped. SUPERSEDED makes the override explicit, dated, and preserves both states for future readers.

**Expected consequences:** Future readers see what was decided, what shipped, and when the override happened. If HID shim is ever revisited, the original spec is intact as a starting point.

**Outcome (to fill later):** _pending_

---
