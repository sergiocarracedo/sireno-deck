import { createElement } from "react"
import { describe, expect, it } from "vitest"

import {
  ButtonSurface,
  createBaseShapeIconLabelContent,
  defineMountedButton,
} from "../addon/api.js"
import { resolveTheme } from "../config/theme.js"
import { UNKNOWN_HOST_CONTEXT } from "../system/host-context.js"
import { createHostedButtonElement, renderDomDeck, renderReactNodeToHtml } from "./dom-host.js"

describe("dom host", () => {
  it("applies buttonFrame by default", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement("span", null, "Action"),
      keyIndex: 0,
      theme: undefined,
    }))

    expect(html).toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("Action")
  })

  it("skips buttonFrame when full_surface is explicit", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement("div", { "data-surface": "full" }, "Surface"),
      full_surface: true,
      keyIndex: 1,
      theme: undefined,
    }))

    expect(html).not.toContain("data-sireno-button-frame=\"true\"")
    expect(html).toContain("data-surface=\"full\"")
  })

  it("renders a full deck document with stable key slots", () => {
    const html = renderDomDeck([
      {
        content: createElement("span", null, "Action"),
        keyIndex: 0,
        sample_interval_ms: 250,
      },
      {
        content: createElement("div", { "data-surface": "full" }, "Surface"),
        full_surface: true,
        keyIndex: 2,
      },
    ], {
      keyCount: 3,
    })

    expect(html).toContain('id="deck-root"')
    expect(html).toContain('data-sireno-key="0"')
    expect(html).toContain('data-sireno-key="1"')
    expect(html).toContain('data-sireno-key="2"')
    expect(html).toContain('data-sireno-media-sample-interval-ms="250"')
  })

  it("exports theme CSS vars and the browser utility stylesheet on the deck root", async () => {
    const html = renderDomDeck([], {
      keyCount: 1,
      theme: await resolveTheme("dark"),
    })

    expect(html).toContain('data-sireno-theme-utilities="true"')
    expect(html).toContain('data-sireno-theme-assets="true"')
    expect(html).toContain('--sireno-color-primary:#7dd3fc;')
    expect(html).toContain('--sireno-color-background:#10161f;')
    expect(html).toContain('--sireno-font-main-family:')
    expect(html).toContain('.text-primary{color:var(--sireno-color-primary);}')
    expect(html).toContain('.font-main{font-family:var(--sireno-font-main-family);')
    expect(html).toContain('@font-face')
    expect(html).toContain('font-family: "IBM Plex Sans"')
    expect(html).toContain('font-family: "IBM Plex Mono"')
    expect(html).toContain('file://')
  })

  it("renders React TSX metadata wrappers through react-dom static markup", () => {
    const html = renderReactNodeToHtml(createElement(ButtonSurface, {
      full_surface: true,
      sample_interval_ms: 400,
    }, createElement("span", null, "TSX")))

    expect(html).toContain('data-sireno-button-surface="true"')
    expect(html).toContain('data-sireno-full-surface="true"')
    expect(html).toContain('data-sireno-media-sample-interval-ms="400"')
    expect(html).toContain('display:contents')
  })

  it("preserves addon-authored ButtonSurface sampling metadata without nesting a duplicate host wrapper", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement(ButtonSurface, {
        full_surface: true,
        sample_interval_ms: 600,
      }, createElement("span", null, "Media")),
      full_surface: true,
      keyIndex: 0,
      sample_interval_ms: 600,
      theme: undefined,
    }))

    expect(html).toContain('data-sireno-media-sample-interval-ms="600"')
    expect(html.match(/data-sireno-button-surface="true"/g)).toHaveLength(1)
  })

  it("uses the resolved theme-owned buttonFrame when a theme provides one", async () => {
    const theme = await resolveTheme("light")
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement("span", null, "Action"),
      keyIndex: 0,
      theme,
    }))

    expect(html).toContain('data-sireno-button-frame="true"')
    expect(html).toContain('color-mix(in oklab, white 68%, var(--sireno-color-background) 32%)')
  })

  it("normalizes absolute icon paths into browser-loadable file URLs", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createBaseShapeIconLabelContent({
        icon: "/tmp/sireno-icon.svg",
        keyIndex: 0,
        label: "Icon",
      }),
      keyIndex: 0,
      theme: undefined,
    }))

    expect(html).toContain('src="file:///tmp/sireno-icon.svg"')
  })

  it("renders mounted-button store snapshots through the public props-first contract", async () => {
    let addonSnapshot: unknown = { total: 0 }
    let buttonSnapshot: unknown = { taps: 0 }

    const definition = defineMountedButton({
      configSchema: {
        parse: (value: unknown) => value,
        safeParse: (value: unknown) => ({ data: value, success: true as const }),
      } as never,
      onTap({ store }) {
        store.button.update((snapshot) => ({ taps: ((snapshot as { taps?: number } | undefined)?.taps ?? 0) + 1 }))
        store.addon.update((snapshot) => ({ total: ((snapshot as { total?: number } | undefined)?.total ?? 0) + 1 }))
      },
      render({ config, store }) {
        return createElement(
          "span",
          null,
          `${config.label}:button=${(store.button.snapshot as { taps?: number } | undefined)?.taps ?? 0}:addon=${(store.addon.snapshot as { total?: number } | undefined)?.total ?? 0}`,
        )
      },
      type: "mounted-store-proof",
    })

    const instance = definition.createInstance({
      button: { position: 0, type: "mounted-store-proof" },
      config: { label: "Mounted" },
      hostContext: UNKNOWN_HOST_CONTEXT,
      methods: {
        getActiveDeckId: () => "main",
        goBack() {},
        invalidate() {},
        navigateToDeck() {},
        runCommand: async () => ({}) as never,
      },
      store: {
        addon: {
          clear() {
            addonSnapshot = undefined
          },
          getSnapshot: () => addonSnapshot,
          set(value) {
            addonSnapshot = value
          },
          update(updater) {
            addonSnapshot = updater(addonSnapshot)
          },
        },
        button: {
          clear() {
            buttonSnapshot = undefined
          },
          getSnapshot: () => buttonSnapshot,
          set(value) {
            buttonSnapshot = value
          },
          update(updater) {
            buttonSnapshot = updater(buttonSnapshot)
          },
        },
      },
      theme: await resolveTheme("dark"),
    } as Parameters<typeof definition.createInstance>[0] & {
      store: {
        addon: {
          clear: () => void
          getSnapshot: () => unknown
          set: (value: unknown) => void
          update: (updater: (snapshot: unknown) => unknown) => void
        }
        button: {
          clear: () => void
          getSnapshot: () => unknown
          set: (value: unknown) => void
          update: (updater: (snapshot: unknown) => unknown) => void
        }
      }
    })

    const renderMountedHtml = () => renderReactNodeToHtml(createHostedButtonElement({
      content: instance.render(),
      keyIndex: 0,
      theme: undefined,
    }))

    const initialHtml = renderMountedHtml()
    const repeatedHtml = renderMountedHtml()

    expect(initialHtml).toContain("Mounted:button=0:addon=0")
    expect(repeatedHtml).toBe(initialHtml)

    await instance.onTap?.()

    expect(renderMountedHtml()).toContain("Mounted:button=1:addon=1")
  })
})
