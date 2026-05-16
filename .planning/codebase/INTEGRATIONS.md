# Integrations

## Hardware

- Stream Deck device access uses `@elgato-stream-deck/node` in `packages/cli/src/device/stream-deck.ts`
- The lifecycle layer handles device listing, selection by serial, reconnect loops, button event subscriptions, and buffer replay
- Linux-specific access handling exists through `packages/cli/src/device/linux-udev.js`, referenced from `packages/cli/src/cli/commands/start.ts`

## Local System / OS

- Shell commands are executed through the action subsystem using `execa`, wired into addon button methods from `packages/cli/src/deck/runtime.ts`
- Config discovery uses the current working directory and XDG config home in `packages/cli/src/config/loader.ts`
- PID-file daemon behavior is controlled from `packages/cli/src/util/daemon.js`, used by `packages/cli/src/cli/commands/start.ts`

## Addon Loading

- Local addons are resolved from configured paths relative to config cwd in `packages/cli/src/addon/loader.ts`
- npm addons are resolved with Node resolution through `createRequire(...).resolve(...)` in `packages/cli/src/addon/loader.ts`
- Addon manifests live in package.json under `sirenoAddon`, validated by `packages/cli/src/addon/manifest.js`

## Config / Theme Files

- Main config is YAML at `config.yml` or XDG fallback in `packages/cli/src/config/loader.ts`
- Themes are YAML files resolved from `themes/*.yml` or explicit paths in `packages/cli/src/config/theme.ts`

## External Services

- No remote HTTP APIs, databases, auth providers, queues, or webhooks are present in the current codebase
- The architecture is local-process and hardware-facing, not network-service-facing

## Security-Sensitive Boundaries

- Addons are trusted in-process code; there is no sandbox layer yet, reflected in `.planning/PROJECT.md`
- Shell command execution is a deliberate capability exposed to button methods
- Config validation is the main input hardening layer before runtime start
