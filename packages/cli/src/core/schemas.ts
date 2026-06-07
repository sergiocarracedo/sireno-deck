import { z, type ZodIssue } from 'zod'

import type {
  AddonButtonDefinition,
  AddonButtonEnvelope,
  AddonGeneratedDeck,
} from '@/addon/api'
import { AddonRegistryError } from '@/addon/registry'

import type { AddonRegistry } from '@/addon/registry'

type ConfigPathSegment = string | number

export const ThemeSchema = z
  .object({
    name: z.string().min(1),
    background: z.string().optional(),
    accent: z.string().optional(),
    primary: z.string().optional(),
  })
  .strict()

export const AddonSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  source: z.enum(['local', 'npm']).default('local'),
  path: z.string().optional(),
})

export const LoggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  verbose: z.boolean().default(false),
})

export const SessionSchema = z.object({
  locked_deck: z.string().min(1).optional(),
})

const ThemeColorTokenSchema = z.enum([
  'accent',
  'background',
  'danger',
  'foreground',
  'primary',
  'success',
])
const AccentOverrideSchema = z.union([
  ThemeColorTokenSchema,
  z
    .string()
    .regex(
      /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
      'Accent override must be a theme token or hex color',
    ),
])

const ToggleStatePresentationOverrideSchema = z
  .object({
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

export const InternalToggleButtonConfigSchema =
  ToggleSharedPresentationSchema.extend({
    initial_state: z.enum(['on', 'off']).default('off'),
    mode: z.literal('internal'),
  }).strict()

export const GetSetToggleButtonConfigSchema =
  ToggleSharedPresentationSchema.extend({
    get_state_command: z.string().min(1),
    mode: z.literal('get-set'),
    off_values: ToggleOutputTokensSchema.optional(),
    on_values: ToggleOutputTokensSchema.optional(),
    set_off_command: z.string().min(1),
    set_on_command: z.string().min(1),
  }).strict()

export const ToggleStatusToggleButtonConfigSchema =
  ToggleSharedPresentationSchema.extend({
    mode: z.literal('toggle-status'),
    off_values: ToggleOutputTokensSchema.optional(),
    on_values: ToggleOutputTokensSchema.optional(),
    status_command: z.string().min(1),
    toggle_command: z.string().min(1),
  }).strict()

export const BuiltinToggleButtonConfigSchema = z.discriminatedUnion('mode', [
  InternalToggleButtonConfigSchema,
  GetSetToggleButtonConfigSchema,
  ToggleStatusToggleButtonConfigSchema,
])

const RawButtonEnvelopeSchema = z
  .object({
    interval_ms: z.number().int().min(500).optional(),
    poll_interval_ms: z.number().int().min(500).optional(),
    position: z.number().int().min(0).max(31),
    render_interval_ms: z.number().int().min(500).optional(),
    type: z.string().min(1),
  })
  .passthrough()

const RawDeckSchema = z
  .object({
    allow_reserved_slot_override: z.boolean().optional(),
    buttons: z.array(RawButtonEnvelopeSchema).optional(),
    id: z.string().min(1),
    name: z.string().optional(),
    type: z.string().min(1).optional(),
  })
  .passthrough()

const BootstrapSirenoConfigSchema = z
  .object({
    allow_reserved_slot_override: z.boolean().optional(),
    device: z
      .object({
        model: z.string().optional(),
        path: z.string().optional(),
        serial: z.string().min(1).optional(),
      })
      .optional(),
    theme: z.string().default('default'),
    main_deck: z.string().min(1).default('main'),
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
  command?: string
  display_command?: string
  display_mode?: string
  full?: boolean
  icon?: string
  interval_ms?: number
  label?: string
  poll_interval_ms?: number
  render_interval_ms?: number
  states?: Array<{
    key: string
    command?: string
    icon?: string
    label?: string
  }>
  status_command?: string
  target_deck?: string
  unavailable_label?: string
}

export interface DeckConfig {
  allow_reserved_slot_override?: boolean
  background?: string
  deckType?: string
  id: string
  name?: string
  system_back_hold_command?: string
  system_back_tap_command?: string
  buttons: ButtonInstance[]
}

const CoreButtonConfigSchema = z
  .object({
    accent: AccentOverrideSchema.optional(),
    background: z.string().min(1).optional(),
    full: z.boolean().optional(),
  })
  .strict()

const CoreDeckConfigSchema = z
  .object({
    background: z.string().min(1).optional(),
  })
  .strict()

export interface SirenoConfig {
  allow_reserved_slot_override?: boolean
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
    this.name = 'ConfigValidationError'
  }
}

function getPathLabel(pathSegments: readonly ConfigPathSegment[]): string {
  if (pathSegments.length === 0) {
    return 'config'
  }

  return pathSegments.join('.')
}

function getIssueMessage(issue: ZodIssue): string {
  if (issue.code === 'unrecognized_keys') {
    const [unknownKey] = issue.keys
    return unknownKey
      ? `Unknown key '${unknownKey}'`
      : 'Unknown key found in config'
  }

  return issue.message
}

function getIssueSuggestion(issue: ZodIssue): string {
  if (issue.code === 'unrecognized_keys') {
    const [unknownKey] = issue.keys
    return unknownKey
      ? `Remove '${unknownKey}' or move it under a supported config section.`
      : 'Remove the unsupported key from config.yml.'
  }

  return `Check the value for '${getPathLabel(issue.path)}'.`
}

function getIssuePathSegments(issue: ZodIssue): readonly ConfigPathSegment[] {
  if (issue.code === 'unrecognized_keys' && issue.keys[0]) {
    return [...issue.path, issue.keys[0]]
  }

  return issue.path
}

function toConfigValidationError(
  issue: ZodIssue,
  pathPrefix: readonly ConfigPathSegment[] = [],
): ConfigValidationError {
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
      `Check the value for '${getPathLabel(['main_deck'])}'.`,
      ['main_deck'],
    )
  }

  for (const [deckKey, deck] of Object.entries(config.decks)) {
    if (deck.id !== deckKey) {
      throw new ConfigValidationError(
        `Deck id '${deck.id}' must match its map key '${deckKey}'`,
        undefined,
        undefined,
        `Check the value for '${getPathLabel(['decks', deckKey, 'id'])}'.`,
        ['decks', deckKey, 'id'],
      )
    }
  }

  if (
    config.session?.locked_deck &&
    !config.decks[config.session.locked_deck]
  ) {
    throw new ConfigValidationError(
      `Locked deck '${config.session.locked_deck}' is not defined`,
      undefined,
      undefined,
      `Check the value for '${getPathLabel(['session', 'locked_deck'])}'.`,
      ['session', 'locked_deck'],
    )
  }

  if (!config.allow_reserved_slot_override) {
    const lockedDeckId = config.session?.locked_deck
    for (const [deckKey, deck] of Object.entries(config.decks ?? {})) {
      if (deckKey === lockedDeckId) continue
      if (deck.allow_reserved_slot_override) continue
      const reservedPosition = (deck.buttons?.length ?? 0) > 0 ? deck.keyCount - 1 : -1
      if (reservedPosition < 0) continue
      const conflict = (deck.buttons ?? []).find(
        (b: { position?: number }) => b.position === reservedPosition,
      )
      if (conflict) {
        throw new ConfigValidationError(
          `Button at reserved slot (position ${reservedPosition}) in deck "${deckKey}" cannot be claimed by addons. Reserved for the system back button.`,
          undefined,
          undefined,
          `Set "allow_reserved_slot_override: true" on the deck (or root) to override.`,
          ['decks', deckKey, 'buttons'],
        )
      }
    }
  }

  return config
}

