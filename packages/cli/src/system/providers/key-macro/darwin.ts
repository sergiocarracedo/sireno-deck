import type pino from "pino"

import { ProviderError } from "../error"
import { type CommandExecutor, withTimeout } from "../shared"
import { type KeyMacroProvider } from "../key-macro"
import { parseCombo } from "./parser"
import { createDarwinClipboardProvider } from "../clipboard/darwin"

export interface DarwinKeyMacroDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
}

// ponytail: `ctrl` used to map to "command down", same as `meta`. The parser
// keeps the two distinct (ctrl/control/ctl vs meta/command/cmd), so collapsing
// them meant `ctrl+c` sent ⌘C — and no macro could ever send a real Control,
// which matters for terminal bindings (^C, ^D, ^R). `super`/`hyper` have no
// macOS equivalent and used to fall through `?? m`, splicing the bare word
// "super" into the script and producing a syntax error; they now map to
// command, the closest analogue.
const MOD_OSASCRIPT: ReadonlyMap<string, string> = new Map([
  ["ctrl", "control down"],
  ["meta", "command down"],
  ["super", "command down"],
  ["hyper", "command down"],
  ["alt", "option down"],
  ["shift", "shift down"],
])

const escapeOsascriptString = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

// Printable ASCII is the set AppleScript's `keystroke` can synthesise directly
// on a standard layout; anything outside it goes through the pasteboard.
const isPureAscii = (text: string): boolean => /^[\x20-\x7E]*$/.test(text)

const CMD_V_ARGS: ReadonlyArray<string> = [
  "-e",
  `tell application "System Events" to keystroke "v" using {command down}`,
]

const CLIPBOARD_PRE_DELAY_MS = 60

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// macOS reports a missing Accessibility (TCC) grant two different ways
// depending on which API the script reached: -1719 for assistive access on a UI
// element read, 1002 for synthesising keystrokes.
const isAccessibilityDenied = (stderr: string): boolean =>
  stderr.includes("(-1719)") ||
  stderr.includes("(1002)") ||
  stderr.includes("not allowed assistive access") ||
  stderr.includes("not allowed to send keystrokes")

export const ACCESSIBILITY_ERROR =
  "macOS blocked the keystroke: this app has no Accessibility permission. " +
  "Open System Settings → Privacy & Security → Accessibility, enable the app " +
  "running sirenodeck (your terminal, or SirenoDeck.app), then restart it."

const KEY_ALIASES: ReadonlyMap<string, string> = new Map([
  ["plus", "+"],
  ["minus", "-"],
  ["equal", "="],
  ["comma", ","],
  ["period", "."],
])

// ponytail: `keystroke "Escape"` TYPES the seven letters E-s-c-a-p-e. Every
// non-character key in the parser's `knownKeys` (Return, Tab, arrows, F-keys,
// Home/End/Page_Up, ...) was silently typed as its own name instead of being
// pressed. AppleScript needs `key code <n>` for these — the numbers are the
// stable Carbon virtual keycodes.
const KEY_CODES: ReadonlyMap<string, number> = new Map([
  ["Return", 36],
  ["Enter", 36],
  ["Tab", 48],
  ["space", 49],
  ["Delete", 51],
  ["BackSpace", 51],
  ["Escape", 53],
  ["Home", 115],
  ["Page_Up", 116],
  ["End", 119],
  ["Page_Down", 121],
  ["Left", 123],
  ["Right", 124],
  ["Down", 125],
  ["Up", 126],
  ["Insert", 114],
  ["Clear", 71],
  ["F1", 122],
  ["F2", 120],
  ["F3", 99],
  ["F4", 118],
  ["F5", 96],
  ["F6", 97],
  ["F7", 98],
  ["F8", 100],
  ["F9", 101],
  ["F10", 109],
  ["F11", 103],
  ["F12", 111],
  ["F13", 105],
  ["F14", 107],
  ["F15", 113],
  ["F16", 106],
  ["F17", 64],
  ["F18", 79],
  ["F19", 80],
  ["F20", 90],
])

