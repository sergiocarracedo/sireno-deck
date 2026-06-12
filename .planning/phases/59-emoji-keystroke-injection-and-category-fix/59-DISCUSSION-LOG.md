# Phase 59: Emoji keystroke injection + category fix - Discussion Log

**Gathered:** 2026-06-11
**Mode:** standard

## Areas discussed

### 1. pasteText wiring location (3 sub-questions)
**Sub-question 1a: API shape**
- **A) Extend `methods.pasteText(text)` in place** (chosen)
- B) New `methods.sendText(text, pasteKey?)` method

**User rationale for A:** Existing call sites continue to work; emoji selector gets the fix transparently. The wrapper is invisible to addon authors. Single `pasteText` API is simpler than two parallel methods.

**Sub-question 1b: Opt-out mechanism**
- **A) Config-level: `paste.keystroke: false`** (chosen)
- B) Per-button override
- C) Runtime option only

**User rationale for A:** Config-level is the right grain for a global behavior. Users shouldn't have to mark every button. The `paste.*` config namespace groups it semantically with other paste-related settings (future-proofing for things like `paste.delay` if needed).

**Sub-question 1c: Error semantics**
- **A) Throw — let runtime error UX handle it** (chosen)
- B) Log and continue (silent)
- C) Try/catch with structured error

**User rationale for A:** The whole point of EMO-15/16 is that the paste actually happens. If the provider fails, the user needs to know. The Phase 5 runtime error UX (warning triangle + 4-digit code) is the right surface for this. No silent degradation.

### 2. EMO-17 category audit depth
- **A) Just confirm no overlap (no action)** (chosen)
- B) Audit all 11 categories pairwise + sub-issues
- C) Audit + fix launcher grid visual confusion

**User rationale for A:** Phase 57 already did the `comm -12` audit. The data is clean. EMO-17 is satisfied by documenting the outcome (1-2 sentences in VERIFICATION.md). The user's original concern was visual confusion from the launcher grid, not a data overlap — that's a UX issue, not an EMO-17 issue. Out of scope for this phase.

### 3. Backward compat for select_command users
- **A) Add paste keystroke to all current callers** (chosen)
- B) Add paste keystroke only to emoji selector, not select_command
- C) Make it explicit: require new config field to opt in

**User rationale for A:** All existing callers of `methods.pasteText` get the new behavior. This includes the emoji selector's hard-coded calls AND any user-defined `select_command: "..."` flows. Users who don't want it set `paste.keystroke: false`. The 99% case (users who want emoji to paste) gets it without any config change. Forcing opt-in would be a regression for the user.

### 4. Test approach for cross-platform keystroke
- **A) Mock keyMacroProvider in unit tests, defer integration to UAT** (chosen)
- B) Run real xdotool/osascript in CI
- C) Snapshot the keyMacro calls

**User rationale for A:** Mocking the provider in unit tests gives reliable, fast CI coverage of the wiring (correct sequence, correct platform key, opt-out respected, error propagation). Real-platform integration testing (verifying xdotool actually pressed Ctrl+V) is hard to make reliable in CI and deferred to manual UAT. This is consistent with how other platform-specific behavior is tested in the codebase.

## Areas delegated to agent's discretion

- Whether to add a `// INSTRUMENT` debug log when the paste keystroke is fired.
- Whether to extract a `getPlatformPasteKey(hostContext)` helper or inline the ternary.
- Exact wording of the `paste.keystroke: false` field name (user picked `paste.keystroke` — preserve that).

## Deferred ideas

- **Launcher grid visual confusion** — the 6-emoji launcher grid (😂 🔥 ❤️ ⭐ 🍕 🎵) contains 😂 which also appears in the smileys category. The user's original "duplicated" perception is from this visual layout, not from a data overlap. This is a UX issue, not an EMO-17 issue. Could be addressed in a future emoji UX phase or Phase 64+ chrome overlay extension work.
- **`paste.delay` config field** — for users who want a delay between clipboard write and paste keystroke. Not in scope for this phase but the `paste.*` config namespace is set up to accommodate it.

## Out of scope

- Render pipeline performance (Phase 58 — shipped)
- Overlay auto-show (Phase 62)
- Pagination button redesign (Phase 60)
- Icon updates (Phase 61)
- Settings deck revamp (Phase 63)
- Chrome overlay extension (Phase 64)
- Any work on the key-macro provider itself (already cross-platform from Phase 49 / Quick 042)

## Decisions summary

1. **API:** Extend `methods.pasteText(text)` in place. No new `sendText` method.
2. **Opt-out:** Config-level `paste.keystroke: false` (default true).
3. **Errors:** Throw, let runtime error UX handle it (warning triangle + 4-digit code).
4. **EMO-17:** Confirm only, document in VERIFICATION.md.
5. **Backward compat:** All current callers get the new behavior; opt-out is the only escape hatch.
6. **Tests:** Mock `keyMacroProvider` in unit tests; defer real-platform testing to manual UAT.
