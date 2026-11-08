# Credential store implementation plan

**Design:** [Addon credential store](2026-11-02-credential-store-design.md)

## Platform constraints to validate

- Linux Secret Service uses the user's D-Bus session; collection/item access can be locked and lookup attributes are not secret. Headless or user-service sessions may lack the service. Never put secret values, email addresses or secret URLs in lookup attributes or labels. [Specification](https://specifications.freedesktop.org/secret-service/latest-single)
- macOS Keychain behavior depends on the user context, keychain implementation and signing/entitlements. Apple's guidance distinguishes user-context data-protection keychains from file-based keychains and notes restrictions for command-line tools and daemons. Verify the actual packaged CLI and supported launch modes. [Apple TN3137](https://developer.apple.com/documentation/technotes/tn3137-on-mac-keychains)
- Windows generic credentials have a maximum blob size of 2,560 bytes and persistence is tied to the current user's logon context. [CREDENTIALW](https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentialw), [CredWriteW](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credwritew)
- Decide and document a cross-platform credential size contract before implementation; return a typed error for oversized data rather than truncating, silently chunking or falling back to plaintext. Verify it accommodates the provider credentials Calendar actually needs.

## Work units

### 1. Establish host contract

- [ ] Define an asynchronous, addon-scoped backend interface for `get`, `set`, `delete` and availability. Distinguish missing entries, unavailable/locked and operational failures where possible, with typed errors that never contain secret values.
- [ ] Specify accepted credential name and value encodings, safe deterministic namespacing, size limits, idempotent deletion and replacement. Keep platform lookup metadata non-sensitive.
- [ ] Define concurrency semantics for token refresh: serialize refresh per provider instance and prevent stale writes from overwriting newer tokens. Do not claim atomic compare-and-swap unless the chosen backend can guarantee it.
- [ ] Inject the scoped API into the addon global-service context, including consistent load and unload lifecycle handling. Avoid exposing it to the frontend or allowing callers to select another addon namespace through the API.
- [ ] Add an in-memory fake and tests for namespace collisions, empty and missing values, errors, size limits and concurrent operations. Document that in-process addons remain trusted.

### 2. Native implementations

- [ ] Compare maintained dependencies and platform APIs for supported Node versions, packaging, native builds, licensing, user sessions, error classification and safe handling of secrets. Record the selection before adding a dependency.
- [ ] Implement Linux Secret Service, macOS Keychain and Windows Credential Manager adapters behind the host interface. Use persistent user-scoped entries; do not pass secret values through command-line arguments, environment variables or logs.
- [ ] Test platform adapters with mocked native boundaries, including unavailable services, locked stores, not-found responses, replacement and deletion. Ensure timeouts/cancellation and shutdown do not leave hanging calls.
- [ ] Add opt-in real-store integration tests on each platform, covering independent entries and process restart. Run in disposable user-owned test namespaces and clean only entries created by those tests.

### 3. Lifecycle, diagnostics and cleanup

- [ ] Ensure an unavailable store does not block daemon startup or other addons. Expose sanitized availability to affected addons; implement bounded, cancellation-aware retry at the addon/service layer.
- [ ] Define an explicit user-facing cleanup workflow that identifies an addon and requires confirmation before deleting its entries. Disabling, uninstalling or deleting configuration must not silently delete credentials.
- [ ] Define how entries are enumerated for cleanup without relying on secret metadata. Handle partial deletion and unavailable stores without reporting success incorrectly.
- [ ] Test store lock/unlock, provider isolation, daemon restart, addon unload and retry cancellation. Check logs, bridge messages and diagnostics for sentinel secrets.

### 4. Calendar integration and documentation

- [ ] Store OAuth refresh tokens and secret feed URLs by provider instance; serialize refresh and persist rotated tokens before relying on them. Explicitly disconnecting a provider removes its credentials after user confirmation.
- [ ] Test multiple instances, reauthorization, rotation, missing tokens, unavailable stores and disconnected providers. Never serialize credentials into addon configuration, event payloads or browser state.
- [ ] Document OS prerequisites, daemon user/session requirements, storage size limits, trusted-addon boundary, credential removal and recovery. Update addon-authoring and configuration skills to match the shipped API.
- [ ] Run focused tests, platform integration tests where available, workspace lint/format/typecheck/tests, and repository-required emulator verification for host/runtime changes. Report platforms not actually exercised.

## Acceptance criteria

- An addon can store, retrieve, replace and explicitly delete its own credentials across daemon restarts on each supported platform, subject to a documented size limit.
- A locked or unavailable store leaves the daemon and other addons running; failure is visible and retries are bounded.
- Credential values never enter frontend payloads, shell arguments, routine logs or diagnostic output; no plaintext fallback is used.
- Removal or disabling of an addon does not silently erase credentials. Cleanup is explicit and reports partial failures.
- Platform-specific behavior and the lack of isolation between trusted in-process addons are documented.
