---
title: User-action button dispatch — URI scheme routing and addon precedence
date: 2026-07-09
category: best-practices
module: packages/cli/src/deck/
problem_type: best_practice
severity: medium
tags:
  [
    user-actions,
    button-actions,
    gesture-handlers,
    addon-precedence,
    macro-dispatch,
    paste-dispatch,
    uri-scheme,
    methods-dispatch,
  ]
---

# User-action button dispatch — URI scheme routing and addon precedence

## Context

Users wanted a way to attach tap/dbltap/hold actions to **any** button from the YAML config, regardless of whether the addon's button type defined a handler. Example:

```yaml
buttons:
  - position: 2
    type: "date-time:time"
    config:
      variant: big
  - position: 3
    type: "date-time:date"
    actions:
      tap: "xdg-open https://calendar.google.com"
      dbltap: "macro://ctrl+t"
      hold: "paste://🔥"
```

The existing `core-buttons:action` button type ran commands but required swapping the button's type and had no URI scheme support (`macro://`, `paste://`). No mechanism existed for per-button actions on non-action buttons.

## Guidance

### 1. User actions fire by default; addons only override when they explicitly claim the gesture

The precedence rule:

```
invokeAction(buttonId, gesture):
  1. if user defined actions.<gesture> → run it (user wins)
  2. else if addon registered handler AND gesture in gestureHandlers → run addon handler
  3. else → no-op
```

This means `date-time:date` (no `onTap`) with `actions.tap: 'xdg-open ...'` → command runs. `media:mute` with `actions.tap: '...'` → ignored (addon claims tap via `gestureHandlers: ['tap']`).

**Why this ordering?** It gives users a safe default that works without requiring addon authors to plan for user overrides. Addon authors opt out by declaring `gestureHandlers`.

### 2. Centralize all dispatch in `Methods.dispatch`

One method handles all action strings. URI dispatch lives here, not in individual addons:

```ts
// packages/cli/src/deck/methods.ts
const dispatch: Methods["dispatch"] = async (value: string) => {
  if (value.startsWith("macro://")) {
    const inner = value.slice("macro://".length)
    await dispatchMacro(inner, { runCommand, keyMacro })
    return
  }
  if (value.startsWith("paste://")) {
    await pasteText(value.slice("paste://".length))
    return
  }
  await runCommand(value)
}
```

`dispatchMacro` tokenizes the macro string into steps (combos, delays, text) and runs them sequentially. `Methods` is the natural home — addons and bridge both call through the same surface.

### 3. Strip addon handlers in the bridge when the gesture IS claimed

The bridge at `addon-handler-bridge.ts` registers `onTap`/`onDblTap`/`onHold` handlers for each button. Change the filter from "run unless gestureHandlers excludes this gesture" (Phase 72 default-allow) to "only run when gesture IS in gestureHandlers":

```ts
// Before (Phase 72): run if undefined OR in list
if (allowedGestures !== undefined && !allowedGestures.includes("tap")) return

// After (this feature): run only if in list
if (allowedGestures === undefined || !allowedGestures.includes("tap")) return
```

This means `invokeAction` receives no addon handler for unclaimed gestures → falls through to user action check.

### 4. Add `actions` to `ButtonDefSchema` and carry it through to `RuntimeDeck`

Schema (`packages/cli/src/config/schemas.ts`):

```ts
export const ButtonActionsSchema = z
  .object({
    tap: z.string().min(1).optional(),
    dbltap: z.string().min(1).optional(),
    hold: z.string().min(1).optional(),
  })
  .strict()

// Added to ButtonDefSchema:
actions: ButtonActionsSchema.optional()
```

The button's `actions` travels through `run.ts:256-270` into `RuntimeDeck.buttons[i].actions` (type added to `RuntimeButton` in `runtime.ts:11-19`).

### 5. Thread `getMethods` through the runtime closure

`invokeAction` needs `methods.dispatch` but `methods` is created after `runtime`. Use a ref cell:

```ts
// runtime.ts — CreateRuntimeOptions
getMethods: () => Methods

// runtime.ts — invokeAction
await getMethods().dispatch(userAction)

// index.ts — createDeckRuntime
const methodsRef = { current: undefined }
const runtime = createRuntime({ ..., getMethods: () => methodsRef.current! })
const methods = createMethods({ ... })
methodsRef.current = methods
```

This avoids a circular dependency where `createRuntime` needs `methods` but `methods` needs `runtime`.

## Why This Matters

Without this, users who want a tap action on a `date-time:date` button must either request the addon author add an `onTap` or fork the addon. Both are friction. The same problem existed for every display-only button type.

With this, any button can be enhanced with shell commands, macros, or paste — without touching addon code.

## When to Apply

- When adding a per-button YAML config field that should fire on gesture
- When adding a new URI scheme (`macro://`, `paste://`) or action type
- When an addon needs to cede a gesture to user config

## Examples

**`date-time:date` + tap action:**

```yaml
- position: 3
  type: "date-time:date"
  actions:
    tap: "google-chrome"
```

→ User action fires (addon has no `onTap`) → `dispatch('google-chrome')` → `runCommand('google-chrome')`

**`core-buttons:action` with macro:**

```yaml
- position: 5
  type: "core-buttons:action"
  config:
    command: "macro://ctrl+t;delay(1s);ctrl+v"
```

→ `core-buttons:action onTap` calls `methods.dispatch(config.command)` → macro plays sequence

**`media:mute` with conflicting tap action:**

```yaml
- position: 0
  type: "media:mute"
  actions:
    tap: 'notify-send "muted!"'
```

→ Addon claims tap via `gestureHandlers: ['tap']` → addon handler fires → user action ignored

## Related

- `.planning/solutions/logic-errors/gesture-detection-creategesturedetector-not-nextgesture-2026-07-09.md` — Phase 72 `gestureHandlers` enforcement that enabled this design
- `packages/cli/src/deck/macro-parse.ts` — macro tokenization (combos + delays)
- `packages/cli/src/deck/runtime.ts` — `invokeAction` user-action-first logic
- `packages/cli/src/deck/addon-handler-bridge.ts` — handler stripping for claimed gestures
