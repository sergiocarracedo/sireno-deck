# Plan 59-GC2 Summary

**Completed:** 2026-06-12

## What was built

Made the `unsupported` key-macro provider's `send` throw a clear, actionable Error. Previously, on platforms where keystroke simulation is unsupported (pure-Wayland, unknown platforms), the provider's `send` resolved immediately without throwing — the runtime error UX never fired and the user saw "clipboard updated but nothing happened" with no indication of why.

## Key files

- `packages/cli/src/system/key-macro/unsupported.ts` — `send()` now throws `new Error('Keystroke simulation is not supported on this platform ({reason}). The clipboard write succeeded but no paste keystroke was sent. Paste manually, or set \'paste.keystroke: false\' in config.yml to skip the keystroke.')` after the existing one-time warning log.
- `packages/cli/src/system/key-macro/get-provider.test.ts` — updated the existing `'unsupported provider warns once across multiple sends'` test to `'unsupported provider throws on send and warns once across multiple sends'`, asserting that both `send` calls reject with an error message that contains the unsupported reason (`unknown-platform:aix`). Added a new test `'unsupported provider on pure Wayland throws with the pure-wayland reason in the message'` that asserts the same for the pure-Wayland case.

## Decisions made

- **Throw AFTER the warn** (not replace it). The one-time `deps.logger.warn` is preserved so the diagnostic still appears in logs; the throw surfaces the failure to the runtime error UX. This keeps both observability paths intact.
- **No new error class.** Plain `Error` is sufficient; the runtime's existing `try/catch` in the entry button's onTap handler catches it and the existing 4-digit error code UX (e.g., `4105`) surfaces to the user. Creating a typed error class would be over-engineering for this single call site.

## Notes for downstream

- The runtime's existing `propagates keyMacroProvider.send errors to the runtime error UX` test (in `runtime.test.ts`) already exercises this path with a custom throwing provider; it still passes unchanged.
- The CONTEXT decision ("let any error propagate") is now actually honored for the unsupported case — the previously silent no-op is now a real error.
- On a real Stream Deck on pure-Wayland, the emoji button will now show the warning triangle + 4-digit error code if the user taps an emoji, instead of silently doing nothing. The error message tells the user what to do (paste manually, or set `paste.keystroke: false`).
