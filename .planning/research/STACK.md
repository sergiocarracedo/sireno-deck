# Stack Research

**Domain:** Stream Deck management CLI + addon system
**Researched:** 2026-05-12
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ~5.7 | Language and type system for core and addons | Required by user; unified language model across the entire project and addon ecosystem |
| Node.js | >=20.x LTS | JavaScript runtime | Required by `@elgato-stream-deck` and `sharp`; LTS stability for CLI |
| @elgato-stream-deck/node | ^7.6 | Stream Deck HID communication | De facto Node.js library for Elgato Stream Deck hardware (v7.6.2, Mar 2026); supports all Stream Deck models via node-hid |
| @elgato-stream-deck/core | ^7.6 | Platform-agnostic Stream Deck abstraction | Provides image buffer format helpers and device-agnostic API; used internally by node/tcp/webhid transports |
| yargs | ^18.0 | CLI argument parsing and command routing | Most popular Node.js CLI framework (11.5k stars); TypeScript types, subcommands, help generation, completion scripts |
| React (react + react-reconciler) | ^19.x | Component-based UI rendering to image buffers | Custom reconciler renders React components to raw pixel buffers; enables shareable addon button components |
| sharp | ^0.34 | Image composition and format conversion | Fastest Node.js image processor (32k stars); SVG compositing, buffer output, Stream Deck BMP/JPEG format compatible |
| js-yaml | ^4.1 | YAML config parsing and dumping | Established YAML 1.2 parser (6.6k stars); handles user-editable config.yml with good error reporting |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| systeminformation | ^5.x | System stats (CPU, memory, fan) | For built-in live data buttons; provides cross-platform `currentLoad`, `mem`, `cpuTemperature` |
| execa | ^9.x | Child process execution with streaming | For button action commands and status commands; better error handling than raw `child_process` |
| chokidar | ^4.x | File system watching | Live-reload addon folders and config changes without restart |
| zod | ^3.x | Schema validation | Validate addon manifests, config.yml structure, and button type definitions |
| pino | ^9.x | Structured logging | High-performance logging for CLI diagnostics and addon debug output |
| ora | ^8.x | CLI spinners | Visual feedback during addon loading and device initialization |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest | Test runner | Fast ESM-native testing for TypeScript; better than Jest for TypeScript-first projects |
| tsup | Build tool | Fast TypeScript bundling powered by esbuild; produces CJS/ESM dual output |
| oxlint | Linting | Fast Rust-based linter; catches TypeScript issues during development |
| nodemon / tsx | Dev reload | Auto-restart the CLI during development |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| yargs | commander | commander is slightly lighter but lacks TypeScript-first ergonomics and built-in completion |
| yargs | clipanion | clipanion has stricter typing but less community adoption; better for yarn-style CLI architecture |
| react-reconciler | node-canvas (canvas) | node-canvas renders to a graphics context but requires native Cairo/GDK dependencies; sharp-based approach is simpler and faster for pure image output |
| sharp | jimp | jimp is pure JS (no native deps) but 10-50x slower; only if native module installs are impossible |
| js-yaml | yaml (npm package) | `yaml` handles multi-document YAML better but js-yaml is more battle-tested and has simpler API |
| systeminformation | os (built-in) | `os` module provides basic CPU/mem but lacks temp, fan, and per-core info; use only if zero-deps is critical |
| vitest | jest | jest has broader ecosystem but slower startup and worse ESM support; vitest is preferred for new TS projects |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Electron in v1 | Desktop app is explicitly out of scope for v1; adds significant complexity and binary size | CLI-first with plain Node.js; revisit for desktop app in v2 |
| commander | Weaker TypeScript integration and no built-in command completion compared to yargs | yargs |
| jimp | 10-50x slower than sharp for image processing; Stream Deck updates need to be fast (500ms refresh) | sharp |
| React DOM / full React rendering | Unnecessary; we need buffer output not browser DOM | react-reconciler with custom host config for image buffers |
| Cosmiconfig | Over-engineered for this use case; we want a single known config path | Direct js-yaml load on `./config.yml` |
| process isolation for addons (v1) | Adds sandbox complexity before the addon API is stable; the user explicitly chose trusted in-process for v1 | Trusted in-process with zod manifest validation |
| WebHID transport (`@elgato-stream-deck/webhid`) | Browser-only; CLI needs node-hid transport | `@elgato-stream-deck/node` |

## Versions

### Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @elgato-stream-deck/node@^7.6 | @elgato-stream-deck/core@^7.6 | Monorepo; always lock to same major |
| react-reconciler@^0.31 | react@^19.x | Must match React major version; reconciler versioning is decoupled from React version |
| sharp@^0.34 | Node.js >=18.17 or >=20.3 | Node-API v9 requirement; check `process.versions.napi` |
| yargs@^18.0 | Node.js >=18 | Latest major; dropped CJS entry point in v18 |

### Installation

```bash
# Core
npm install @elgato-stream-deck/node @elgato-stream-deck/core yargs react react-reconciler sharp js-yaml

# Supporting
npm install systeminformation execa chokidar zod pino ora

# Dev dependencies
npm install -D typescript vitest tsup @types/react @types/yargs @types/sharp
```

---
*Stack research for: Stream Deck CLI management tool*
*Researched: 2026-05-12*
