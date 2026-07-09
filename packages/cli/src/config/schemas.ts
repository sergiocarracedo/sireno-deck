import { z } from "zod"

export const TriggerSchema = z
  .object({
    process_name: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
    window_name: z.union([z.string(), z.array(z.string()).min(1)]).optional(),
  })
  .strict()
  .refine((t) => t.process_name !== undefined || t.window_name !== undefined, {
    message: "trigger requires at least one of `process_name` or `window_name`",
  })

export const ButtonActionsSchema = z
  .object({
    tap: z.string().min(1).optional(),
    dbltap: z.string().min(1).optional(),
    hold: z.string().min(1).optional(),
  })
  .strict()

export type ButtonActions = z.infer<typeof ButtonActionsSchema>

export const ButtonDefSchema = z
  .object({
    position: z.number().int().nonnegative().optional(),
    type: z.string().min(1),
    config: z.record(z.string(), z.unknown()).optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    full: z.boolean().optional(),
    actions: ButtonActionsSchema.optional(),
  })
  .strict()

export const ButtonEntrySchema = z.union([ButtonDefSchema, z.string()])

export const DeckDefSchema = z
  .object({
    name: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
    background: z.string().min(1).optional(),
    paginated: z.boolean().optional(),
    trigger: TriggerSchema.optional(),
    autoShow: z.boolean().optional(),
    buttons: z.array(ButtonEntrySchema),
  })
  .strict()

export const AddonEntrySchema = z.union([
  z.string().min(1),
  z
    .object({
      source: z.string().min(1),
      enabled: z.boolean().optional(),
    })
    .strict(),
])

export const LoggingSchema = z
  .object({
    level: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .optional(),
    verbose: z.boolean().optional(),
  })
  .strict()
  .optional()

export const SessionSchema = z
  .object({
    locked_deck: z.string().min(1).optional(),
  })
  .strict()
  .optional()

export const ThemeEntrySchema = z.union([
  z.string().min(1),
  z
    .object({
      name: z.string().min(1).optional(),
      path: z.string().min(1),
    })
    .strict(),
])

export const RawConfigSchema = z
  .object({
    theme: ThemeEntrySchema.optional(),
    logging: LoggingSchema,
    decks: z.record(z.string(), DeckDefSchema),
    addons: z.array(AddonEntrySchema).optional(),
    session: SessionSchema,
  })
  .strict()

export type RawButtonDef = z.infer<typeof ButtonDefSchema>
export type RawButtonEntry = z.infer<typeof ButtonEntrySchema>
export type RawDeckDef = z.infer<typeof DeckDefSchema>
export type RawAddonEntry = z.infer<typeof AddonEntrySchema>
export type RawConfig = z.infer<typeof RawConfigSchema>
export type TriggerDef = z.infer<typeof TriggerSchema>
export type ThemeEntry = z.infer<typeof ThemeEntrySchema>
