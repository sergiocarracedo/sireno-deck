import { resolve } from "node:path"
import { styleText } from "node:util"
import { pathToFileURL } from "node:url"
import { confirm, isCancel, multiselect, password, text } from "@clack/prompts"
import type { CommandModule } from "yargs"
import { scopeCredentials } from "@/system/credentials/store"
import { createNativeCredentialBackend } from "@/system/credentials/native"
import { openBrowser } from "@/outputClient/open-browser"
import { createLogger } from "@/util/logger"
import { isRunning, readConfigPath, readPid } from "@/util/daemon"
import { resolveUserPath } from "@/cli/cwd"
import { saveAddonProvider } from "./addon-setup-config"

interface SetupModule {
  addonName: string
  setupAddon(ctx: {
    credentials: ReturnType<typeof scopeCredentials>
    openUrl(url: string): void
    text(message: string, secret?: boolean): Promise<string>
    selectMany(
      message: string,
      options: readonly {
        value: string
        label: string
        hint?: string
        color?: string
      }[],
    ): Promise<string[]>
    confirm(message: string): Promise<boolean>
    saveProvider(provider: {
      id: string
      type: string
      clientId: string
      calendarIds: string[]
      calendarColors?: Record<string, string>
    }): Promise<string | null>
    print(message: string): void
  }): Promise<void>
}

export const addonSetupCommand: CommandModule<object, { module: string }> = {
  command: "addon-setup <module>",
  describe: "Run an installed addon's interactive setup module",
  builder: (yargs) =>
    yargs.positional("module", {
      type: "string",
      demandOption: true,
      description: "Path to the addon's setup module",
    }),
  handler: async ({ module }) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY)
      throw new Error("Addon setup requires an interactive terminal")
    const setup = (await import(
      pathToFileURL(resolve(module)).href
    )) as SetupModule
    if (
      !/^[a-z0-9][a-z0-9-]*$/.test(setup.addonName) ||
      typeof setup.setupAddon !== "function"
    )
      throw new Error("Invalid addon setup module")
    const logger = createLogger({})
    const pid = readPid()
    let configPath = pid !== null && isRunning(pid) ? readConfigPath() : null
    await setup.setupAddon({
      credentials: scopeCredentials(
        createNativeCredentialBackend(),
        setup.addonName,
      ),
      openUrl: (url) => {
        console.log(`Open this URL if your browser does not start:\n${url}`)
        openBrowser(url, logger)
      },
      text: async (message, secret) => {
        const value = secret
          ? await password({ message })
          : await text({ message })
        if (isCancel(value)) throw new Error("Addon setup cancelled")
        return value
      },
      selectMany: async (message, options) => {
        const value = await multiselect({
          message,
          options: options.map(({ color, ...option }) => {
            const useColor =
              process.stdout.isTTY &&
              process.env["NO_COLOR"] === undefined &&
              process.env["TERM"] !== "dumb"
            const hex = /^#[0-9a-f]{6}$/i.test(color ?? "")
              ? color!.slice(1)
              : undefined
            const rgb =
              hex === undefined
                ? undefined
                : [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
            const marker =
              rgb && useColor ? `\x1b[38;2;${rgb.join(";")}m■\x1b[0m` : "■"
            return {
              ...option,
              label: `${marker} ${useColor ? styleText("white", option.label) : option.label}`,
            }
          }),
          required: true,
        })
        if (isCancel(value)) throw new Error("Addon setup cancelled")
        return value
      },
      confirm: async (message) => {
        const value = await confirm({ message, initialValue: false })
        if (isCancel(value)) throw new Error("Addon setup cancelled")
        return value
      },
      saveProvider: async (provider) => {
        if (!configPath) {
          const value = await text({
            message: "Config file path (leave blank for manual instructions)",
          })
          if (isCancel(value)) throw new Error("Addon setup cancelled")
          if (!value.trim()) return null
          configPath = resolveUserPath(value.trim())
        }
        try {
          await saveAddonProvider(configPath, setup.addonName, provider)
          return configPath
        } catch (error) {
          console.error(
            `Could not update config: ${error instanceof Error ? error.message : String(error)}`,
          )
          return null
        }
      },
      print: (message) => console.log(message),
    })
  },
}
