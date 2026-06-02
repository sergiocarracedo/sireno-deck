# Quick Task 027 Plan

**Task:** I want to use full instead of 'full_surface'

## Tasks

<task id="027-01">
<title>Rename the core button-surface contract from `full_surface` to `full`</title>
<files>
- packages/cli/src/core/schemas.ts
- packages/cli/src/deck/runtime.ts
- packages/cli/src/render/dom-host.tsx
- packages/cli/src/render/dom-host-button.tsx
- packages/cli/src/cli/commands/start.ts
- packages/cli/src/addon/api.ts
- packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx
- packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx
- packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx
- packages/cli/src/builtin-addons/media-player/button.tsx
- packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx
</files>
<action>
Change the public core button-envelope field and runtime render field from `full_surface` to `full`, then thread that rename through config parsing, runtime transport, browser host rendering, and the built-in/addon authoring call sites that currently still pass `full_surface`. Keep `ButtonSurface` as the metadata carrier, but make its authored prop and the surrounding runtime types consistently use `full`. Do not add a compatibility alias unless the code proves one is unavoidable for this task.
</action>
<verify>
grep -n "\bfull_surface\b" packages/cli/src/core/schemas.ts packages/cli/src/deck/runtime.ts packages/cli/src/render/dom-host.tsx packages/cli/src/render/dom-host-button.tsx packages/cli/src/cli/commands/start.ts packages/cli/src/addon/api.ts packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx packages/cli/src/builtin-addons/media-player/button.tsx packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx
</verify>
<done>
The live contract owners and authored `ButtonSurface` call sites use `full`, and the listed files no longer reference `full_surface`.
</done>
</task>

<task id="027-02">
<title>Re-sync focused config and runtime regressions with the renamed contract</title>
<files>
- packages/cli/src/config/loader.test.ts
- packages/cli/src/deck/runtime.test.ts
- packages/cli/src/render/dom-host.test.tsx
- packages/cli/src/builtin-addons/date-time/index.test.ts
- CHANGELOG.md
</files>
<action>
Update the focused tests and assertions that still exercise `full_surface` so they prove the renamed `full` contract on config loading, runtime button snapshots, hosted DOM output, and the analog clock render seam. Add a dated CHANGELOG entry that states the contract rename and why it happened.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/config/loader.test.ts src/deck/runtime.test.ts src/render/dom-host.test.tsx src/builtin-addons/date-time/index.test.ts
</verify>
<done>
The targeted tests pass while asserting `full` instead of `full_surface`, and CHANGELOG.md records the contract rename and learning.
</done>
</task>
