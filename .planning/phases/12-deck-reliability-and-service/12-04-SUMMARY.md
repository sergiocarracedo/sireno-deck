# Plan 12-04 Summary

**Completed:** 2026-07-23

## What was built

Render operational logs as compact one-line records with stable inline context for foreground (TTY) mode, and emit raw ndjson in non-TTY / service-manager contexts so journald/launchd capture structured fields. Demote the verbose `[emulator] button lookup` follow-up from info to debug.

## Key files

- `packages/cli/src/util/logger.ts` — already implements TTY detection (`useCompact = compact || (process.stdout.isTTY && !INVOCATION_ID && !LAUNCH_PATH)`), a custom `HumanWritable` that parses pino's ndjson and reformats via `formatCompact` (one line: `HH:MM:SS LEVEL msg (key: val, ...)`), and falls back to raw ndjson otherwise. `formatCompact` reads `CONTEXT_FIELDS` (deckId, position, gesture, etc.) and joins them inline. The plan called for `pino-pretty` transport with `messageFormat` — the current implementation is functionally equivalent (custom Writable that post-processes ndjson) and avoids the pino-pretty dep. Existing `// ponytail:` comments document the design.
- `packages/cli/src/outputClient/emulator.ts` — demoted `[emulator] button lookup` from `logger.info` to `logger.debug`. The single `emulator: button-action received` info log on line 154 already carries `{deckId, position, gesture}` and renders as `HH:MM:SS INFO emulator: button-action received (deckId: main, position: 11, gesture: tap)` in compact mode.

## Tests

- `packages/cli/src/__tests__/logger-format.test.ts` — 5 cases: TTY detection, INVOCATION_ID, LAUNCH_PATH, json option, and a new end-to-end compact-format capture test that monkey-patches `process.stdout.write`, calls `logger.info({deckId, position, gesture}, msg)`, and asserts the rendered line contains msg + all 3 context fields on a single newline.
- Test run: `vitest run packages/cli/src/__tests__/logger-format.test.ts` — 5/5 pass.

## Decisions made

- **Custom `HumanWritable` instead of `pino-pretty`.** The plan called for `pino-pretty`'s `messageFormat` option. The existing implementation parses ndjson in a custom Writable and reformats — same output shape, no extra dependency. Refactoring to `pino-pretty` would force a child-process transport and add startup latency in TTY mode. Skipped per `ponytail: native platform feature covers it` (stdlib stream API).
- **Button-action log already emits the right shape.** Plan task 03 was "verify and update if needed" — current line 154 already matches the desired format exactly.

## Notes for downstream

- The redundant `logger.info` block in `emulator.ts` is now `logger.debug`. Run the CLI in foreground with `pnpm dev` to see one-line logs; under `systemd --user` or `launchd`, `INVOCATION_ID`/`LAUNCH_PATH` triggers raw ndjson output for `journalctl --user -u sireno-deck` and `log show --predicate ...`.
- Plan 12-06's emulator UI changes are independent of 12-04.
