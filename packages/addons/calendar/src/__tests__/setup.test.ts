import { beforeEach, describe, expect, it, vi } from "vitest"
import { authorizeGoogle } from "../auth/google-auth.js"
import { createGoogleCalendarProvider } from "../providers/google/index.js"
import { setupAddon } from "../setup.js"

vi.mock("../auth/google-auth.js", () => ({ authorizeGoogle: vi.fn() }))
vi.mock("../providers/google/index.js", () => ({
  createGoogleCalendarProvider: vi.fn(),
}))

const credentials = {
  availability: async () => "available" as const,
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}
const openUrl = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authorizeGoogle).mockResolvedValue("access")
  vi.mocked(createGoogleCalendarProvider).mockReturnValue({
    instanceId: "work",
    fetchEvents: vi.fn(),
    readEvents: vi.fn(),
    listCalendars: vi.fn().mockResolvedValue([
      { id: "a@example.com", name: "Work" },
      { id: "b", name: "Personal" },
    ]),
  })
})

describe("Google setup", () => {
  it("authorizes and outputs selected calendars without secrets", async () => {
    const text = vi
      .fn()
      .mockResolvedValueOnce("work")
      .mockResolvedValueOnce("client")
      .mockResolvedValueOnce("secret")
    const selectMany = vi.fn().mockResolvedValue(["b"])
    const print = vi.fn()
    await setupAddon({ credentials, openUrl, text, selectMany, print })
    expect(authorizeGoogle).toHaveBeenCalledWith({
      instanceId: "work",
      clientId: "client",
      clientSecret: "secret",
      credentials,
      openUrl,
    })
    expect(selectMany).toHaveBeenCalledWith("Select calendars", [
      { value: "a@example.com", label: "Work (a@example.com)" },
      { value: "b", label: "Personal (b)" },
    ])
    expect(print.mock.calls.at(-1)?.[0]).toContain('"calendarIds": [\n    "b"')
    expect(JSON.stringify(print.mock.calls)).not.toContain("secret")
    expect(JSON.stringify(print.mock.calls)).not.toContain("access")
  })

  it("rejects invalid instance IDs before authorization", async () => {
    await expect(
      setupAddon({
        credentials,
        openUrl,
        text: vi.fn().mockResolvedValue("bad id"),
        selectMany: vi.fn(),
        print: vi.fn(),
      }),
    ).rejects.toThrow("Invalid Google instance ID")
    expect(authorizeGoogle).not.toHaveBeenCalled()
  })

  it("rejects empty or unknown selections", async () => {
    const text = vi
      .fn()
      .mockResolvedValueOnce("work")
      .mockResolvedValueOnce("client")
      .mockResolvedValueOnce("")
    await expect(
      setupAddon({
        credentials,
        openUrl,
        text,
        selectMany: vi.fn().mockResolvedValue(["unknown"]),
        print: vi.fn(),
      }),
    ).rejects.toThrow("Select at least one")
  })
})
