# Coding Agents addon — multi-tool session status on the Stream Deck

- **Date:** 2026-08-24
- **Branch suggestion:** `feat/coding-agents-addon`
- **Product contract source:** ce-plan-bootstrap (user-supplied requirements + 3 clarifying answers)
- **Plan depth:** Standard
- **Status:** Draft

## 1. Goal

Ship a 3rd-party addon (`packages/addons/coding-agents/`) that surfaces the live status of coding-agent sessions running on the host — first iteration with OpenCode and Claude Code, with an abstraction ready for Codex/Pi later.

The addon contributes:

1. A summary button (`coding-agents:summary`) on the main deck that shows the agent logo + a status badge; tap opens a deck listing each running session.
2. A dynamic deck (`coding-agents:agents`) with one tile per agent — small logo, 2-line session name, status chip — generated live from the snapshot.
3. A normalized status state machine (`idle | running | waiting | waiting_for_human | error | compacting`).
4. OS notifications when an agent enters `waiting_for_human` or `error` (throttled per-session).
5. An `AgentProvider` interface so future tools (Codex, Pi) plug in as new files.

## 2. Settled decisions

| Decision                 | Choice                                                                                                                                                                                                      | Why                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Addon location           | `packages/addons/coding-agents/`                                                                                                                                                                            | Mirrors `pomodoro` / `app-shortcuts` 3rd-party pattern                                                   |
| Provider abstraction     | `AgentProvider` interface; first-iter impls: `OpenCodeProvider`, `ClaudeCodeProvider`                                                                                                                       | User picked "two providers in first iteration" to prove the seam                                         |
| Connection strategy      | Try-connect-first; spawn `opencode serve` as a child if absent                                                                                                                                              | User picked "both: try connect, spawn if absent"; claude-code has no server to spawn (file watch)        |
| OpenCode server URL      | Default `http://127.0.0.1:4096`; overridable via `config.coding-agents.opencodeUrl`                                                                                                                         | Matches OpenCode's `serve --port` default (opencode.ai/docs/server)                                      |
| Claude Code source       | Watch `~/.claude/projects/**/sessions/<id>.jsonl` for new tail lines; status derived from latest entry shape                                                                                                | CLI does not expose session status over HTTP; JSONL append-only is the canonical source                  |
| Status model             | `idle` / `running` / `waiting` / `waiting_for_human` / `error` / `compacting`                                                                                                                               | Normalizes OpenCode's `idle / busy / retry` + permission events + claude-code's stream states            |
| OpenCode → normalized    | `busy → running`; `idle → idle`; `retry → waiting`; permission `pending → waiting_for_human`; `session.error → error`; `compacting event → compacting`                                                      | Direct 1:1 mapping on top of OpenCode SSE events                                                         |
| Claude Code → normalized | assistant message without tool_use → `running`; tool_use without tool_result → `waiting` (rare); `permission_request` → `waiting_for_human`; `error`/`rate_limit` → `error`; last msg ≥ 30 min old → `idle` | Heuristic from JSONL tail — keeps it simple, no claude SDK dependency                                    |
| Surface shape            | One summary button + one dynamic agents deck                                                                                                                                                                | Matches `pomodoro` (single button + state channel) + `emoji-selector` (multi-page dynamic deck) patterns |
| Channel design           | One channel `coding-agents:agents` publishes `{ [providerId]: Agent[] }`; summary + deck both subscribe                                                                                                     | Avoids N channels; consistent with `weather:current`                                                     |
| Notification throttling  | One notification per `(providerId, sessionId, status)` transition; same transition twice in a row does not re-notify                                                                                        | Prevents notification spam on repeated SSE events                                                        |
| Persistence              | None — agents are ephemeral; daemon restart just re-fetches the snapshot                                                                                                                                    | Matches `media` player-state pattern                                                                     |
| Spawned child lifetime   | Tied to addon's `onLoad` → `onUnload`; aborted on daemon shutdown; killed via `signal` prop                                                                                                                 | Pattern shared with future asset/socket-driven addons                                                    |
| OpenCode logo            | `assets/opencode-dark-square.svg` (downloaded from `/brand` page, second image)                                                                                                                             | User instruction: "use the second image" of `https://opencode.ai/brand`                                  |
| Claude Code logo         | `assets/claude-code.svg` (downloaded from Anthropic brand kit / existing `app-shortcuts/assets/claude-code.svg` if suitable)                                                                                | Reuse sibling asset if it matches brand mark                                                             |
| Requirements check       | New addon `checks` entry: `opencode` reachable + `claude-code` JSONL dir readable                                                                                                                           | Uses existing `AddonCheck` surface (per `ARCHITECTURE.md §3.5`)                                          |

