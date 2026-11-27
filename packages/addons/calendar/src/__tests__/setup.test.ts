import { beforeEach, describe, expect, it, vi } from "vitest"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { authorizeGoogle } from "../auth/google-auth.js"
import { createSecureJsonStorage } from "../domain/secure-storage.js"
import { createGoogleCalendarProvider } from "../providers/google/index.js"
import { setupAddon } from "../setup.js"

vi.mock("../auth/google-auth.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../auth/google-auth.js")>()),
  authorizeGoogle: vi.fn(),
}))
vi.mock("../providers/google/index.js", () => ({
  createGoogleCalendarProvider: vi.fn(),
}))

const credentialValues = new Map<string, string>()
const credentials = {
  availability: async () => "available" as const,
  get: vi.fn(async (name: string) => credentialValues.get(name)),
  set: vi.fn(async (name: string, value: string) => {
    credentialValues.set(name, value)
  }),
  delete: vi.fn(async (name: string) => {
    credentialValues.delete(name)
  }),
}
const openUrl = vi.fn()
const confirm = vi.fn()
const saveProvider = vi.fn().mockResolvedValue("/config.yml")
const listProviders = vi.fn().mockResolvedValue([] as string[])
const removeProvider = vi.fn().mockResolvedValue("/config.yml")
let dataDirectory = ""
const getDataDirectory = vi.fn(async () => dataDirectory)
const print = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  credentialValues.clear()
  confirm.mockReset().mockResolvedValueOnce(true).mockResolvedValue(false)
  listProviders.mockReset().mockResolvedValue([])
  removeProvider.mockReset().mockResolvedValue("/config.yml")
  saveProvider.mockReset().mockResolvedValue("/config.yml")
  vi.mocked(authorizeGoogle).mockResolvedValue("synthetic-access-token")
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

const ctx = (overrides: Record<string, unknown> = {}) => ({
  credentials,
  openUrl,
  text: vi.fn(),
  selectMany: vi.fn(),
  selectOne: vi.fn(),
  confirm,
  saveProvider,
  listProviders,
  removeProvider,
  getDataDirectory,
  print,
  ...overrides,
})

