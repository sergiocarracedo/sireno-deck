import { isAbsolute, resolve as resolvePath } from "node:path"

// ponytail: SIRENO_CWD is a privilege escalation surface — it lets any process
// in the user's shell environment redirect config include resolution to an
// attacker-controlled cwd. Refuse the override unless we can attribute it to a
// trusted setter:
//   - SIRENO_WRAPPER_CHILD=1 — bin/dev.js and bin/sirenodeck.js spawn the CLI
//     with `cwd` at the package root (tsx needs it) and both set SIRENO_CWD
//     from their OWN process.cwd() in the same env literal that sets the
//     sentinel, so an inherited SIRENO_CWD is always overwritten, never
//     honoured. Without this branch the wrappers' SIRENO_CWD was silently
//     dropped and every relative config path resolved against packages/cli.
//   - SIRENO_ALLOW_CWD_OVERRIDE=1 — explicit opt-in for non-wrapper callers.
export const getOriginalCwd = (): string => {
  const override = process.env["SIRENO_CWD"]
  if (override === undefined || override === "") return process.cwd()
  const trusted =
    process.env["SIRENO_WRAPPER_CHILD"] === "1" ||
    process.env["SIRENO_ALLOW_CWD_OVERRIDE"] === "1"
  return trusted ? override : process.cwd()
}

// ponytail: the CLI's own cwd is the package root under the dev wrapper, so a
// relative `--config config.yml` typed at the repo root used to resolve to
// packages/cli/config.yml and fail with "Config file not found". Anchor every
// user-supplied path to the cwd the user actually typed it in.
export const resolveUserPath = (path: string): string =>
  isAbsolute(path) ? path : resolvePath(getOriginalCwd(), path)
