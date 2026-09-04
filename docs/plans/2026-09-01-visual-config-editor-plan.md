---
title: Visual Config Editor - Corrective Implementation Plan
type: feat
date: 2026-09-04
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
deepened: 2026-09-04
---

# Visual Config Editor - Corrective Implementation Plan

## Goal Capsule

Build the emulator-hosted visual config editor as a thin client over the
existing Node-owned config and runtime model. The editor must be able to show
and edit the active configured deck, including when it is displayed as an
overlay, while treating addon-generated decks and buttons according to their
actual ownership. Every visible physical slot must map back to an unambiguous
source mutation target before the UI offers an edit action.

This plan supersedes the current uncommitted implementation strategy where the
UI infers source ownership from runtime deck IDs, page suffixes, array indexes,
and local key positions. Those guesses must not be extended.

Product Contract preservation: unchanged in intent; the implementation units,
boundaries, and verification requirements are restructured to correct the
source/projection model and to reflect the settled interaction requirements.

## Problem Frame

The existing emulator preview is useful, but configuration remains a manual
YAML task. The visual editor needs to persist valid configuration edits,
refresh the running runtime without restart, and preserve the existing WS-only
process boundary. The current worktree has a large partial implementation, but
it has several correctness failures:

- Generated addon decks are listed but cannot be edited through their addon
  override records.
- Overlay and paginated runtime deck IDs are mistaken for YAML source deck IDs.
- Physical positions are mistaken for source button array indexes.
- Preview gestures and edit selection share the same pointer path.
- Root and included YAML source permissions are inconsistent.
- Deck metadata and addon overrides do not reliably trigger a full runtime
  rebuild.
- The icon catalogue includes exports that the runtime cannot resolve.

## Product Contract

### Requirements

- **R1. Editor surface:** Show the active runtime deck, configured decks,
  addon-generated decks, addon-provided buttons, and themes in separate editor
  areas. Keep the deck form visible for the active deck even when that deck is
  an overlay.
- **R2. Source ownership:** Every runtime surface identifies its configured
  source deck, generated/projection status, overlay status, page index, and the
  source target for each editable button.
- **R3. Preview gestures:** Clicking a preview key performs the same tap,
  double-tap, or hold gesture path as the emulator. Editing must use an explicit
  edit affordance and must not silently turn preview clicks into mutations.
- **R4. Button editing:** Add, delete, duplicate, copy, paste, configure, and
  move configured buttons. Generated addon buttons are visible but read-only.
- **R5. Deck editing:** Edit name, icon, background, pagination, trigger, and
  auto-show metadata. Create regular user decks with validated IDs. IDs are
  immutable after creation.
- **R6. Addon decks:** Show generated addon decks and allow editing their
  persisted addon/deck override when the addon exposes that capability. Do not
  materialize generated buttons into user YAML.
- **R7. Physical positions:** Keep the existing runtime/YAML zero-based position
  convention. Display positions to users as 1-15 for the default 15-key device,
  converting only at the UI boundary. Reserve N-1 for system injection and
  N-2 for pagination navigation when pagination actually uses it.
- **R8. Persistence and safety:** Validate every mutation before an atomic
  write, preserve comments and include boundaries, reject arbitrary paths, and
  provide session-scoped undo with stale-revision protection.
- **R9. Live refresh:** A successful mutation rebuilds the authoritative config,
  runtime projections, addon inventory, deck tree, and active hardware/emulator
  output through one refresh path.
- **R10. Device behavior:** Preserve real-device selection in hardware mode and
  expose virtual device choices only in emulator mode.

### Scope Boundaries

- Deferred: public CLI mutation commands, MCP integration, persistent undo,
  materializing generated addon decks into user YAML, and arbitrary filesystem
  editing.
- Excluded: direct runtime-only mutations, shell execution from the editor,
  editing internal/system addon types, changing the existing zero-based YAML
  position contract, and adding a second deck model in the browser.

## Key Technical Decisions

### KTD1. Runtime projections are explicit data, not inferred IDs

The Node side will produce serializable editor descriptors for configured source
decks, generated addon decks, overlay surfaces, and paginated surfaces. A
descriptor carries source deck identity, projection identity, addon ownership,
overlay status, page index, key count, reserved slots, and button-level source
targets. React must not parse `-pN`, use runtime IDs as YAML keys, or treat a
physical position as an array index.

