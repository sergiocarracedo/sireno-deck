# 03 — System Providers

Scope: Linux/macOS/Windows provider implementations, requirements probe, shared helpers, null-provider trap.

## Findings

### [x] [03-system-providers #1] [P0] `hyper+super+a` causes stuck keys on Linux

**Evidence:** `system/providers/key-macro/linux.ts:325-374` dedups modifiers by name; both `hyper` and `super` map to `SC_LEFTMETA` (line 145), but dedup is by mod name, not scancode. Result: two `125:1` press events, one `125:0` release.
**Impact:** User-side stuck Meta key after macro completes; subsequent typing triggers Super shortcuts.
**Effort:** S
**Fix sketch:** Dedup by resolved scancode after normalization, or define `hyper` as a distinct modifier slot.
**OSS-impression:** Visible bug under common workflow.

### [x] [03-system-providers #2] [P0] `isPureAscii` regex matches control characters

**Evidence:** `key-macro/linux.ts:427` `/^[\x00-\x7F]*$/` matches `NUL`/`SOH`/`BEL`.
**Impact:** `ydotool type` receives control characters; untested behavior; may corrupt subsequent input.
**Effort:** S
**Fix sketch:** Use `/^[\x20-\x7E]*$/` (printable ASCII) and route control chars through a different path.
**OSS-impression:** Regex over control ranges is a senior review flag.

### [x] [03-system-providers #3] [P0] Windows key-macro DLL cache has no version check

**Evidence:** `key-macro/windows.ts:19, 277-283`; DLL at `${tmpdir}/sireno-deck/key-macro-windows/sirenokey-input.dll` is reused across daemon restarts without source-version check.
**Impact:** Source change → DLL not recompiled → daemon runs stale binary.
**Effort:** S
**Fix sketch:** Hash the C# source, compare to a sidecar; recompile on mismatch.
**OSS-impression:** Stale-binary-in-tmp is a classic postmortem cause.

### [x] [03-system-providers #4] [P0] Linux session provider misses locked-at-startup

**Evidence:** `system/providers/session/linux.ts:48-69`; if `GetActive()` returns `true` on initial call, `enterLockMode` is never fired from the initial subscription.
**Impact:** Daemon started while screen is locked never enters lock mode; user sees regular deck and taps execute actions.
**Effort:** S
**Fix sketch:** After initial `GetActive`, if `true`, immediately publish `runtime:lock-mode` with state `"locked"`.
**OSS-impression:** Init-time state machine skips are a top bug class.

### [x] [03-system-providers #5] [P0] D-Bus proxy leak in Linux session provider

**Evidence:** `system/providers/session/linux.ts:96-114`; 5s interval opens a fresh proxy object each tick.
**Impact:** ~17,280 proxy objects opened per 24h daemon uptime.
**Effort:** S
**Fix sketch:** Cache the proxy on first successful call; reuse.
**OSS-impression:** Slow leaks in long-lived daemons.

### [03-system-providers #6] [P1] `darwin.ts:tick()` type lie — state can be `undefined`

**Evidence:** `system/providers/session/darwin.ts:48-57`; `state = await tick()` may set `state` to `undefined`; typed as `SessionState` which does not include `undefined`.
**Impact:** First emission to listeners sends `undefined`; downstream code that doesn't expect it crashes.
**Effort:** S
**Fix sketch:** `state: SessionState | "unknown"` or default to `"unknown"`.
**OSS-impression:** Type lies hide runtime crashes.

### [03-system-providers #7] [P1] `wayland-gnome.ts` disables polling on 5 failures, no recovery

**Evidence:** `system/providers/active-app/wayland-gnome.ts:178-191`; `MAX_CONSECUTIVE_POLL_FAILURES=5` → `stopped = true; clearTimeout(timer)`. No re-enable path.
**Impact:** After a transient GNOME Shell restart, provider stays on stale `/proc` data forever.
**Effort:** M
**Fix sketch:** Backoff retry with reset on success; emit `provider:degraded` signal.
**OSS-impression:** Self-disable without recovery is a senior concern.

### [03-system-providers #8] [P1] `requirements.ts` `which` precedence bypasses fs probe

**Evidence:** `system/requirements.ts:80-88`; `which` runs first; if it returns exit 0 with empty stdout (e.g. shell wrapper that prints a banner), the function returns `false`, bypassing `extraFsProbe`.
**Impact:** Tool falsely reported missing when present on disk.
**Effort:** S
**Fix sketch:** When `extraFsProbe` is provided, run it first and trust its result; only fall back to `which` if fs probe is empty.
**OSS-impression:** Detection ordering bug.

### [03-system-providers #9] [P1] `active-app/linux.ts:parseDbusEvalResult` silently no-ops on empty `wmClass`

