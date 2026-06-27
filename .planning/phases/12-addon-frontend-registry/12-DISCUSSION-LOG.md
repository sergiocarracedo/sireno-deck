# Phase 12 — Discussion Log

**Date:** 2026-06-27
**Mode:** standard
**Participants:** user, opencode

## Areas Discussed

### 1. State data source (R-data)

**Q1: Where does the data for live renders (clock, weather, CPU) come from?**
- (A) All from CLI via WS, including OS state.
- (B) Frontend self-contained (browser calls APIs directly).
- (C) Hybrid: CLI pushes high-frequency + OS-native state; frontend never calls OS APIs.

**User chose:** C (Hybrid).

**Q2: Which channel names do addons use?**
- (A) Namespace per addon: `<addon>:<key>` (recommended) — chosen.
- (B) Flat names: risk of collisions.
- (C) Each addon picks any name; manifest-driven.

**User chose:** A.

**Q3: Channel payload shape?**
- (A) Loose typed (each addon defines its own).
- (B) Shared zod schema `{ ok, data?, error? }` (recommended) — chosen.
- (C) Raw unknown.

**User chose:** B.

**Q4: How often does the CLI poll?**
- (A) Rate-limited per channel with `publishIntervalMs` in manifest + `hello-ack` (recommended) — chosen.
- (B) Push only on change.
- (C) Frontend pulls via RPC.

**User chose:** A.

### 2. Frontend import strategy (R-import)

**Q1: When are addon frontends bundled?**
- (A) Vite plugin bundles all (static).
- (B) Dynamic lazy `import()`.
- (C) Hybrid: pre-bundle builtins, lazy npm (recommended) — chosen.

**User chose:** C.

**Q2: Which addons are pre-bundled?**
- (A) Built-in addons only (recommended) — chosen.
- (B) All from config.yml.
- (C) Only active deck's addons.

**User chose:** A.

**Q3: How does the frontend know the path of an npm addon?**
- (A) Backend sends `frontendEntry` per button (recommended) — chosen.
- (B) WS-served bundle.
- (C) Pre-built into frontend bundle.

**User chose:** A.

**Q4: Vite security model for dynamic paths?**
- (A) Vite `server.fs.allow` + plugin (recommended) — chosen.
- (B) Copy addons to frontend src at startup.
- (C) No filesystem access.

**User chose:** A.

### 3. Addon frontend.tsx API contract (R-contract)

**Q1: What does frontend.tsx export?**
- (A) Default export `Component<{ config; state; onAction? }>` (recommended) — chosen.
- (B) Named exports + manifest.
- (C) Same as legacy CLI `render(ctx)`.

**User chose:** A.

**Q2: How does the addon read state?**
- (A) `useAddonChannel<T>("<addon>:<key>")` (recommended) — chosen.
- (B) State passed as prop.
- (C) Direct WS subscribe.

**User chose:** A.

**Q3: How does the addon trigger actions (play/pause, brightness up)?**
- (A) `useButtonAction(buttonId)` → WS `button-action` (recommended) — chosen.
- (B) Prop callback.
- (C) Direct ChannelRegistry.

**User chose:** A.

**Q4: Is there a shared theme CSS for addon frontends?**
- (A) Use theme tokens via CSS variables (recommended).
- (B) Theme components.
- (C) No shared styling.

**User chose:** "Share tokens and theme components" — both. Addon uses the same Tailwind classes + can import theme components.

### 4. Which addons get frontend.tsx (R-scope)

**Q1: Which builtin addons get frontend.tsx in this phase?**
- (A) All 7 user-facing (recommended) — chosen.
- (B) Just date-time first.
- (C) Simple ones only.

**User chose:** A.

**Q2: Which channel does date-time publish?**
- (A) Single `date-time:now` channel (recommended) — chosen.
- (B) Per-button channel.
- (C) No channel — client computes.

**User chose:** A.

**Q3: Does emoji-selector ship a frontend.tsx?**
- (A) Ship emoji-selector (recommended) — chosen.
- (B) Skip — theme surfaces are sufficient.

**User chose:** A.

**Q4: Do we publish state for OS-aware addons even when no buttons use them?**
- (A) Lazy: poll only when button exists (recommended) — chosen.
- (B) Eager: poll always.
- (C) Frontend triggers.

**User chose:** A.

## Areas Delegated to Agent's Discretion

- Exact zod schema for the shared channel payload (use `data: z.unknown()` for v0.2).
- Whether to render the addon when `state === null` (yes, with "Loading…" placeholder).
- Exact `publishIntervalMs` per channel (defaults documented in CONTEXT.md).

## Deferred Ideas (captured in CONTEXT.md)

- Bundle npm addons at build time (same as builtins).
- Live state editor in dev (debug overlay).
- Animations between state updates.
- Custom theme components per addon.
