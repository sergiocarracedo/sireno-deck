// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type {
  AddonGlobalPoller,
  AddonGlobalService,
  AddonGlobalSubscription,
  AddonServiceContext,
  AddonServiceMethod,
} from "../types/types.js"
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { registerIconForDeck, getAssetByPath } from "@/core/icon-asset-registry"
import { resolveDaemonPaths } from "@/util/daemon"
import {
  agentKey,
  CHANNEL,
  EMPTY_SNAPSHOT,
  type Agent,
  type AgentsSnapshot,
  type ProviderId,
} from "../shared/state.js"
import { mergeSnapshot, listAgents } from "../shared/snapshot.js"
import { deckTarget, setLiveCount } from "../shared/live-count.js"
import { NotificationThrottle } from "../shared/notifier.js"
import {
  loadProviders,
  type ProviderRegistryConfig,
} from "../providers/registry.js"

export const POLLER_INTERVAL_MS = 2000

interface GlobalState {
  providers: Map<ProviderId, import("../shared/state.js").AgentProvider>
  spawnedChild: { kill: () => Promise<void> } | null
  unsubscribers: Array<() => void>
  lastSnapshot: AgentsSnapshot
  lastSeenStatus: Map<string, import("../shared/state.js").AgentStatus>
  throttle: NotificationThrottle
  context: AddonServiceContext | null
  icons: Partial<Record<ProviderId, string>>
}

const state: GlobalState = {
  providers: new Map(),
  spawnedChild: null,
  unsubscribers: [],
  lastSnapshot: EMPTY_SNAPSHOT,
  lastSeenStatus: new Map(),
  throttle: new NotificationThrottle(),
  context: null,
  icons: {},
}

// ponytail: deck re-materialization tracking — when the live agent count
// changes, ask the host to rebuild the (dynamic) agents deck so page count
// follows reality. Debounced to avoid rebuild storms during rapid churn.
let lastLiveCount = -1
let rebuildTimer: ReturnType<typeof setTimeout> | null = null

const syncLiveCountAndMaybeRebuild = (): void => {
  const count = listAgents(state.lastSnapshot).length
  setLiveCount(count)
  if (count === lastLiveCount) return
  lastLiveCount = count
  if (rebuildTimer !== null) clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null
    state.context?.requestDeckRebuild?.()
  }, 1500)
}

// ponytail: register both provider logos as WS assets (absolute paths, so no
// addonDirs needed) and publish their `asset://` ids in the snapshot. This is
// the only path that works in BOTH dev (vite middleware) and real (screenshots)
// mode — a bare `addon://` <img> would 404 in the real HTTP server.
const registerProviderIcons = (): Partial<Record<ProviderId, string>> => {
  const assets: Array<[ProviderId, string]> = [
    ["opencode", "assets/opencode-dark-square.svg"],
    ["claude-code", "assets/claude-code.svg"],
  ]
  const resolved: Array<[ProviderId, string]> = []
  for (const [id, rel] of assets) {
    try {
      const full = fileURLToPath(new URL(`../${rel}`, import.meta.url))
      registerIconForDeck(
        [{ id: `${id}-logo`, type: "icon", config: { icon: full } }],
        {},
      )
      const asset = getAssetByPath(full)
      if (asset !== undefined) resolved.push([id, `asset://${asset.id}`])
    } catch {
      // icon registration is best-effort; tiles fall back to text labels
    }
  }
  return Object.fromEntries(resolved) as Partial<Record<ProviderId, string>>
}

// --- reboot survival -------------------------------------------------------
// ponytail: persists lastSnapshot + lastSeenStatus under dataDir
// (XDG_STATE_HOME) so a systemd auto-restart after reboot rehydrates instead
// of replaying every agent as a fresh notification and showing an empty deck
// for one poll tick. No staleness cap — mergeSnapshot replaces per-provider
// lists wholesale on first live fetch, so stale data self-heals within ~2s.

const PERSISTED_FILE = "coding-agents-state.json"

interface PersistedState {
  snapshot: AgentsSnapshot
  lastSeenStatus: Array<[string, import("../shared/state.js").AgentStatus]>
}

