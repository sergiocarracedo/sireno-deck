import { describe, expect, it, vi } from "vitest"

import { listDevices } from "../registry"

vi.mock("@elgato-stream-deck/node", () => ({
  listStreamDecks: vi.fn(),
}))

const sdk = await import("@elgato-stream-deck/node")
const listMock = sdk.listStreamDecks as unknown as ReturnType<typeof vi.fn>

describe("listDevices", () => {
  it("returns descriptors from listStreamDecks", async () => {
    listMock.mockResolvedValueOnce([
      { serialNumber: "Z9", path: "/dev/hidraw9", model: "xl" },
      { serialNumber: "A1", path: "/dev/hidraw0", model: "mk2" },
    ])
    const result = await listDevices()
    expect(result).toHaveLength(2)
    expect(result[0]!.id).toBe("A1")
    expect(result[0]!.model).toBe("mk2")
    expect(result[0]!.transport).toBe("real")
    expect(result[0]!.keyCount).toBe(15)
    expect(result[0]!.label).toContain("A1")
    expect(result[1]!.id).toBe("Z9")
    expect(result[1]!.model).toBe("xl")
    expect(result[1]!.keyCount).toBe(32)
  })

  it("sorts by id ascending", async () => {
    listMock.mockResolvedValueOnce([
      { serialNumber: "M", path: "/p", model: "mk2" },
      { serialNumber: "A", path: "/p", model: "mk2" },
      { serialNumber: "Z", path: "/p", model: "mk2" },
    ])
    const result = await listDevices()
    expect(result.map((d) => d.id)).toEqual(["A", "M", "Z"])
  })

  it("uses model enum value as descriptor.model", async () => {
    listMock.mockResolvedValueOnce([
      { serialNumber: "S1", path: "/p", model: "plus" },
    ])
    const result = await listDevices()
    expect(result[0]!.model).toBe("plus")
    expect(result[0]!.keyCount).toBe(32)
  })

  it("returns [] when SDK throws", async () => {
    listMock.mockRejectedValueOnce(new Error("no devices"))
    const result = await listDevices()
    expect(result).toEqual([])
  })

  it("handles missing serialNumber (falls back to path)", async () => {
    listMock.mockResolvedValueOnce([{ path: "/p", model: "mini" }])
    const result = await listDevices()
    expect(result[0]!.id).toBe("/p")
    expect(result[0]!.keyCount).toBe(6)
    expect(result[0]!.transport).toBe("real")
  })
})
