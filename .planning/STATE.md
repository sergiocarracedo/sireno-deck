# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17)

**Core value:** Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.
**Current focus:** Phase 4 context is captured for milestone v1.3 Typography and Rich Formatting; planning can start on verification and contract cleanup.

## Current Position

Phase: 4 — Verification and Contract Cleanup
Plan: —
Status: planning
Last activity: 2026-05-29 - Completed discuss-phase 4 for active-surface verification and contract cleanup

Progress: [#######---] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 1 session
- Total execution time: 1 session

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 — Foundation | 2 | 1 session | 0.5 session |
| 2 — Device + Rendering | 3 | 1 session | 0.33 session |
| 3 — Rich Date-Time Formatting Surface | 3 | 1 session | 0.33 session |

**Recent Trend:**
- Phase 1 implementation completed in a single execution pass, with verification catching multiple build/runtime mismatches before handoff.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Phase 1 (v1.0):** Followed recommended standard tooling (pnpm, ESM, strict TS) with tsdown for the CLI build output. Full forward-looking config schema. PID-file daemon lifecycle. pino + colored error UX.
- **Phase 3 execution:** Shared `Text` now owns the strict-whitelist rich-markup grammar (`|`, `*...*`, size tags, tone tags, `<blink>`), always parses string children, keeps invalid markup on full literal fallback, and leaves themes as outer metadata observers only.
- **Phase 3 execution:** Built-in date-time keeps one `format` field and Day.js token engine, preserves markup literal segments during formatting, and relies on shared `Text` for the post-format rich render path.
- **Phase 3 gap closure:** The honest larger-time-line fix uses the existing shared `2xl` token plus a wider shared size ladder; copied size multipliers such as `Chip` must stay in sync with `Text` utilities.
- **Phase 4 discussion:** Keep cleanup scoped to active shipped surfaces, include the unmatched-angle-bracket invalid-markup formatter gap, clean only shipped examples/verification fixtures, and fix only current-phase planning drift.
- **Execution:** Config validation errors must preserve metadata through schema, loader, and formatter layers or the CLI loses file/line/suggestion context.
- **Execution:** yargs command handlers that return promises require `.parseAsync()`, and a foreground daemon must keep the event loop alive explicitly.
- **Phase 5 discussion:** Button behavior should move behind addon-owned stateful instances that render React output, declare their own schemas, and use core-owned scheduling, command helpers, invalidation, and navigation methods.
- **Phase 5 discussion:** Built-in buttons should become bundled addons loaded through the same registry path as external addons, and the button config surface should be redesigned around a core envelope plus inline addon fields.
- **v1.2 research:** Session-aware behavior should be driven by one core-owned normalized context contract shared across config templating, addon render, and command/status execution.
- **v1.2 research:** Background precedence and text fitting need explicit renderer contracts before global wrapper/style primitives are added, or the milestone will turn into per-visual special cases.
- **Phase 11 discussion:** One canonical host context should carry OS `type` / `variant` / `version` plus session capability/state, and that exact shape should be reused across config templating, addon render, and command/status execution.
- **Phase 11 discussion:** Lock-aware behavior should use a top-level runtime/session config setting, allow an ordinary configured locked deck, and otherwise fall back to an implicit built-in date/time locked surface.
- **Phase 11 discussion:** Unlock must restore the full saved pre-lock navigation stack, while locked-mode navigation stays isolated from normal runtime state.
- **Phase 11 discussion:** Unsupported lock detection should not block startup; it should expose unsupported capability in context and warn once.
- **Phase 12 discussion:** Backgrounds stay color-only in this phase and resolve with button override, then deck background, then theme background.
- **Phase 12 discussion:** Text fitting becomes an explicit render contract with `shrink` as the default mode, `wrap` as the alternate mode, and a renderer-owned minimum readable size.
- **Phase 12 discussion:** The new fitting contract lands on shared/default text paths first; bespoke variants should only adopt it where reuse is low-risk.
- **Phase 13 discussion:** Wrapper and style primitives stay separate, are registered through the addon registry, and use global namespaced ids referenced directly as `wrapper_id` / `style_id`.
- **Phase 13 discussion:** Config-authored refs fail in config validation, addon-authored refs fail before rendering, missing providers hard-fail as unknown refs, and Phase 13 validation only checks existence plus wrapper/style kind.
- **Phase 13 discussion:** The first primitive rollout stays on the shared/default button path, keeps explicit props like `background` and `fit` authoritative, and must prove cross-boundary reuse with at least one bundled primitive consumer.
- **Phase 13 execution:** Wrapper/style primitives now live in the addon registry as separate namespaced definitions, and bundled addons register the same primitive contracts external addons use.
- **Phase 13 execution:** Config-authored primitive refs fail early with path-aware loader diagnostics, while addon-authored render refs fail before image generation through runtime-side validation.
- **Phase 13 execution:** Shared/default rendering consumes primitive-backed defaults without overriding explicit `background` and `fit`, and the repo now ships focused tests plus a committed Phase 13 review fixture for cross-boundary primitive reuse.
- **Phase 14 discussion:** Built-in toggles should ship as one `toggle` type with explicit `mode: internal | get-set | toggle-status`, shared base presentation plus per-state overrides, and no separate per-mode button types.
- **Phase 14 discussion:** Command-driven toggles are externally authoritative: `toggle-status` requires `status_command`, startup stays pending until the first read, failed writes preserve last authoritative truth plus error state, and output mapping uses explicit `on_values` / `off_values` token lists.
- **Phase 14 discussion:** Toggle visuals may differ by mode, but only through shared-base mode accents rather than three bespoke renderers; internal toggle state continuity remains scoped to the running daemon, not durable restart persistence.

### Pending Todos

- Decide whether to normalize planning docs that still mention `tsup` now that the codebase uses `tsdown`.
- Run `plan-phase 4` now that the cleanup scope is locked around active shipped surfaces and the unmatched-angle-bracket contract gap.

### Roadmap Evolution

- Phase 29 added: remove remaining legacy seams such as `LegacyAddonButtonDefinition`, stop using `createElement` in favor of JSX/TSX, prefer Tailwind utilities over inline styles except where impossible, split built-in multi-button addons into one button per file, and decide between `dayjs` and `momentjs` for the date-time button formatting path.
- Phase 28 added: move toward JSX/TSX component-first rendering, replace `createDomIcon`-style helper rendering with components, use tailwind-style classes plus `cn` where possible, add a workspace-root `p cli:dev` watch mode that runs the CLI through `tsx`, and provide theme-customizable utility components such as `Icon`, `Chip`, and `Text`.
- Phase 27 added: remove the legacy YAML theme fallback, use the built-in default theme `ButtonFrame.tsx` as the only frame fallback, stop requiring manual `import React from 'react'` in TSX runtime files, ensure theme `ButtonFrame.tsx` edits trigger autoupdate, and show deck glass chrome only in emulator mode.
- Phase 26 added: refactor the browser deck shell onto React/TSX components, emulate Stream Deck button spacing/glass chrome in browser mode, keep undersized virtual-device selections renderable with a persistent warning, and use `assets/logoFull.png` as a startup mosaic while the browser renderer boots.
- Phase 25 added: themes can provide `buttonFrame` as `.tsx` modules too, not only `.js`, so theme-owned frame rendering can follow the authoring path prepared in `themes/default`.
- Phase 23 added: allow JSX/TSX addon button authoring and show a startup image on the Stream Deck before the browser path sends the first deck surface.
- Phase 24 added: replace the instance-first addon button contract with a mounted active-deck React render model, definition-level runtime handlers, and a core-owned addon store that survives deck changes for one runtime session.
- Phase 22 added: browser deck emulator
- Phase 21 added: theme fonts must be shipped as real bundled assets so browser-rendered typography does not depend on missing host fonts or broken theme font references.
- Phase 20 added: theme packages with manifest-backed assets and theme-owned button frames, external image rendering fixes, and a centered five-button locked time layout.
- Phase 19 added: tailwind-backed button theming wired through Sireno theme CSS variables so browser-rendered surfaces can use utilities like `text-primary` against the active global theme.
- Phase 16 added: config hot-reload, external deck-file references, wrapper label removal, and customizable wrapper accent colors.
- Phase 17 added: custom wrapper primitives with addon-authored rendering variants.
- Phase 18 added: React DOM-based renderer with HTML/CSS surface support, including richer media such as GIFs and video.
- Phase 16 executed: deck-only `@path` references, watched config graph reloads, shared-wrapper footer removal, narrow `accent` overrides, and runtime-owned invalid-reload fallback are all implemented and verified.

### Progress Notes

- **Phase 3 discussion:** Re-scoped the phase from a bounded date-time-only formatter into a shared `Text` mini markup language with strict whitelist nesting, existing tone-token tags, shared size tags, structural `|` line breaks, CSS-only blink, Day.js-first then `Text` parsing, and literal fallback for any invalid markup.

- **Phase 3 execution:** Shipped the shared `Text` strict-whitelist rich-markup parser/render seam, added narrow utility CSS plus DOM-host regression proof, preserved markup literals around Day.js token expansion in the built-in date-time formatter, replaced the Phase 22 review fixture with a real rich date-time emulator path, and recorded the always-on blink tradeoff explicitly in Phase 3 UAT and verification.

- **Phase 3 gap closure:** Fixed the real UAT size-contrast miss by moving the committed date-time review path and mounted proof onto shared `2xl`, widening the global text size ladder, and syncing `Chip` with the updated `sm` multiplier so the theme seam stays truthful.

- **Phase 4 discussion:** Locked the final milestone phase around truthful cleanup only: active shipped tests/fixtures/examples/docs, the unmatched-angle-bracket invalid-markup gap in the built-in date-time formatter, shipped-example-only fixture normalization, and current-phase planning-state drift rather than archive-wide cleanup.

- **Phase 2 execution:** Replaced the fake shrink clamp with a browser-only shrink-fit helper shared by browser capture and emulator paths, kept mounted/static output on honest ellipsis fallback, shipped a committed Phase 22 shrink-fit review addon/fixture/UAT path, and fixed the emulator shutdown seam so the review command closes cleanly when `sessionMonitor.stop()` is synchronous.
- **Phase 2 discussion:** Locked shrink-fit as a browser-only live measurement seam on canonical `Text`, removed the CSS clamp as primary logic, kept measurement limited to `fit="shrink"`, chose fixed `ellipsis` fallback after the readable floor, deferred configurable fallback/floor API, and required content/container/theme-metric remeasurement plus aggressive loop guards and browser-path regression proof.
- **Phase 1 execution:** Shipped the theme-relative typography contract by moving final sizing onto shared `Text` tokens, exposing size metadata through the default theme presentation seam, sweeping shipped raw typography callers onto explicit `Text` semantics, and updating focused regressions plus the live date-time test contract to the honest single-`format` surface.
- **Phase 1 discussion:** Locked the typography contract around role-base variables plus shared `Text` scaling, fixed-core moderate size multipliers with `md` as the exact role base, theme wrappers as observe-only metadata consumers, a repo-wide raw typography sweep with `Text` preferred for real text nodes, and explicit regression guardrails against implicit role-class sizing.
- **Milestone v1.2 shipped:** `complete-milestone` archived the live roadmap and requirements into `.planning/milestones/v1.2-ROADMAP.md` and `.planning/milestones/v1.2-REQUIREMENTS.md`, collapsed the active roadmap into milestone history, and tagged the release as `v1.2`.
- **Milestone closeout reconciliation:** Quick task 019 reconciled the stale v1.2 draft claims, backfilled the missing `23-05` summary, reconstructed truthful Phase 17 and Phase 21 closure artifacts, and left the planning layer ready for a clean `complete-milestone` rerun.
- **Phase 29 completion:** All three Phase 29 slices are executed, summarized, verified, reviewed, shipped, and compounded.
- **Phase 29 discussion:** Locked a hard cut that removes `LegacyAddonButtonDefinition` plus the runtime `createInstance()` bridge, requires one built-in button definition per file with local shared support files allowed, treats simple inline built-in styles as utility-layer debt to eliminate, and standardizes built-in date/time formatting on `dayjs` with Day.js token syntax. Richer date-time formatting ideas raised during discussion were explicitly kept out of scope and noted for future roadmap backlog work.
- **Phase 28 execution:** Closed Wave 1 and Wave 2 with the public component-first `Icon`/`Chip`/`Text` kit, theme presentation seam, core-button/runtime fallback migration, and the hard authoring cut that removed helper exports from the shipped addon surface, tests, fixtures, and docs. Wave 4 now adds the truthful workspace-root `cli:dev` watch loop on `tsx watch ... start --config config.yml` plus final changelog/state learnings.
- **Phase 28 completion:** All four plan slices are now executed and summarized, `28-VERIFICATION.md` passes with focused source/runtime/script proof, and the next workflow step is `verify-work 28` followed by `/review`, `/ship`, and `/compound`.
- **Phase 28 discussion:** Locked Phase 28 around a hard cut from helper-factory rendering to component-first TSX authoring, a core-owned but theme-presentable `Icon`/`Chip`/`Text` kit, `Text` as the new canonical fit/marquee/ellipsis/wrap contract with auto-animating overflow marquee, a workspace-root `p cli:dev` loop that runs the real `tsx`-driven `start --config config.yml` seam, and one `Icon` API backed by Lucide plus Simple Icons.
- **Phase 27 discussion:** Locked the phase around deleting the legacy YAML theme path, moving fallback frame ownership to the built-in default theme package, fixing the real TSX runtime seam so `.tsx` runtime modules no longer need manual `React` imports, keeping `themes/default/ButtonFrame.tsx` inside the truthful watched reload graph, and restricting deck glass chrome to emulator mode only.
- **Phase 27 gap closure:** Added a minimal workspace-root TSX policy anchor so the repo-root raw-source CLI startup command inherits the same JSX behavior as the package runtime, replaced the neighboring package-root proof with a regression on the exact `pnpm exec tsx packages/cli/src/cli/index.ts ...` seam, reran the blocked legacy-YAML theme check, and updated the UAT/verification artifacts so the original blocker evidence remains inspectable through `27-03-PLAN.md`.
- **Phase 27 execution:** Removed the legacy YAML theme branch, deleted the core-owned fallback frame seam in favor of the built-in default theme package runtime, kept the built-in theme runtime graph truthful for watched reloads, gated browser shell chrome to emulator-only output through explicit render intent, fixed raw theme/addon TSX execution by passing the package `tsconfig.json` into `tsx`, and committed the emulator deck-root patcher fix so stale inline warnings do not survive HTML updates.
- **Phase 27 planning:** Broke the phase into two tracer bullets: theme-contract cleanup first by deleting `legacy_yaml`, moving fallback frame ownership onto the built-in default theme package, and proving `themes/default/ButtonFrame.tsx` stays in the watched reload graph; then browser-shell/runtime truthfulness second by gating glass chrome to emulator mode only and proving the real `tsx` execution path no longer needs manual React-import boilerplate in touched runtime TSX files.
- **Phase 26 execution:** Moved the browser deck onto one shared React document tree with an honest JSX button frame, moderate shell chrome, and explicit empty wells; changed undersized virtual-device handling from a hard error page to visible subset plus persistent inline warning inside the shared shell; and replaced the repeated startup tile with a pre-browser `logoFull.png` deck-wide placeholder treatment that still hands off on the original hardware/startup seam.
- **Phase 26 discussion:** Chose to make the whole browser deck document a shared React tree for both browser capture and emulator mode, changed undersized virtual-device handling from a hard error page to a rendered visible subset plus persistent inline warning, scoped shell polish to moderate Stream Deck-style bezel/gap/glass treatment, and kept startup loading on the existing pre-browser seam with a simple `assets/logoFull.png` loading card instead of a React-owned mosaic.
- **Quick task 016:** Aligned the stale dom-host and emoji-selector browser asset assertions with the live absolute-path HTML contract and restored the committed Phase 23 local raw addon fixture to the current runtime shape (`createInstance() -> { render() { ... } }`) using explicit `createElement(...)`, which closed the three focused blockers from the aborted full-branch ship run.
- **Phase 25 execution:** Switched manifest-backed theme runtime loading onto the same fixed-policy `tsx` import seam already used for raw addons while preserving tolerant `buttonFrame` exports and fresh reloads, updated the shipped default-theme proof path to the real `index.ts` plus `ButtonFrame.tsx` graph, and added committed custom `.tsx` theme fixtures plus explicit import-boundary failures when a runtime graph escapes the theme package root.
- **Phase 25 discussion:** Kept `manifest.main` as the only theme runtime entrypoint while allowing `.js/.jsx/.ts/.tsx`, applied that same contract to both built-in and custom manifest-backed themes, preserved tolerant `buttonFrame`/`ButtonFrame` export lookup, and constrained theme runtime relative imports to stay within the theme package root.
- **Phase 23 discussion:** Captured a narrow local-addon raw-source contract (`sirenoAddon.main` may point at `.ts/.tsx/.js/.jsx`), kept the public authoring API on the root export only, and chose a branded temporary startup placeholder that clears on first real render and never hides honest browser startup failures.
- **Phase 24 discussion:** Re-scoped the phase from a narrow direct-render cleanup into a runtime-contract migration: Node keeps hardware/event ownership, the active deck becomes a persistent mounted React tree while active, inactive decks unmount on navigation, button definitions expose definition-level runtime handlers plus `render(props)`, and core provides button-local plus addon-wide session store access without adding cross-restart persistence.
- **Phase 24 planning:** Broke the migration into four execution slices: explicit contract compatibility first, core-owned addon session store second, mounted active-deck root and transient runtime props third, and built-in/doc/fixture truthfulness last. Phase 24 is a post-roadmap follow-on and does not introduce new v1.2 requirement IDs.
- **Phase 24 execution:** Shipped the mounted addon button contract and compatibility adapter, added the runtime-owned addon session store, mounted the active deck as a Node-side React host that preserves local state while active and unmounts on deck exit, migrated shipped built-ins onto `defineMountedButton(...)`, extended the committed Phase 24 fixture to prove store coordination plus transient runtime props, and updated architecture docs so they match the live mounted runtime.
- **Phase 24 gap closure:** Fixed the two verify-work emulator gaps without changing the runtime ownership boundary: emulator-served mounted assets now go through browser-loadable HTTP URLs instead of broken `file://` paths, and the emulator page now patches the existing deck root by key instead of replacing the whole `#deck-mount` subtree on each poll-driven render.
- **Phase 24 final rerun closure:** Preserved the mounted deck's theme utility and theme asset styles on the emulator transport, rewrote emulator-served theme font URLs to browser-loadable `/__sireno/assets?path=...` endpoints, and closed the last rerun UAT failure without regressing the earlier asset-serving or keyed patching fixes.
- **Phase 24 final closure:** Stopped config validation from baking rewriteable addon/theme asset refs into `file://...` URLs, which let config-expanded emoji deck icons flow through the existing emulator HTTP asset route and close the last rerun UAT failure.
- **Phase 23 planning:** Broke the phase into two execution slices: manifest-driven local raw-source addon startup through the normal CLI path, and a branded physical-device startup placeholder that hands off cleanly to the first real browser capture.
- **Plan 23-01:** Shipped local raw-source addon loading through `sirenoAddon.main` for local `.ts/.tsx/.jsx` entries using `tsx`, bounded the relative source graph to the addon root, committed a raw `.tsx` fixture addon, and proved the normal startup config path loads it through the root export surface only.
- **Plan 23-02:** Shipped branded hardware startup placeholder buffers, wired the placeholder into `startDaemon()` before the first real browser capture, documented the hardware review path, and locked write-order / handoff / failure-cleanup behavior in focused startup tests.
- **Plan 23-03:** Closed the shipped fixture config drift by changing the sample config to `phase-23-local-raw-button`, added focused startup/config coverage for the real Phase 23 fixture config, and preserved the original failed UAT evidence with an explicit rerun path.
- **Plan 23-04:** Restored the shipped raw fixture entrypoint to the helper-based render contract, added focused startup/runtime coverage for real renderable output, and preserved the rerun `React is not defined` evidence with an explicit rerun path.
- **Phase 23 verification:** Confirmed all four Phase 23 slices with focused loader/startup tests (`PASS (28) FAIL (0)`), including root-export-only raw `.tsx` addon startup, hardware placeholder handoff/cleanup behavior, the corrected shipped sample-config seam, and the restored helper-based fixture render contract.
- **Phase 20 planning:** Broke the phase into three verified vertical slices: theme package resolution plus theme-owned browser frame first, shared theme/addon asset pipeline second, and the centered implicit locked `HH:MM` fallback third.
- **Phase 22 discussion:** Chose a real-runtime virtual-device emulator, mouse-driven press/release semantics with visible press/hold states, in-page device selection with restart-on-change, clear emulator-specific layout errors, and an explicit CLI mode serving one local deck-focused page.
- **Phase 22 execution:** Shipped `sireno emulate`, a virtual Stream Deck lifecycle, a local browser emulator page, runtime-owned `down` / `up` input bridging with visible pressed-state feedback, explicit supported virtual devices, restart-on-change behavior, and an emulator-specific mismatch error surface.
- **Phase 21 discussion:** Kept theme fonts CSS-native through `@font-face`, preserved hard failures only for missing stylesheet/font asset files, allowed silent browser/system fallback for unresolved family names, and required focused tests plus one committed browser fixture proving a packaged custom font visibly affects rendered text.
- **Phase 20 discussion:** Captured the shift from single-file themes to manifest-backed theme packages with required runtime entries, theme-owned `buttonFrame` chrome with explicit `idle/tap/hold` state, manifest-declared bundled assets with CSS-relative URL rewriting, a general external asset-pipeline fix, and a fixed five-button implicit locked-time fallback.
- **Plan 20-01:** Shipped async manifest-backed theme resolution, package-backed built-in theme aliases, and theme-owned browser `buttonFrame` rendering with a committed review fixture.
- **Plan 20-02:** Shipped the shared package-root asset pipeline for `builtin://` and `addon://` assets, theme stylesheet/font injection with CSS-relative URL rewriting, and a committed shared-asset review fixture.
- **Plan 20-03:** Replaced the implicit single-button lock surface with a centered live `HH:MM` row on buttons `5..9`, preserved explicit `session.locked_deck` authority plus unlock restore behavior, and added the committed locked-time review fixture.
- **Phase 16 execution:** Shipped deck-only file references through the existing loader contract, active config-graph watching with rebuild-and-restore reload semantics, shared-wrapper footer removal plus explicit per-button accent overrides, and a runtime-owned temporary error deck for invalid reloads.
- **Plan 16-05:** Closed the Phase 16 UAT startup blocker by making theme resolution config-owned, fixing the watched root-plus-ref file graph, and wiring the diagnosed gaps to a rerun-ready closure plan.
- **Plan 16-06:** Made shared/default accent overrides visibly affect shared card chrome, reran the final UAT check, and finished Phase 16 verification.
- **Phase 17 discussion:** Captured the shift from wrapper ids to a default base button-shape model, explicit full-surface opt-out, and narrow explicit content helpers while keeping bespoke variants on their current seams for now.
- **Phase 17 planning:** Broke the phase into three slices: contract and compatibility first, core base-shape plus helper extraction second, and reviewable default-vs-full-surface proof third.
- **Plan 17-04:** Closed the Phase 17 UAT regression by forwarding `full_surface` through the shipped CLI/device render path, preserving config-authored surface metadata across builtin runtime re-renders, and passing the real-device rerun.
- **Phase 18 discussion:** Captured the hard switch to browser-backed HTML/CSS button rendering, one persistent deck page, sampled media rendering, latest-state capture coalescing, and a core-owned React `buttonFrame` that wraps by default unless `full_surface: true`.
- **Phase 18 context refresh:** Clarified that button authors write normal React TSX and `react-dom` performs the HTML/CSS conversion; the custom `deck-button`-style authoring path is not the Phase 18 target.
- **Phase 16 discussion:** Captured deck-only file references with owning-file-relative path resolution, root-plus-ref hot-reload, built-in temporary error-deck fallback on invalid reload, stack-preserving successful reload restore, full runtime instance rebuild on reload, shared-wrapper footer removal, and narrow per-button accent overrides accepting tokens or raw colors.
- **Phase 10 kickoff:** Milestone audit found that the documented addon authoring entrypoints do not line up with the built `packages/cli` exports, so release flow needs a gap-closure phase before `/review`.
- **Milestone v1.2 kickoff:** Captured session-context, layered background, text fitting, global wrapper/style, richer toggle, and lock-aware deck requirements plus the five-phase roadmap that sequences contract work before user-facing polish.
- **Phase 11 discussion:** Captured the canonical host/session contract, first minimal config templating seam, implicit built-in locked fallback, isolated lock-mode navigation, and unsupported-host degradation policy for downstream planning.
- **Plan 05-01:** Completed the addon API, bundled registry, bootstrap-aware config validation, and the first generic addon-host runtime slice.
- **Plan 05-02:** Completed addon manifest validation, unified local/npm loading, startup warning isolation, and external-addon regression coverage.
- **Plan 05-03:** Completed addon asset resolution, deck-type expansion, and the bundled emoji selector proof with runtime coverage.
- **Plan 05-04:** Replaced stale shipped local/npm addon examples with disabled illustrative declarations so the repo no longer claims nonexistent addons are ready to run.
- **Plan 05-05:** Fixed SVG addon icon composition in the renderer and switched emoji-entry tiles to deterministic ASCII-safe visuals that do not depend on host emoji fonts.
- **Plan 05-06:** Clarified disabled addon semantics in the shipped config and pinned the skip-vs-warning contract in loader/startup tests.
- **Plan 05-07:** Realigned bundled SVG assets with the icon-slot contract and strengthened renderer verification around icon-region pixels.
- **Plan 05-08:** Restored image-backed emoji tiles for the bundled emoji selector with bundled per-emoji assets and fallback coverage.
- **Phase 5 re-discussion:** Captured follow-on context for typed JSX addon authoring, core-owned live update defaults plus `interval_ms` overrides, optional shared button wrapper/text helpers, full theme typography tokens, and separate `analog-clock` / `calendar-sheet` button types inside the built-in date-time addon.
- **Plan 08-01:** Shipped the first Phase 8 analog-clock tracer bullet end-to-end, including the separate bundled button type, runtime render-contract propagation, and a bespoke analog SVG render path.
- **Plan 08-02:** Added the committed Phase 8 analog-clock fixture, UAT script, and review-path regression coverage so the shipped clock can be judged on the real CLI/device path.
- **Plan 09-01:** Shipped the bundled `calendar-sheet` button type, tear-sheet render path, and committed Phase 9 review fixture/UAT script.
- **Plan 09-02:** Added the focused non-DOM authoring guide, verified JSX/helper example, and review-visible authoring clarity checks.
- **Plan 10-01 / 10-02 execution:** Added explicit public root and `./jsx` package build entries, moved JSX type augmentation onto the built opt-in entrypoint, switched docs/example imports to `sireno-deck-cli`, and replaced source-path verification with a build-first package-surface typecheck.
- **Phase 10 verification:** Confirmed `packages/cli/package.json#exports` now matches emitted `dist/` artifacts, the shipped authoring example resolves through the built package surface, and focused reconciler coverage keeps the helper/JSX parity example visible in tests.
- **Plan 11-01:** Shipped the canonical host/session context through runtime-owned host normalization, addon instance input, config templating, action/status execution, and a committed host-context review fixture.
- **Plan 11-02:** Added the lock-aware session-monitor seam, validated `session.locked_deck`, implemented temporary locked-mode switching with exact unlock restore plus implicit fallback, and committed the Phase 11 lock-session fixture/UAT path.
- **Phase 11 verification:** Confirmed the canonical host/session contract is wired end-to-end and that locked-mode runtime behavior is covered by focused tests and committed review artifacts, with live host detector hardening still noted as follow-up work.
- **Phase 11 security follow-up discussion:** Captured that command safety must escape host values only at the shell boundary, Linux may only claim `supported` with a real detector, and the implicit locked fallback should move onto the bundled date-time addon path.
- **Phase 12 discussion:** Captured the color-only background contract, exact button->deck->theme precedence, narrow `shrink`/`wrap` fit modes, and the decision to keep the readability floor renderer-owned while scoping the first rollout to shared/default text paths.
- **Plan 12-01:** Shipped color-only deck/button background config, explicit `button -> deck -> theme` resolution, shared/default card tinting, and a committed background review path.
- **Plan 12-02:** Replaced the old `overflow` seam with explicit `fit` modes, shipped default shrink plus opt-in wrap on the primary shared/default label path, and added a committed text-fit review path.
- **Phase 12 verification:** Confirmed `SCS-03` and `SCS-04` are covered by focused config/runtime/render tests plus committed manual review fixtures, while wider wrapper/style primitives remain Phase 13 scope.
- **Phase 13 discussion:** Captured separate wrapper/style primitive registries, direct `wrapper_id` / `style_id` references, early unknown-ref failure boundaries, shared/default-first rollout scope, and the minimum cross-addon reuse proof expected from planning.
- **Plan 13-01:** Shipped registry-backed wrapper/style primitive definitions, direct config-authored `wrapper_id` / `style_id` references, early loader validation, and a bundled core-buttons primitive registration.
- **Plan 13-02:** Carried primitive ids through the public render contract, added pre-render runtime validation for addon-authored refs, applied primitive-backed defaults on the shared/default renderer path, and committed a Phase 13 review fixture/UAT path.
- **Phase 13 verification:** Confirmed `SCS-05` is covered by focused registry/config/reconciler/runtime/render tests plus bundled-addon coverage and a committed manual review path.
- **Phase 14 discussion:** Captured the single-type toggle contract, command-authority rules, honest pending/error lifecycle behavior, and the constrained shared-base visual divergence expected for planning.
- **Plan 14-01:** Shipped the bundled internal-mode toggle contract end-to-end, including runtime-owned in-process state continuity across deck re-activation and reconnect-style activation, plus the committed Phase 14 internal-toggle review fixture/UAT path.
- **Plan 14-02:** Added the strict `get-set` toggle branch, authoritative command reads/writes with pending and error treatment, real CLI render-path mode accents, and a committed command-driven review fixture/UAT path.
- **Plan 14-03:** Added the strict `toggle-status` toggle branch, write-then-status reconciliation without local inversion, restrained third-mode render accents, and the final committed Phase 14 fixture/UAT path covering all three modes.
- **Plan 14-04:** Fixed the runtime startup render-order race so stale deck-wide `PENDING` writes cannot overwrite the first settled authoritative `get-set` state on the real device path.
- **Plan 19-01:** Exported the resolved Sireno theme as namespaced CSS vars on the browser deck shell, shipped the first narrow theme-token utility layer, and proved the contract through a themed action button plus a committed Phase 19 browser review fixture.
- **Plan 19-02:** Migrated shared browser chrome and helper-authored typography onto the theme-token utility bridge, added a committed typography review fixture, and closed focused verification for the shipped browser path.
- **Phase 18 verification:** The remaining real-device sampled-media UAT passed; `Waves` rendered as honest bounded browser sampling and the last paused Phase 18 verification item is now closed.
- **Phase 19 verification:** Both committed physical-device review fixtures passed on the attached Stream Deck, closing the token-utility and typography/shared-frame UAT gap.

### Blockers/Concerns

- **Phase 5 (Addon System):** Addon API contract must be versioned from day one; design decisions here are hard to reverse.
- **Phase 5 (Addon System):** The addon-first architecture pivot is intentionally not backward-compatible with the current button config surface, so planning must account for schema, docs, examples, and migration fallout together.
- **Phase 11:** `session-monitor.ts` is currently a narrow seam with honest supported/unsupported classification and simulated event handling, but it still needs a real supported-host event source to close the live lock-detection promise completely.

## Milestone History

### v1.2 — Session Context and Surface Composition
Completed: 2026-05-28
Phases: 19 tracked phase directories executed or truthfully closed
Requirements delivered: SCS-01, SCS-02, SCS-03, SCS-04, SCS-05, SCS-06, SCS-07, SCS-08, SCS-09
Key achievements: v1.2 delivered the session-aware runtime/render contract, layered backgrounds, text fitting, reusable wrapper/style primitives, richer built-in toggles, and lock-deck substitution with unlock restore. The shipped follow-on hardening phases then carried the browser theme/font pipeline, emulator, mounted addon rendering, TSX-first built-ins, and final legacy-seam cleanup across the product surface.

## Session Continuity

Last session: 2026-05-29
Stopped at: Phase 4 discussion complete and ready for `plan-phase 4`.
Resume file: .planning/phases/04-verification-and-contract-cleanup/04-CONTEXT.md

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | update example config so taps are demoable in UAT | 2026-05-12 | `ea5b2d6` | `.planning/quick/001-example-config-demoable-taps` |
| 002 | finish remaining Phase 4 review regressions | 2026-05-13 | uncommitted | `.planning/quick/002-phase-4-review-regressions` |
| 003 | fix fan label contract and make display_mode text truly text-only | 2026-05-13 | uncommitted | `.planning/quick/003-fan-label-contract-text-only-display-mode` |
| 004 | fix Phase 4 activation blocking and stale-key priming regressions | 2026-05-13 | uncommitted | `.planning/quick/004-activation-blocking-stale-key-priming` |
| 005 | fix independent priming, priming error handling, and stale media metadata | 2026-05-13 | uncommitted | `.planning/quick/005-fix-independent-priming-priming-err` |
| 006 | start polling immediately per button and treat 0 RPM as valid fan data | 2026-05-13 | uncommitted | `.planning/quick/006-start-polling-immediately-zero-rpm-valid` |
| 007 | preserve internal toggle state across deck activation and reconnect | 2026-05-13 | uncommitted | `.planning/quick/007-preserve-internal-toggle-state-across-deck-activation-and-reconnect` |
| 008 | guard async deck activation after render and prevent stop from being undone | 2026-05-13 | uncommitted | `.planning/quick/008-guard-async-deck-activation-after-render-and-preserve-stop` |
| 009 | align fan heuristic review with v1 contract and finalize Phase 4 review | 2026-05-13 | uncommitted | `.planning/quick/009-align-fan-review-contract-finalize-phase-4-review` |
| 010 | add Phase 5 verification fixtures under packages/cli/fixtures | 2026-05-13 | uncommitted | `.planning/quick/010-add-phase-5-verification-fixtures-under-packages-cli-fixtures` |
| 011 | commit learnings | 2026-05-13 | `0f6981a` | `.planning/quick/011-commit-learnings` |
| 012 | honor token-based formatting in the bundled date-time addon | 2026-05-14 | uncommitted | `.planning/quick/012-date-time-token-formatting` |
| 013 | add the config needed for review (UAT) in the fixtures folder | 2026-05-15 | `8f321c9` | `.planning/quick/013-add-uat-review-config-fixtures` |
| 014 | fix theme/font-face test failures blocking /ship | 2026-05-25 | `866d442` | `.planning/quick/014-theme-font-face-test-failures` |
| 015 | fix this: pnpm exec tsx packages/cli/src/cli/index.ts start --config config.yml crashes with React is not defined from ButtonFrame.tsx | 2026-05-26 | `63fd4d8` | `.planning/quick/015-fix-theme-tsx-react-runtime` |
| 016 | fix ship blockers from full branch test run | 2026-05-26 | `1762ae6`, `78817e7` | `.planning/quick/016-fix-ship-blockers-from-full-branch-test` |
| 017 | fix the Phase 29 review findings: stop toggle render from mutating persisted store state, remove dead date-time class tokens, and add focused regression coverage | 2026-05-28 | `701229a`, `b97fea5` | `.planning/quick/017-fix-phase-29-review-findings` |
| 018 | Fix theme resolver regressions blocking ship | 2026-05-28 | `d6a6a73` | `.planning/quick/018-fix-theme-resolver-regressions-blockin` |
| 019 | Reconcile v1.2 milestone planning-state drift so complete-milestone can run truthfully | 2026-05-28 | `5ab3e0f` | `.planning/quick/019-reconcile-v12-milestone-drift` |
| 020 | Fix the Phase 2 shrink-fit review findings around font-load reruns and duplicate observer roots | 2026-05-29 | `c00a32f` | `.planning/quick/020-fix-phase-2-shrink-fit-review-findings` |
| 021 | Align Phase 3 planning docs to the shared `Text` markup scope | 2026-05-29 | `6576f55` | `.planning/quick/021-align-phase-3-markup-scope` |