The source target is revision-scoped, not a new persisted button ID: it contains
the canonical source path, source deck ID, source button index/path, and an
expected button fingerprint. Mutations re-resolve that target under the
requested revision and reject if the fingerprint no longer matches. This keeps
the current YAML shape while preventing a page-local index from silently
editing a different button.

### KTD2. Physical positions remain zero-based internally

Existing runtime, hardware, and YAML code uses positions `0..keyCount-1`.
Preserve that contract. The editor may render a human label `1..keyCount`, but
all WS messages and mutations use zero-based positions. A 15-key paginated
surface reserves position 14 for pagination navigation when the runtime does;
position 13 is not reserved unless the current paginator says so. Tests must
derive these slots from the same device/pagination rules as production.

### KTD3. Selection and preview are separate actions

The iframe remains the preview and normal key clicks dispatch gestures. The
editor overlay will provide an explicit edit control per key or an adjacent
accessible position list. It must not cover the iframe key surface or intercept
normal pointer events. Open menus and keyboard shortcuts may edit, but only
after the user has selected a source target.

### KTD4. Deck identity is immutable and validated at creation

Creation accepts an ID once and stores it as the YAML map key. Update mutations
never accept an ID change. IDs must be valid YAML/config identifiers, unique
against configured deck IDs; generated projection IDs are a separate runtime
namespace and are checked for collisions during materialization. Complete metadata
must be validated before the write. Page IDs are runtime projections, not a
second user-created identity unless the existing config explicitly models them.

### KTD5. Generated deck editing uses addon override ownership

Generated buttons and generated deck layout remain addon-owned. The descriptor
must carry the addon index/name and override key needed by
`set-addon-deck-override`. If no override capability exists, the deck form and
button controls show the reason instead of sending a root-deck mutation.

The first override capability is the existing addon config convention in
`packages/cli/src/cli/commands/addon-decks.ts`: an addon deck is overridable
when its generated ID can be addressed by `addons[i].config.decks.<deckId>` and
the supported fields are the existing `AddonDeckOverride` fields (`name`,
`icon`, `autoShow`, `trigger`, and opaque `config` where the addon factory
accepts it). No new manifest flag is required for this version. The protocol
must expose the supported field schema and the exact addon index/key.

### KTD6. One authoritative refresh path

Editor mutations, watcher reloads, theme changes, addon config changes, and
device changes must converge on one Node-side operation: reload source graph,
validate, rebuild runtime projections/providers as required, refresh inventory
and tree metadata, publish editor state, and broadcast normal deck state. Do
not rely on a watcher racing the mutation response.

### KTD7. Source permissions are enforced before presentation

The source graph returns canonical paths and source kinds. The root YAML is
editable through structured visual mutations; included YAML sources may be
edited in the text surface only when they are reachable and YAML. Non-YAML,
unreachable, symlink-ambiguous, and arbitrary paths never appear as editable
choices.

### KTD8. The icon picker uses the runtime-supported resolver

Do not invent a second icon registry from every `lucide-react` export. Expose a
stable supported-name catalogue or share the resolver's normalization rules.
Picker selection, deck icon fields, and button schema icon fields must use the
same source contract. `icon://name` values use the runtime catalogue;
`asset://`, `addon://`, `builtin://`, emoji, and path values are preserved and
shown as non-catalog sources rather than silently converted. Asset writes remain a separate operation with
explicit failure handling and no false undo claim.

### KTD9. Name the two editor interaction layers

The iframe is the **preview surface** and owns gesture dispatch. The editor's
buttons, menus, and source-target list are the **edit controls** and own
selection/mutation. “Overlay” in runtime descriptors means a runtime overlay
deck only; it must not be confused with an edit-control overlay in the config
UI. Edit controls cannot sit over the iframe's key hit targets.

### KTD10. Reuse the production pagination owner

`packages/cli/src/deck/paginate-deck.ts` owns page materialization and
`packages/cli/src/core/pagination.ts` owns pagination action/state semantics.
The editor descriptor consumes both; it does not infer pagination from IDs or
duplicate either implementation. The descriptor carries the exact reserved
positions returned by the production surface calculation.

