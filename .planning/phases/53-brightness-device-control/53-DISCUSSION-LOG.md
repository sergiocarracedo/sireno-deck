# Phase 53 Discussion Log — Brightness device control

**Phase:** 53
**Discussed:** 2026-06-08
**Mode:** discuss (standard, not deep)

## Areas explored

### Device registry: where do open handles live? (selected)

**Question:** `setBrightnessAll` iterates "every currently open device handle" (per ROADMAP). Where do those handles live?

**Options presented:**
1. **New module `device/registry.ts`** (recommended) — singleton Set + register/unregister helpers. Simple, testable.
2. **Extend `StreamDeckLifecycle`** with a `listOpenHandles()` method. No new module, but the lifecycle becomes responsible for tracking handles.
3. **Static Set inside `stream-deck.ts`**. No new file but adds global state to a 545-line file.

**User chose:** **New module `device/registry.ts`** (recommended). Confirmed.

**Reasoning captured:** Clean separation. The lifecycle calls `registerDeviceHandle` on connect and `unregisterDeviceHandle` on close. The new `setBrightnessAll` lives in the same module as the registry — one place to look. Testability is clean via `_resetDeviceRegistryForTests`.

---

### Brightness persistence: in-memory or config-driven? (selected)

**Question:** ROADMAP says "persisted on the handle for reconnect". Is this in-memory only, or persisted to disk via `config.yml`?

**Options presented:**
1. **In-memory private field on the handle** (recommended) — `lastBrightness: number`. Re-applied on reconnect. Lost on daemon restart. Matches ROADMAP's "persists for the session" wording.
2. **Persist to `config.yml`** — cross-session persistence. More user-facing but more schema work.
3. **Both** — in-memory + optional config override.

**User chose:** **In-memory private field** (recommended). Confirmed.

**Reasoning captured:** "Persists for the session" is explicit. A config-driven approach adds a `device.brightness: number` schema field, a default-value story, and a "what if the config has a stale value" footgun. The in-memory approach is honest: the brightness is what the user just set, period.

---

### Error handling in `setBrightnessAll`: best-effort contract? (selected)

**Question:** ROADMAP says "failures on individual devices are logged but do not abort the pass". What is the API contract?

**Options presented:**
1. **Log + continue; return summary** (recommended) — catches each per-device error, logs via `StreamDeckLogger`, continues. Returns `{ succeeded, failed, errors }` so callers know the partial-failure state.
2. **Log + continue; no return value** — caller has no way to know how many succeeded.
3. **Throw on first error** — simpler but contradicts the ROADMAP's explicit "do not abort the pass".

**User chose:** **Log + continue; return summary** (recommended). Confirmed.

**Reasoning captured:** A summary return is cheap and gives the future settings deck (phase 54) a way to surface "set 3 of 4 devices; 1 failed" without losing the partial success. Throwing would force the caller to wrap in try/catch and lose the partial-success info anyway.

---

### Phase 53 scope: device layer only, or also a built-in brightness button? (selected)

**Question:** ROADMAP says "future UI surfaces can change the hardware brightness". Is phase 53 just the device-layer API, or does it also ship a built-in brightness button for testing?

**Options presented:**
1. **Device layer only** (recommended) — only the API. Phase 54 settings deck is the first real consumer.
2. **Also a built-in brightness button** — a fixed UI surface as a sanity check. Adds UI scope.
3. **Device + a CLI subcommand** — headless / debug use.

**User chose:** **Also a built-in brightness button.** NOT the recommended option — the user explicitly chose the broader scope.

**Reasoning captured:** The user wants a built-in `brightness` button that exercises the API in production, not just in tests. The button cycles 0/25/50/75/100 on tap and calls `setBrightnessAll`. This is a real consumer of the registry, not a throwaway test harness. The plan should still be vertical-sliced: 53-01 is the device layer, 53-02 is the button.

---

## Out-of-scope items surfaced

- **Per-app brightness profiles** — not in v1.5.
- **Brightness up/down on the system back button** — owned by phase 54 (settings deck).
- **CLI subcommand for brightness** — deferred.
- **Cross-session brightness persistence** — deferred; in-memory only.
- **An LED backlight control** (different hardware feature) — not in v1.5.

## Wrap-up

User confirmed all 4 decisions above (registry, persistence, errors, scope). CONTEXT.md generated. Ready for `plan-phase 53`.
