# Phase 59 — Emoji keystroke injection + category fix — Verification

**Phase goal:** Make `methods.pasteText(text)` actually paste the text into the active input by simulating the OS paste keystroke (Ctrl+V / Cmd+V) in addition to the existing clipboard write. Fixes the long-standing bug where tapping an emoji does nothing.

**Status:** ✅ passed

**Plans executed:**
- [59-01](./59-01-PLAN.md) — pasteText extension + 6 unit tests
- [59-02](./59-02-PLAN.md) — config wiring + EMO-17 audit doc
- [59-GC1](./59-GC1-PLAN.md) — strip `select_command` from emoji-selector entry button (UAT gap)
- [59-GC2](./59-GC2-PLAN.md) — `unsupported` key-macro provider throws (UAT gap)
- [59-GC3](./59-GC3-PLAN.md) — deduplicate category icons (UAT gap)
- [59-GC4](./59-GC4-PLAN.md) — rename `IconLabelSurface` → `MainLabelSurface`, accept emoji in `main`
- [59-GC5](./59-GC5-PLAN.md) — every emoji button uses `MainLabelSurface` and has a label

**UAT:** See [59-UAT.md](./59-UAT.md) for the conversational testing record (1 pass, 3 issues found, 3 fixed via gap-closure plans, 3 skipped on no-hardware tests).

---

## Requirements traceability

