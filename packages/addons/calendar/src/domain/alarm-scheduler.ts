import {
  advanceAlarms,
  dismissAlarm,
  dismissOccurrence,
  nextActiveAlarm,
  reconcileAlarms,
  snoozeOccurrence,
  type AlarmRecord,
  type AlarmSchedule,
} from "./alarm-queue.js"
import { resolveAlarmOffsets, type AlarmSettings } from "./alarm-rules.js"
import { occurrenceKey, type CalendarEvent } from "./events.js"

export interface ScheduledEvent {
  readonly event: CalendarEvent
  /** Provider-normalized start, including the configured all-day reference time. */
  readonly startMs: number
  readonly calendarSettings?: AlarmSettings
}

interface SchedulerOptions {
  readonly storage: {
    load(): Promise<AlarmRecord[]>
    save(alarms: readonly AlarmRecord[]): Promise<void>
  }
  readonly globalSettings: AlarmSettings
  readonly useCalendarReminders?: boolean
  readonly keepStoredAlarm?: (alarm: AlarmRecord) => boolean
  readonly onAlert: (alarm: AlarmRecord) => void
  readonly onChange?: () => void
  readonly onError?: (error: unknown) => void
  readonly snoozeMinutes?: number
  readonly repeatMinutes?: number
  readonly autoDismissMinutes?: number
  readonly missedGraceMinutes?: number
  readonly now?: () => number
}

/** Each refresh replaces one successful provider snapshot; failed refreshes must not call it. */
export const createAlarmScheduler = async (options: SchedulerOptions) => {
  const now = options.now ?? Date.now
  const snoozeMs = (options.snoozeMinutes ?? 5) * 60_000
  const repeatMs = (options.repeatMinutes ?? 1) * 60_000
  const graceMs = (options.missedGraceMinutes ?? 60) * 60_000
  const autoDismissMs = (options.autoDismissMinutes ?? 10) * 60_000
  if (
    !(snoozeMs > 0) ||
    !(repeatMs > 0) ||
    !(graceMs >= 0) ||
    !(autoDismissMs >= 0) ||
    ![snoozeMs, repeatMs, graceMs, autoDismissMs].every(Number.isFinite)
  ) {
    throw new Error("Invalid alarm timing")
  }
  const expire = (
    records: readonly AlarmRecord[],
    time: number,
  ): AlarmRecord[] =>
    records.map((alarm) => {
      if (
        alarm.state === "dismissed" ||
        time < alarm.eventStartMs + autoDismissMs
      )
        return alarm
      const { snoozedUntilMs: _until, ...rest } = alarm
      return { ...rest, state: "dismissed" }
    })
  let alarms = expire(
    advanceAlarms(
      (await options.storage.load()).filter(
        options.keepStoredAlarm ?? (() => true),
      ),
      now(),
      graceMs,
    ),
    now(),
  )
  await options.storage.save(alarms)
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  let lastAlertId: string | undefined
  let lastAlertAt = 0
  let pending = Promise.resolve()

  const active = () => nextActiveAlarm(alarms)
  const arm = () => {
    if (timer !== undefined) clearTimeout(timer)
    if (disposed) return
    const time = now()
    const deadlines = alarms.flatMap((alarm) =>
      alarm.state === "pending"
        ? [alarm.dueAtMs]
        : alarm.state === "snoozed" && alarm.snoozedUntilMs !== undefined
          ? [alarm.snoozedUntilMs]
          : [],
    )
    for (const alarm of alarms)
      if (alarm.state !== "dismissed")
        deadlines.push(alarm.eventStartMs + autoDismissMs)
    if (active()) deadlines.push(lastAlertAt + repeatMs)
    // Wake periodically even after a wall-clock change.
    const delay = Math.max(
      0,
      Math.min(60_000, ...deadlines.map((deadline) => deadline - time)),
    )
    timer = setTimeout(() => {
      void run(async () => {}).catch(() => {})
    }, delay)
  }
  const run = (change: () => Promise<void>): Promise<void> => {
    if (disposed) return Promise.resolve()
    const task = pending.then(async () => {
      await change()
      const next = expire(advanceAlarms(alarms, now()), now())
      if (next.some((record, index) => record !== alarms[index])) {
        await options.storage.save(next)
        alarms = next
      }
      const current = active()
      const alertId =
        current &&
        JSON.stringify([current.id, current.eventStartMs, current.dueAtMs])
      if (
        current &&
        (alertId !== lastAlertId || now() - lastAlertAt >= repeatMs)
      ) {
        lastAlertId = alertId
        lastAlertAt = now()
        options.onAlert(current)
      } else if (!current) lastAlertId = undefined
      options.onChange?.()
      arm()
    })
    pending = task.catch((error: unknown) => {
      options.onError?.(error)
      if (!disposed) arm()
    })
    return task
  }
  const replace = async (next: AlarmRecord[]) => {
    await options.storage.save(next)
    alarms = next
  }

  await run(async () => {})
  return {
    active,
    disableCalendar: (instanceId: string, calendarId: string) =>
      run(async () => {
        await replace(
          alarms.filter((alarm) => {
            try {
              const key: unknown = JSON.parse(alarm.occurrence)
              return (
                !Array.isArray(key) ||
                key[0] !== instanceId ||
                key[1] !== calendarId
              )
            } catch {
              return true
            }
          }),
        )
      }),
    refresh: (instanceId: string, events: readonly ScheduledEvent[]) =>
      run(async () => {
        const schedule: AlarmSchedule[] = []
        for (const { event, startMs, calendarSettings } of events) {
          if (
            event.identity.providerInstanceId !== instanceId ||
            !Number.isFinite(startMs)
          ) {
            throw new Error("Invalid provider snapshot")
          }
          const occurrence = occurrenceKey(event.identity)
          for (const offset of resolveAlarmOffsets(
            event,
            options.globalSettings,
            calendarSettings,
            options.useCalendarReminders,
          )) {
            const dueAtMs = startMs + offset * 60_000
            if (!Number.isFinite(dueAtMs))
              throw new Error("Invalid alarm offset")
            schedule.push({
              id: JSON.stringify([occurrence, offset]),
              occurrence,
              eventStartMs: startMs,
              dueAtMs,
            })
          }
        }
        if (new Set(schedule.map((item) => item.id)).size !== schedule.length)
          throw new Error("Duplicate event occurrence")
        const belongs = (record: AlarmRecord) => {
          try {
            const key: unknown = JSON.parse(record.occurrence)
            return Array.isArray(key) && key[0] === instanceId
          } catch {
            return false
          }
        }
        const previous = alarms.filter(belongs)
        const reconciled = reconcileAlarms(previous, schedule).map((record) =>
          previous.includes(record)
            ? record
            : advanceAlarms([record], now(), graceMs)[0]!,
        )
        await replace([
          ...alarms.filter((record) => !belongs(record)),
          ...reconciled,
        ])
      }),
    snooze: () =>
      run(async () => {
        const current = active()
        if (current)
          await replace(
            snoozeOccurrence(alarms, current.occurrence, now() + snoozeMs),
          )
      }),
    dismiss: () =>
      run(async () => {
        const current = active()
        if (current) await replace(dismissAlarm(alarms, current.id))
      }),
    dismissAll: () =>
      run(async () => {
        const current = active()
        if (current)
          await replace(dismissOccurrence(alarms, current.occurrence))
      }),
    dispose: async () => {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      await pending
    },
  }
}
