---
title: Node SEA is not viable for hardware-controlling CLIs with native bindings
date: 2026-06-05
category: build-errors
module: packages/cli/distribution
problem_type: architectural_blocker
severity: high
tags: [node-sea, single-executable, native-bindings, tsdown, postject, mksnapshot, sireno-host]
applies_when: Considering Node SEA (Single Executable Application) for a CLI that drives USB hardware, uses sharp/playwright/libvips, spawns subprocesses, or imports any package with native bindings.
---

## Problem

The v1.4 Phase 40 plan (Distribution Build Pipeline) committed to producing a Node 20 SEA standalone executable via `node --build-sea sea-config.json`. Three real-world blocks were discovered during execution:

1. **`node --build-sea` does not exist in Node 22/24 LTS.** It was added experimentally in Node 23 and never carried into Node 24. The supported SEA flow on 20/22/24 is two-step: `node --experimental-sea-config sea-config.json` (generates blob) + `npx postject NODE_SEA_BLOB <blob> sireno-sea-blob` (injects into a copy of the node binary). Requires the `postject` npm package.

2. **`mksnapshot` requires the entry to be a true CJS module.** tsdown's CJS output uses `Object.defineProperty(exports, ...)` and bare `require(...)` calls without a `module` wrapper, so `minimalRunCjs` (mksnapshot's internal loader) crashes with `ReferenceError: exports is not defined`. Fix: prepend a `var module = { exports: {} }; var exports = module.exports;` banner via tsdown's `banner.js` option. Even then, the bundled CJS still calls `require('yargs')` and other externals, which `requireForUserSnapshot` cannot resolve in the snapshot context.

3. **The codebase's native dep footprint is incompatible with snapshotting.** esbuild `--bundle` fails with `Could not resolve "x11"` (dbus-next for media addon), `Could not resolve "chromium-bidi/lib/.../BidiMapper"` (playwright-core for chromium-detect), and similar errors for sharp (libvips native binding). SEA snapshots the V8 heap at a point in time; native bindings (`*.node` files loaded via `process.dlopen`), dynamically-loaded native modules, and process spawning do not survive snapshotting. The slim-binary workaround (marking native deps as external so they're loaded from the filesystem at runtime) means the binary alone cannot function — the user still has to `npm install` the runtime deps. The "single executable" benefit evaporates.

## Solution

Node SEA was a wrong-fit goal for this codebase. The realistic distribution options for Sireno Deck are:

- **Option A — Ship a Node distribution.** `pnpm bundle` produces a self-contained `dist/` (already works via existing tsdown config). Wrap with a thin shell script or use `pkg`/`bun build --compile` to produce a launcher. The user runs `npm i -g sireno-deck-cli` or downloads a tarball.
- **Option B — Native FFI binary.** A small Rust/Go/C++ binary that talks to the Stream Deck via `libhidapi` and spawns the Node renderer as a child process. Real single-file distribution, but a new language and toolchain.
- **Option C — Just ship the source.** `git clone && pnpm install && pnpm start`. Some hardware-controlling CLIs do this; the "distribution" is the repo itself.

v1.4 user decision (2026-06-05): cut distribution work from the milestone. Phases 40, 47, 48 deferred to v1.5. v1.5 must first decide the distribution target before re-planning.

## Lessons

- **Verify architectural claims before committing to a phase plan.** The plan asserted "Node 20 SEA" as a known-working approach. It was wrong. Friction surfaced only at build time, after 6 atomic commits. Pre-flight with a 10-line `node --build-sea --help` would have caught it.
- **SEA's stated purpose is single-file distribution of pure-JS CLIs.** Any project with native bindings, subprocess spawning, or dynamic native module loading will hit the snapshot wall. Don't pick SEA for "I want a binary"; pick it for "I have a small pure-JS CLI and want to ship it as a single file."
- **Stop and surface the wall, don't route around it.** I burned through 7 commits (sea-config, version util, build script v1 + v2, postject, tsdown.sea.config) before getting honest about the architectural mismatch. The user had to stop me. The principle "Friction Is Signal" applies here — the third time the build broke was the cue to stop, not the third commit.
- **Re-plan, don't revert-and-forget.** When a phase hits a wall, capture the finding (this note), discuss the architectural question, then re-plan. v1.4 was re-scoped to drop distribution work; v1.5 will pick it up after a distribution-target decision.
