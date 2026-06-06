# Quick Task 037: Main Deck Home Button - Logo + Version

## Must Haves

- The system-back button on the main deck shows the sirenodeck logo + CLI version
- No button frame on the main deck home button
- Version reads from the actual CLI package.json
- The logo already exists at `packages/cli/src/assets/logo72x72.png`
- Sub-deck back buttons are unaffected (still show frame + chevron-left + "Back")

---

## Task 1: Modify system-back-button.tsx

**Files:** `packages/cli/src/deck/system-back-button.tsx`

**Action:**
Replace the `isMainDeck` branch render. Instead of "Home" text at 30% opacity:
- Set `full: true` on `ButtonSurface` to skip button frame
- Read `logo72x72.png` from the assets dir and convert to base64 data URL at module init
- Read version from `../../package.json` at module init
- Render the logo image centered above the version text

**Verify:**
- The main deck last button shows the sirenodeck logo
- The CLI version is visible below the logo
- No button frame is applied (no `data-sireno-button-frame` attribute)
- Sub-deck system-back buttons still show the chevron-left "Back" with frame

**Done:**
- `system-back-button.tsx` updated with logo + version on main deck, `full: true`
