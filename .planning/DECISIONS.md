# Decisions

> Locked architectural decisions, in reverse chronological order. Add new entries at the top. See `ARCHITECTURE.md` for the long-form rationale.

## 2026-07-07 — Architecture doc replaces phase ceremony

**Context:** The repo's `.planning/` carried learnship phases, quick tasks, plan files, and per-phase discussion logs. Heavy ceremony, hard to keep current. User wanted the source of truth to be a single architecture document.

**Decision:**

1. **Architecture doc lives at the repo root** — `ARCHITECTURE.md`. Mirror at `.planning/research/ARCHITECTURE.md` so the research directory stays self-contained.
2. **No phase/quick ceremony** — the v1.7 P-list (P1–P8) lives in `ROADMAP.md` as a checklist. Each P-entry becomes one PR.
3. **`AGENTS.md` is lean** — points to the architecture doc + roadmap + PITFALLS, no per-phase ceremonies.
4. **Solutions store keeps working** — `.planning/solutions/<category>/<slug>.md` with YAML frontmatter (`module`, `problem_type`, `severity`, `tags`). Future plans search before planning.

## 2026-07-07 — P1 React Router (service-driven nav)

**Decision:** Add `react-router-dom` to the frontend. Per-deck route `/decks/:deckId`. The **service** picks the active deck; the URL is the read-only projection. The frontend never decides navigation; it just renders whatever `deck-config` message the service sent, and updates the URL when `deck-active` arrives.

**Rationale:** Keeping the service authoritative means active-app overlay decks, system-back injection, and history stacks all stay server-side. The frontend stays dumb.

## 2026-07-07 — P2 gestureHandlers default-deny

**Decision:** `gestureHandlers` is an **enforced opt-in** filter (default-deny). If a backend declares `onTap/onDblTap/onHold` without listing the gesture in `gestureHandlers`, log a warning and **silently strip the undeclared handlers**. No shim, no compatibility flag — `SIRENO_ADDON_API_VERSION` stays at 1; the audit is the migration.

**Rationale:** Today any backend with `onTap` fires for any tap. The frontend can't tell the service "I don't want dbl-tap for this button." Default-deny is the only way to make the field meaningful. The audit list (9 of 10 built-ins) is in `ROADMAP.md` and ships in P2.

## 2026-07-07 — P4+P5 auto-register addon decks + `internal?: boolean`

**Decision:** Every deck an addon declares in `manifest.decks` registers at load time. User config can still *reference* an addon deck by `${addonName}:${deckKey}`. The `internal?: boolean` flag on `AddonDeckDefinition` opts a deck out of user-config discovery surfaces (CLI listing, schema completions).

**Rationale:** Today users must list addon decks in `config.yml` to use them — friction. Auto-register fixes that. The `internal` flag prevents the settings deck from polluting the user's deck list.

## 2026-07-07 — P6 SplitActionSurface on every deck

**Decision:** `SplitActionSurface` renders on the **n-1 slot of every deck** — main, sub, overlay. Primary action per deck type:

- Main deck → **settings nav** (secondary: null/empty)
- Sub-deck (navStackDepth > 1) → **back** (secondary: null/empty)
- Overlay deck → **dismiss overlay** (secondary: empty)

**Rationale:** Today the system back button only renders on overlay decks + navStackDepth>1. Sub-decks don't show a back tile; users have to long-press or use a hidden affordance. Putting it on every deck makes navigation consistent.

## 2026-07-07 — P8 backend → service rename (deferred)

**Decision:** Rename `*Backend` to `*Service` where it reads as "the long-lived Node process" (e.g., `AddonGlobalBackend` → `AddonGlobalService`, `AddonButtonBackendContext` → `AddonButtonServiceContext`). One commit, no behavior change.

**Rationale:** The user-visible surface is "the service" (the daemon). "Backend" is ambiguous — could mean the addon backend, the daemon, or the protocol peer. The rename is cheap and reduces docs churn.

**Status:** Deferred to its own PR after P1/P2/P4/P5/P6 land.

## Earlier decisions (carried over from deleted .planning/DECISIONS.md)

These were captured during Phases 67–75 and remain valid. See git history `e4fd7b7c^-` if you need the original files.

- **v1.6 ship** (Phase 67 verified) — settings button migration to `IconLabelSurface`, fixed-position `createInternalSettingsDeck()` with n-1 free for runtime-injected back button.
- **Phase 71** — `dispatchGestureEnd` extracted to `packages/cli/src/deck/gesture-state.ts`; system back button omits `onDblTap` when no overlay context.
- **Phase 72** — `CoreDeckConfigSchema.icon` field added; 4-tier icon fallback chain (configured icon → first emoji → name initial → layout-grid).
- **Phase 73** — pasteText writes to clipboard + sends paste keystroke; key-macro providers throw on failure (caught by runtime + shown via `showRuntimeButtonError`).
- **Phase 74** — `system-status-label-values` metrics capped at 1-2 (3+ rejected with hint to use `value-display`).
- **Phase 75** — `value-display` first-party addon; `SystemStatusFormatterSchema` exported from `system-status/schemas.ts`.