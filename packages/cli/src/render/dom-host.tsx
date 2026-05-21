import { Fragment, createElement, isValidElement } from "react"

import type { CSSProperties, ReactElement, ReactNode } from "react"

import type { AddonDomButtonRender } from "../addon/api.js"
import { ButtonFrame } from "./button-frame.js"
import { resolveDeckLayout } from "./browser-renderer.js"
import { STREAM_DECK_KEY_PRESET, type TextImagePreset } from "./text-image.js"

export interface DomHostRenderOptions {
  background?: string
  keyCount: number
  preset?: TextImagePreset
}

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"])

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
}

function styleObjectToCss(style: CSSProperties | undefined): string | undefined {
  if (!style) {
    return undefined
  }

  const entries = Object.entries(style)
    .filter(([, propertyValue]) => propertyValue !== undefined && propertyValue !== null)
    .map(([property, propertyValue]) => `${kebabCase(property)}:${String(propertyValue)}`)

  return entries.length > 0 ? entries.join(";") : undefined
}

function propsToAttributes(props: Record<string, unknown>): string {
  const attributes: string[] = []

  for (const [key, value] of Object.entries(props)) {
    if (key === "children" || key === "dangerouslySetInnerHTML" || value === undefined || value === null || value === false) {
      continue
    }

    if (key === "className") {
      attributes.push(`class="${escapeHtml(String(value))}"`)
      continue
    }

    if (key === "style") {
      const css = styleObjectToCss(value as CSSProperties)
      if (css) {
        attributes.push(`style="${escapeHtml(css)}"`)
      }
      continue
    }

    if (typeof value === "boolean") {
      attributes.push(key)
      continue
    }

    attributes.push(`${key}="${escapeHtml(String(value))}"`)
  }

  return attributes.length > 0 ? ` ${attributes.join(" ")}` : ""
}

export function renderReactNodeToHtml(node: ReactNode): string {
  if (node === undefined || node === null || typeof node === "boolean") {
    return ""
  }

  if (typeof node === "string" || typeof node === "number") {
    return escapeHtml(String(node))
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderReactNodeToHtml(child)).join("")
  }

  if (!isValidElement(node)) {
    return ""
  }

  if (node.type === Fragment) {
    return renderReactNodeToHtml(node.props.children)
  }

  if (typeof node.type === "function") {
    return renderReactNodeToHtml(node.type(node.props))
  }

  if (typeof node.type !== "string") {
    throw new Error("Unsupported DOM render node type")
  }

  const attributes = propsToAttributes(node.props as Record<string, unknown>)
  if (VOID_ELEMENTS.has(node.type)) {
    return `<${node.type}${attributes} />`
  }

  const children = renderReactNodeToHtml(node.props.children)
  return `<${node.type}${attributes}>${children}</${node.type}>`
}

export function createHostedButtonElement(button: AddonDomButtonRender): ReactElement {
  if (button.full_surface) {
    return button.content
  }

  return createElement(ButtonFrame, null, button.content)
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
