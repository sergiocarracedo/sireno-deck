import { describe, expect, it } from "vitest"

import { executeCommand } from "./executor"

describe("executeCommand", () => {
  it("captures stdout for successful commands", async () => {
    const result = await executeCommand({ command: "printf 'hello world'" })

    expect(result.failed).toBe(false)
    expect(result.code).toBe(0)
    expect(result.stdout).toBe("hello world")
    expect(result.stderr).toBe("")
  })

  it("classifies non-zero exits as failures", async () => {
    const result = await executeCommand({ command: "printf 'boom' >&2; exit 7" })

    expect(result.failed).toBe(true)
    expect(result.code).toBe(7)
    expect(result.stderr).toBe("boom")
  })

  it("reports timeout failures", async () => {
    const result = await executeCommand({ command: "sleep 1", timeoutMs: 10 })

    expect(result.failed).toBe(true)
    expect(result.timedOut).toBe(true)
  })

  it("resolves canonical host-context placeholders before execution", async () => {
    const result = await executeCommand({
      command: "printf '%s|%s|%s' {{host.os.type}} {{host.os.variant}} {{host.session.state}}",
      hostContext: {
        os: {
          type: "linux",
          variant: "ubuntu",
          version: "24.04",
        },
        session: {
          capability: "unknown",
          state: "unknown",
        },
      },
    })

    expect(result.failed).toBe(false)
    expect(result.stdout).toBe("linux|ubuntu|unknown")
  })

  it("shell-escapes host-context placeholders before command execution", async () => {
    const result = await executeCommand({
      command: "printf '%s' {{host.os.variant}}",
      hostContext: {
        os: {
          type: "linux",
          variant: "ubuntu'; touch /tmp/nope; '",
          version: "24.04",
        },
        session: {
          capability: "unknown",
          state: "unknown",
        },
      },
    })

    expect(result.failed).toBe(false)
    expect(result.stdout).toBe("ubuntu'; touch /tmp/nope; '")
  })

  it("leaves unresolved host-context placeholders intact during command execution", async () => {
    const result = await executeCommand({
      command: "printf '%s' {{host.session.missing}}",
      hostContext: {
        os: {
          type: "linux",
          variant: "ubuntu",
          version: "24.04",
        },
        session: {
          capability: "unknown",
          state: "unknown",
        },
      },
    })

    expect(result.failed).toBe(false)
    expect(result.stdout).toBe("{{host.session.missing}}")
  })
})