const buildComboArgs = (input: string): string[] | null => {
  const parsed = parseCombo(input)
  if (parsed === null) return null

  const needsShift =
    (parsed.key === "plus" || parsed.key === "minus") &&
    !parsed.mods.includes("shift")
  const mods = needsShift ? [...parsed.mods, "shift"] : parsed.mods
  // Drop unmappable modifiers rather than splicing raw words into the script.
  const modList = mods
    .map((m) => MOD_OSASCRIPT.get(m))
    .filter((m): m is string => m !== undefined)
    .join(", ")
  const using = modList.length > 0 ? ` using {${modList}}` : ""

  const code = KEY_CODES.get(parsed.key)
  if (code !== undefined) {
    return [
      "-e",
      `tell application "System Events" to key code ${code}${using}`,
    ]
  }

  const key = KEY_ALIASES.get(parsed.key) ?? parsed.key
  const script = `tell application "System Events" to keystroke "${escapeOsascriptString(key)}"${using}`
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
    "Darwin key-macro provider initialised (osascript; non-ASCII pastes via pbcopy)",
  )
  const timeoutMs = deps.timeoutMs ?? 500
  const clipboard = createDarwinClipboardProvider({
    executor: deps.executor,
    logger: deps.logger,
  })

  const runOsascript = async (args: ReadonlyArray<string>): Promise<void> => {
    let result
    try {
      result = await withTimeout(
        deps.executor.run("osascript", [...args]),
        timeoutMs + 2500,
      )
    } catch (err) {
      throw new ProviderError(
        "EXEC_FAILED",
        `osascript failed: ${(err as Error).message ?? "unknown"}`,
      )
    }
    if (result.exitCode === 0) return
    const stderr = result.stderr.trim()
    // ponytail: a denied Accessibility grant is BY FAR the most common reason a
    // macro fails on macOS, and the raw AppleScript text ("System Events got an
    // error: osascript is not allowed to send keystrokes. (1002)") tells the
    // user nothing about how to fix it — it just surfaced as an error tile on
    // the deck. Translate both TCC error numbers into the actual remedy.
    if (isAccessibilityDenied(stderr)) {
      throw new ProviderError("NOT_AVAILABLE", ACCESSIBILITY_ERROR)
    }
    throw new ProviderError(
      "EXEC_FAILED",
      `osascript exited ${result.exitCode}: ${stderr}`,
    )
  }

  return {
    async sendKey(input: string) {
      const comboArgs = buildComboArgs(input)
      if (comboArgs !== null) {
        await runOsascript(comboArgs)
        return
      }
      if (isPureAscii(input)) {
        await runOsascript(buildLiteralArgs(input))
        return
      }
      // ponytail: non-ASCII literal text — emoji, accented letters, CJK.
      // AppleScript's `keystroke` synthesises key events against the current
      // keyboard layout, so it cannot produce a character the layout has no
      // key for; emoji silently typed nothing (or the wrong glyph) despite the
      // old log line claiming it "types any UTF-8 including emoji". Route it
      // through the pasteboard and Cmd+V, mirroring what the Linux provider
      // already does with wl-copy + ctrl+v for exactly the same reason.
      deps.logger.info(
        { step: "keyMacro.nonAscii.start", textPreview: input.slice(0, 24) },
        "keyMacro: typing non-ASCII via pbcopy + cmd+v",
      )
      await clipboard.writeText(input)
      // Give the pasteboard a moment to settle before the paste keystroke;
      // without it the Cmd+V can fire against the previous contents.
      await sleep(CLIPBOARD_PRE_DELAY_MS)
      await runOsascript(CMD_V_ARGS)
    },
    async stop() {
      await clipboard.stop()
    },
  }
}
