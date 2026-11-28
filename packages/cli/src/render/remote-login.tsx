import { renderToStaticMarkup } from "react-dom/server"
import { VERSION } from "@/version"

/**
 * The login page the HTTPS gateway serves before a client has a session.
 * It is server-rendered from React so it stays in step with the project's
 * palette and typography instead of drifting as a hand-written HTML string.
 */

// ponytail: the marketing palette, mirrored from the website's tokens. The
// CLI ships no CSS pipeline, so the styles live next to the markup.
const palette = {
  bg: "#0a0a0f",
  surface: "#14141a",
  raised: "#1c1c24",
  fg: "#e4e4e7",
  muted: "#a1a1aa",
  border: "#27272a",
  accent: "#2888c0",
  accentSoft: "rgb(40 136 192 / 0.16)",
  violet: "#a78bfa",
} as const

const styles = `
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: ${palette.bg};
  color: ${palette.fg};
  font-family: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
}
main {
  width: 100%;
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.75rem;
  text-align: center;
}
.brand { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.brand img {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: ${palette.raised};
  border: 1px solid ${palette.border};
  padding: 6px;
}
h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.version {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.8125rem;
  color: ${palette.muted};
}
.card {
  width: 100%;
  background: ${palette.surface};
  border: 1px solid ${palette.border};
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: left;
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.45);
}
label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${palette.muted};
  margin-bottom: 0.5rem;
}
input {
  width: 100%;
  font: inherit;
  font-size: 0.9375rem;
  color: ${palette.fg};
  background: ${palette.raised};
  border: 1px solid ${palette.border};
  border-radius: 9px;
  padding: 0.625rem 0.75rem;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
input:focus {
  outline: none;
  border-color: ${palette.accent};
  box-shadow: 0 0 0 3px ${palette.accentSoft};
}
button {
  width: 100%;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #071116;
  background: ${palette.accent};
  border: none;
  border-radius: 9px;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: filter 120ms ease;
}
button:hover { filter: brightness(1.08); }
button:focus-visible {
  outline: 2px solid ${palette.violet};
  outline-offset: 2px;
}
.hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: ${palette.muted};
}
.error {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #ffb4ab;
  background: rgb(255 180 171 / 0.08);
  border: 1px solid rgb(255 180 171 / 0.28);
  border-radius: 9px;
  padding: 0.625rem 0.75rem;
}
`

const Brand = () => (
  <div className="brand">
    <img src="/logo.png" alt="Sireno Deck" width={64} height={64} />
    <h1>Sireno Deck</h1>
    <p className="version">v{VERSION}</p>
  </div>
)

const TokenField = ({
  id,
  defaultValue,
  autoFocus,
}: {
  id: string
  defaultValue: string
  autoFocus: boolean
}) => (
  <div>
    <label htmlFor={id}>Access token</label>
    <input
      id={id}
      name="token"
      type="password"
      autoComplete="current-password"
      autoFocus={autoFocus}
      defaultValue={defaultValue}
      required
      spellCheck={false}
    />
  </div>
)

const LoginForm = ({
  action,
  token,
  autoFocus,
}: {
  action: string
  token: string
  autoFocus: boolean
}) => (
  <form className="card" method="post" action={action}>
    <TokenField id="token" defaultValue={token} autoFocus={autoFocus} />
    <button type="submit">Connect</button>
  </form>
)

/**
 * Render the login page. `token` is only echoed back when the daemon asked
 * for it, which never happens for a failed attempt.
 */
export const renderLoginPage = (options: {
  deckOnly: boolean
  token?: string
  error?: string
  autoFocus?: boolean
}): string => {
  const action = options.deckOnly ? "/login?deckOnly=1" : "/login"
  const body = (
    <main>
      <Brand />
      {options.error ? <p className="error">{options.error}</p> : null}
      <LoginForm
        action={action}
        token={options.token ?? ""}
        autoFocus={options.autoFocus ?? true}
      />
      <p className="hint">
        Enter the access token printed by the daemon. It changes every time
        Sireno Deck restarts.
      </p>
    </main>
  )
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sireno Deck</title>
<style>${styles}</style>
</head>
<body>
${renderToStaticMarkup(body)}
</body>
</html>
`
}
