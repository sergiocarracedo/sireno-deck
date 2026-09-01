import { readFile, readdir } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import type { AgentStatus } from "../shared/state.js"

export interface OpenCodeInstance {
  readonly instanceId: string
  readonly pid: number
  readonly cwd: string
  readonly sessionId?: string
  readonly status: AgentStatus
  readonly updatedAt: number
}

const LEASE_MAX_AGE_MS = 15_000

export const opencodeInstanceDir = (): string =>
  join(
    process.env["XDG_STATE_HOME"] ?? join(homedir(), ".local", "state"),
    "sirenodeck",
    "coding-agents",
  )

const processIsAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const isStatus = (value: unknown): value is AgentStatus =>
  value === "idle" ||
  value === "running" ||
  value === "waiting" ||
  value === "waiting_for_human" ||
  value === "error" ||
  value === "compacting"

const parseLease = (raw: string): OpenCodeInstance | null => {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const pid = value["pid"]
    const updatedAt = value["updatedAt"]
    const cwd = value["cwd"]
    const status = value["state"]
    if (
      typeof pid !== "number" ||
      !Number.isInteger(pid) ||
      pid <= 0 ||
      typeof updatedAt !== "number" ||
      typeof cwd !== "string" ||
      !isStatus(status) ||
      Date.now() - updatedAt > LEASE_MAX_AGE_MS ||
      !processIsAlive(pid)
    ) {
      return null
    }
    const sessionId = value["sessionID"]
    return {
      instanceId: `opencode:${pid}`,
      pid,
      cwd,
      status,
      updatedAt,
      ...(typeof sessionId === "string" && sessionId.length > 0
        ? { sessionId }
        : {}),
    }
  } catch {
    return null
  }
}

export const readOpenCodeInstances = async (): Promise<
  readonly OpenCodeInstance[]
> => {
  let names: string[]
  try {
    names = (await readdir(opencodeInstanceDir())).filter(
      (name) => name.startsWith("opencode-") && name.endsWith(".json"),
    )
  } catch {
    return []
  }

  const instances: OpenCodeInstance[] = []
  for (const name of names) {
    try {
      const instance = parseLease(
        await readFile(join(opencodeInstanceDir(), name), "utf8"),
      )
      if (instance !== null) instances.push(instance)
    } catch {
      // A process may replace or remove its lease while the directory is read.
    }
  }
  return instances.sort((a, b) => b.updatedAt - a.updatedAt)
}
