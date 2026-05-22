import { createElement, isValidElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { ReactElement } from "react"

import { ButtonSurface, type AddonDomButtonRender } from "../addon/api.js"
import { ButtonFrame } from "./button-frame.js"
import { resolveDeckLayout } from "./browser-renderer.js"
import { STREAM_DECK_KEY_PRESET, type TextImagePreset } from "./text-image.js"

export interface DomHostRenderOptions {
  background?: string
  keyCount: number
  preset?: TextImagePreset
}

export function renderReactNodeToHtml(node: ReactElement): string {
  return renderToStaticMarkup(node)
}

export function createHostedButtonElement(button: AddonDomButtonRender): ReactElement {
  const surface = createElement(ButtonSurface, {
    ...(button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
    ...(button.sample_interval_ms !== undefined ? { sample_interval_ms: button.sample_interval_ms } : {}),
  }, button.content)

  if (button.full_surface) {
    return surface
  }

  return createElement(ButtonFrame, null, surface)
}

export function renderDomDeck(buttons: readonly AddonDomButtonRender[], options: DomHostRenderOptions): string {
  const preset = options.preset ?? STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(options.keyCount)
  const background = options.background ?? "#10161f"
  const buttonsByKey = new Map(buttons.map((button) => [button.keyIndex, button]))
  const slots = Array.from({ length: options.keyCount }, (_, keyIndex) => {
    const button = buttonsByKey.get(keyIndex)
    const content = button ? renderReactNodeToHtml(createHostedButtonElement(button)) : ""

    return `<div data-sireno-key="${keyIndex}" style="align-items:center;background:#05070a;box-sizing:border-box;display:flex;height:${preset.keyHeight}px;justify-content:center;overflow:hidden;width:${preset.keyWidth}px;">${content}</div>`
  }).join("")

  return [
    "<!doctype html>",
    `<html><body style="margin:0;background:${background};">`,
    `<div id="deck-root" style="background:${background};display:grid;grid-template-columns:repeat(${layout.columns}, ${preset.keyWidth}px);grid-template-rows:repeat(${layout.rows}, ${preset.keyHeight}px);height:${layout.rows * preset.keyHeight}px;width:${layout.columns * preset.keyWidth}px;">`,
    slots,
    "</div>",
    "</body></html>",
  ].join("")
}
