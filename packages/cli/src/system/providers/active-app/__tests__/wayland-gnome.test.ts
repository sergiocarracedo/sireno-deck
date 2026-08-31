import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type pino from "pino"

import {
  type LinuxDbusBus,
  type LinuxDbusInterface,
  type LinuxDbusProxyObject,
} from "@/system/providers/shared"

import {
  createWaylandGnomeProvider,
  shouldUseWaylandGnomeProvider,
} from "../wayland-gnome"

const silentLogger = (): pino.Logger => {
  const noop = (): void => undefined
  return {
    info: vi.fn(noop),
    warn: vi.fn(noop),
    error: vi.fn(noop),
    debug: vi.fn(noop),
    trace: vi.fn(noop),
    fatal: vi.fn(noop),
    child: vi.fn(),
    level: "silent",
  } as unknown as pino.Logger
}

const makeBus = (
  focusClass: () => Promise<string>,
  focusTitle?: () => Promise<string>,
): { bus: LinuxDbusBus; disconnect: ReturnType<typeof vi.fn> } => {
  const disconnect = vi.fn()
  const iface: LinuxDbusInterface = {
    FocusClass: focusClass,
    ...(focusTitle !== undefined ? { FocusTitle: focusTitle } : {}),
  }
  const proxy: LinuxDbusProxyObject = {
    getInterface: () => iface,
  }
  const bus: LinuxDbusBus = {
    async getProxyObject() {
      return proxy
    },
    disconnect,
  }
  return { bus, disconnect }
}

describe("shouldUseWaylandGnomeProvider", () => {
  it("returns true for wayland + GNOME", () => {
    expect(
      shouldUseWaylandGnomeProvider({
        XDG_SESSION_TYPE: "wayland",
        XDG_CURRENT_DESKTOP: "GNOME",
      }),
    ).toBe(true)
  })

  it("returns true for wayland + ubuntu:GNOME (snap variant)", () => {
    expect(
      shouldUseWaylandGnomeProvider({
        XDG_SESSION_TYPE: "wayland",
        XDG_CURRENT_DESKTOP: "ubuntu:GNOME",
      }),
    ).toBe(true)
  })

  it("returns false for X11 + GNOME", () => {
    expect(
      shouldUseWaylandGnomeProvider({
        XDG_SESSION_TYPE: "x11",
        XDG_CURRENT_DESKTOP: "GNOME",
      }),
    ).toBe(false)
  })

  it("returns false for wayland + KDE", () => {
    expect(
      shouldUseWaylandGnomeProvider({
        XDG_SESSION_TYPE: "wayland",
        XDG_CURRENT_DESKTOP: "KDE",
      }),
    ).toBe(false)
  })

  it("falls back to WAYLAND_DISPLAY when XDG_SESSION_TYPE is unset", () => {
    expect(
      shouldUseWaylandGnomeProvider({
        WAYLAND_DISPLAY: "wayland-0",
        XDG_CURRENT_DESKTOP: "GNOME",
      }),
    ).toBe(true)
  })
})

describe("createWaylandGnomeProvider", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("returns parsed snapshot from FocusClass", async () => {
    const { bus } = makeBus(async () => "Google-chrome")
    const provider = await createWaylandGnomeProvider({
      dbus: bus,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    // ponytail: flush the initial poll — Promise.all on focusClass adds an
    // extra microtask hop vs the prior single-await path, so getActive() needs
    // one poll cycle to populate lastName/lastTitle.
    await vi.advanceTimersByTimeAsync(100)
    const snap = await provider.getActive()
    expect(snap).toEqual({
      name: "Google-chrome",
      windowTitle: null,
      processId: null,
    })
    await provider.stop()
  })

  it("populates windowTitle when FocusTitle is available", async () => {
    const { bus } = makeBus(
      async () => "Google-chrome",
      async () => "GitHub - sirenodeck-2",
    )
    const provider = await createWaylandGnomeProvider({
      dbus: bus,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    await vi.advanceTimersByTimeAsync(100)
    const snap = await provider.getActive()
    expect(snap).toEqual({
      name: "Google-chrome",
      windowTitle: "GitHub - sirenodeck-2",
      processId: null,
    })
    await provider.stop()
  })

  it("emits a new snapshot when title changes but class stays", async () => {
    let titleCall = 0
    const { bus } = makeBus(
      async () => "Google-chrome",
      async () => {
        titleCall += 1
        if (titleCall === 1) return "GitHub - sirenodeck-2"
        return "Pull Requests · anomalyco/opencode"
      },
    )
    const provider = await createWaylandGnomeProvider({
      dbus: bus,
      logger: silentLogger(),
      pollIntervalMs: 50,
    })
    const handler = vi.fn()
    provider.subscribe(handler)
    await vi.advanceTimersByTimeAsync(60)
    await vi.advanceTimersByTimeAsync(60)
    const titles = handler.mock.calls
      .map((c) => (c[0] as { windowTitle: string | null } | null)?.windowTitle)
      .filter((t): t is string => typeof t === "string")
    expect(titles).toContain("GitHub - sirenodeck-2")
    expect(titles).toContain("Pull Requests · anomalyco/opencode")
    await provider.stop()
  })

  it("returns null provider when dbus probe fails (no extension)", async () => {
    const bus: LinuxDbusBus = {
      async getProxyObject() {
        throw new Error("extension not found")
      },
    }
    const provider = await createWaylandGnomeProvider({
      dbus: bus,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    const snap = await provider.getActive()
    expect(snap).toBeNull()
    await provider.stop()
  })

  it("subscriber fires when FocusClass returns a new name", async () => {
    let count = 0
    const { bus } = makeBus(async () => {
      count += 1
      if (count === 1) return "Google-chrome"
      return "Slack"
    })
    const provider = await createWaylandGnomeProvider({
      dbus: bus,
      logger: silentLogger(),
      pollIntervalMs: 50,
    })
    const handler = vi.fn()
    provider.subscribe(handler)
    await vi.advanceTimersByTimeAsync(150)
    expect(handler).toHaveBeenCalled()
    expect(handler).toHaveBeenCalledWith({
      name: "Google-chrome",
      windowTitle: null,
      processId: null,
    })
    await provider.stop()
  })

  it("stop() clears the poll timer and disconnects the bus", async () => {
    const { bus, disconnect } = makeBus(async () => "Slack")
    const provider = await createWaylandGnomeProvider({
      dbus: bus,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    await provider.stop()
    expect(disconnect).toHaveBeenCalled()
  })
})
