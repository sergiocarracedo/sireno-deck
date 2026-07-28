import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const vscodeDeck: AddonDeckEntry = {
  id: "app-shortcuts:vscode",
  name: "VS Code",
  icon: "addon://addon-app-shortcuts/assets/vscode.svg",
  buttonColor: "green",
  paginated: true,
  autoShow: true,
  isOverlay: true,
  trigger: {
    process_name: ["code", "code-oss", "Code", "Code Helper"],
    window_name: ["*Visual Studio Code*", "*Code - *"],
  },
  buttons: [
    action(
      "command",
      "Palette",
      'type://{"all":"ctrl+shift+p","osx":"cmd+shift+p"}',
    ),
    action("search", "Quick Open", 'type://{"all":"ctrl+p","osx":"cmd+p"}'),
    action(
      "terminal",
      "Terminal",
      'type://{"all":"ctrl+grave","osx":"cmd+grave"}',
    ),
    action(
      "panel-left-close",
      "Sidebar",
      'type://{"all":"ctrl+b","osx":"cmd+b"}',
    ),
    action("search", "Find", 'type://{"all":"ctrl+f","osx":"cmd+f"}'),
    action("replace", "Replace", 'type://{"all":"ctrl+h","osx":"cmd+alt+f"}'),
    action("columns-2", "Split", 'type://{"all":"ctrl+\\/","osx":"cmd+\\/"}'),
    action("x-circle", "Close All", "type://ctrl+k;ctrl+w"),
    action(
      "mouse-pointer-click",
      "Definition",
      'type://{"all":"f12","osx":"f12"}',
    ),
    action("hash", "Go Line", 'type://{"all":"ctrl+g","osx":"ctrl+g"}'),
    action(
      "plus-square",
      "Add Cursor",
      'type://{"all":"ctrl+alt+down","osx":"cmd+alt+down"}',
    ),
    action(
      "wand",
      "Format",
      'type://{"all":"shift+alt+f","osx":"shift+alt+f"}',
    ),
    action("save", "Save All", "type://ctrl+k;ctrl+s"),
    action("wrap-text", "Word Wrap", 'type://{"all":"alt+z","osx":"alt+z"}'),
    action("file-plus", "New File", 'type://{"all":"ctrl+n","osx":"cmd+n"}'),
    action("settings", "Settings", 'type://{"all":"ctrl+,","osx":"cmd+,"}'),
    action("sparkles", "Quick Fix", 'type://{"all":"ctrl+.","osx":"cmd+."}'),
    action("pencil-line", "Rename", 'type://{"all":"f2","osx":"f2"}'),
  ],
}
