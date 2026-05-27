import { createElement, useState } from "react"
import { describe, expect, it } from "vitest"

import {
  ButtonSurface,
  defineMountedButton,
} from "../addon/api.js"
import { resolveTheme } from "../config/theme.js"
import { UNKNOWN_HOST_CONTEXT } from "../system/host-context.js"
import { buttonFrame as defaultButtonFrame } from "../themes/default/index.js"
import { Chip, Icon, Text } from "../ui/index.js"
import { createHostedButtonElement, createMountedDomHost, renderDomDeck, renderMountedHostedButtons, renderReactNodeToHtml } from "./dom-host.js"

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

  it("uses the built-in default theme package as the fallback buttonFrame", () => {
    const element = createHostedButtonElement({
      content: createElement("span", null, "Action"),
      keyIndex: 0,
      theme: undefined,
    })

    expect(element.type).toBe(defaultButtonFrame)
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
    expect(html).toContain('data-sireno-browser-shell="true"')
    expect(html).toContain('data-sireno-key="0"')
    expect(html).toContain('data-sireno-key="1"')
    expect(html).toContain('data-sireno-key="2"')
    expect(html).toContain('data-sireno-key-well="true"')
    expect(html).toContain('data-sireno-empty-key="true"')
    expect(html).toContain('data-sireno-media-sample-interval-ms="250"')
  })

  it("keeps deck shell chrome off by default outside emulator mode", () => {
    const html = renderDomDeck([], {
      keyCount: 1,
    })

    expect(html).toContain('data-sireno-browser-shell="true"')
    expect(html).toContain('background:#0f1720;')
    expect(html).toContain('box-shadow:none;')
    expect(html).toContain('data-sireno-key-well="true"')
    expect(html).not.toContain('radial-gradient(circle at top, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 34%)')
  })

  it("renders deck shell chrome only when emulator mode is explicit", () => {
    const html = renderDomDeck([], {
      emulatorMode: true,
      keyCount: 1,
    })

    expect(html).toContain('data-sireno-browser-shell="true"')
    expect(html).toContain('radial-gradient(circle at top, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 34%)')
    expect(html).toContain('inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -14px 24px rgba(0,0,0,0.2)')
    expect(html).toContain('linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 42%)')
  })

  it("exports theme CSS vars and the browser utility stylesheet on the deck root", async () => {
    const html = renderDomDeck([], {
      keyCount: 1,
      theme: await resolveTheme("dark"),
    })

    expect(html).toContain('data-sireno-theme-utilities="true"')
    expect(html).toContain('data-sireno-theme-assets="true"')
    expect(html).toContain('data-sireno-browser-document="true"')
    expect(html).toContain('--sireno-color-primary:#7dd3fc;')
    expect(html).toContain('--sireno-color-background:')
    expect(html).toContain('--sireno-font-main-family:')
    expect(html).toContain('.text-primary{color:var(--sireno-color-primary);}')
    expect(html).toContain('.font-main{font-family:var(--sireno-font-main-family);')
    expect(html).toContain('@font-face')
    expect(html).toContain('font-family: "IBM Plex Sans"')
    expect(html).toContain('font-family: "IBM Plex Mono"')
    expect(html).toContain('file://')
  })

  it("renders a persistent inline warning banner inside the shared deck shell when requested", () => {
    const html = renderDomDeck([], {
      inlineWarning: {
        detail: "Selected virtual device exposes 6 keys but the configured deck needs 8.",
        title: "Layout mismatch",
      },
      keyCount: 6,
    })

    expect(html).toContain('data-sireno-inline-warning="true"')
    expect(html).toContain('Layout mismatch')
    expect(html).toContain('configured deck needs 8')
    expect(html).toContain('data-sireno-key="0"')
    expect(html).toContain('data-sireno-key="5"')
    expect(html).not.toContain('data-sireno-key="6"')
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

  it("threads theme-owned Icon, Chip, and Text presentation through the hosted-button runtime seam", async () => {
    const theme = await resolveTheme("dark")
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement(
        ButtonSurface,
        null,
        createElement(
          "div",
          { className: "flex flex-col items-center justify-center gap-1" },
          createElement(Chip, { tone: "accent" }, "LIVE"),
          createElement(Icon, { icon: "clock", tone: "primary" }),
          createElement(Text, { fit: "marquee", tone: "foreground" }, "Theme proof"),
        ),
      ),
      keyIndex: 0,
      theme,
    }))

    expect(html).toContain('sireno-default-chip')
    expect(html).toContain('sireno-default-icon')
    expect(html).toContain('sireno-default-text')
    expect(html).toContain('data-sireno-default-text-fit="marquee"')
    expect(html).toContain('data-sireno-text-fit="marquee"')
    expect(html).toContain('sireno-marquee-track')
  })

  it("normalizes absolute icon paths into browser-loadable file URLs", () => {
    const html = renderReactNodeToHtml(createHostedButtonElement({
      content: createElement(
        "div",
        { className: "flex flex-col items-center justify-center gap-1" },
        createElement(Icon, { src: "/tmp/sireno-icon.svg" }),
        createElement(Text, { fit: "wrap" }, "Icon"),
      ),
      keyIndex: 0,
      theme: undefined,
    }))

    expect(html).toContain('href="/tmp/sireno-icon.svg"')
    expect(html).toContain('src="/tmp/sireno-icon.svg"')
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

  it("preserves local component state across mounted host updates and resets it on unmount", () => {
    let mountCount = 0

    function MountedCounter(props: { label: string }) {
      const [mountId] = useState(() => {
        mountCount += 1
        return mountCount
      })

      return createElement("span", null, `${props.label}:${mountId}`)
    }

    const host = createMountedDomHost()

    host.render(createElement(MountedCounter, { label: "First" }))
    expect(host.toHtml()).toContain("First:1")

    host.render(createElement(MountedCounter, { label: "Second" }))
    expect(host.toHtml()).toContain("Second:1")

    host.unmount()
    expect(host.toHtml()).toBe("")

    host.render(createElement(MountedCounter, { label: "Third" }))
    expect(host.toHtml()).toContain("Third:2")
  })

  it("preserves local component state across repeated mounted hosted-button snapshots", async () => {
    let mountCount = 0

    function MountedCounter(props: { label: string }) {
      const [mountId] = useState(() => {
        mountCount += 1
        return mountCount
      })

      return createElement("span", null, `${props.label}:${mountId}`)
    }

    const host = createMountedDomHost()
    const theme = await resolveTheme("dark")

    const renderSnapshot = (label: string) => renderMountedHostedButtons(host, [
      {
        content: createElement(MountedCounter, { label }),
        keyIndex: 0,
        theme,
      },
      {
        content: createElement("span", null, "Static"),
        keyIndex: 1,
        theme,
      },
    ])

    expect(renderSnapshot("First")[0]?.html).toContain("First:1")
    expect(renderSnapshot("Second")[0]?.html).toContain("Second:1")

    host.unmount()

    expect(renderSnapshot("Third")[0]?.html).toContain("Third:2")
  })
})
