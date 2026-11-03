import { describe, expect, it } from "vitest"
import {
  advanceAlarms,
  dismissAlarm,
  dismissOccurrence,
  nextActiveAlarm,
  reconcileAlarms,
  snoozeAlarm,
  type AlarmSchedule,
} from "../alarm-queue.js"

const schedule: AlarmSchedule[] = [
  { id: "a", occurrence: "event-1", eventStartMs: 1000, dueAtMs: 700 },
  { id: "b", occurrence: "event-1", eventStartMs: 1000, dueAtMs: 1000 },
  { id: "c", occurrence: "event-2", eventStartMs: 1000, dueAtMs: 700 },
]

describe("alarm queue", () => {
  it("queues alarms and restores snoozes from serialized state", () => {
    let alarms = advanceAlarms(reconcileAlarms([], schedule), 1000)
    expect(nextActiveAlarm(alarms)?.id).toBe("a")
    alarms = snoozeAlarm(alarms, "a", 1200)
    expect(nextActiveAlarm(alarms)?.id).toBe("c")
    alarms = JSON.parse(JSON.stringify(alarms)) as typeof alarms
    alarms = advanceAlarms(alarms, 1200, 10)
    expect(nextActiveAlarm(alarms)?.id).toBe("a")
  })

  it("dismisses one or all alarms for an occurrence", () => {
    let alarms = advanceAlarms(reconcileAlarms([], schedule), 700)
    alarms = dismissAlarm(alarms, "a")
    expect(alarms.find((a) => a.id === "b")?.state).toBe("pending")
    alarms = dismissOccurrence(alarms, "event-1")
    expect(alarms.find((a) => a.id === "b")?.state).toBe("dismissed")
    expect(alarms.find((a) => a.id === "c")?.state).toBe("active")
  })

  it("resets actions on reschedule and discards stale missed pending alarms on recovery", () => {
    let alarms = advanceAlarms(reconcileAlarms([], schedule), 1000)
    alarms = dismissOccurrence(alarms, "event-1")
    const moved = schedule.map((a) =>
      a.occurrence === "event-1"
        ? { ...a, eventStartMs: 2000, dueAtMs: a.dueAtMs + 1000 }
        : a,
    )
    alarms = reconcileAlarms(alarms, moved)
    expect(alarms.find((a) => a.id === "a")?.state).toBe("pending")
    expect(
      advanceAlarms(alarms, 2000, 100).find((a) => a.id === "a")?.state,
    ).toBe("dismissed")
    expect(
      advanceAlarms(alarms, 2000, 100).find((a) => a.id === "b")?.state,
    ).toBe("active")
  })
})
