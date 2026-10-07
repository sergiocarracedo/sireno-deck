import { EventEmitter } from "node:events"
import { PassThrough } from "node:stream"

import { describe, expect, it, vi } from "vitest"

import { createCommandExecutor } from "../command-executor"

const fakeChild = () => {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough
    stderr: PassThrough
    kill: ReturnType<typeof vi.fn>
  }
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.kill = vi.fn()
  return child
}

describe("createCommandExecutor", () => {
  it("waits for close when a timeout is set so captured output is drained", async () => {
    const child = fakeChild()
    const executor = createCommandExecutor((() => child) as never)

    const resultPromise = executor.run(
      "systemctl",
      ["--user", "show-environment"],
      { timeoutMs: 3_000 },
    )
    child.emit("exit", 0)
    child.stdout.write("XDG_CURRENT_DESKTOP=ubuntu:GNOME\n")
    child.stdout.end()
    child.stderr.end()
    child.emit("close", 0)

    await expect(resultPromise).resolves.toMatchObject({
      exitCode: 0,
      stdout: "XDG_CURRENT_DESKTOP=ubuntu:GNOME\n",
      stderr: "",
    })
  })

  it("still resolves on exit without a timeout for commands with inherited pipes", async () => {
    const child = fakeChild()
    const executor = createCommandExecutor((() => child) as never)

    const resultPromise = executor.run("sh", ["-c", "wl-copy"])
    child.stdout.write("ready")
    child.emit("exit", 0)

    await expect(resultPromise).resolves.toMatchObject({
      exitCode: 0,
      stdout: "ready",
    })
  })
})
