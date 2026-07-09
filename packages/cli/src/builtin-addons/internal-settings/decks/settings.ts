import type { AddonDeckFactory } from "@/addon/api"

const settingsDeck: AddonDeckFactory = () => ({
  name: "Settings",
  buttons: [
    { id: "brightness", type: "internal-settings:brightness", position: 0 },
    { id: "theme", type: "internal-settings:theme", position: 1 },
    { id: "about", type: "internal-settings:about", position: 2 },
  ],
})

export default settingsDeck