## 3. State + channel specification

### Normalized agent

```ts
type AgentStatus =
  "idle" | "running" | "waiting" | "waiting_for_human" | "error" | "compacting"

interface Agent {
  readonly sessionId: string
  readonly providerId: "opencode" | "claude-code"
  readonly title: string // session title, max 2 lines
  readonly status: AgentStatus
  readonly directory?: string // project cwd if known
  readonly updatedAt: number // epoch ms; for sort + idle detection
  readonly lastMessagePreview?: string // ≤ 60 chars; for the tile sub-line
}

interface AgentsSnapshot {
  readonly byProvider: Record<string, readonly Agent[]>
  readonly attention: readonly string[] // sessionIds needing human attention
  readonly generatedAt: number
}
```

### Channels

| Channel                | Payload          | Polled    | Push-merged                                   |
| ---------------------- | ---------------- | --------- | --------------------------------------------- |
| `coding-agents:agents` | `AgentsSnapshot` | yes (2 s) | yes (opencode SSE; claude-code JSONL watcher) |

Single global channel; both the summary button and the agents deck subscribe via `useAddonChannel<AgentsSnapshot>`.

### Button types

```ts
"coding-agents:summary" // single tile; logo + status badge + count
"coding-agents:agent" // one tile per agent; logo + 2-line name + status chip
```

### Methods (addon-global)

```ts
{
  getSnapshot(): AgentsSnapshot
  focus(sessionId): Promise<void>   // future: bring agent TUI to foreground
  dismissAttention(sessionId): void
}
```

The summary button's `onTap` calls `coreMethods.navigateToDeck({ id: "coding-agents:agents" })`.

The agent-tile button's `onTap` calls the addon's `focus(sessionId)`; `onHold` calls `dismissAttention(sessionId)`.

## 4. Files to change

### Workspace plumbing (root)

- `pnpm-workspace.yaml` — already globs `packages/addons/*`; no edit needed.
- Root `config.yml` — add `coding-agents-demo` deck (one summary button + one demo agents deck) wired to a local config (`opencodeUrl: http://127.0.0.1:4096`, `claudeCodeProjectsDir: ~/.claude/projects`).

### `packages/addons/coding-agents/` — NEW package

Modeled on `packages/addons/pomodoro/`:

- `package.json` — `{ name: "@sirenodeck/addon-coding-agents", version: "0.1.0", type: "module", main: "./dist/index.js", exports: { ".": "./dist/index.js", "./types": "./dist/types.d.ts" }, files: ["dist", "assets"], scripts: { build, typecheck, test, lint } }`. **Dep:** `@opencode-ai/sdk@^1.18.5` (already pinned in `.opencode/package.json`; reuse the same version). No `react` runtime dep — addon uses React via peer-style import only for frontend components, same as `pomodoro`.
- `sirenodeck.json` — `{ kind: "addon", apiVersion: 1, name: "coding-agents", entry: "./dist/index.js" }`.
- `tsconfig.json` + `tsconfig.build.json` — mirror `pomodoro`.
- `scripts/post-build.mjs` — copy `sirenodeck.json` and `assets/` into `dist/` (asset copy logic borrowed from pomodoro).
- `src/types.ts` — `AddonManifestV1` subset + `Agent`, `AgentStatus`, `AgentsSnapshot`, `AgentProvider`, `CoreMethods` re-declared locally (ponytail: same decoupling pomodoro uses).
- `src/index.ts` — `export { manifest } from "./manifest"`.
- `src/manifest.ts` — exports the manifest with both button types + dynamic deck entry + globalService.
- `src/shared/state.ts` — types `AgentStatus`, `Agent`, `AgentsSnapshot`; `CHANNEL = "coding-agents:agents"`; `notifiableStatus(s): boolean` helper (true for `waiting_for_human`, `error`); `mergeSnapshot(prev, delta)` reducer for incremental updates.
- `src/shared/notifier.ts` — pure helper `NotificationThrottle` (Map keyed by `${providerId}:${sessionId}:${status}`, dedupes consecutive same-status notifications).
- `src/shared/opencode-status.ts` — map `SessionStatus` + SSE event → `AgentStatus` (single switch statement; the only place that knows OpenCode semantics).
- `src/shared/claude-status.ts` — read tail of a JSONL session file → `AgentStatus` heuristic; helper to format `lastMessagePreview` from the latest assistant entry.
- `src/providers/opencode.ts` — `OpenCodeProvider implements AgentProvider`. Imports `@opencode-ai/sdk`, builds `createOpencodeClient({ baseUrl })`, listens to `/event` SSE for `session.status`, `session.idle`, `session.error`, `session.compacted`, `permission.updated`. On connect failure → throw `NotReachableError`.
- `src/providers/claude-code.ts` — `ClaudeCodeProvider implements AgentProvider`. Reads `~/.claude/projects/<project>/*.jsonl` with `chokidar` (already a transitive dep via Vite; add explicit dep). Maps each JSONL session file to an `Agent`. Status derived from the last meaningful line.
- `src/providers/spawn.ts` — `ensureOpencodeServer({ baseUrl, logger, signal })`: probe `/global/health`; if unreachable, spawn `opencode serve --port <port>` via `execa`; wait for `/global/health` to return `healthy`; return `{ child, baseUrl }`. Aborted via the addon's signal.
- `src/providers/registry.ts` — `loadProviders({ config, logger, signal })`: returns `Map<providerId, AgentProvider>`. Order: opencode first (fastest, push-based), then claude-code (file-watch). On opencode connect failure, tries the spawn path before giving up.
- `src/global/backend.ts` — `globalService`:
  - `pollers`: 1 entry, id `agents`, channel `coding-agents:agents`, intervalMs `2000`. Polls each provider's `fetchSnapshot(signal)`; merges via `mergeSnapshot`; publishes on the channel.
  - `subscriptions`: 1 entry, channel `coding-agents:agents`, subscribes to provider push events; on each event, calls `ctx.publish(merged)`.
  - `methods`: `getSnapshot`, `focus`, `dismissAttention`.
  - `onLoad`: load providers; if opencode missing + spawn enabled, call `ensureOpencodeServer`; start subscriptions; trigger initial poll.
  - `onUnload`: abort signal → spawn child killed, file watchers closed, SSE closed. Snapshot Map cleared.
