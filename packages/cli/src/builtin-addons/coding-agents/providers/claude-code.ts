import { open, readdir, stat } from "node:fs/promises"
import { basename, join } from "node:path"

import chokidar, { type FSWatcher } from "chokidar"

// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type { Agent, AgentProvider } from "../shared/state.js"
import {
  deriveClaudeStatus,
  type ClaudeJsonlEntry,
} from "../shared/claude-status.js"
import { readClaudeInstances, type ClaudeInstance } from "./claude-instances.js"

export const CLAUDE_LOGO = "addon://coding-agents/assets/claude-code.svg"

export interface ClaudeCodeProviderOptions {
  readonly projectsDir?: string
  readonly recentWindowMs?: number
  /** Off in tests that only exercise transcript ingest. */
  readonly readLeases?: boolean
}

const DEFAULT_PROJECTS_DIR = join(
  process.env["HOME"] ?? "~",
  ".claude",
  "projects",
)

// ponytail: "live" window — sessions idle longer than this stay off the deck.
const RECENT_WINDOW_MS = 6 * 60 * 60 * 1000

// ponytail: the reporting machine had 136 MB across 105 transcripts, and the
// old ingest read EVERY file in full on startup and re-read a whole multi-MB
// file on every append. Enumerate by mtime, read only the tail, and cap the
// working set.
const MAX_SESSIONS = 32
const TAIL_BYTES = 256 * 1024
const TAIL_RETRY_BYTES = 1024 * 1024
const SCAN_DEBOUNCE_MS = 1_500

// A session transcript is named for its UUID. Subagent transcripts live in a
// `subagents/` subdirectory as `agent-<hex>.jsonl`, and abandoned ones are
// renamed `<uuid>.orphaned-<ts>-<hash>.jsonl`. This one pattern excludes both:
// 56 of those 105 files were subagents, and each would otherwise have been
// surfaced as its own agent tile — exactly the harness noise the summary is
// meant to aggregate away.
const SESSION_FILE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i

interface TailState {
  size: number
  entries: ClaudeJsonlEntry[]
}

export class ClaudeCodeProvider implements AgentProvider {
  readonly id = "claude-code" as const
  readonly displayName = "Claude Code"
  readonly logoPath = CLAUDE_LOGO

  readonly #projectsDir: string
  readonly #recentWindowMs: number
  readonly #leasesEnabled: boolean

  constructor(opts: ClaudeCodeProviderOptions = {}) {
    this.#projectsDir = opts.projectsDir ?? DEFAULT_PROJECTS_DIR
    this.#recentWindowMs = opts.recentWindowMs ?? RECENT_WINDOW_MS
    this.#leasesEnabled = opts.readLeases ?? true
  }

  async fetchSnapshot(_signal: AbortSignal): Promise<readonly Agent[]> {
    // ponytail: this used to serve purely from a map that only subscribe()
    // ever filled — and subscribe() was never called, because the host never
    // wired `globalService.subscriptions`. One missing call silently produced
    // "zero Claude Code sessions" forever. fetchSnapshot now scans on its own
    // (debounced, since the poller runs every 2s) and subscribe() is only a
    // latency optimisation, so neither can silently disable the other.
    await this.#maybeScan()
    const cutoff = Date.now() - this.#recentWindowMs
    const fromTranscripts = [...this.#agents.values()].filter(
      (a) => a.updatedAt >= cutoff,
    )
    const leases = this.#leasesEnabled
      ? await readClaudeInstances({ prune: true })
      : []
    return mergeLeases(fromTranscripts, leases)
  }

  #lastScanAt = 0
  #scanInFlight: Promise<void> | null = null