function getButtonPayload(
  button: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(button).filter(
      ([key]) =>
        key !== 'accent' &&
        key !== 'background' &&
        key !== 'full' &&
        key !== 'position' &&
        key !== 'type',
    ),
  )
}

function getDeckPayload(
  deck: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(deck).filter(
      ([key]) =>
        key !== 'background' &&
        key !== 'buttons' &&
        key !== 'id' &&
        key !== 'name' &&
        key !== 'type',
    ),
  )
}

function resolveAssetReferences(
  value: unknown,
  registry: AddonRegistry,
  pathSegments: readonly ConfigPathSegment[] = [],
): unknown {
  if (typeof value === 'string') {
    if (!/^(?:addon|builtin):\/\//.test(value)) {
      return value
    }

    try {
      // Keep addon/builtin asset refs rewriteable for the eventual render target.
      registry.requireAssetPath(value)
      return value
    } catch (error) {
      if (error instanceof AddonRegistryError) {
        throw new ConfigValidationError(
          error.message,
          undefined,
          undefined,
          `Check the value for '${getPathLabel(pathSegments)}'.`,
          pathSegments,
        )
      }

      throw error
    }
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      resolveAssetReferences(item, registry, [...pathSegments, index]),
    )
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveAssetReferences(item, registry, [...pathSegments, key]),
      ]),
    )
  }

  return value
}

