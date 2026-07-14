# Conventions

Sireno Deck has a lean, opinionated style. The architecture is the spec; conventions here make changes cheap.

## Code style

- **Strict TypeScript.** `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`. No `any` outside boundary shims.
- **No comments by default.** Match existing style. If a comment is needed, name the ceiling or the non-obvious invariant — never narrate.
- **oxfmt + oxlint** as the only formatter/linter. No ESLint, no Prettier.
- **Import alias `@/*`** for paths 3+ levels up. Enforced by `.oxlintrc.json`.
- **No default exports.** Named exports only — easier to refactor, easier to find with code search.
- **No barrel files** unless the directory is a public API surface (`addon/api.ts`, `addon/index.ts`).

## Patterns

- **Two addon-deck shapes:** `AddonDeckFactory` (no config) vs `AddonDeckDefinition` (config-aware). **Prefer `AddonDeckDefinition` for new code.**
- **Two button-backend contexts:** per-button (`AddonButtonServiceContext`) vs per-addon-global (`AddonGlobalService`). The runtime wires both.
- **Service-driven nav.** Active deck is decided by the runtime; frontend URL is read-only projection. Never let the SPA decide navigation.
- **Gesture-source-agnostic runtime.** Each transport owns detection (real: `device.onKeyEvent`; emulator: `emulator/gesture.ts`); runtime only sees `tap | dbl-tap | hold`.
- **Wire format is gestures.** No raw `key-event` messages. `button-action {deckId, position, gesture}` only.

## Zod

- **Use `.min().max("msg")` directly.** Never `.refine()` / `.superRefine()` — they wrap in `ZodEffects` and break `.shape` consumers.
- Schemas live next to the type they describe. `addon/api.ts` is the canonical example.

## Errors

- **Per-button ErrorBoundary** in `Deck.tsx` — one broken button doesn't kill the deck.
- **`showRuntimeButtonError`** in the runtime surfaces backend errors back to the UI.
- **Providers throw on failure** (e.g. key-macro). The runtime catches and surfaces.

## Naming

- **"Service" = the long-lived Node daemon.** "Backend" is ambiguous (could mean daemon, addon backend, or protocol peer) — avoid in new code. `*Backend` rename to `*Service` shipped in v1.7 P8.
- **Addon namespace:** `${addonName}:` prefix on every key in `manifest.buttonTypes` and `manifest.decks`. Enforced by registry.
- **Channel IDs:** `addon:domain:thing` style. Per-button gestures: `runtime:gesture:${buttonId}`.

## Addon authoring rules

- **Manifests declare `apiVersion: 1`.** `SIRENO_ADDON_API_VERSION` is the runtime's matching constant.
- **`internal?: true`** hides a deck from user-facing discovery surfaces (CLI listing, completions).
- **`gestureHandlers?: readonly GestureKind[]`** is enforced default-deny — declared-or-stripped at invoke time.
- **`defaultButton?: string`** in `AddonManifestV1` — the canonical "entry button" of the addon (e.g. `emoji-selector:launcher`). Not yet wired through the config resolver.
- **`gestureHandlers` today:** only `media` and `emoji-selector` declare it.

## What NOT to do

- Don't import from `packages/cli/src/` into `packages/cli/frontend/` or `packages/cli/emulator/`. oxlint will block.
- Don't emit `button-action` from the chrome SPA. The chrome SPA is display-only; emulator SPA owns emission.
- Don't use `.refine()` / `.superRefine()` on Zod schemas.
- Don't add barrel re-exports inside `packages/cli/src/` unless it's a public API surface.
- Don't write a new gesture detector — extend `core/gesture-state.ts`.
- Don't push past `EXACT 1 of each concern per commit`. One PR = one concern.