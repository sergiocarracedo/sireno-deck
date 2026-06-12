# Phase 59: Emoji keystroke injection + category fix - Context

**Gathered:** 2026-06-11
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Make `methods.pasteText(text)` actually paste the text into the active input by simulating the OS paste keystroke (Ctrl+V / Cmd+V) in addition to the existing clipboard write. This fixes the long-standing bug where tapping an emoji does nothing because the runtime only writes to the clipboard, never pastes.

EMO-15 (tap) and EMO-16 (double-tap shortcode) are both satisfied by fixing the underlying `pasteText` method. EMO-17 (category audit) is a documentation-only outcome — Phase 57 research already confirmed via `comm -12` that the 11-category emoji dataset has zero overlap.

**Out of scope (per Phase 57):** render pipeline performance (Phase 58), overlay auto-show (Phase 62), pagination button redesign (Phase 60), icon updates (Phase 61), settings deck revamp (Phase 63), chrome overlay extension (Phase 64). Also out of scope: any work on the key-macro provider itself — it ships with cross-platform support from Phase 49/Quick 042 and needs no changes for this phase.

</domain>

<decisions>
## Implementation Decisions

### pasteText API shape — extend in place
- **Extend `methods.pasteText(text)` in place** to add the paste keystroke after the clipboard write.
- No new `methods.sendText()` method. Existing call sites (emoji selector tap, emoji selector double-tap, `select_command` substitution) get the fix transparently.
- The single `methods.pasteText` call site in the emoji-selector is at `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx:43` (tap) and `:35` (double-tap). No code change in the emoji-selector needed.
- The `select_command` path (`packages/cli/src/builtin-addons/emoji-selector/index.ts:50`) routes through the same `methods.pasteText`, so config-driven users also get the fix automatically.

### Opt-out mechanism — config-level
- Add a new config field `paste.keystroke: false` in `config.yml` to opt out globally. Default `true`.
- Per-button opt-out is rejected — the user shouldn't have to mark every button to disable a global behavior. Config-level is the right grain.
- Pure-Wayland platforms are already no-ops in the `key-macro` provider, so the opt-out is mainly for users on platforms where the keystroke simulation works but they don't want it.

### Error semantics — throw, let runtime error UX handle it
- If `keyMacroProvider.send(pasteKey)` throws, let the error propagate.
- The runtime already has a button-failure UX from Phase 5 (warning triangle + structured error code). The emoji tap will visibly fail with a 4-digit code if the keystroke provider is broken.
- No silent degradation — the whole point of EMO-15/16 is that the paste actually happens. If the provider fails, the user needs to know.

### EMO-17 category audit — confirm only, no code change
- Phase 57 RESEARCH.md already documents the `comm -12` audit showing zero overlap across all 11 categories (383 emojis total).
- Document the audit outcome in 59-VERIFICATION.md (1-2 sentences) and move on.
- The user's perception of "smiles/people duplicated" is visual confusion from the launcher grid (😂 🔥 ❤️ ⭐ 🍕 🎵 — 😂 also appears in the smileys category). This is a UX perception issue, not a data issue, and is out of scope for EMO-17 (the requirement is about distinct emoji SETS in the data, not about launcher visual design).
- Phase 64+ (chrome overlay extension) or a future emoji UX phase could address the launcher grid perception if the user wants.

### Backward compat — add paste keystroke to all current callers
- All existing callers of `methods.pasteText` get the new behavior (clipboard write + paste keystroke).
- This includes the emoji selector's hard-coded calls AND any user-defined `select_command: "..."` flows that substitute `{{emoji}}` into the command output.
- Users who DON'T want the new behavior set `paste.keystroke: false` in their config.
- Users who DO want the new behavior (the 99% case) get it without any config change.

### Test approach — mock keyMacroProvider, defer integration to UAT
- Unit tests in `runtime.test.ts` mock the `keyMacroProvider` option and verify:
  - `methods.pasteText(text)` calls `keyMacroProvider.send(platformPasteKey)` after `clipboardy.write(text)`.
  - Linux/Windows paste key is `ctrl+v`; macOS is `cmd+v`; unsupported is no-op (mock not called).
  - `paste.keystroke: false` in config skips the `keyMacroProvider.send` call entirely.
  - If `keyMacroProvider.send` throws, the error propagates to the caller.
- Cross-platform integration testing deferred to manual UAT — running real xdotool/osascript/SendInput in CI is fragile and slow.
- The mocked tests run the same `createDeckRuntime` setup used by the rest of `runtime.test.ts` so the wiring is exercised end-to-end (just with a stub provider).

### Agent's Discretion
- Whether to add a `// INSTRUMENT` debug log when the paste keystroke is fired (consistency with the SIRENO_PROFILE=1 pattern from Phase 58). The agent can decide based on whether debug logs would help future Phase 5/UX investigations.
- Whether to add a tiny helper for the platform-paste-key map (`{linux: 'ctrl+v', darwin: 'cmd+v', win32: 'ctrl+v', unsupported: null}`) or inline the ternary. Helper is cleaner; inline is fewer files touched.
- The exact wording of the `paste.keystroke: false` field name (alternatives: `paste.keystrokes: false`, `clipboard.paste: false`). The user picked `paste.keystroke` — preserve that.

</decisions>

<specifics>
## Specific Ideas

- The Phase 49 emoji-selector revamp is the prior art for this work — it shipped the `key_macro` system but never wired it into `pasteText`. This phase closes that loop.
- The 4-digit error code in the runtime error UX (Phase 5 work) means a broken keyMacroProvider on a user system will show as `Code 4101` or similar on the emoji button. Useful for support diagnosis.
- Platform detection: use the existing `hostContext.os.type` (`linux` | `darwin` | `win32`) rather than `process.platform` — the runtime already abstracts this and the config can override it for testing.

[If user adds specifics during planning, they go here.]

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/util/clipboard.ts` — current `pasteText` implementation. The fix extends this OR the runtime wrapper around it.
- `packages/cli/src/system/key-macro/` — the cross-platform keystroke provider. Phase 49 / Quick 042 established the architecture. `linux.ts`, `darwin.ts`, `windows.ts`, `unsupported.ts`, `parser.ts`.
- `packages/cli/src/deck/runtime.ts:983-986` — `methods.keyMacro` (the existing pattern; `pasteText` will follow the same shape).
- `packages/cli/src/deck/runtime.ts:390-391` — `keyMacroProvider` is already constructed from `options.keyMacroProvider ?? getKeyMacroProvider(...)`. The paste keystroke can re-use this same provider.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx:43` — emoji tap that calls `methods.pasteText(emoji)`.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts:50` — `select_command` substitution path.
- `.planning/phases/57-render-pipeline-emoji-research/57-RESEARCH.md` — Phase 57 RES-02 (pasteText design) + RES-03 (category audit).
- `.planning/solutions/best-practices/opt-in-env-var-instrumentation-pattern-2026-06-11.md` — established pattern for opt-in instrumentation (consistent style if the agent chooses to add a debug log).
- `.planning/solutions/performance-issues/skip-screenshot-when-html-unchanged-2026-06-11.md` — Phase 58 fix pattern, useful as a template for "extend an existing function with a small, well-scoped behavior change" (same shape as Phase 59).

</canonical_refs>

