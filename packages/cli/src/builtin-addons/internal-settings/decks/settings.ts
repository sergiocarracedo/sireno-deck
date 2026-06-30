import type { AddonDeckFactory } from "@/addon/api";

const settingsDeck: AddonDeckFactory = () => ({
  name: "Settings",
  buttons: [
    { id: "brightness", type: "core:settings-brightness", position: 0 },
    { id: "theme", type: "core:settings-theme", position: 1 },
    { id: "about", type: "core:settings-about", position: 2 },
  ],
});

export default settingsDeck;