function expandDecks(
  bootstrap: BootstrapSirenoConfig,
  registry: AddonRegistry,
): Record<string, AddonGeneratedDeck> {
  const decks: Record<string, AddonGeneratedDeck> = {}

  for (const [deckKey, deck] of Object.entries(bootstrap.decks)) {
    const deckType = deck.type ? registry.getDeckType(deck.type) : undefined
    if (deck.type && !deckType) {
      throw new ConfigValidationError(
        `Unknown deck type '${deck.type}'`,
        undefined,
        undefined,
        `Register '${deck.type}' before using it in config.yml.`,
        ['decks', deckKey, 'type'],
      )
    }

    if (!deckType) {
      const parsedCoreDeckConfig = CoreDeckConfigSchema.safeParse({
        background: deck.background,
      })
      if (!parsedCoreDeckConfig.success) {
        throw toConfigValidationError(parsedCoreDeckConfig.error.issues[0], [
          'decks',
          deckKey,
        ])
      }

      decks[deckKey] = {
        ...(parsedCoreDeckConfig.data.background !== undefined
          ? { background: parsedCoreDeckConfig.data.background }
          : {}),
        ...(deck.allow_reserved_slot_override !== undefined
          ? { allow_reserved_slot_override: deck.allow_reserved_slot_override }
          : {}),
        buttons: deck.buttons ?? [],
        id: deck.id,
        ...(deck.name !== undefined ? { name: deck.name } : {}),
      }
      continue
    }

    const parsedDeckPayload = deckType.configSchema.safeParse(
      getDeckPayload(deck),
    )
    if (!parsedDeckPayload.success) {
      throw toConfigValidationError(parsedDeckPayload.error.issues[0], [
        'decks',
        deckKey,
      ])
    }

    const parsedCoreDeckConfig = CoreDeckConfigSchema.safeParse({
      background: deck.background,
    })
    if (!parsedCoreDeckConfig.success) {
      throw toConfigValidationError(parsedCoreDeckConfig.error.issues[0], [
        'decks',
        deckKey,
      ])
    }

    const generatedDecks = deckType.createDecks({
      config: parsedDeckPayload.data,
      deck: { id: deck.id, type: deckType.type },
    })

    for (const [generatedDeckId, generatedDeck] of Object.entries(
      generatedDecks,
    )) {
      if (generatedDeck.id !== generatedDeckId) {
        throw new ConfigValidationError(
          `Generated deck id '${generatedDeck.id}' must match its map key '${generatedDeckId}'`,
          undefined,
          undefined,
          `Check the value for '${getPathLabel(['decks', deckKey, 'id'])}'.`,
          ['decks', deckKey, 'id'],
        )
      }

      if (decks[generatedDeckId]) {
        throw new ConfigValidationError(
          `Deck '${generatedDeckId}' is already defined`,
          undefined,
          undefined,
          `Rename '${generatedDeckId}' or remove the duplicate deck definition.`,
          ['decks', deckKey, 'id'],
        )
      }

      decks[generatedDeckId] = generatedDeck

      if (
        generatedDeckId === deckKey &&
        parsedCoreDeckConfig.data.background !== undefined
      ) {
        decks[generatedDeckId] = {
          ...generatedDeck,
          background: parsedCoreDeckConfig.data.background,
        }
      }
    }
  }

  return decks
}

