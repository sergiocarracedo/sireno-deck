import type pino from "pino"

import { ProviderError } from "../error"
import { createClipboardProvider, type ClipboardProvider } from "../clipboard"
import { type CommandExecutor, withTimeout } from "../shared"
import { type KeyMacroProvider } from "../key-macro"
import { parseCombo } from "./parser"

export interface LinuxKeyMacroDeps {
  readonly executor: CommandExecutor
  readonly env: Readonly<Record<string, string>>
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

const YDOTOOL_TOOL = "ydotool"
const WTYPE_TOOL = "wtype"

type Tool = "ydotool" | "wtype"

const YDOTOOL_CLIPBOARD_PRE_DELAY_MS = 50

// Linux input-event-codes.h — only the codes we need.
const SC_LEFTCTRL = 29
const SC_LEFTALT = 56
const SC_LEFTSHIFT = 42
const SC_LEFTMETA = 125 // also used for Super/Hyper

const SC_ESC = 1
const SC_1 = 2
const SC_2 = 3
const SC_3 = 4
const SC_4 = 5
const SC_5 = 6
const SC_6 = 7
const SC_7 = 8
const SC_8 = 9
const SC_9 = 10
const SC_0 = 11
const SC_MINUS = 12
const SC_EQUAL = 13
const SC_BACKSPACE = 14
const SC_TAB = 15
const SC_Q = 16
const SC_W = 17
const SC_E = 18
const SC_R = 19
const SC_T = 20
const SC_Y = 21
const SC_U = 22
const SC_I = 23
const SC_O = 24
const SC_P = 25
const SC_LEFTBRACE = 26
const SC_RIGHTBRACE = 27
const SC_ENTER = 28
const SC_A = 30
const SC_S = 31
const SC_D = 32
const SC_F = 33
const SC_G = 34
const SC_H = 35
const SC_J = 36
const SC_K = 37
const SC_L = 38
const SC_SEMICOLON = 39
const SC_APOSTROPHE = 40
const SC_GRAVE = 41
const SC_BACKSLASH = 43
const SC_Z = 44
const SC_X = 45
const SC_C = 46
const SC_V = 47
const SC_B = 48
const SC_N = 49
const SC_M = 50
const SC_COMMA = 51
const SC_DOT = 52
const SC_SLASH = 53
const SC_KPDOT = 83
const SC_KP0 = 82
const SC_KP1 = 79
const SC_KP2 = 80
const SC_KP3 = 81
const SC_KP4 = 75
const SC_KP5 = 76
const SC_KP6 = 77
const SC_KP7 = 71
const SC_KP8 = 72
const SC_KP9 = 73
const SC_CAPSLOCK = 58
const SC_SPACE = 57
const SC_F1 = 59
const SC_F2 = 60
const SC_F3 = 61
const SC_F4 = 62
const SC_F5 = 63
const SC_F6 = 64
const SC_F7 = 65
const SC_F8 = 66
const SC_F9 = 67
const SC_F10 = 68
const SC_F11 = 87
const SC_F12 = 88
const SC_NUMLOCK = 69
const SC_SCROLLLOCK = 70
const SC_KPENTER = 96
const SC_KPPLUS = 78
const SC_KPMINUS = 74
const SC_KPASTERISK = 55
const SC_KPSLASH = 98
const SC_HOME = 102
const SC_UP = 103
const SC_PAGEUP = 104
const SC_LEFT = 105
const SC_RIGHT = 106
const SC_END = 107
const SC_DOWN = 108
const SC_PAGEDOWN = 109
const SC_INSERT = 110
const SC_DELETE = 111
const SC_PAUSE = 119
const SC_PRINT = 99
const SC_MENU = 139
const SC_F13 = 183
const SC_F14 = 184
const SC_F15 = 185
const SC_F16 = 186
const SC_F17 = 187
const SC_F18 = 188
const SC_F19 = 189
const SC_F20 = 190
const SC_F21 = 191
const SC_F22 = 192
const SC_F23 = 193
const SC_F24 = 194

const MOD_SCANCODES: ReadonlyMap<string, number> = new Map<string, number>([
  ["ctrl", SC_LEFTCTRL],
  ["alt", SC_LEFTALT],
  ["shift", SC_LEFTSHIFT],
  ["meta", SC_LEFTMETA],
  ["super", SC_LEFTMETA],
  ["hyper", SC_LEFTMETA],
])

const MOD_ORDER: ReadonlyArray<string> = ["ctrl", "alt", "shift", "super"]

const modToScancode = (mod: string): number | null =>
  MOD_SCANCODES.get(mod) ?? null

const namedKeyToScancode = (name: string): number | null => {
  switch (name) {
    case "Escape":
      return SC_ESC
    case "Tab":
      return SC_TAB
    case "Return":
      return SC_ENTER
    case "BackSpace":
      return SC_BACKSPACE
    case "Caps_Lock":
      return SC_CAPSLOCK
    case "Num_Lock":
      return SC_NUMLOCK
    case "Scroll_Lock":
      return SC_SCROLLLOCK
    case "space":
      return SC_SPACE
    case "Print":
      return SC_PRINT
    case "Pause":
      return SC_PAUSE
    case "Menu":
      return SC_MENU
    case "Insert":
      return SC_INSERT
    case "Delete":
      return SC_DELETE
    case "Home":
      return SC_HOME
    case "End":
      return SC_END
    case "Page_Up":
      return SC_PAGEUP
    case "Page_Down":
      return SC_PAGEDOWN
    case "Up":
      return SC_UP
    case "Down":
      return SC_DOWN
    case "Left":
      return SC_LEFT
    case "Right":
      return SC_RIGHT
    case "F1":
      return SC_F1
    case "F2":
      return SC_F2
    case "F3":
      return SC_F3
    case "F4":
      return SC_F4
    case "F5":
      return SC_F5
    case "F6":
      return SC_F6
    case "F7":
      return SC_F7
    case "F8":
      return SC_F8
    case "F9":
      return SC_F9
    case "F10":
      return SC_F10
    case "F11":
      return SC_F11
    case "F12":
      return SC_F12
    case "F13":
      return SC_F13
    case "F14":
      return SC_F14
    case "F15":
      return SC_F15
    case "F16":
      return SC_F16
    case "F17":
      return SC_F17
    case "F18":
      return SC_F18
    case "F19":
      return SC_F19
    case "F20":
      return SC_F20
    case "F21":
      return SC_F21
    case "F22":
      return SC_F22
    case "F23":
      return SC_F23
    case "F24":
      return SC_F24
    default:
      return null
  }
}

const LETTER_SC: ReadonlyMap<string, number> = new Map<string, number>([
  ["a", SC_A],
  ["b", SC_B],
  ["c", SC_C],
  ["d", SC_D],
  ["e", SC_E],
  ["f", SC_F],
  ["g", SC_G],
  ["h", SC_H],
  ["i", SC_I],
  ["j", SC_J],
  ["k", SC_K],
  ["l", SC_L],
  ["m", SC_M],
  ["n", SC_N],
  ["o", SC_O],
  ["p", SC_P],
  ["q", SC_Q],
  ["r", SC_R],
  ["s", SC_S],
  ["t", SC_T],
  ["u", SC_U],
  ["v", SC_V],
  ["w", SC_W],
  ["x", SC_X],
  ["y", SC_Y],
  ["z", SC_Z],
])

const DIGIT_SC: ReadonlyMap<string, number> = new Map<string, number>([
  ["0", SC_0],
  ["1", SC_1],
  ["2", SC_2],
  ["3", SC_3],
  ["4", SC_4],
  ["5", SC_5],
  ["6", SC_6],
  ["7", SC_7],
  ["8", SC_8],
  ["9", SC_9],
])

const keyToScancode = (key: string): number | null => {
  const fromNamed = namedKeyToScancode(key)
  if (fromNamed !== null) return fromNamed
  const fromLetter = LETTER_SC.get(key)
  if (fromLetter !== undefined) return fromLetter
  const fromDigit = DIGIT_SC.get(key)
  if (fromDigit !== undefined) return fromDigit
  return null
}

const probeTool = async (
  executor: CommandExecutor,
  tool: Tool,
): Promise<boolean> => {
  const result = await executor.run("which", [tool])
  return result.exitCode === 0 && result.stdout.trim().length > 0
}

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`

const YDOTOOL_CTRL_V_ARGS: string[] = [
  "key",
  `${SC_LEFTCTRL}:1`,
  `${SC_V}:1`,
  `${SC_V}:0`,
  `${SC_LEFTCTRL}:0`,
]  

const buildYdotoolComboArgs = (input: string): string[] | null => {
  const parsed = parseCombo(input)
  if (parsed === null) return null

  const seen = new Set<string>()
  const orderedMods: number[] = []
  for (const mod of MOD_ORDER) {
    if (parsed.mods.includes(mod) && !seen.has(mod)) {
      const sc = modToScancode(mod)
      if (sc === null) {
        throw new ProviderError(
          "EXEC_FAILED",
          `ydotool: cannot map modifier '${mod}' to scancode`,
        )
      }
      seen.add(mod)
      orderedMods.push(sc)
    }
  }
  for (const mod of parsed.mods) {
    if (seen.has(mod)) continue
    const sc = modToScancode(mod)
    if (sc === null) {
      throw new ProviderError(
        "EXEC_FAILED",
        `ydotool: cannot map modifier '${mod}' to scancode`,
      )
    }
    seen.add(mod)
    orderedMods.push(sc)
  }

  const keySc = keyToScancode(parsed.key)
  if (keySc === null) {
    throw new ProviderError(
      "EXEC_FAILED",
      `ydotool: cannot map key '${parsed.key}' to scancode (combo keys must be alphanumeric or a named key)`,
    )
  }

  const args: string[] = ["key"]
  for (const sc of orderedMods) args.push(`${sc}:1`)
  args.push(`${keySc}:1`)
  args.push(`${keySc}:0`)
  for (let i = orderedMods.length - 1; i >= 0; i -= 1) {
    args.push(`${orderedMods[i]}:0`)
  }
  return args
}

const buildYdotoolLiteralArgs = (text: string): string[] => {
  return ["type", "--", text]
}

const buildYdotoolArgs = (input: string): string[] => {
  const combo = buildYdotoolComboArgs(input)
  if (combo !== null) return combo
  return buildYdotoolLiteralArgs(input)
}

const buildWtypeComboArgs = (input: string): string[] | null => {
  const parsed = parseCombo(input)
  if (parsed === null) return null

  const seen = new Set<string>()
  const orderedMods: string[] = []
  for (const mod of MOD_ORDER) {
    if (parsed.mods.includes(mod) && !seen.has(mod)) {
      let wtype = mod
      if (mod === "meta" || mod === "hyper") wtype = "super"
      seen.add(mod)
      orderedMods.push(wtype)
    }
  }
  for (const mod of parsed.mods) {
    if (seen.has(mod)) continue
    let wtype = mod
    if (mod === "meta" || mod === "hyper") wtype = "super"
    seen.add(mod)
    orderedMods.push(wtype)
  }

  const args: string[] = []
  for (const m of orderedMods) args.push("-M", m)
  args.push("-k", parsed.key)
  for (let i = orderedMods.length - 1; i >= 0; i -= 1) {
    args.push("-m", orderedMods[i]!)
  }
  return args
}

const buildWtypeLiteralArgs = (text: string): string[] => {
  return [shellQuote(text)]
}

const buildWtypeArgs = (input: string): string[] => {
  const combo = buildWtypeComboArgs(input)
  if (combo !== null) return combo
  return buildWtypeLiteralArgs(input)
}

const isPureAscii = (text: string): boolean => /^[\x00-\x7F]*$/.test(text)

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const runYdotool = async (
  args: string[],
  deps: LinuxKeyMacroDeps,
): Promise<void> => {
  const baseTimeoutMs = deps.timeoutMs ?? 500
  try {
    const result = await withTimeout(
      deps.executor.run(YDOTOOL_TOOL, args),
      baseTimeoutMs + 2500,
    )
    if (result.exitCode !== 0) {
      throw new ProviderError(
        "EXEC_FAILED",
        `${YDOTOOL_TOOL} ${args.join(" ")} exited with code ${result.exitCode}: ${result.stderr.trim()}`,
      )
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err
    throw new ProviderError(
      "EXEC_FAILED",
      `${YDOTOOL_TOOL} failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

const runWtype = async (
  args: string[],
  deps: LinuxKeyMacroDeps,
): Promise<void> => {
  const baseTimeoutMs = deps.timeoutMs ?? 500
  try {
    const result = await withTimeout(
      deps.executor.run(WTYPE_TOOL, args),
      baseTimeoutMs + 2500,
    )
    if (result.exitCode !== 0) {
      throw new ProviderError(
        "EXEC_FAILED",
        `${WTYPE_TOOL} ${args.join(" ")} exited with code ${result.exitCode}: ${result.stderr.trim()}`,
      )
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err
    throw new ProviderError(
      "EXEC_FAILED",
      `${WTYPE_TOOL} failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

const sendKeyWtype = async (
  input: string,
  deps: LinuxKeyMacroDeps,
): Promise<void> => {
  await runWtype(buildWtypeArgs(input), deps)
}

const sendKeyYdotool = async (
  input: string,
  deps: LinuxKeyMacroDeps,
  clipboardProvider: ClipboardProvider | undefined,
): Promise<void> => {
  const parsed = parseCombo(input)
  if (parsed !== null) {
    await runYdotool(buildYdotoolComboArgs(input)!, deps)
    return
  }

  if (isPureAscii(input)) {
    await runYdotool(buildYdotoolLiteralArgs(input), deps)
    return
  }

  if (clipboardProvider === undefined) {
    throw new ProviderError(
      "NOT_AVAILABLE",
      "non-ASCII text (e.g. emoji) on Linux needs wl-copy on PATH — install the wl-clipboard package",
    )
  }

  const totalStart = Date.now()
  deps.logger.info(
    {
      step: "keyMacro.nonAscii.start",
      textPreview: input.slice(0, 24),
    },
    "keyMacro: typing non-ASCII via clipboard+ctrl+v",
  )
  const writeStart = Date.now()
  await clipboardProvider.writeText(input)
  deps.logger.info(
    {
      step: "keyMacro.nonAscii.afterWrite",
      writeElapsedMs: Date.now() - writeStart,
    },
    "keyMacro: clipboard writeText done",
  )

  deps.logger.info(
    { step: "keyMacro.nonAscii.preDelay", ms: YDOTOOL_CLIPBOARD_PRE_DELAY_MS },
    "keyMacro: pre-keystroke delay",
  )
  await sleep(YDOTOOL_CLIPBOARD_PRE_DELAY_MS)

  const keystrokeStart = Date.now()
  await runYdotool(YDOTOOL_CTRL_V_ARGS, deps)
  deps.logger.info(
    {
      step: "keyMacro.nonAscii.afterKeystroke",
      keystrokeElapsedMs: Date.now() - keystrokeStart,
      totalElapsedMs: Date.now() - totalStart,
    },
    "keyMacro: ctrl+v keystroke done",
  )
}

export const createLinuxKeyMacroProvider = async (
  deps: LinuxKeyMacroDeps,
): Promise<KeyMacroProvider> => {
  const ydotoolOk = await probeTool(deps.executor, YDOTOOL_TOOL)
  const wtypeOk = !ydotoolOk && (await probeTool(deps.executor, WTYPE_TOOL))

  if (!ydotoolOk && !wtypeOk) {
    deps.logger.warn(
      {},
      "no key-macro tool found (need ydotool or wtype on PATH); key-macro will throw ProviderError",
    )
    return {
      async sendKey(_input: string) {
        throw new ProviderError(
          "NOT_AVAILABLE",
          "no key-macro tool found on PATH (need ydotool or wtype)",
        )
      },
      async stop() {
        return
      },
    }
  }

  const tool: Tool = ydotoolOk ? YDOTOOL_TOOL : WTYPE_TOOL
  deps.logger.info({ tool }, "Linux key-macro tool selected")

  let clipboardProvider: ClipboardProvider | undefined
  if (tool === YDOTOOL_TOOL) {
    try {
      clipboardProvider = createClipboardProvider({
        executor: deps.executor,
        env: deps.env,
        logger: deps.logger,
      })
    } catch (err) {
      deps.logger.warn(
        { err },
        "linux clipboard provider unavailable; non-ASCII typing will throw",
      )
    }
  }

  if (tool === YDOTOOL_TOOL) {
    return {
      async sendKey(input: string) {
        await sendKeyYdotool(input, deps, clipboardProvider)
      },
      async stop() {
        return
      },
    }
  }

  return {
    async sendKey(input: string) {
      await sendKeyWtype(input, deps)
    },
    async stop() {
      return
    },
  }
}
