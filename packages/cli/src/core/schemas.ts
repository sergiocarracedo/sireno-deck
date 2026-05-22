import { z, type ZodIssue } from "zod"

import type { AddonButtonDefinition, AddonButtonEnvelope, AddonGeneratedDeck } from "../addon/api.js"
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

export const SessionSchema = z.object({
  locked_deck: z.string().min(1).optional(),
})

const ThemeColorTokenSchema = z.enum(["accent", "background", "danger", "foreground", "primary", "success"])
const AccentOverrideSchema = z.union([
  ThemeColorTokenSchema,
  z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Accent override must be a theme token or hex color"),
])

const ToggleStatePresentationOverrideSchema = z.object({
  icon: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
})
  .strict()

const ToggleSharedPresentationSchema = z.object({
  icon: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  on: ToggleStatePresentationOverrideSchema.optional(),
  off: ToggleStatePresentationOverrideSchema.optional(),
})

const ToggleOutputTokensSchema = z.array(z.string().min(1)).nonempty()

export const InternalToggleButtonConfigSchema = ToggleSharedPresentationSchema.extend({
  initial_state: z.enum(["on", "off"]).default("off"),
  mode: z.literal("internal"),
})
  .strict()

export const GetSetToggleButtonConfigSchema = ToggleSharedPresentationSchema.extend({
  get_state_command: z.string().min(1),
  mode: z.literal("get-set"),
  off_values: ToggleOutputTokensSchema.optional(),
  on_values: ToggleOutputTokensSchema.optional(),
  set_off_command: z.string().min(1),
  set_on_command: z.string().min(1),
})
  .strict()

export const ToggleStatusToggleButtonConfigSchema = ToggleSharedPresentationSchema.extend({
  mode: z.literal("toggle-status"),
  off_values: ToggleOutputTokensSchema.optional(),
  on_values: ToggleOutputTokensSchema.optional(),
  status_command: z.string().min(1),
  toggle_command: z.string().min(1),
})
  .strict()

export const BuiltinToggleButtonConfigSchema = z.discriminatedUnion("mode", [
  InternalToggleButtonConfigSchema,
  GetSetToggleButtonConfigSchema,
  ToggleStatusToggleButtonConfigSchema,
])

const RawButtonEnvelopeSchema = z.object({
  interval_ms: z.number().int().min(500).optional(),
  position: z.number().int().min(0).max(31),
  type: z.string().min(1),
})
  .passthrough()

const RawDeckSchema = z.object({
  buttons: z.array(RawButtonEnvelopeSchema).optional(),
  id: z.string().min(1),
  name: z.string().optional(),
  type: z.string().min(1).optional(),
})
  .passthrough()

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
    decks: z.record(RawDeckSchema),
    addons: z.array(AddonSchema).default([]),
    logging: LoggingSchema.default({}),
    session: SessionSchema.optional(),
  })
  .strict()

export interface ButtonInstance extends AddonButtonEnvelope {
  accent?: string
  background?: string
  config: Record<string, unknown>
  definition: AddonButtonDefinition
  full_surface?: boolean
  interval_ms?: number
  style_id?: string
  wrapper_id?: string
}

export interface DeckConfig {
  background?: string
  deckType?: string
  id: string
  name?: string
  buttons: ButtonInstance[]
}

const CoreButtonConfigSchema = z.object({
  // These fields remain core-owned because the legacy SVG fallback still needs
  // enough metadata to render mixed decks while TSX/react-dom becomes primary.
  accent: AccentOverrideSchema.optional(),
  background: z.string().min(1).optional(),
  full_surface: z.boolean().optional(),
  style_id: z.string().min(1).optional(),
  wrapper_id: z.string().min(1).optional(),
})
  .strict()

const CoreDeckConfigSchema = z.object({
  background: z.string().min(1).optional(),
})
  .strict()

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
  session?: z.infer<typeof SessionSchema>
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

  if (config.session?.locked_deck && !config.decks[config.session.locked_deck]) {
    throw new ConfigValidationError(
      `Locked deck '${config.session.locked_deck}' is not defined`,
      undefined,
      undefined,
      `Check the value for '${getPathLabel(["session", "locked_deck"])}'.`,
      ["session", "locked_deck"],
    )
  }

  return config
}

function getButtonPayload(button: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(button).filter(([key]) => key !== "accent" && key !== "background" && key !== "full_surface" && key !== "position" && key !== "style_id" && key !== "type" && key !== "wrapper_id"),
  )
}

function getDeckPayload(deck: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(deck).filter(([key]) => key !== "background" && key !== "buttons" && key !== "id" && key !== "name" && key !== "type"),
  )
}

