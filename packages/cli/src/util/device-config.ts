import {
  writeFileSync,
  renameSync,
  existsSync,
  readFileSync,
  unlinkSync,
  mkdirSync,
} from "node:fs"
import { dirname } from "node:path"

export interface DeviceConfig {
  readonly serial: string
  readonly path: string
  readonly model: string
}

export interface LoadDeviceConfigOptions {
  readonly xdgConfigHome: string
}

export interface SaveDeviceConfigOptions extends LoadDeviceConfigOptions {
  readonly config: DeviceConfig
}

const configPathFor = (xdgConfigHome: string): string =>
  `${xdgConfigHome}/sirenodeck/device.json`

export const loadDeviceConfig = (
  options: LoadDeviceConfigOptions,
): DeviceConfig | null => {
  const path = configPathFor(options.xdgConfigHome)
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, "utf8")
    const parsed = JSON.parse(raw) as Partial<DeviceConfig>
    if (
      typeof parsed.serial === "string" &&
      typeof parsed.path === "string" &&
      typeof parsed.model === "string"
    ) {
      return { serial: parsed.serial, path: parsed.path, model: parsed.model }
    }
    return null
  } catch {
    return null
  }
}

export const saveDeviceConfig = (options: SaveDeviceConfigOptions): void => {
  const path = configPathFor(options.xdgConfigHome)
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(options.config, null, 2), "utf8")
  renameSync(tmp, path)
  if (existsSync(tmp)) unlinkSync(tmp)
}
