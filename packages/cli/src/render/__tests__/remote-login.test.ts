import { describe, expect, it } from "vitest"
import { renderLoginPage } from "../remote-login.js"

describe("remote login page", () => {
  it("renders the brand, version and token field", () => {
    const html = renderLoginPage({ deckOnly: false })
    expect(html).toContain("<title>Sireno Deck</title>")
    expect(html).toContain('class="brand"')
    expect(html).toContain('src="/logo.png"')
    expect(html).toMatch(/class="version">v[\w.-]+</)
    expect(html).toContain('for="token"')
    expect(html).toContain('name="token"')
    expect(html).toContain('type="password"')
    expect(html).toContain('action="/login"')
    expect(html).toContain('type="submit"')
  })

  it("keeps the deck-only view on the login page", () => {
    const html = renderLoginPage({ deckOnly: true })
    expect(html).toContain('action="/login?deckOnly=1"')
  })

  it("shows an error and never echoes a token back", () => {
    const html = renderLoginPage({
      deckOnly: false,
      error: "That access token was not accepted.",
    })
    expect(html).toContain("That access token was not accepted.")
    // The field is rendered empty: a rejected token is never reflected back.
    expect(html).toMatch(/value=""/)
    expect(html).not.toMatch(/value="[^"]+"/)
  })

  it("never marks the page as indexable", () => {
    expect(renderLoginPage({ deckOnly: false })).toContain(
      'name="robots" content="noindex, nofollow"',
    )
  })
})