- `src/buttons/summary/config.ts` — zod `.strict()` schema: optional `showCount?: boolean = true`, optional `attentionOnly?: boolean = false`.
- `src/buttons/summary/backend.ts` — `AddonButtonTypeService`. `onMount`: noop. `onTap`: `coreMethods.navigateToDeck({ id: "coding-agents:agents" })`. `dispose`: noop.
- `src/buttons/summary/frontend.tsx` — uses `useAddonChannel<AgentsSnapshot>(CHANNEL)`. Renders: large logo (24 px), label "Coding agents" or agent count, status chip (green = all running/idle, yellow = waiting_for_human, red = error, gray = none). When `attentionOnly`, only renders chip if `attention.length > 0`.
- `src/buttons/agent/config.ts` — zod schema (no fields; reserved for future).
- `src/buttons/agent/backend.ts` — `AddonButtonTypeService`. `onTap`: `methods["coding-agents:focus"](buttonId)` (buttonId is `<providerId>:<sessionId>`). `onHold`: `methods["coding-agents:dismissAttention"](buttonId)`.
- `src/buttons/agent/frontend.tsx` — uses `useAddonChannel<AgentsSnapshot>(CHANNEL)`, looks up agent by `buttonId`. Renders: small logo (top-left, 14 px), 2-line title (clipped), status chip bottom-right (color-coded).
- `src/decks/agents.ts` — exports `createDecks({ config, keyCount })`: returns `{ "coding-agents:agents": { name: "Agents", icon: "addon://coding-agents/assets/opencode-dark-square.svg", paginated: true, buttons: snapshot.byProvider.flatMap(providerAgents).slice(0, keyCount).map((a, i) => ({ position: i, type: "coding-agents:agent", config: { providerId: a.providerId, sessionId: a.sessionId } })) } }`. **Note:** since the snapshot is read at deck-config broadcast time, the deck is rebuilt each broadcast (every 2 s). The runtime already rebroadcasts on `runtime.invalidate()`; this is cheap (max 15 buttons × providers count). For very large counts, paginate.
- `src/manifest.ts` — wires it all together:
  ```ts
  {
    apiVersion: 1,
    name: "coding-agents",
    buttonTypes: {
      "coding-agents:summary": { frontend, service: { ...summaryBackend, gestureHandlers: ["tap"] } },
      "coding-agents:agent": { frontend, service: { ...agentBackend, gestureHandlers: ["tap", "hold"] } }
    },
    decks: [{ id: "coding-agents:agents", createDecks }],
    globalService,
    checks: [
      { name: "opencode-reachable", check: probeOpencodeHealth },
      { name: "claude-code-projects-readable", check: probeClaudeProjectsDir }
    ]
  }
  ```