## Existing Patterns To Preserve

- WS-only cross-process communication: `packages/cli/src/api/protocol-internal.ts`
  and `packages/cli/src/render/protocol.ts`.
- Runtime as the source of truth: `packages/cli/src/deck/runtime/runtime.ts`.
- Existing projection rules: `packages/cli/src/deck/deck-config.ts`,
  `packages/cli/src/deck/paginate-deck.ts`, and
  `packages/cli/src/deck/system-back-injection.ts`.
- Atomic YAML/include handling: `packages/cli/src/config/include-resolver.ts`
  and the `yaml` document APIs.
- Addon ownership and manifest shape: `packages/cli/src/addon/api.ts` and
  `packages/cli/src/addon/registry.ts`.
- Prior overlay and icon learnings:
  `docs/solutions/runtime-errors/overlay-deck-n1-split-surface-regression.md`
  and `docs/solutions/conventions/stale-addon-dist-causes-lucide-icons-overlay-name-blink.md`.

## Implementation Units

### U0. Establish a clean corrective baseline

**Goal:** Stop compounding the current partial implementation.

**Files:** The current modified files listed by `git status`, plus the baseline
commit immediately before the visual-editor work; relevant tests under
`packages/cli/config-ui/src/__tests__/` and `packages/cli/src/**/__tests__/`.

**Approach:** Compare the current diff against the baseline commit and this
plan. Classify each hunk as retain, rewrite, or delete before implementation.
Retain only independently correct fixes with a test and an owner in this plan.
Rewrite or delete UI code that guesses source ownership, page identity, or
physical-slot indexes. Do not preserve code merely because a unit test was added
for it. Do not use an uncommitted working-tree snapshot as the architectural
baseline.

**Proof:** The focused baseline tests pass before each subsequent unit is
implemented; the implementation does not begin with known full-suite failures
being reclassified as acceptable.

### U1. Build the canonical source graph and mutation contract

**Goal:** Make safe source edits and identity rules correct independently of the
UI.

**Files:**

- `packages/cli/src/config/include-resolver.ts`
- `packages/cli/src/config/mutation.ts`
- `packages/cli/src/config/schemas.ts`
- `packages/cli/src/config/validation.ts`
- `packages/cli/src/config/__tests__/include-resolver.test.ts`
- `packages/cli/src/config/__tests__/mutation.test.ts`
- `packages/cli/src/config/__tests__/schemas.test.ts`

**Approach:** Return canonical source descriptors with root/included and YAML
kind. Filter non-YAML sources before they reach the UI. Validate deck IDs,
complete deck creation metadata and immutable updates,
button references, sparse positions, and reserved-position constraints at the
mutation boundary. Keep atomic writes, comments, include tags, serialization,
queueing, and undo. Keep mutation addressing source deck IDs and source button
identities, not projections.

**Test scenarios:**

- Create a deck with all supported metadata and reject invalid/duplicate IDs.
- Update metadata without allowing an ID change.
- Validate configured IDs independently, then reject materialized addon IDs that
  collide with configured decks while retaining the owner in the diagnostic.
- Add, update, delete, duplicate, and move buttons with sparse positions.
- Swap physical positions without changing source array order accidentally.
- Reject moves involving immutable string/reference buttons unless a supported
  source mutation exists.
- Preserve comments, `!include` boundaries, and file modes through atomic writes.
- Exclude non-YAML and unreachable paths; canonicalize symlinked included paths.
- Reject invalid source/config edits without writing.
- Roll back on write/validation failure and restore the previous snapshot on undo.

### U2. Model runtime surfaces and source targets

**Goal:** Expose a single authoritative mapping from runtime surfaces to source
decks, source buttons, physical positions, and reserved system slots.

**Files:**

- `packages/cli/src/deck/deck-config.ts`
- `packages/cli/src/deck/paginate-deck.ts`
- `packages/cli/src/core/pagination.ts`
- `packages/cli/src/deck/system-back-injection.ts`
- `packages/cli/src/cli/commands/addon-decks.ts`
- `packages/cli/src/deck/runtime/runtime.ts`
- `packages/cli/src/api/protocol-internal.ts`
- `packages/cli/src/render/protocol.ts`
- New focused model module only if the mapping cannot remain in the existing
  deck-config layer.
