import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const claudeCodeDeck: AddonDeckEntry = {
  id: "app-shortcuts:claude-code",
  name: "Claude Code",
  icon: "addon://addon-app-shortcuts/assets/claude-code.svg",
  buttonColor: "purple",
  paginated: true,
  autoShow: true,
  isOverlay: true,
  trigger: {
    process_name: ["claude"],
    window_name: ["*Claude Code*", "*claude*", "*claude code*"],
  },
  buttons: [
    action("help-circle", "Help", "type://?"),
    action("slash", "Command", "type://{/}"),
    action("mouse-pointer-click", "Accept", "type://{right}"),
    action("corner-down-left", "Insert", "type://{enter}"),
    action("x-circle", "Interrupt", "type://ctrl+c"),
    action("arrow-up", "History Up", "type://{up}"),
    action("arrow-down", "History Down", "type://{down}"),
    action("eye", "Review", "type://ctrl+enter"),
    action("check-circle", "Approve", "type://ctrl+shift+y"),
    action("x", "Deny", "type://ctrl+shift+n"),
    action("save", "Save", "type://ctrl+s"),
    action("undo-2", "Undo", "type://ctrl+z"),
    action("redo-2", "Redo", "type://ctrl+shift+z"),
    action("file-edit", "Edit", "type://ctrl+e"),
    action("search", "Find", "type://ctrl+f"),
    action("trash-2", "Clear", "type://escape"),
  ],
}
