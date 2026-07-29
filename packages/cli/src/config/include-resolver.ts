import { readFileSync } from "node:fs"
import { dirname, isAbsolute, resolve as resolvePath } from "node:path"

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

const processLine = (
  line: string,
  definingFilePath: string,
  visited: Set<string>,
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
  const rootDir = resolvePath(dirname(definingFilePath))
  const normalizedRoot = rootDir.endsWith("/") ? rootDir : `${rootDir}/`
  const includePath = isAbsolute(pathStr)
    ? pathStr
    : resolvePath(dirname(definingFilePath), pathStr)
  // ponytail: !include must stay within the defining file's directory —
  // resolvePath(..) silently walks out of it, and absolute paths read any
  // file on the box. Pin both forms to the config dir.
  if (!includePath.startsWith(normalizedRoot)) {
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
  if (visited.has(includePath)) {
    const cycle = [...visited, includePath].join(" -> ")
    throw new IncludeResolutionError(`Circular include detected: ${cycle}`, [
      { message: `cycle: ${cycle}`, path: definingFilePath },
    ])
  }
  let raw: string
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
  const next = new Set(visited)
  next.add(includePath)
  const inlined = inlineIncludes(raw, includePath, next)
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
): string => {
  const lines = text.split("\n")
  const out: string[] = []
  for (const line of lines) {
    out.push(...processLine(line, definingFilePath, visited))
  }
  return out.join("\n")
}

export const resolveIncludes = (
  text: string,
  definingFilePath: string,
): string => inlineIncludes(text, definingFilePath, new Set([definingFilePath]))
