#!/usr/bin/env node
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// eslint-disable-next-line import/extensions
import { reapOrphanProcessGroup, setWrapperTitle } from "./_wrapper-shared.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliRoot = resolve(__dirname, "..")
const cliEntry = resolve(__dirname, "../src/cli/main.ts")

const tsxBin = resolve(cliRoot, "node_modules", ".bin", "tsx")

setWrapperTitle("sirenodeck:bin")

const child = spawn(tsxBin, [cliEntry, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    SIRENO_CWD: process.cwd(),
    SIRENO_WRAPPER_CHILD: "1",
    TSX_TSCONFIG_PATH: resolve(cliRoot, "tsconfig.json"),
  },
})

child.on("exit", (code) => {
  // Same orphan-group reap as bin/dev.js — see the comment there.
  if (child.pid !== undefined) {
    reapOrphanProcessGroup(child.pid)
  }
  process.exit(code ?? 0)
})