export function validateConfig(
  data: unknown,
  registry: AddonRegistry,
): SirenoConfig {
  const bootstrap = validateBootstrapConfig(data)
  const decks: Record<string, DeckConfig> = {}
  const expandedDecks = expandDecks(bootstrap, registry)

  for (const [deckKey, deck] of Object.entries(expandedDecks)) {
    const nextButtons: ButtonInstance[] = []

    for (const [buttonIndex, button] of deck.buttons.entries()) {
      const parsedButton = RawButtonEnvelopeSchema.safeParse(button)
      if (!parsedButton.success) {
        throw toConfigValidationError(parsedButton.error.issues[0], [
          'decks',
          deckKey,
          'buttons',
          buttonIndex,
        ])
      }

      const definition = registry.getButton(parsedButton.data.type)
      if (!definition) {
        throw new ConfigValidationError(
          `Unknown button type '${parsedButton.data.type}'`,
          undefined,
          undefined,
          `Register '${parsedButton.data.type}' before using it in config.yml.`,
          ['decks', deckKey, 'buttons', buttonIndex, 'type'],
        )
      }

      const payload = resolveAssetReferences(
        getButtonPayload(parsedButton.data),
        registry,
        ['decks', deckKey, 'buttons', buttonIndex],
      ) as Record<string, unknown>
      const parsedCoreButtonConfig = CoreButtonConfigSchema.safeParse({
        accent: parsedButton.data.accent,
        background: parsedButton.data.background,
        full: parsedButton.data.full,
      })
      if (!parsedCoreButtonConfig.success) {
        throw toConfigValidationError(parsedCoreButtonConfig.error.issues[0], [
          'decks',
          deckKey,
          'buttons',
          buttonIndex,
        ])
      }

      const parsedPayload = definition.configSchema.safeParse(payload)
      if (!parsedPayload.success) {
        throw toConfigValidationError(parsedPayload.error.issues[0], [
          'decks',
          deckKey,
          'buttons',
          buttonIndex,
        ])
      }

      nextButtons.push({
        ...(parsedCoreButtonConfig.data.accent !== undefined
          ? { accent: parsedCoreButtonConfig.data.accent }
          : {}),
        ...(parsedCoreButtonConfig.data.background !== undefined
          ? { background: parsedCoreButtonConfig.data.background }
          : {}),
        ...(parsedCoreButtonConfig.data.full !== undefined
          ? { full: parsedCoreButtonConfig.data.full }
          : {}),
        position: parsedButton.data.position,
        type: parsedButton.data.type,
        config: parsedPayload.data as Record<string, unknown>,
        definition,
        ...payload,
      })
    }

    decks[deckKey] = {
      ...(bootstrap.decks[deckKey]?.background !== undefined
        ? { background: bootstrap.decks[deckKey]?.background }
        : {}),
      id: deck.id,
      ...(bootstrap.decks[deckKey]?.type !== undefined
        ? { deckType: bootstrap.decks[deckKey]?.type }
        : {}),
      ...(deck.name !== undefined ? { name: deck.name } : {}),
      buttons: nextButtons,
    }
  }

  return {
    ...(bootstrap.allow_reserved_slot_override !== undefined
      ? { allow_reserved_slot_override: bootstrap.allow_reserved_slot_override }
      : {}),
    addons: bootstrap.addons,
    decks,
    ...(bootstrap.device !== undefined ? { device: bootstrap.device } : {}),
    logging: bootstrap.logging,
    main_deck: bootstrap.main_deck,
    ...(bootstrap.session !== undefined ? { session: bootstrap.session } : {}),
    theme: bootstrap.theme,
  }
}
