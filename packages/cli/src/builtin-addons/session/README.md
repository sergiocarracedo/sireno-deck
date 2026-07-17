# session

**Internal-only addon.** Provides session-related info buttons. The locked deck itself is runtime-synthesized (see `packages/cli/src/deck/runtime.ts` → `buildDefaultLockDeck`); this addon does not register a deck factory.

## Buttons

| Button id        | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `session:info`   | Shows current OS session state (locked/unlocked)   |

## See also

- [Internal settings](../internal-settings/README.md) — settings overlay
- `packages/cli/src/deck/runtime.ts` — runtime-synthesized lock deck