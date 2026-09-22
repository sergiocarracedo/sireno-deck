import { readFileSync, realpathSync } from "node:fs"
import {
  basename,
  dirname,
  isAbsolute,
  resolve as resolvePath,
} from "node:path"

export class IncludeResolutionError extends Error {
  readonly issues: { message: string; path?: string }[]

  constructor(
    message: string,
    issues: { message: string; path?: string }[] = [],
  ) {
    super(message)
    this.name = "IncludeResolutionError"
    this.issues = issues
  }
}

const INCLUDE_RE = /^(\s*)(.*?)\s*!include\s+(\S+)(.*)$/

/**
 * Resolves symlinks so two spellings of the same directory compare equal.
 *
 * ponytail: the containment check below is a plain string prefix, so a config
 * reached through a symlinked parent failed it — the defining file had already
 * been canonicalised while an absolute `!include` had not, and the two never
 * shared a prefix. On macOS that is every config under a temp dir, since /var
 * is a symlink to /private/var, but it applies to any symlinked config
 * directory. Falls back to the literal path when the target does not exist yet
 * (a missing include must be reported as missing, not as an escape attempt).
 */
const canonical = (p: string): string => {
  try {
    return realpathSync.native(p)
  } catch {
    try {
      return resolvePath(realpathSync.native(dirname(p)), basename(p))
    } catch {
      return p
    }
  }
}

const isUnder = (candidate: string, root: string): boolean =>
  candidate.startsWith(root.endsWith("/") ? root : `${root}/`)

const resolveIncludePath = (
  pathStr: string,
  definingFilePath: string,
): string => {
  const lexicalRoot = resolvePath(dirname(definingFilePath))
  const includePath = isAbsolute(pathStr)
    ? pathStr
    : resolvePath(lexicalRoot, pathStr)

  // ponytail: containment is judged LEXICALLY, and that is the whole point.
  // This check exists to stop `../../etc/passwd`, not to police where the
  // user's own files live. Resolving symlinks first broke a perfectly ordinary
  // setup — a `demos -> ../../repo/demos` symlink placed inside the config
  // directory on purpose — by reporting the user's deliberate choice as a path
  // traversal attempt and refusing to start the daemon.
  //
  // The canonical forms are still accepted, because the defining file may
  // arrive already realpath'd while an absolute !include has not (on macOS
  // /var is a symlink to /private/var, so this is every config under a temp
  // dir). Any of the spellings matching is enough; `../` escapes match none.
  const canonicalRoot = canonical(lexicalRoot)
  const contained =
    isUnder(includePath, lexicalRoot) ||
    isUnder(includePath, canonicalRoot) ||
    isUnder(canonical(includePath), canonicalRoot)

  if (!contained) {
    throw new IncludeResolutionError(
      `!include path escapes config directory: ${includePath} (from ${definingFilePath})`,
      [
        {
          message: `path traversal blocked: ${pathStr}`,
          path: definingFilePath,
        },
      ],
    )
  }
  return includePath
}

const processLine = (
  line: string,
  definingFilePath: string,
  visited: Set<string>,
  replacements: ReadonlyMap<string, string>,
): string[] => {
  const match = line.match(INCLUDE_RE)
  if (match === null) return [line]
  const indent = match[1] ?? ""
  const before = match[2] ?? ""
  const pathStr = match[3] ?? ""
  if (pathStr.length === 0) {
    throw new IncludeResolutionError(
      `Empty !include path at ${definingFilePath}`,
      [{ message: "empty path after !include", path: definingFilePath }],
    )
  }
  // ponytail: !include must stay within the defining file's directory.
  const includePath = resolveIncludePath(pathStr, definingFilePath)
  if (visited.has(includePath)) {
    const cycle = [...visited, includePath].join(" -> ")
    throw new IncludeResolutionError(`Circular include detected: ${cycle}`, [
      { message: `cycle: ${cycle}`, path: definingFilePath },
    ])
  }
  let raw = replacements.get(includePath)
  if (raw === undefined) {
    try {
      raw = readFileSync(includePath, "utf8")
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new IncludeResolutionError(
          `Included file not found: ${includePath} (from ${definingFilePath})`,
          [{ message: `not found: ${includePath}`, path: definingFilePath }],
        )
      }
      throw err
    }
  }
  const next = new Set(visited)
  next.add(includePath)
  const inlined = inlineIncludes(raw, includePath, next, replacements)
  if (before.trim().length === 0) {
    return inlined.split("\n")
  }
  if (before.trim().endsWith(":")) {
    const childIndent = `${indent}  `
    const childContent = inlined
      .split("\n")
      .map((l) => (l.length === 0 ? l : childIndent + l))
      .join("\n")
    return [`${indent}${before}`, childContent]
  }
  throw new IncludeResolutionError(
    `Unsupported !include position in line "${line}" (from ${definingFilePath})`,
    [{ message: `unsupported !include position`, path: definingFilePath }],
  )
}

const inlineIncludes = (
  text: string,
  definingFilePath: string,
  visited: Set<string>,
  replacements: ReadonlyMap<string, string>,
): string => {
  const lines = text.split("\n")
  const out: string[] = []
  for (const line of lines) {
    out.push(...processLine(line, definingFilePath, visited, replacements))
  }
  return out.join("\n")
}

export const resolveIncludes = (
  text: string,
  definingFilePath: string,
  replacements: ReadonlyMap<string, string> = new Map(),
): string =>
  inlineIncludes(
    text,
    definingFilePath,
    new Set([definingFilePath]),
    replacements,
  )

const discoverFromFile = (filePath: string, visited: Set<string>): string[] => {
  const canonicalPath = realpathSync(filePath)
  if (visited.has(canonicalPath)) {
    throw new IncludeResolutionError(
      `Circular include detected: ${canonicalPath}`,
    )
  }
  const next = new Set(visited)
  next.add(canonicalPath)
  const sources = [canonicalPath]
  for (const line of readFileSync(canonicalPath, "utf8").split("\n")) {
    const match = line.match(INCLUDE_RE)
    if (match === null) continue
    const pathStr = match[3]
    if (pathStr === undefined || pathStr.length === 0) {
      throw new IncludeResolutionError(
        `Empty !include path at ${canonicalPath}`,
      )
    }
    const includePath = resolveIncludePath(pathStr, canonicalPath)
    sources.push(...discoverFromFile(includePath, next))
  }
  return [...new Set(sources)]
}

/** Returns the canonical files reachable through !include, including root. */
export const discoverIncludeGraph = (rootPath: string): string[] =>
  discoverFromFile(rootPath, new Set())
