import { z } from "zod"

type ConfigPathSegment = string | number

export const ThemeSchema = z.object({
  name: z.string().min(1),
  background: z.string().optional(),
  accent: z.string().optional(),
  primary: z.string().optional(),
})

export const ButtonInstanceSchema = z.object({
  type: z.string().min(1),
  position: z.number().int().min(0).max(31),
  label: z.string().optional(),
  icon: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})

export const DeckSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  buttons: z.array(ButtonInstanceSchema),
})

export const AddonSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  source: z.enum(["local", "npm"]).default("local"),
  path: z.string().optional(),
})

export const LoggingSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  verbose: z.boolean().default(false),
})

export const SirenoConfigSchema = z
  .object({
    device: z
      .object({
        model: z.string().optional(),
        path: z.string().optional(),
        serial: z.string().min(1).optional(),
      })
      .optional(),
    theme: z.string().default("dark"),
    decks: z.record(DeckSchema).optional(),
    addons: z.array(AddonSchema).default([]),
    logging: LoggingSchema.default({}),
  })
  .strict()

export type SirenoConfig = z.infer<typeof SirenoConfigSchema>

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly lineNumber?: number,
    public readonly suggestion?: string,
    public readonly pathSegments: readonly ConfigPathSegment[] = [],
  ) {
    super(message)
    this.name = "ConfigValidationError"
  }
}

function getPathLabel(pathSegments: readonly ConfigPathSegment[]): string {
  if (pathSegments.length === 0) {
    return "config"
  }

  return pathSegments.join(".")
}

function getIssueMessage(issue: z.ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    const [unknownKey] = issue.keys
    return unknownKey
      ? `Unknown key '${unknownKey}'`
      : "Unknown key found in config"
  }

  return issue.message
}

function getIssueSuggestion(issue: z.ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    const [unknownKey] = issue.keys
    return unknownKey
      ? `Remove '${unknownKey}' or move it under a supported top-level section.`
      : "Remove the unsupported key from config.yml."
  }

  return `Check the value for '${getPathLabel(issue.path)}'.`
}

function getIssuePathSegments(issue: z.ZodIssue): readonly ConfigPathSegment[] {
  if (issue.code === "unrecognized_keys" && issue.keys[0]) {
    return [issue.keys[0]]
  }

  return issue.path
}

export function validateConfig(data: unknown): SirenoConfig {
  const result = SirenoConfigSchema.safeParse(data)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    throw new ConfigValidationError(
      getIssueMessage(firstIssue),
      undefined,
      undefined,
      getIssueSuggestion(firstIssue),
      getIssuePathSegments(firstIssue),
    )
  }

  return result.data
}
