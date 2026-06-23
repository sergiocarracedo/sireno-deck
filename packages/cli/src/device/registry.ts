import { listStreamDecks, type StreamDeckDeviceInfo } from "@elgato-stream-deck/node";

export interface DeviceDescriptor {
  readonly serial: string;
  readonly path: string;
  readonly model: string;
}

const toDescriptor = (info: StreamDeckDeviceInfo): DeviceDescriptor => ({
  serial: info.serialNumber ?? "",
  path: info.path,
  model: info.model,
});

export const listDevices = async (): Promise<DeviceDescriptor[]> => {
  try {
    const infos = await listStreamDecks();
    return infos.map(toDescriptor).sort((a, b) => a.serial.localeCompare(b.serial));
  } catch {
    return [];
  }
};