  async #maybeScan(): Promise<void> {
    if (this.#scanInFlight !== null) return this.#scanInFlight
    if (Date.now() - this.#lastScanAt < SCAN_DEBOUNCE_MS) return
    const run = this.#scan(() => undefined).finally(() => {
      this.#lastScanAt = Date.now()
      this.#scanInFlight = null
    })
    this.#scanInFlight = run
    return run
  }

  subscribe(signal: AbortSignal, onChange: () => void): () => void {
    const watcher: FSWatcher = chokidar.watch(this.#projectsDir, {
      // ponytail: transcripts live at projects/<slug>/<uuid>.jsonl, so depth 2
      // is enough. Depth 6 also indexed every subagents/, tool-results/ and
      // memory/ directory — thousands of files chokidar had no use for.
      ignored: (path) =>
        path.endsWith(".lock") ||
        path.includes("/subagents/") ||
        path.includes("/tool-results/") ||
        path.includes("/memory/"),
      persistent: true,
      ignoreInitial: false,
      depth: 2,
    })

    let timer: NodeJS.Timeout | null = null

    const schedule = (): void => {
      // ponytail: this used to start a NEW timer per event, so a burst of N
      // appends created N timers; only the first did any work and the rest
      // still fired. Coalesce onto a single pending timer instead.
      if (timer !== null) return
      timer = setTimeout(() => {
        timer = null
        onChange()
      }, 250)
    }

    void this.#scan(onChange)

    const touch = (filePath: string): void => {
      if (!isSessionTranscript(filePath)) return
      void this.#ingestFile(filePath, schedule)
    }

    watcher.on("add", touch)
    watcher.on("change", touch)
    watcher.on("unlink", (filePath: string) => {
      if (!isSessionTranscript(filePath)) return
      this.#tails.delete(filePath)
      if (this.#agents.delete(sessionIdFromPath(filePath))) schedule()
    })

    signal.addEventListener("abort", () => {
      void watcher.close()
    })

    return () => {
      if (timer !== null) clearTimeout(timer)
      void watcher.close()
    }
  }

  readonly #agents = new Map<string, Agent>()

  async #scan(onChange: () => void): Promise<void> {
    // ponytail: enumerate by NAME and MTIME only — never by opening files.
    // On the reporting machine this takes the candidate set from 105 files
    // (136 MB) to 9, before a single byte of transcript is read.
    let found: Array<{ path: string; mtimeMs: number }> = []
    try {
      const entries = await readdir(this.#projectsDir, {
        withFileTypes: true,
        recursive: true,
      })
      const cutoff = Date.now() - this.#recentWindowMs
      const stats = await Promise.all(
        entries
          .filter((e) => e.isFile() && isSessionTranscript(e.name))
          .map(async (e) => {
            const full = join(e.parentPath ?? this.#projectsDir, e.name)
            // Belt and braces: a rename of the subagent layout must not start
            // surfacing them as top-level agents.
            if (full.includes("/subagents/")) return null
            try {
              const st = await stat(full)
              return st.mtimeMs >= cutoff
                ? { path: full, mtimeMs: st.mtimeMs }
                : null
            } catch {
              return null
            }
          }),
      )
      found = stats.filter(
        (x): x is { path: string; mtimeMs: number } => x !== null,
      )
    } catch {
      return
    }

    found.sort((a, b) => b.mtimeMs - a.mtimeMs)
    const live = found.slice(0, MAX_SESSIONS)
    const liveIds = new Set(live.map((f) => sessionIdFromPath(f.path)))

    for (const file of live) {
      await this.#ingestFile(file.path, onChange, file.mtimeMs)
    }

    // Drop anything no longer live, and keep the tail cache bounded alongside.
    for (const id of [...this.#agents.keys()]) {
      if (!liveIds.has(id)) this.#agents.delete(id)
    }
    for (const path of [...this.#tails.keys()]) {
      if (!live.some((f) => f.path === path)) this.#tails.delete(path)
    }
  }

  readonly #tails = new Map<string, TailState>()

  /**
   * Reads only what is new. The first read takes the tail of the file; later
   * reads take just the bytes appended since. A whole transcript is never read
   * again — the largest here is 8 MB and grows while a session runs.
   */
  async #readNewEntries(
    filePath: string,
    size: number,
  ): Promise<ClaudeJsonlEntry[] | null> {
    const prev = this.#tails.get(filePath)
    // Truncated or rotated → start over.
    const from = prev !== undefined && size >= prev.size ? prev.size : null

    const readFrom = async (offset: number): Promise<string | null> => {
      const length = size - offset
      if (length <= 0) return ""
      const handle = await open(filePath, "r")
      try {
        const buf = Buffer.allocUnsafe(length)
        await handle.read(buf, 0, length, offset)
        return buf.toString("utf8")
      } finally {
        await handle.close()
      }
    }

    try {
      if (from !== null) {
        const chunk = await readFrom(from)
        if (chunk === null) return null
        const appended = parseEntries(chunk)
        const entries = [...prev!.entries, ...appended].slice(-MAX_ENTRIES)
        this.#tails.set(filePath, { size, entries })
        return entries
      }

      // First sight of this file: take the tail, dropping the leading partial
      // line. Retry once wider if the window caught no assistant entry — a
      // single tool result can be larger than the default tail.
      for (const window of [TAIL_BYTES, TAIL_RETRY_BYTES]) {
        const offset = Math.max(0, size - window)
        const chunk = await readFrom(offset)
        if (chunk === null) return null
        const body = offset > 0 ? chunk.slice(chunk.indexOf("\n") + 1) : chunk
        const entries = parseEntries(body).slice(-MAX_ENTRIES)
        const usable =
          offset === 0 || entries.some((e) => e.type === "assistant")
        if (usable || window === TAIL_RETRY_BYTES) {
          this.#tails.set(filePath, { size, entries })
          return entries
        }
      }
      return null
    } catch {
      return null
    }
  }

  async #ingestFile(
    filePath: string,
    onChange: () => void,
    mtimeMs?: number,
  ): Promise<void> {
    const sessionId = sessionIdFromPath(filePath)
    try {
      const st = await stat(filePath)
      const entries = await this.#readNewEntries(filePath, st.size)
      if (entries === null || entries.length === 0) return

      // Pass mtime as the fallback so a transcript with no timestamps reports
      // when the file last changed, rather than "now" — which made such files
      // permanently live.
      const derived = deriveClaudeStatus(
        entries,
        Date.now(),
        mtimeMs ?? st.mtimeMs,
      )
      if (derived === null) return

      const existing = this.#agents.get(sessionId)
      const title = titleFromEntries(entries) ?? existing?.title ?? sessionId
      const usage = contextTokensFromEntries(entries)
      const agent: Agent = {
        sessionId,
        providerId: "claude-code",
        title,
        status: derived.status,
        updatedAt: derived.updatedAt,
        ...(derived.createdAt !== undefined
          ? { createdAt: derived.createdAt }
          : {}),
        ...(derived.preview !== undefined
          ? { lastMessagePreview: derived.preview }
          : {}),
        ...(usage !== undefined ? { contextTokens: usage } : {}),
        ...(derived.cwd !== undefined
          ? { directory: derived.cwd }
          : existing?.directory !== undefined
            ? { directory: existing.directory }
            : {}),
      }
      this.#agents.set(sessionId, agent)
      onChange()
    } catch {
      // file may be unreadable; skip
    }
  }
}

