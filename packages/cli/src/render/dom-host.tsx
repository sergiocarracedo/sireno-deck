import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { ReactElement } from "react"

import { ButtonSurface } from "../addon/api.js"
import type { Theme } from "../config/theme.js"
import { ButtonFrame } from "./button-frame.js"
import { resolveDeckLayout } from "./browser-renderer.js"
import { STREAM_DECK_KEY_PRESET, type RenderPreset } from "./render-preset.js"
import { getThemeUtilityStylesheet, renderThemeCssVariables } from "./theme-utilities.js"

export interface HostedButton {
  content: ReactElement
  full_surface?: boolean
  keyIndex: number
  sample_interval_ms?: number
}

export interface DomHostRenderOptions {
  background?: string
  keyCount: number
  preset?: RenderPreset
  theme?: Theme
}

export function renderReactNodeToHtml(node: ReactElement): string {
  return renderToStaticMarkup(node)
}

export function createHostedButtonElement(button: HostedButton): ReactElement {
  const surface = button.content.type === ButtonSurface
    ? button.content
    : createElement(ButtonSurface, {
        ...(button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
        ...(button.sample_interval_ms !== undefined ? { sample_interval_ms: button.sample_interval_ms } : {}),
      }, button.content)

  if (button.full_surface) {
    return surface
  }

  return createElement(ButtonFrame, null, surface)
}

export function renderDomDeck(buttons: readonly HostedButton[], options: DomHostRenderOptions): string {
  const preset = options.preset ?? STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(options.keyCount)
  const background = options.background ?? preset.background
  const themeVariables = options.theme ? renderThemeCssVariables(options.theme) : ""
  const themeStylesheet = getThemeUtilityStylesheet()
  const buttonsByKey = new Map(buttons.map((button) => [button.keyIndex, button]))
  const slots = Array.from({ length: options.keyCount }, (_, keyIndex) => {
    const button = buttonsByKey.get(keyIndex)
    const content = button ? renderReactNodeToHtml(createHostedButtonElement(button)) : ""

    return `<div data-sireno-key="${keyIndex}" style="align-items:center;background:#05070a;box-sizing:border-box;display:flex;height:${preset.keyHeight}px;justify-content:center;overflow:hidden;width:${preset.keyWidth}px;">${content}</div>`
  }).join("")

  return [
    "<!doctype html>",
    `<html><head><style data-sireno-theme-utilities="true">${themeStylesheet}</style></head><body style="margin:0;background:${background};">`,
    `<div id="deck-root" style="${themeVariables}background:${background};display:grid;grid-template-columns:repeat(${layout.columns}, ${preset.keyWidth}px);grid-template-rows:repeat(${layout.rows}, ${preset.keyHeight}px);height:${layout.rows * preset.keyHeight}px;width:${layout.columns * preset.keyWidth}px;">`,
    slots,
    "</div>",
    "</body></html>",
  ].join("")
}
