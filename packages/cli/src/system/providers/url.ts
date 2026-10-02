import type { CommandExecutor } from "./shared"

export interface UrlProvider {
  open(url: string): Promise<void>
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"])

export const validateOpenUrl = (value: string): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("url:// requires a valid absolute URL")
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error(
      `url:// does not allow the '${url.protocol}' protocol; use http, https, mailto, or tel`,
    )
  }
  if (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.hostname.length === 0
  ) {
    throw new Error("url:// HTTP(S) URLs must include a host")
  }
  if (
    (url.protocol === "mailto:" || url.protocol === "tel:") &&
    url.pathname.length === 0
  ) {
    throw new Error(
      `url:// ${url.protocol.slice(0, -1)} URLs must include a target`,
    )
  }
  return value
}

export const createUrlProvider = (
  platform: NodeJS.Platform,
  executor: CommandExecutor,
): UrlProvider => ({
  async open(value) {
    const url = validateOpenUrl(value)
    const [command, args] =
      platform === "darwin"
        ? ["open", [url]]
        : platform === "win32"
          ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]]
          : ["xdg-open", [url]]
    const result = await executor.run(command, args)
    if (result.exitCode !== 0) {
      throw new Error(
        `Unable to open URL (${command} exited ${result.exitCode}): ${result.stderr}`,
      )
    }
  },
})
