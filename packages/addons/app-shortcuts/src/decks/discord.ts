import type { AddonDeckEntry } from "../types"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const discordDeck: AddonDeckEntry = {
  id: "app-shortcuts:discord",
  name: "Discord",
  icon: "addon://app-shortcuts/assets/discord.svg",
  buttonColor: "purple",
  paginated: true,
  autoShow: true,
  isOverlay: true,
  trigger: {
    process_name: ["discord", "Discord"],
  },
  buttons: [
    action("search", "Find", "type://ctrl+k"),
    action("mic-off", "Mute", "type://ctrl+shift+m"),
    action("headphones", "Deafen", "type://ctrl+shift+h"),
    action("settings", "Settings", "type://ctrl+,"),
    action("user-plus", "Invite", "type://alt"),
    action("arrow-up", "Mention", "type://alt+shift+@"),
    action("arrow-down", "Next Channel", "type://tab"),
    action("arrow-up-1", "Prev Channel", "type://shift+tab"),
    action("pin", "Pinned", "type://ctrl+p"),
    action("smile", "Emoji", "type://ctrl+shift+j"),
    action("zap", "Nitro", "type://ctrl+shift+n"),
    action("logout", "Logout", "type://ctrl+shift+d"),
  ],
}
