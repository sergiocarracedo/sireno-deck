import { z } from "zod"

export const TOGGLE_DEFAULT_INTERVAL_MS = 2000
export const TOGGLE_DEFAULT_TIMEOUT_MS = 5000

export const StatusToggleStateSchema = z
  .object({
    label: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
    onTap: z.string().min(1).optional(),
  })
  .strict()
  .refine((s) => s.label !== undefined || s.icon !== undefined, {
    message: "each state requires at least one of `label` or `icon`",
  })

export type StatusToggleState = z.infer<typeof StatusToggleStateSchema>

export const StatusToggleConfigSchema = z
  .object({
    statusCommand: z.string().min(1),
    intervalMs: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional(),
    states: z.record(z.string().min(1), StatusToggleStateSchema),
  })
  .strict()
  .refine((c) => Object.keys(c.states).length > 0, {
    message: "`states` must declare at least one entry",
  })

export type StatusToggleConfig = z.infer<typeof StatusToggleConfigSchema>

export const LegacyToggleConfigSchema = z
  .object({
    key: z.string().min(1),
    default: z.boolean().default(false),
  })
  .strict()

export type LegacyToggleConfig = z.infer<typeof LegacyToggleConfigSchema>

export const configSchema = z.union([
  StatusToggleConfigSchema,
  LegacyToggleConfigSchema,
])

export type ConfigSchema = z.infer<typeof configSchema>

export const isStatusToggleConfig = (
  value: unknown,
): value is StatusToggleConfig =>
  StatusToggleConfigSchema.safeParse(value).success

export const isLegacyToggleConfig = (
  value: unknown,
): value is LegacyToggleConfig =>
  LegacyToggleConfigSchema.safeParse(value).success