const MAX_ENTRIES = 400

const parseEntries = (raw: string): ClaudeJsonlEntry[] => {
  const out: ClaudeJsonlEntry[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    try {
      out.push(JSON.parse(trimmed) as ClaudeJsonlEntry)
    } catch {
      // skip malformed line
    }
  }
  return out
}

/**
 * Context size of the newest real assistant turn.
 *
 * ponytail: `costUSD` no longer exists in Claude Code 2.1.x transcripts, so the
 * old cost sum was permanently zero. Real accounting lives on `message.usage`.
 * Sidechain (subagent) entries are skipped so a subagent's context does not
 * masquerade as the session's.
 */
const contextTokensFromEntries = (
  entries: readonly ClaudeJsonlEntry[],
): number | undefined => {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const e = entries[i] as
      | (ClaudeJsonlEntry & {
          isSidechain?: boolean
          message?: { usage?: Record<string, unknown> }
        })
      | undefined
    if (e?.type !== "assistant" || e.isSidechain === true) continue
    const usage = e.message?.usage
    if (usage === undefined) continue
    const num = (k: string): number =>
      typeof usage[k] === "number" ? (usage[k] as number) : 0
    if (num("output_tokens") <= 0) continue
    const total =
      num("input_tokens") +
      num("cache_creation_input_tokens") +
      num("cache_read_input_tokens") +
      num("output_tokens")
    return total > 0 ? total : undefined
  }
  return undefined
}

