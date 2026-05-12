import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

export interface LinuxUdevDiagnosticOptions {
  platform?: NodeJS.Platform
  pathExists?: (path: string) => boolean
  resolvePackageAsset?: () => string | undefined
}

export const DEFAULT_UDEV_RULE_PATHS = [
  "/etc/udev/rules.d/50-elgato-stream-deck.rules",
  "/usr/lib/udev/rules.d/50-elgato-stream-deck.rules",
  "/lib/udev/rules.d/50-elgato-stream-deck.rules",
] as const

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined
  }

  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : undefined
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function resolveStreamDeckRulesAsset(): string | undefined {
  try {
    const require = createRequire(import.meta.url)
    const packageJsonPath = require.resolve("@elgato-stream-deck/node/package.json")
    const packageDir = dirname(packageJsonPath)
    const candidates = [
      join(packageDir, "udev", "50-elgato-stream-deck.rules"),
      join(packageDir, "udev", "50-elgato.rules"),
      join(packageDir, "udev-generator-rules.json"),
    ]

    return candidates.find((candidate) => existsSync(candidate))
  } catch {
    return undefined
  }
}

export function isLikelyLinuxUdevAccessError(
  error: unknown,
  options: LinuxUdevDiagnosticOptions = {},
): boolean {
  const platform = options.platform ?? process.platform
  if (platform !== "linux") {
    return false
  }

  const code = getErrorCode(error)
  if (code === "EACCES" || code === "EPERM") {
    return true
  }

  return /(access denied|permission denied|insufficient permissions|libusb_error_access|cannot open device)/i.test(
    getErrorMessage(error),
  )
}

export function getLinuxUdevRuleHints(
  options: LinuxUdevDiagnosticOptions = {},
): {
  packageAssetPath?: string
  suggestedRulePaths: readonly string[]
} {
  const pathExists = options.pathExists ?? existsSync
  const packageAssetPath = (options.resolvePackageAsset ?? resolveStreamDeckRulesAsset)()

  return {
    packageAssetPath,
    suggestedRulePaths: DEFAULT_UDEV_RULE_PATHS.filter((path) => !pathExists(path)),
  }
}

export function formatLinuxUdevAccessError(
  error: unknown,
  options: LinuxUdevDiagnosticOptions = {},
): string | null {
  if (!isLikelyLinuxUdevAccessError(error, options)) {
    return null
  }

  const hints = getLinuxUdevRuleHints(options)
  const lines = [
    `Linux device access failed: ${getErrorMessage(error)}`,
    "Grant udev access to Stream Deck devices, then reload the rules and reconnect the device.",
  ]

  if (hints.packageAssetPath) {
    lines.push(`Package reference: ${hints.packageAssetPath}`)
  }

  lines.push("Suggested rules file locations:")
  for (const path of hints.suggestedRulePaths) {
    lines.push(`- ${path}`)
  }

  lines.push("After updating rules, run: udevadm control --reload-rules && udevadm trigger")

  return lines.join("\n")
}
