import { readFile, readdir, stat, unlink } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import type { AgentStatus } from "../shared/state.js"

/**
 * A live Claude Code session, as reported by the hook script.
 *
 * ponytail: the OpenCode equivalent comes from a plugin injected into
 * OpenCode's own config. Claude Code needs no plugin — it has first-class
 * hooks, which are the supported way to be told about session state. Same
 * lease directory and the same defensive parsing, so the two sources behave
 * identically from the provider's point of view.
 */
export interface ClaudeInstance {
  readonly instanceId: string
  readonly sessionId: string
  readonly pid: number | null
  readonly cwd: string
  readonly status: AgentStatus
  readonly updatedAt: number
  readonly transcriptPath?: string
}

/**
 * A `running`/`compacting` lease this old has missed its terminating event —
 * a hook timed out, or the machine slept mid-turn. Such a lease is downgraded
 * to `idle` rather than dropped, because the session itself is very likely
 * still alive.
 */
const TRANSIENT_LEASE_MAX_AGE_MS = 10 * 60 * 1000

/**
 * Absolute ceiling. Unlike OpenCode, which heartbeats every 5s, hooks are
 * event-driven: an idle session legitimately writes nothing for hours, so age
 * alone cannot mean "dead". Liveness comes from the pid check; this only stops
 * a lease surviving forever when the pid was never resolvable or got reused.
 */
const LEASE_HARD_MAX_AGE_MS = 24 * 60 * 60 * 1000

export const claudeInstanceDir = (): string =>
  join(
    process.env["XDG_STATE_HOME"] ?? join(homedir(), ".local", "state"),
    "sirenodeck",
    "coding-agents",
  )

export const claudeLeaseName = (sessionId: string): string =>
  `claude-${sessionId}.json`

const processIsAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const parseStatus = (value: unknown): AgentStatus | null =>
  value === "idle" ||
  value === "running" ||
  value === "waiting" ||
  value === "waiting_for_human" ||
  value === "error" ||
  value === "compacting"
    ? value
    : null

const parseLease = (raw: string, now: number): ClaudeInstance | null => {
  let value: Record<string, unknown>
  try {
    value = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }

  const sessionId = value["sessionId"]
  const cwd = value["cwd"]
  const updatedAt = value["updatedAt"]
  let status = parseStatus(value["state"])
  if (
    typeof sessionId !== "string" ||
    sessionId.length === 0 ||
    typeof cwd !== "string" ||
    typeof updatedAt !== "number" ||
    status === null
  ) {
    return null
  }

  const rawPid = value["pid"]
  const pid =
    typeof rawPid === "number" && Number.isInteger(rawPid) && rawPid > 0
      ? rawPid
      : null

  const age = now - updatedAt
  if (age > LEASE_HARD_MAX_AGE_MS) return null
  // The hook could not find the claude process, so there is nothing to probe;
  // fall back to the age ceiling above rather than suppressing the session.
  if (pid !== null && !processIsAlive(pid)) return null

  if (
    (status === "running" || status === "compacting") &&
    age > TRANSIENT_LEASE_MAX_AGE_MS
  ) {
    status = "idle"
  }

  const transcriptPath = value["transcriptPath"]
  return {
    instanceId: `claude:${sessionId}`,
    sessionId,
    pid,
    cwd,
    status,
    updatedAt,
    ...(typeof transcriptPath === "string" && transcriptPath.length > 0
      ? { transcriptPath }
      : {}),
  }
}

export interface ReadClaudeInstancesOptions {
  readonly dir?: string
  readonly now?: number
  /** Remove leases whose process is gone. The daemon is the only reader. */
  readonly prune?: boolean
}

export const readClaudeInstances = async (
  opts: ReadClaudeInstancesOptions = {},
): Promise<readonly ClaudeInstance[]> => {
  const dir = opts.dir ?? claudeInstanceDir()
  const now = opts.now ?? Date.now()

  let names: string[]
  try {
    names = (await readdir(dir)).filter(
      (name) => name.startsWith("claude-") && name.endsWith(".json"),
    )
  } catch {
    return []
  }

  const instances: ClaudeInstance[] = []
  for (const name of names) {
    const full = join(dir, name)
    let instance: ClaudeInstance | null = null
    try {
      instance = parseLease(await readFile(full, "utf8"), now)
    } catch {
      // A session may replace or remove its lease while the dir is read.
      continue
    }
    if (instance === null) {
      if (opts.prune === true) {
        try {
          await unlink(full)
        } catch {
          // Already gone, or not ours to remove.
        }
      }
      continue
    }
    // ponytail: hooks fire at turn boundaries, so between PreToolUse and Stop
    // the lease goes quiet while the session is very much working. The
    // transcript's mtime is a free heartbeat that keeps "last activity"
    // honest without asking the hook to poll.
    let updatedAt = instance.updatedAt
    if (instance.transcriptPath !== undefined) {
      try {
        const st = await stat(instance.transcriptPath)
        updatedAt = Math.max(updatedAt, st.mtimeMs)
      } catch {
        // Transcript moved or removed; the lease timestamp stands.
      }
    }
    instances.push({ ...instance, updatedAt })
  }
  return instances.sort((a, b) => b.updatedAt - a.updatedAt)
}
