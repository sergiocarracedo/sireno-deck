import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { isCancel, multiselect, password, text } from "@clack/prompts"
import type { CommandModule } from "yargs"
import { scopeCredentials } from "@/system/credentials/store"
import { createNativeCredentialBackend } from "@/system/credentials/native"
import { openBrowser } from "@/outputClient/open-browser"
import { createLogger } from "@/util/logger"

interface SetupModule {
  addonName: string
  setupAddon(ctx: {
    credentials: ReturnType<typeof scopeCredentials>
    openUrl(url: string): void
    text(message: string, secret?: boolean): Promise<string>
    selectMany(
      message: string,
      options: readonly { value: string; label: string }[],
    ): Promise<string[]>
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
          options: [...options],
          required: true,
        })
        if (isCancel(value)) throw new Error("Addon setup cancelled")
        return value
      },
      print: (message) => console.log(message),
    })
  },
}
