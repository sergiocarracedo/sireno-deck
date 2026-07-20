---
plan: 02
phase: 09-post-v1-polish
title: Service-log WS sub-protocol (CLI publisher + emulator subscriber)
wave: 1
depends_on: []
files_modified:
  - modified: packages/cli/src/api/protocol-internal.ts
  - new: packages/cli/src/api/service-log.ts
  - modified: packages/cli/src/cli/commands/run.ts
  - modified: packages/cli/emulator/src/bridge.ts
  - new: packages/cli/emulator/src/__tests__/service-log.test.ts
objective: >
  Add a new `service-log` WS message type (level/msg/ts) that the CLI broadcasts
  on its existing bridge. The emulator parses it into a ring buffer. This is
  foundational — Plan 03 builds the side-panel Service Logs page on top.
  Demoable: run CLI + emulator; emulator captures every pino log line; ring
  buffer caps at 1000 messages; visible in a test that consumes the buffer.
autonomous: true
single_layer_justified: false
must_haves:
  - "protocol-internal.ts: new `serviceLogMessageSchema` (zod object: type literal 'service-log', level enum, msg string, ts number) added to `wsMessageSchema` discriminated union."
  - "emulator/bridge.ts: mirror the schema (separate copy with the same shape, since the emulator doesn't share the cli protocol module). Parse incoming messages; if `type === 'service-log'`, push to an in-memory ring buffer."
  - "ring buffer at packages/cli/emulator/src/bridge-log-store.ts: cap 1000, oldest evicted. Export `appendLog(entry)`, `getLogs(filter?)`, `clear()`."
  - "cli/commands/run.ts: hook into pino logger — on every log line, broadcast `{type: 'service-log', level, msg, ts}` via bridge. Use pino's `multistream` or a custom `destination` that forwards to the bridge."
  - "vitest in emulator/src/__tests__/service-log.test.ts: roundtrip a service-log message through the ring buffer + filter; verify cap eviction at 1000."
---

<tasks>

<task id="02.1">
  <file>packages/cli/src/api/protocol-internal.ts</file>
  <action>Add `serviceLogMessageSchema = baseServerMessage.extend({ type: z.literal('service-log'), level: z.enum(['trace','debug','info','warn','error','fatal']), msg: z.string(), ts: z.number().int().nonnegative() })` and append to `wsMessageSchema` discriminated union.</action>
  <verify>pnpm -F @sireno-deck/cli tsc --noEmit — no new errors. Schema parses a sample message successfully.</verify>
  <done>Schema defined and in union.</done>
</task>

<task id="02.2">
  <file>packages/cli/emulator/src/bridge.ts</file>
  <action>Add a mirror `serviceLogMessageSchema` to the emulator's bridge module (same shape as Plan 02.1). Extend the emulator's `createWsClient` `onMessage` handler: when parsed.type === 'service-log', call `appendServiceLog(parsed)` (the ring buffer append from Plan 02.3).</action>
  <verify>pnpm -F @sireno-deck/cli tsc --noEmit — no new errors.</verify>
  <done>Emulator parses + appends.</done>
</task>

<task id="02.3">
  <file>packages/cli/emulator/src/bridge-log-store.ts</file>
  <action>New file. Ring buffer (cap 1000). Exports `appendServiceLog(entry: ServiceLogEntry)`, `getServiceLogs(filter?: { direction?: 'all'|'sent'|'received'; channel?: string; type?: string; contentSubstring?: string; sinceMs?: number }): ServiceLogEntry[]`, `clearServiceLogs()`. Cap = 1000; on overflow, shift() oldest. Filter applied at read time. Use plain array (no dep).</action>
  <verify>pnpm -F @sireno-deck/cli tsc --noEmit — no new errors.</verify>
  <done>Ring buffer module exists.</done>
</task>

<task id="02.4">
  <file>packages/cli/emulator/src/__tests__/service-log.test.ts</file>
  <action>vitest cases: (1) append 1500 entries, expect getServiceLogs().length === 1000 with oldest evicted. (2) append mixed levels, filter by level, only matching returned. (3) append with timestamps, filter by sinceMs, only recent returned. (4) contentSubstring filter narrows correctly. (5) clearServiceLogs empties.</action>
  <verify>rtk vitest run packages/cli/emulator/src/__tests__/service-log.test.ts — all 5 cases pass.</verify>
  <done>Ring buffer tested.</done>
</task>

<task id="02.5">
  <file>packages/cli/src/cli/commands/run.ts</file>
  <action>Hook pino logger to broadcast service-log messages via the existing bridge. Approach: add a `pino-tee` or write a custom destination that wraps the existing logger, capturing each log line. On each line, call `bridge.broadcast({type: 'service-log', level, msg, ts: Date.now()})`. Skip in test/preview modes (only when an active WS bridge exists).</action>
  <verify>Manual smoke: run CLI + emulator; observe pino log lines flow into the emulator's ring buffer (will be visible via Plan 03's Service Logs page).</verify>
  <done>CLI broadcasts pino logs as service-log messages.</done>
</task>

</tasks>
