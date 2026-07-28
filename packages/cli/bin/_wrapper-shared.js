#!/usr/bin/env node
import { platform } from "node:process"

// ponytail: the dev wrappers (bin/dev.js, bin/sirenodeck.js) are pure JS so
// they can't import the tsx-transpiled helpers under packages/cli/src/.
// Re-implement the title/group-kill bits inline here — small enough that
// the duplication is cheaper than a build step.

const TITLE_MAX = 15

export const setWrapperTitle = (title) => {
  const capped =
    platform === "linux" && title.length > TITLE_MAX
      ? title.slice(0, TITLE_MAX)
      : title
  process.title = capped
  return capped
}

// ponytail: when the daemon (`tsx -> main.ts`) exits, the wrapper used to
// exit immediately and leave the daemon's children (vite on :5180, :52938,
// :52937) reparented to init, still holding their ports. POSIX keeps the
// process group alive after the leader dies, so `kill(-pgid, SIGTERM)`
// followed by SIGKILL after a grace window cleans them up. The daemon was
// spawned with `detached: true`, so its pid IS the pgid. We try the
// negative-pid form first; Windows silently ignores it, so the unix guard
// is the only behavioural branch.
export const killProcessGroup = (pgid, signal) => {
  if (platform === "win32") return
  try {
    process.kill(-pgid, signal)
  } catch {
    // group already empty or perms — best effort
  }
}

export const reapOrphanProcessGroup = (pgid, graceMs = 500) => {
  if (pgid === undefined || pgid === null || pgid <= 0) return
  if (platform === "win32") return
  killProcessGroup(pgid, "SIGTERM")
  setTimeout(() => killProcessGroup(pgid, "SIGKILL"), graceMs).unref?.()
}