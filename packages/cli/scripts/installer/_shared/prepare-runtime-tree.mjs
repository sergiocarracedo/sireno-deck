#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const sharedDir = dirname(fileURLToPath(import.meta.url))
const cliPkgDir = resolve(sharedDir, "../../..")
const repoRoot = resolve(cliPkgDir, "..")
const { version } = JSON.parse(
  readFileSync(join(cliPkgDir, "package.json"), "utf8"),
)

const platform = process.platform
const arch = process.arch
const stagingRoot = join(
  cliPkgDir,
  "dist",
  "staging",
  `sireno-${platform}-${arch}`,
)
const tree = join(stagingRoot, "sireno")

rmSync(stagingRoot, { recursive: true, force: true })
mkdirSync(stagingRoot, { recursive: true })

const run = (cmd, args, opts = {}) => {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: repoRoot,
    ...opts,
  })
  if (res.status !== 0) process.exit(res.status ?? 1)
}

run("pnpm", ["--filter", "sirenodeck", "deploy", "--legacy", tree])

cpSync(join(cliPkgDir, "dist", "cli"), join(tree, "lib", "cli"), {
  recursive: true,
})
cpSync(join(cliPkgDir, "frontend", "dist"), join(tree, "frontend", "dist"), {
  recursive: true,
})
cpSync(join(cliPkgDir, "emulator", "dist"), join(tree, "emulator", "dist"), {
  recursive: true,
})

mkdirSync(join(tree, "etc"), { recursive: true })
writeFileSync(
  join(tree, "etc", "install.json"),
  JSON.stringify({ version, platform, arch }, null, 2),
)

const launcher = join(tree, "sirenodeck")
writeFileSync(
  launcher,
  `#!/bin/sh
# sirenodeck launcher — prefers the bundled Node runtime, falls back to PATH
# (brew/deb/rpm installs ship node via the package manager).
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -x "$root/node/bin/node" ]; then
  node="$root/node/bin/node"
else
  node=node
fi
SIRENO_INSTALL_ROOT="$root" exec "$node" "$root/lib/cli/main.mjs" "$@"
`,
)
chmodSync(launcher, 0o755)

writeFileSync(
  join(tree, "sirenodeck.cmd"),
  `@echo off
setlocal
set "ROOT=%~dp0"
if exist "%ROOT%node\\node.exe" (
  set "NODE=%ROOT%node\\node.exe"
) else (
  set "NODE=node"
)
set "SIRENO_INSTALL_ROOT=%ROOT%"
"%NODE%" "%ROOT%lib\\cli\\main.mjs" %*
exit /b %ERRORLEVEL%
`,
)

console.log(`staged runtime tree at ${tree}`)
