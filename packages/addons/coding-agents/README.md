# Coding Agents

A third-party workspace addon for the Sireno Deck that surfaces the live
status of coding-agent sessions — **OpenCode** and **Claude Code** in v1,
designed so Codex / Pi / others plug in as new `AgentProvider` files.

The addon contributes:

- **`coding-agents:summary`** — a single Stream Deck key with the agent
  logo + a status badge. Tap opens the agents deck.
- **`coding-agents:agent`** — one tile per running session: small
  provider logo, 2-line title, status chip.
- **`coding-agents:agents`** — a dynamic deck (paginated) listing all
  live sessions from every registered provider.
- OS notifications when an agent enters `waiting_for_human` (permission
  request) or `error` state.

## State model

Each agent is normalized into one of six statuses regardless of provider:

| Status              | Meaning                                 | Notification |
| ------------------- | --------------------------------------- | ------------ |
| `idle`              | Session exists but no work for ≥ 30 min | —            |
| `running`           | Actively producing                      | —            |
| `waiting`           | Retry / rate-limited / mid-tool-call    | —            |
| `waiting_for_human` | Permission requested, awaiting approval | ✓            |
| `error`             | Provider reported an error              | ✓            |
| `compacting`        | OpenCode session.compacted event        | —            |

Notifications fire only on transitions into a notifiable state — repeated
SSE events of the same status do not re-notify.

## Providers

| Provider      | Source                                                   | Auto-spawn?                                                        |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `opencode`    | HTTP API at `http://127.0.0.1:4096` (configurable) + SSE | Yes — runs `opencode serve --port <port>` if not already reachable |
| `claude-code` | File watch over `~/.claude/projects/**/*.jsonl`          | No — CLI writes JSONL; watcher reads tail                          |

The `opencodeUrl` is read from the addon's `config.opencodeUrl` (default
`http://127.0.0.1:4096`). Set `spawnOpencodeIfMissing: false` to disable
auto-spawn.

## Install

```yaml
# config.yml
addons:
  - src: ./packages/addons/coding-agents
    config:
      opencodeUrl: http://127.0.0.1:4096 # optional; default
      spawnOpencodeIfMissing: true # optional; default
      claudeCodeProjectsDir: ~/.claude/projects # optional; default
```

Add the summary button to your main deck:

```yaml
decks:
  main:
    buttons:
      - position: 4
        type: "coding-agents:summary"
        config:
          showCount: true # optional; default
          attentionOnly: false # optional; default
```

Tap the summary to navigate to `coding-agents:agents`, which lists every
live session (paginated if more than `keyCount`).

## Per-agent tile config

```yaml
- type: "coding-agents:agent"
  config:
    providerId: opencode # optional; resolved from buttonId at runtime
    sessionId: "<session-id>" # optional; resolved from buttonId at runtime
```

The button `id` (passed by the runtime) is the agent key
(`<providerId>:<sessionId>`). The config fields are only required for
statically-declared buttons; the dynamic agents deck passes neither.

## Channel

```
coding-agents:agents → AgentsSnapshot {
  byProvider: { opencode: Agent[], "claude-code": Agent[] },
  attention: string[],         // sessionIds needing human attention
  generatedAt: number
}
```

Polled every 2 s; also push-merged on OpenCode SSE events and Claude Code
file-watcher changes.

## Methods (addon-global)

| Method                                | Purpose                                |
| ------------------------------------- | -------------------------------------- |
| `coding-agents:getSnapshot()`         | Read the latest snapshot synchronously |
| `coding-agents:focus(key)`            | Stub — OS-level window focusing is v2  |
| `coding-agents:dismissAttention(key)` | Clear attention badge for a session    |

## Requirements checks

The manifest exposes two `AddonCheck` entries used by the daemon's startup
banner:

- `opencode-reachable` — probes `GET /global/health` at the configured URL.
- `claude-code-projects-readable` — checks `~/.claude/projects` exists.

Both surface as warnings in the startup banner; the daemon never blocks on
them.

## Build

```sh
pnpm --filter @sirenodeck/addon-coding-agents build
```

Emits `dist/index.js`, `dist/index.d.ts`, `dist/sirenodeck.json`, and
`dist/assets/{opencode-dark-square.svg,claude-code.svg}`.

## Test

```sh
pnpm --filter @sirenodeck/addon-coding-agents test
```

47 tests covering the status mappers, merge-snapshot reducer, notifier
throttle, OpenCode / Claude providers, spawn helper, manifest shape, and
the global backend lifecycle.

## Architecture

```
src/
├── shared/
│   ├── state.ts         Agent, AgentStatus, AgentsSnapshot, AgentProvider, CHANNEL
│   ├── snapshot.ts      mergeSnapshot reducer
│   ├── notifier.ts      NotificationThrottle (status-transition dedup)
│   ├── opencode-status.ts  OpencodeEvent → AgentStatus mapper
│   └── claude-status.ts    ClaudeJsonlEntry tail → AgentStatus mapper
├── providers/
│   ├── opencode.ts      OpenCodeProvider (SDK + SSE)
│   ├── claude-code.ts   ClaudeCodeProvider (chokidar)
│   ├── spawn.ts         ensureOpencodeServer (try-connect → spawn)
│   └── registry.ts      loadProviders (compose map of providers)
├── buttons/
│   ├── summary/         coding-agents:summary (logo + count badge)
│   └── agent/           coding-agents:agent (small logo + title + chip)
├── decks/agents.ts      createDecks for the dynamic agents deck
├── global/backend.ts    globalService (pollers + subscriptions + methods + lifecycle)
├── manifest.ts          AddonManifestV1 (button types + decks + globalService + checks)
├── types/types.ts       Local re-declaration of AddonManifestV1 surface
└── index.ts             re-export
```

Adding a new provider (Codex, Pi, …) is a single new file under
`src/providers/` plus a one-line registry entry.

## License

MIT — same as the parent project.
