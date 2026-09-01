import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

export type PackageManager = "pnpm" | "npm" | "yarn"

const managers: PackageManager[] = ["pnpm", "npm", "yarn"]

const hasCommand = (command: string): boolean => {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

export const detectPackageManager = (projectDir: string): PackageManager => {
  const lockfile = managers.find((manager) =>
    existsSync(
      join(
        projectDir,
        manager === "pnpm"
          ? "pnpm-lock.yaml"
          : manager === "npm"
            ? "package-lock.json"
            : "yarn.lock",
      ),
    ),
  )
  if (lockfile !== undefined && hasCommand(lockfile)) return lockfile
  const available = managers.find(hasCommand)
  if (available === undefined)
    throw new Error(
      "Install pnpm, npm, or yarn before installing an addon or theme.",
    )
  return available
}

export const assertPackageManager = (manager: PackageManager): void => {
  if (!hasCommand(manager))
    throw new Error(`Package manager '${manager}' is not installed.`)
}

export const packageManagerArgs = (
  manager: PackageManager,
  specifier: string,
  global: boolean,
): string[] => {
  if (global) {
    return manager === "pnpm"
      ? ["add", "--global", specifier]
      : manager === "npm"
        ? ["install", "--global", specifier]
        : ["global", "add", specifier]
  }
  return manager === "pnpm"
    ? ["add", "--save-exact", specifier]
    : manager === "npm"
      ? ["install", "--save-exact", specifier]
      : ["add", "--exact", specifier]
}

export const globalPackageRoot = (manager: PackageManager): string | null => {
  try {
    const args = manager === "npm" ? ["root", "--global"] : ["root", "--global"]
    return execFileSync(manager, args, { encoding: "utf8" }).trim()
  } catch {
    return null
  }
}
