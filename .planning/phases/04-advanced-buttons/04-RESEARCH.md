# Phase 4: Advanced Buttons — Research

**Researched:** 2026-05-12
**Phase goal:** Ship toggle buttons (internal and external state) and live data buttons for CPU, memory, fan speed, and media control.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| CPU and memory metrics | Use `systeminformation` async APIs behind a small local adapter module | The project already selected `systeminformation` in the stack, and its docs expose async system data APIs across Linux/macOS/Windows. Keeping it behind one adapter prevents runtime code from depending directly on platform quirks. | [VERIFIED: AGENTS.md tech stack], [CITED: systeminformation.io/gettingstarted.html], [CITED: systeminformation.io] |
| CPU load polling | Use `systeminformation` stats-style dynamic polling, not ad-hoc shell parsing | The docs explicitly call out stats functions as interval-based and note that rate-style values become meaningful on repeated calls. That matches the existing scheduler model better than parsing `/proc` or shell output ourselves. | [CITED: systeminformation.io/statsfunctions.html], [CITED: systeminformation.io/general.html] |
| Memory usage polling | Use `systeminformation.mem()` and derive percentage in the adapter | The memory docs expose `total`, `used`, `active`, and `available`, which gives a stable source for a button percentage/text view without OS-specific parsing. | [CITED: systeminformation.io/memory.html] |
| Media control integration on Linux | Keep media button command-driven and let users point at `playerctl` commands | `playerctl` already exposes `play-pause`, `status`, and metadata formatting for title/artist/time. That fits the Phase 4 decisions better than adding a bespoke MPRIS integration now. | [CITED: github.com/altdesktop/playerctl] |
| Rich button rendering | Continue rendering SVG -> `sharp` raw buffers rather than introducing a second rendering engine | The existing render pipeline already uses SVG passed to `sharp`. Richer built-in layouts can stay in the same path and preserve the Phase 2/3 device-write model. | [VERIFIED: packages/cli/src/render/text-image.ts], [VERIFIED: packages/cli/package.json], [CITED: sharp.pixelplumbing.com] |

## Common Pitfalls

### Polling only the startup deck
**What goes wrong:** Live buttons in sub-decks never update, or old deck pollers keep running after navigation.  
**Why:** The current runtime starts schedulers once in `start()` for the initial active deck only.  
**How to avoid:** Move scheduler setup/teardown to active-deck activation so only the visible deck polls. This matches the locked Phase 4 decision that inactive decks do not poll.  
[VERIFIED: packages/cli/src/deck/runtime.ts]

### Treating `cpu()` metadata as CPU usage
**What goes wrong:** A CPU button shows model/speed info instead of actual current load.  
**Why:** `systeminformation` separates static CPU metadata from dynamic stats/load functions.  
**How to avoid:** Put all live CPU reads behind a dedicated adapter and plan the button around dynamic values only, not `cpu()` metadata.  
[CITED: systeminformation.io/cpu.html], [CITED: systeminformation.io/general.html]

### Assuming temperature/fan data exists everywhere
**What goes wrong:** Fan/temperature buttons silently render junk or empty values on machines without sensors, on macOS without extra packages, or on Linux without sensor tooling.  
**Why:** The docs explicitly call out platform caveats: macOS temperature requires extra packages, Linux may require `lm-sensors`, and some values can be empty or privilege-sensitive.  
**How to avoid:** Build an explicit unavailable state into the adapter and render layer. Do not treat missing sensor data as exceptional control flow.  
[CITED: systeminformation.io/cpu.html], [CITED: systeminformation.io/issues.html]

### Overloading one `label` string for rich layouts
**What goes wrong:** CPU bars, media metadata, and fan fallback all get jammed into one string, making the render path fragile and ugly.  
**Why:** The current render payload is only `{ keyIndex, label, icon }`, which is enough for Phase 3 but too narrow for Phase 4's richer built-in layouts.  
**How to avoid:** Widen the render description minimally for advanced built-ins instead of encoding layout structure into label text.  
[VERIFIED: packages/cli/src/render/reconciler.ts], [VERIFIED: packages/cli/src/render/text-image.ts], [VERIFIED: .planning/phases/04-advanced-buttons/04-DISCOVERY.md]

### Hand-rolling media discovery
**What goes wrong:** We build a custom MPRIS or DBus integration before Phase 5 and take on player-selection edge cases too early.  
**Why:** Player selection, metadata formatting, and active-player ordering are already solved by `playerctl`/`playerctld`.  
**How to avoid:** Keep Phase 4 media buttons command-driven with `status_command` and multiline `display_command`, exactly as decided in discussion.  
[CITED: github.com/altdesktop/playerctl], [ASSUMED] This remains the best v1 fit unless future requirements demand first-class multi-player discovery.

## Existing Patterns in This Codebase

- **Config validation in one place:** `packages/cli/src/core/schemas.ts` already centralizes built-in button config validation. Reuse that pattern for `toggle`, `cpu`, `memory`, `fan`, and `media`. [VERIFIED: packages/cli/src/core/schemas.ts]
- **Command execution boundary:** `packages/cli/src/action/executor.ts` already normalizes command execution results with timeout handling. Reuse it for external toggle/media commands instead of adding a second shell runner. [VERIFIED: packages/cli/src/action/executor.ts]
- **Per-button runtime state:** `packages/cli/src/deck/runtime.ts` already keeps state keyed by `deckId:keyIndex`. Expand that map rather than inventing a second state store. [VERIFIED: packages/cli/src/deck/runtime.ts]
- **Jittered polling:** `packages/cli/src/render/scheduler.ts` already provides the scheduler behavior needed for dynamic buttons. The missing piece is deck-aware lifecycle, not a new scheduler. [VERIFIED: packages/cli/src/render/scheduler.ts], [VERIFIED: packages/cli/src/deck/runtime.ts]
- **Thin startup orchestration:** `packages/cli/src/cli/commands/start.ts` composes config, lifecycle, and render callbacks without owning button behavior. Preserve that boundary. [VERIFIED: packages/cli/src/cli/commands/start.ts]
- **SVG-to-sharp rendering:** `packages/cli/src/render/text-image.ts` already uses SVG composition rendered through `sharp`. Rich button layouts can extend this path without changing the device API. [VERIFIED: packages/cli/src/render/text-image.ts]

## Recommended Approach

Use Phase 4 to extend the existing built-in runtime rather than introducing a new button subsystem. [VERIFIED: .planning/phases/04-advanced-buttons/04-DISCOVERY.md] Add advanced button schemas first, then implement deck-aware polling lifecycle plus a broader per-button runtime state model so toggle/media/live-data buttons can share the same dispatcher and render callbacks. [VERIFIED: packages/cli/src/deck/runtime.ts], [VERIFIED: packages/cli/src/core/schemas.ts] Keep system metrics behind a small `systeminformation` adapter and keep media command-driven via `playerctl`-style commands, which matches the locked discussion decisions and avoids premature platform-specific integrations. [CITED: systeminformation.io/gettingstarted.html], [CITED: github.com/altdesktop/playerctl]
