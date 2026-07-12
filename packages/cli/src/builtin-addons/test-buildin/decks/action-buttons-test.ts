import type { AddonDeckDefinition, AddonGeneratedDeck } from "@/addon/api"

/**
 * Action Buttons Test deck — one `core:action` button per icon-source
 * shape, so a single deck exercises every accepted (and a few rejected)
 * icon configuration in the validator and runtime.
 *
 * The buttons are intentionally simple (no `actions.tap` — they're
 * static, no-op displays) so tapping them is harmless. Each one's only
 * job is to render a different icon shape, so the test deck reads as
 * a visual matrix of "what each icon source renders as".
 */

const ICON_CASES: ReadonlyArray<{ label: string; icon: string }> = [
  // Lucide / icon:// — the most common shape
  { label: "icon://play", icon: "icon://play" },
  { label: "icon://settings", icon: "icon://settings" },
  { label: "icon://volume-x", icon: "icon://volume-x" },
  // Addon / builtin asset refs
  { label: "addon://emoji-selector/assets/smileys.svg", icon: "addon://emoji-selector/assets/smileys.svg" },
  { label: "builtin://core/foo.png (no builtin addon)", icon: "builtin://core/foo.png" },
  // Paths
  { label: "./assets/chrome.svg", icon: "./assets/chrome.svg" },
  { label: "../shared/x.png", icon: "../shared/x.png" },
  { label: "~/p/x.png", icon: "~/Pictures/x.png" },
  // Single emoji
  { label: "🔥", icon: "🔥" },
  { label: "✈️", icon: "✈️" },
  // Edge: multi-emoji (rejected)
  { label: "🔥🔥 (invalid)", icon: "🔥🔥" },
  // Edge: arbitrary string (rejected → fallback)
  { label: "% (invalid)", icon: "%" },
  // Edge: empty name in scheme
  { label: "icon:// (invalid)", icon: "icon://" },
  // No icon at all (just label) — exercises the label-only path
  { label: "(no icon)", icon: "" },
  // Inline data URL (rejected by runtime — must be pre-resolved)
  { label: "data: (invalid)", icon: "data:image/svg+xml;base64,PHN2Zy8+" },
]

const createActionButtonsTestDeck = (): AddonDeckDefinition => ({
  type: "test-buildin:action-buttons-test",
  createDecks: () => {
    const buttons = ICON_CASES.map(({ label, icon }, i) => ({
      type: "core:action",
      position: i,
      ...(icon !== "" ? { config: { icon, label } } : { config: { label } }),
    }))
    const deck: AddonGeneratedDeck = {
      name: "Action Buttons Test",
      icon: "🧪",
      buttons,
    }
    return { "action-buttons-test": deck }
  },
})

export default createActionButtonsTestDeck
export { createActionButtonsTestDeck }