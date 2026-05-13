import { z, type ZodIssue } from "zod"

import type { AddonButtonDefinition, AddonButtonEnvelope } from "../addon/api.js"
import type { AddonRegistry } from "../addon/registry.js"

type ConfigPathSegment = string | number

export const ThemeSchema = z.object({
  name: z.string().min(1),
  background: z.string().optional(),
  accent: z.string().optional(),
  primary: z.string().optional(),
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

const RawButtonEnvelopeSchema = z.object({
  position: z.number().int().min(0).max(31),
  type: z.string().min(1),
})
  .passthrough()

const BootstrapDeckSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  buttons: z.array(RawButtonEnvelopeSchema).default([]),
})
  .strict()

const BootstrapSirenoConfigSchema = z
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
    decks: z.record(BootstrapDeckSchema),
    addons: z.array(AddonSchema).default([]),
    logging: LoggingSchema.default({}),
  })
  .strict()

export interface ButtonInstance extends AddonButtonEnvelope {
  config: Record<string, unknown>
  definition: AddonButtonDefinition
  command?: string
  display_command?: string
  display_mode?: string
  icon?: string
  interval_ms?: number
  label?: string
  states?: Array<{ key: string; command?: string; icon?: string; label?: string }>
  status_command?: string
  target_deck?: string
  unavailable_label?: string
}

export interface DeckConfig {
  id: string
  name?: string
  buttons: ButtonInstance[]
}

export interface SirenoConfig {
  device?: {
    model?: string
    path?: string
    serial?: string
  }
  theme: string
  main_deck: string
  decks: Record<string, DeckConfig>
  addons: z.infer<typeof AddonSchema>[]
  logging: z.infer<typeof LoggingSchema>
}

export type BootstrapSirenoConfig = z.infer<typeof BootstrapSirenoConfigSchema>

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

function getIssueMessage(issue: ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    const [unknownKey] = issue.keys
    return unknownKey
      ? `Unknown key '${unknownKey}'`
      : "Unknown key found in config"
  }

  return issue.message
}

function getIssueSuggestion(issue: ZodIssue): string {
  if (issue.code === "unrecognized_keys") {
    const [unknownKey] = issue.keys
    return unknownKey
      ? `Remove '${unknownKey}' or move it under a supported config section.`
      : "Remove the unsupported key from config.yml."
  }

  return `Check the value for '${getPathLabel(issue.path)}'.`
}

function getIssuePathSegments(issue: ZodIssue): readonly ConfigPathSegment[] {
  if (issue.code === "unrecognized_keys" && issue.keys[0]) {
    return [...issue.path, issue.keys[0]]
  }

  return issue.path
}

function toConfigValidationError(issue: ZodIssue, pathPrefix: readonly ConfigPathSegment[] = []): ConfigValidationError {
  const pathSegments = [...pathPrefix, ...getIssuePathSegments(issue)]

  return new ConfigValidationError(
    getIssueMessage(issue),
    undefined,
    undefined,
    getIssueSuggestion(issue),
    pathSegments,
  )
}

export function validateBootstrapConfig(data: unknown): BootstrapSirenoConfig {
  const result = BootstrapSirenoConfigSchema.safeParse(data)
  if (!result.success) {
    throw toConfigValidationError(result.error.issues[0])
  }

  const config = result.data
  const mainDeck = config.decks[config.main_deck]

  if (!mainDeck) {
    throw new ConfigValidationError(
      `Main deck '${config.main_deck}' is not defined`,
      undefined,
      undefined,
      `Check the value for '${getPathLabel(["main_deck"])}'.`,
      ["main_deck"],
    )
  }

  for (const [deckKey, deck] of Object.entries(config.decks)) {
    if (deck.id !== deckKey) {
      throw new ConfigValidationError(
        `Deck id '${deck.id}' must match its map key '${deckKey}'`,
        undefined,
        undefined,
        `Check the value for '${getPathLabel(["decks", deckKey, "id"])}'.`,
        ["decks", deckKey, "id"],
      )
    }
  }

  return config
}

function getButtonPayload(button: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(button).filter(([key]) => key !== "position" && key !== "type"),
  )
}

export function validateConfig(data: unknown, registry: AddonRegistry): SirenoConfig {
  const bootstrap = validateBootstrapConfig(data)
  const decks: Record<string, DeckConfig> = {}

  for (const [deckKey, deck] of Object.entries(bootstrap.decks)) {
    const nextButtons: ButtonInstance[] = []

    for (const [buttonIndex, button] of deck.buttons.entries()) {
      const definition = registry.getButton(button.type)
      if (!definition) {
        throw new ConfigValidationError(
          `Unknown button type '${button.type}'`,
          undefined,
          undefined,
          `Register '${button.type}' before using it in config.yml.`,
          ["decks", deckKey, "buttons", buttonIndex, "type"],
        )
      }

      const payload = getButtonPayload(button)
      const parsedPayload = definition.configSchema.safeParse(payload)
      if (!parsedPayload.success) {
        throw toConfigValidationError(parsedPayload.error.issues[0], ["decks", deckKey, "buttons", buttonIndex])
      }

      nextButtons.push({
        position: button.position,
        type: button.type,
        config: parsedPayload.data as Record<string, unknown>,
        definition,
        ...payload,
      })
    }

    decks[deckKey] = {
      id: deck.id,
      ...(deck.name !== undefined ? { name: deck.name } : {}),
      buttons: nextButtons,
    }
  }

  return {
    addons: bootstrap.addons,
    decks,
    ...(bootstrap.device !== undefined ? { device: bootstrap.device } : {}),
    logging: bootstrap.logging,
    main_deck: bootstrap.main_deck,
    theme: bootstrap.theme,
  }
}
