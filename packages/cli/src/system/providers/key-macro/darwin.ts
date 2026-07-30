import type pino from "pino"

import { ProviderError } from "../error"
import { type CommandExecutor, withTimeout } from "../shared"
import { type KeyMacroProvider } from "../key-macro"
import { parseCombo } from "./parser"

export interface DarwinKeyMacroDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

const MOD_OSASCRIPT: ReadonlyMap<string, string> = new Map([
  ["ctrl", "command down"],
  ["meta", "command down"],
  ["alt", "option down"],
  ["shift", "shift down"],
])

const escapeOsascriptString = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

const KEY_ALIASES: ReadonlyMap<string, string> = new Map([
  ["plus", "+"],
  ["minus", "-"],
  ["equal", "="],
  ["comma", ","],
  ["period", "."],
])

const buildComboArgs = (input: string): string[] | null => {
  const parsed = parseCombo(input)
  if (parsed === null) return null

  const key = KEY_ALIASES.get(parsed.key) ?? parsed.key
  const needsShift = (parsed.key === "plus" || parsed.key === "minus") && !parsed.mods.includes("shift")
  const mods = needsShift
    ? [...parsed.mods, "shift"]
    : parsed.mods
  const modList = mods.map((m) => MOD_OSASCRIPT.get(m) ?? m).join(", ")
  const script = `tell application "System Events" to keystroke "${escapeOsascriptString(key)}" using {${modList}}`
  return ["-e", script]
}

const buildLiteralArgs = (input: string): string[] => {
  const script = `tell application "System Events" to keystroke "${escapeOsascriptString(input)}"`
  return ["-e", script]
}

export const createDarwinKeyMacroProvider = async (
  deps: DarwinKeyMacroDeps,
): Promise<KeyMacroProvider> => {
  deps.logger.info(
    "Darwin key-macro provider initialised (osascript; types any UTF-8 including emoji)",
  )
  const timeoutMs = deps.timeoutMs ?? 500
  return {
    async sendKey(input: string) {
      const args = buildComboArgs(input) ?? buildLiteralArgs(input)
      try {
        const result = await withTimeout(
          deps.executor.run("osascript", args),
          timeoutMs + 2500,
        )
        if (result.exitCode !== 0) {
          throw new ProviderError(
            "EXEC_FAILED",
            `osascript exited ${result.exitCode}: ${result.stderr.trim()}`,
          )
        }
      } catch (err) {
        if (err instanceof ProviderError) throw err
        throw new ProviderError(
          "EXEC_FAILED",
          `osascript failed: ${(err as Error).message ?? "unknown"}`,
        )
      }
    },
    async stop() {
      return
    },
  }
}
