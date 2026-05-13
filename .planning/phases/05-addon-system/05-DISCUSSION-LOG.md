# Phase 5 Discussion Log

**Date:** 2026-05-13
**Mode:** standard
**Outcome:** Context captured for planning

## Areas Discussed

### Button Contract

#### Visual output
- Options considered:
- `React element` (recommended): preserves one visual contract while moving feature logic out of core runtime.
- `Raw image buffer`: gives addons full rendering responsibility but duplicates layout/rendering work.
- `Either React or buffer`: too much API surface for v1.
- User choice: `React element`
- User note: asked whether React could replace scheduling.
- Resolution: React remains the output contract, but core still owns refresh triggers such as scheduling, activation, reconnect, and input-driven rerendering.

#### Lifecycle shape
- Options considered:
- `Stateful instance` (recommended): one addon instance per configured button with lifecycle methods.
- `Pure render function`: too limiting for stateful and async behaviors.
- `Hybrid`: broader API surface than needed for v1.
- User choice: `Stateful instance`

#### Refresh ownership
- Options considered:
- `Addon declares schedule, core drives it` (recommended): preserves jitter, cleanup, and daemon lifecycle guarantees.
- `Addon owns timers`: pushes lifecycle complexity into every addon.
- `No timers, action only`: incompatible with live button requirements.
- User choice: `Addon declares schedule, core drives it`

#### Input/actions model
- Options considered:
- `Event handler methods` (recommended): explicit lifecycle and self-documenting behavior.
- `Single callback`: simpler but more ambiguous and switch-heavy.
- `Render-triggered only`: too indirect.
- User choice: `Event handler methods`

#### State ownership
- Options considered:
- `Inside addon instance` (recommended): strongest decoupling from core.
- `Core-owned state bag`: reintroduces coupling.
- `Mixed model`: too ambiguous for v1.
- User choice: `Inside addon instance`

#### Immediate rerender requests
- Options considered:
- `Injected invalidate() method` (recommended): supports async state changes cleanly.
- `Return dirty flags from handlers`: weak for async/background changes.
- `Core always rerenders after every event`: wasteful and incomplete.
- User choice: `Injected invalidate() method`

#### Navigation
- Options considered:
- `Addon calls injected navigation methods` (recommended): core owns navigation state, not button-specific runtime logic.
- `Navigation stays special-cased in core`: preserves existing coupling.
- `Config-only navigation`: also preserves special knowledge in core.
- User choice: `Addon calls injected navigation methods`

### Schema Ownership

#### Schema availability timing
- Options considered:
- `Load addons before full config validation` (recommended): required for addon-owned button schemas.
- `Keep core-only config validation`: blocks addon-owned schemas.
- `Two-pass with unknown-button placeholders`: possible but more complex than necessary.
- User choice: `Load addons before full config validation`

#### Schema format
- Options considered:
- `Zod schema object` (recommended): matches current stack and error UX.
- `JSON Schema`: more portable but mismatched with the current codebase.
- `Custom validate() function`: too loose and inconsistent.
- User choice: `Zod schema object`

#### Post-validation runtime shape
- Options considered:
- `Generic descriptor + validated addon config` (recommended): keeps a stable core envelope with addon-owned payload.
- `Typed core union`: current approach; too coupled.
- `Opaque raw object only`: too little structure for runtime needs.
- User choice: `Generic descriptor + validated addon config`

#### Common field ownership
- Options considered:
- `Core owns envelope, addon owns payload` (recommended): clean separation.
- `Addon owns full object`: too much repetition and weaker runtime guarantees.
- `Core defines many shared fields`: risks rebuilding the same coupling.
- User choice: `Core owns envelope, addon owns payload`

### Runtime Injection

#### Command execution
- Options considered:
- `Injected command helpers` (recommended): centralizes logging, policy, and future controls.
- `Addon imports execa directly`: bypasses core conventions.
- `No command helper`: incompatible with current button behaviors.
- User choice: `Injected command helpers`

#### Read-only context
- Options considered:
- `Theme + button config + minimal app context` (recommended): enough context without exposing the whole config tree.
- `Entire resolved config object`: over-couples addons to global structure.
- `Only button config`: too small for theme-aware/navigation-aware behavior.
- User choice: `Theme + button config + minimal app context`

#### Generic subscription/cleanup primitive
- Options considered:
- `No, keep v1 smaller` (recommended): defer extra lifecycle API until a real addon needs it.
- `Yes, include it now`: larger permanent API surface.
- User question: asked what `generic subscription/cleanup` meant.
- Clarification given: a helper for registering external listeners and cleanup callbacks such as media subscriptions.
- User choice after clarification: `No, keep v1 smaller`

#### Method surface
- Options considered:
- `Small explicit methods` (recommended): easier to version and document.
- `Single methods object with many capabilities`: tends to become a kitchen-sink API.
- `Only invalidate + navigation`: too narrow for command-driven buttons.
- User choice: `Small explicit methods`

### Built-in Migration

#### Built-in status
- Options considered:
- `Convert built-ins into bundled addons` (recommended): one contract for built-in and external buttons.
- `Keep built-ins special`: preserves the existing architectural split.
- `Partial migration`: risks a long-lived mixed model.
- User choice: `Convert built-ins into bundled addons`

#### Loading path
- Options considered:
- `Same registry path as external addons` (recommended): one loader model and less drift.
- `Separate built-in registry module`: workable but increases drift risk.
- `Hardcoded imports in runtime`: defeats the goal.
- User choice: `Same registry path as external addons`

#### Compatibility strategy
- Options considered:
- `Yes, preserve current config surface` (recommended): easier migration but drags old assumptions forward.
- `No, redesign config now`: bigger scope, cleaner addon-first model.
- `Mostly compatible with selective cleanup`: requires naming exact exceptions.
- User choice: `No, redesign config now`

#### User-facing config shape
- Options considered:
- `Core envelope + addon fields inline` (recommended): YAML-friendly and simple.
- `Nested addon payload`: cleaner separation but more verbose.
- `Addon namespaced blocks`: overcomplicated for the first redesign.
- User choice: `Core envelope + addon fields inline`

#### Scope of the architecture shift
- Options considered:
- `Buttons first, deck types follow same principles where possible` (recommended): strong button refactor without forcing a full deck redesign.
- `Buttons only for now`: may make deck-type support feel bolted on later.
- `Full button and deck redesign together`: highest risk.
- User choice: `Buttons first, deck types follow same principles where possible`

## Agent's Discretion

- Exact naming of runtime host modules and built-in addon package layout.
- Exact method names for button instance lifecycle hooks.
- Exact shape of the minimal app context injected into addon instances.

## Deferred Ideas

- Add a generic subscription/cleanup primitive only when a real addon demands it.
- Consider a fuller deck architecture redesign in a later step if custom deck types expose a similar coupling problem.

---
*Phase: 05-addon-system*
*Discussion captured: 2026-05-13*
