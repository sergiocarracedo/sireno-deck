import { EmulatorOutputClient } from "./emulator"
import { RealOutputClient } from "./real"
import { RemoteMirrorOutputClient } from "./remote-mirror"
import type { OutputClient } from "./types"

export interface SelectOutputClientOptions {
  readonly emulator: boolean
  readonly remote?: boolean
  readonly xdgConfigHome: string
}

export const selectOutputClient = (
  options: SelectOutputClientOptions,
): OutputClient => {
  if (options.emulator) {
    return new EmulatorOutputClient()
  }
  if (options.remote) {
    return new RemoteMirrorOutputClient({
      xdgConfigHome: options.xdgConfigHome,
    })
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
export { RemoteMirrorOutputClient } from "./remote-mirror"
export { RealOutputClient } from "./real"
