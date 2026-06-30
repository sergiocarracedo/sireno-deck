import type { NewAddonManifest } from "@/addon/api";

import manifestJson from "./sirenodeck.json" with { type: "json" };

import sessionInfoBackend from "./buttons/session-info/backend";
import sessionInfoFrontend from "./buttons/session-info/frontend";
import sessionLockedDeck from "./decks/locked";
import sessionTimeBackend from "./buttons/time/backend";
import sessionTimeFrontend from "./buttons/time/frontend";

type JsonButton = (typeof manifestJson.buttons)[number];

const applyInternalFlag = (
  impl: typeof sessionInfoBackend,
  json: JsonButton,
): typeof sessionInfoBackend => {
  if (json.internal !== true) return impl;
  return { ...impl, internal: true };
};

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: manifestJson.name,
  buttonTypes: {
    "session:info": {
      frontend: sessionInfoFrontend,
      backend: sessionInfoBackend,
    },
    "session:time": {
      frontend: sessionTimeFrontend,
      backend: applyInternalFlag(sessionTimeBackend, manifestJson.buttons[1]!),
    },
  },
  decks: {
    "session:locked": sessionLockedDeck,
  },
};

export const sessionAddon = manifest;
export default manifest;