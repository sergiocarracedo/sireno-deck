import { createHash, randomBytes } from "node:crypto"
import { createServer } from "node:http"

interface Credentials {
  availability(): Promise<"available" | "locked" | "unavailable">
  get(name: string): Promise<string | undefined>
  set(name: string, value: string): Promise<void>
  delete(name: string): Promise<void>
}

interface GoogleAuthOptions {
  readonly instanceId: string
  readonly clientId: string
  readonly credentials: Credentials
  readonly clientSecret?: string
  readonly fetch?: typeof globalThis.fetch
}

const tokenName = (id: string): string => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(id))
    throw new Error("Invalid Google instance ID")
  return `google.${id}.refresh-token`
}
const secretName = (id: string): string => `google.${id}.client-secret`

async function requireCredentials(credentials: Credentials): Promise<void> {
  const state = await credentials.availability()
  if (state !== "available") throw new Error(`Credential store ${state}`)
}

async function tokenRequest(
  options: GoogleAuthOptions,
  body: URLSearchParams,
): Promise<{ access: string; refresh?: string }> {
  body.set("client_id", options.clientId)
  if (options.clientSecret) body.set("client_secret", options.clientSecret)
  let response: Response
  try {
    response = await (options.fetch ?? globalThis.fetch)(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    )
  } catch {
    throw new Error("Google token request failed")
  }
  let data: { access_token?: unknown; refresh_token?: unknown; error?: unknown }
  try {
    data = (await response.json()) as typeof data
  } catch {
    throw new Error("Google token response was invalid")
  }
  if (!response.ok) {
    if (data?.error === "invalid_grant")
      throw new Error("Google authorization expired; reauthorize this account")
    throw new Error("Google token request failed")
  }
  if (
    !data ||
    typeof data.access_token !== "string" ||
    !data.access_token ||
    (data.refresh_token !== undefined &&
      (typeof data.refresh_token !== "string" || !data.refresh_token))
  )
    throw new Error("Google token response was invalid")
  return {
    access: data.access_token,
    ...(typeof data.refresh_token === "string"
      ? { refresh: data.refresh_token }
      : {}),
  }
}

export async function refreshGoogleToken(
  options: GoogleAuthOptions,
): Promise<string> {
  const key = tokenName(options.instanceId)
  await requireCredentials(options.credentials)
  const refresh = await options.credentials.get(key)
  if (!refresh) throw new Error("Google account requires reauthorization")
  const clientSecret =
    options.clientSecret ??
    (await options.credentials.get(secretName(options.instanceId)))
  const tokens = await tokenRequest(
    { ...options, ...(clientSecret ? { clientSecret } : {}) },
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  )
  if (tokens.refresh) await options.credentials.set(key, tokens.refresh)
  return tokens.access
}

export async function authorizeGoogle(
  options: GoogleAuthOptions & {
    readonly openUrl: (url: string) => void | Promise<void>
    readonly timeoutMs?: number
    readonly signal?: AbortSignal
  },
): Promise<string> {
  const key = tokenName(options.instanceId)
  await requireCredentials(options.credentials)
  if (options.signal?.aborted) throw new Error("Google authorization cancelled")
  const state = randomBytes(32).toString("base64url")
  const verifier = randomBytes(32).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  let settled = false
  let resolveCallback!: (code: string) => void
  let rejectCallback!: (error: Error) => void
  const callback = new Promise<string>((resolve, reject) => {
    resolveCallback = resolve
    rejectCallback = reject
  })
  // Attach a handler immediately, including while opening the browser.
  void callback.catch(() => {})
  const server = createServer((req, res) => {
    if (settled) {
      res.writeHead(409).end("Authorization already completed")
      return
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1")
    if (req.method !== "GET" || url.pathname !== "/oauth2callback") {
      res.writeHead(404).end()
      return
    }
    settled = true
    if (url.searchParams.get("state") !== state) {
      res.writeHead(400).end("Authorization failed")
      rejectCallback(new Error("Google authorization state mismatch"))
      return
    }
    const code = url.searchParams.get("code")
    if (url.searchParams.has("error") || !code) {
      res.writeHead(400).end("Authorization denied")
      rejectCallback(new Error("Google authorization denied"))
      return
    }
    res
      .writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      })
      .end("Authorization complete. Return to Sireno Deck.")
    resolveCallback(code)
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") {
    server.close()
    throw new Error("Loopback listener unavailable")
  }
  const redirect = `http://127.0.0.1:${address.port}/oauth2callback`
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.search = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  }).toString()
  const abort = () =>
    rejectCallback(new Error("Google authorization cancelled"))
  const timer = setTimeout(
    () => rejectCallback(new Error("Google authorization timed out")),
    options.timeoutMs ?? 120_000,
  )
  options.signal?.addEventListener("abort", abort, { once: true })
  try {
    if (options.signal?.aborted) abort()
    await Promise.race([
      Promise.resolve().then(() => options.openUrl(url.toString())),
      callback.then(() => undefined),
    ])
    const code = await callback
    const tokens = await tokenRequest(
      options,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        redirect_uri: redirect,
      }),
    )
    if (!tokens.refresh)
      throw new Error(
        "Google did not return a refresh token; reauthorize this account",
      )
    if (options.clientSecret)
      await options.credentials.set(
        secretName(options.instanceId),
        options.clientSecret,
      )
    await options.credentials.set(key, tokens.refresh)
    return tokens.access
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener("abort", abort)
    server.close()
  }
}
