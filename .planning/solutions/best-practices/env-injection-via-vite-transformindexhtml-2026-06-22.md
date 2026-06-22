---
title: "Inject stable URLs from env into Vite dev page via transformIndexHtml plugin (vs WS hello handshake)"
date: 2026-06-22
category: best-practices
module: packages/cli/frontend-emulator/vite.config.ts
problem_type: best_practice
severity: medium
tags:
  - vite
  - transformindexhtml
  - env-injection
  - ws-bridge
  - url-passing
  - 8912-port
applies_when:
  - Vite-served page needs to know a runtime URL (server URL, WS bridge URL, API endpoint)
  - The URL is stable for the process lifetime
  - You want the page to render synchronously without a WS roundtrip
  - You're tempted to add a "hello" handshake over WebSocket
---

# Inject stable URLs from env into Vite dev page via transformIndexHtml plugin

## Context

Phase 75.1-05 needed the emulator page (`packages/cli/frontend-emulator/src/`) to know three URLs/values:

- `deckUrl` — where the deck iframe should point (`http://127.0.0.1:5173`)
- `wsUrl` — the WebSocket bridge address (`ws://127.0.0.1:52937`)
- `keyCount` — the device's number of keys (drives the emulator canvas size)

These were being passed via the page URL as `?deck=...&ws=...&keyCount=...`. User feedback: "the emulator server should know the frontent and ws urls without pass them via url" — the URLs should not leak into the page URL.

The two natural options:

1. **WS "hello" handshake** — CLI sends a `hello` message with the URLs on connect; the page waits for it before rendering.
2. **Env injection via Vite plugin** — the CLI passes `SIRENO_DECK_URL`/`SIRENO_WS_URL`/`SIRENO_KEY_COUNT` as env to the Vite child; a `transformIndexHtml` plugin injects a `<script>window.__SIRENO__ = {deckUrl, wsUrl, keyCount};</script>` preamble into the HTML before it reaches the browser.

Option 2 won.

## Why env-injection is better for stable URLs

1. **Synchronous render** — the page can render immediately on load. No "loading..." state, no race against WS connect, no flash of unstyled content.

2. **The CLI is already the source of truth** — the URLs come from the CLI spawn call (`spawnEmulatorServer({ deckUrl, wsUrl, keyCount })`). They're already in env via the existing `env: { ...process.env, ...opts.env }` merge in `packages/cli/src/render/vite-server.ts:75`. No new pass-through.

3. **No protocol bloat** — a "hello" message is a new protocol message that adds zero capability (CLI already has the URLs at connection time, before the WS even opens).

4. **Robust to WS disconnect** — if the WS disconnects and reconnects, the page still has the URLs it needs to keep rendering. With a "hello" handshake, the page would need to either re-request on reconnect or trust the cached first message (which then drifts from CLI truth on re-config).

5. **Simple to debug** — `view-source:` on the page shows `<script>window.__SIRENO__ = {...}</script>` right in the HTML. No devtools network panel needed.

## The implementation

```ts
// packages/cli/frontend-emulator/vite.config.ts
function injectSirenoConfig(): import('vite').Plugin {
  return {
    name: 'sireno-inject-config',
    transformIndexHtml(html) {
      const deckUrl = process.env.SIRENO_DECK_URL ?? ''
      const wsUrl = process.env.SIRENO_WS_URL ?? ''
      const keyCount = process.env.SIRENO_KEY_COUNT ?? '15'
      const tag = `<script>window.__SIRENO__ = ${JSON.stringify({
        deckUrl, wsUrl, keyCount: Number(keyCount),
      })};</script>`
      return html.replace('</head>', `${tag}</head>`)
    },
  }
}
```

The page reads `window.__SIRENO__` once on boot. No global type for `__SIRENO__` is strictly needed but should be declared in a `global.d.ts` for type safety:

```ts
// packages/cli/frontend-emulator/src/global.d.ts
interface SirenoConfig { deckUrl: string; wsUrl: string; keyCount: number }
declare global {
  interface Window { __SIRENO__?: SirenoConfig }
}
```

The CLI passes env at spawn time (`packages/cli/src/render/emulator-server.ts`):

```ts
spawnViteServer({
  env: {
    SIRENO_DECK_URL: deckUrl,
    SIRENO_WS_URL: wsUrl,
    SIRENO_KEY_COUNT: String(keyCount),
  },
})
```

## When to use this pattern

- The page needs a stable URL/endpoint that the CLI knows at spawn time.
- The page does not need to update the URL mid-session (use a WS message for that).
- The page is Vite-served in dev mode (HMR-friendly) — `transformIndexHtml` is the natural injection point.

## When NOT to use this

- **Live-updating config** — if the URL can change (server restart on different port), env injection will show stale data. Use a WS message instead.
- **Browser-loaded build artifacts** — for production builds, env injection is a build-time concern. Vite has `import.meta.env` for that case, but it's per-module, not per-HTML.
- **URLs the user should be able to override** — if the user is supposed to point the page at a different backend via URL or localStorage, env injection fights that intent.

## Anti-pattern: WS "hello" handshake for stable URLs

If the URL doesn't change during the page's lifetime, a "hello" message:

1. Adds a protocol message that adds zero value (CLI knows the URLs before WS opens).
2. Forces the page to wait for the handshake before rendering.
3. Adds reconnect-state-machine complexity (do you re-request "hello" on reconnect? Or trust cache? What if CLI restarts on a different port?).

Reserve WS messages for **state changes** (button presses, state pushes, deck-config updates), not for **static configuration** that the CLI already has at spawn time.

## Related

- `.planning/solutions/workflow-issues/split-vite-root-move-config-and-source-atomically-2026-06-22.md` — the OTHER 75.1-05 fix that lived in the same atomic commit
- `.planning/solutions/best-practices/deck-list-broadcast-without-request-2026-06-22.md` — when WS messages ARE the right tool (CLI is the authority, list is small and stable, but renderer connects async)
- `packages/cli/src/render/vite-server.ts:75` — the env merge that makes this pattern work for free
