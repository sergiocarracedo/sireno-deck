import { describe, expect, it, vi } from "vitest"

import { createAddonRegistry } from "../../../packages/cli/src/addon/registry.js"
import coreButtonsAddon from "./index.js"

describe("core-buttons addon", () => {
  it("exports a bundled display button definition with a zod schema", () => {
    expect(coreButtonsAddon.name).toBe("core-buttons")
    expect(coreButtonsAddon.apiVersion).toBe(1)
    expect(coreButtonsAddon.assets).toHaveProperty("clock.svg")
    expect(coreButtonsAddon.wrappers).toEqual([{ name: "shared-card", wrapper: "shared" }])
    expect(coreButtonsAddon.styles).toEqual([{ name: "accent", shared: { tone: "accent" } }])

    const definition = coreButtonsAddon.buttons[0]
    const config = definition?.configSchema.parse({ label: "Clock" })

    expect(definition?.type).toBe("display-text")
    expect(config).toEqual({ label: "Clock" })
  })

  it("creates a renderable button instance", () => {
    const definition = coreButtonsAddon.buttons[0]
    const instance = definition?.createInstance({
      button: { position: 2 },
      config: { icon: "./clock.svg", label: "Clock" },
    })

    expect(instance?.render()).toMatchObject({
      props: {
        icon: "./clock.svg",
        keyIndex: 2,
        label: "Clock",
      },
      type: "deck-button",
    })
  })

  it("navigates with the bundled change-deck button", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "change-deck")
    const navigateToDeck = vi.fn()
    const instance = definition?.createInstance({
      button: { position: 4 },
      config: { label: "Emoji", target_deck: "emoji" },
      methods: { navigateToDeck },
    } as never)

    await instance?.onTap?.()

    expect(navigateToDeck).toHaveBeenCalledWith("emoji")
  })

  it("registers bundled wrapper and style primitives through the shared addon registry contract", () => {
    const registry = createAddonRegistry()
    registry.registerAddon(coreButtonsAddon)

    expect(registry.getWrapperPrimitive("core-buttons/shared-card")).toEqual({
      addonName: "core-buttons",
      id: "core-buttons/shared-card",
      name: "shared-card",
      wrapper: "shared",
    })
    expect(registry.getStylePrimitive("core-buttons/accent")).toEqual({
      addonName: "core-buttons",
      id: "core-buttons/accent",
      name: "accent",
      shared: { tone: "accent" },
    })
  })

  it("exports a bundled toggle definition with the internal-mode schema", () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const config = definition?.configSchema.parse({
      label: "Desk Lamp",
      mode: "internal",
      on: { subtitle: "ON" },
    })

    expect(definition?.type).toBe("toggle")
    expect(config).toEqual({
      initial_state: "off",
      label: "Desk Lamp",
      mode: "internal",
      on: { subtitle: "ON" },
    })
  })

  it("creates a renderable internal toggle instance", () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const instance = definition?.createInstance({
      button: { position: 6 },
      config: {
        initial_state: "on",
        label: "Desk Lamp",
        mode: "internal",
        on: { subtitle: "ON" },
      },
      methods: { invalidate: vi.fn() },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: {
        keyIndex: 6,
        label: "Desk Lamp",
        subtitle: "ON",
        toggle_mode: "internal",
        variant: "toggle",
      },
      type: "deck-button",
    })
  })

  it("toggles internal state and invalidates on tap", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const invalidate = vi.fn()
    const instance = definition?.createInstance({
      button: { position: 7 },
      config: {
        initial_state: "off",
        label: "Desk Lamp",
        mode: "internal",
        off: { subtitle: "OFF" },
        on: { subtitle: "ON" },
      },
      methods: { invalidate },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 7, label: "Desk Lamp", subtitle: "OFF", toggle_mode: "internal", variant: "toggle" },
    })

    await instance?.onTap?.()

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 7, label: "Desk Lamp", subtitle: "ON", toggle_mode: "internal", variant: "toggle" },
    })
  })

  it("keeps get-set toggles pending until the first authoritative read", () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const runCommand = vi.fn(async () => ({ code: 0, failed: false, stdout: "on", timedOut: false }))
    const instance = definition?.createInstance({
      button: { position: 8 },
      config: {
        get_state_command: "read-lamp",
        label: "Desk Lamp",
        mode: "get-set",
        set_off_command: "turn-off-lamp",
        set_on_command: "turn-on-lamp",
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 8, label: "Desk Lamp", subtitle: "PENDING", toggle_mode: "get-set", variant: "toggle" },
    })
    expect(runCommand).not.toHaveBeenCalled()
  })

  it("runs authoritative reads and selects the correct get-set write command from last known truth", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const invalidate = vi.fn()
    let stateOutput = "off"
    const runCommand = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        return { code: 0, failed: false, stdout: stateOutput, timedOut: false }
      }

      if (command === "turn-on-lamp") {
        stateOutput = "on"
      }

      return { code: 0, failed: false, stdout: "", timedOut: false }
    })
    const instance = definition?.createInstance({
      button: { position: 9 },
      config: {
        get_state_command: "read-lamp",
        label: "Desk Lamp",
        mode: "get-set",
        off: { subtitle: "OFF" },
        on: { subtitle: "ON" },
        set_off_command: "turn-off-lamp",
        set_on_command: "turn-on-lamp",
      },
      methods: { invalidate, runCommand },
    } as never)

    await instance?.onActivate?.()

    expect(runCommand).toHaveBeenCalledWith("read-lamp")
    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 9, label: "Desk Lamp", subtitle: "OFF", toggle_mode: "get-set", variant: "toggle" },
    })

    await instance?.onTap?.()

    expect(runCommand).toHaveBeenCalledWith("turn-on-lamp")
    expect(runCommand).toHaveBeenLastCalledWith("read-lamp")
    expect(invalidate).toHaveBeenCalled()
    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 9, label: "Desk Lamp", subtitle: "ON", toggle_mode: "get-set", variant: "toggle" },
    })
  })

  it("preserves the last authoritative truth and shows error on get-set write failure", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    const runCommand = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        return { code: 0, failed: false, stdout: "on", timedOut: false }
      }

      return { code: 1, failed: true, stdout: "", timedOut: false }
    })
    const instance = definition?.createInstance({
      button: { position: 10 },
      config: {
        get_state_command: "read-lamp",
        label: "Desk Lamp",
        mode: "get-set",
        off: { subtitle: "OFF" },
        on: { subtitle: "ON" },
        set_off_command: "turn-off-lamp",
        set_on_command: "turn-on-lamp",
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    await instance?.onActivate?.()
    await instance?.onTap?.()

    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 10, label: "Desk Lamp", subtitle: "ERROR", toggle_mode: "get-set", variant: "toggle" },
    })
  })

  it("reconciles toggle-status writes through status_command instead of local inversion", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    let statusOutput = "off"
    const runCommand = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        return { code: 0, failed: false, stdout: statusOutput, timedOut: false }
      }

      if (command === "toggle-lamp") {
        statusOutput = "on"
      }

      return { code: 0, failed: false, stdout: "", timedOut: false }
    })
    const instance = definition?.createInstance({
      button: { position: 11 },
      config: {
        label: "Desk Lamp",
        mode: "toggle-status",
        off: { subtitle: "OFF" },
        on: { subtitle: "ON" },
        status_command: "read-lamp",
        toggle_command: "toggle-lamp",
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    await instance?.onActivate?.()
    await instance?.onTap?.()

    expect(runCommand.mock.calls.map((call) => call[0])).toEqual(["read-lamp", "toggle-lamp", "read-lamp"])
    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 11, label: "Desk Lamp", subtitle: "ON", toggle_mode: "toggle-status", variant: "toggle" },
    })
  })

  it("preserves last authoritative truth and shows error when toggle-status reconciliation fails", async () => {
    const definition = coreButtonsAddon.buttons.find((button) => button.type === "toggle")
    let readCount = 0
    const runCommand = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        readCount += 1

        if (readCount === 1) {
          return { code: 0, failed: false, stdout: "on", timedOut: false }
        }

        return { code: 0, failed: false, stdout: "unknown", timedOut: false }
      }

      return { code: 0, failed: false, stdout: "", timedOut: false }
    })
    const instance = definition?.createInstance({
      button: { position: 12 },
      config: {
        label: "Desk Lamp",
        mode: "toggle-status",
        off: { subtitle: "OFF" },
        on: { subtitle: "ON" },
        status_command: "read-lamp",
        toggle_command: "toggle-lamp",
      },
      methods: { invalidate: vi.fn(), runCommand },
    } as never)

    await instance?.onActivate?.()
    await instance?.onTap?.()

    expect(instance?.render()).toMatchObject({
      props: { keyIndex: 12, label: "Desk Lamp", subtitle: "ERROR", toggle_mode: "toggle-status", variant: "toggle" },
    })
  })
})
