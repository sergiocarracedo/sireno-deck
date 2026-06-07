# Plan 49-05 Summary

**Completed:** 2026-06-07

## What was built

A1 from the 49-CONTEXT post-ship amendments. The per-OS `execa`-spawned clipboard writes in `packages/cli/src/util/clipboard.ts` are replaced with a single `clipboardy.write(text)` call. The per-OS paste keystroke (`osascript` / `xdotool` / PowerShell `SendKeys`) stays — only the clipboard write side collapses to a single dependency. The dead `select_command_shortcode` schema field is removed, and the per-emoji `onDblTap` is simplified to a direct `methods.pasteText(`:${shortcode}:`)` call when the catalog knows a shortcode.

## Key files

- `packages/cli/src/util/clipboard.ts` — MODIFIED. Replaced the three per-OS `execa` branches in `writeClipboard` with a single `clipboardy.write(text)`. Removed the `shellQuote` and `powershellQuote` helpers and the `shellQuote` re-export (no external callers). `getPlatform`, `simulatePaste`, `detectPasteTool`, and the public `pasteText` / `checkPasteAvailable` exports are unchanged. `execa` remains a dep (still used by `simulatePaste`).
- `packages/cli/src/util/clipboard.test.ts` — NEW. 5 tests: clipboard receives the pasted text, clipboard write happens before the paste keystroke (call order), `clipboardy.write` errors are surfaced, `simulatePaste` errors are surfaced, and `checkPasteAvailable` reports true when the host paste tool is present. Uses `vi.hoisted` to share mocks between the hoisted `vi.mock` factory and the test bodies.
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — MODIFIED. Dropped the `select_command_shortcode` optional field (and its describe string) from `EmojiEntryButtonSchema`. No repo config or test references the field by name; removal is safe.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — MODIFIED. Removed the `resolveDblTapCommand` function (the only consumer of `select_command_shortcode`). The new `onDblTap` is `const shortcode = getEmojiShortcode(config.emoji); if (shortcode) await methods.pasteText(`:${shortcode}:`)`. The single-tap path (`runCommand` if `select_command` is set, else `pasteText(emoji)`) is unchanged.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — MODIFIED. Added `pasteText: async () => {}` to the `mountedButtonMethods` mock so the new dbl-tap tests can call the harness. Added two new tests: "pastes the shortcode on double-tap when the catalog knows one" (asserts `:grinning:` for `😀`) and "is a no-op on double-tap when the catalog has no shortcode for the emoji" (uses `💩`, which is not in the catalog).
- `packages/cli/package.json` + `pnpm-lock.yaml` — MODIFIED. Added `clipboardy ^4.0.0` to dependencies. v5.x is available; v4 is pinned per the plan.

## Decisions made

- `clipboardy` is imported as the default export (`import clipboardy from 'clipboardy'`) per its v4 type declarations. `clipboardy.write(text)` is the only API used.
- The `simulatePaste` per-OS path is intentionally preserved. The user's complaint was that emojis were copy-pasted (clipboard → Cmd/Ctrl+V) at all. The new flow is the same write-then-paste shape, but the clipboard write goes through `clipboardy` (a battle-tested cross-platform wrapper that handles the OS quirks, e.g. WSL / sandboxed apps / headless `wsl$clip.exe` fallback). The paste keystroke stays because the target app must still accept the input.
- The `select_command_shortcode` field was never wired into the runtime: the `resolveDblTapCommand` function existed but the addon never actually delivered the shortcode via the per-OS shim. Removing the field is honest. The A1 amendment turns dbl-tap into a straightforward `pasteText(`:${shortcode}:`)` — no config knob.
- Dbl-tap becomes a no-op (not an error) when the catalog has no shortcode for the emoji. This matches the original "if no `select_command` configured and no shortcode, do nothing" semantics for the unused `select_command_shortcode` override.

## Verification

- `vitest run src/util/clipboard.test.ts` → 5/5 pass.
- `vitest run src/builtin-addons/emoji-selector/index.test.ts src/util/clipboard.test.ts` → 18 of 21 emoji-selector tests pass plus 5/5 clipboard tests = 23 pass; 3 emoji-selector tests fail. The 3 failures are pre-existing, unrelated to this plan:
  - "renders the real unicode glyph for non-branded emojis via the native font stack" — fails because the WIP commit `921a86e` migrated the emoji glyph render to use `<Label>` and the test still asserts `text-5xl` in the HTML.
  - "paginates categories with more emojis than fit on one page" — fails with `expected 13 to be 12` because `921a86e` bumped `EMOJI_PAGE_SIZE` from 12 to 13.
  - "treats EMOJI_PAGE_SIZE+1 favorites as 2 pages with prev on page 2 and no next" — same root cause (`+1` of 12, but the runtime now produces `+1` of 13).
- `tsc --noEmit` baseline check: 268 errors before, 268 errors after. Zero new typecheck errors introduced. Pre-existing errors include `dom-host.test.tsx` missing `pasteText` in its mock (caused by `5593c95` adding `pasteText` to `AddonButtonMethods` but not updating that test mock) and the `text-[10px] opacity-70` Tailwind arbitrary values.
- `pnpm lint` (oxlint) reports the same pre-existing errors as the baseline. No new lint issues introduced.

## Notes for downstream

- The 3 pre-existing test failures and the dom-host mock gap are tracked as 49-05 follow-up work, not as blockers for the A1 amendment. Plan 49-05 delivers exactly what A1 asked for: the clipboardy migration, the dead-field removal, and the dbl-tap simplification.
- `clipboardy` v4 is ESM-only. The cli package is `"type": "module"`, so this is consistent. If the package is ever bundled for SEA (single-executable application), clipboardy's native fallbacks (`wsl$clip.exe`, etc.) are loaded via dynamic import; the `node-sea-not-viable-for-native-deps-2026-06-05` solution in `.planning/solutions/` is still relevant.
- The build still imports `execa` (for `simulatePaste`). It is NOT a candidate for removal in this plan.
- The uncommitted tree (after this commit) contains a global find-and-replace of relative imports to the `@/` alias, performed by an untracked `scripts/quick-039-rewrite-imports.mjs`. This is out of scope for 49-05 and was not touched by this plan.
