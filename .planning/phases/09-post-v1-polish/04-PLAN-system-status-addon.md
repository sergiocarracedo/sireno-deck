---
plan: 04
phase: 09-post-v1-polish
title: System-status addon rewrite (cpu/ram/disk/net, positions 0+5 in main deck)
wave: 1
depends_on: []
files_modified:
  - new: packages/cli/src/builtin-addons/system-status/index.ts
  - new: packages/cli/src/builtin-addons/system-status/buttons/cpu/config.ts
  - new: packages/cli/src/builtin-addons/system-status/buttons/cpu/frontend.tsx
  - new: packages/cli/src/builtin-addons/system-status/buttons/ram/config.ts
  - new: packages/cli/src/builtin-addons/system-status/buttons/ram/frontend.tsx
  - new: packages/cli/src/builtin-addons/system-status/buttons/disk/config.ts
  - new: packages/cli/src/builtin-addons/system-status/buttons/disk/frontend.tsx
  - new: packages/cli/src/builtin-addons/system-status/buttons/net/config.ts
  - new: packages/cli/src/builtin-addons/system-status/buttons/net/frontend.tsx
  - new: packages/cli/src/builtin-addons/system-status/__tests__/index.test.ts
  - modified: .planning (positions 0 + 5 in main deck config note)
objective: >
  Rewrite the legacy system-status addon against the current AddonManifestV1
  architecture. Four split button surfaces (cpu / ram / disk / net), each
  occupying one button slot. Verify that positions 0 and 5 in the main deck
  are wired to status buttons in the default config.yml and render correctly
  in the emulator. Demoable: in emulator, main deck slot 0 shows CPU usage,
  slot 5 shows RAM usage (or whichever pair the config maps); live updates.
autonomous: true
single_layer_justified: false
must_haves:
  - "packages/cli/src/builtin-addons/system-status/index.ts: exports a manifest with 4 button types: `system-status:cpu`, `system-status:ram`, `system-status:disk`, `system-status:net`."
  - "Each button has a zod .strict() configSchema (per current addon convention) + a frontend.tsx that subscribes to its metric channel."
  - "Service code: a `system-status` background poller that publishes cpu/ram/disk/net snapshots to pubsub channels `runtime:system-status:cpu` etc. Reuses existing system metrics where possible (e.g. si from os module on Linux, native on Mac/Windows)."
  - "default config.yml: main deck positions 0 and 5 are wired to two of the four status buttons (e.g. 0 → cpu, 5 → ram). Verify by opening the emulator."
  - "vitest: index.test.ts verifies manifest shape (4 buttons, correct types, configSchema parses empty config)."
---

<tasks>

<task id="04.1">
  <file>packages/cli/src/builtin-addons/system-status/manifest.ts (new file inside the addon dir)</file>
  <action>Define the addon manifest: name 'system-status', apiVersion 1, 4 button types (`system-status:cpu`, `:ram`, `:disk`, `:net`). Each button's configSchema: `z.object({}).strict()` (no user config needed for now). Each button's `service` field is null (no server-side handler — metrics come from the poller). Frontend entry per button.</action>
  <verify>pnpm -F @sireno-deck/cli tsc --noEmit — no new errors.</verify>
  <done>Manifest defined.</done>
</task>

<task id="04.2">
  <file>packages/cli/src/builtin-addons/system-status/service.ts</file>
  <action>Background poller using `setInterval` (1s cadence). Reads cpu (from `os.cpus()` deltas), ram (from `os.totalmem()`/`os.freemem()`), disk (from `fs.statfs('/')` if available, else fall back to RAM), net (from `os.networkInterfaces()` interfaces — count of non-internal IPv4). Publishes via pubsub `runtime:system-status:cpu` etc. with shape `{value: number, total?: number, unit: string}`. Stops on `signal.aborted`.</action>
  <verify>rtk vitest run packages/cli/src/builtin-addons/system-status/__tests__/service.test.ts — assert metrics appear in pubsub within 2s.</verify>
  <done>Poller publishes metrics.</done>
</task>

<task id="04.3">
  <file>packages/cli/src/builtin-addons/system-status/buttons/{cpu,ram,disk,net}/frontend.tsx</file>
  <action>Each frontend.tsx subscribes to its channel via `useAddonChannel` and renders a centered value + label. Use the existing `IconLabelSurface` or `IconLabelProgressSurface` (the progress variant for CPU% / RAM%). Match the visual weight of other built-in addons (brightness, date-time).</action>
  <verify>rtk vitest run packages/cli/src/builtin-addons/system-status/__tests__/index.test.ts (Plan 04.5).</verify>
  <done>Four surface components exist.</done>
</task>

<task id="04.4">
  <file>packages/cli/src/builtin-addons/system-status/index.ts</file>
  <action>Export `registerSystemStatusAddon(registry)` that calls `registry.register(manifest)` for the 4 buttons. Hook the service poller from 04.2 into runPipeline via `pubSub` + abort signal in the addon-services bridge pattern. Wire from `builtin-addons/index.ts` (auto-registered like other builtins).</action>
  <verify>Manual smoke: open emulator, main deck slots 0 and 5 show live CPU/RAM values updating every second.</verify>
  <done>Addon registered and live.</done>
</task>

<task id="04.5">
  <file>packages/cli/src/builtin-addons/system-status/__tests__/index.test.ts + service.test.ts</file>
  <action>vitest: (1) manifest has 4 button types with correct ids + configSchema accepts empty config. (2) service poller publishes cpu/ram within 2s of starting. (3) each frontend.tsx renders value + label given a mock channel payload. (4) zod strict() rejects unknown keys.</action>
  <verify>rtk vitest run — all pass.</verify>
  <done>Tests green.</done>
</task>

</tasks>
