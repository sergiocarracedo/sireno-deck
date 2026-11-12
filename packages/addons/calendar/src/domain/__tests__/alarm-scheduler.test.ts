import { afterEach, describe, expect, it, vi } from "vitest"
import { createAlarmScheduler } from "../alarm-scheduler.js"
import type { AlarmRecord } from "../alarm-queue.js"
import type { CalendarEvent } from "../events.js"

const event = (
  providerInstanceId: string,
  eventId: string,
  offsets = [0],
): CalendarEvent => ({
  identity: {
    providerInstanceId,
    calendarId: "cal",
    eventId,
    occurrenceId: "one",
  },
  title: eventId,
  status: "confirmed",
  time: {
    kind: "timed",
    start: "2026-01-01T00:00:00Z",
    end: "2026-01-01T01:00:00Z",
  },
  notificationReminders: offsets,
})

const storage = (initial: AlarmRecord[] = []) => {
  let records = initial
  return {
    load: async () => records,
    save: async (next: readonly AlarmRecord[]) => {
      records = [...next]
    },
    records: () => records,
  }
}
const settings = { enabled: true as const, offsetsMinutes: [0] }
const item = (e: CalendarEvent, startMs: number) => ({ event: e, startMs })

afterEach(() => vi.useRealTimers())

describe("alarm scheduler", () => {
  it("dismisses an event's reminders ten minutes after its start", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const store = storage()
    const onChange = vi.fn()
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: { enabled: true, offsetsMinutes: [-5, 0] },
      onAlert: () => {},
      onChange,
    })
    const start = 300_000
    await scheduler.refresh("a", [item(event("a", "one"), start)])
    expect(scheduler.active()).toBeDefined()
    await vi.advanceTimersByTimeAsync(899_999)
    expect(scheduler.active()).toBeDefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(scheduler.active()).toBeUndefined()
    expect(store.records().every((alarm) => alarm.state === "dismissed")).toBe(
      true,
    )
    expect(onChange).toHaveBeenCalled()
    await scheduler.refresh("a", [item(event("a", "one"), start)])
    expect(scheduler.active()).toBeUndefined()
    await scheduler.dispose()
  })

  it("uses the configured deadline for snoozed and recovered alarms", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const store = storage()
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      autoDismissMinutes: 2,
      snoozeMinutes: 5,
      onAlert: () => {},
    })
    await scheduler.refresh("a", [item(event("a", "one"), 0)])
    await scheduler.snooze()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(store.records()[0]?.state).toBe("dismissed")
    await scheduler.dispose()
    const recovered = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      autoDismissMinutes: 2,
      onAlert: () => {},
    })
    expect(recovered.active()).toBeUndefined()
    await recovered.dispose()
  })

  it("expires overdue stored alarms before emitting an alert on startup", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(600_000)
    const alert = vi.fn()
    const store = storage([
      {
        id: "old",
        occurrence: "old",
        eventStartMs: 0,
        dueAtMs: 0,
        state: "active",
      },
    ])
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      onAlert: alert,
    })
    expect(scheduler.active()).toBeUndefined()
    expect(store.records()[0]?.state).toBe("dismissed")
    expect(alert).not.toHaveBeenCalled()
    await scheduler.dispose()
  })
  it("merges configured and calendar offsets only when opted in", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const store = storage()
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: { enabled: true, offsetsMinutes: [-5, 0] },
      useCalendarReminders: true,
      onAlert: () => {},
    })
    await scheduler.refresh("a", [
      item(event("a", "one", [-1440, -5]), 100_000_000),
    ])
    expect(
      store
        .records()
        .map((record) => (record.dueAtMs - record.eventStartMs) / 60_000),
    ).toEqual([-1440, -5, 0])
    await scheduler.dispose()
  })
  it("waits for already queued transitions when disposed", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    let unblock!: () => void
    let block = false
    const store = storage()
    const scheduler = await createAlarmScheduler({
      storage: {
        ...store,
        save: async (records) => {
          if (block)
            await new Promise<void>((resolve) => {
              unblock = resolve
            })
          await store.save(records)
        },
      },
      globalSettings: settings,
      onAlert: () => {},
    })
    await scheduler.refresh("a", [item(event("a", "one"), 1000)])
    block = true
    const snooze = scheduler.snooze()
    await Promise.resolve()
    const disposing = scheduler.dispose()
    unblock()
    await snooze
    await disposing
    expect(store.records()[0]?.state).toBe("snoozed")
  })
  it("fires on the clock, repeats, snoozes and advances the queue", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const store = storage()
    const alert = vi.fn()
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      onAlert: alert,
    })
    await scheduler.refresh("a", [
      item(event("a", "one"), 2000),
      item(event("a", "two"), 2000),
    ])
    await vi.advanceTimersByTimeAsync(1000)
    expect(alert).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(alert).toHaveBeenCalledTimes(2)
    const first = scheduler.active()?.id
    await scheduler.snooze()
    expect(scheduler.active()?.id).not.toBe(first)
    await scheduler.dismiss()
    expect(scheduler.active()).toBeUndefined()
    await vi.advanceTimersByTimeAsync(300_000)
    expect(scheduler.active()?.id).toBe(first)
    scheduler.dispose()
  })

  it("snoozes every reminder for the active event occurrence together", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const store = storage()
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      snoozeMinutes: 5,
      onAlert: () => {},
    })
    const first = event("a", "one", [-5, 0])
    await scheduler.refresh("a", [
      item(first, 100_000),
      item(event("a", "two"), 100_000),
    ])
    expect(scheduler.active()?.occurrence).toBe(
      JSON.stringify(["a", "cal", "one", "one"]),
    )
    await scheduler.snooze()
    expect(scheduler.active()?.occurrence).not.toBe(
      JSON.stringify(["a", "cal", "one", "one"]),
    )
    expect(
      store
        .records()
        .filter(
          (record) =>
            record.occurrence === JSON.stringify(["a", "cal", "one", "one"]),
        )
        .every((record) => record.state === "snoozed"),
    ).toBe(true)
    await scheduler.dispose()
  })

  it("preserves unchanged offsets, resets moves, and isolates failed provider refreshes", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(100_000)
    const store = storage()
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      useCalendarReminders: true,
      onAlert: () => {},
    })
    const a = event("a", "one", [-1, 0, 0])
    await scheduler.refresh("a", [item(a, 100_000)])
    await scheduler.refresh("b", [item(event("b", "two"), 100_000)])
    await scheduler.dismissAll()
    await scheduler.refresh("a", [item(event("a", "one", [0, 1]), 100_000)])
    expect(
      store
        .records()
        .filter((r) => JSON.parse(r.occurrence)[0] === "a")
        .map((r) => r.state)
        .sort(),
    ).toEqual(["dismissed", "pending"])
    expect(
      store.records().some((r) => JSON.parse(r.occurrence)[0] === "b"),
    ).toBe(true)
    await scheduler.refresh("a", [item(a, 200_000)])
    expect(
      store
        .records()
        .filter((r) => JSON.parse(r.occurrence)[0] === "a")
        .every((r) => r.state === "pending"),
    ).toBe(true)
    scheduler.dispose()
  })

  it("recovers recent pending and snoozed alarms, but expires old pending alarms", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(4_000_000)
    const base = { occurrence: '["a","c","e","o"]', eventStartMs: 0 }
    const store = storage([
      { ...base, id: "old", dueAtMs: 0, state: "pending" },
      { ...base, id: "recent", dueAtMs: 500_000, state: "pending" },
      {
        ...base,
        id: "snooze",
        dueAtMs: 0,
        state: "snoozed",
        snoozedUntilMs: 4_100_000,
      },
    ])
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      autoDismissMinutes: 1000,
      onAlert: () => {},
    })
    expect(store.records().map((r) => r.state)).toEqual([
      "dismissed",
      "active",
      "snoozed",
    ])
    await vi.advanceTimersByTimeAsync(100_000)
    expect(store.records()[2]?.state).toBe("active")
    scheduler.dispose()
  })

  it("does not replay newly discovered alarms older than the recovery grace", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(4_000_000)
    const store = storage()
    const scheduler = await createAlarmScheduler({
      storage: store,
      globalSettings: settings,
      autoDismissMinutes: 1000,
      onAlert: () => {},
    })
    await scheduler.refresh("a", [
      item(event("a", "old"), 0),
      item(event("a", "recent"), 500_000),
    ])
    expect(store.records().map((record) => record.state)).toEqual([
      "dismissed",
      "active",
    ])
    scheduler.dispose()
  })
})
