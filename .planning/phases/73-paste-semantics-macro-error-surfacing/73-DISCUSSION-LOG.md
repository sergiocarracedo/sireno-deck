# Phase 73 Discussion Log

## 2026-06-17 — discuss-phase

**Participants:** User, Agent
**Mode:** standard discuss
**Phase slug:** paste-semantics-macro-error-surfacing
**Requirements scoped:** BUG-05 (`pasteText` not actually pasting), BUG-06 (keyMacroProvider silent failures)

### Discussion flow

1. **Read REQUIREMENTS.md** for BUG-05 and BUG-06. Both are clearly scoped changes to existing behavior.
2. **Scouted the codebase** to establish current state:
   - `clipboard.ts` — `pasteText` only clipboard, no keystroke
   - `runtime.ts` — two handler sites (`paste` and `keyMacro`)
   - Three platform providers (linux/darwin/windows) — all swallow errors
   - `RuntimeButtonErrorKind` — 9 values, none for key-macro
3. **Gray area: paste keystroke mechanism**
   Proposed writing new platform-specific paste utility vs reusing `keyMacroProvider`. Resolution: reuse `keyMacroProvider.send(parseKeyMacro('ctrl+v'))` — avoids duplicating platform detection and keystroke injection.
4. **Gray area: error handling for pasteText**
   Two failure points: clipboard write and paste keystroke. Both surface via `showRuntimeButtonError`.
5. **Gray area: key-macro error surfacing**
   Providers throw on failure → runtime catches → `showRuntimeButtonError(error, button, deckId)` with new `"key-macro"` error kind.
6. **Gray area: timing** between clipboard write and paste keystroke — no delay needed.
7. **Emoji selector path** (`pasteText(':grinning:')`) automatically benefits — no additional changes needed.
8. **Decision captured:** All gray areas resolved, user confirmed "Ready".

### Open questions (none)

### Decisions
- Reuse `keyMacroProvider.send(parseKeyMacro('ctrl+v'))` for paste keystroke
- Both clipboard and keystroke failures surface via `showRuntimeButtonError`
- Add `"key-macro"` to `RuntimeButtonErrorKind`
- Three providers throw on failure instead of swallowing
- No delay between clipboard write and paste keystroke
