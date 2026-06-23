import { describe, expect, it, vi } from "vitest";

import { listDevices } from "./registry.ts";

vi.mock("@elgato-stream-deck/node", () => ({
  listOpenStreamDecks: vi.fn(),
}));

const sdk = await import("@elgato-stream-deck/node");
const listMock = sdk.listOpenStreamDecks as unknown as ReturnType<typeof vi.fn>;

describe("listDevices", () => {
  it("returns descriptors from listOpenStreamDecks", async () => {
    listMock.mockResolvedValueOnce([
      { serialNumber: "Z9", path: "/dev/hidraw9", MODEL: "Stream Deck XL", CONTROLS: Array.from({ length: 32 }, () => ({ type: "button" })) },
      { serialNumber: "A1", path: "/dev/hidraw0", MODEL: "Stream Deck MK.2", CONTROLS: Array.from({ length: 15 }, () => ({ type: "button" })) },
    ]);
    const result = await listDevices();
    expect(result).toHaveLength(2);
    expect(result[0]!.serial).toBe("A1");
    expect(result[0]!.keyCount).toBe(15);
    expect(result[1]!.serial).toBe("Z9");
    expect(result[1]!.keyCount).toBe(32);
  });

  it("sorts by serial ascending", async () => {
    listMock.mockResolvedValueOnce([
      { serialNumber: "M", path: "/p", MODEL: "X", CONTROLS: [{ type: "button" }] },
      { serialNumber: "A", path: "/p", MODEL: "X", CONTROLS: [{ type: "button" }] },
      { serialNumber: "Z", path: "/p", MODEL: "X", CONTROLS: [{ type: "button" }] },
    ]);
    const result = await listDevices();
    expect(result.map((d) => d.serial)).toEqual(["A", "M", "Z"]);
  });

  it("returns [] when SDK throws", async () => {
    listMock.mockRejectedValueOnce(new Error("no devices"));
    const result = await listDevices();
    expect(result).toEqual([]);
  });
});
