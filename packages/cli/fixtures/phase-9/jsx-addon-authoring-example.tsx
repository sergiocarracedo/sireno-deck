import type {} from "../../src/render/jsx.js"

import {
  createDeckButtonElement,
  createDeckSurfaceElement,
  createDeckTextElement,
} from "../../src/index.js"

import {
  addonButtonProps,
  addonSurfaceButtons,
  addonTextProps,
} from "./jsx-addon-authoring-example-data.js"

export const jsxAddonButton = <deck-button {...addonButtonProps} />

export const helperAddonButton = createDeckButtonElement(addonButtonProps)

export const jsxAddonSurface = <deck-surface buttons={[...addonSurfaceButtons]} />

export const helperAddonSurface = createDeckSurfaceElement({ buttons: [...addonSurfaceButtons] })

export const jsxAddonText = <deck-text {...addonTextProps} />

export const helperAddonText = createDeckTextElement(addonTextProps)
