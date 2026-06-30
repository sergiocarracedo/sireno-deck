---
phase: 04-ws-frontend
status: not-started
depends_on: [03-deck-runtime]
---

# Phase 04 — WS Bridge v3 + Frontend Skeleton

Goal: WS bridge v3 with token handshake, vite plugin (`./vite`), frontend React app (`./react`), `useAddonChannel` hook, `<Deck>` + `<ButtonFrame>` + core button render surface.

## Outcomes

1. **`src/api/`** — public types: `AddonButtonRenderCtx`, `AddonButtonActionCtx`, `Methods`, pub-sub types. Re-exported as `sireno-deck/api`.
2. **`src/render/protocol.ts`** — zod schemas for every WS message (v3). Discriminated union by `type`.
3. **`src/render/ws-bridge.ts`** — `ws` server; handshake with token; methods: `broadcast`, `sendToCaller`, `onMessage`, `onConnection`, `close`.
4. **`src/render/vite-server.ts`** — spawn vite as child process with `SIRENO_TOKEN` env var; restart on crash (3 retries).
5. **`src/vite/`** — vite plugin `sirenoDeck2()`. Registers addon/theme folders; exposes `virtual:sireno/token`. Re-exported as `sireno-deck/vite`.
6. **`src/react/`** — React hooks: `useAddonChannel`, `useDeck`, `useButtonAction`. Re-exported as `sireno-deck/react`.
7. **`packages/cli/frontend/`** — Vite React app. Pages: `<Deck>`, `<ButtonFrame>`, addon button renders. WS client subscribes to bridge.
8. **`packages/cli/src/__tests__/ws-protocol.test.ts`** — roundtrip every message type.

## Requirements traceability

- **R9** (WS bridge v3 handshake + button-action carries gesture + no snapshot message)
- **R10** (WS token in dev: `SIRENO_TOKEN` env + `virtual:sireno/token`; in prod: injected `<script>`)
- **R11** (vite plugin registers addon/theme folders)

## Key files

```
src/api/
  addon.ts        # AddonButtonRenderCtx, AddonButtonActionCtx, Methods
  protocol.ts     # WS message types
  index.ts        # public exports

src/render/
  protocol.ts     # zod schemas for WS messages
  ws-bridge.ts    # ws server + handshake
  vite-server.ts  # vite spawn manager
  ws-bridge.test.ts
  protocol.test.ts

src/vite/
  index.ts        # sirenoDeck2() plugin
  virtual-modules.ts  # virtual:sireno/token, virtual:sireno/addons
  plugin.test.ts

src/react/
  use-addon-channel.ts
  use-deck.ts
  use-bridge.ts
  index.ts
  hooks.test.tsx

packages/cli/frontend/
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    components/
      Deck.tsx
      ButtonFrame.tsx
      ButtonRenderer.tsx
    bridge/
      client.ts
      store.ts
    hooks/
      use-bridge.ts
```

## Deferred to later phases

- Prod HTTP server injecting `window.__SIRENO_TOKEN__` (Phase 10)
- Real hardware Playwright screenshot pipeline (Phase 06)
- Emulator shell (Phase 05)
- Themes (Phase 08)
- Built-in addons for non-core buttons (Phase 09)
