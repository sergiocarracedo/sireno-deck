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

export interface LinuxKeyMacroDeps {
  readonly executor: CommandExecutor
  readonly env: Readonly<Record<string, string>>
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

type KeyTool = "xdotool" | "ydotool" | "dotool"

const probeOrder = (sessionType: string | undefined): KeyTool[] => {
  const order: KeyTool[] =
    sessionType === "wayland"
      ? ["ydotool", "xdotool", "dotool"]
      : ["xdotool", "ydotool", "dotool"]
  return order
}

const probeTools = async (
  executor: CommandExecutor,
  order: KeyTool[],
): Promise<KeyTool | null> => {
  for (const tool of order) {
    const result = await executor.run("which", [tool])
    if (result.exitCode === 0 && result.stdout.trim().length > 0) {
      return tool
    }
  }
  return null
}

const XDOTOOL_MOD_MAP: ReadonlyMap<string, string> = new Map([
  ["ctrl", "ctrl"],
  ["alt", "alt"],
  ["shift", "shift"],
  ["meta", "super"],
  ["super", "super"],
  ["hyper", "super"],
])

const toXdotoolKey = (parsed: { mods: string[]; key: string }): string => {
  const parts = parsed.mods.map((m) => XDOTOOL_MOD_MAP.get(m) ?? m)
  parts.push(parsed.key)
  return parts.join("+")
}

const buildXdotoolArgs = (parsed: {
  mods: string[]
  key: string
}): string[] => ["key", toXdotoolKey(parsed)]

const buildLiteralArgs = (text: string): string[] => ["type", "--", text]

const buildYdotoolArgs = (parsed: {
  mods: string[]
  key: string
}): string[] => {
  const parts: string[] = []
  for (const mod of parsed.mods) {
    if (mod === "ctrl") parts.push("ctrl")
    else if (mod === "alt") parts.push("alt")
    else if (mod === "shift") parts.push("shift")
    else if (mod === "meta" || mod === "super") parts.push("super")
  }
  parts.push(parsed.key)
  return ["key", parts.join("+")]
}

const buildDotoolArgs = (parsed: { mods: string[]; key: string }): string[] => {
  const parts = [...parsed.mods, parsed.key]
  return ["key", parts.join("+")]
}

const buildArgs = (tool: KeyTool, input: string): string[] => {
  const parsed = parseCombo(input)
  if (parsed !== null) {
    if (tool === "xdotool") return buildXdotoolArgs(parsed)
    if (tool === "ydotool") return buildYdotoolArgs(parsed)
    return buildDotoolArgs(parsed)
  }
  if (tool === "xdotool" || tool === "ydotool") return buildLiteralArgs(input)
  return ["type", input]
}

const runTool = async (
  tool: KeyTool,
  args: string[],
  deps: LinuxKeyMacroDeps,
): Promise<void> => {
  const timeoutMs = deps.timeoutMs ?? 5_000
  const result = await withTimeout(
    deps.executor.run(tool, args, { timeoutMs }),
    timeoutMs + 500,
  )
  if (result.exitCode !== 0) {
    throw new ProviderError(
      "EXEC_FAILED",
      `${tool} ${args.join(" ")} exited with code ${result.exitCode}: ${result.stderr.trim()}`,
    )
  }
}

export const createLinuxKeyMacroProvider = async (
  deps: LinuxKeyMacroDeps,
): Promise<KeyMacroProvider> => {
  const sessionType = deps.env["XDG_SESSION_TYPE"]
  const order = probeOrder(sessionType)
  const tool = await probeTools(deps.executor, order)
  if (tool === null) {
    deps.logger.warn(
      { tool, sessionType },
      "No xdotool/ydotool/dotool found on PATH; key-macro will throw ProviderError",
    )
    return {
      async sendKey(_comboOrText: string) {
        throw new ProviderError(
          "NOT_AVAILABLE",
          "No key-macro tool (xdotool/ydotool/dotool) found on PATH",
        )
      },
      async stop() {
        return
      },
    }
  }

  deps.logger.info({ tool, sessionType }, "Linux key-macro tool selected")

  return {
    async sendKey(input: string) {
      await runTool(tool, buildArgs(tool, input), deps)
    },
    async stop() {
      return
    },
  }
}
