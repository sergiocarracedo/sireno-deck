import { z } from "zod"

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/)
const alarmSettings = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }).strict(),
  z
    .object({
      enabled: z.literal(true),
      offsetsMinutes: z.array(z.number().int()),
    })
    .strict(),
])
const shared = {
  id: identifier,
  name: z.string().min(1).optional(),
  alarms: alarmSettings.optional(),
}
const calendarSelection = {
  ...shared,
  clientId: z.string().min(1),
  clientSecretCredential: identifier.optional(),
  calendarIds: z.array(z.string().min(1)).min(1),
  calendarColors: z
    .record(z.string().min(1), z.string().regex(/^#[0-9a-fA-F]{6}$/))
    .optional(),
  calendarAlarms: z.record(z.string().min(1), alarmSettings).optional(),
}
const feedSource = z.union([
  z
    .object({
      ...shared,
      type: z.literal("ical"),
      url: z
        .string()
        .url()
        .regex(/^https?:\/\//i),
    })
    .strict(),
  z
    .object({ ...shared, type: z.literal("ical"), credentialName: identifier })
    .strict(),
])
const provider = z.union([
  z.object({ ...calendarSelection, type: z.literal("google") }).strict(),
  z.object({ ...calendarSelection, type: z.literal("microsoft") }).strict(),
  feedSource,
])

export const calendarConfigSchema = z
  .object({
    providers: z.array(provider).default([]),
    alarms: alarmSettings.default({ enabled: true, offsetsMinutes: [-5, 0] }),
    useCalendarReminders: z.boolean().default(false),
    snoozeMinutes: z.number().int().positive().default(5),
    repeatMinutes: z.number().int().positive().default(1),
    autoDismissMinutes: z.number().int().nonnegative().default(10),
    missedGraceMinutes: z.number().int().nonnegative().default(60),
    lookaheadDays: z.number().int().positive().default(7),
    allDayTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default("09:00"),
    interrupt: z.boolean().default(true),
    systemNotifications: z.boolean().default(false),
  })
  .strict()
  .superRefine((config, ctx) => {
    const ids = new Set<string>()
    for (const [index, instance] of config.providers.entries()) {
      if (ids.has(instance.id))
        ctx.addIssue({
          code: "custom",
          path: ["providers", index, "id"],
          message: "Provider instance IDs must be unique",
        })
      ids.add(instance.id)
    }
  })

export type CalendarConfig = z.infer<typeof calendarConfigSchema>
