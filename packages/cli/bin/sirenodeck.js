#!/usr/bin/env node
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// eslint-disable-next-line import/extensions
import { reapOrphanProcessGroup, setWrapperTitle } from "./_wrapper-shared.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliRoot = resolve(__dirname, "..")
const cliEntry = resolve(cliRoot, "dist", "main.mjs")

setWrapperTitle("sirenodeck:bin")

if (!existsSync(cliEntry)) {
  // ponytail: the bundled CLI ships next to this wrapper. If it's missing,
  // the consumer likely installed from npm before `prepublishOnly` ran the
  // build, or the install was corrupted. Surface a clear error rather than
  // failing silently with `Cannot find module`.
  console.error(`sirenodeck: bundled CLI not found at ${cliEntry}`)
  console.error(
    "Reinstall the package or run `pnpm --filter @sirenodeck/cli build`.",
  )
  process.exit(1)
}

const child = spawn(process.execPath, [cliEntry, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    SIRENO_CWD: process.cwd(),
    SIRENO_WRAPPER_CHILD: "1",
  },
})

child.on("exit", (code) => {
  if (child.pid !== undefined) {
    reapOrphanProcessGroup(child.pid)
  }
  process.exit(code ?? 0)
})
