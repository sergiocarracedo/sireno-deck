# Architecture Research

**Domain:** Stream Deck management CLI + addon system
**Researched:** 2026-05-12
**Confidence:** HIGH

## Component Boundaries

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLI Layer (yargs)                            │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │  start   │  │   stop   │  │  status  │  │  addon install   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘    │
├───────┴─────────────┴─────────────┴─────────────────┴───────────────┤
│                         Orchestrator                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ ConfigLoader │  │DeviceManager │  │     AddonRegistry        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
├─────────┴──────────────────┴──────────────────────┴─────────────────┤
│                       Render Engine                                   │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │ DeckController   │  │PollScheduler │  │  ImageOutput (sharp)  │   │
│  └────────┬─────────┘  └──────┬───────┘  └───────────┬───────────┘   │
│           │                   │                       │               │
│  ┌────────┴───────────────────┴───────────────────────┴───────────┐  │
│  │              Custom React Reconciler (react-reconciler)         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │  │
│  │  │ ButtonComp A │  │ ButtonComp B │  │  Addon Button Comp   │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                      Hardware Layer                                   │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │          @elgato-stream-deck/node (node-hid transport)       │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| CLI Layer | Parse user commands, show help, manage process lifecycle | yargs with subcommands |
| ConfigLoader | Load and validate config.yml and theme YAML files | js-yaml + zod schema |
| DeviceManager | Detect, open, close, and monitor Stream Deck devices | @elgato-stream-deck/node |
| AddonRegistry | Scan, validate manifests, and load addon modules | import() with zod manifest validation |
| DeckController | Manage active deck, button layout, navigation stack | In-memory state with config-driven initialization |
| PollScheduler | Run periodic state/display updates at configured intervals | setInterval with cleanup registry |
| React Reconciler (Custom) | Convert React component trees to image buffers | react-reconciler with custom HostConfig for sharp |
| ImageOutput | Composite React output onto Stream Deck key buffers | sharp SVG compositing + raw buffer output |
| ButtonTypeRegistry | Register built-in and addon button types for instantiation | Map<string, ButtonTypeDefinition> |
| ActionExecutor | Execute button actions (commands, deck changes, state transitions) | execa for commands; internal for deck nav |

## Data Flow

### Primary Data Flow

```
config.yml ──parse──> ConfigLoader ──validate──> Zod Schema ──pass──> Orchestrator
                                                                         │
                                                    ┌────────────────────┤
                                                    ▼                    ▼
                                              DeckController       AddonRegistry
                                                    │                    │
                                                    ▼                    ▼
                                              Button Instances     Button Types
                                                    │                    │
                                                    ▼                    │
                                              React Reconciler ◄─────────┘
                                                    │
                                                    ▼
                                              Image Buffer (sharp)
                                                    │
                                                    ▼
                                              @elgato-stream-deck/node ──> Stream Deck Hardware
                                              
User Input (button tap) ──> @elgato-stream-deck/node ──event──> Orchestrator ──> ActionExecutor
                                                                                    │
                                                    ┌───────────────────────────────┤
                                                    ▼                               ▼
                                              Change Deck                     Execute Command
                                              (DeckController)                (execa)
```

### Data Flow Description

| Flow | Source | Destination | Format | Notes |
|------|--------|-------------|--------|-------|
| Config load | config.yml (disk) | ConfigLoader | YAML → typed object | js-yaml.load() → zod.parse() |
| Device connection | Stream Deck hardware | DeviceManager | HID reports | node-hid provides raw HID; library wraps into key events |
| Button render | React component tree | ImageOutput | Raw RGBA buffer | Reconciler creates pixel buffers; sharp composites to Stream Deck format |
| Button key write | ImageOutput | Stream Deck hardware | BMP/JPEG buffer | @elgato-stream-deck/node `fillImage()` per key index |
| Button tap event | Stream Deck hardware | Orchestrator | Key index + event type | Library emits 'down'/'up'; we debounce and classify (tap, double-tap, hold) |
| Command execution | ActionExecutor | System process | stdio (execa) | User-defined command; output captured for display buttons |
| State polling | PollScheduler | ActionExecutor | Function call | State command executed on interval; result updates button state |
| Addon loading | Addon folder/npm package (disk) | AddonRegistry | ES module | Dynamic `import()` with manifest validation |
| Deck navigation | ActionExecutor | DeckController | Deck ID | Push/pop navigation stack; trigger full deck re-render |

## Build Order

Suggested implementation sequence based on dependencies:

