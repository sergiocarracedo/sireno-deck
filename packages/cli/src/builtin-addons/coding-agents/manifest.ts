// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
// This module is imported by the frontend's virtual addons/registry, so the
// import graph reachable from here must stay browser-safe: no static imports
// of node builtins or node-only modules. Node-side pieces (globalService,
// provider registry) live behind global-entry.ts / dynamic imports.
import agentBackend from "./buttons/agent/backend.js"
import agentFrontend from "./buttons/agent/frontend.js"
import summaryBackend from "./buttons/summary/backend.js"
import summaryFrontend from "./buttons/summary/frontend.js"
import { createAgentsDecks } from "./decks/agents.js"
import type { AddonManifestV1 } from "./types/types.js"

const probeOpencodeReachable = async (): Promise<{
  available: boolean
  reason?: string
}> => {
  for (const url of ["http://127.0.0.1:4096", "http://127.0.0.1:4095"]) {
    try {
      const res = await fetch(`${url}/global/health`, {
        signal: AbortSignal.timeout(2000),
      })
      if (!res.ok) continue
      const body = (await res.json()) as { healthy?: boolean }
      if (body.healthy === true) return { available: true }
    } catch {
      // Try the other supported local server port.
    }
  }
  return { available: false, reason: "unreachable" }
}

const probeClaudeProjectsDir = async (): Promise<{
  available: boolean
  reason?: string
}> => {
  const { readdir } = await import("node:fs/promises")
  const path = `${process.env["HOME"] ?? "~"}/.claude/projects`
  try {
    await readdir(path)
    return { available: true }
  } catch (err) {
    return {
      available: false,
      reason: err instanceof Error ? err.message : `${path} unreadable`,
    }
  }
}

export const manifest = {
  apiVersion: 1,
  name: "coding-agents",
  buttonTypes: {
    "coding-agents:summary": {
      frontend:
        summaryFrontend as unknown as AddonManifestV1["buttonTypes"][string]["frontend"],
      service:
        summaryBackend as unknown as AddonManifestV1["buttonTypes"][string]["service"],
      name: "summary",
    },
    "coding-agents:agent": {
      frontend:
        agentFrontend as unknown as AddonManifestV1["buttonTypes"][string]["frontend"],
      service:
        agentBackend as unknown as AddonManifestV1["buttonTypes"][string]["service"],
      name: "agent",
    },
  },
  decks: [
    {
      createDecks:
        createAgentsDecks as unknown as AddonManifestV1["decks"] extends ReadonlyArray<
          infer D
        >
          ? D extends { createDecks?: infer F }
            ? F
            : never
          : never,
    },
  ] as unknown as AddonManifestV1["decks"],
  checks: [
    { name: "opencode-reachable", check: probeOpencodeReachable },
    {
      name: "opencode-installed",
      // ponytail: dynamic import keeps providers/registry (node-only) out of
      // the browser graph — the check body only ever runs on the daemon side.
      check: async () => {
        const { opencodeInstalled } = await import("./providers/registry.js")
        const installed = await opencodeInstalled()
        return installed
          ? { available: true }
          : { available: false, reason: "opencode CLI not found on $PATH" }
      },
    },
    { name: "claude-code-projects-readable", check: probeClaudeProjectsDir },
  ],
} satisfies AddonManifestV1

export default manifest
