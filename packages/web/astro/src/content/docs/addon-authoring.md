---
title: Addon Authoring
description: Write and publish your own Sireno Deck addons.
---

Sireno Deck addons are npm packages that export backend actions and (optionally) a
React component for the frontend surface.

## Minimum addon

```
my-sireno-addon/
├── package.json
└── src/
    └── index.ts        ← backend actions
```

`package.json` must declare `"sireno-addon": true"` in `package.json`.

## Writing actions

Actions are functions registered via the addon entry point:

```ts
// src/index.ts
import type { Addon } from "sirenodeck/api"

export default {
  name: "my-addon",
  actions: {
    hello: ({ runCommand }) => {
      return {
        execute: async () => {
          await runCommand("notify-send", ["Hello from addon!"])
        },
      }
    },
  },
} satisfies Addon
```

The `Addon` interface exposes the methods context:

| Method                      | What it does                     |
| --------------------------- | -------------------------------- |
| `runCommand(cmd, args)`     | Execute a shell command          |
| `keyMacro(keystrokes)`      | Send key combo to focused window |
| `typeText(text)`            | Type unicode text at cursor      |
| `navigateToDeck(deckId)`    | Switch active deck               |
| `invalidate(tileId)`        | Force re-render of a tile        |
| `publish(topic, data)`      | Broadcast to all subscribers     |
| `subscribe(topic, handler)` | Listen for events                |

## Frontend component

If your addon has a custom tile surface, export a React component:

```ts
// src/index.ts
export const MyTile = ({ label, state }: { label: string; state: TileState }) => {
  return <div className="my-tile">{label}</div>
}
```

The `ButtonFrame` picks up custom components via the `ThemeUiPresentation`
contract — register your component name in the theme's `sirenodeck.json`.

## Publishing

```sh
npm publish --access public
```

Add the `sireno-addon` and `sireno-deck` keywords so it appears in the addon
registry.
