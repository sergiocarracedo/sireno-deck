# Quick 043: Reduce deck-render log noise

**Task:** Demote the per-render "rendered browser-backed main deck" log to `debug` and inline its key list so it stops dominating the terminal at info level.

## Task 1 — Inline + debug the deck-render log

<files>
- `/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts`
</files>

<action>
In `writeBrowserRendererDeckSurface` (around line 382–390), replace the structured `logger.info` call that prints `deckId` + a 15-element `renderedKeys` array as multi-line JSON with a single-line `logger.debug` call that embeds the key count and a compact sorted range summary, e.g.:

```ts
logger.debug(
  `rendered browser-backed main deck (15 keys: 0-14)`,
)
```

Derive the message from `buffersByKey.size` and `min/max` key indices so the format stays correct when fewer keys are rendered. Do not log at info level anymore — this is a per-frame, per-reconnect event with no actionable signal at the default level.

Match the inline pattern already used by other `logger.debug` calls in the codebase (e.g. `packages/cli/src/device/stream-deck.ts:524`).
</action>

<verify>
- `pnpm --filter @sireno-deck/cli typecheck` passes.
- `pnpm --filter @sireno-deck/cli lint` passes.
- Grep confirms only one occurrence of the literal `rendered browser-backed main deck` remains, in a `logger.debug` call, and the call has no `renderedKeys` field.
</verify>

<done>
- The message no longer appears at default (info) log level.
- When debug is enabled, it prints on a single line.
- No other behaviour changes — buffers are still written to the deck as before.
</done>
