import {
  listStreamDecks,
  type StreamDeckDeviceInfo,
} from "@elgato-stream-deck/node"
import { resolveKeyCount } from "@/device/models"

export type DeviceTransport = "real" | "emulated"

export interface DeviceDescriptor {
  readonly id: string
  readonly model: string
  readonly keyCount: number
  readonly label: string
  readonly transport: DeviceTransport
}

const toDescriptor = (info: StreamDeckDeviceInfo): DeviceDescriptor => {
  const model = info.model
  const id = info.serialNumber ?? info.path
  return {
    id,
    model,
    keyCount: resolveKeyCount(model),
    label: `${model.toUpperCase()} (${id})`,
    transport: "real",
  }
}

export const listDevices = async (): Promise<DeviceDescriptor[]> => {
  try {
    const infos = await listStreamDecks()
    return infos.map(toDescriptor).sort((a, b) => a.id.localeCompare(b.id))
  } catch (err) {
    // ponytail: log so real errors (missing model entry, HID I/O failure) aren't hidden as "no devices"
    console.warn({ err }, "device enumeration failed")
    return []
  }
}