- `src/__tests__/opencode-status.test.ts` — pure mapping tests for `opencode-status.ts`.
- `src/__tests__/claude-status.test.ts` — pure mapping tests for `claude-status.ts` (sample JSONL fixtures).
- `src/__tests__/notifier.test.ts` — `NotificationThrottle` keyed dedup.
- `src/__tests__/merge-snapshot.test.ts` — reducer semantics.
- `src/__tests__/opencode-provider.test.ts` — mocked SDK; asserts event handlers call `publish` with merged snapshot; reconnect on socket close.
- `src/__tests__/claude-provider.test.ts` — mocked chokidar; new file → agent appears, removed file → agent disappears, changed file → status update.
- `src/__tests__/spawn.test.ts` — `ensureOpencodeServer` happy path (mocked fetch returns 503 then 200); spawn-failed path; aborted signal path.
- `src/__tests__/global-backend.test.ts` — `onLoad` registers providers + spawns if needed; `onUnload` cleans up.
- `src/__tests__/summary-frontend.test.tsx` (jsdom) — channel subscription; renders count when `showCount: true`.
- `src/__tests__/agent-frontend.test.tsx` (jsdom) — finds agent by `buttonId`; renders logo + title + status chip.

### Assets

- `assets/opencode-dark-square.svg` — download from `https://opencode.ai/brand` (the second image of the page: `preview-opencode-logo-dark-square-*.png`, traced/converted to SVG if needed; or keep PNG and reference via `addon://coding-agents/assets/opencode-dark-square.png` if PNG works in the `Icon` component). Reuse the existing `app-shortcuts/assets/opencode.svg` as a fallback.
- `assets/claude-code.svg` — reuse `app-shortcuts/assets/claude-code.svg`.
- `assets/claude-code@2x.png` — optional high-DPI.

### Docs

- `packages/addons/coding-agents/README.md` — install snippet for `config.yml`, button config schemas, channel payload, screenshots of summary + agents deck, how to start `opencode serve` and where claude-code JSONL files live.

## 5. Implementation order

1. **Workspace skeleton** — `package.json`, `tsconfig*`, `sirenodeck.json`, `scripts/post-build.mjs`, empty manifest.
2. **Shared types + reducers + notifier** (pure modules) + tests.
3. **OpenCode provider** with mocked SDK + tests.
4. **Claude Code provider** with mocked chokidar + tests.
5. **Spawn helper** (`ensureOpencodeServer`) + tests.
6. **Global backend** wiring providers + spawn + subscriptions + tests.
7. **Manifest** with button types + deck entry + globalService + checks.
8. **Frontend components** (summary, agent) + tests (jsdom).
9. **Demo deck** in root `config.yml`.
10. **README** for the addon.
11. **Verify:** `pnpm lint && pnpm format && pnpm typecheck && pnpm test`.

## 6. Test scenarios

Per implementation unit:

- **`opencode-status.ts`** — `busy → running`; `idle → idle`; `retry → waiting` (with `next` preserved as `updatedAt` hint); permission `pending → waiting_for_human`; `session.error → error`; `compacting → compacting`. Unknown events → no-op (no status change).
- **`claude-status.ts`** — last line `assistant` + no `tool_use` → `running`; `assistant` + `tool_use` not followed by `tool_result` → `waiting`; `permission_request` line → `waiting_for_human`; `error` line → `error`; nothing for ≥ 30 min → `idle`. Empty file → not surfaced.
- **`NotificationThrottle`** — first `waiting_for_human` for `(p, s)` fires; same again is a no-op; transition to `error` fires; transition back to `waiting_for_human` fires (different status).
- **`mergeSnapshot`** — adds new agents, updates existing by `(providerId, sessionId)`, removes gone-by-id, preserves order by `updatedAt desc`.
- **`OpenCodeProvider`** — mocked SDK client: SSE event `session.status:busy` triggers `publish` with merged snapshot; reconnect on `EventSource` close calls `event.subscribe` again; provider calls `session.list()` on initial subscribe to seed the snapshot.
- **`ClaudeCodeProvider`** — chokidar `add` → fetch tail → publish; `change` → re-fetch tail → publish; `unlink` → publish without that agent.
- **`ensureOpencodeServer`** — health returns 200 immediately → no spawn, returns `baseUrl`; returns 503 then 200 after spawn → spawns `opencode serve`, returns child + baseUrl; spawn 5 s timeout fails with typed error; signal aborted during wait throws `AbortError`.
- **Global backend `onLoad`** — opencode reachable → no spawn; opencode unreachable + spawn enabled → spawn path runs; opencode unreachable + spawn disabled → provider absent, snapshot still publishes for claude-code; signal aborted during init throws.
- **Global backend `onUnload`** — kills spawned child (mocked `execa`); closes SSE (mocked `event.subscribe` returns `{ unsubscribe }` that gets called).
- **Summary frontend** — empty snapshot shows logo + "Coding agents" only; snapshot with 3 agents + 1 attention shows count badge in red; `attentionOnly: true` + no attention shows nothing.
- **Agent frontend** — buttonId `"opencode:abc123"` finds the agent; renders opencode logo + 2-line title + green chip for `running`.
- **Deck creation** — `createDecks` with 5 agents and `keyCount: 15` returns one deck with 5 buttons + free slots; 20 agents → first 15 buttons, `paginated: true`; 0 agents → deck with no buttons.
- **Manifest** — both button types prefixed `coding-agents:`; `globalService` exposes `methods`, `pollers`, `subscriptions`, `onLoad`, `onUnload`; `checks` array has 2 entries.
- **Bundled assets** — `dist/assets/opencode-dark-square.svg` (or `.png`) and `dist/assets/claude-code.svg` exist after `pnpm --filter @sirenodeck/addon-coding-agents build`.

