import type pino from "pino"

import {
  ProviderError,
  type KeyMacroProvider,
  withTimeout,
} from "@/system/provider"
import { parseCombo } from "@/system/key-macro/parser"

export interface CommandExecutor {
  run(
    command: string,
    args: ReadonlyArray<string>,
    options?: { timeoutMs?: number },
  ): Promise<{
    exitCode: number
    stdout: string
    stderr: string
  }>
}

export interface WindowsKeyMacroDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

const MOD_SENDKEYS: ReadonlyMap<string, string> = new Map([
  ["ctrl", "^"],
  ["meta", "^"],
  ["alt", "%"],
  ["shift", "+"],
])

const SPECIAL_KEYS: ReadonlyMap<string, string> = new Map([
  ["Return", "{ENTER}"],
  ["Enter", "{ENTER}"],
  ["Tab", "{TAB}"],
  ["Escape", "{ESC}"],
  ["BackSpace", "{BS}"],
  ["Up", "{UP}"],
  ["Down", "{DOWN}"],
  ["Left", "{LEFT}"],
  ["Right", "{RIGHT}"],
  ["Home", "{HOME}"],
  ["End", "{END}"],
  ["Page_Up", "{PGUP}"],
  ["Page_Down", "{PGDN}"],
  ["Insert", "{INS}"],
  ["Delete", "{DEL}"],
  ["space", " "],
])

const escapeForPowerShellSingleQuote = (s: string): string =>
  s.replace(/'/g, "''")

const buildSendKeysString = (input: string): string | null => {
  const parsed = parseCombo(input)
  if (parsed === null) return null
  const mods = parsed.mods.map((m) => MOD_SENDKEYS.get(m) ?? m).join("")
  const key =
    SPECIAL_KEYS.get(parsed.key) ??
    (parsed.key.length === 1 ? parsed.key.toLowerCase() : `{${parsed.key}}`)
  return mods + key
}

const buildLiteralString = (input: string): string => input

const escapeForDoubleQuote = (s: string): string => s.replace(/[\\"$]/g, "\\$&")

export const createWindowsKeyMacroProvider = async (
  deps: WindowsKeyMacroDeps,
): Promise<KeyMacroProvider> => {
  deps.logger.info(
    "Windows key-macro provider initialised (PowerShell SendKeys)",
  )
  const timeoutMs = deps.timeoutMs ?? 5_000
  return {
    async sendKey(input: string) {
      const sendKeys = buildSendKeysString(input) ?? buildLiteralString(input)
      const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapeForPowerShellSingleQuote(escapeForDoubleQuote(sendKeys))}')`
      try {
        const result = await withTimeout(
          deps.executor.run("powershell", ["-NoProfile", "-Command", script], {
            timeoutMs,
          }),
          timeoutMs + 500,
        )
        if (result.exitCode !== 0) {
          throw new ProviderError(
            "EXEC_FAILED",
            `powershell SendKeys exited ${result.exitCode}: ${result.stderr.trim()}`,
          )
        }
      } catch (err) {
        if (err instanceof ProviderError) throw err
        throw new ProviderError(
          "EXEC_FAILED",
          `powershell failed: ${(err as Error).message ?? "unknown"}`,
        )
      }
    },
    async stop() {
      return
    },
  }
}
