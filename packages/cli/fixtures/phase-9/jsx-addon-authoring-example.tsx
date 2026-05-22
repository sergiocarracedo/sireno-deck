import { createElement } from "react"

import {
  ButtonSurface,
  createBaseShapeTextContent,
  createDomTextLabel,
} from "sireno-deck-cli"

export const helperAddonButton = createBaseShapeTextContent({
  keyIndex: 0,
  label: "Clock",
})

export const helperAddonSurface = createElement(
  ButtonSurface,
  { full_surface: true },
  createDomTextLabel({ children: "Date Today" }),
)

export const helperAddonText = createDomTextLabel({ children: "10:48" })