## 7. Assumptions

- User already runs `opencode` TUI or `opencode serve` on the host, OR the addon's spawn path can do it. Either path satisfies "agent server reachable".
- OpenCode SDK `@opencode-ai/sdk` is a stable interface for the methods we use (`session.list`, `session.status`, `event.subscribe`). We re-pin to `^1.18.5` to match the version already in the monorepo.
- Claude Code session JSONL files are stable across versions (entry shapes: `user`, `assistant`, `tool_use`, `tool_result`, `permission_request`, `error`). If Anthropic changes them, the heuristic in `claude-status.ts` is the only file to update.
- The summary button is added to the user's main deck via `config.yml`; we ship a `demos/demo-coding-agents.yml` rather than injecting into `main`.
- Treat up to ~50 concurrent agents as the realistic ceiling — `keyCount: 15` means we paginate at > 14, the deck-rebuild cost is negligible (15 button objects).
- `coreMethods.notify` exists (it does, since `pomodoro` uses it). We use the existing `Methods.notify` shape unchanged.
- The addon is not exposed as a button `defaultButton` (`core:change-deck` etc.); users wire it via `config.yml`.
- `pnpm-workspace.yaml` already covers `packages/addons/*` (it does, per `pnpm-workspace.yaml`).
- `chokidar` is acceptable as a new dep (lighter than watching via `node:fs.watch`; existing monorepo may already have it transitively via Vite — verify and pin explicitly if not).

## 8. Out of scope (v1)

- Codex, Pi providers (architecture is ready; impl is one new file under `src/providers/`).
- Sending prompts / running slash commands from the deck (future `commands` method on the provider).
- Replying to permission requests from the deck (would require richer UI than the button affordance allows).
- Multi-server (e.g. two opencode instances) — single `opencodeUrl` config; expanding to a list is a follow-up.
- Per-agent click-to-focus that actually brings the TUI to the foreground (the `focus` method is a stub returning `void`; OS-level window focusing is a separate problem).
- Persistent agent history / "recently seen" deck.
- Theming of the status chip beyond the four colors above (theme tokens are available; we use them).
- HMR / live-reload during addon dev.

## 9. Verification

```sh
pnpm lint && pnpm format && pnpm typecheck && pnpm test
<<<<<<< HEAD
pnpm --filter @sirenodeck/cli run dev -- --emulator
=======
pnpm --filter @sireno-deck/cli run dev -- --emulator
>>>>>>> main
```

Manual recipe (matches `AGENTS.md`):

1. Start `opencode serve` (or have it already running) → confirm summary tile turns green with agent count.
2. Open an OpenCode session and send a prompt → tile flips to yellow → agent tile appears on the deck with `running` chip.
3. Trigger a permission request in OpenCode → tile flips to red → agent tile shows `waiting_for_human` chip → OS toast fires.
4. Approve the permission → chip returns to `running`/`idle`.
5. Force an error in a session → tile + OS toast fire for `error`.
6. Hold-tap an agent tile → attention badge clears (no OS toast on subsequent state change).
7. Kill the OpenCode server mid-test → spawned child is killed (or the existing one is detected as gone); addon logs the disconnect and shows "no agents" state without crashing the daemon.
