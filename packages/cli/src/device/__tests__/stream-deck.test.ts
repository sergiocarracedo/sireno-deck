import { describe, expect, it, vi } from "vitest"

import { connectStreamDeck, StreamDeckSelectionError } from "../stream-deck"

vi.mock("@elgato-stream-deck/node", () => {
  return {
    listStreamDecks: vi.fn(),
    openStreamDeck: vi.fn(),
    getStreamDeckModelName: vi.fn((model: string) => `Friendly:${model}`),
  }
})

const sdk = await import("@elgato-stream-deck/node")
const listMock = sdk.listStreamDecks as unknown as ReturnType<typeof vi.fn>
const openMock = sdk.openStreamDeck as unknown as ReturnType<typeof vi.fn>
const friendlyMock = sdk.getStreamDeckModelName as unknown as ReturnType<
  typeof vi.fn
>

const infoWith = (overrides: {
  serial?: string
  path?: string
  model?: string
}): {
  serialNumber: string
  path: string
  model: string
} => ({
  serialNumber: overrides.serial ?? "ABC123",
  path: overrides.path ?? "/dev/hidraw0",
  model: overrides.model ?? "original-mk2",
})

const handleFor = (info: ReturnType<typeof infoWith>) => {
  const handle = {
    MODEL: info.model,
    PRODUCT_NAME: "Stream Deck MK.2",
    CONTROLS: Array.from({ length: 15 }, () => ({ type: "button" as const })),
    setBrightness: vi.fn(async () => undefined),
    fillKeyBuffer: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  }
  openMock.mockResolvedValueOnce(handle)
  return handle
}

describe("connectStreamDeck", () => {
  it("returns a device with keyCount from CONTROLS filtered by type=button", async () => {
    listMock.mockResolvedValueOnce([infoWith({})])
    handleFor(infoWith({}))
    const dev = await connectStreamDeck()
    expect(dev.getKeyCount()).toBe(15)
    expect(dev.serial).toBe("ABC123")
  })

  it("returns friendly model name from getStreamDeckModelName", async () => {
    listMock.mockResolvedValueOnce([infoWith({ model: "original-mk2" })])
    handleFor(infoWith({ model: "original-mk2" }))
    const dev = await connectStreamDeck()
    expect(dev.model).toBe("Friendly:original-mk2")
    expect(friendlyMock).toHaveBeenCalledWith("original-mk2")
  })

  it("throws StreamDeckSelectionError when no devices found", async () => {
    listMock.mockResolvedValueOnce([])
    await expect(connectStreamDeck()).rejects.toBeInstanceOf(
      StreamDeckSelectionError,
    )
  })

  it("throws when multiple devices found and no selector given", async () => {
    listMock.mockResolvedValueOnce([
      infoWith({ serial: "A", path: "/dev/hidraw0" }),
      infoWith({ serial: "B", path: "/dev/hidraw1" }),
    ])
    await expect(connectStreamDeck()).rejects.toBeInstanceOf(
      StreamDeckSelectionError,
    )
  })

  it("selects by serial when multiple devices", async () => {
    listMock.mockResolvedValueOnce([
      infoWith({ serial: "A", path: "/dev/hidraw0" }),
      infoWith({ serial: "B", path: "/dev/hidraw1" }),
    ])
    handleFor(infoWith({ serial: "B", path: "/dev/hidraw1" }))
    const dev = await connectStreamDeck({ serial: "B" })
    expect(dev.serial).toBe("B")
    expect(dev.path).toBe("/dev/hidraw1")
  })

  it("selects by path when multiple devices", async () => {
    listMock.mockResolvedValueOnce([
      infoWith({ serial: "A", path: "/dev/hidraw0" }),
      infoWith({ serial: "B", path: "/dev/hidraw1" }),
    ])
    handleFor(infoWith({ serial: "B", path: "/dev/hidraw1" }))
    const dev = await connectStreamDeck({ path: "/dev/hidraw1" })
    expect(dev.serial).toBe("B")
  })

  it("selects by model when multiple devices", async () => {
    listMock.mockResolvedValueOnce([
      infoWith({ serial: "A", model: "original-mk2" }),
      infoWith({ serial: "B", model: "xl" }),
    ])
    handleFor(infoWith({ serial: "B", model: "xl" }))
    const dev = await connectStreamDeck({ model: "xl" })
    expect(dev.serial).toBe("B")
  })

  it("throws when selector matches no devices", async () => {
    listMock.mockResolvedValueOnce([infoWith({ serial: "A" })])
    await expect(connectStreamDeck({ serial: "Z" })).rejects.toBeInstanceOf(
      StreamDeckSelectionError,
    )
  })

  it("openStreamDeck is called with the selected info's path", async () => {
    listMock.mockResolvedValueOnce([
      infoWith({ serial: "A", path: "/dev/hidraw7" }),
    ])
    handleFor(infoWith({ serial: "A", path: "/dev/hidraw7" }))
    await connectStreamDeck()
    expect(openMock).toHaveBeenCalledWith("/dev/hidraw7", {})
  })

  it("setBrightness forwards to handle", async () => {
    listMock.mockResolvedValueOnce([infoWith({})])
    const handle = handleFor(infoWith({}))
    const dev = await connectStreamDeck()
    await dev.setBrightness(75)
    expect(handle.setBrightness).toHaveBeenCalledWith(75)
  })

  it("fillKeyBuffer forwards to handle", async () => {
    listMock.mockResolvedValueOnce([infoWith({})])
    const handle = handleFor(infoWith({}))
    const dev = await connectStreamDeck()
    const buf = Buffer.from([1, 2, 3])
    await dev.fillKeyBuffer(3, buf)
    expect(handle.fillKeyBuffer).toHaveBeenCalledWith(3, buf)
  })

  it("close() calls the underlying handle's close()", async () => {
    listMock.mockResolvedValueOnce([infoWith({})])
    const handle = handleFor(infoWith({}))
    const dev = await connectStreamDeck()
    await dev.close()
    expect(handle.close).toHaveBeenCalled()
  })
})
