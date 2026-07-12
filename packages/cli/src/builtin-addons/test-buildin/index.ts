import type { AddonManifestV1 } from "@/addon/api"

import actionButtonsTestDeck from "./decks/action-buttons-test"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "test-buildin",
  // No custom buttonTypes — the test deck uses the existing core:action
  // button type so we can exercise the runtime's icon pipeline without
  // introducing new backend code.
  buttonTypes: {},
  decks: {
    "test-buildin:action-buttons-test": actionButtonsTestDeck(),
  },
}

export const testBuildinAddon = manifest
export default manifest