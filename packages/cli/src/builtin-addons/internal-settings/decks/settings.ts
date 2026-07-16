import type { AddonDeckFactory } from "@/addon/api"

const settingsDeck: AddonDeckFactory = () => ({
  name: "Settings",
  buttons: [
    { id: "brightness-down", type: "internal-settings:brightness-down", position: 0 },
    { id: "brightness-up", type: "internal-settings:brightness-up", position: 1 },
    { id: "app-info", type: "internal-settings:app-info", position: 2 },
  ],
})

export default settingsDeck