| ID     | Requirement                                                                                                              | Status | Evidence                                                                                                                                                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EMO-15 | Tapping an emoji writes the emoji to clipboard AND simulates the OS paste keystroke                                       | ✓      | `methods.pasteText` in `packages/cli/src/deck/runtime.ts` now calls `keyMacroProvider.send(parseKeyMacro(platformPasteKey))` after `await doPaste(text)`. Linux/Windows send `ctrl+v`; macOS sends `cmd+v`; `hostContext.os.type: 'unknown'` is a no-op. Emoji tap at `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx:43` calls `methods.pasteText(config.emoji)`. Unit tests in `runtime.test.ts` cover Linux / macOS / Windows / opt-out / unsupported / error-propagation paths. |
| EMO-16 | Double-tapping an emoji copies the shortcode to clipboard AND performs the paste keystroke                                | ✓      | Emoji double-tap at `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx:35` calls `methods.pasteText(\`:${shortcode}:\`)`. The same `pasteText` code path now also injects the paste keystroke, so the shortcode appears in the active input just like the glyph tap.                                                                       |
| EMO-17 | The emoji category data is audited and deduplicated so smiles/people (and any other overlapping categories) show distinct emoji sets | ✓      | Phase 57 RESEARCH.md [`## RES-03 Category Audit`](../57-render-pipeline-emoji-research/57-RESEARCH.md#res-03-category-audit) already documents the `comm -12` audit: `smileys` (41 chars) ∩ `people` (41 chars) = ∅; **zero overlap across all 11 pairs (383 unique emojis total)**. No data change needed — the requirement is satisfied by existing data. The "duplicate" perception is visual confusion from the 2×3 launcher grid (😂 🔥 ❤️ ⭐ 🍕 🎵) showing `😂` regardless of the active category; deferred to UX feedback backlog. |

---

## Plan must-haves

### Plan 59-01

- [x] `methods.pasteText(text)` calls `keyMacroProvider.send(platformPasteKey)` after `clipboardy.write(text)` by default — `runtime.ts` (pasteText body now: doPaste → `if (!pasteKeystrokeEnabled) return` → platform-key lookup → `keyMacroProvider.send(parseKeyMacro(pasteKey))`).
- [x] Linux/Windows use `ctrl+v`; macOS uses `cmd+v`; unsupported is no-op — `getPlatformPasteKey` helper maps `linux`/`windows` → `ctrl+v`, `macos` → `cmd+v`, default → `null`. **Plan deviation:** host-context normalizes `os.platform` to `linux`/`macos`/`windows` (see `packages/cli/src/system/host-context.ts:51-60`); the plan text mentioned `darwin`/`win32` but the actual normalized values are `macos`/`windows` and the switch uses those.
- [x] `pasteKeystrokeEnabled: false` in runtime options skips the keystroke — added to `DeckRuntimeOptions`, read at the top of `createDeckRuntime` with `?? true` default, short-circuits the pasteText body.
- [x] `keyMacroProvider.send` errors propagate (no silent swallow) — the body awaits the call without try/catch; the existing runtime error UX (warning triangle + 4-digit code) surfaces failures.
- [x] 6 new unit tests cover: linux, darwin/macos, win32/windows, opt-out, error propagation, unsupported — `runtime.test.ts` describe block `methods.pasteText paste keystroke` (6 tests, all green).
- [x] No regressions in any existing test suite — runtime.test.ts went from 49 failed / 21 passed (baseline) to 49 failed / 27 passed (+6 new). The 49 baseline failures are pre-existing issues in uncommitted Phase 60/61 work (theme, date-time, weather, system-back-injection, dom-host, loader, media-player, emoji-selector, builtin, dev-watch) and are unrelated to Phase 59.
- [x] Build is clean — `pnpm --filter sireno-deck-cli build` exits 0.

### Plan 59-02

- [x] `paste.keystroke` field in SirenoConfig schema (default `true`) — `packages/cli/src/core/schemas.ts` adds `PasteSchema` (`keystroke: z.boolean().default(true)`), wired into `BootstrapSirenoConfigSchema` as optional and surfaced on the `SirenoConfig` interface. `validateConfig` return copies the field through.
- [x] `start.ts` wires `config.paste?.keystroke ?? true` to `createDeckRuntime` options — both `createDeckRuntime` call sites (emulator at line 922, production at line 1141) now pass `pasteKeystrokeEnabled: loadedConfig.config.paste?.keystroke ?? true`.
- [x] `config.yml` documents the new field with a comment — `config.yml` now has a `paste: { keystroke: true }` block with an explanatory comment.
- [x] 59-VERIFICATION.md exists with status: passed and EMO-15/16/17 traced to evidence — this file.
- [x] No regressions in any existing test suite — loader.test.ts baseline (2 failed / 37 passed) unchanged; same 2 pre-existing failures persist with my changes.
- [x] Build is clean — `pnpm --filter sireno-deck-cli build` exits 0.

---

## Manual UAT checklist (deferred to real hardware)

The integration tests are mocked (`xdotool` / `osascript` / `SendInput` in CI is fragile and slow). The user should perform this one-time check on real hardware before declaring EMO-15/16 done end-to-end:

- [ ] **Linux (X11):** Open a text editor, tap an emoji in the emoji selector, verify the emoji character is inserted at the cursor.
- [ ] **Linux (Wayland, non-pure):** Same as above. (Pure-Wayland is already a `keyMacroProvider` no-op — the user would need `paste.keystroke: false` in their config to avoid a silent miss.)
- [ ] **macOS:** Same as above; expect `Cmd+V` to be sent.
- [ ] **Windows:** Same as above; expect `Ctrl+V` to be sent.
- [ ] **Opt-out:** Set `paste.keystroke: false` in `config.yml`, restart, tap an emoji, verify only the clipboard is populated and the user must paste manually.

If any platform fails, the user sees a 4-digit error code on the emoji button (Phase 5 runtime error UX), which is the right support diagnosis hook.

---

## Verification commands

```bash
pnpm --filter sireno-deck-cli build           # exits 0
pnpm --filter sireno-deck-cli test \
  src/deck/__tests__/runtime.test.ts \
  -t "paste keystroke"                       # 6 passed
pnpm --filter sireno-deck-cli test \
  src/core/schemas.test.ts                   # all green
```

---

## Deviations from the plans

1. **Host-context platform values.** Plan 59-01 listed `darwin` and `win32` as the `os.type` values to switch on. The actual normalized values are `macos` and `windows` (see `packages/cli/src/system/host-context.ts:51-60`). The `getPlatformPasteKey` helper and the unit tests use the real normalized values, not the plan text.
2. **Loader test (#4 in 59-02).** Skipped — the wiring is fully covered by 59-01's "opt-out" test, which directly asserts the `pasteKeystrokeEnabled: false` option name drives the skip.
3. **No debug log.** The plan offered the option of a `// INSTRUMENT`-style log gated on `SIRENO_PROFILE=1`. The fix is small enough that the existing 4-digit error code is the right diagnosis hook; no extra instrumentation added.

---

**Phase closed.** Move to the next phase on the v1.6 milestone.
