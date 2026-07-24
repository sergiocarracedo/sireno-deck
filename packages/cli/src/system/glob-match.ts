import type { ActiveAppSnapshot } from "@/system/providers/active-app"

const escapeRegex = (raw: string): string =>
  raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const hasGlobMeta = (pattern: string): boolean => /[*?\\|]/.test(pattern)

const globToRegex = (pattern: string): RegExp => {
  let source = ""
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i]
    if (c === "*") source += ".*"
    else if (c === "?") source += "."
    else if (c === "\\" && i + 1 < pattern.length) {
      source += escapeRegex(pattern[i + 1] ?? "")
      i += 1
    } else {
      source += escapeRegex(c ?? "")
    }
  }
  return new RegExp(`^(?:${source})$`, "i")
}

const compileOne = (raw: string): RegExp => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return /^.*/i
  if (trimmed.includes("|")) {
    const branches = trimmed.split("|").map((s) => {
      const t = s.trim()
      if (t.length === 0) return ".*"
      if (!hasGlobMeta(t)) return escapeRegex(t)
      return globToRegex(t).source
    })
    return new RegExp(`^(?:${branches.join("|")})$`, "i")
  }
  if (!hasGlobMeta(trimmed)) {
    return new RegExp(escapeRegex(trimmed), "i")
  }
  return globToRegex(trimmed)
}

export const matchesPattern = (name: string, pattern: string): boolean => {
  if (name.length === 0) return false
  return compileOne(pattern).test(name)
}

export interface DeckMatcherFields {
  processNames?: ReadonlyArray<string>
  windowNames?: ReadonlyArray<string>
}

const matchGroup = (
  compiled: ReadonlyArray<RegExp>,
  value: string,
): boolean => {
  if (compiled.length === 0) return true
  for (const re of compiled) {
    if (re.test(value)) return true
  }
  return false
}

export const compileDeckMatcher = (
  fields: DeckMatcherFields,
): ((snapshot: ActiveAppSnapshot) => boolean) => {
  const processCompiled = (fields.processNames ?? []).map(compileOne)
  const windowCompiled = (fields.windowNames ?? []).map(compileOne)
  if (processCompiled.length === 0 && windowCompiled.length === 0) {
    return () => false
  }
  return (snapshot: ActiveAppSnapshot): boolean =>
    matchGroup(processCompiled, snapshot.name) &&
    matchGroup(windowCompiled, snapshot.windowTitle ?? "")
}