function resolveAssetReferences(value: unknown, registry: AddonRegistry): unknown {
  if (typeof value === "string") {
    return registry.resolveAssetPath(value) ?? value
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveAssetReferences(item, registry))
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveAssetReferences(item, registry)]),
    )
  }

  return value
}

function expandDecks(bootstrap: BootstrapSirenoConfig, registry: AddonRegistry): Record<string, AddonGeneratedDeck> {
  const decks: Record<string, AddonGeneratedDeck> = {}

  for (const [deckKey, deck] of Object.entries(bootstrap.decks)) {
    const deckType = deck.type ? registry.getDeckType(deck.type) : undefined
    if (deck.type && !deckType) {
      throw new ConfigValidationError(
        `Unknown deck type '${deck.type}'`,
        undefined,
        undefined,
        `Register '${deck.type}' before using it in config.yml.`,
        ["decks", deckKey, "type"],
      )
    }

    if (!deckType) {
      const parsedCoreDeckConfig = CoreDeckConfigSchema.safeParse({ background: deck.background })
      if (!parsedCoreDeckConfig.success) {
        throw toConfigValidationError(parsedCoreDeckConfig.error.issues[0], ["decks", deckKey])
      }

      decks[deckKey] = {
        ...(parsedCoreDeckConfig.data.background !== undefined ? { background: parsedCoreDeckConfig.data.background } : {}),
        buttons: deck.buttons ?? [],
        id: deck.id,
        ...(deck.name !== undefined ? { name: deck.name } : {}),
      }
      continue
    }

    const parsedDeckPayload = deckType.configSchema.safeParse(getDeckPayload(deck))
    if (!parsedDeckPayload.success) {
      throw toConfigValidationError(parsedDeckPayload.error.issues[0], ["decks", deckKey])
    }

    const parsedCoreDeckConfig = CoreDeckConfigSchema.safeParse({ background: deck.background })
    if (!parsedCoreDeckConfig.success) {
      throw toConfigValidationError(parsedCoreDeckConfig.error.issues[0], ["decks", deckKey])
    }

    const generatedDecks = deckType.createDecks({
      config: parsedDeckPayload.data,
      deck: { id: deck.id, type: deckType.type },
    })

    for (const [generatedDeckId, generatedDeck] of Object.entries(generatedDecks)) {
      if (generatedDeck.id !== generatedDeckId) {
        throw new ConfigValidationError(
          `Generated deck id '${generatedDeck.id}' must match its map key '${generatedDeckId}'`,
          undefined,
          undefined,
          `Check the value for '${getPathLabel(["decks", deckKey, "id"])}'.`,
          ["decks", deckKey, "id"],
        )
      }

      if (decks[generatedDeckId]) {
        throw new ConfigValidationError(
          `Deck '${generatedDeckId}' is already defined`,
          undefined,
          undefined,
          `Rename '${generatedDeckId}' or remove the duplicate deck definition.`,
          ["decks", deckKey, "id"],
        )
      }

      decks[generatedDeckId] = generatedDeck

      if (generatedDeckId === deckKey && parsedCoreDeckConfig.data.background !== undefined) {
        decks[generatedDeckId] = {
          ...generatedDeck,
          background: parsedCoreDeckConfig.data.background,
        }
      }
    }
  }

  return decks
}

