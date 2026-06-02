# Quick Task 030 Plan

---
description: Diagnose why blinking marquee text updates in emulator/browser but not on Stream Deck hardware
created: 2026-06-02
must_haves:
  truths:
    - The diagnosis identifies the exact hardware render path that samples browser output into key buffers.
    - The diagnosis explains why CSS-only blink and marquee animate in the emulator/browser but not on hardware.
    - The diagnosis names the existing sampling contract that could drive animated hardware captures when explicitly requested.
  artifacts:
    - .planning/quick/030-diagnose-why-blinking-marquee-text-updat/030-DIAGNOSIS.md
  key_links:
    - packages/cli/src/cli/commands/start.ts
    - packages/cli/src/render/browser-renderer.ts
    - packages/cli/src/ui/Text.tsx
    - packages/cli/src/addon/api.ts
---

## Task 1

<files>
- .planning/quick/030-diagnose-why-blinking-marquee-text-updat/030-DIAGNOSIS.md
</files>

<action>
Write a focused diagnosis that traces the hardware render path from `createDeckRuntime(... onRenderDeck ...)` through `renderRuntimeDeckSurface(...)`, `browserRenderer.updateDeck(...)`, `browserRenderer.captureKeyBuffers()`, and `writeKeyBuffer(...)`. Explain that `Text` blink and marquee are implemented as CSS animations inside the browser DOM, so the emulator/browser animates them live, but the hardware only receives sampled screenshots. Capture the two concrete failure modes: buttons without a render/sampling cadence never produce new hardware frames, and buttons with a runtime render cadence still restart the browser document on every capture so the animation is repeatedly sampled near frame zero instead of advancing naturally. Note that `ButtonSurface` already exposes `sample_interval_ms`, which the browser renderer honors for repeated capture of live DOM media, but the shared `Text` blink/marquee path does not use that contract.
</action>

<verify>
Read `.planning/quick/030-diagnose-why-blinking-marquee-text-updat/030-DIAGNOSIS.md` and confirm it cites the relevant files and both failure modes.
</verify>

<done>
The quick-task directory contains a diagnosis artifact that answers the user's question with code-backed root cause and names the existing sampling seam relevant to a future fix.
</done>
