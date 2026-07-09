import { readFileSync } from "node:fs"
import { dirname, isAbsolute, resolve as resolvePath } from "node:path"

import { parseAllDocuments } from "yaml"

import type { RawButtonEntry } from "./schemas"

const FILE_REF_PATTERN = /^@(.+)$/

const readYamlArray = (path: string): unknown[] => {
  const raw = readFileSync(path, "utf8")
  const docs = parseAllDocuments(raw)
  if (docs.length === 0) {
    throw new Error(`Empty YAML file: ${path}`)
  }
  const value = docs[0]?.toJSON()
  if (!Array.isArray(value)) {
    throw new Error(`Expected YAML array in ${path}, got ${typeof value}`)
  }
  return value as unknown[]
}

const expandArray = (entries: unknown[], configDir: string): unknown[] => {
  const result: unknown[] = []
  for (const entry of entries) {
    if (typeof entry === "string") {
      const match = FILE_REF_PATTERN.exec(entry)
      if (match) {
        const ref = match[1]
        if (typeof ref !== "string" || ref.length === 0) {
          throw new Error(`Empty file reference in '@' entry`)
        }
        const absolute = isAbsolute(ref) ? ref : resolvePath(configDir, ref)
        const nested = readYamlArray(absolute)
        result.push(...expandArray(nested, dirname(absolute)))
        continue
      }
    }
    result.push(entry)
  }
  return result
}

const expandDeckButtons = (
  deck: Record<string, unknown>,
  configDir: string,
): Record<string, unknown> => {
  const buttons = deck["buttons"]
  if (!Array.isArray(buttons)) return deck
  return {
    ...deck,
    buttons: expandArray(buttons, configDir) as RawButtonEntry[],
  }
}

export const expandButtonReferences = (
  raw: unknown,
  configDir: string,
): unknown => {
  if (raw === null || typeof raw !== "object") return raw
  if (Array.isArray(raw)) return raw
  const obj = raw as Record<string, unknown>
  const decks = obj["decks"]
  if (
    decks !== undefined &&
    decks !== null &&
    typeof decks === "object" &&
    !Array.isArray(decks)
  ) {
    const expandedDecks: Record<string, unknown> = {}
    for (const [id, deck] of Object.entries(decks as Record<string, unknown>)) {
      if (deck !== null && typeof deck === "object" && !Array.isArray(deck)) {
        expandedDecks[id] = expandDeckButtons(
          deck as Record<string, unknown>,
          configDir,
        )
      } else {
        expandedDecks[id] = deck
      }
    }
    return { ...obj, decks: expandedDecks }
  }
  return raw
}
