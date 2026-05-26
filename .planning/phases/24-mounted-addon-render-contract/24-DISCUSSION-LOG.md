---
phase: 24
slug: mounted-addon-render-contract
areas_discussed:
  - Phase scope and boundary
  - Store ownership and lifetime
  - Runtime handler contract
  - Mounted deck model
  - Transient runtime props
created: 2026-05-26
---

# Phase 24: Mounted Addon Render Contract - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 24-mounted-addon-render-contract
**Areas discussed:** Phase scope and boundary, Store ownership and lifetime, Runtime handler contract, Mounted deck model, Transient runtime props

---

## Phase scope and boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Phase 24 narrow | Only remove the `createInstance(...).render()` wrapper and keep the current runtime/event/state ownership in Node. | |
| Broaden Phase 24 | Redefine Phase 24 as a runtime-contract phase: component props, addon-local store, and new authoring model while Node still owns hardware events. | ✓ |
| Split into two phases | Keep Phase 24 narrow, then define a follow-up phase for addon-local stores and the component-level runtime contract. | |

**User's choice:** `Broaden Phase 24`
**Notes:** The user explicitly chose to treat Phase 24 as a real runtime-contract redesign rather than a narrow authoring cleanup.

---

## Store ownership and lifetime

### Persistence model

| Option | Description | Selected |
|--------|-------------|----------|
| Component state only | React state lives only while a button is mounted. Leaving a deck unmounts it, so cross-deck persistence must be rebuilt elsewhere. | |
| Addon-local store + component state | React state may handle transient local UI, while durable button/addon state lives in a core-provided store that survives deck changes within the runtime session. | ✓ |
| Store only | Components are mostly pure views over a store and should not rely meaningfully on React-owned state. | |

**User's choice:** `2`
**Notes:** React local state remains valid for transient view concerns, but anything that must survive deck changes should live in the core-owned store.

### Store scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per button instance only | State is isolated by button identity only. | |
| Per addon global only | One shared store per addon coordinates all state. | |
| Both button-local and addon-wide access | Core exposes per-button state plus addon-level access to coordinate across an addon's button states. | ✓ |

**User's choice:** `2, but provide too methods, one for button store which manages the state only for the button, but another one for the addon which have access to all the addon button states`
**Notes:** The selected model is effectively both scopes, but with button-local state remaining the default isolation boundary and addon-wide access acting as a coordinated view over addon button state rather than an unstructured global bag.

### Store lifetime

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime session only | State survives navigation and deck changes, but resets on daemon restart, config reload that rebuilds runtime, or addon reload. | ✓ |
| Runtime session + config reload | Try to preserve store state across hot reloads when addon identity still matches. | |
| Persistent across restarts | Serialize state to disk and restore later. | |

**User's choice:** `1`
**Notes:** The first rollout keeps store lifetime bounded to one runtime session so persistence semantics stay honest.

---

## Runtime handler contract

| Option | Description | Selected |
|--------|-------------|----------|
| Definition-level handlers + component props | The definition exports `render` plus optional runtime handlers, and the runtime injects props into the mounted component view. | ✓ |
| Handlers declared inside the component | React-side code registers hardware semantics from inside the mounted tree. | |
| Hybrid | Support both definition-level handlers and component-defined runtime registration. | |

**User's choice:** `1`
**Notes:** Node remains the owner of hardware semantics. React receives the consequences as props and methods rather than becoming the input contract.

| Option | Description | Selected |
|--------|-------------|----------|
| `render(props) => ReactElement` | Export a plain render function as the button view entrypoint. | ✓ |
| `component: ReactComponentType<Props>` | Export a component reference and let runtime instantiate it. | |
| Both | Support either shape. | |

**User's choice:** `1`
**Notes:** The contract should stay minimal while still allowing ordinary TSX authoring.

| Option | Description | Selected |
|--------|-------------|----------|
| Props-only snapshot + setters | `render` receives store snapshots and mutation methods explicitly through props. | ✓ |
| Hook-based API | `render` reads store through Sireno-specific hooks/context. | |
| Both | Offer props and hooks. | |

**User's choice:** `1`
**Notes:** The user chose explicit props-based store access rather than a React-context-first API.

---

## Mounted deck model

| Option | Description | Selected |
|--------|-------------|----------|
| Stateless mount per render | Use React as a render description layer without a persistent mounted tree. | |
| Persistent mounted tree per active deck | Keep the active deck mounted as a long-lived React tree while it remains active. | ✓ |
| Persistent tree across all decks | Keep one long-lived app tree spanning all decks. | |

**User's choice:** `2`
**Notes:** The user explicitly clarified that the button render entry should be mounted in the deck rather than treated as an isolated one-off function call.

| Option | Description | Selected |
|--------|-------------|----------|
| Unmount inactive decks | Only the active deck stays mounted; leaving a deck unmounts its tree and clears component-local React state. | ✓ |
| Keep visited decks mounted | Preserve local React state across deck switches by keeping inactive deck trees off-screen. | |
| Configurable per deck/button | Let addons or config choose which trees remain mounted. | |

**User's choice:** `1`
**Notes:** Component-local React state is intentionally non-durable across deck changes. Durable session behavior belongs in the addon store.

---

## Transient runtime props

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime-driven props | Press/hold and similar transient input state is derived in Node and passed into the mounted tree as render props. | ✓ |
| Mirror into store | Press/hold state is written into store and read back from there. | |
| React event bridge | The mounted tree subscribes to a runtime event channel and updates itself internally. | |

**User's choice:** `1`
**Notes:** Transient input state such as `pressed` or `frameState` should remain runtime-derived props, not durable store data.

---

## Agent's Discretion

- Exact TypeScript naming for the new button-definition and render/runtime prop types.
- Exact internal store implementation, as long as it preserves button-local isolation, addon-wide coordinated access, and runtime-session-only lifetime.
- Exact shape of the mounted active-deck integration, as long as Node remains the owner of hardware semantics, navigation, polling, and command execution.

## Deferred Ideas

- Persisting addon store state across config reloads.
- Serializing addon store state across daemon restarts.
- React hook/context sugar for store access on top of the props-based contract.
- Keeping inactive deck trees mounted to preserve component-local React state across navigation.

---

*Phase: 24-mounted-addon-render-contract*
*Discussion log generated: 2026-05-26*
