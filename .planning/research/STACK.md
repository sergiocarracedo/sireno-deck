# Stack Research

**Domain:** v1.2 session context and surface composition
**Researched:** 2026-05-17
**Confidence:** HIGH

## Recommended Stack

### Keep The Existing Core Stack

| Technology | Version / Source | Role In This Milestone | Why |
|------------|------------------|------------------------|-----|
| TypeScript | existing repo `~5.7` | widen addon/runtime/render contracts safely | This milestone is mostly API and schema growth, not a rendering rewrite. Existing strict TS is the right guardrail. [HIGH: codebase scan] |
| React + `react-reconciler` | existing repo `^19.x` | keep addon render authoring on the current custom element surface | The reconciler already converts `deck-*` elements into narrow render descriptions. New wrappers/styles should extend that surface instead of bypassing it. [HIGH: codebase scan] |
| `sharp` SVG rasterization | existing repo `^0.34` | text fitting, wrapper rendering, background composition | The renderer already builds SVG strings and rasterizes them with `sharp`. `sharp` text rendering supports bounded width/height fitting and wrap modes, but the current repo mostly uses manual SVG `<text>`, so fitting should be explicit and tested. [HIGH: https://sharp.pixelplumbing.com/api-constructor/] |
| `systeminformation` | existing repo `^5.x` | OS type, variant, version discovery | `si.osInfo()` exposes `platform`, `distro`, and `release`, which map cleanly to the requested OS context. [HIGH: https://systeminformation.io/os.html] |
| Linux `loginctl` / `systemd-logind` | platform command, not npm dependency | lock-state and session-state detection on Linux | `loginctl show-session` is the computer-parsable interface for session properties, including `LockedHint` and `IdleHint`. [HIGH: https://manpages.ubuntu.com/manpages/noble/en/man1/loginctl.1.html] |
| YAML + zod | existing repo | config layering, locked deck config, wrapper/style registration | The repo already validates user config and addon config through zod-backed schemas. New background and lock-deck settings should stay there. [HIGH: codebase scan] |

### Milestone-Level Recommendations

| Recommendation | Use | Why |
|---------------|-----|-----|
| Add a dedicated runtime session-context service | OS metadata + lock state + dim timer | The current runtime has no host/session seam. This milestone needs one place that polls host state and fans it out to config templating, button instances, and deck switching. [HIGH: codebase scan] |
| Keep `systeminformation` only for OS metadata | `platform`, `distro`, `release` | It is already in the repo and directly covers the requested OS fields. Do not stretch it into lock-state detection because that is not the contract it documents. [HIGH: https://systeminformation.io/os.html] |
| Use `loginctl show-session` with explicit property selection on Linux | `LockedHint`, `IdleHint`, `State`, session id resolution | The man page explicitly distinguishes human-readable `session-status` from computer-parsable `show-session`. [HIGH: https://manpages.ubuntu.com/manpages/noble/en/man1/loginctl.1.html] |
| Model text fitting as renderer contract, not ad hoc SVG clipping | `fit`, `clip`, `wrap`, future extensibility | The current render types only expose `overflow: "clip"`. That is too narrow for this milestone and will produce drift if fitting is hidden inside one renderer path. [HIGH: codebase scan] |
| Register wrapper/style primitives globally in the addon registry | addon-provided global visuals | The current addon registry only handles buttons, decks, and assets. Global wrappers/styles need registry-backed identity to avoid addon-local hidden magic. [MEDIUM: codebase inference] |

## Alternatives Considered

| Recommended | Alternative | Why Not Preferred |
|-------------|-------------|-------------------|
| Extend current registry with global style/wrapper primitives | Let each addon smuggle styles through button config only | That kills reuse and makes global primitives impossible to validate or document cleanly |
| Add a session-context service owned by core runtime | Let each button or addon shell out for lock state / OS data | Duplicates polling, drifts semantics, and creates per-button host probing overhead |
| Extend current SVG renderer contract | Introduce a second canvas/text-layout engine | Splits the rendering model and creates two paths for backgrounds, wrappers, and text fitting |
| Use explicit fallback precedence for backgrounds | Let each renderer variant decide its own background fallback | Guarantees drift across visuals and makes config behavior impossible to reason about |
| Add command-driven toggle variants to built-ins | Force addon authors to reimplement toggles every time | Built-in toggle behavior is a core UX surface and should be standardized |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Per-button shelling to detect OS info | wasteful and inconsistent | one shared OS/session context snapshot in core |
| Human-readable `loginctl session-status` parsing | unstable output for code | `loginctl show-session --property=... --value` |
| Renderer-local background precedence | each visual will drift | one resolved background contract before variant rendering |
| Distorting text as the default fit strategy | ugly output on tiny keys | shrink to a minimum readable size, then clip; separate wrap mode |
| Addon-local wrapper semantics without registry identity | undocumented hidden coupling | explicit globally registered wrapper/style primitives |

## Versions

### Relevant Compatibility Notes

| Concern | Recommendation | Notes |
|---------|----------------|-------|
| `systeminformation` | keep current v5 usage for `osInfo()` | The docs site advertises 5.31.6 and notes v6 is coming with breaking changes; do not plan around unreleased v6 semantics. [HIGH: https://systeminformation.io/] |
| Linux lock detection | target `loginctl` / `systemd-logind` first | This is the most documented Linux path. Non-systemd environments should be treated as an explicit degraded path, not silently guessed. [HIGH: Ubuntu Noble manpage] |
| `sharp` text fitting | verify bounded text behavior with tests and images | `sharp` supports width/height-constrained text generation and wrap modes, but the repo currently uses hand-built SVG text, so contract changes need direct coverage. [HIGH: https://sharp.pixelplumbing.com/api-constructor/] |

---
*Stack research for: v1.2 session context and surface composition*
*Researched: 2026-05-17*