const persistedStateFile = (): string | null => {
  try {
    return join(resolveDaemonPaths().dataDir, PERSISTED_FILE)
  } catch {
    return null
  }
}

const persistState = (): void => {
  const file = persistedStateFile()
  if (file === null) return
  try {
    const payload: PersistedState = {
      snapshot: state.lastSnapshot,
      lastSeenStatus: [...state.lastSeenStatus],
    }
    const tmp = `${file}.tmp.${process.pid}`
    writeFileSync(tmp, JSON.stringify(payload), "utf8")
    renameSync(tmp, file)
  } catch {
    // best-effort — disk full, perms, sandbox; never break the poll loop
  }
}

const hydratePersisted = (): void => {
  const file = persistedStateFile()
  if (file === null) return
  try {
    if (!existsSync(file)) return
    const raw = JSON.parse(
      readFileSync(file, "utf8"),
    ) as Partial<PersistedState>
    if (
      raw.snapshot &&
      typeof raw.snapshot === "object" &&
      typeof raw.snapshot.byProvider === "object" &&
      raw.snapshot.byProvider !== null
    ) {
      // recompute attention + generatedAt from real statuses instead of
      // trusting the serialized copy
      state.lastSnapshot = mergeSnapshot(EMPTY_SNAPSHOT, {
        opencode: raw.snapshot.byProvider["opencode"] ?? [],
        "claude-code": raw.snapshot.byProvider["claude-code"] ?? [],
      })
    }
    if (Array.isArray(raw.lastSeenStatus)) {
      state.lastSeenStatus = new Map(raw.lastSeenStatus)
    }
  } catch {
    // corrupt or unreadable → cold start; first publish overwrites the file
  }
}

const setStateFromProviders = async (): Promise<void> => {
  const next: Record<ProviderId, Agent[]> = {
    opencode: [],
    "claude-code": [],
  }
  for (const [id, provider] of state.providers) {
    try {
      const agents = await provider.fetchSnapshot(
        state.context?.signal ?? new AbortController().signal,
      )
      next[id] = [...agents]
    } catch {
      // provider transiently unavailable; keep last-known
    }
  }
  state.lastSnapshot = mergeSnapshot(state.lastSnapshot, next)
  persistState()
}

const fireNotices = (snapshot: AgentsSnapshot): void => {
  for (const list of Object.values(snapshot.byProvider)) {
    for (const a of list) {
      const k = agentKey(a)
      const prev = state.lastSeenStatus.get(k)
      if (prev === a.status) continue
      state.lastSeenStatus.set(k, a.status)
      state.throttle.evaluate({
        providerId: a.providerId,
        sessionId: a.sessionId,
        status: a.status,
        title: `${a.providerId === "opencode" ? "OpenCode" : "Claude Code"}: ${humanStatus(a.status)}`,
        body: a.title,
      })
    }
  }
}

const humanStatus = (s: import("../shared/state.js").AgentStatus): string => {
  switch (s) {
    case "idle":
      return "Idle"
    case "running":
      return "Running"
    case "waiting":
      return "Waiting"
    case "waiting_for_human":
      return "Needs approval"
    case "error":
      return "Error"
    case "compacting":
      return "Compacting"
  }
}

const publishSnapshot = (): AgentsSnapshot => {
  syncLiveCountAndMaybeRebuild()
  const payload: AgentsSnapshot = {
    ...state.lastSnapshot,
    icons: state.icons,
  }
  state.context?.publish(payload)
  return payload
}

const poller: AddonGlobalPoller = {
  id: "agents",
  channel: CHANNEL,
  intervalMs: POLLER_INTERVAL_MS,
  poll: async (ctx: AddonServiceContext) => {
    state.context = ctx
    await setStateFromProviders()
    fireNotices(state.lastSnapshot)
    return publishSnapshot()
  },
}

