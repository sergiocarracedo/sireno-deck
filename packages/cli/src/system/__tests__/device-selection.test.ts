import { describe, expect, it, vi } from "vitest";

vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(),
}));

const { select } = await import("@inquirer/prompts");
const selectMock = select as unknown as ReturnType<typeof vi.fn>;

const { selectDevice, NoStreamDeckFoundError } = await import("../device-selection.ts");
const { createLogger } = await import("@/util/logger.ts");

const silentLogger = () => createLogger({ level: "silent" });

const devices = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    serial: `SN${i}`,
    path: `/dev/hidraw${i}`,
    model: "Stream Deck MK.2",
    keyCount: 15,
  }));

describe("selectDevice", () => {
  it("throws NoStreamDeckFoundError when devices is empty", async () => {
    await expect(selectDevice({ devices: [], logger: silentLogger() })).rejects.toBeInstanceOf(
      NoStreamDeckFoundError,
    );
  });

  it("returns the only device when length is 1", async () => {
    const result = await selectDevice({ devices: devices(1), logger: silentLogger() });
    expect(result.descriptor.serial).toBe("SN0");
    expect(result.savedButStale).toBe(false);
  });

  it("returns current device if it matches one in the list (no prompt)", async () => {
    const result = await selectDevice({
      devices: devices(3),
      current: { serial: "SN1", path: "/dev/hidraw1", model: "MK.2" },
      logger: silentLogger(),
    });
    expect(result.descriptor.serial).toBe("SN1");
    expect(result.savedButStale).toBe(false);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("prompts and returns selected when multiple devices and no current", async () => {
    selectMock.mockResolvedValueOnce("SN2");
    const result = await selectDevice({ devices: devices(3), logger: silentLogger() });
    expect(result.descriptor.serial).toBe("SN2");
    expect(result.savedButStale).toBe(false);
  });

  it("when current is stale, prompts with current devices only and savedButStale=true", async () => {
    selectMock.mockResolvedValueOnce("SN2");
    const result = await selectDevice({
      devices: devices(3),
      current: { serial: "OLD", path: "/p", model: "OLD" },
      logger: silentLogger(),
    });
    expect(result.savedButStale).toBe(true);
    expect(result.descriptor.serial).toBe("SN2");
    expect(selectMock).toHaveBeenCalled();
    const call = selectMock.mock.calls[0]![0] as {
      choices: Array<{ name: string; value: string }>;
    };
    expect(call.choices).toHaveLength(3);
    expect(call.choices.map((c) => c.value).sort()).toEqual(["SN0", "SN1", "SN2"]);
  });

  it("prompt choices include model + serial + path", async () => {
    selectMock.mockResolvedValueOnce("SN0");
    await selectDevice({ devices: devices(2), logger: silentLogger() });
    const call = selectMock.mock.calls[0]![0] as { choices: Array<{ name: string }> };
    expect(call.choices[0]!.name).toContain("Stream Deck MK.2");
    expect(call.choices[0]!.name).toContain("SN0");
    expect(call.choices[0]!.name).toContain("/dev/hidraw0");
  });
});
