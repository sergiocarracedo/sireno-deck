# 01 — Security

---

## [S1] [P0] Token not enforced in production WS bridge

**Evidence:** `packages/cli/src/cli/commands/run.ts:1401`

```ts
await startWsBridge({ port: config.wsPort ?? 52937 })
```

`expectedToken` is never passed. In `packages/cli/src/ws-bridge.ts:124-139`:

```ts
const schema = expectedToken ? wsMessage.withToken(expectedToken) : wsMessage // ANY message accepted — no auth
```

Every WS client can send any message without authentication.

**Same as beta review P0 #15.** Not addressed.

**Impact:** Any process on localhost can control the Stream Deck and invoke addon methods without a token.

**Effort:** Low — one-line fix: pass `expectedToken` (already available in `config.token` or generated in preflight).

**Fix sketch:**

```ts
await startWsBridge({
  port: config.wsPort ?? 52937,
  expectedToken: config.token,
})
```

**OSS-impression:** Reviewer asks "is this safe?" — answer is no. Immediate red flag.

---

## [S2] [P0] `sendToCaller` broadcasts method-call results to all clients

**Evidence:** `packages/cli/src/ws-bridge.ts:249-254`

```ts
function sendToCaller(caller: ws.WebSocket, data: object) {
  for (const client of wss.clients) {
    if (client.readyState === ws.WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  }
}
```

The `caller` parameter is received but ignored. The function iterates all clients. Method-call results (which can contain arbitrary addon data) are broadcast to every connected WebSocket client.

**Impact:** Privacy/data leak. An addon's method response goes to the emulator, the frontend, and any debugging client — regardless of which client made the call. Violates least-privilege and data containment.

**Effort:** Low — change the loop to send only to `caller`.

**Fix sketch:**

```ts
function sendToCaller(caller: ws.WebSocket, data: object) {
  if (caller.readyState === ws.WebSocket.OPEN) {
    caller.send(JSON.stringify(data))
  }
}
```

**OSS-impression:** The function name and parameter signature suggest correct intent; the body contradicts it. Looks like a copy-paste of `broadcast` with the filter removed.

---

## [S3] [P1] All protocol schemas lack `.strict()`

**Evidence:** `packages/cli/src/api/protocol-internal.ts` — 21 schemas defined with `.extend()` but never chained with `.strict()`:

- `helloMessage`
- `helloAckMessage`
- `deckConfigMessage`
- `deckConfigAckMessage`
- `stateMessage`
- `stateAckMessage`
- `deckActiveMessage`
- `deckActiveAckMessage`
- `deckLayoutMessage`
- `deckLayoutAckMessage`
- `buttonErrorSetMessage`
- `buttonErrorClearMessage`
- `callerHelloMessage`
- `callerHelloAckMessage`
- `addonInventoryRequestMessage`
- `addonInventoryResponseMessage`
- `providerRegisterMessage`
- `providerRegisterAckMessage`
- `wsMessage`
- `wsMessageWithToken`
- `callerWsMessage`

Project convention (`ARCHITECTURE.md` and `AGENTS.md`) mandates `.strict()` on protocol schemas. Without it, messages carrying extra unknown keys pass validation silently — a schema evolution hazard.

**Typecheck impact:** Many of the 357 typecheck errors are downstream of this. Schema inference without `.strict()` produces wider types that don't match callers expecting narrow protocol types.

**Impact:** Forward-compatibility hazard. New message fields silently accepted where they should be rejected. Makes schema evolution unpredictable.

**Effort:** Medium — mechanical change across one file, but may surface latent type mismatches in callers (the 357 errors).

**Fix sketch:** Add `.strict()` to every schema. `z.object({...})` already outputs strict schemas; only `.extend()`-based schemas need the explicit `.strict()` chain.

---

## [S4] [P2] `npm install` for addons not pinned to lockfile

**Evidence:** `packages/cli/src/addon/loader.ts:324`

Uses `execSync("npm install", { cwd: addonDir })` to install external addon dependencies. No `--no-package-lock`, no `--frozen-lockfile`, no integrity check. If the addon ships a `package-lock.json`, `npm install` may mutate it; if it doesn't, dependencies float.

**Impact:** Non-deterministic builds. External addons may pull different dependency trees across installs. If the addon ships a lockfile, `npm install` may update it silently.

**Effort:** Low — use `npm ci` when a lockfile exists, `npm install --no-package-lock` otherwise.

**Fix sketch:**

```ts
const hasLockfile = fs.existsSync(path.join(addonDir, "package-lock.json"))
execSync(hasLockfile ? "npm ci" : "npm install --no-package-lock", {
  cwd: addonDir,
})
```

---

## [S5] [P3] PID file identity not verified

**Evidence:** `packages/cli/src/util/daemon.ts` — PID file read/write logic.

(Carry-over from beta review S7. The daemon writes a PID file but never verifies it belongs to a `sirenodeck` process before trusting it.)

**Impact:** If another process reuses the PID, the daemon may send signals to the wrong process.

**Effort:** Low — read `/proc/<pid>/cmdline` on Linux, `ps -p <pid> -o comm=` on macOS.

---

## [S6] [P4] WS bridge auth bypass when `expectedToken` is undefined

**Evidence:** `packages/cli/src/ws-bridge.ts:124-139`

The conditional `expectedToken ? wsMessage.withToken(expectedToken) : wsMessage` means any caller that forgets to pass `expectedToken` gets a permissive schema with zero compile-time feedback. TypeScript should catch this — `expectedToken` should be required.

**Impact:** Defense-in-depth failure. If a future refactor removes the token argument, the bridge silently becomes open.

**Effort:** Low — make `expectedToken` required in `StartWsBridgeOptions`, or at minimum log a warning when starting without one.

**OSS-impression:** Auth-in-depth gap. "Forgot to pass token" should not equal "no auth."
