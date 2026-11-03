# Addon credential store design

## Goal and trust boundary

Provide a host-owned credential store for third-party and built-in addon backends on Linux, macOS and Windows. Support arbitrary addon credentials, including OAuth tokens, API keys, passwords and secret calendar feed URLs. Scope entries by addon identity and credential name to avoid accidental collisions.

Installed addons run in the host process and are trusted. Namespacing is an API convention, not a security sandbox: malicious same-process addons can bypass it. Process isolation is out of scope.

## Storage and API

Use platform-native stores: Secret Service on Linux, Keychain on macOS, and Credential Manager on Windows. Verify APIs, packaging, dependency choices, headless-session behavior and platform limits before implementation. Never silently fall back to plaintext files.

Expose an asynchronous addon-scoped backend API to get, set or replace, and delete named credentials and check store availability. Addons own and validate credential representations. Keep secret values out of logs, diagnostics, frontend channels and generated deck configurations. Errors identify the addon and operation without including secrets or secret-bearing URLs.

Credential names are references, not general YAML interpolation. The separate `${env:VARIABLE_NAME}` feature resolves ordinary configuration strings and is not a credential store. A value substituted into frontend-visible configuration can still be exposed.

## Lifecycle and failures

If the store is unavailable or locked, start Sireno Deck normally. Affected addons report that attention is needed and retry with bounded backoff; other addons and provider instances continue working. Retries stop when an addon unloads. Distinguish missing entries, locked or unavailable stores, and operation failures when the platform permits; otherwise report a combined status honestly. Operations must not block the whole daemon.

For Calendar, store OAuth refresh tokens per provider instance, replace rotated tokens, and delete them when the user explicitly disconnects the instance. Secret feed URLs may be stored similarly. Disabling or removing an addon must not silently delete its credentials. Provide a separate explicit cleanup operation for users.

## Verification and planning details

Use an in-memory fake for addon tests. Test unavailable stores, missing entries, replacement, deletion, persistence across restart, sanitized errors and independent failures. Make tests against real OS stores opt-in so CI does not require an unlocked desktop session.

Implementation planning must specify naming and explicit cleanup UX, migration, concurrent token replacement, platform capabilities, dependency and distribution choices, cancellation and retry behavior, and the exact addon API. No encrypted-file fallback is included in this initial design.
