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
  const segments = value
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
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

export type MacroPlatform = "macos" | "linux" | "windows"

/**
 * Spellings accepted for a platform override. `osx` and `darwin` are here
 * because the older JSON macro form and `process.platform` use them
 * respectively — a user should not have to know which layer they are talking
 * to in order to name their own operating system.
 */
const PLATFORM_ALIASES: ReadonlyMap<string, MacroPlatform> = new Map([
  ["macos", "macos"],
  ["mac", "macos"],
  ["osx", "macos"],
  ["darwin", "macos"],
  ["linux", "linux"],
  ["windows", "windows"],
  ["win", "windows"],
  ["win32", "windows"],
])

export const currentMacroPlatform = (
  platform: string = process.platform,
): MacroPlatform => {
  if (platform === "darwin") return "macos"
  if (platform === "win32") return "windows"
  return "linux"
}

export interface PlatformMacro {
  readonly overrides: ReadonlyMap<MacroPlatform, string>
  /** The macro used by any platform without an override. Always present. */
  readonly fallback: string
}

export class MacroSyntaxError extends Error {}

/**
 * Parses `[os:override][os2:override2]default` into its parts.
 *
 * Overrides are a prefix run: parsing stops at the first character that is not
 * the start of a well-formed `[<known-os>:` block, and everything from there on
 * is the default verbatim. That keeps every macro that does not use the syntax
 * working untouched, including ones containing `]` — `macro://ctrl+]` never
 * enters bracket parsing because it does not begin with `[`.
 *
 * The consequence is that a literal `]` INSIDE an override would close it
 * early, so it must be written with its key name, `bracketright`. The default
 * segment has no such restriction.
 */
export const parsePlatformMacro = (value: string): PlatformMacro => {
  const overrides = new Map<MacroPlatform, string>()
  let rest = value

  while (rest.startsWith("[")) {
    const colon = rest.indexOf(":")
    if (colon === -1) break
    const rawName = rest.slice(1, colon).trim().toLowerCase()
    const platform = PLATFORM_ALIASES.get(rawName)
    // Not a platform override — e.g. a macro that genuinely starts with "[".
    // Leave it, and everything after it, as the default.
    if (platform === undefined) break
    const close = rest.indexOf("]", colon)
    if (close === -1) {
      throw new MacroSyntaxError(
        `macro: unterminated '[${rawName}:' override — add the closing ']'`,
      )
    }
    if (overrides.has(platform)) {
      throw new MacroSyntaxError(`macro: duplicate override for '${platform}'`)
    }
    const override = rest.slice(colon + 1, close).trim()
    if (override.length === 0) {
      throw new MacroSyntaxError(`macro: override for '${platform}' is empty`)
    }
    overrides.set(platform, override)
    rest = rest.slice(close + 1)
  }

  const fallback = rest.trim()
  if (fallback.length === 0) {
    // Deliberately mandatory: without it a macro would silently do nothing on
    // any platform the author did not think to list.
    throw new MacroSyntaxError(
      overrides.size > 0
        ? "macro: a default is required after the per-OS overrides, e.g. macro://[macos:cmd+c]ctrl+c"
        : "macro: requires a value, e.g. macro://ctrl+c",
    )
  }
  return { overrides, fallback }
}

/**
 * Picks the macro this platform should run. Platforms without an override get
 * the default, which is what makes `[windows:X]Y` mean "X on Windows, Y on
 * macOS and Linux".
 */
export const resolvePlatformMacro = (
  value: string,
  platform: string = process.platform,
): string => {
  const parsed = parsePlatformMacro(value)
  return parsed.overrides.get(currentMacroPlatform(platform)) ?? parsed.fallback
}

export const dispatchMacro = async (
  value: string,
  handlers: {
    runCommand: (cmd: string) => Promise<unknown>
    keyMacro: (action: {
      kind: "combo" | "key" | "text"
      value: string
    }) => Promise<void>
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
