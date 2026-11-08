import { describe, expect, it, vi } from "vitest"
import { createHash } from "node:crypto"
import { authorizeGoogle, refreshGoogleToken } from "../google-auth.js"

describe("Google authentication", () => {
  it("uses a loopback callback with state and PKCE and stores the refresh token", async () => {
    const set = vi.fn(async () => {})
    const credentials = {
      availability: async () => "available" as const,
      get: vi.fn(),
      set,
      delete: vi.fn(),
    }
    const fetchToken = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body))
      expect(
        createHash("sha256")
          .update(body.get("code_verifier")!)
          .digest("base64url"),
      ).toBe(challenge)
      return Response.json({ access_token: "access", refresh_token: "refresh" })
    })
    let challenge = ""
    const result = await authorizeGoogle({
      clientId: "client",
      instanceId: "work",
      credentials,
      fetch: fetchToken as typeof fetch,
      openUrl: async (url) => {
        const auth = new URL(url)
        challenge = auth.searchParams.get("code_challenge")!
        expect(auth.searchParams.get("code_challenge_method")).toBe("S256")
        expect(auth.searchParams.get("access_type")).toBe("offline")
        expect(auth.searchParams.get("prompt")).toBe("consent")
        const callback = new URL(auth.searchParams.get("redirect_uri")!)
        expect(callback.hostname).toBe("127.0.0.1")
        callback.searchParams.set("state", auth.searchParams.get("state")!)
        callback.searchParams.set("code", "code")
        await fetch(callback)
      },
    })
    expect(result).toBe("access")
    expect(set).toHaveBeenCalledWith("google.work.refresh-token", "refresh")
  })

  it("persists rotated refresh tokens and reports invalid grants without deleting credentials", async () => {
    const credentials = {
      availability: async () => "available" as const,
      get: vi.fn(async () => "old"),
      set: vi.fn(async () => {}),
      delete: vi.fn(),
    }
    const fetchToken = vi.fn(async () =>
      Response.json({
        access_token: "new-access",
        refresh_token: "new-refresh",
      }),
    )
    expect(
      await refreshGoogleToken({
        clientId: "client",
        instanceId: "work",
        credentials,
        fetch: fetchToken as typeof fetch,
      }),
    ).toBe("new-access")
    expect(credentials.set).toHaveBeenCalledWith(
      "google.work.refresh-token",
      "new-refresh",
    )
    fetchToken.mockImplementationOnce(async () =>
      Response.json({ error: "invalid_grant" }, { status: 400 }),
    )
    await expect(
      refreshGoogleToken({
        clientId: "client",
        instanceId: "work",
        credentials,
        fetch: fetchToken as typeof fetch,
      }),
    ).rejects.toThrow(/reauthoriz/i)
    expect(credentials.delete).not.toHaveBeenCalled()
  })

  it("rejects a state mismatch without exchanging a code", async () => {
    const credentials = {
      availability: async () => "available" as const,
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }
    const tokenFetch = vi.fn()
    await expect(
      authorizeGoogle({
        clientId: "client",
        instanceId: "work",
        credentials,
        fetch: tokenFetch,
        openUrl: async (url) => {
          const callback = new URL(
            new URL(url).searchParams.get("redirect_uri")!,
          )
          callback.searchParams.set("state", "wrong")
          callback.searchParams.set("code", "code")
          expect((await fetch(callback)).status).toBe(400)
        },
      }),
    ).rejects.toThrow(/state mismatch/)
    expect(tokenFetch).not.toHaveBeenCalled()
    expect(credentials.set).not.toHaveBeenCalled()
  })

  it("closes the listener after a timeout or denial and refuses locked stores", async () => {
    const credentials = {
      availability: async () => "available" as const,
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }
    let redirect = ""
    await expect(
      authorizeGoogle({
        clientId: "client",
        instanceId: "work",
        credentials,
        timeoutMs: 20,
        openUrl: (url) => {
          redirect = new URL(url).searchParams.get("redirect_uri")!
        },
      }),
    ).rejects.toThrow(/timed out/)
    await expect(fetch(redirect)).rejects.toThrow()
    await expect(
      authorizeGoogle({
        clientId: "client",
        instanceId: "work",
        credentials,
        openUrl: async (url) => {
          const auth = new URL(url)
          const callback = new URL(auth.searchParams.get("redirect_uri")!)
          callback.searchParams.set("state", auth.searchParams.get("state")!)
          callback.searchParams.set("error", "access_denied")
          await fetch(callback)
        },
      }),
    ).rejects.toThrow(/denied/)
    const openUrl = vi.fn()
    await expect(
      authorizeGoogle({
        clientId: "client",
        instanceId: "work",
        credentials: { ...credentials, availability: async () => "locked" },
        openUrl,
      }),
    ).rejects.toThrow(/locked/)
    expect(openUrl).not.toHaveBeenCalled()
  })
})
