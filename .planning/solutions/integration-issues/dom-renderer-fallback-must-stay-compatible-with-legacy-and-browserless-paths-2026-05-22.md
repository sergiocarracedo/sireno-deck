---
title: DOM renderer fallback must stay compatible with legacy and browserless paths
date: 2026-05-22
category: integration-issues
module: packages/cli runtime/render pipeline
problem_type: integration_issue
severity: high
tags: [dom-renderer, fallback-path, browser-renderer, mixed-decks, stream-deck]
---

# DOM renderer fallback must stay compatible with legacy and browserless paths

## Problem
Phase 18 moved bundled buttons onto the browser-backed DOM renderer, but the shipped runtime still promised compatibility for mixed DOM/legacy decks and hosts where the browser renderer could not start. That promise broke during integration: migrated DOM buttons could disappear on fallback paths, and browser startup failure could abort startup even for decks that should still render through the old SVG/text-image seam.

## Symptoms
- Starting the daemon could fail outright when Playwright/Chromium was unavailable, even though a legacy fallback path still existed.
- Mixed DOM + legacy decks could render migrated DOM buttons as blank or incomplete tiles.
- The temporary reload error deck could visually show the runtime-owned error surface while still dispatching taps into the hidden underlying deck.

## What Didn't Work
- Treating the browser renderer as an unconditional startup dependency in `packages/cli/src/cli/commands/start.ts`.
- Assuming the old fallback renderer could safely consume DOM-authored runtime output without an explicit legacy fallback payload.
- Letting key handling reuse the underlying active deck id while a temporary error deck was overlaid.

## Solution
Keep the browser-backed DOM path as the preferred shipped path, but make fallback compatibility explicit instead of accidental.

Key changes:

```ts
export async function ensureBrowserRenderer(
  browserRenderer: BrowserRenderer | null,
  keyCount: number,
  logger: pino.Logger,
): Promise<BrowserRenderer | null> {
  if (browserRenderer) {
    return browserRenderer
  }

  const nextBrowserRenderer = createBrowserRenderer({ keyCount })

  try {
    await nextBrowserRenderer.start()
    return nextBrowserRenderer
  } catch (error) {
    logger.warn({ error }, "browser renderer unavailable; falling back to SVG/text-image rendering")
    await nextBrowserRenderer.close().catch(() => {})
    return null
  }
}
```

```ts
export interface AddonDomButtonRender extends AddonButtonSurfaceContract {
  content: ReactElement
  fallback?: AddonLegacyButtonRenderFallback
  keyIndex: number
}
```

```ts
export async function renderRuntimeDeckSurface(...) {
  if (buttons.length > 0 && buttons.every(isDomRenderButton)) {
    const readyBrowserRenderer = await ensureBrowserRenderer(browserRenderer, connection.info.keyCount, logger)
    if (readyBrowserRenderer) {
      await renderDomDeckSurface(connection, buttons, readyBrowserRenderer, logger)
      return readyBrowserRenderer
    }
  }

  await renderMainDeck(connection, buttons.map(toLegacyRenderButton), theme, resolvePrimitiveRenderOptions, logger)
  return browserRenderer
}
```

Also fix event routing for the temporary error surface:

```ts
function getButtonHandle(deckId: string, keyIndex: number): RuntimeButtonHandle | undefined {
  const button = getDeckButtons(getDisplayDeck()).find((candidate) => candidate.position === keyIndex)
  if (!button) {
    return undefined
  }

  return { button, deckId: getDisplayDeckId() }
}
```

## Why This Works
The root cause was an integration mismatch between three truths:

1. Bundled buttons had migrated to DOM-authored render output.
2. The runtime still had a legacy SVG/text-image fallback seam for mixed or unmigrated decks.
3. Browser availability was treated as mandatory instead of optional.

The fix works because it makes the boundary explicit:
- DOM buttons can provide a narrow legacy fallback payload when the browser path cannot be used.
- Browser renderer startup is lazy and recoverable instead of a daemon-wide hard dependency.
- The temporary error deck now routes input through the visible display deck instead of the hidden underlying deck state.

## Prevention
- When adding a new primary render path, keep the fallback contract explicit in the type system instead of assuming shape compatibility.
- Add orchestration tests that cover all-DOM, mixed DOM/legacy, and browser-unavailable startup paths.
- For temporary overlay surfaces, always route both rendering and input through the same visible deck identity.

## Related
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-04-SUMMARY.md`
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-VERIFICATION.md`
