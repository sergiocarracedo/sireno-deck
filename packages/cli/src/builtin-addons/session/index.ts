import type { AddonManifestV1 } from "@/addon/api";

import sessionInfoBackend from "./buttons/session-info/backend";
import sessionInfoFrontend from "./buttons/session-info/frontend";
import sessionLockedDeck from "./decks/locked";
import sessionTimeBackend from "./buttons/time/backend";
import sessionTimeFrontend from "./buttons/time/frontend";

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "session",
  buttonTypes: {
    "session:info": {
      frontend: sessionInfoFrontend,
      service: { ...sessionInfoBackend, gestureHandlers: ["tap"] as const },
    },
    "session:time": {
      frontend: sessionTimeFrontend,
      service: { ...sessionTimeBackend, internal: true },
    },
  },
  decks: {
    "session:locked": sessionLockedDeck,
  },
};

export const sessionAddon = manifest;
export default manifest;
