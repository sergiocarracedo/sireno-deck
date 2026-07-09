import { parseCombo } from "@/system/providers/key-macro/parser"

export type MacroStep =
  | { kind: "combo"; value: string }
  | { kind: "key"; value: string }
  | { kind: "text"; value: string }
  | { kind: "delay"; ms: number }

const DELAY_RE = /^(\d+)(ms|s|m|h)$/

const parseDelay = (raw: string): number | null => {
  const m = raw.match(DELAY_RE)
  if (m === null) return null
  const n = Number(m[1])
  const unit = m[2]
  if (unit === "ms") return n
  if (unit === "s") return n * 1000
  if (unit === "m") return n * 60_000
  if (unit === "h") return n * 3_600_000
  return null
}

export const parseMacro = (value: string): MacroStep[] => {
  const segments = value.split(";").map((s) => s.trim()).filter((s) => s.length > 0)
  const steps: MacroStep[] = []
  for (const seg of segments) {
    const lc = seg.toLowerCase()
    if (lc.startsWith("delay(") && lc.endsWith(")")) {
      const inner = lc.slice(6, -1)
      const ms = parseDelay(inner)
      if (ms !== null) {
        steps.push({ kind: "delay", ms })
        continue
      }
    }
    const parsed = parseCombo(seg)
    if (parsed !== null) {
      const combo =
        parsed.mods.length > 0
          ? `${parsed.mods.join("+")}+${parsed.key}`
          : parsed.key
      steps.push({ kind: "combo", value: combo })
      continue
    }
    steps.push({ kind: "text", value: seg })
  }
  return steps
}

export const dispatchMacro = async (
  value: string,
  handlers: {
    runCommand: (cmd: string) => Promise<unknown>
    keyMacro: (action: { kind: "combo" | "key" | "text"; value: string }) => Promise<void>
  },
): Promise<void> => {
  const steps = parseMacro(value)
  for (const step of steps) {
    if (step.kind === "delay") {
      await new Promise<void>((resolve) => setTimeout(resolve, step.ms))
      continue
    }
    if (step.kind === "combo") {
      await handlers.keyMacro({ kind: "combo", value: step.value })
      continue
    }
    if (step.kind === "key") {
      await handlers.keyMacro({ kind: "key", value: step.value })
      continue
    }
    await handlers.keyMacro({ kind: "text", value: step.value })
  }
}
