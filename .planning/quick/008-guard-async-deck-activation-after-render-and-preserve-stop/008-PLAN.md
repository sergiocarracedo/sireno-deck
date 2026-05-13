---
files_modified:
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/deck/runtime.test.ts
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Guard async deck activation after render so late work cannot undo stop() or replace newer polling."
---

# Quick Task 008: Guard Async Deck Activation After Render And Preserve Stop

<objective>
Close the activation race introduced by async deck rendering. If a deck activation is stopped or superseded while `onRenderDeck` is still in flight, the late continuation must not restart polling, kick off priming, or tear down a newer activation's schedulers.
</objective>

## Tasks

<task id="008-01">
<title>Abort activation continuation when render completes late</title>
<files>
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/runtime.test.ts
- CHANGELOG.md
</files>
<action>
Add a post-render activation guard before polling startup and priming. Cover the regressions where a late render completion after `stop()` used to restart polling, and where a previously stopped activation resolving after `start()` could tear down the newer activation's schedulers.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/deck/runtime.test.ts
</verify>
<done>
Late render completions no longer undo shutdown or override the currently owned activation.
</done>
</task>