- `packages/cli/src/deck/__tests__/position-buttons.test.ts`
- `packages/cli/src/deck/__tests__/system-back-injection.test.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts`
- Protocol/editor handler tests.
- `packages/cli/src/deck/__tests__/editor-surfaces.test.ts` (new).

**Approach:** Add strict serializable editor metadata. Each surface includes
`sourceDeckId`, projection/runtime ID, `pageIndex`, `isOverlay`, `editable`,
`addonOwner`, `reservedPositions`, and each button's source target plus local
physical position. A target includes canonical source path, source button index,
expected fingerprint, and mutation capability. Use the production paginator and
system injection logic; do not duplicate it in React. Represent human position
labels as a presentation concern only.

**Test scenarios:**

- Non-paginated deck with implicit and explicit sparse positions.
- Paginated deck page-to-source mapping and page navigation slot.
- Main, nested regular, overlay-root, and locked system N-1 behavior.
- Different device key counts and column layouts.
- Overlay navigation preserves runtime semantics while exposing editable source
  metadata.
- String/reference and generated buttons have no false editable source target.
- Malformed metadata is rejected by the strict protocol schema.
- A complete fixture asserts all descriptor fields together for configured,
  paginated, overlay, generated, string-reference, and system surfaces.

### U3. Make runtime refresh authoritative

**Goal:** Ensure every valid editor edit updates runtime, hardware/emulator
output, editor metadata, and addon state through one path.

**Files:**

- `packages/cli/src/cli/commands/run.ts`
- `packages/cli/src/config/config-diff.ts`
- `packages/cli/src/render/editor-handler.ts`
- `packages/cli/src/render/ws-bridge.ts`
- `packages/cli/src/outputClient/emulator.ts`
- `packages/cli/src/outputClient/real.ts`
- `packages/cli/src/render/__tests__/editor-refresh.integration.test.ts` (new)
- `packages/cli/src/render/__tests__/editor-handler.test.ts`
- `packages/cli/src/render/__tests__/ws-bridge.test.ts`
- `packages/cli/src/cli/commands/__tests__/run.test.ts`

**Approach:** Extract or correct the shared reload operation. It must consume
the just-written source, validate and materialize it, refresh deck projections,
editor metadata, themes, and configured deck projections, then broadcast the
normal runtime state. Include deck metadata, triggers, pagination, and theme
changes in change detection. Serialize mutation/reload effects and make
revision/result ordering deterministic. `select-deck` must select the editor
surface without changing overlay semantics; runtime navigation remains owned by
`navigateToDeck`/`setOverlay`.

**Test scenarios:**

- Button and deck metadata mutations update the active preview and hardware
  output without restart.
- Theme changes reload the relevant frontend without stale presentation.
- New/deleted decks update tree and selection state.
- Watcher reload and editor mutation do not race or double-apply stale state.
- Stale revisions reject without writing; reconnect receives current state.
- Real and emulator outputs share the same runtime gesture/action path.
- One integration fixture observes source reload, projection rebuild, inventory
  and tree refresh, editor revision, and exactly one normal deck broadcast.

### U4. Correct addon inventory and generated-deck ownership

**Goal:** Make all addon-provided buttons/decks discoverable and actionable
according to ownership.

**Files:**

