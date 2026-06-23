import { describe, expect, it, vi } from "vitest";

import { listDevices } from "./registry.ts";

vi.mock("@elgato-stream-deck/node", () => ({
  listStreamDecks: vi.fn(),
}));

const sdk = await import("@elgato-stream-deck/node");
const listMock = sdk.listStreamDecks as unknown as ReturnType<typeof vi.fn>;

describe("listDevices", () => {
  it("returns descriptors from listStreamDecks", async () => {
    listMock.mockResolvedValueOnce([
      { serialNumber: "Z9", path: "/dev/hidraw9", model: "xl" },
      { serialNumber: "A1", path: "/dev/hidraw0", model: "original-mk2" },
    ]);
    const result = await listDevices();
    expect(result).toHaveLength(2);
    expect(result[0]!.serial).toBe("A1");
    expect(result[0]!.path).toBe("/dev/hidraw0");
    expect(result[0]!.model).toBe("original-mk2");
    expect(result[1]!.serial).toBe("Z9");
    expect(result[1]!.path).toBe("/dev/hidraw9");
    expect(result[1]!.model).toBe("xl");
  });

  it("sorts by serial ascending", async () => {
    listMock.mockResolvedValueOnce([
      { serialNumber: "M", path: "/p", model: "original" },
      { serialNumber: "A", path: "/p", model: "original" },
      { serialNumber: "Z", path: "/p", model: "original" },
    ]);
    const result = await listDevices();
    expect(result.map((d) => d.serial)).toEqual(["A", "M", "Z"]);
  });

  it("uses model enum value as descriptor.model", async () => {
    listMock.mockResolvedValueOnce([{ serialNumber: "S1", path: "/p", model: "plus" }]);
    const result = await listDevices();
    expect(result[0]!.model).toBe("plus");
  });

  it("returns [] when SDK throws", async () => {
    listMock.mockRejectedValueOnce(new Error("no devices"));
    const result = await listDevices();
    expect(result).toEqual([]);
  });

  it("handles missing serialNumber (empty string)", async () => {
    listMock.mockResolvedValueOnce([{ path: "/p", model: "mini" }]);
    const result = await listDevices();
    expect(result[0]!.serial).toBe("");
    expect(result[0]!.path).toBe("/p");
  });
});
