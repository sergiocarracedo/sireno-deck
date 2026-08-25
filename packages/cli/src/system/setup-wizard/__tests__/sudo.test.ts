import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { runWithSudo } from "../sudo"

const tmpRoot = mkdtempSync(join(tmpdir(), "sudo-test-"))
const fakeBinDir = join(tmpRoot, "bin")
const fakeSudo = join(fakeBinDir, "sudo")

mkdirSync(fakeBinDir, { recursive: true })

const writeFakeSudo = (script: string): void => {
  writeFileSync(fakeSudo, script, { mode: 0o755 })
}

const makePath = (extra: string): string => `${fakeBinDir}:${extra}`

beforeEach(() => {
  process.env["PATH"] = makePath(process.env["PATH"] ?? "")
})

afterEach(() => {
  process.env["PATH"] = process.env["PATH"]?.replace(`${fakeBinDir}:`, "") ?? ""
})

describe("runWithSudo", () => {
  it("returns succeeded:true when the fake sudo reads stdin and exits 0", async () => {
    writeFakeSudo(
      `#!/bin/sh
      read -r password
      if [ "$password" != "secret" ]; then
        echo "[sudo: authenticate] Password:" 1>&2
        exit 1
      fi
      echo "ok"
      exit 0
      `,
    )

    const result = await runWithSudo({
      command: "true",
      args: [],
      stdinInput: "secret\n",
      timeoutMs: 5_000,
    })

    expect(result.succeeded).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe("ok\n")
    expect(result.neededPassword).toBe(false)
  })

  it("flags neededPassword:true when sudo exits with the PAM prompt in stderr", async () => {
    writeFakeSudo(
      `#!/bin/sh
      echo "[sudo: authenticate] Password:" 1>&2
      exit 1
      `,
    )

    const result = await runWithSudo({
      command: "true",
      args: [],
      stdinInput: "secret\n",
      timeoutMs: 5_000,
    })

    expect(result.succeeded).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.neededPassword).toBe(true)
    expect(result.stderr).toContain("[sudo: authenticate] Password:")
  })

  it("flags neededPassword:true on 'Sorry, try again' (existing path)", async () => {
    writeFakeSudo(
      `#!/bin/sh
      echo "[sudo] password for x:" 1>&2
      echo "Sorry, try again." 1>&2
      exit 1
      `,
    )

    const result = await runWithSudo({
      command: "true",
      args: [],
      stdinInput: "wrong\n",
      timeoutMs: 5_000,
    })

    expect(result.succeeded).toBe(false)
    expect(result.neededPassword).toBe(true)
  })

  it("returns succeeded:true when no stdinInput is provided and child exits 0", async () => {
    writeFakeSudo(
      `#!/bin/sh
      echo "no input needed"
      exit 0
      `,
    )

    const result = await runWithSudo({
      command: "true",
      args: [],
      timeoutMs: 5_000,
    })

    expect(result.succeeded).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe("no input needed\n")
  })

  it("captures stderr fully (not just the last line) for the wizard log", async () => {
    writeFakeSudo(
      `#!/bin/sh
      echo "[sudo] password for x:" 1>&2
      echo "[sudo: authenticate] Password:" 1>&2
      exit 1
      `,
    )

    const result = await runWithSudo({
      command: "true",
      args: [],
      stdinInput: "wrong\n",
      timeoutMs: 5_000,
    })

    expect(result.stderr).toContain("password for x")
    expect(result.stderr).toContain("[sudo: authenticate] Password:")
  })

  it("kills the child on timeout and reports exitCode 124", async () => {
    writeFakeSudo(
      `#!/bin/sh
      sleep 30
      exit 0
      `,
    )

    const result = await runWithSudo({
      command: "true",
      args: [],
      stdinInput: "secret\n",
      timeoutMs: 500,
    })

    expect(result.succeeded).toBe(false)
    expect(result.exitCode).toBe(124)
    expect(result.stderr).toContain("timed out")
  })

  it("returns succeeded:false when the wrapped command exits non-zero", async () => {
    writeFakeSudo(
      `#!/bin/sh
      read -r password
      echo "command failed" 1>&2
      exit 7
      `,
    )

    const result = await runWithSudo({
      command: "false",
      args: [],
      stdinInput: "secret\n",
      timeoutMs: 5_000,
    })

    expect(result.succeeded).toBe(false)
    expect(result.exitCode).toBe(7)
    expect(result.neededPassword).toBe(false)
    expect(result.stderr).toBe("command failed\n")
  })
})
