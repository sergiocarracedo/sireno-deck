import { readFile } from "node:fs/promises"
import { join } from "node:path"

import chokidar, { type FSWatcher } from "chokidar"

import type { Agent, AgentProvider } from "../shared/state"
import {
  deriveClaudeStatus,
  type ClaudeJsonlEntry,
} from "../shared/claude-status"

export const CLAUDE_LOGO = "addon://coding-agents/assets/claude-code.svg"

export interface ClaudeCodeProviderOptions {
  readonly projectsDir?: string
}

const DEFAULT_PROJECTS_DIR = join(
  process.env["HOME"] ?? "~",
  ".claude",
  "projects",
)

export class ClaudeCodeProvider implements AgentProvider {
  readonly id = "claude-code" as const
  readonly displayName = "Claude Code"
  readonly logoPath = CLAUDE_LOGO

  readonly #projectsDir: string

  constructor(opts: ClaudeCodeProviderOptions = {}) {
    this.#projectsDir = opts.projectsDir ?? DEFAULT_PROJECTS_DIR
  }

  async fetchSnapshot(_signal: AbortSignal): Promise<readonly Agent[]> {
    // ponytail: snapshot is served from the in-memory map populated by
    // the watcher. fetchSnapshot is only called on the poller; subscribe()
    // is the source of truth.
    return [...this.#agents.values()]
  }

  subscribe(signal: AbortSignal, onChange: () => void): () => void {
    const watcher: FSWatcher = chokidar.watch(this.#projectsDir, {
      ignored: (path) => path.endsWith(".lock"),
      persistent: true,
      ignoreInitial: false,
      depth: 6,
    })

    let dirty = false

    const schedule = (): void => {
      dirty = true
      // ponytail: coalesce bursts of file events into one onChange per tick.
      // Claude Code sessions can append several lines in a few ms; we don't
      // want to re-publish per event.
      setTimeout(() => {
        if (dirty) {
          dirty = false
          onChange()
        }
      }, 100)
    }

    void this.#scan(onChange)

    watcher.on("add", (filePath: string) => {
      if (!isSessionJsonl(filePath)) return
      void this.#ingestFile(filePath, onChange)
    })
    watcher.on("change", (filePath: string) => {
      if (!isSessionJsonl(filePath)) return
      void this.#ingestFile(filePath, () => schedule())
    })
    watcher.on("unlink", (filePath: string) => {
      if (!isSessionJsonl(filePath)) return
      const sessionId = sessionIdFromPath(filePath)
      if (this.#agents.delete(sessionId)) {
        schedule()
      }
    })

    signal.addEventListener("abort", () => {
      void watcher.close()
    })

    return () => {
      void watcher.close()
    }
  }

  readonly #agents = new Map<string, Agent>()

  async #scan(onChange: () => void): Promise<void> {
    // ponytail: read the projects dir recursively with no fs dependency on
    // chokidar's scan API. Each .jsonl is one session; we map → ingest.
    const { readdir, stat } = await import("node:fs/promises")
    const seen = new Set<string>()
    const walk = async (dir: string): Promise<void> => {
      let entries: string[]
      try {
        entries = await readdir(dir)
      } catch {
        return
      }
      for (const name of entries) {
        const full = join(dir, name)
        try {
          const st = await stat(full)
          if (st.isDirectory()) {
            await walk(full)
          } else if (isSessionJsonl(full)) {
            seen.add(full)
            await this.#ingestFile(full, onChange)
          }
        } catch {
          // ignore — file may have been removed mid-walk
        }
      }
    }
    await walk(this.#projectsDir)
  }

  async #ingestFile(filePath: string, onChange: () => void): Promise<void> {
    const sessionId = sessionIdFromPath(filePath)
    try {
      const raw = await readFile(filePath, "utf8")
      const entries: ClaudeJsonlEntry[] = []
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (trimmed.length === 0) continue
        try {
          entries.push(JSON.parse(trimmed) as ClaudeJsonlEntry)
        } catch {
          // skip malformed line
        }
      }
      const derived = deriveClaudeStatus(entries)
      if (derived === null) return
      const existing = this.#agents.get(sessionId)
      const title = titleFromEntries(entries) ?? existing?.title ?? sessionId
      const agent: Agent = {
        sessionId,
        providerId: "claude-code",
        title,
        status: derived.status,
        updatedAt: derived.updatedAt,
        ...(derived.preview !== undefined
          ? { lastMessagePreview: derived.preview }
          : {}),
        ...(existing?.directory !== undefined
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

const isSessionJsonl = (path: string): boolean =>
  path.endsWith(".jsonl") && !path.endsWith(".lock.jsonl")

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
