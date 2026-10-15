# Scripted Demo

`@sirenodeck/scripted-demo` renders a real Sireno Deck frontend through a local WebSocket proxy. It is intended for repeatable product screenshots and videos, not as a replacement for the service bridge.

## Run a scene

```sh
pnpm --filter @sirenodeck/scripted-demo demo run packages/web/scenes/coding-agents.json --output-root .showcase
```

The tool starts a proxy and the frontend declared by the scene, drives the timeline, then shuts both down. `--output-root` is the base for all image and video paths in the scene.

## Modes

- `standalone` supplies every WebSocket message from the scene. Use it for deterministic examples with no service running.
- `passthrough` connects to `upstreamUrl`, forwards normal bridge traffic, and suppresses live updates for `replaceChannels`. Timeline messages replace those values. Use it to retain a real deck and button layout while changing selected display values.

For example, `"replaceChannels": ["coding-agents:agents"]` prevents a live Coding Agents publisher from overwriting scripted `state` messages for that channel.

The frontend reaches the proxy through `SIRENO_WS_PROXY_URL`. Sireno Deck’s service bridge remains unchanged. Set this environment variable when launching a service/frontend yourself; the scene runner does it for its own Vite process.

## Timeline and captures

Scenes are JSON with `version: 1`, a `frontend` definition, and timed `timeline` steps. `message` sends an existing protocol message to the frontend. `gesture` sends a message either to the frontend (`target: "frontend"`) or upstream service (`target: "service"`). `snapshot` writes an image at that instant. Add `video` to record the complete sequence as WebM.

```json
{
  "version": 1,
  "mode": "standalone",
  "frontend": {
    "root": "../cli/frontend",
    "configFile": "../cli/frontend/vite.config.ts"
  },
  "initialMessages": [
    { "type": "deck-config", "deckId": "main", "surfaces": {} }
  ],
  "timeline": [
    { "atMs": 0, "kind": "snapshot", "path": "captures/first.png" },
    {
      "atMs": 800,
      "kind": "message",
      "message": { "type": "state", "channels": {} }
    },
    { "atMs": 1200, "kind": "snapshot", "path": "captures/second.jpg" }
  ],
  "video": { "path": "video/demo.webm", "durationMs": 2000 }
}
```

The file extension determines the screenshot encoder through Playwright (`.png`, `.jpg`, or `.jpeg`). Video currently writes WebM.

## Safety

`target: "service"` forwards an existing `button-action` to a real service and can invoke real computer actions. Use `target: "frontend"` plus scripted `state` or `deck-config` messages when a capture only needs visual feedback. In passthrough mode, untouched messages may contain real data; review recordings before committing or sharing them.
