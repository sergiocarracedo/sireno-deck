---
title: "WS protocol design: CLI broadcasts small stable lists on connect, renderer sends selections back (no request)"
date: 2026-06-22
category: best-practices
module: packages/cli/src/render/protocol.ts
problem_type: best_practice
severity: low
tags:
  - ws-protocol
  - broadcast-on-connect
  - small-list
  - deck-picker
  - reconnect-handling
  - authority-inversion
applies_when:
  - WS protocol needs to send a small, stable list from server to client
  - The list is owned/authored by the server (server is the authority)
  - The list fits comfortably in one message (< ~1KB)
  - The client will pick from the list and send a selection back
---

# WS protocol design: CLI broadcasts small stable lists on connect, renderer sends selections back

## Context

Phase 75.1-06 added a deck picker to the emulator shell. The user opens the emulator, sees a row of buttons (one per deck from the loaded config), clicks one, and the deck iframe navigates to that deck.

The naive protocol:

```ts
// Renderer → CLI
{type: 'request-decks'}

// CLI → Renderer
{type: 'decks-list', decks: [...]}
```

That's a request-response dance. On every reconnect (HMR, page reload, sleep/wake), the renderer asks again.

The chosen protocol:

```ts
// CLI → Renderer (broadcast on connect, on reconnect, on every new renderer connect)
{type: 'decks-list', decks: [{id: 'plain', name: 'Plain Deck'}, ...]}

// Renderer → CLI (only when user picks one)
{type: 'select-deck', deckId: 'plain'}
```

The CLI owns the list. The renderer just listens for it.

## Why broadcast-on-connect wins for small stable lists

1. **No request-response race** — a renderer that opens BEFORE the CLI is ready to send would have to retry, implement backoff, and handle "list not yet available" states. With broadcast, the renderer just waits for the next broadcast.

2. **Reconnect-safe for free** — the CLI caches the list (`currentDecksList`) and re-broadcasts on every renderer connect. When the renderer HMR-reloads, the CLI immediately pushes the current list to it. No "did I already receive this?" tracking on the renderer.

3. **Authority is unambiguous** — the CLI is the source of truth for `loadedConfig.config.decks[*]`. The renderer should never request-decks because it has no way to validate what it gets back. CLI push means CLI knows what it sent.

4. **Simpler renderer code** — `parseIncoming` just dispatches `decks-list` to a setter; no request queue, no promise tracking, no "did this request time out" cleanup.

5. **Smaller protocol surface** — one direction of message instead of two. The renderer doesn't need a `request-decks` type at all.

## The implementation

```ts
// packages/cli/src/render/protocol.ts (CLI is authority)
const DecksListMessageSchema = z.object({
  type: z.literal('decks-list'),
  decks: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).min(1),
})
const SelectDeckMessageSchema = z.object({
  type: z.literal('select-deck'),
  deckId: z.string().min(1),
})
const MessageSchema = z.discriminatedUnion('type', [
  // ...existing messages...
  DecksListMessageSchema,
  SelectDeckMessageSchema,
])

// packages/cli/src/render/frontend-server.ts (or wherever ViteDeckRenderer lives)
class ViteDeckRenderer {
  private currentDecksList: DecksListMessage | null = null

  sendDecksList(decks: Array<{id: string, name: string}>): void {
    this.currentDecksList = { type: 'decks-list', decks }
    this.broadcast(this.currentDecksList)
  }

  onSelectDeck(handler: (deckId: string) => void): void {
    this.onMessage('select-deck', msg => handler(msg.deckId))
  }

  // Called whenever a new renderer connects
  private onRendererConnect(ws: WebSocket): void {
    if (this.currentDecksList) ws.send(JSON.stringify(this.currentDecksList))
  }
}
```

The renderer side:

```ts
// packages/cli/frontend-emulator/src/emulator/EmulatorShell.tsx
useEffect(() => {
  return ws.onMessage('decks-list', msg => setDecks(msg.decks))
}, [ws])

// DeckSelector.tsx
function DeckSelector({ decks, onSelect }: { decks: Deck[], onSelect: (id: string) => void }) {
  return (
    <div className="deck-selector">
      {decks.length === 0 && <span>awaiting decks-list from CLI</span>}
      {decks.map(d => (
        <button key={d.id} onClick={() => onSelect(d.id)}>{d.name}</button>
      ))}
    </div>
  )
}
```

## When to use this pattern

- The list is **owned by the server** (config, registered addons, active devices, etc.).
- The list is **stable for the process lifetime** (config doesn't change every second).
- The list is **small** (< ~1KB; one message, fits in a single WS frame).
- The client **picks one** (single-select, not a continuous stream of choices).

## When NOT to use this

- **Large lists** (hundreds/thousands of items) — broadcast-on-connect is wasteful if the client needs 3 items and there are 1000. Use paginated request-response.
- **Frequent updates** (the list changes every second) — broadcast every change is too noisy. Use change-notifications (`decks-list-delta`) instead.
- **Client-driven filtering** (the client wants to filter/search) — broadcast everything then filter client-side is wasteful. Use request-response with filter params.
- **Multi-authority state** (both client and server can modify the list) — broadcast-on-connect assumes server authority. If clients edit the list, you need request-response with conflict resolution.

## Anti-pattern: request-response for server-owned static state

```ts
// BAD — request-response for stable server-owned data
// Renderer
ws.send({type: 'request-decks'})
// CLI
onMessage('request-decks', () => sendDecksList())
```

This adds:

1. **Renderer state machine**: "did I send the request? Has it timed out? Do I retry? Do I cancel on unmount?"
2. **CLI state machine**: "is this renderer allowed to request? How often?"
3. **Reconnect race**: "did I receive decks-list yet, or do I request again?"

None of that is needed when the data is server-owned, stable, and small.

## Related

- `.planning/solutions/best-practices/env-injection-via-vite-transformindexhtml-2026-06-22.md` — when the data is even MORE stable (set at spawn time, never changes) → inject via env, not WS
- `packages/cli/src/render/protocol.ts` — full message schema with `PROTOCOL_VERSION = 1`
- `packages/cli/src/render/ws-bridge.ts` — broadcast + reconnect handling
