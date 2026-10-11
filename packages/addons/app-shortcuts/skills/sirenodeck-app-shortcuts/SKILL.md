---
name: sirenodeck-app-shortcuts
description: Configure and customize the Sireno Deck app-shortcuts addon's generated app-specific overlay decks. Use when adding, tuning, or troubleshooting its VS Code, OpenCode, Chrome, Claude Code, Slack, Teams, Discord, or Google Meet decks.
---

# App Shortcuts addon

This is a separate addon, not a Sireno Deck CLI built-in. It generates app-specific shortcut decks; its current manifest has no addon-defined button types. Do not use this skill for general Sireno Deck config or unrelated addons.

## Verify and configure

1. Confirm the selected `config.yml` and inspect its `addons` entries/includes.
2. Confirm `@sirenodeck/addon-app-shortcuts` is installed for that config. If not, explain the dependency and ask permission before running:

   ```sh
   sirenodeck install @sirenodeck/addon-app-shortcuts --config <config-path>
   ```

3. Inspect current addon source/manifest before relying on behavior: `packages/addons/app-shortcuts/src/manifest.ts` and `src/decks/*.ts` in the addon's repository. Don't assume defaults or buttons from memory if source differs.
4. The generated deck IDs are `app-shortcuts:vscode`, `app-shortcuts:opencode`, `app-shortcuts:chrome`, `app-shortcuts:claude-code`, `app-shortcuts:slack`, `app-shortcuts:teams`, `app-shortcuts:discord`, and `app-shortcuts:google-meet`.
5. Each deck defines its own process/window trigger, defaults, actions and platform-specific macros. Check the target OS and installed application; some apps share process names (notably Chrome-based Google Meet), so inspect trigger collisions before enabling auto-show for overlapping decks.
6. Use the parent addon's supported per-deck configuration/override shape from its current types and implementation. Do not add fictional `app-shortcuts:*` button types, rewrite generated button arrays, or invent override fields. Ask which deck(s) the user wants and preserve unrelated config.
7. Show the exact config patch and get approval before writing. Validate the config and report any behavior that depends on active-window detection or OS-specific key macros.
