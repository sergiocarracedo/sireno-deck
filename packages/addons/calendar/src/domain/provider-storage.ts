import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { z } from "zod"
import type { ProviderSnapshot } from "./provider-cache.js"

const event = z
  .object({
    identity: z
      .object({
        providerInstanceId: z.string(),
        calendarId: z.string(),
        eventId: z.string(),
        occurrenceId: z.string(),
      })
      .strict(),
    title: z.string(),
    calendarName: z.string().optional(),
    calendarColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    eventColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    time: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("timed"),
          start: z.string(),
          end: z.string(),
          timeZone: z.string().optional(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("all-day"),
          startDate: z.string(),
          endDateExclusive: z.string(),
          timeZone: z.string(),
        })
        .strict(),
    ]),
    status: z.enum(["confirmed", "cancelled"]),
    notificationReminders: z.array(z.number().finite()).optional(),
    location: z.string().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const time = value.time
    const dates =
      time.kind === "timed"
        ? [time.start, time.end]
        : [time.startDate, time.endDateExclusive]
    if (dates.some((date) => !Number.isFinite(Date.parse(date))))
      ctx.addIssue({ code: "custom", message: "Invalid event time" })
    if (time.timeZone) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: time.timeZone })
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid event timezone" })
      }
    }
  })
const file = z
  .object({
    version: z.literal(1),
    providers: z.array(
      z
        .object({
          instanceId: z.string(),
          selection: z.string(),
          events: z.array(event),
        })
        .strict(),
    ),
  })
  .strict()

type StoredProvider = z.infer<typeof file>["providers"][number]

export const createProviderStorage = (path: string) => {
  let pending = Promise.resolve()
  return {
    async load(): Promise<StoredProvider[]> {
      let raw: string
      try {
        raw = await readFile(path, "utf8")
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
        throw error
      }
      try {
        const data = file.parse(JSON.parse(raw))
        if (
          new Set(data.providers.map((item) => item.instanceId)).size !==
            data.providers.length ||
          data.providers.some((item) =>
            item.events.some(
              (entry) => entry.identity.providerInstanceId !== item.instanceId,
            ),
          )
        )
          throw new Error()
        return data.providers
      } catch {
        throw new Error("Invalid calendar provider state")
      }
    },
    save(
      snapshots: readonly ProviderSnapshot[],
      selections: ReadonlyMap<string, string>,
    ): Promise<void> {
      const providers = snapshots.flatMap((snapshot) => {
        const selection = selections.get(snapshot.instanceId)
        if (!selection || snapshot.status === "unavailable") return []
        return [
          {
            instanceId: snapshot.instanceId,
            selection,
            events: snapshot.events.map(
              ({
                identity,
                title,
                calendarName,
                calendarColor,
                eventColor,
                time,
                status,
                notificationReminders,
                location,
              }) => ({
                identity,
                title,
                calendarName,
                calendarColor,
                eventColor,
                time,
                status,
                notificationReminders,
                location,
              }),
            ),
          },
        ]
      })
      const contents = JSON.stringify(file.parse({ version: 1, providers }))
      const write = async () => {
        await mkdir(dirname(path), { recursive: true, mode: 0o700 })
        const temp = `${path}.${randomUUID()}.tmp`
        try {
          await writeFile(temp, contents, { mode: 0o600, flag: "wx" })
          await rename(temp, path)
        } catch (error) {
          await unlink(temp).catch(() => {})
          throw error
        }
      }
      const result = pending.then(write)
      pending = result.catch(() => {})
      return result
    },
    async drain() {
      await pending
    },
  }
}