- `packages/cli/src/cli/commands/run.ts`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/addon/registry.ts`
- `packages/cli/src/cli/commands/addon-decks.ts`
- `packages/cli/src/render/ws-bridge.ts`
- `packages/cli/src/render/editor-handler.ts`
- `packages/cli/config-ui/src/pages/AddonsPage.tsx`
- `packages/cli/config-ui/src/pages/EditorPage.tsx`
- `packages/cli/src/cli/commands/__tests__/addon-decks.test.ts`
- `packages/cli/config-ui/src/__tests__/AddonsPage.test.tsx`
- Addon inventory and editor tests.

**Approach:** Serialize materialized addon button/deck definitions with addon
name/index, internal flag, generated/source status, overlay/pagination state,
default button, schema, and override capability. Do not use placeholder IDs or
hardcoded `isOverlay: false`. Map addon deck selection to its override record.
Generated buttons render read-only; configured buttons render editable. Refresh
inventory whenever config/addon state changes.

**Test scenarios:**

- Core, Pomodoro, app-shortcuts, and test addons expose all non-internal button
  types and decks that are actually registered.
- Default addon buttons appear with their declared default config.
- Internal addon types/decks are hidden.
- Generated deck selection shows its addon-owned form or an explicit reason it
  cannot be overridden.
- Override writes target the correct addon entry and deck ID.
- Overlay addon decks retain overlay status and select without regular-nav
  substitution.
- A generated deck without override capability cannot send a root-deck
  mutation, including when its runtime ID resembles a configured deck.

### U5. Implement deck and button editor forms

**Goal:** Provide correct form behavior once source metadata and mutation targets
exist.

**Files:**

- `packages/cli/config-ui/src/pages/EditorPage.tsx`
- `packages/cli/config-ui/src/pages/ButtonConfigEditor.tsx`
- New small form components only where repeated fields justify them.
- `packages/cli/config-ui/src/__tests__/EditorPage.test.tsx`
- `packages/cli/config-ui/src/__tests__/App.test.tsx`
- `packages/cli/src/cli/commands/__tests__/run.test.ts`
- `packages/cli/config-ui/src/__tests__/ButtonConfigEditor.test.tsx`
- `packages/cli/src/render/__tests__/icon-source-resolver.test.ts`

**Approach:** Keep deck form separate from button form and always render it for
the active surface. For a configured overlay, edit configured deck metadata; for
an addon-generated overlay, edit its override if supported. Make ID immutable
after creation and validate before sending. Drive button forms from serialized
schemas, hide unsupported/internal controls, and send source-target mutations
only. Use the runtime-supported icon catalogue and shared `Icon` normalization;
support clearing icons without inventing invalid values.

**Test scenarios:**

- Active main, regular, paginated, and overlay decks all show the deck form.
- Generated decks show override controls or a clear read-only explanation.
- Creation validates ID, persists complete metadata, and never presents an ID
  rename control.
- Updating name/icon/background/pagination/trigger/auto-show sends the correct
  source mutation.
- Schema primitives, enums, arrays, nested objects, defaults, and unsupported
  schemas behave predictably.
- Icon search selects valid runtime names, handles aliases, and clears safely.
- The exact saved value is `icon://name`; deck and button fields share resolver
  parity, while non-catalog sources remain unchanged.
- Failed save leaves form state and persisted config consistent.

### U6. Implement physical-slot interaction without gesture regressions

**Goal:** Make preview, selection, drag/drop, and keyboard/touch editing
coexist.

**Files:**

- `packages/cli/config-ui/src/DeckFrame.tsx`
- `packages/cli/config-ui/src/gesture.ts`
- `packages/cli/config-ui/src/pages/EditorPage.tsx`
- `packages/cli/config-ui/src/App.tsx`
- `packages/cli/config-ui/src/Shell.tsx`
- `packages/cli/config-ui/src/SidePanel.tsx`
- `packages/cli/config-ui/src/__tests__/DeckFrame.test.tsx`
- `packages/cli/config-ui/src/__tests__/App.test.tsx`
- `packages/cli/config-ui/src/__tests__/EditorPage.test.tsx`
- `packages/cli/config-ui/src/__tests__/gesture.test.ts`

**Approach:** Keep iframe key clicks as tap/double-tap/hold preview gestures.
Use explicit edit buttons/menus or an accessible source-target list outside the
iframe overlay. Drag/drop and move actions consume descriptor targets, not
physical indexes. Render position labels consistently, disable reserved/system
slots, and make collapsed navigation/header metadata usable on desktop and
mobile without intercepting deck input.

**Test scenarios:**

- Tap, double-tap, and hold dispatch the expected WS `button-action` frame.
- Opening an edit menu never dispatches a preview gesture.
- Edit controls work with keyboard and touch-sized targets.
- Sparse, paginated, overlay, and reserved positions mutate the correct source
  button.
