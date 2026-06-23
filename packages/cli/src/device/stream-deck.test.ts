import { describe, expect, it, vi } from "vitest";

import { connectStreamDeck, StreamDeckSelectionError } from "./stream-deck.ts";

vi.mock("@elgato-stream-deck/node", () => {
  return {
    listOpenStreamDecks: vi.fn(),
    openStreamDeck: vi.fn(),
  };
});

const sdk = await import("@elgato-stream-deck/node");
const listMock = sdk.listOpenStreamDecks as unknown as ReturnType<typeof vi.fn>;
const openMock = sdk.openStreamDeck as unknown as ReturnType<typeof vi.fn>;

const deviceWith = (overrides: { serial?: string; path?: string; controls?: number }) => ({
  serialNumber: overrides.serial ?? "ABC123",
  path: overrides.path ?? "/dev/hidraw0",
  MODEL: "Stream Deck MK.2",
  CONTROLS: Array.from({ length: overrides.controls ?? 15 }, () => ({ type: "button" })),
});

const handleFor = (device: ReturnType<typeof deviceWith>) => {
  const handle = {
    serialNumber: device.serialNumber,
    path: device.path,
    MODEL: device.MODEL,
    CONTROLS: device.CONTROLS,
    setBrightness: vi.fn(),
    fillKeyBuffer: vi.fn(),
    close: vi.fn(),
  };
  openMock.mockResolvedValueOnce(handle);
  return handle;
};

describe("connectStreamDeck", () => {
  it("returns a device with keyCount from CONTROLS filtered by type=button", async () => {
    listMock.mockResolvedValueOnce([deviceWith({ controls: 15 })]);
    const handle = handleFor(deviceWith({ controls: 15 }));
    const dev = await connectStreamDeck();
    expect(dev.getKeyCount()).toBe(15);
    expect(dev.serial).toBe("ABC123");
    void handle;
  });

  it("throws StreamDeckSelectionError when no devices found", async () => {
    listMock.mockResolvedValueOnce([]);
    await expect(connectStreamDeck()).rejects.toBeInstanceOf(StreamDeckSelectionError);
  });

  it("throws when multiple devices found and no selector given", async () => {
    listMock.mockResolvedValueOnce([deviceWith({ serial: "A", path: "/dev/hidraw0" }), deviceWith({ serial: "B", path: "/dev/hidraw1" })]);
    await expect(connectStreamDeck()).rejects.toBeInstanceOf(StreamDeckSelectionError);
  });

  it("selects by serial when multiple devices", async () => {
    listMock.mockResolvedValueOnce([deviceWith({ serial: "A", path: "/dev/hidraw0" }), deviceWith({ serial: "B", path: "/dev/hidraw1" })]);
    handleFor(deviceWith({ serial: "B", path: "/dev/hidraw1" }));
    const dev = await connectStreamDeck({ serial: "B" });
    expect(dev.serial).toBe("B");
    expect(dev.path).toBe("/dev/hidraw1");
  });

  it("close() calls the underlying handle's close()", async () => {
    listMock.mockResolvedValueOnce([deviceWith({})]);
    const handle = handleFor(deviceWith({}));
    const dev = await connectStreamDeck();
    await dev.close();
    expect(handle.close).toHaveBeenCalled();
  });
});
