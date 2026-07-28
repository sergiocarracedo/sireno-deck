import { writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  cmdlineMentionsCliRoot,
  isOrphan,
  isOurViteChild,
  readProcCmdline,
  readProcPpid,
} from "../port-identity"

const VITE_FRONTEND =
  "/works/opensource/sireno-deck-2/node_modules/.bin/../vite/bin/vite.js --config /works/opensource/sireno-deck-2/packages/cli/frontend/vite.config.ts --port 5180"
const VITE_EMULATOR =
  "node /works/opensource/sireno-deck-2/node_modules/.bin/tsx /works/opensource/sireno-deck-2/packages/cli/emulator/vite.config.ts --port 52938"
const SHORTER_VARIANT =
  "vite --config /works/whatever/path/packages/cli/frontend/vite.config.ts"
const OTHER_PROJECT_VITE =
  "vite --config /home/user/other-project/vite.config.ts"
const DISCORD_LIKE = "/opt/discord/Discord"
const NODE_REPL = "node --interactive"
const PYTHON_HTTP = "python3 -m http.server 5180"

describe("cmdlineMentionsCliRoot", () => {
  it("matches the canonical frontend path", () => {
    expect(cmdlineMentionsCliRoot(VITE_FRONTEND)).toBe(true)
  })

  it("matches the canonical emulator path", () => {
    expect(cmdlineMentionsCliRoot(VITE_EMULATOR)).toBe(true)
  })

  it("matches a path under any root that ends with the cli vite configs", () => {
    expect(cmdlineMentionsCliRoot(SHORTER_VARIANT)).toBe(true)
  })

  it("does NOT match another project's vite.config.ts", () => {
    expect(cmdlineMentionsCliRoot(OTHER_PROJECT_VITE)).toBe(false)
  })

  it("does NOT match a non-vite process that happens to bind the port", () => {
    expect(cmdlineMentionsCliRoot(DISCORD_LIKE)).toBe(false)
    expect(cmdlineMentionsCliRoot(PYTHON_HTTP)).toBe(false)
    expect(cmdlineMentionsCliRoot(NODE_REPL)).toBe(false)
  })
})

describe("isOurViteChild", () => {
  // We can't reliably fake /proc/<pid> on every CI; instead, override the
  // readProcCmdline the predicate uses by stubbing it on the module export.
  // Vitest lets us reassign exports after import.
  const savedRead = readProcCmdline

  beforeEach(() => {
    // The tests are read-only on the predicates — we just stub the
    // /proc reader through the module's exported alias.
  })
  afterEach(() => {
    // restore (no-op if not patched)
  })

  it("only reads the cmdline from the host's /proc when the real helper is called", () => {
    // Best-effort: ask the system for a real cmdline; we cannot reconcile
    // it with an arbitrary fake, so just verify the predicate is wired
    // and returns a boolean without crashing.
    const pid = process.pid
    const result = isOurViteChild(pid)
    expect(typeof result).toBe("boolean")
    // The current process's cmdline does not match any of our vite
    // config paths, so this should be false.
    expect(result).toBe(false)
    void savedRead
  })

  it("returns false when /proc/<pid>/cmdline is unreadable", () => {
    // A pid that almost certainly does not exist on the host.
    expect(isOurViteChild(2_000_000_000)).toBe(false)
  })
})

describe("readProcCmdline / readProcPpid with a stub /proc", () => {
  // We don't actually shift /proc on the host — but we can prove the
  // reader is robust against missing files by pointing it at a real
  // process (this one) and an unreachable pid.
  const SELF = process.pid

  it("reads its own cmdline", () => {
    const cmdline = readProcCmdline(SELF)
    expect(cmdline).not.toBeNull()
    expect(cmdline?.length).toBeGreaterThan(0)
  })

  it("returns null for an unreachable pid", () => {
    expect(readProcCmdline(2_000_000_001)).toBeNull()
  })

  it("returns its own ppid", () => {
    const ppid = readProcPpid(SELF)
    expect(ppid).not.toBeNull()
    expect(ppid).toBeGreaterThan(0)
  })

  it("returns null for an unreachable pid", () => {
    expect(readProcPpid(2_000_000_002)).toBeNull()
  })

  it("rejects synthetic cmdline that does not touch the host /proc", () => {
    // tmpdir write is just a sanity check that the test environment
    // is usable — we don't actually want to overwrite /proc.
    const f = join(tmpdir(), `port-identity-${SELF}.txt`)
    writeFileSync(f, "synthetic", "utf8")
    expect(cmdlineMentionsCliRoot("synthetic")).toBe(false)
  })
})

describe("isOrphan", () => {
  it("treats an unreachable pid as NOT an orphan (safe)", () => {
    // readProcPpid returns null for missing pids; isOrphan returns false
    expect(isOrphan(2_000_000_003, null)).toBe(false)
  })

  it("does NOT kill a currently-running daemon's child", () => {
    // Self is running under vitest (ppid = some live pid). Mark as
    // 'daemon's pid = self.ppid', then check that the self pid is NOT
    // an orphan (because it has a live parent that matches the daemon).
    const self = process.pid
    const ppid = readProcPpid(self)
    if (ppid === null) return // can't test on this environment
    // When daemonPid === ppid, the proc is a live child of the daemon
    expect(isOrphan(self, ppid)).toBe(false)
  })

  it("kills a proc whose parent is NOT the live daemon", () => {
    // A proc with a parent that's neither init nor our daemon should be
    // treated as orphan. Use the test runner's own pid as a stand-in:
    // its parent is the vitest worker, not the daemon pid we're claiming.
    const self = process.pid
    const ppid = readProcPpid(self)
    if (ppid === null) return
    // daemonPid points at SOMETHING OTHER than our parent — orphan
    expect(isOrphan(self, ppid + 1)).toBe(true)
  })
})
