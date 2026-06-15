---
description: Quick fix for emoji visual size and Linux keyMacro silent failures on the emoji selector
created: 2026-06-12
---

# Quick 045 — Fix emoji size + Linux keyMacro silent failures

> User-reported issues on real hardware after Phase 60 (pagination button redesign):
> 1. "the emojis are too big, ensure the main when is a text has the same size than the a svg"
> 2. "emojies are no copied to clipboard, but short codes do" (likely related to #3, or a separate dbltap-timing issue)
> 3. "no autopaste" (the paste keystroke doesn't fire after clipboard write)

## Tasks

### Task 1: Match emoji text size to the 30px SVG icons

**File:** `packages/cli/src/ui/surfaces/MainLabelSurface.tsx`

Change the emoji-char text rendering from `text-3xl` to `text-2xl` (line 49):

```typescript
{isString && !isIconSource(main)
  ? <span className="text-2xl leading-none">{main}</span>
  : <Icon {...iconProps} />}
```

**Why:** The SVG icons render at exactly 30×30 via `<Icon size={30} />`. The previous `renderEmojiGlyph` (before Phase 59 GC4) used `size="2xl"` for emoji chars, which Tailwind resolves to `text-2xl` (24px font-size, ~20-22px visible glyph height). This visually matches the 30×30 SVG better than `text-3xl` (30px font-size, ~26-28px visible glyph). The user reports the emoji is too big — `text-2xl` restores the prior visual baseline.

**Verify:** Run `pnpm --filter sireno-deck-cli test src/ui/surfaces/__tests__/MainLabelSurface`. The 4th test (`'renders an emoji char as a text glyph'`) currently asserts `toContain('text-3xl')` — update to `toContain('text-2xl')`.

**Done:** Emoji text rendering uses `text-2xl`; the assertion in the unit test reflects the new class.

### Task 2: Linux keyMacro must throw on xdotool failure

**File:** `packages/cli/src/system/key-macro/linux.ts`

The Linux key-macro provider's `runCommand` helper (lines 82-93) currently silently swallows executor failures:

```typescript
const result = await executor.run(program)
if (result.failed) {
  // Non-fatal: keep macro playing through unless the program is missing.
}
```

The comment says "Non-fatal: keep macro playing through unless the program is missing" but the code never throws. When `xdotool` fails (not installed, no `$DISPLAY`, permissions, etc.), the executor returns `{ failed: true }` and the provider silently no-ops. The user sees "clipboard has content but no autopaste" with no error.

Fix: throw when the executor reports a failure, so the runtime error UX surfaces a 4-digit code:

```typescript
const result = await executor.run(program)
if (result.failed) {
  const code = result.code ?? 'unknown'
  throw new Error(
    `xdotool key macro failed (exit ${code}). ` +
    `Common causes: xdotool not installed, no $DISPLAY, or insufficient X11 permissions. ` +
    `Set 'paste.keystroke: false' in config.yml to skip the keystroke and paste manually.`
  )
}
```

This is consistent with the Phase 59 GC2 fix to the `unsupported` provider, which already throws with a clear, actionable error message. The Linux path now follows the same pattern.

**Verify:** Run `pnpm --filter sireno-deck-cli test src/system/key-macro`. The existing tests at `get-provider.test.ts:130-148` should still pass (they use a fakeExecutor with `{ code: 0, failed: false }`). Add a new test that asserts the linux provider throws when the executor reports `failed: true`.

**Done:** Linux xdotool failures throw a clear error; the runtime error UX surfaces a 4-digit code on the emoji button (instead of silently no-op'ing).

### Task 3: Add a smoke test for the entry button's onTap path

**File:** `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`

The existing test `'pastes the emoji character on tap'` (added in Phase 59 GC1) uses `vi.fn()` for `pasteText` — it doesn't actually call `clipboardy.write`. The user is observing that real-hardware emoji tap doesn't write to the clipboard. Add a smoke test that exercises the same code path through the runtime with a mocked executor for the keyMacroProvider, asserting that:
- onTap fires
- methods.pasteText is called with the emoji char (the runtime implementation is responsible for calling clipboardy; this test verifies the wiring)

This is essentially a regression test for the Phase 59 GC1 work. It catches future changes that might accidentally route taps through a different code path.

**Verify:** Run `pnpm --filter sireno-deck-cli test src/builtin-addons/emoji-selector` — new test passes; existing tests unchanged.

**Done:** New regression test in place.

## Must Haves

- [ ] `MainLabelSurface` renders emoji chars with `text-2xl` (matches the SVG visual size)
- [ ] Unit test for the emoji char render updated to assert `text-2xl`
- [ ] Linux `xdotool` failures throw a clear, actionable error (not silent no-op)
- [ ] New unit test for the Linux provider's throw-on-failure behavior
- [ ] New regression test for the entry button onTap → pasteText wiring
- [ ] No regressions in any existing test suite
- [ ] Build is clean

## Notes for downstream

- The user's "emoji tap doesn't copy" report is likely a perception issue caused by the 400ms `DOUBLE_TAP_DELAY_MS` (`packages/cli/src/addon/api.ts:110`) — the tap is held in pending for 400ms while the system checks for a double-tap. A proper fix (intent inference — fire tap immediately, revert if dbltap) is a bigger refactor and not in scope for this quick task. A future phase could:
  - Reduce the delay (e.g., 250ms)
  - Or implement intent inference with a reversible-action model
- The user's "no autopaste" is the primary bug fixed by Task 2. The Linux path was silently swallowing xdotool failures, so the user saw "clipboard updated, nothing happens" with no diagnostic. After this fix, they should see a 4-digit error code on the emoji button if xdotool fails.
- The emoji `text-2xl` size restores the prior `renderEmojiGlyph` visual baseline. The Phase 59 GC4 transition to `MainLabelSurface` changed it to `text-3xl`, which the user observed as too big.
