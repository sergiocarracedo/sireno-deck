#!/usr/bin/env node
// Claim the 5 `@sirenodeck/*` package names on npmjs.com.
//
// For each name:
//   1. Probe with `npm view`. If it returns metadata, the name is already
//      claimed — skip.
//   2. Otherwise, build a 0.0.0 placeholder in /tmp, `npm publish` it, and
//      wait for the registry to confirm.
//
// You must be signed in to npm with an account that owns the `@sirenodeck`
// org (`npm login` first). The placeholder is `private: true` in package.json
// but the publish uses `--access=public` because npm refuses scoped packages
// without it.

import { execSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const PACKAGES = [
  "@sirenodeck/addon-app-shortcuts",
  "@sirenodeck/addon-coding-agents",
  "@sirenodeck/addon-pomodoro",
  "@sirenodeck/theme-neon-grids",
  "@sirenodeck/theme-riptide",
]

const CLAIM_ROOT = join(tmpdir(), "sirenodeck-claim")

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], ...opts })
      .toString()
      .trim()
  } catch (err) {
    if (opts.allowFail) return ""
    throw err
  }
}

function probe(name) {
  const out = sh(`npm view ${name} name --json`, { allowFail: true })
  if (!out) return { available: true, reason: "npm view returned empty" }
  try {
    const parsed = JSON.parse(out)
    return { available: false, registered: parsed.name ?? name }
  } catch {
    return {
      available: true,
      reason: `npm view output unparseable: ${out.slice(0, 80)}`,
    }
  }
}

function buildPlaceholder(name) {
  const dir = join(CLAIM_ROOT, name.replace("/", "__"))
  mkdirSync(dir, { recursive: true })
  const pkg = {
    name,
    version: "0.0.0",
    description:
      "Reserved name for Sireno Deck. Real release happens via release-please.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/sergiocarracedo/sireno-deck.git",
    },
  }
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n")
  // ponytail: empty npm package — `npm publish` requires a tarball, but it
  // accepts a directory with only package.json. Adds a single sentinel file
  // so `files` whitelist (when present) doesn't accidentally exclude it.
  writeFileSync(
    join(dir, "README.md"),
    `# ${name}\n\nReserved. See https://github.com/sergiocarracedo/sireno-deck.\n`,
  )
  return dir
}

function publish(dir) {
  console.log(`  -> npm publish in ${dir}`)
  const res = spawnSync("npm", ["publish", "--access=public", "--tag=latest"], {
    cwd: dir,
    stdio: "inherit",
    env: process.env,
  })
  return res.status === 0
}

async function waitForRegistry(name, maxAttempts = 6) {
  const delayMs = 3000
  for (let i = 0; i < maxAttempts; i++) {
    const check = probe(name)
    if (!check.available) return true
    if (i < maxAttempts - 1) {
      console.log(
        `    waiting ${delayMs / 1000}s for registry... (${i + 1}/${maxAttempts})`,
      )
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return false
}

async function main() {
  console.log("Checking npm auth...")
  try {
    sh("npm whoami --registry=https://registry.npmjs.org")
  } catch {
    console.error("\nNot signed in to npm. Run `npm login` first.")
    process.exit(1)
  }
  const user = sh("npm whoami").trim()
  console.log(`Signed in as: ${user}\n`)

  if (!existsSync(CLAIM_ROOT)) mkdirSync(CLAIM_ROOT, { recursive: true })

  const results = []
  for (const name of PACKAGES) {
    console.log(`[${name}]`)
    const check = probe(name)
    if (!check.available) {
      console.log(`  -> already claimed as ${check.registered}, skipping\n`)
      results.push({ name, status: "already-claimed" })
      continue
    }
    console.log(`  -> available (${check.reason}), claiming`)
    const dir = buildPlaceholder(name)
    const ok = publish(dir)
    if (!ok) {
      console.error(`  -> publish failed for ${name}; see npm output above\n`)
      results.push({ name, status: "failed" })
      continue
    }
    console.log(`  -> published 0.0.0, verifying on registry...`)
    const confirmed = await waitForRegistry(name)
    if (!confirmed) {
      console.error(`  -> registry did not confirm ${name} within timeout`)
      console.error(
        `     check https://www.npmjs.com/package/${name} manually\n`,
      )
      results.push({ name, status: "unconfirmed" })
      continue
    }
    console.log(`  -> confirmed: https://www.npmjs.com/package/${name}\n`)
    results.push({ name, status: "claimed" })

    // pause so the user can confirm in the browser before the next claim
    console.log("  Open the package page in your browser to verify.")
    console.log("  Press Enter to claim the next name, Ctrl-C to abort.\n")
    try {
      process.stdin.once("data", () => {})
      await new Promise((resolve) => process.stdin.once("data", resolve))
    } catch {
      // stdin closed; user walked away. Continue.
    }
  }

  console.log("Summary:")
  for (const r of results) {
    console.log(`  ${r.status.padEnd(16)} ${r.name}`)
  }

  if (existsSync(CLAIM_ROOT)) {
    console.log(`\nCleaning up ${CLAIM_ROOT}...`)
    rmSync(CLAIM_ROOT, { recursive: true, force: true })
  }

  const failed = results.filter(
    (r) => r.status === "failed" || r.status === "unconfirmed",
  )
  if (failed.length > 0) {
    console.error("\nSome names need attention. Re-run the script to retry.")
    process.exit(1)
  }
  console.log("\nDone. Next: configure Trusted Publishers per RELEASING.md.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
