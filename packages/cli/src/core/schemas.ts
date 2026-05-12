import { z } from "zod"

type ConfigPathSegment = string | number

export const ThemeSchema = z.object({
  name: z.string().min(1),
  background: z.string().optional(),
  accent: z.string().optional(),
  primary: z.string().optional(),
})
  .strict()

export const DisplayButtonSchema = z
  .object({
    type: z.literal("display"),
    position: z.number().int().min(0).max(31),
    display_command: z.string().min(1).optional(),
    interval_ms: z.number().int().positive().optional(),
    label: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
  })
  .strict()
  .refine((button) => button.label !== undefined || button.icon !== undefined, {
    message: "Display buttons need a label or icon",
    path: ["label"],
  })

export const ActionButtonSchema = z
  .object({
    type: z.literal("action"),
    position: z.number().int().min(0).max(31),
    command: z.string().min(1),
    label: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
    display_command: z.string().min(1).optional(),
    interval_ms: z.number().int().positive().optional(),
  })
  .strict()
  .refine((button) => button.label !== undefined || button.icon !== undefined || button.display_command !== undefined, {
    message: "Action buttons need a label, icon, or display_command",
    path: ["label"],
  })

export const ChangeDeckButtonSchema = z
  .object({
    type: z.literal("change-deck"),
    position: z.number().int().min(0).max(31),
    target_deck: z.string().min(1),
    label: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
  })
  .strict()
  .refine((button) => button.label !== undefined || button.icon !== undefined, {
    message: "Change-deck buttons need a label or icon",
    path: ["label"],
  })

export const ToggleStateSchema = z
  .object({
    key: z.string().min(1),
    command: z.string().min(1),
    label: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
  })
  .strict()
  .refine((state) => state.label !== undefined || state.icon !== undefined, {
    message: "Toggle states need a label or icon",
    path: ["label"],
  })

export const ToggleButtonSchema = z
  .object({
    type: z.literal("toggle"),
    position: z.number().int().min(0).max(31),
    states: z.array(ToggleStateSchema).min(2),
    status_command: z.string().min(1).optional(),
    interval_ms: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((button, context) => {
    const seenKeys = new Set<string>()

    for (const [stateIndex, state] of button.states.entries()) {
      if (seenKeys.has(state.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Toggle state key '${state.key}' must be unique within a button`,
          path: ["states", stateIndex, "key"],
        })
        continue
      }

      seenKeys.add(state.key)
    }
  })

const LiveMetricDisplayModeSchema = z.enum(["progress", "text"])

export const CpuButtonSchema = z
  .object({
    type: z.literal("cpu"),
    position: z.number().int().min(0).max(31),
    label: z.string().min(1).optional(),
    interval_ms: z.number().int().positive().optional(),
    display_mode: LiveMetricDisplayModeSchema.default("progress"),
  })
  .strict()

export const MemoryButtonSchema = z
  .object({
    type: z.literal("memory"),
    position: z.number().int().min(0).max(31),
    label: z.string().min(1).optional(),
    interval_ms: z.number().int().positive().optional(),
    display_mode: LiveMetricDisplayModeSchema.default("progress"),
  })
  .strict()

export const ButtonInstanceSchema = z.union([
  DisplayButtonSchema,
  ActionButtonSchema,
  ChangeDeckButtonSchema,
  ToggleButtonSchema,
  CpuButtonSchema,
  MemoryButtonSchema,
])

export const DeckSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    buttons: z.array(ButtonInstanceSchema),
  })
  .strict()

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
    main_deck: z.string().min(1),
    decks: z.record(DeckSchema),
    addons: z.array(AddonSchema).default([]),
    logging: LoggingSchema.default({}),
  })
  .strict()
  .superRefine((config, context) => {
    const mainDeck = config.decks[config.main_deck]

    if (!mainDeck) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Main deck '${config.main_deck}' is not defined`,
        path: ["main_deck"],
      })
    }

    for (const [deckKey, deck] of Object.entries(config.decks)) {
      if (deck.id !== deckKey) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Deck id '${deck.id}' must match its map key '${deckKey}'`,
          path: ["decks", deckKey, "id"],
        })
      }

      for (const [buttonIndex, button] of deck.buttons.entries()) {
        if (button.type !== "change-deck") {
          continue
        }

        if (config.decks[button.target_deck] !== undefined) {
          continue
        }

        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Change-deck button target '${button.target_deck}' is not defined`,
          path: ["decks", deckKey, "buttons", buttonIndex, "target_deck"],
        })
      }
    }
  })

export type SirenoConfig = z.infer<typeof SirenoConfigSchema>
export type DisplayButton = z.infer<typeof DisplayButtonSchema>
export type ActionButton = z.infer<typeof ActionButtonSchema>
export type ChangeDeckButton = z.infer<typeof ChangeDeckButtonSchema>
export type ToggleState = z.infer<typeof ToggleStateSchema>
export type ToggleButton = z.infer<typeof ToggleButtonSchema>
export type CpuButton = z.infer<typeof CpuButtonSchema>
export type MemoryButton = z.infer<typeof MemoryButtonSchema>
export type ButtonInstance = z.infer<typeof ButtonInstanceSchema>
export type DeckConfig = z.infer<typeof DeckSchema>

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