/**
 * True only for a top-level session transcript.
 *
 * Accepts `<uuid>.jsonl` and nothing else, which excludes subagent transcripts
 * (`subagents/agent-<hex>.jsonl`) and abandoned ones
 * (`<uuid>.orphaned-<ts>-<hash>.jsonl`) in a single rule.
 */
const isSessionTranscript = (pathOrName: string): boolean => {
  const base = pathOrName.split("/").pop() ?? pathOrName
  return SESSION_FILE_RE.test(base)
}

const sessionIdFromPath = (filePath: string): string => {
  const base = filePath.split("/").pop() ?? filePath
  return base.replace(/\.jsonl$/, "")
}

const titleFromEntries = (
  entries: readonly ClaudeJsonlEntry[],
): string | undefined => {
  for (const e of entries) {
    const summary = (e as { summary?: unknown }).summary
    if (typeof summary === "string" && summary.length > 0) return summary
  }
  for (const e of entries) {
    if (e.type === "user") {
      const content = flattenUserText(e.message?.content)
      if (content) return content
    }
  }
  return undefined
}

const flattenUserText = (content: unknown): string | undefined => {
  if (typeof content === "string") {
    return content.length > 80 ? `${content.slice(0, 79)}…` : content
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      if (
        part !== null &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text: unknown }).text === "string"
      ) {
        const text = (part as { text: string }).text
        return text.length > 80 ? `${text.slice(0, 79)}…` : text
      }
    }
  }
  return undefined
}

/**
 * Folds hook-written leases over transcript-derived agents.
 *
 * ponytail: dedup MUST happen here, not in the frontend. The summary tile
 * counts by flattening every provider's list, so emitting both a lease agent
 * and a transcript agent for one session would double-count it.
 *
 * The lease wins anything it knows first-hand — status, directory, and the
 * instance identity a transcript cannot supply. The transcript keeps what only
 * it has: the title, the preview and the context size.
 */
export const mergeLeases = (
  fromTranscripts: readonly Agent[],
  leases: readonly ClaudeInstance[],
): readonly Agent[] => {
  const bySession = new Map<string, Agent>()
  for (const agent of fromTranscripts) bySession.set(agent.sessionId, agent)

  for (const lease of leases) {
    const existing = bySession.get(lease.sessionId)
    if (existing === undefined) {
      // A session whose transcript has not been flushed yet: surface it now
      // rather than making the user wait for the first write.
      bySession.set(lease.sessionId, {
        sessionId: lease.sessionId,
        instanceId: lease.instanceId,
        providerId: "claude-code",
        title: basename(lease.cwd) || "Claude Code",
        status: lease.status,
        directory: lease.cwd,
        createdAt: lease.updatedAt,
        updatedAt: lease.updatedAt,
        ...(lease.pid !== null ? { pid: lease.pid } : {}),
      })
      continue
    }
    bySession.set(lease.sessionId, {
      ...existing,
      instanceId: lease.instanceId,
      status: lease.status,
      directory: lease.cwd,
      updatedAt: Math.max(existing.updatedAt, lease.updatedAt),
      ...(lease.pid !== null ? { pid: lease.pid } : {}),
    })
  }
  return [...bySession.values()]
}
