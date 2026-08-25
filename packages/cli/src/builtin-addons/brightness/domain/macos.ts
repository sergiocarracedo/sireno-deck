import type { ConfigSchema as BrightnessButtonConfig } from "../buttons/brightness/config"

const escape = (s: string): string => `'${s.replaceAll("'", "'\\''")}'`

export const isMacOS = (platform: NodeJS.Platform): boolean =>
  platform === "darwin"

export const setBrightnessMacOS = async (
  config: BrightnessButtonConfig,
  exec: (
    cmd: string,
    args: string[],
  ) => Promise<{ exitCode: number; stderr: string }>,
): Promise<void> => {
  if (config.action === "set" && config.value !== undefined) {
    const script = `tell application "System Events" to set brightness of (first item of (get displays)) to ${config.value / 100}`
    await exec("osascript", ["-e", script])
    return
  }
  if (config.action === "down") {
    await exec("osascript", [
      "-e",
      `tell application "System Events" to key code 145`,
    ])
    return
  }
  await exec("osascript", [
    "-e",
    `tell application "System Events" to key code 144`,
  ])
}

export const buildMacOSCommand = (
  config: BrightnessButtonConfig,
): readonly string[] => {
  if (config.action === "set" && config.value !== undefined) {
    return ["osascript", "-e", `set brightness to ${config.value / 100}`]
  }
  if (config.action === "down") {
    return ["osascript", "-e", `key code 145`]
  }
  return ["osascript", "-e", `key code 144`]
}

export const formatCommand = (cmd: readonly string[]): string =>
  cmd.map(escape).join(" ")
