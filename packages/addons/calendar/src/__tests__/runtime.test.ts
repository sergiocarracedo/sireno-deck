import { describe, expect, it, vi } from "vitest"
import { createCalendarRuntime } from "../runtime.js"
import { globalService, manifest } from "../index.js"
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("calendar runtime", () => {
  it("uses calendar names for untitled events and prefers event colors", async () => {
    const runtime = createCalendarRuntime({
      config: {
        providers: [
          {
            type: "google",
            id: "one",
            clientId: "client",
            calendarIds: ["work"],
            calendarColors: { work: "#111111" },
          },
        ],
      },
      now: () => Date.parse("2026-11-05T12:00:00Z"),
      provider: () => ({
        instanceId: "one",
        fetchEvents: async () => [
          {
            identity: {
              providerInstanceId: "one",
              calendarId: "work",
              eventId: "e",
              occurrenceId: "e",
            },
            title: "",
            calendarName: "Feverup",
            calendarColor: "#aa55cc",
            eventColor: "#ffff00",
            status: "confirmed" as const,
            time: {
              kind: "timed" as const,
              start: "2026-11-05T14:00:00Z",
              end: "2026-11-05T15:00:00Z",
            },
          },
        ],
      }),
    })
    await runtime.refresh()
    expect(runtime.snapshot().events[0]).toMatchObject({
      title: "Feverup",
      calendar: "Feverup",
      color: "#ffff00",
    })
  })
  it("opens an event's safe calendar link on tap and falls back to details without one", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined)
    const navigateToDeck = vi.fn()
    const select = vi.fn().mockReturnValue(true)
    const url = vi
      .fn()
      .mockReturnValueOnce(
        "https://calendar.google.com/calendar/event?eid=example",
      )
      .mockReturnValueOnce(undefined)
    const ctx = {
      config: { slot: 2 },
      methods: { "calendar:selectEvent": select, "calendar:selectedUrl": url },
      coreMethods: { dispatch, navigateToDeck },
    }
    await manifest.buttonTypes["calendar:event"].service.onTap(ctx)
    expect(select).toHaveBeenCalledWith(2)
    expect(dispatch).toHaveBeenCalledWith(
      "url://https://calendar.google.com/calendar/event?eid=example",
    )
    expect(navigateToDeck).not.toHaveBeenCalled()
    await manifest.buttonTypes["calendar:event"].service.onTap(ctx)
    expect(navigateToDeck).toHaveBeenCalledWith({ id: "calendar:detail" })
  })
  it("hides ended events while retaining ongoing and upcoming events", async () => {
    const makeEvent = (id: string, start: string, end: string) => ({
      identity: {
        providerInstanceId: "one",
        calendarId: "work",
        eventId: id,
        occurrenceId: id,
      },
      title: id,
      status: "confirmed" as const,
      time: { kind: "timed" as const, start, end },
    })
    const now = Date.parse("2026-11-05T12:00:00Z")
    const runtime = createCalendarRuntime({
      config: {
        providers: [
          {
            type: "google",
            id: "one",
            clientId: "client",
            calendarIds: ["work"],
          },
        ],
      },
      now: () => now,
      provider: () => ({
        instanceId: "one",
        fetchEvents: async () => [
          makeEvent("ended", "2026-11-05T10:00:00Z", "2026-11-05T11:00:00Z"),
          makeEvent("ongoing", "2026-11-05T11:00:00Z", "2026-11-05T13:00:00Z"),
          makeEvent("upcoming", "2026-11-05T14:00:00Z", "2026-11-05T15:00:00Z"),
        ],
      }),
    })
    await runtime.refresh()
    expect(runtime.snapshot().events.map((event) => event.title)).toEqual([
      "ongoing",
      "upcoming",
    ])
  })
  it("uses the calendar timezone and exclusive end date for all-day events", async () => {
    const makeEvent = (
      id: string,
      startDate: string,
      endDateExclusive: string,
    ) => ({
      identity: {
        providerInstanceId: "one",
        calendarId: "work",
        eventId: id,
        occurrenceId: id,
      },
      title: id,
      status: "confirmed" as const,
      time: {
        kind: "all-day" as const,
        startDate,
        endDateExclusive,
        timeZone: "America/Los_Angeles",
      },
    })
    const runtime = createCalendarRuntime({
      config: {
        providers: [
          {
            type: "google",
            id: "one",
            clientId: "client",
            calendarIds: ["work"],
          },
        ],
      },
      now: () => Date.parse("2026-11-05T07:30:00Z"),
      provider: () => ({
        instanceId: "one",
        fetchEvents: async () => [
          makeEvent("ended", "2026-11-03", "2026-11-04"),
          makeEvent("today", "2026-11-04", "2026-11-05"),
        ],
      }),
    })
    await runtime.refresh()
    expect(runtime.snapshot().events.map((event) => event.title)).toEqual([
      "today",
    ])
  })
  it("drops previously active provider reminders at startup when they are no longer enabled", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"))
    const directory = await mkdtemp(join(tmpdir(), "calendar-reminders-"))
    const event = {
      identity: {
        providerInstanceId: "one",
        calendarId: "c",
        eventId: "e",
        occurrenceId: "e",
      },
      title: "Meeting",
      status: "confirmed" as const,
      time: {
        kind: "timed" as const,
        start: "2026-11-06T12:00:00Z",
        end: "2026-11-06T13:00:00Z",
      },
      notificationReminders: [-1440],
    }
    const config = {
      providers: [
        { type: "google", id: "one", clientId: "client", calendarIds: ["c"] },
      ],
    }
    const provider = () => ({
      instanceId: "one",
      fetchEvents: async () => [event],
    })
    try {
      const first = createCalendarRuntime({
        config: { ...config, useCalendarReminders: true },
        dataDirectory: directory,
        provider,
      })
      await first.start()
      await first.refresh()
      expect(first.snapshot().alarm?.title).toBe("Meeting")
      await first.dispose()
      const onAlert = vi.fn()
      const second = createCalendarRuntime({
        config,
        dataDirectory: directory,
        provider,
        onAlert,
      })
      await second.start()
      expect(second.snapshot().alarm).toBeUndefined()
      expect(onAlert).not.toHaveBeenCalled()
      await second.dispose()
    } finally {
      vi.useRealTimers()
      await rm(directory, { recursive: true, force: true })
    }
  })
  it("rebuilds generated decks on the first poll even when events did not change", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-first-deck-"))
    const requestDeckRebuild = vi.fn()
    try {
      await globalService.onLoad({
        publish: () => {},
        requestDeckRebuild,
        getDataDirectory: async () => directory,
      })
      await globalService.pollers[0]!.poll()
      expect(requestDeckRebuild).toHaveBeenCalledOnce()
      await globalService.pollers[0]!.poll()
      expect(requestDeckRebuild).toHaveBeenCalledOnce()
    } finally {
      await globalService.onUnload()
      await rm(directory, { recursive: true, force: true })
    }
  })
  it("requests events from the start of today for the daily count", async () => {
    const now = new Date(2026, 10, 7, 15, 30)
    const provider = vi.fn(
      (_instance: unknown, _from: string, _to: string) => ({
        instanceId: "one",
        fetchEvents: async () => [],
      }),
    )
    const runtime = createCalendarRuntime({
      config: {
        providers: [
          {
            type: "google",
            id: "one",
            clientId: "client",
            calendarIds: ["work"],
          },
        ],
      },
      now: () => now.getTime(),
      provider,
    })
    await runtime.refresh()
    const midnight = new Date(now)
    midnight.setHours(0, 0, 0, 0)
    expect(provider.mock.calls[0]?.[1]).toBe(midnight.toISOString())
  })
  it("sorts offset timestamps chronologically and keeps unsafe links out of state", async () => {
    const makeEvent = (id: string, start: string, externalUrl: string) => ({
      identity: {
        providerInstanceId: "one",
        calendarId: "work",
        eventId: id,
        occurrenceId: id,
      },
      title: id,
      status: "confirmed" as const,
      time: { kind: "timed" as const, start, end: "2026-11-06T15:00:00Z" },
      externalUrl,
    })
    const runtime = createCalendarRuntime({
      config: {
        providers: [
          {
            type: "google",
            id: "one",
            clientId: "client",
            calendarIds: ["work"],
            calendarColors: { work: "#aabbcc" },
          },
        ],
      },
      now: () => Date.parse("2026-11-05T00:00:00Z"),
      provider: () => ({
        instanceId: "one",
        fetchEvents: async () => [
          makeEvent(
            "later",
            "2026-11-06T10:00:00-05:00",
            "javascript:alert(1)",
          ),
          makeEvent(
            "earlier",
            "2026-11-06T12:00:00Z",
            "https://example.com/private",
          ),
        ],
      }),
    })
    await runtime.refresh()
    expect(runtime.snapshot().events[0]?.color).toBe("#aabbcc")
    expect(runtime.snapshot().events.map((event) => event.title)).toEqual([
      "earlier",
      "later",
    ])
    expect(runtime.nextUrl()).toBe("https://example.com/private")
    runtime.selectEvent(1)
    expect(runtime.selectedUrl()).toBeUndefined()
    expect(runtime.snapshot().detail?.hasLink).toBe(false)
    expect(JSON.stringify(runtime.snapshot())).not.toContain(
      "https://example.com/private",
    )
  })
  it.each(["back", "hold"])(
    "interrupts for an alarm and releases after %s",
    async (action) => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-11-05T12:00:00Z"))
      const directory = await mkdtemp(join(tmpdir(), "calendar-interrupt-"))
      const release = vi.fn()
      const showModal = vi.fn(
        (_id: string, _options?: { onOk?: () => void | Promise<void> }) =>
          release,
      )
      const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (input) =>
          String(input).includes("oauth2.googleapis.com")
            ? Response.json({ access_token: "token" })
            : Response.json({
                items: [
                  {
                    id: "event",
                    summary: "Meeting",
                    start: { dateTime: "2026-11-05T12:00:00Z" },
                    end: { dateTime: "2026-11-05T13:00:00Z" },
                    reminders: {
                      useDefault: false,
                      overrides: [{ method: "popup", minutes: 0 }],
                    },
                  },
                ],
              }),
        )
      try {
        await globalService.onLoad(
          {
            publish: () => {},
            showModal,
            getDataDirectory: async () => directory,
            credentials: {
              availability: async () => "available",
              get: async () => "refresh",
              set: async () => {},
              delete: async () => {},
            },
          },
          {
            alarms: { enabled: true, offsetsMinutes: [0] },
            providers: [
              {
                type: "google",
                id: "one",
                clientId: "client",
                calendarIds: ["c"],
              },
            ],
          },
        )
        await globalService.pollers[0]!.poll()
        expect(showModal).toHaveBeenCalledWith("calendar:alarm", {
          onOk: expect.any(Function),
        })
        if (action === "back") await showModal.mock.calls[0]?.[1]?.onOk?.()
        else
          await manifest.buttonTypes["calendar:alarm-dismiss"].service.onTap({
            methods: {
              "calendar:dismissAll": globalService.methods.dismissAll,
            },
          })
        expect(release).toHaveBeenCalledOnce()
      } finally {
        await globalService.onUnload()
        fetch.mockRestore()
        vi.useRealTimers()
        await rm(directory, { recursive: true, force: true })
      }
    },
  )
  it("dispatches alarm action buttons to their respective methods", async () => {
    const dismissAll = vi.fn()
    const snooze = vi.fn()
    await manifest.buttonTypes["calendar:alarm-dismiss"].service.onTap({
      methods: { "calendar:dismissAll": dismissAll },
    })
    await manifest.buttonTypes["calendar:alarm-snooze"].service.onTap({
      methods: { "calendar:snooze": snooze },
    })
    expect(dismissAll).toHaveBeenCalledOnce()
    expect(snooze).toHaveBeenCalledOnce()
    const dismissButton = manifest.buttonTypes["calendar:alarm-dismiss"].service
    const snoozeButton = manifest.buttonTypes["calendar:alarm-snooze"].service
    expect(dismissButton.gestureHandlers).toContain("hold")
    expect(snoozeButton.gestureHandlers).toContain("hold")
    await dismissButton.onHold?.({
      methods: { "calendar:dismissAll": dismissAll },
    })
    await snoozeButton.onHold?.({ methods: { "calendar:snooze": snooze } })
    expect(dismissAll).toHaveBeenCalledTimes(2)
    expect(snooze).toHaveBeenCalledTimes(2)
    expect(
      manifest.buttonTypes["calendar:alarm-bell"].service,
    ).not.toHaveProperty("onTap")
  })
  it("persists snoozes across restart and dismisses the recovered alarm", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"))
    const directory = await mkdtemp(join(tmpdir(), "calendar-alarm-"))
    const event = {
      identity: {
        providerInstanceId: "one",
        calendarId: "c",
        eventId: "e",
        occurrenceId: "e",
      },
      title: "Meeting",
      status: "confirmed" as const,
      time: {
        kind: "timed" as const,
        start: "2026-11-05T12:00:00Z",
        end: "2026-11-05T13:00:00Z",
      },
      notificationReminders: [0],
    }
    const options = {
      config: {
        alarms: { enabled: true, offsetsMinutes: [0] },
        providers: [
          { type: "google", id: "one", clientId: "client", calendarIds: ["c"] },
        ],
      },
      dataDirectory: directory,
      provider: () => ({ instanceId: "one", fetchEvents: async () => [event] }),
    }
    try {
      const first = createCalendarRuntime(options)
      await first.start()
      await first.refresh()
      expect(first.snapshot().alarm?.title).toBe("Meeting")
      await first.snooze()
      expect(first.snapshot().alarm).toBeUndefined()
      await first.dispose()
      const second = createCalendarRuntime(options)
      await second.start()
      await second.refresh()
      expect(second.snapshot().alarm).toBeUndefined()
      await vi.advanceTimersByTimeAsync(300_000)
      await second.refresh()
      expect(second.snapshot().alarm?.title).toBe("Meeting")
      await second.dismissAll()
      expect(second.snapshot().alarm).toBeUndefined()
      await second.dispose()
    } finally {
      vi.useRealTimers()
      await rm(directory, { recursive: true, force: true })
    }
  })
  it("recovers stale events and snoozed alarms after an offline restart", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"))
    const directory = await mkdtemp(join(tmpdir(), "calendar-offline-"))
    const event = {
      identity: {
        providerInstanceId: "one",
        calendarId: "c",
        eventId: "e",
        occurrenceId: "e",
      },
      title: "Meeting",
      status: "confirmed" as const,
      time: {
        kind: "timed" as const,
        start: "2026-11-05T12:00:00Z",
        end: "2026-11-05T13:00:00Z",
      },
      notificationReminders: [0],
    }
    const config = {
      alarms: { enabled: true, offsetsMinutes: [0] },
      providers: [
        { type: "google", id: "one", clientId: "client", calendarIds: ["c"] },
      ],
    }
    try {
      const first = createCalendarRuntime({
        config,
        dataDirectory: directory,
        provider: () => ({
          instanceId: "one",
          fetchEvents: async () => [event],
        }),
      })
      await first.start()
      await first.refresh()
      await first.snooze()
      await first.dispose()
      const path = join(directory, "provider-snapshots-v1.json")
      expect((await stat(path)).mode & 0o077).toBe(0)
      const saved = await readFile(path, "utf8")
      expect(saved).not.toContain("client")
      const second = createCalendarRuntime({
        config,
        dataDirectory: directory,
        provider: () => ({
          instanceId: "one",
          fetchEvents: async () => {
            throw new Error("offline")
          },
        }),
      })
      await second.start()
      await second.refresh()
      expect(await readFile(path, "utf8")).toBe(saved)
      expect(second.snapshot().providers).toEqual([
        { name: "one", status: "stale" },
      ])
      expect(second.snapshot().events[0]?.title).toBe("Meeting")
      expect(second.snapshot().alarm).toBeUndefined()
      await vi.advanceTimersByTimeAsync(300_000)
      await second.dispose()
      expect(second.snapshot().alarm?.title).toBe("Meeting")
    } finally {
      vi.useRealTimers()
      await rm(directory, { recursive: true, force: true })
    }
  })
  it("retains corrupt provider state and rejects startup rather than overwriting it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-corrupt-"))
    const path = join(directory, "provider-snapshots-v1.json")
    try {
      await writeFile(path, "not json")
      const runtime = createCalendarRuntime({
        config: {},
        dataDirectory: directory,
      })
      await expect(runtime.start()).rejects.toThrow(
        "Invalid calendar provider state",
      )
      expect(await readFile(path, "utf8")).toBe("not json")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  it("removes snapshots for accounts no longer configured", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-removed-"))
    const config = {
      providers: [
        { type: "google", id: "one", clientId: "client", calendarIds: ["c"] },
      ],
    }
    try {
      const first = createCalendarRuntime({
        config,
        dataDirectory: directory,
        provider: () => ({ instanceId: "one", fetchEvents: async () => [] }),
      })
      await first.start()
      await first.refresh()
      await first.dispose()
      const second = createCalendarRuntime({
        config: {},
        dataDirectory: directory,
      })
      await second.start()
      await second.dispose()
      expect(
        JSON.parse(
          await readFile(join(directory, "provider-snapshots-v1.json"), "utf8"),
        ).providers,
      ).toEqual([])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  it("refreshes accounts independently and retains stale events without exposing credentials", async () => {
    const event = {
      identity: {
        providerInstanceId: "one",
        calendarId: "c",
        eventId: "e",
        occurrenceId: "e",
      },
      title: "Meeting",
      time: {
        kind: "timed" as const,
        start: "2026-11-05T12:00:00Z",
        end: "2026-11-05T13:00:00Z",
      },
      status: "confirmed" as const,
    }
    const fetchEvents = vi
      .fn()
      .mockResolvedValueOnce([event])
      .mockRejectedValueOnce(new Error("secret token"))
    const runtime = createCalendarRuntime({
      config: {
        providers: [
          {
            type: "google",
            id: "one",
            name: "Work",
            clientId: "client",
            calendarIds: ["c"],
          },
        ],
      },
      provider: () => ({ instanceId: "one", fetchEvents }),
      now: () => Date.parse("2026-11-05T10:00:00Z"),
    })
    await runtime.refresh()
    expect(runtime.snapshot().events[0]?.title).toBe("Meeting")
    await runtime.refresh()
    expect(runtime.snapshot().providers).toEqual([
      { name: "Work", status: "stale" },
    ])
    expect(JSON.stringify(runtime.snapshot())).not.toContain("secret token")
    expect(runtime.snapshot().events[0]?.title).toBe("Meeting")
  })

  it("opens the calendar deck on tap and the next event on hold", async () => {
    const publish = vi.fn()
    const requestDeckRebuild = vi.fn()
    const directory = await mkdtemp(join(tmpdir(), "calendar-service-"))
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input)
        if (url.includes("oauth2.googleapis.com"))
          return Response.json({ access_token: "private-access" })
        return Response.json({
          items: [
            {
              id: "event",
              summary: "Planning",
              location: "Office",
              htmlLink: "https://calendar.google.com/event?x=1%3Btouch%20file",
              start: { dateTime: "2026-11-05T12:00:00Z" },
              end: { dateTime: "2026-11-05T13:00:00Z" },
            },
          ],
        })
      })
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-05T10:00:00Z"))
    try {
      await globalService.onLoad(
        {
          publish,
          requestDeckRebuild,
          getDataDirectory: async () => directory,
          credentials: {
            availability: async () => "available",
            get: async () => "private-refresh",
            set: async () => {},
            delete: async () => {},
          },
        },
        {
          providers: [
            {
              type: "google",
              id: "work",
              clientId: "client",
              calendarIds: ["primary"],
            },
          ],
        },
      )
      const state = await globalService.pollers[0]!.poll()
      expect(state.events[0]?.title).toBe("Planning")
      expect(requestDeckRebuild).toHaveBeenCalledOnce()
      const navigateToDeck = vi.fn()
      manifest.buttonTypes["calendar:upcoming"].service.onTap({
        coreMethods: { navigateToDeck },
      })
      expect(navigateToDeck).toHaveBeenCalledWith({ id: "calendar:deck" })
      await manifest.buttonTypes["calendar:event"].service.onTap({
        config: { slot: 0 },
        methods: { "calendar:selectEvent": globalService.methods.selectEvent },
        coreMethods: { navigateToDeck, dispatch: vi.fn(async () => {}) },
      })
      expect(navigateToDeck).toHaveBeenCalledWith({ id: "calendar:detail" })
      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            title: "Planning",
            location: "Office",
            calendar: "primary",
          }),
        }),
      )
      const dispatch = vi.fn(async () => {})
      await manifest.buttonTypes["calendar:upcoming"].service.onHold({
        methods: { "calendar:nextUrl": globalService.methods.nextUrl },
        coreMethods: { dispatch },
      })
      expect(dispatch).toHaveBeenCalledWith(
        "url://https://calendar.google.com/event?x=1%3Btouch%20file",
      )
      await manifest.buttonTypes["calendar:detail"].service.onHold({
        methods: { "calendar:selectedUrl": globalService.methods.selectedUrl },
        coreMethods: { dispatch },
      })
      expect(dispatch).toHaveBeenCalledWith(
        "url://https://calendar.google.com/event?x=1%3Btouch%20file",
      )
      await globalService.pollers[0]!.poll()
      expect(requestDeckRebuild).toHaveBeenCalledOnce()
      expect(JSON.stringify(publish.mock.calls)).not.toContain("private-")
    } finally {
      await globalService.onUnload()
      fetch.mockRestore()
      vi.useRealTimers()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
