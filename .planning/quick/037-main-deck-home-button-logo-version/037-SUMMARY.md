# Quick Task 037 Summary

**Task:** In the main deck last button, replace the "Home" label with the sirenodeck logo + CLI version. Use no button frame.

**Completed:** 2026-06-06

## What was done
Modified `system-back-button.tsx` to render the sirenodeck logo (`logo72x72.png` read as base64 data URL) and CLI version (`v0.1.0` from package.json) on the main deck last button, with `full: true` to skip the button frame. Sub-deck back buttons remain unchanged (chevron-left + "Back" with frame).

## Files changed
- `packages/cli/src/deck/system-back-button.tsx`: Replaced the "Home" text-only render with logo + version layout using `ButtonSurface full`

## Commit
23d2a54
