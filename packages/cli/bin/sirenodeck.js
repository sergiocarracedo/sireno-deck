#!/usr/bin/env node
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliRoot = resolve(__dirname, "..")
const cliEntry = resolve(__dirname, "../src/cli/main.ts")

const tsxBin = resolve(cliRoot, "node_modules", ".bin", "tsx")

const child = spawn(tsxBin, [cliEntry, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    SIRENO_CWD: process.cwd(),
    TSX_TSCONFIG_PATH: resolve(cliRoot, "tsconfig.json"),
  },
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
