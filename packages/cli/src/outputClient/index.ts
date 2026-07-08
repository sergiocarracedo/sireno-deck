import { EmulatorOutputClient } from "./emulator"
import { RealOutputClient } from "./real"
import type { OutputClient } from "./types"

export interface SelectOutputClientOptions {
  readonly emulator: boolean
  readonly xdgConfigHome: string
}

export const selectOutputClient = (
  options: SelectOutputClientOptions,
): OutputClient => {
  if (options.emulator) {
    return new EmulatorOutputClient()
  }
  return new RealOutputClient({ xdgConfigHome: options.xdgConfigHome })
}

export type {
  InitOptions,
  OutputClient,
  OutputHandle,
  OutputKind,
} from "./types"
export { EmulatorOutputClient } from "./emulator"
export { RealOutputClient } from "./real"