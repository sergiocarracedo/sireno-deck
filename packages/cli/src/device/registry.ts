import { listOpenStreamDecks } from "@elgato-stream-deck/node";

export interface DeviceDescriptor {
  readonly serial: string;
  readonly path: string;
  readonly model: string;
  readonly keyCount: number;
}

interface SdkDevice {
  readonly serialNumber?: string;
  readonly path?: string;
  readonly MODEL?: string;
  readonly CONTROLS?: ReadonlyArray<{ readonly type: string }>;
}

const toDescriptor = (device: SdkDevice): DeviceDescriptor => ({
  serial: device.serialNumber ?? "",
  path: device.path ?? "",
  model: device.MODEL ?? "unknown",
  keyCount: (device.CONTROLS ?? []).filter((c) => c.type === "button").length,
});

export const listDevices = async (): Promise<DeviceDescriptor[]> => {
  try {
    const raw = (await listOpenStreamDecks()) as ReadonlyArray<SdkDevice>;
    return raw.map(toDescriptor).sort((a, b) => a.serial.localeCompare(b.serial));
  } catch {
    return [];
  }
};
