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
const confirm = vi.fn().mockResolvedValue(false)
const saveProvider = vi.fn().mockResolvedValue("/config.yml")

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authorizeGoogle).mockResolvedValue("access")
  vi.mocked(createGoogleCalendarProvider).mockReturnValue({
    instanceId: "work",
    fetchEvents: vi.fn(),
    readEvents: vi.fn(),
    listCalendars: vi.fn().mockResolvedValue([
      { id: "a@example.com", name: "Work", color: "#ff0000" },
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
    const selectMany = vi.fn().mockResolvedValue(["a@example.com", "b"])
    const print = vi.fn()
    await setupAddon({
      credentials,
      openUrl,
      text,
      selectMany,
      print,
      confirm,
      saveProvider,
    })
    expect(text).toHaveBeenCalledWith("Account ID (letters, numbers, . _ -)")
    expect(authorizeGoogle).toHaveBeenCalledWith({
      instanceId: "work",
      clientId: "client",
      clientSecret: "secret",
      credentials,
      openUrl,
    })
    expect(selectMany).toHaveBeenCalledWith(
      "Select calendars (A: select/deselect all)",
      [
        {
          value: "a@example.com",
          label: "Work",
          hint: "a@example.com",
          color: "#ff0000",
        },
        { value: "b", label: "Personal", hint: "b" },
      ],
    )
    expect(saveProvider).toHaveBeenCalledWith({
      id: "work",
      type: "google",
      clientId: "client",
      calendarIds: ["a@example.com", "b"],
      calendarColors: { "a@example.com": "#ff0000" },
    })
    expect(print.mock.calls.at(-1)?.[0]).toContain("/config.yml")
    expect(JSON.stringify(print.mock.calls)).not.toContain("secret")
    expect(JSON.stringify(print.mock.calls)).not.toContain("access")
  })

  it("rejects invalid account IDs before authorization", async () => {
    await expect(
      setupAddon({
        credentials,
        openUrl,
        text: vi.fn().mockResolvedValue("bad id"),
        selectMany: vi.fn(),
        print: vi.fn(),
        confirm,
        saveProvider,
      }),
    ).rejects.toThrow("Invalid Google account ID")
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
        confirm,
        saveProvider,
      }),
    ).rejects.toThrow("Select at least one")
  })

  it("saves each account before asking to add another", async () => {
    const text = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("client")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("second")
      .mockResolvedValueOnce("client")
      .mockResolvedValueOnce("")
    const confirm = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    const saveProvider = vi.fn().mockResolvedValue("/config.yml")
    await setupAddon({
      credentials,
      openUrl,
      text,
      selectMany: vi.fn().mockResolvedValue(["b"]),
      print: vi.fn(),
      confirm,
      saveProvider,
    })
    expect(saveProvider.mock.calls.map(([provider]) => provider.id)).toEqual([
      "first",
      "second",
    ])
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it("prints manual instructions only when saving is unavailable", async () => {
    const text = vi
      .fn()
      .mockResolvedValueOnce("work")
      .mockResolvedValueOnce("client")
      .mockResolvedValueOnce("")
    const print = vi.fn()
    await setupAddon({
      credentials,
      openUrl,
      text,
      selectMany: vi.fn().mockResolvedValue(["b"]),
      print,
      confirm: vi.fn().mockResolvedValue(false),
      saveProvider: vi.fn().mockResolvedValue(null),
    })
    expect(print.mock.calls.at(-1)?.[0]).toContain('"calendarIds": [\n    "b"')
  })
})
