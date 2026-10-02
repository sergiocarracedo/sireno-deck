import type { JsonSchema } from "./types"

export const labelFor = (key: string): string =>
  key
    .replaceAll(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

export const joinPath = (path: string, key: string | number): string =>
  path === "" ? String(key) : `${path}.${key}`

export const valueAt = (value: unknown, path: string): unknown => {
  let current = value
  for (const segment of path.split(".").filter(Boolean)) {
    if (typeof current !== "object" || current === null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export const setAt = (value: unknown, path: string, next: unknown): unknown => {
  const segments = path.split(".").filter(Boolean)
  if (segments.length === 0) return next
  const root =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {}
  let current = root
  for (const segment of segments.slice(0, -1)) {
    const child = current[segment]
    current[segment] =
      typeof child === "object" && child !== null && !Array.isArray(child)
        ? { ...(child as Record<string, unknown>) }
        : {}
    current = current[segment] as Record<string, unknown>
  }
  current[segments.at(-1)!] = next
  return root
}

export const defaultValue = (schema: JsonSchema): unknown => {
  if (schema.default !== undefined) return schema.default
  if (schema.const !== undefined) return schema.const
  if (schema.enum?.[0] !== undefined) return schema.enum[0]
  if (schema.type === "object") {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([, child]) => child.internal !== true)
        .filter(([key]) => schema.required?.includes(key))
        .map(([key, child]) => [key, defaultValue(child)]),
    )
  }
  if (schema.type === "array") return []
  if (schema.type === "boolean") return false
  if (schema.type === "number" || schema.type === "integer") return 0
  return ""
}