| Order | Component | Dependencies | Rationale |
|-------|-----------|--------------|-----------|
| 1 | Project scaffold + TypeScript config | None | Monorepo setup, build tooling, package.json, tsconfig |
| 2 | CLI entry point (yargs skeleton) | #1 | Command structure before any logic; helps guide development |
| 3 | ConfigLoader + zod schemas | #2 | Config schema drives button/deck definitions; no business logic depends on it but everything reads it |
| 4 | DeviceManager (hardware connection) | #1 | Must prove hardware connectivity early; highest integration risk |
| 5 | Custom React reconciler prototype | #3 | Highest technical risk; must validate that reconciler → sharp → device works end-to-end |
| 6 | ImageOutput (sharp pipeline) | #4, #5 | Composes reconciler output onto device buffers; completes the rendering chain |
| 7 | ButtonTypeRegistry + built-in button types | #3, #5 | Register display-only, action, toggle, change-deck types |
| 8 | DeckController + navigation | #3, #6, #7 | Manage active deck, layout, back navigation |
| 9 | ActionExecutor + PollScheduler | #4, #7 | Periodic updates and command execution |
| 10 | AddonRegistry + manifest validation | #3, #7 | Load external addons; validates the full extension model |
| 11 | Theme system | #6 | Apply theme tokens during rendering |
| 12 | Built-in live data buttons | #8, #9 | CPU, memory, fan speed — depends on scheduler and rendering |
| 13 | Built-in media control | #7, #9 | Toggle with external state; depends on toggle type and polling |
| 14 | Emoji selector addon (first-party) | #10, #8 | Validates the addon model end-to-end with a complex addon |

## Integration Points

### External Integrations

| Integration | Type | Protocol | Auth | Notes |
|-------------|------|----------|------|-------|
| @elgato-stream-deck/node | SDK | node-hid (USB HID) | None (requires Linux udev rules) | Must handle device disconnect/reconnect gracefully |
| systeminformation | SDK | OS-level (sysfs, /proc, WMI, IOKit) | None (OS-level access) | Cross-platform; some readings may fail on Linux without lm-sensors |
| execa (child processes) | SDK | stdio streams | None (shell/OS permissions) | User-defined commands; must set timeouts and handle non-zero exits |

### Internal Boundaries

| Boundary | Left Side | Right Side | Contract |
|----------|-----------|------------|----------|
| Button type registration | AddonRegistry / Built-in | ButtonTypeRegistry | `Map<string, { createButton(config): ButtonType }>` |
| Render cycle | DeckController | React Reconciler | `<DeckLayout buttons={ButtonComponent[]} theme={Theme} />` → RGBA buffers |
| Image output | React Reconciler | @elgato-stream-deck/node | Raw buffer (Stream Deck BMP format) + key index → `device.fillImage(keyIndex, buffer)` |
| Addon loading | AddonRegistry | Addon module | Manifest (zod-validated) → `{ buttonTypes, deckTypes, assets }` |
| State polling | PollScheduler | Button instances | `(buttonId, interval) => void` → `button.updateState()` called on interval |
| Action dispatch | DeviceManager (key events) | ActionExecutor | `{ keyIndex, gesture: 'tap'|'doubleTap'|'hold' }` → side effect |
| Config schema | ConfigLoader | Zod | `configSchema.parse(yamlContent)` → typed `SirenoConfig` |

## Recommended Project Structure

```
sireno-deck/
├── src/
│   ├── cli/                    # yargs command definitions
│   │   ├── index.ts            # CLI entry point (main binary)
│   │   └── commands/           # Subcommand handlers (start, stop, status)
│   ├── core/                   # Domain types and interfaces
│   │   ├── types.ts            # Button, Deck, Theme, Config types
│   │   └── schemas.ts          # Zod validation schemas
│   ├── config/                 # Config loading and validation
│   │   ├── loader.ts           # YAML loading with js-yaml
│   │   └── theme.ts            # Theme loading and defaults
│   ├── device/                 # Stream Deck hardware abstraction
│   │   ├── manager.ts          # DeviceManager: detect, open, close
│   │   └── events.ts           # Key event handling
│   ├── render/                 # React reconciler + image output
│   │   ├── reconciler.ts       # Custom react-reconciler host config
│   │   ├── components/         # Built-in React button components
│   │   └── output.ts           # sharp-based image buffer output
│   ├── deck/                   # Deck and button runtime
│   │   ├── controller.ts       # DeckController: navigation, layout
│   │   ├── buttons/            # Built-in button type implementations
│   │   └── scheduler.ts        # PollScheduler for periodic updates
│   ├── addon/                  # Addon system
│   │   ├── registry.ts         # AddonRegistry: scan, validate, load
│   │   ├── manifest.ts         # Manifest schema and validation
│   │   └── loader.ts           # Dynamic module loading
│   ├── action/                 # Action execution
│   │   └── executor.ts         # Command execution, deck changes
│   └── util/                   # Shared utilities
│       └── logger.ts           # Pino logger instance
├── addons/                     # Default addon directory (user-installed addons)
├── builtin-addons/             # First-party addons shipped with the CLI
│   └── emoji-selector/         # Example built-in addon
├── config.yml                  # Default/example config
├── themes/                     # Built-in theme YAML files
│   ├── dark.yml
│   └── light.yml
├── package.json
├── tsconfig.json
└── README.md
```

---
*Architecture research for: Stream Deck CLI management tool*
*Researched: 2026-05-12*
