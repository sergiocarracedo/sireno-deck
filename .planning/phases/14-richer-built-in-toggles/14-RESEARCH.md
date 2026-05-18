# Phase 14 Research: Richer Built-in Toggles

**Date:** 2026-05-18
**Phase:** 14 - Richer Built-in Toggles

## Don't Hand-Roll

- Use `z.discriminatedUnion()` for the single built-in `toggle` config contract instead of hand-written conditional validation. Zod's discriminated unions are explicitly designed for object schemas that share a discriminator key and produce more targeted branch errors than a loose union-plus-refine approach. [CITED: https://github.com/colinhacks/zod/blob/main/packages/docs/content/api.mdx] [CITED: https://github.com/colinhacks/zod/blob/main/packages/docs-v3/README.md]
- Keep mode-specific visuals inside the existing `deck-button` variant seam rather than widening the renderer with new primitives or a separate toggle scene model. The repo already compounded this pattern for single-key live visuals like the analog clock. [VERIFIED: `.planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md`]
- Reuse the existing runtime lifecycle and polling host in `packages/cli/src/deck/runtime.ts` instead of inventing a second toggle runtime. The runtime already owns activation, refresh cadence, reconnect behavior, command execution, and render invalidation. [VERIFIED: `packages/cli/src/deck/runtime.ts`]

## Common Pitfalls

- **Inferring toggle mode from whichever command fields happen to exist.** This makes validation mushy and produces bad config errors. The context and Zod prior art both point to one explicit discriminator field instead. [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`] [CITED: https://github.com/colinhacks/zod/blob/main/packages/docs/content/api.mdx]
- **Resetting runtime-owned internal state at activation boundaries.** The repo already hit this bug: internal toggles were treated like externally rehydratable buttons and snapped back to their initial state on deck switches and reconnects. [VERIFIED: `.planning/quick/007-preserve-internal-toggle-state-across-deck-activation-and-reconnect/007-SUMMARY.md`] [VERIFIED: `CHANGELOG.md`]
- **Guessing command-driven truth before the first read succeeds.** For external-authority toggles, guessed startup state will drift immediately when the outside system changed out of band. The user explicitly rejected that; startup should be visibly pending/unavailable until a real read arrives. [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]
- **Treating `toggle-status` as a local inversion.** A write-only toggle command does not prove the resulting state. If the command fails or the external system changes independently, local inversion lies. `toggle-status` must reconcile through a required `status_command`. [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]
- **Letting command output parsing turn into a mini-language.** Regexes or fuzzy heuristics would widen the public contract fast. The user approved explicit `on_values` / `off_values` token lists with narrow defaults; keep it there. [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]
- **Forking three bespoke toggle renderers.** The user wants visible mode differences, but only through shared-base mode accents. A new renderer per mode would increase verification and drift risk without adding product value. [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]

## Existing Patterns in This Codebase

- `builtin-addons/core-buttons/src/index.ts` is the existing home for bundled general-purpose buttons like `display-text` and `change-deck`, so it is the right first home for the new built-in `toggle` definition. [VERIFIED: `builtin-addons/core-buttons/src/index.ts`]
- `builtin-addons/date-time/src/index.ts` shows the current bundled-button pattern: config schema in the addon, runtime state inside `createInstance()`, and narrow render output through `deck-button` plus `variant` when needed. [VERIFIED: `builtin-addons/date-time/src/index.ts`]
- `packages/cli/src/render/text-image.ts` already supports `variant: "toggle"` and uses narrow branches for bespoke visuals like `analog-clock`, `calendar-sheet`, `metric`, and `fan`. This is the right seam for shared-base plus mode-accent toggle visuals. [VERIFIED: `packages/cli/src/render/text-image.ts`]
- `packages/cli/src/render/reconciler.ts` and `packages/cli/src/render/types.ts` already carry toggle-flavored props through the public render contract, so mode-specific metadata can stay narrow and explicit there. [VERIFIED: `packages/cli/src/render/reconciler.ts`] [VERIFIED: `packages/cli/src/render/types.ts`]
- `packages/cli/src/config/loader.test.ts` and `packages/cli/src/core/schemas.ts` already pin the repo's preferred validation style: early failure with path-aware diagnostics for config-authored errors. [VERIFIED: `packages/cli/src/core/schemas.ts`] [VERIFIED: `packages/cli/src/config/loader.test.ts`]
- `packages/cli/src/deck/runtime.ts` owns command execution and refresh scheduling, so authoritative read/write flows should integrate there rather than bypassing it. [VERIFIED: `packages/cli/src/deck/runtime.ts`]

## Recommended Approach

- Build Phase 14 as **one built-in `toggle` button type** with a discriminated `mode` contract:
  - `internal`
  - `get-set`
  - `toggle-status`
  [HIGH confidence] [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`] [CITED: https://github.com/colinhacks/zod/blob/main/packages/docs/content/api.mdx]
- Keep shared presentation fields on the base contract and support optional `on` / `off` override objects for state-specific label, subtitle, and icon differences. [HIGH confidence] [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]
- Implement the toggle as a bundled addon definition in `builtin-addons/core-buttons/src/index.ts`, with per-instance closure state for internal mode and command-driven per-instance state machines for external modes. Do not teach the core runtime a separate generic toggle engine if the bundled addon can own the behavior through the existing button-instance seam. [HIGH confidence] [VERIFIED: `builtin-addons/core-buttons/src/index.ts`] [VERIFIED: `packages/cli/src/deck/runtime.ts`]
- For command-driven modes, treat command reads as authoritative and writes as provisional:
  - startup renders pending/unavailable until the first read
  - `get-set` chooses `set_on_command` or `set_off_command` from the last authoritative state
  - `toggle-status` requires `status_command` and reconciles through it after every tap
  - failed writes keep the last authoritative truth plus an error treatment
  [HIGH confidence] [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]
- Support narrow state parsing with canonical trimmed/case-folded defaults plus optional explicit `on_values` / `off_values` token lists. [MEDIUM confidence] [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]
- Keep the toggle UI inside the existing `variant: "toggle"` render family and differentiate modes with restrained accents, badges, or subtitle treatment rather than new renderer branches per mode. [HIGH confidence] [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`] [VERIFIED: `.planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md`]
- Ship committed review fixtures and UAT coverage as each authority model lands. Phase 14 should end with real review paths for `internal`, `get-set`, and `toggle-status`, not just unit coverage. [HIGH confidence] [VERIFIED: `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`]

## Sources

- Zod docs, discriminated unions:
  - https://github.com/colinhacks/zod/blob/main/packages/docs/content/api.mdx
  - https://github.com/colinhacks/zod/blob/main/packages/docs-v3/README.md
- Repo prior art and code:
  - `.planning/phases/14-richer-built-in-toggles/14-CONTEXT.md`
  - `.planning/quick/007-preserve-internal-toggle-state-across-deck-activation-and-reconnect/007-SUMMARY.md`
  - `.planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md`
  - `builtin-addons/core-buttons/src/index.ts`
  - `builtin-addons/date-time/src/index.ts`
  - `packages/cli/src/core/schemas.ts`
  - `packages/cli/src/deck/runtime.ts`
  - `packages/cli/src/render/text-image.ts`
