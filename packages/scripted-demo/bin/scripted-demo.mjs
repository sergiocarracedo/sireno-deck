#!/usr/bin/env node
import { resolve } from "node:path"
import { runScene } from "../src/run-scene.mjs"

const [, , command, scenePath, ...args] = process.argv
if (command !== "run" || !scenePath) {
  console.error(
    "Usage: scripted-demo run <scene.json> [--output-root <directory>]",
  )
  process.exitCode = 1
} else {
  const outputIndex = args.indexOf("--output-root")
  const outputRoot = outputIndex === -1 ? process.cwd() : args[outputIndex + 1]
  if (!outputRoot) throw new Error("--output-root requires a directory")
  await runScene({
    scenePath: resolve(scenePath),
    outputRoot: resolve(outputRoot),
  })
  console.log(`Rendered ${scenePath}`)
}