const subscription: AddonGlobalSubscription = {
  channel: CHANNEL,
  subscribe: (ctx: AddonServiceContext) => {
    state.context = ctx
    const unsubs: Array<() => void> = []
    for (const [id, provider] of state.providers) {
      const unsub = provider.subscribe(ctx.signal, () => {
        void (async () => {
          await setStateFromProviders()
          fireNotices(state.lastSnapshot)
          publishSnapshot()
        })()
      })
      unsubs.push(unsub)
      // record for unbind on addon unload (provider id captured for log only)
      void id
    }
    state.unsubscribers = unsubs
    return {
      unsubscribe: () => {
        for (const u of unsubs) {
          try {
            u()
          } catch {
            // ignore — provider may have already closed
          }
        }
        state.unsubscribers = []
      },
    }
  },
}

export const globalService: AddonGlobalService = {
  pollers: [poller],
  subscriptions: [subscription],
  methods: {
    getSnapshot: (() => state.lastSnapshot) as AddonServiceMethod,
    getDeckTarget: (() => deckTarget()) as AddonServiceMethod,
    dismissAttention: ((key: unknown) => {
      if (typeof key !== "string") return
      const [providerId, sessionId] = key.split(":")
      if (!providerId || !sessionId) return
      state.throttle.forget(providerId, sessionId)
      state.lastSeenStatus.delete(key)
    }) as AddonServiceMethod,
  },
  onLoad: async (ctx: AddonServiceContext, config?: unknown): Promise<void> => {
    state.context = ctx
    state.icons = registerProviderIcons()
    hydratePersisted()
    // ponytail: SIRENO_CAPTURE_FAKE_AGENTS=1 — capture-only stub. Bypasses
    // provider polling and injects a deterministic agent list so web captures
    // show realistic "Agents" tiles without a live opencode / claude-code.
    if (process.env["SIRENO_CAPTURE_FAKE_AGENTS"] === "1") {
      const now = Date.now()
      const fake: Agent[] = [
        {
          sessionId: "sireno-capture-opencode-1",
          providerId: "opencode" as ProviderId,
          title: "Refactor capture pipeline",
          status: "running" as const,
          directory: "/works/sirenodeck",
          updatedAt: now,
          createdAt: now - 1000 * 60 * 12,
        },
        {
          sessionId: "sireno-capture-opencode-2",
          providerId: "opencode" as ProviderId,
          title: "Fix flaky session tests",
          status: "idle" as const,
          directory: "/works/sirenodeck/packages/cli",
          updatedAt: now - 1000 * 60 * 4,
          createdAt: now - 1000 * 60 * 40,
        },
        {
          sessionId: "sireno-capture-claude-1",
          providerId: "claude-code" as ProviderId,
          title: "Migrate themes",
          status: "waiting_for_human" as const,
          directory: "/works/sirenodeck/packages/web",
          updatedAt: now - 1000 * 60 * 2,
          createdAt: now - 1000 * 60 * 90,
        },
      ]
      state.lastSnapshot = mergeSnapshot(state.lastSnapshot, {
        opencode: fake.filter((a) => a.providerId === "opencode"),
        "claude-code": fake.filter((a) => a.providerId === "claude-code"),
      })
      publishSnapshot()
      return
    }
    state.lastSnapshot = mergeSnapshot(state.lastSnapshot, {
      opencode: [],
      "claude-code": [],
    })
    const cfg: ProviderRegistryConfig = (config as
      | ProviderRegistryConfig
      | undefined) ?? {
      opencodeUrl: "http://127.0.0.1:4096",
      spawnOpencodeIfMissing: true,
    }
    const loaded = await loadProviders(cfg, ctx.signal)
    state.providers = loaded.providers as Map<ProviderId, never>
    state.spawnedChild = loaded.spawnedChild
    await setStateFromProviders()
    publishSnapshot()
  },
  onUnload: (): void => {
    for (const u of state.unsubscribers) {
      try {
        u()
      } catch {
        // ignore
      }
    }
    state.unsubscribers = []
    if (state.spawnedChild) {
      void state.spawnedChild.kill().catch(() => {})
      state.spawnedChild = null
    }
    state.providers.clear()
    state.lastSnapshot = EMPTY_SNAPSHOT
    state.lastSeenStatus.clear()
    state.throttle.reset()
    state.icons = {}
    state.context = null
    if (rebuildTimer !== null) clearTimeout(rebuildTimer)
    rebuildTimer = null
    lastLiveCount = -1
  },
}