describe("Google setup", () => {
  it("authorizes and outputs selected calendars without secrets", async () => {
    const text = vi.fn().mockResolvedValueOnce("work")
    const selectMany = vi.fn().mockResolvedValue(["a@example.com", "b"])
    await setupAddon(
      ctx({
        selectOne: vi.fn().mockResolvedValue("add"),
        text,
        selectMany,
      }),
    )
    expect(text).toHaveBeenCalledWith(
      "Account ID (letters, numbers, . _ -)\nName the account to identify it on Sireno Deck",
    )
    expect(text).toHaveBeenCalledTimes(1)
    expect(authorizeGoogle).toHaveBeenCalledWith({
      instanceId: "work",
      clientId:
        "876921078438-idpd33n9csa186500kjh9580m6okggms.apps.googleusercontent.com",
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
      clientId:
        "876921078438-idpd33n9csa186500kjh9580m6okggms.apps.googleusercontent.com",
      calendarIds: ["a@example.com", "b"],
      calendarColors: { "a@example.com": "#ff0000" },
    })
    expect(print.mock.calls.at(-1)?.[0]).toContain("/config.yml")
    expect(JSON.stringify(print.mock.calls)).not.toContain("secret")
    expect(JSON.stringify(print.mock.calls)).not.toContain(
      "synthetic-access-token",
    )
  })

  it("rejects invalid account IDs before authorization", async () => {
    await expect(
      setupAddon(
        ctx({
          selectOne: vi.fn().mockResolvedValue("add"),
          text: vi.fn().mockResolvedValue("bad id"),
        }),
      ),
    ).rejects.toThrow("Invalid Google account ID")
    expect(authorizeGoogle).not.toHaveBeenCalled()
  })

  it("does not authorize or save anything when disclosure is declined", async () => {
    const text = vi.fn()
    await setupAddon(
      ctx({
        selectOne: vi.fn().mockResolvedValue("add"),
        text,
        selectMany: vi.fn(),
        confirm: vi.fn().mockResolvedValue(false),
      }),
    )
    expect(print.mock.calls[0]?.[0]).toContain(
      "https://deck.sireno.dev/privacy/",
    )
    expect(authorizeGoogle).not.toHaveBeenCalled()
    expect(openUrl).not.toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()
    expect(saveProvider).not.toHaveBeenCalled()
  })

  it("rejects empty or unknown selections", async () => {
    const text = vi.fn().mockResolvedValueOnce("work")
    await expect(
      setupAddon(
        ctx({
          selectOne: vi.fn().mockResolvedValue("add"),
          text,
          selectMany: vi.fn().mockResolvedValue(["unknown"]),
        }),
      ),
    ).rejects.toThrow("Select at least one")
  })

  it("saves each account before asking to add another", async () => {
    const text = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second")
    await setupAddon(
      ctx({
        selectOne: vi.fn().mockResolvedValue("add"),
        text,
        selectMany: vi.fn().mockResolvedValue(["b"]),
        confirm: vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
      }),
    )
    expect(saveProvider.mock.calls.map(([provider]) => provider.id)).toEqual([
      "first",
      "second",
    ])
  })

  it("prints manual instructions only when saving is unavailable", async () => {
    const text = vi.fn().mockResolvedValueOnce("work")
    await setupAddon(
      ctx({
        selectOne: vi.fn().mockResolvedValue("add"),
        text,
        selectMany: vi.fn().mockResolvedValue(["b"]),
        confirm: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false),
        saveProvider: vi.fn().mockResolvedValue(null),
      }),
    )
    expect(print.mock.calls.at(-1)?.[0]).toContain('"calendarIds": [\n    "b"')
  })

  it("disconnects an account by removing its token, data and config entry", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-disconnect-"))
    dataDirectory = directory
    try {
      const storage = (path: string) =>
        createSecureJsonStorage({ path, credentials })
      await storage(join(directory, "alarms-v1.json")).save({
        version: 1,
        alarms: [
          {
            id: "a",
            occurrence: '["work","c","e","e"]',
            eventStartMs: 1,
            dueAtMs: 1,
            state: "pending",
          },
          {
            id: "b",
            occurrence: '["personal","c","e","e"]',
            eventStartMs: 1,
            dueAtMs: 1,
            state: "pending",
          },
        ],
      })
      await storage(join(directory, "calendar-selections-v1.json")).save({
        version: 1,
        selections: { '["work","c"]': true, '["personal","c"]': true },
      })
      listProviders.mockResolvedValue(["work", "personal"])
      await setupAddon(
        ctx({
          selectOne: vi
            .fn()
            .mockResolvedValueOnce("remove")
            .mockResolvedValueOnce("work"),
          confirm: vi.fn().mockResolvedValue(true),
        }),
      )
      expect(credentials.delete).toHaveBeenCalledWith(
        "google.work.refresh-token",
      )
      expect(credentials.delete).toHaveBeenCalledWith(
        "google.work.client-secret",
      )
      expect(getDataDirectory).toHaveBeenCalled()
      expect(removeProvider).toHaveBeenCalledWith("work")
      expect(removeProvider).not.toHaveBeenCalledWith("personal")
      expect(authorizeGoogle).not.toHaveBeenCalled()
      const printed = JSON.stringify(print.mock.calls)
      expect(printed).toContain("myaccount.google.com/permissions")
      const alarms = (await storage(
        join(directory, "alarms-v1.json"),
      ).load()) as { alarms: { id: string }[] }
      expect(alarms.alarms.map((alarm) => alarm.id)).toEqual(["b"])
      const selections = (await storage(
        join(directory, "calendar-selections-v1.json"),
      ).load()) as { selections: Record<string, boolean> }
      expect(Object.keys(selections.selections)).toEqual(['["personal","c"]'])
      const raw = await readFile(join(directory, "alarms-v1.json"), "utf8")
      expect(raw).not.toContain("work")
      expect(JSON.parse(raw)).toMatchObject({ alg: "aes-256-gcm" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("keeps the account when the disconnect is not confirmed", async () => {
    listProviders.mockResolvedValue(["work"])
    await setupAddon(
      ctx({
        selectOne: vi
          .fn()
          .mockResolvedValueOnce("remove")
          .mockResolvedValueOnce("work"),
        confirm: vi.fn().mockResolvedValue(false),
      }),
    )
    expect(credentials.delete).not.toHaveBeenCalled()
    expect(removeProvider).not.toHaveBeenCalled()
  })

  it("reports a config that could not be updated without claiming removal", async () => {
    listProviders.mockResolvedValue(["work"])
    removeProvider.mockResolvedValue(null)
    await setupAddon(
      ctx({
        selectOne: vi
          .fn()
          .mockResolvedValueOnce("remove")
          .mockResolvedValueOnce("work"),
        confirm: vi.fn().mockResolvedValue(true),
      }),
    )
    const printed = JSON.stringify(print.mock.calls)
    expect(printed).toContain("config file could not be updated")
    expect(printed).not.toContain('Removed "work" from')
  })

  it("offers to disconnect only when an account is configured", async () => {
    const selectOne = vi.fn().mockResolvedValue("add")
    await setupAddon(
      ctx({
        selectOne,
        text: vi.fn().mockResolvedValueOnce("work"),
        selectMany: vi.fn().mockResolvedValue(["b"]),
      }),
    )
    const options = selectOne.mock.calls[0]?.[1] as {
      value: string
    }[]
    expect(options.map((option) => option.value)).toEqual(["add"])
  })
})