export function validateConfig(data: unknown, registry: AddonRegistry): SirenoConfig {
  const bootstrap = validateBootstrapConfig(data)
  const decks: Record<string, DeckConfig> = {}
  const expandedDecks = expandDecks(bootstrap, registry)

  for (const [deckKey, deck] of Object.entries(expandedDecks)) {
    const nextButtons: ButtonInstance[] = []

    for (const [buttonIndex, button] of deck.buttons.entries()) {
      const parsedButton = RawButtonEnvelopeSchema.safeParse(button)
      if (!parsedButton.success) {
        throw toConfigValidationError(parsedButton.error.issues[0], ["decks", deckKey, "buttons", buttonIndex])
      }

      const definition = registry.getButton(parsedButton.data.type)
      if (!definition) {
        throw new ConfigValidationError(
          `Unknown button type '${parsedButton.data.type}'`,
          undefined,
          undefined,
          `Register '${parsedButton.data.type}' before using it in config.yml.`,
          ["decks", deckKey, "buttons", buttonIndex, "type"],
        )
      }

      const payload = resolveAssetReferences(getButtonPayload(parsedButton.data), registry) as Record<string, unknown>
      const parsedCoreButtonConfig = CoreButtonConfigSchema.safeParse({
        accent: parsedButton.data.accent,
        background: parsedButton.data.background,
        full_surface: parsedButton.data.full_surface,
        style_id: parsedButton.data.style_id,
        wrapper_id: parsedButton.data.wrapper_id,
      })
      if (!parsedCoreButtonConfig.success) {
        throw toConfigValidationError(parsedCoreButtonConfig.error.issues[0], ["decks", deckKey, "buttons", buttonIndex])
      }

      if (parsedCoreButtonConfig.data.full_surface && parsedCoreButtonConfig.data.wrapper_id) {
        throw new ConfigValidationError(
          "`full_surface` cannot be combined with `wrapper_id`",
          undefined,
          undefined,
          `Remove 'wrapper_id' from '${getPathLabel(["decks", deckKey, "buttons", buttonIndex])}' or disable 'full_surface'.`,
          ["decks", deckKey, "buttons", buttonIndex, "full_surface"],
        )
      }

      if (parsedCoreButtonConfig.data.wrapper_id && registry.getStylePrimitive(parsedCoreButtonConfig.data.wrapper_id)) {
        throw new ConfigValidationError(
          `Wrapper reference '${parsedCoreButtonConfig.data.wrapper_id}' points to a style primitive`,
          undefined,
          undefined,
          `Use a registered wrapper id for '${getPathLabel(["decks", deckKey, "buttons", buttonIndex, "wrapper_id"])}'.`,
          ["decks", deckKey, "buttons", buttonIndex, "wrapper_id"],
        )
      }

      if (parsedCoreButtonConfig.data.style_id && registry.getWrapperPrimitive(parsedCoreButtonConfig.data.style_id)) {
        throw new ConfigValidationError(
          `Style reference '${parsedCoreButtonConfig.data.style_id}' points to a wrapper primitive`,
          undefined,
          undefined,
          `Use a registered style id for '${getPathLabel(["decks", deckKey, "buttons", buttonIndex, "style_id"])}'.`,
          ["decks", deckKey, "buttons", buttonIndex, "style_id"],
        )
      }

      if (parsedCoreButtonConfig.data.wrapper_id && !registry.getWrapperPrimitive(parsedCoreButtonConfig.data.wrapper_id)) {
        throw new ConfigValidationError(
          `Unknown wrapper primitive '${parsedCoreButtonConfig.data.wrapper_id}'`,
          undefined,
          undefined,
          `Register '${parsedCoreButtonConfig.data.wrapper_id}' before using it in config.yml.`,
          ["decks", deckKey, "buttons", buttonIndex, "wrapper_id"],
        )
      }

      if (parsedCoreButtonConfig.data.style_id && !registry.getStylePrimitive(parsedCoreButtonConfig.data.style_id)) {
        throw new ConfigValidationError(
          `Unknown style primitive '${parsedCoreButtonConfig.data.style_id}'`,
          undefined,
          undefined,
          `Register '${parsedCoreButtonConfig.data.style_id}' before using it in config.yml.`,
          ["decks", deckKey, "buttons", buttonIndex, "style_id"],
        )
      }

      const parsedPayload = definition.configSchema.safeParse(payload)
      if (!parsedPayload.success) {
        throw toConfigValidationError(parsedPayload.error.issues[0], ["decks", deckKey, "buttons", buttonIndex])
      }

      nextButtons.push({
        ...(parsedCoreButtonConfig.data.accent !== undefined ? { accent: parsedCoreButtonConfig.data.accent } : {}),
        ...(parsedCoreButtonConfig.data.background !== undefined ? { background: parsedCoreButtonConfig.data.background } : {}),
        ...(parsedCoreButtonConfig.data.full_surface !== undefined ? { full_surface: parsedCoreButtonConfig.data.full_surface } : {}),
        ...(parsedCoreButtonConfig.data.style_id !== undefined ? { style_id: parsedCoreButtonConfig.data.style_id } : {}),
        ...(parsedCoreButtonConfig.data.wrapper_id !== undefined ? { wrapper_id: parsedCoreButtonConfig.data.wrapper_id } : {}),
        position: parsedButton.data.position,
        type: parsedButton.data.type,
        config: parsedPayload.data as Record<string, unknown>,
        definition,
      })
    }

    decks[deckKey] = {
      ...(bootstrap.decks[deckKey]?.background !== undefined ? { background: bootstrap.decks[deckKey]?.background } : {}),
      id: deck.id,
      ...(bootstrap.decks[deckKey]?.type !== undefined ? { deckType: bootstrap.decks[deckKey]?.type } : {}),
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
    ...(bootstrap.session !== undefined ? { session: bootstrap.session } : {}),
    theme: bootstrap.theme,
  }
}
