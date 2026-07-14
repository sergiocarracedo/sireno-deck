# Concerns

Tech debt, fragile areas, and known unknowns. Anything in here should be read before planning a feature that touches it.

## Tech debt

- **79 pre-existing failures in `packages/cli/src/deck/runtime.test.ts`.** Phase 42/67 system-back-injection firing in test contexts. Latent for months. Do **not** attempt drive-by fixes — needs forensics, not a patch.
- **Frontend-UI clicks bypass the gesture stream.** The chrome SPA's `sendButtonAction` / `onClick → tap` paths call `runtime.invokeAction` directly, so addons never see a `runtime:gesture:*` event for SPA clicks. Recent work cleaned this up for the chrome SPA but the residual risk remains in older addons.
- **Outdated dependency snapshots.** `pnpm-lock.yaml` is current but `typescript: 7.0.1-rc` is on a release-candidate train. Watch for breakage.
- **`gestureHandlers` enforcement** was just shipped (v1.7 P2, default-deny). Built-ins audited, but 3rd-party addons shipping pre-2026-07 may silently lose handlers — no compatibility shim was decided.
- **Per-addon frontend authoring is only present for `date-time`.** All other first-party addons rely on `IconLabelSurface` + `<LabelValueListSurface>`. Extending per-addon UI is still high-friction.
- **Multi-row device support** (XL: 32 keys) ships as `DEFAULT_KEY_COUNT = 15` — XL users get a truncated layout.

## Fragile areas

- **`packages/cli/src/deck/system-back-injection.ts`** — the n-1 slot logic. Recent rewrite (`computeSystemButtonForSlotN1`). Touch with care; coverage is partial.
- **`packages/cli/src/builtin-addons/emoji-selector/`** — emits its own per-category / per-page decks via `AddonDeckDefinition`. Active area, depends on `defaultButton` semantics that aren't yet resolved at the config layer.
- **`packages/cli/emulator/src/gesture.ts`** — per-transport gesture detector. Constants are shared from `core/gesture-state.ts` (200/200ms). Any timing change ripples both transports.

## Security

- **WS bridge token is per-session**, not user identity. Lives in `$XDG_RUNTIME_DIR/sireno-deck/` alongside pidfile.
- **No auth layer.** Everything is `127.0.0.1`. Don't expose port 52937 / 52938 / 3939 to the network.
- **`executor.run`** uses `execa("/bin/sh", ["-c", command])`. Addons that accept user-supplied `command` from config need explicit input validation — the runtime does not sanitize.
- **No secrets in repo.** `.gitignore` covers `.env`, `.env.local`. Audit shows CLEAN.

## Performance

- **Real-mode** screenshot loop is the throughput ceiling: Playwright headless → sharp slice → device write. Currently unbounded; document the budget before optimizing.
- **`state` messages** publish per-deck on every `runtime.invalidate`. Heavy fan-out for addons with many channels.
- **Media addon** polls every 1000 ms globally. Throttling is per-addon, not per-listener.

## Schema drift risks

- **Protocol version still at 1** despite the gesture-stream changes (the `key-event → button-action` flip). Additive changes; no version bump.
- **`AddonManifestV1`** is the current shape. A v2 schema would force a migration. Watch for any addon field that starts looking load-bearing.
- **YAML config** validated by zod in `config/config-loader.ts`. New keys are warnings, not errors. Tests don't enforce strict unknown-key rejection.

## Areas to plan carefully

- Any feature touching the addon manifest format — propagates to all builtins + 3rd-party addons.
- Any change to the WS protocol — must remain additive.
- Any change to the gesture stream semantics — three code paths must agree (real transport, emulator SPA, runtime listener).
- The default-button feature request: needs a config-resolver change + manifest validation. Sits in the addon-naming seam; verify no collisions before shipping.