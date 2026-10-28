---
name: sirenodeck-config
description: Configure and safely update Sireno Deck YAML decks, buttons, addons, and themes. Use when a user asks to create, edit, troubleshoot, or improve a Sireno Deck config.yml, add a button such as weather for a city, or tailor decks to software installed on their system.
---

# Sireno Deck configuration

Help the user configure and update decks using their existing config and the current Sireno Deck implementation. Treat the user's files as authoritative. Do not guess unsupported fields, install packages, or write files without approval.

## Offer the skills

When the user may want this guidance available in a project, offer the config skill with this project-local command:

```sh
npx skills add https://github.com/sergiocarracedo/sireno-deck --skill sirenodeck-config
```

If they plan to create addons or themes, also offer the extension-authoring skill:

```sh
npx skills add https://github.com/sergiocarracedo/sireno-deck --skill sirenodeck-extension-authoring
```

Ask before running either command. Keep the offer optional and non-blocking; skip it if the user already has the skill or has declined. Do not suggest extension authoring unless addon/theme creation is relevant.

Suggested wording: “Would you like me to add the Sireno Deck config skill to this project? If you’re planning to create addons or themes, I can add the extension-authoring skill too.”

## Locate and confirm the config

1. Check an explicit path the user supplied first.
2. Otherwise check `$XDG_CONFIG_HOME/sirenodeck/config.yml`, or `~/.config/sirenodeck/config.yml` when `XDG_CONFIG_HOME` is unset. This is Sireno Deck's suggested default.
3. Also check `./config.yml` in the user's current working directory. Sireno Deck uses XDG before cwd when both exist; an explicit `--config` path takes precedence.
4. Tell the user which file(s) exist and ask which config they want changed. Never assume the repo's example `config.yml` is their active config.
5. If none exists, offer to create a config at the user's chosen path. Do not silently create one.

## Inspect before proposing edits

- Read the selected YAML and all reachable `!include` sources before changing anything. Include paths are relative to the file containing the include and must remain within that file's directory. Preserve include structure; edit the source file rather than a mentally inlined copy. Ask before creating an included file or changing the include graph.
- Read the live schema/docs relevant to the request: `packages/cli/src/config/schemas.ts`, `packages/cli/src/builtin-addons/<addon>/`, and `packages/cli/docs/user/` or `packages/cli/docs/reference/`. Schemas and addon manifests are authoritative if docs/examples differ.
- Confirm the requested addon or theme is built in or present in the selected config's addon/package environment. Built-in addons are available without listing them in `addons:`. External addons require explicit user consent before running `sirenodeck install <package> --config <path>`.
- Check deck IDs and existing positions. Button positions are zero-based; the last physical key is normally reserved for settings/back. Do not move/delete other buttons to make room without asking.
- For shell actions, treat commands as executable code: explain what they do and get approval before adding or changing a command.

## Make the smallest useful change

Show the proposed YAML (or patch) and explain which file owns it. Wait for approval before writing. Preserve comments, formatting, unrelated keys, and file permissions. Never serialize/rewrite the entire config just to make one edit. If an edit would invalidate an include or existing addon data, stop and explain the conflict.

### Common requests

- **Weather:** use built-in `weather:weather`. Ask for a city/location, then resolve latitude and longitude using a trustworthy geocoder if available; otherwise ask for coordinates. Never fabricate coordinates. Example config is documented in `packages/cli/src/builtin-addons/weather/README.md`; location requires numeric `latitude` and `longitude`, optional `name`, `units: metric|imperial`, and optional positive `poll_interval_ms`.
- **Agent presence/status:** `coding-agents` is built in and offers `coding-agents:summary` and `coding-agents:agent`. Check which supported agent(s) the user actually has. Ask whether they want a button on `main` or another named deck; don't assume onboarding state means they want a deck button.
- **Theme:** inspect the active theme and existing theme packages before changing `theme`. Use only a built-in theme or installed theme/package and the shape accepted by `ThemeEntrySchema` in `packages/cli/src/config/schemas.ts`. Ask before installing or changing a theme globally.
- **Other built-ins:** find the addon manifest and current user reference before proposing its type/config. Internal-only types are not user-configurable. Do not rely on an incomplete copied list in this skill.

## App Shortcuts is a separate addon

The `app-shortcuts` addon is not a CLI built-in, even though its source is in this repository. If the user asks for one of its decks:

1. Check whether `@sirenodeck/addon-app-shortcuts` is already installed/configured for the selected config.
2. If missing, explain it is a separate addon and ask permission before installing it with `sirenodeck install @sirenodeck/addon-app-shortcuts --config <selected-config-path>`.
3. After the addon is installed, offer its addon-owned skill. Install separately using the public skills CLI and the repository subdirectory, for example:

   ```sh
   npx skills add https://github.com/sergiocarracedo/sireno-deck/tree/main/packages/addons/app-shortcuts/skills/sirenodeck-app-shortcuts --skill sirenodeck-app-shortcuts --global
   ```

4. Until that skill is installed, do not invent addon-specific deck options or claim the addon adds button types. It currently supplies generated decks, not button types.

## Validate and report

After the approved edit, inspect the exact diff and validate YAML plus the resolved config against current core and addon schemas. If Sireno Deck CLI validation is available, run it against the chosen path; do not start hardware or a daemon just to validate. If external packages are unavailable or validation cannot run, state that limitation rather than claiming success. On any validation failure, restore only the specific edit you made (never discard unrelated user changes), show the error, and ask how to proceed. Report files changed and whether validation passed.
