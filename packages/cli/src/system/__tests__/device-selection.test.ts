import { describe, expect, it, vi } from "vitest"

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
}))

const { select } = await import("@clack/prompts")
const selectMock = select as unknown as ReturnType<typeof vi.fn>

const { selectDevice, NoStreamDeckFoundError } =
  await import("../device-selection")
const { createLogger } = await import("@/util/logger")

const silentLogger = () => createLogger({ level: "silent" })

const devices = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `SN${i}`,
    model: "mk2",
    keyCount: 15,
    label: `MK.2 (SN${i})`,
    transport: "real" as const,
  }))

describe("selectDevice", () => {
  it("throws NoStreamDeckFoundError when devices is empty", async () => {
    await expect(
      selectDevice({ devices: [], logger: silentLogger() }),
    ).rejects.toBeInstanceOf(NoStreamDeckFoundError)
  })

  it("returns the only device when length is 1", async () => {
    const result = await selectDevice({
      devices: devices(1),
      logger: silentLogger(),
    })
    expect(result.descriptor.id).toBe("SN0")
    expect(result.savedButStale).toBe(false)
  })

  it("returns current device if it matches one in the list (no prompt)", async () => {
    const result = await selectDevice({
      devices: devices(3),
      current: { serial: "SN1", path: "/dev/hidraw1", model: "MK.2" },
      logger: silentLogger(),
    })
    expect(result.descriptor.id).toBe("SN1")
    expect(result.savedButStale).toBe(false)
    expect(selectMock).not.toHaveBeenCalled()
  })

  it("prompts and returns selected when multiple devices and no current", async () => {
    selectMock.mockResolvedValueOnce("SN2")
    const result = await selectDevice({
      devices: devices(3),
      logger: silentLogger(),
    })
    expect(result.descriptor.id).toBe("SN2")
    expect(result.savedButStale).toBe(false)
  })

  it("when current is stale, prompts with current devices only and savedButStale=true", async () => {
    selectMock.mockResolvedValueOnce("SN2")
    const result = await selectDevice({
      devices: devices(3),
      current: { serial: "OLD", path: "/p", model: "OLD" },
      logger: silentLogger(),
    })
    expect(result.savedButStale).toBe(true)
    expect(result.descriptor.id).toBe("SN2")
    expect(selectMock).toHaveBeenCalled()
    const call = selectMock.mock.calls[0]![0] as {
      options: Array<{ label: string; value: string }>
    }
    expect(call.options).toHaveLength(3)
    expect(call.options.map((c) => c.value).sort()).toEqual([
      "SN0",
      "SN1",
      "SN2",
    ])
  })

  it("prompt options use descriptor.label", async () => {
    selectMock.mockResolvedValueOnce("SN0")
    await selectDevice({ devices: devices(2), logger: silentLogger() })
    const call = selectMock.mock.calls[0]![0] as {
      options: Array<{ label: string; value: string }>
    }
    expect(call.options[0]!.label).toContain("MK.2")
    expect(call.options[0]!.label).toContain("SN0")
    expect(call.options[0]!.value).toBe("SN0")
  })
})
