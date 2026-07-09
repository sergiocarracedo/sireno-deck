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

const normalizeKey = (raw: string): string => {
  if (raw.length === 1) return raw.toLowerCase()
  if (/^[a-zA-Z]$/.test(raw)) return raw.toLowerCase()
  if (/^\d$/.test(raw)) return raw
  if (/^F\d+$/.test(raw)) return raw.toUpperCase()
  if (raw === "Esc" || raw === "ESC") return "Escape"
  if (raw === "Esc") return "Escape"
  if (raw === "Space" || raw === " ") return "space"
  if (raw === "Enter" || raw === "CR" || raw === "Return") return "Return"
  if (raw === "Backspace" || raw === "BS") return "BackSpace"
  if (raw === "PgUp") return "Page_Up"
  if (raw === "PgDn") return "Page_Down"
  if (raw === "Ins") return "Insert"
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
