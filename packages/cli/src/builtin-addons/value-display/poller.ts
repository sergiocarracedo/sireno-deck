import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { ActionExecutor } from "@/action/executor"
import type { AddonPoller } from "@/addon/api-types"

export interface ValueDisplayPollerDeps {
  readonly executor: ActionExecutor
}

interface ValueEntryConfig {
  readonly label: string
  readonly command: string
}

const readValueDisplayConfig = (): ReadonlyArray<ValueEntryConfig> => {
  try {
    const configPath = join(process.cwd(), "config.yml")
    if (!existsSync(configPath)) return []
    const raw = readFileSync(configPath, "utf8")
    const block = raw.match(/core:value-display:\s*\n((?:\s+[^\n]+\n)*)/)
    if (block === null) return []
    const inner = block[1] ?? ""
    const entries: ValueEntryConfig[] = []
    const matches = [
      ...inner.matchAll(/-\s+label:\s*(\S+)\s*\n\s+command:\s*"?([^"\n]+)"?/g),
    ]
    for (const m of matches) {
      const label = (m[1] ?? "").replace(/^["']|["']$/g, "")
      const command = (m[2] ?? "").replace(/^["']|["']$/g, "").trim()
      if (label.length > 0 && command.length > 0)
        entries.push({ label, command })
    }
    return entries
  } catch {
    return []
  }
}

export const createPoller = (deps: ValueDisplayPollerDeps): AddonPoller => {
  const entries = readValueDisplayConfig()
  return {
    channels: [
      {
        channel: "value-display:values",
        intervalMs: 5_000,
        poll: async () => {
          const values: Array<{
            label: string
            value: string
            units?: string
          }> = []
          for (const e of entries) {
            try {
              const res = await deps.executor.run(e.command, {
                timeoutMs: 5_000,
              })
              values.push({
                label: e.label,
                value: (res.stdout ?? "").trim().split("\n")[0] ?? "",
              })
            } catch {
              values.push({ label: e.label, value: "err" })
            }
          }
          return { values }
        },
      },
    ],
  }
}
