import { selectOutputClient } from "@/outputClient"
import { resolveXdgConfigHome } from "./helpers"
import { validateAndLoadConfig, type RunOptions } from "../run"

export const preflight = async (options: RunOptions): Promise<void> => {
  await validateAndLoadConfig(options)
  const outputClient = selectOutputClient({
    emulator: options.emulator === true,
    xdgConfigHome: resolveXdgConfigHome(options),
  })
  if (outputClient.kind === "real") {
    const devices = await outputClient.listDevices()
    if (devices.length === 0) {
      throw new Error(
        "No Stream Deck devices found. Connect a device and try again. On Linux, udev rules for vendor 0fd9 may be required — see packages/cli/src/device/linux-udev.ts for the rule file template.",
      )
    }
  }
  await outputClient.validateReady()
}