**Evidence:** Lines 39-44, 114; if both `wmClass` and `title` are empty, `name` is empty, `processNames` glob match fails.
**Impact:** Active-app overlay never shows; operator has no diagnostic.
**Effort:** S
**Fix sketch:** Log when dbus returns empty result; expose a "no app detected" channel.
**OSS-impression:** Silent failures with no telemetry.

### [03-system-providers #10] [P1] `active-app/linux.ts:dbusFailed = true` is permanent

**Evidence:** Lines 170-181; once set, no retry.
**Impact:** GNOME Shell restart leaves provider stuck on `/proc` fallback.
**Effort:** M
**Fix sketch:** Reset on next successful dbus call; periodic health probe.
**OSS-impression:** Permanent disable after transient failure.

### [03-system-providers #11] [P1] `clipboard/windows.ts` PowerShell double-quote escape bug

**Evidence:** `clipboard/windows.ts:47-52`; `escapeForDoubleQuote` turns `$` into `` `$ `` (backtick-dollar). Inside PowerShell double-quoted strings, backtick is an escape, and `$(...)` becomes a literal dollar+continuation → may insert stray space or syntax error.
**Impact:** Strings with `$()` payloads render incorrectly or fail to paste.
**Effort:** S
**Fix sketch:** Use single-quoted PowerShell strings (`Set-Clipboard -Value '${...}'`) with single-quote escape only.
**OSS-impression:** Shell-in-PowerShell is a known footgun class.

### [03-system-providers #12] [P1] Null provider is indistinguishable from real provider

**Evidence:** `providers/{active-app,key-macro,clipboard,session}.ts` each have `createNullXxxProvider` returning a no-op interface with no diagnostic.
**Impact:** A missing capability silently degrades to "works but does nothing." Documented in `docs/solutions/runtime-errors/session-lock-provider-never-fires.md` as a previous incident.
**Effort:** M
**Fix sketch:** Null providers should publish `provider:missing` once on creation; surface in a diagnostics panel.
**OSS-impression:** Silent capability loss is a senior concern.

### [03-system-providers #13] [P1] Same `active-app` polling pattern copy-pasted 4× (darwin/windows/linux/wayland-gnome)

**Evidence:** `active-app/{darwin,windows,linux,wayland-gnome}.ts`; interval + diff-with-last + emit-on-change logic is byte-identical.
**Impact:** Bug fixes must be replicated 4×.
**Effort:** M
**Fix sketch:** Extract `createIntervalProvider({pollMs, snapshot, logger})` factory; consume in all four.
**OSS-impression:** Most obvious extraction in the providers tree.

### [03-system-providers #14] [P1] `runPowerShell` with EncodedCommand duplicated 4×

**Evidence:** `providers/{key-macro,clipboard,session,active-app}/windows.ts`; each builds a script, base64-encodes via `-EncodedCommand`, awaits stdout.
**Impact:** Bug fixes must be replicated 4×.
**Effort:** M
**Fix sketch:** Extract `runPowerShell({script, timeoutMs})` helper; consume everywhere.
**OSS-impression:** Four copies is the canonical "extract" candidate.

### [03-system-providers #15] [P1] `runYdotool` / `runWtype` are near-identical

**Evidence:** `providers/key-macro/linux.ts:432-480`.
**Impact:** Bug fixes must be replicated.
**Effort:** S
**Fix sketch:** `runKeyTool(tool, args, deps)` factory.
**OSS-impression:** Two functions, one body.

### [03-system-providers #16] [P1] `probeTool` duplicated in 3 places

**Evidence:** `system/requirements.ts:80-88`, `providers/key-macro/linux.ts:302-313`, `providers/clipboard/linux.ts:19-30`.
**Impact:** Bug fixes replicated; each site has its own quirks.
**Effort:** S
**Fix sketch:** `probeTool(executor, name, extraFsProbe?)` helper in `system/providers/shared.ts`.
**OSS-impression:** Helper extraction is the textbook refactor.

### [03-system-providers #17] [P1] `shellQuote` duplicated in 3 places

**Evidence:** `providers/key-macro/linux.ts:315-316`, `providers/clipboard/linux.ts:32-33`, `providers/clipboard/darwin.ts:23` (similar).
**Impact:** Different escape rules → inconsistency.
**Effort:** S
**Fix sketch:** Single `shellQuote(value)` in `system/providers/shared.ts`.
**OSS-impression:** Different escapes for the same construct.

### [03-system-providers #18] [P1] `escapeForPSSingleQuote` / `escapeForPSDoubleQuote` duplicated

**Evidence:** `providers/key-macro/windows.ts:153` and `providers/clipboard/windows.ts:17-18`.
**Impact:** Inconsistency between sites.
**Effort:** S
**Fix sketch:** Single helper module `providers/shared.ts` with both escapes.
**OSS-impression:** PowerShell escape duplication.

### [03-system-providers #19] [P2] `key-macro/linux.ts` scancodes inline in switch statement

**Evidence:** Lines 153-247 (~100 lines of scancode table).
**Impact:** Adding a key requires touching the switch.
**Effort:** M
**Fix sketch:** Move to `Record<keyName, number>` data table.
**OSS-impression:** Data-in-code is a senior flag.

### [03-system-providers #20] [P2] `key-macro/windows.ts` inline 130-line C# source string

**Evidence:** Lines 21-132.
**Impact:** Hard to read, hard to test, hard to diff.
**Effort:** L
**Fix sketch:** Move to `.cs` files in `providers/key-macro/windows/` and load via `fs.readFileSync`.
**OSS-impression:** Code-as-string is a smell.

### [03-system-providers #21] [P2] `clipboard/windows.ts` `cacheDir` cleanup never called

**Evidence:** `key-macro/windows.ts` defines `cacheDir` but no `rm` on shutdown.
**Impact:** Temp files accumulate.
**Effort:** S
**Fix sketch:** Register a cleanup on `signal.aborted`.
**OSS-impression:** Temp leakage.

### [03-system-providers #22] [P2] `key-macro/windows.ts:buildTypeTextPS` `LoadFrom` path depends on tmp layout

**Evidence:** Lines 289-292.
**Impact:** Multi-user systems or tmpdir cleanup break the path.
**Effort:** M
**Fix sketch:** Embed the DLL via `ReflectiveLoader` or use `Add-Type -TypeDefinition` with source; no on-disk artifact.
**OSS-impression:** Disk dependency in an in-memory operation.

### [03-system-providers #23] [P2] `key-macro/linux.ts` is 619 LoC

**Evidence:** Single biggest provider file.
**Impact:** Hard to navigate.
**Effort:** M
**Fix sketch:** Split into `linux-keytool.ts`, `linux-fallback.ts`, `linux-mapper.ts`.
**OSS-impression:** Largest provider.

### [03-system-providers #24] [P2] `clipboard/linux.ts` has no test for embedded `%`/`\n`/unicode

**Evidence:** `shellQuote + printf '%s'` chain tested only for ASCII.
**Impact:** Real clipboard payloads (URLs with `%`, multi-line code) untested.
**Effort:** S
**Fix sketch:** Add test cases for `%`, `\n`, unicode, embedded `;`.
**OSS-impression:** Missing edge-case tests.

### [03-system-providers #25] [P2] `darwin.ts` first `osascript` call blocks daemon startup ~200-500ms

**Evidence:** `providers/session/darwin.ts:48`.
**Impact:** Slow first emission; users wait.
**Effort:** S
**Fix sketch:** Mark first call as "loading" and emit a typed `unknown` state immediately; settle on next tick.
**OSS-impression:** Startup latency hidden in `await`.

### [03-system-providers #26] [P3] Provider factories have no capability advertisement

**Evidence:** `providers/{active-app,key-macro,clipboard,session}.ts` `createXxxProvider` returns the provider directly.
**Impact:** Addons can't ask "is clipboard supported on this machine?" — they just try and fail.
**Effort:** S
**Fix sketch:** Return `{ provider, capability: "real"|"null"|"degraded" }`.
**OSS-impression:** Capability discovery is a typical concern.

### [03-system-providers #27] [P3] No unit tests for null provider path on Linux

**Evidence:** `providers/session/__tests__/factory.test.ts` failing.
**Impact:** CI red; documented null behavior not validated.
**Effort:** S
**Fix sketch:** Update the test to match actual null-provider behavior, or fix the behavior.
**OSS-impression:** Failing test is a top signal.

### [03-system-providers #28] [P3] `active-app/wayland-gnome.ts` doesn't connect to Wayland registry

**Evidence:** Hard-coded GNOME Shell D-Bus extension.
**Impact:** KDE/Wayland users have no fallback.
**Effort:** L
**Fix sketch:** Probe available window-info providers; pick best; surface selection in diagnostics.
**OSS-impression:** Single-DE assumption.

### [03-system-providers #29] [P3] `key-macro/linux.ts` doesn't fall back to `dotool` automatically

**Evidence:** Probes ydotool/wtype/xdotool manually.
**Impact:** Users with `dotool` installed must configure manually.
**Effort:** S
**Fix sketch:** Add `dotool` to the probe list.
**OSS-impression:** Missing tool in detection list.

### [03-system-providers #30] [P4] Various control-character regex warnings in lint

**Evidence:** Oxlint reports control-char regexes.
**Impact:** Minor lint noise.
**Effort:** S
**Fix sketch:** Allow control ranges in `.oxlintrc.json` with comment.
**OSS-impression:** Lint warnings clutter CI.
