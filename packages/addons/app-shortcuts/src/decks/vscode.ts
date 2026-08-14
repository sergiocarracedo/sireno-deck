import type { AddonDeckEntry } from "../types"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const vscodeDeck: AddonDeckEntry = {
  id: "app-shortcuts:vscode",
  name: "VS Code",
  icon: "addon://app-shortcuts/assets/vscode.svg",
  buttonColor: "green",
  paginated: true,
  autoShow: true,
  trigger: {
    process_name: ["code", "code-oss", "Code", "Code Helper"],
    window_name: ["*Visual Studio Code*", "*Code - *"],
  },
  buttons: [
    action(
      "command",
      "Palette",
      'macro://{"all":"ctrl+shift+p","osx":"cmd+shift+p"}',
    ),
    action("search", "Quick Open", 'macro://{"all":"ctrl+p","osx":"cmd+p"}'),
    action(
      "terminal",
      "Terminal",
      'macro://{"all":"ctrl+grave","osx":"cmd+grave"}',
    ),
    action(
      "panel-left-close",
      "Sidebar",
      'macro://{"all":"ctrl+b","osx":"cmd+b"}',
    ),
    action("search", "Find", 'macro://{"all":"ctrl+f","osx":"cmd+f"}'),
    action("replace", "Replace", 'macro://{"all":"ctrl+h","osx":"cmd+alt+f"}'),
    action("columns-2", "Split", 'macro://{"all":"ctrl+\\/","osx":"cmd+\\/"}'),
    action("x-circle", "Close All", "macro://ctrl+k;ctrl+w"),
    action(
      "mouse-pointer-click",
      "Definition",
      'macro://{"all":"f12","osx":"f12"}',
    ),
    action("hash", "Go Line", 'macro://{"all":"ctrl+g","osx":"ctrl+g"}'),
    action(
      "plus-square",
      "Add Cursor",
      'macro://{"all":"ctrl+alt+down","osx":"cmd+alt+down"}',
    ),
    action(
      "wand",
      "Format",
      'macro://{"all":"shift+alt+f","osx":"shift+alt+f"}',
    ),
    action("save", "Save All", "macro://ctrl+k;ctrl+s"),
    action("wrap-text", "Word Wrap", 'macro://{"all":"alt+z","osx":"alt+z"}'),
    action("file-plus", "New File", 'macro://{"all":"ctrl+n","osx":"cmd+n"}'),
    action("settings", "Settings", 'macro://{"all":"ctrl+,","osx":"cmd+,"}'),
    action("sparkles", "Quick Fix", 'macro://{"all":"ctrl+.","osx":"cmd+."}'),
    action("pencil-line", "Rename", 'macro://{"all":"f2","osx":"f2"}'),
  ],
}
