---
files_modified:
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/deck/runtime.test.ts
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Preserve internal toggle state across deck activation and reconnect."
---

# Quick Task 007: Preserve Internal Toggle State Across Deck Activation And Reconnect

<objective>
Keep purely internal toggle buttons stateful across runtime activation boundaries. Navigating away from a deck, reactivating it, or restarting the runtime after a reconnect should not reset an internal toggle back to its first configured state when there is no external status command to repopulate it.
</objective>

## Tasks

<task id="007-01">
<title>Stop clearing internal toggle state during activation cleanup</title>
<files>
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/runtime.test.ts
- CHANGELOG.md
</files>
<action>
Update activation-time polled-state cleanup so externally authoritative buttons still reset before a fresh activation, but internal toggle buttons without a `status_command` keep their existing runtime state. Add regression coverage for deck reactivation and reconnect startup.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/deck/runtime.test.ts
</verify>
<done>
Internal toggles keep their last state when a deck is reactivated or the runtime reconnects.
</done>
</task>
