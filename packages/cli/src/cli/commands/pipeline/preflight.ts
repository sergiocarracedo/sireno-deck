import { selectOutputClient } from "@/outputClient"
import { resolveXdgConfigHome } from "./helpers"
import { validateAndLoadConfig, type RunOptions } from "../run"

export const preflight = async (options: RunOptions): Promise<void> => {
  const { logger } = options
  await validateAndLoadConfig(options)
  let outputClient = selectOutputClient({
    emulator: options.emulator === true,
    xdgConfigHome: resolveXdgConfigHome(options),
  })
  if (outputClient.kind === "real") {
    const devices = await outputClient.listDevices()
    if (devices.length === 0) {
      if (!process.stdin.isTTY) {
        // ponytail: daemon context (stdio is piped) — an interactive prompt
        // is impossible, so fall back to the emulator automatically and say
        // so loudly. The udev hint stays because a misconfigured device also
        // enumerates as "no devices".
        logger.warn(
          "No Stream Deck hardware detected (udev rules for vendor 0fd9 may be required — see packages/cli/src/device/linux-udev.ts). Starting in --emulator mode.",
        )
        ;(options as { emulator?: boolean }).emulator = true
        outputClient = selectOutputClient({
          emulator: true,
          xdgConfigHome: resolveXdgConfigHome(options),
        })
      } else {
        const { confirm } = await import("@/cli/prompt")
        const fallback = await confirm({
          message: "No Stream Deck found. Start in --emulator mode instead?",
          initialValue: true,
        })
        if (fallback) {
          logger.info(
            "no Stream Deck detected; falling back to --emulator mode",
          )
          ;(options as { emulator?: boolean }).emulator = true
          outputClient = selectOutputClient({
            emulator: true,
            xdgConfigHome: resolveXdgConfigHome(options),
          })
        } else {
          throw new Error(
            "No Stream Deck devices found. Connect a device and try again. On Linux, udev rules for vendor 0fd9 may be required — see packages/cli/src/device/linux-udev.ts for the rule file template.",
          )
        }
      }
    }
  }
  await outputClient.validateReady()
}
