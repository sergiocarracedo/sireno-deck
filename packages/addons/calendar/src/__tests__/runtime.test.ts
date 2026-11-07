import { describe, expect, it, vi } from "vitest"
import { createCalendarRuntime } from "../runtime.js"
import { globalService, manifest } from "../index.js"
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("calendar runtime", () => {
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
    expect(runtime.snapshot().events.map((event) => event.title)).toEqual([
      "earlier",
      "later",
    ])
    runtime.selectEvent(1)
    expect(runtime.selectedUrl()).toBeUndefined()
    expect(runtime.snapshot().detail?.hasLink).toBe(false)
    expect(JSON.stringify(runtime.snapshot())).not.toContain(
      "https://example.com/private",
    )
  })
  it("interrupts for an alarm and releases after the hold gesture", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"))
    const directory = await mkdtemp(join(tmpdir(), "calendar-interrupt-"))
    const release = vi.fn()
    const interruptDeck = vi.fn(() => release)
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
          interruptDeck,
          getDataDirectory: async () => directory,
          credentials: {
            availability: async () => "available",
            get: async () => "refresh",
            set: async () => {},
            delete: async () => {},
          },
        },
        {
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
      expect(interruptDeck).toHaveBeenCalledWith("calendar:alarm")
      await manifest.buttonTypes["calendar:upcoming"].service.onHold({
        methods: {
          "calendar:dismiss": globalService.methods.dismiss,
          "calendar:hasAlarm": globalService.methods.hasAlarm,
        },
      })
      expect(release).toHaveBeenCalledOnce()
    } finally {
      await globalService.onUnload()
      fetch.mockRestore()
      vi.useRealTimers()
      await rm(directory, { recursive: true, force: true })
    }
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

  it("loads the manifest, refreshes Google using scoped credentials and cycles pages", async () => {
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
      manifest.buttonTypes["calendar:upcoming"].service.onHold({
        methods: { "calendar:hasAlarm": globalService.methods.hasAlarm },
        coreMethods: { navigateToDeck },
      })
      expect(navigateToDeck).toHaveBeenCalledWith({ id: "calendar:events" })
      manifest.buttonTypes["calendar:event"].service.onTap({
        config: { slot: 0 },
        methods: { "calendar:selectEvent": globalService.methods.selectEvent },
        coreMethods: { navigateToDeck },
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
      await manifest.buttonTypes["calendar:detail"].service.onHold({
        methods: { "calendar:selectedUrl": globalService.methods.selectedUrl },
        coreMethods: { dispatch },
      })
      expect(dispatch).toHaveBeenCalledWith(
        "url://https://calendar.google.com/event?x=1%3Btouch%20file",
      )
      await globalService.pollers[0]!.poll()
      expect(requestDeckRebuild).toHaveBeenCalledOnce()
      await manifest.buttonTypes["calendar:upcoming"].service.onTap({
        methods: { "calendar:nextPage": globalService.methods.nextPage },
      })
      expect(publish).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
      expect(JSON.stringify(publish.mock.calls)).not.toContain("private-")
    } finally {
      await globalService.onUnload()
      fetch.mockRestore()
      vi.useRealTimers()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
