import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve as resolvePath } from "node:path"

import { execa } from "execa"
import { parse, stringify } from "yaml"

import { resolveConfigPath, type ConfigSource } from "./pipeline/helpers"
import { loadConfig } from "@/config/loader"
import {
  assertPackageManager,
  detectPackageManager,
  globalPackageRoot,
  packageManagerArgs,
  type PackageManager,
} from "../package-manager"

export interface InstallOptions {
  readonly packageName: string
  readonly config?: string
  readonly global?: boolean
  readonly packageManager?: PackageManager
  readonly homeDir?: string
  readonly xdgConfigHome?: string
  readonly configure?: boolean
}

const configPathFor = (
  options: InstallOptions,
): { path: string; source: ConfigSource } =>
  resolveConfigPath({
    config: options.config,
    homeDir: options.homeDir,
    xdgConfigHome: options.xdgConfigHome,
    logger: console as never,
  })

export const installPackage = async (
  options: InstallOptions,
): Promise<void> => {
  const resolved = configPathFor(options)
  const configPath = resolvePath(resolved.path)
  const configDir = dirname(configPath)
  loadConfig({ configPath })
  const manager = options.packageManager ?? detectPackageManager(configDir)
  assertPackageManager(manager)
  await execa(
    manager,
    packageManagerArgs(manager, options.packageName, options.global === true),
    {
      cwd: options.global === true ? undefined : configDir,
      stdio: "inherit",
    },
  )

  const packageRoot = options.global === true ? undefined : configDir
  const manifestPath = await resolveManifest(
    options.packageName,
    packageRoot,
    options.global === true
      ? (globalPackageRoot(manager) ?? undefined)
      : undefined,
  )
  if (manifestPath === null)
    throw new Error(
      `Installed package '${options.packageName}' has no valid sirenodeck.json manifest.`,
    )
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    kind?: string
  }
  const raw = parse(readFileSync(configPath, "utf8")) as Record<string, unknown>
  if (options.configure === false) return
  if (manifest.kind === "theme") {
    raw.theme =
      options.global === true
        ? { src: options.packageName, global: true }
        : options.packageName
  } else if (manifest.kind === "addon") {
    const addons = Array.isArray(raw.addons) ? raw.addons : []
    if (
      !addons.some((entry) =>
        typeof entry === "string"
          ? entry === options.packageName
          : entry !== null &&
            typeof entry === "object" &&
            (entry as { src?: string }).src === options.packageName,
      )
    ) {
      addons.push(
        options.global === true
          ? { src: options.packageName, global: true }
          : options.packageName,
      )
    }
    raw.addons = addons
  } else {
    throw new Error(
      `Package '${options.packageName}' is neither an addon nor a theme.`,
    )
  }
  writeFileSync(configPath, stringify(raw), "utf8")
}

const resolveManifest = async (
  name: string,
  projectDir?: string,
  globalRoot?: string,
): Promise<string | null> => {
  const packageName = name.startsWith("@")
    ? name.slice(
        0,
        name.indexOf("@", 1) > 0 ? name.indexOf("@", 1) : name.length,
      )
    : name.split("@")[0]!
  if (globalRoot !== undefined) {
    const path = join(globalRoot, packageName, "sirenodeck.json")
    return existsSync(path) ? path : null
  }
  const { createRequire } = await import("node:module")
  const require = createRequire(
    resolvePath(projectDir ?? process.cwd(), "package.json"),
  )
  try {
    const packageJson = require.resolve(`${packageName}/package.json`)
    return resolvePath(dirname(packageJson), "sirenodeck.json")
  } catch {
    return null
  }
}