- Copy/paste/duplicate/delete/undo use source identities and preserve selection.
- Collapsed sidebar labels remain discoverable through title/accessible names.
- Reconnect/loading/error states do not leave an iframe or editor overlay frozen.
- Double-tap and hold are covered through the component path, not only the pure
  detector; edit-menu opening produces no `button-action` frame.

### U7. Verification, documentation, and browser proof

**Goal:** Verify the integrated editor against both configured and dynamic deck
behavior before considering the work complete.

**Files:**

- `packages/cli/docs/user/emulator-vs-hardware.mdx`
- Relevant config/addon documentation.
- `packages/cli/config-ui/playwright.config.ts` (new, if Playwright is the
  selected runner)
- `packages/cli/config-ui/e2e/visual-config-editor.spec.ts` (new)

**Approach:** Run focused tests after each unit, then repository lint/format/
typecheck/full tests. Start the emulator using the repository command and use
`agent-browser` to inspect both emulator and frontend surfaces. Rebuild addon
dist before testing addon icons/decks, following the existing stale-dist
learning.

**Browser scenarios:**

- Emulator opens with WS connected, iframe loaded, and deck grid visible.
- Frontend opens on `/decks/main` with rendered buttons.
- Preview gesture logs/actions are visible and match physical behavior.
- Main, regular, paginated, and overlay deck forms are usable.
- Create a deck, edit its metadata, restart, and confirm persistence.
- Addon-generated deck overrides and generated-button read-only behavior work.
- Move buttons across physical positions, including reserved-slot rejection.
- Included YAML editor lists only permitted YAML sources and preserves includes.
- Icon picker selects a valid icon and renders it in preview.
- Reconnect, mutation failure, undo, and clean shutdown behave correctly.
- Hardware mode preserves discovered real-device selection, while emulator mode
  exposes only virtual device choices.
- The repeatable browser suite covers the same flows; manual `agent-browser`
  checks remain the final daemon/hardware smoke proof.

## Dependency Order

1. U0 establishes the corrected baseline.
2. U1 defines safe source mutations and identity validation.
3. U2 defines the projection/source mapping consumed by every UI action.
4. U3 defines addon materialization and inventory ownership on top of U1-U2.
5. U4 makes state refresh reliable for configured and addon mutations.
6. U5 builds forms against the stable descriptors and mutation contract.
7. U6 adds interaction behavior without changing runtime semantics.
8. U7 performs integrated browser and release-quality verification.

## Risks And Mitigations

- **Projection/source drift:** Centralize descriptors in Node and test every
  surface kind before UI work.
- **Reserved-slot regressions:** Reuse production pagination and system-injection
  rules; test 15-key, mini, and XL models.
- **Overlay semantic regression:** Keep selection separate from runtime
  navigation and preserve `setOverlay`/`goBack` behavior.
- **Partial writes:** Validate expanded config before atomic replacement and
  retain rollback tests.
- **Addon dist staleness:** Rebuild addon packages during browser verification;
  do not diagnose stale compiled definitions as editor inventory bugs.
- **Protocol breakage:** Add strict variants additively and test malformed,
  stale, and reconnect frames.
- **Current dirty worktree contamination:** U0 explicitly audits and removes
  invalid partial paths before later units are built.

## Verification Contract

- `pnpm lint` (if the full process exceeds available memory, run targeted
  `pnpm exec oxlint` and record the limitation rather than hiding it).
- `pnpm format` and `pnpm format:check`.
- `pnpm typecheck`.
- `pnpm test --run` with all existing failures fixed or explicitly diagnosed.
- Emulator startup with the repository command and `agent-browser` checks from
  U7.
- No arbitrary filesystem path appears in the source editor.
- No UI action can send a mutation without a valid source target.

## Definition Of Done

- R1-R10 are implemented with focused tests and browser proof.
- The UI never derives source ownership from runtime IDs, page suffixes, array
  indexes, or physical positions.
- Deck IDs are immutable after creation.
- Generated addon buttons remain addon-owned; addon deck overrides work where
  supported.
- Preview gestures still execute through the runtime path.
- Valid edits persist atomically, undo correctly, and refresh runtime/hardware
  without restart.
- Full verification is green, or every remaining failure is a separately
  documented pre-existing issue with a clear follow-up.
