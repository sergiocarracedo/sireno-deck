import type { AddonManifestV1 } from "@/addon/api";

import backBackend from "./buttons/back/backend";
import backFrontend from "./buttons/back/frontend";
import categoryBackend from "./buttons/category/backend";
import categoryFrontend from "./buttons/category/frontend";
import emojiSelectorDeckFactory from "./decks";
import emojiBackend from "./buttons/emoji/backend";
import emojiFrontend from "./buttons/emoji/frontend";
import launcherBackend from "./buttons/launcher/backend";
import launcherFrontend from "./buttons/launcher/frontend";
import pageNavBackend from "./buttons/page-nav/backend";
import pageNavFrontend from "./buttons/page-nav/frontend";

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "emoji-selector",
  buttonTypes: {
    "emoji-selector:category": {
      frontend: categoryFrontend,
      backend: categoryBackend,
    },
    "emoji-selector:emoji": { frontend: emojiFrontend, backend: emojiBackend },
    "emoji-selector:launcher": {
      frontend: launcherFrontend,
      backend: launcherBackend,
    },
    "emoji-selector:back": { frontend: backFrontend, backend: backBackend },
    "emoji-selector:page-nav": { frontend: pageNavFrontend, backend: pageNavBackend },
  },
  decks: {
    "emoji-selector:emoji-selector": emojiSelectorDeckFactory,
  },
};

export const emojiSelectorAddon = manifest;
export default manifest;