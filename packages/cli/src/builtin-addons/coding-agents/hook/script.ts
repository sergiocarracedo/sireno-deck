import { CLAUDE_HOOK_REGISTRATIONS } from "../shared/claude-hook-events.js"

export const CLAUDE_HOOK_MARKER =
  "SIRENODECK_INTEGRATION_ID=coding-agents-claude"
export const CLAUDE_HOOK_VERSION = 1
export const CLAUDE_HOOK_FILENAME = "sirenodeck-claude-hook.mjs"

/**
 * The hook script Claude Code runs. Node rather than sh: it needs real JSON
 * parsing and an atomic write, and `node -e ''` is cheaper here than the
 * python3 an existing third-party hook on this machine already pays.
 *
 * Invariants, in rough order of how badly they break the user if violated:
 *  - it always exits 0. A non-zero hook exit surfaces as an error inside the
 *    user's Claude Code session.
 *  - it never writes to stdout. Several events treat stdout as a decision
 *    payload or as context to feed the model.
 *  - it does nothing at all for subagents, so harness activity is aggregated
 *    into the parent session rather than surfacing as its own agent.
 */
export const claudeHookSource = `#!/usr/bin/env node
// ${CLAUDE_HOOK_MARKER}-v${CLAUDE_HOOK_VERSION}
// Managed by Sireno Deck. Reinstalling or updating the integration overwrites
// this file — add custom hooks beside it rather than editing it.
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { homedir } from "node:os"
import { join } from "node:path"

const STATUS_BY_EVENT = ${JSON.stringify(
  Object.fromEntries(CLAUDE_HOOK_REGISTRATIONS.map((r) => [r.event, r.status])),
  null,
  2,
)}

const dir = join(
  process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
  "sirenodeck",
  "coding-agents",
)

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString("utf8")
}

// Claude Code runs hooks through a shell, so process.ppid is the shell, not
// claude. Walk up a few hops looking for it. Failure is not fatal: the reader
// falls back to a time-based ceiling when pid is null.
const findClaudePid = () => {
  let pid = process.ppid
  for (let hop = 0; hop < 5 && pid > 1; hop += 1) {
    try {
      const out = execFileSync("ps", ["-o", "ppid=,comm=", "-p", String(pid)], {
        encoding: "utf8",
        timeout: 1000,
      }).trim()
      const match = out.match(/^(\\d+)\\s+(.*)$/)
      if (match === null) return null
      if (/(^|\\/)claude$/.test(match[2].trim())) return pid
      pid = Number(match[1])
    } catch {
      return null
    }
  }
  return null
}

const main = async () => {
  const event = process.argv[2] || ""
  const status = STATUS_BY_EVENT[event]
  if (status === undefined) return

  let payload = {}
  try {
    const raw = await readStdin()
    if (raw.trim()) payload = JSON.parse(raw)
  } catch {
    return
  }

  // Subagents are aggregated into their parent session, never reported alone.
  if (payload.agent_id) return

  const sessionId = payload.session_id
  if (typeof sessionId !== "string" || sessionId.length === 0) return
  const target = join(dir, "claude-" + sessionId + ".json")

  if (status === null) {
    try {
      unlinkSync(target)
    } catch {
      // Already gone.
    }
    return
  }

  const lease = {
    v: 1,
    harness: "claude-code",
    sessionId,
    pid: findClaudePid(),
    cwd: typeof payload.cwd === "string" ? payload.cwd : process.cwd(),
    state: status,
    event,
    updatedAt: Date.now(),
  }
  if (typeof payload.transcript_path === "string") {
    lease.transcriptPath = payload.transcript_path
  }
  if (typeof payload.permission_mode === "string") {
    lease.permissionMode = payload.permission_mode
  }

  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const tmp = target + ".tmp"
  writeFileSync(tmp, JSON.stringify(lease), { mode: 0o600 })
  renameSync(tmp, target)
}

main().catch(() => {}).finally(() => process.exit(0))
`
