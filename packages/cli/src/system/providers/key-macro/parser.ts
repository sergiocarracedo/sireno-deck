export interface ParsedCombo {
  mods: string[]
  key: string
}

const MODIFIER_ALIASES: ReadonlyMap<string, string> = new Map([
  ["ctrl", "ctrl"],
  ["control", "ctrl"],
  ["ctl", "ctrl"],
  ["alt", "alt"],
  ["option", "alt"],
  ["opt", "alt"],
  ["shift", "shift"],
  ["shft", "shift"],
  ["meta", "meta"],
  ["command", "meta"],
  ["cmd", "meta"],
  ["super", "super"],
  ["hyper", "hyper"],
  ["win", "super"],
])

export const knownKeys: ReadonlySet<string> = new Set([
  "BackSpace",
  "Tab",
  "Linefeed",
  "Clear",
  "Return",
  "Enter",
  "Pause",
  "Scroll_Lock",
  "Sys_Req",
  "Escape",
  "Delete",
  "Home",
  "End",
  "Page_Up",
  "Page_Down",
  "Up",
  "Down",
  "Left",
  "Right",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
  "F13",
  "F14",
  "F15",
  "F16",
  "F17",
  "F18",
  "F19",
  "F20",
  "F21",
  "F22",
  "F23",
  "F24",
  "space",
  "exclam",
  "quotedbl",
  "numbersign",
  "dollar",
  "percent",
  "ampersand",
  "apostrophe",
  "parenleft",
  "parenright",
  "asterisk",
  "plus",
  "comma",
  "minus",
  "period",
  "slash",
  "colon",
  "semicolon",
  "less",
  "equal",
  "greater",
  "question",
  "at",
  "bracketleft",
  "backslash",
  "bracketright",
  "asciicircum",
  "underscore",
  "grave",
  "braceleft",
  "bar",
  "braceright",
  "asciitilde",
  "Insert",
  "Num_Lock",
  "Caps_Lock",
  "Print",
  "Menu",
])

const addIfMissing = (set: Set<string>, value: string): void => {
  if (!set.has(value)) set.add(value)
}

const seedAlphaKeys = (): Set<string> => {
  const set = new Set<string>(knownKeys)
  for (let code = 0; code < 26; code += 1) {
    addIfMissing(set, String.fromCharCode(0x61 + code))
  }
  for (let code = 0; code < 10; code += 1) {
    addIfMissing(set, String.fromCharCode(0x30 + code))
  }
  return set
}

const allKnownKeys: ReadonlySet<string> = seedAlphaKeys()

export const isValidKey = (name: string): boolean => allKnownKeys.has(name)

const SYMBOL_TO_NAME: Readonly<Record<string, string>> = {
  ",": "comma",
  ".": "period",
  "/": "slash",
  "\\": "backslash",
  ";": "semicolon",
  "'": "apostrophe",
  "[": "bracketleft",
  "]": "bracketright",
  "-": "minus",
  "=": "equal",
  "`": "grave",
  "@": "at",
  "#": "numbersign",
  $: "dollar",
  "%": "percent",
  "^": "asciicircum",
  "&": "ampersand",
  "*": "asterisk",
  "(": "parenleft",
  ")": "parenright",
  "!": "exclam",
  ":": "colon",
  "<": "less",
  ">": "greater",
  "?": "question",
  "~": "asciitilde",
  _: "underscore",
  "+": "plus",
  "|": "bar",
  "{": "braceleft",
  "}": "braceright",
  '"': "quotedbl",
}

const normalizeKey = (raw: string): string => {
  if (raw.length === 1) {
    const mapped = SYMBOL_TO_NAME[raw]
    if (mapped !== undefined) return mapped
    return raw.toLowerCase()
  }
  if (/^[a-zA-Z]$/.test(raw)) return raw.toLowerCase()
  if (/^\d$/.test(raw)) return raw
  if (/^[fF]\d+$/.test(raw)) return raw.toUpperCase()
  const lower = raw.toLowerCase()
  if (lower === "esc" || lower === "escape") return "Escape"
  if (lower === "tab") return "Tab"
  if (lower === "space") return "space"
  if (lower === "enter" || lower === "cr" || lower === "return") return "Return"
  if (lower === "backspace" || lower === "bs") return "BackSpace"
  if (lower === "pgup") return "Page_Up"
  if (lower === "pgdn") return "Page_Down"
  if (lower === "ins") return "Insert"
  if (lower === "del" || lower === "delete") return "Delete"
  if (lower === "up") return "Up"
  if (lower === "down") return "Down"
  if (lower === "left") return "Left"
  if (lower === "right") return "Right"
  if (lower === "home") return "Home"
  if (lower === "end") return "End"
  return raw
}

export const parseCombo = (input: string): ParsedCombo | null => {
  if (input.length === 0) return null
  const segments = input
    .split("+")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (segments.length === 0) return null

  const last = segments[segments.length - 1]!
  const key = normalizeKey(last)
  if (!isValidKey(key)) return null

  const mods: string[] = []
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i]!.toLowerCase()
    const mod = MODIFIER_ALIASES.get(seg)
    if (mod === undefined) return null
    if (!mods.includes(mod)) mods.push(mod)
  }

  if (segments.length === 1 && key.length === 1) {
    const lower = key.toLowerCase()
    if (MODIFIER_ALIASES.has(lower)) return null
  }

  return { mods, key }
}
