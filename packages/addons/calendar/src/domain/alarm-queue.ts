/** Serializable scheduling state. The host must persist each transition. */
export interface AlarmRecord {
  readonly id: string
  readonly occurrence: string
  /** Changing this value resets previous actions when an occurrence moves. */
  readonly eventStartMs: number
  readonly dueAtMs: number
  readonly state: "pending" | "active" | "snoozed" | "dismissed"
  readonly snoozedUntilMs?: number
}

export type AlarmSchedule = Pick<
  AlarmRecord,
  "id" | "occurrence" | "eventStartMs" | "dueAtMs"
>

/** Reconcile a complete successful snapshot; never call with a failed partial refresh. */
export const reconcileAlarms = (
  previous: readonly AlarmRecord[],
  schedule: readonly AlarmSchedule[],
): AlarmRecord[] => {
  const byId = new Map(previous.map((alarm) => [alarm.id, alarm]))
  return schedule.map((next) => {
    const old = byId.get(next.id)
    if (
      old &&
      old.occurrence === next.occurrence &&
      old.eventStartMs === next.eventStartMs &&
      old.dueAtMs === next.dueAtMs
    )
      return old
    return { ...next, state: "pending" }
  })
}

/** Recovery grace applies only on startup; active and snoozed alarms survive it. */
export const advanceAlarms = (
  alarms: readonly AlarmRecord[],
  nowMs: number,
  recoveryGraceMs?: number,
): AlarmRecord[] =>
  alarms.map((alarm) => {
    if (alarm.state === "pending" && alarm.dueAtMs <= nowMs) {
      return {
        ...alarm,
        state:
          recoveryGraceMs !== undefined &&
          nowMs - alarm.dueAtMs > recoveryGraceMs
            ? "dismissed"
            : "active",
      }
    }
    if (
      alarm.state === "snoozed" &&
      alarm.snoozedUntilMs !== undefined &&
      alarm.snoozedUntilMs <= nowMs
    ) {
      const { snoozedUntilMs: _until, ...rest } = alarm
      return { ...rest, state: "active" }
    }
    return alarm
  })

export const nextActiveAlarm = (
  alarms: readonly AlarmRecord[],
): AlarmRecord | undefined =>
  alarms
    .filter((alarm) => alarm.state === "active")
    .sort((a, b) => a.dueAtMs - b.dueAtMs || a.id.localeCompare(b.id))[0]

export const snoozeAlarm = (
  alarms: readonly AlarmRecord[],
  id: string,
  untilMs: number,
): AlarmRecord[] =>
  alarms.map((alarm) =>
    alarm.id === id && alarm.state === "active"
      ? { ...alarm, state: "snoozed", snoozedUntilMs: untilMs }
      : alarm,
  )

export const snoozeOccurrence = (
  alarms: readonly AlarmRecord[],
  occurrence: string,
  untilMs: number,
): AlarmRecord[] =>
  alarms.map((alarm) =>
    alarm.occurrence === occurrence && alarm.state !== "dismissed"
      ? { ...alarm, state: "snoozed", snoozedUntilMs: untilMs }
      : alarm,
  )

export const dismissAlarm = (
  alarms: readonly AlarmRecord[],
  id: string,
): AlarmRecord[] =>
  alarms.map((alarm) =>
    alarm.id === id && alarm.state === "active"
      ? { ...alarm, state: "dismissed" }
      : alarm,
  )

export const dismissOccurrence = (
  alarms: readonly AlarmRecord[],
  occurrence: string,
): AlarmRecord[] =>
  alarms.map((alarm) =>
    alarm.occurrence === occurrence ? { ...alarm, state: "dismissed" } : alarm,
  )
