#!/usr/bin/env node
// packages/web/scripts/capture-decks.mjs
//
// Pure-static deck captures: parses the demo YAML files, lays each button
// out via CSS Grid, screenshots via Playwright. No daemon required.
//
// Per-theme: renders every deck deck in DEFAULT palette, plus the main deck
// in every registered theme (light / riptide / neon-grids) so gallery cards
// show true-to-life palettes.
//
// Output: packages/web/astro/public/captures/
//   <deck-id>.png               (default theme)
//   theme-<theme-name>.png      (main deck rendered in that theme)
//
// ponytail: this skips the React Deck.tsx tree entirely to bypass the Vite
// plugin's `virtual:` modules (addons / theme manifest) — those only resolve
// when the full daemon has staged its dependency tree. The deliverable is
// the same: a real PNG of the deck's content in the theme's own tokens.

import { mkdirSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parse as parseYaml } from "yaml"
import { chromium } from "playwright"
import fs from "node:fs/promises"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..")
const outDir = resolve(repoRoot, "packages/web/astro/public/captures")

mkdirSync(outDir, { recursive: true })

const THEMES = [
  {
    id: "default",
    manifest: "packages/cli/src/themes/default/sirenodeck.json",
  },
  {
    id: "light",
    manifest: "packages/cli/src/themes/light/sirenodeck.json",
  },
  { id: "riptide", manifest: "packages/themes/riptide/sirenodeck.json" },
  {
    id: "neon-grids",
    manifest: "packages/themes/neon-grids/sirenodeck.json",
  },
]

const DECKS = [
  { id: "main", yml: "config.yml", deckKey: "main" },
  { id: "demo-app-shortcuts", yml: "demos/demo-app-shortcuts.yml" },
  { id: "demo-core", yml: "demos/demo-core.yml" },
  { id: "demo-decks-index", yml: "demos/demo-decks-index.yml" },
  { id: "demo-media", yml: "demos/demo-media.yml" },
  { id: "demo-weather", yml: "demos/demo-weather.yml" },
  { id: "demo-system-status", yml: "demos/demo-system-status.yml" },
  { id: "demo-date-time", yml: "demos/demo-date-time.yml" },
  { id: "demo-value-display", yml: "demos/demo-value-display.yml" },
  { id: "demo-pomodoro", yml: "demos/demo-pomodoro.yml" },
]

// Which (deck, theme) pairs we ship. Default covers everything;
// remaining themes get the main deck only.
const SHOTS = [
  ...DECKS.map((d) => ({ deck: d.id, theme: "default", out: `${d.id}.png` })),
  ...THEMES.filter((t) => t.id !== "default").map((t) => ({
    deck: "main",
    theme: t.id,
    out: `theme-${t.id}.png`,
  })),
]

const BUTTON_W = 120
const BUTTON_H = 120
const GAP = 6
const PAD = 20
const COLS = 5
const ROWS = 3
const FRAME_W = COLS * BUTTON_W + (COLS - 1) * GAP + PAD * 2
const FRAME_H = ROWS * BUTTON_H + (ROWS - 1) * GAP + PAD * 2

// Backwards-compat shot names referenced by existing pages. Old names are
// kept so meta JSONs don't churn: 01-default → main/default, 13-light → main
// in the LIGHT theme, 14-riptide → main in RIPTIDE, 15-neon-grids → main in
// NEON GRIDS. Written alongside descriptive names; pages migrate gradually.
const ALIASES = {
  "main.png": "01-default.png",
  "theme-light.png": "13-light.png",
  "theme-riptide.png": "14-riptide.png",
  "theme-neon-grids.png": "15-neon-grids.png",
}

const loadTheme = (rel) => {
  const raw = readFileSync(resolve(repoRoot, rel), "utf8")
  return JSON.parse(raw)
}

const hexToRgba = (hex, alpha) => {
  let h = String(hex).replace("#", "")
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("")
  const n = Number.parseInt(h.slice(0, 6) || "000000", 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// Tint lookup derived from the theme's variant tokens (buttonColor names).
const tintsForTheme = (manifest) => {
  const tokens = manifest.colorTokens ?? {}
  const variants = manifest.variants ?? {}
  const tintOf = (color) => ({
    bg: hexToRgba(color, 0.18),
    border: hexToRgba(color, 0.55),
  })
  const map = {}
  // Named variants drive tinted tiles when a deck declares buttonColor.
  for (const [name, variant] of Object.entries(variants)) {
    map[name] = tintOf(
      variant.tokens?.primary ?? variant.foreground ?? tokens.primary,
    )
  }
  map.success = tintOf(tokens.success)
  map.danger = tintOf(tokens.danger)
  map.default = {
    bg: hexToRgba(tokens.frame ?? "#53738B", 0.14),
    border: hexToRgba(tokens.frame ?? "#53738B", 0.45),
  }
  return map
}

const stripTags = (s) =>
  String(s)
    .replace(/<[^>]+>/g, "") // rich-text tags: <xl>, </xl>, <primary>…
    .replace(/\*/g, "")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/\|/g, " ")

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const TYPE_GLYPHS = {
  "core:overlay-toggle": "◎",
  "core:back": "←",
  "core:lock": "🔒",
  "core:blank": "",
  "media:mute": "×",
  "media:volume:up": "＋",
  "media:volume:down": "－",
}

// Static stand-ins for buttons whose real label is produced live by the
// runtime (clocks, sensors…). Keeps captures looking like the running deck
// instead of a grid of "·" placeholders.
const TYPE_PLACEHOLDERS = {
  "date-time:time": { label: "<4xl>*12:34*</4xl>", icon: null },
  "date-time:date": { label: "<lg>WED 27</lg>", icon: null },
  "date-time:date-time": {
    label: "<xl>*12:34*</xl>|<sm>WED 27</sm>",
    icon: null,
  },
  "date-time:analog-clock": { label: "", icon: "clock" },
  "weather:weather": { label: "*21°*|<success>Vigo ☀</success>", icon: null },
  "pomodoro:pomodoro": { label: "*25:00*|<sm>focus</sm>", icon: null },
  "system-status:system-status": { label: "CPU 42%|RAM 61%", icon: null },
  "value-display:display": { label: "<success>●</success> *42*", icon: null },
  "media:player": { label: "0:26|BABYMON...", icon: "music" },
  "emoji-selector:launcher": { label: "Emoji", icon: "smile" },
}

const labelLines = (label) =>
  String(label)
    .split("\n")
    .map((l) => escapeHtml(stripTags(l)))

const renderHtml = (deckName, buttons, theme) => {
  const tokens = theme.tokens
  const tints = theme.tints
  const tiles = Array.from({ length: COLS * ROWS }, () => null)
  for (const b of buttons) {
    // No explicit position = malformed demo fragment; real daemon assigns
    // dynamic slots we can't reproduce statically. Skip rather than stomp 0.
    if (typeof b.position !== "number") continue
    const pos = b.position
    if (pos < 0 || pos >= COLS * ROWS) continue
    tiles[pos] = b
  }

  const tileHtml = tiles
    .map((b, i) => {
      const pos = `grid-column:${(i % COLS) + 1};grid-row:${Math.floor(i / COLS) + 1};`
      if (!b) {
        return `<div class="tile empty" style="${pos}"></div>`
      }
      const tintName =
        b.buttonColor && tints[b.buttonColor] ? b.buttonColor : "default"
      const tint = tints[tintName]
      const cfg = b.config ?? {}
      const placeholder = TYPE_PLACEHOLDERS[b.type]
      const deckName =
        typeof cfg.deck === "string" && cfg.deck
          ? cfg.deck.replace(/^demo-/, "").replace(/-/g, " ")
          : ""
      // First non-empty candidate wins ("??"" can't be used — empty strings
      // are valid values that would short-circuit the chain).
      const rawLabel =
        [cfg.label, b.label, deckName, placeholder?.label].find(
          (v) => typeof v === "string" && v.length > 0,
        ) ?? ""
      const lines = labelLines(rawLabel || "·")
      const actions = b.actions ?? {}
      const iconRaw = typeof cfg.icon === "string" && cfg.icon ? cfg.icon : ""
      const lucide = iconRaw.startsWith("icon://")
        ? iconRaw.slice(7)
        : iconRaw
          ? null
          : (placeholder?.icon ?? null)
      const tapText = String(actions.tap ?? "")
      const fallbackGlyph = lucide ? "" : (TYPE_GLYPHS[b.type] ?? "")
      const fontSize =
        rawLabel.length <= 6 ? "15px" : rawLabel.length <= 12 ? "12px" : "10px"
      const iconHtml = lucide
        ? `<i data-lucide="${escapeHtml(lucide)}" class="lucide-tile"></i>`
        : fallbackGlyph
          ? `<span class="glyph" aria-hidden="true">${fallbackGlyph}</span>`
          : ""
      return `<div class="tile" style="${pos}background:${tint.bg};border-color:${tint.border};">
        ${iconHtml}
        ${lines.map((l) => `<span class="label" style="font-size:${fontSize}">${l}</span>`).join("")}
        ${tapText ? `<span class="cmd">${escapeHtml(tapText.slice(0, 26))}</span>` : ""}
      </div>`
    })
    .join("\n")

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(deckName)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://unpkg.com/lucide@latest"></script>
<style>
  html, body { margin: 0; background: ${tokens.background}; }
  body {
    font-family: "IBM Plex Sans", system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 48px; box-sizing: border-box;
  }
  .frame {
    background: ${tokens.background};
    border: 1px solid ${hexToRgba(tokens.frame ?? "#53738B", 0.8)};
    border-radius: 14px;
    padding: ${PAD}px;
    display: grid;
    grid-template-columns: repeat(${COLS}, ${BUTTON_W}px);
    grid-template-rows: repeat(${ROWS}, ${BUTTON_H}px);
    gap: ${GAP}px;
    box-shadow: 0 40px 80px rgba(0,0,0,${theme.dark ? "0.55" : "0.18"});
    width: ${FRAME_W}px;
    height: ${FRAME_H}px;
    box-sizing: border-box;
    position: relative;
  }
  .tile {
    background: ${hexToRgba(tokens.frame ?? "#53738B", 0.08)};
    border-radius: 12px;
    border: 1px solid transparent;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px;
    color: ${tokens.foreground};
    text-align: center; padding: 8px; box-sizing: border-box; overflow: hidden;
  }
  .tile.empty { opacity: 0.35; }
  .lucide-tile { width: 30px; height: 30px; stroke-width: 1.75; }
  .glyph { font-size: 28px; line-height: 1; opacity: 0.9; }
  .label { font-weight: 500; line-height: 1.25; letter-spacing: 0.01em; white-space: pre-wrap; }
  .cmd {
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px; opacity: 0.55; max-width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
</style></head>
<body>
  <div class="frame">${tileHtml}</div>
  <script>window.lucide && window.lucide.createIcons()</script>
</body></html>`
}

const loadDecks = async () => {
  const decks = new Map()
  for (const entry of DECKS) {
    try {
      let yamlText
      if (entry.deckKey === "main") {
        yamlText = await fs.readFile(resolve(repoRoot, "config.yml"), "utf8")
        yamlText = yamlText.replace(/^  [a-z0-9-]+:\s*!include\s+.+$/gim, "")
      } else {
        yamlText = await fs.readFile(resolve(repoRoot, entry.yml), "utf8")
      }
      const parsed = parseYaml(yamlText)
      const deck = entry.deckKey === "main" ? parsed?.decks?.main : parsed
      if (!deck) continue
      decks.set(entry.id, {
        name: deck.name ?? entry.id,
        buttons: Array.isArray(deck.buttons) ? deck.buttons : [],
      })
    } catch (err) {
      console.warn(`[deck] ${entry.id}: ${err.message}`)
    }
  }
  return decks
}

const main = async () => {
  const decks = await loadDecks()
  console.log(`[setup] loaded ${decks.size} decks`)

  const themes = new Map()
  for (const t of THEMES) {
    try {
      const manifest = loadTheme(t.manifest)
      themes.set(t.id, {
        id: t.id,
        dark: !(t.id === "light"),
        tokens: manifest.colorTokens,
        tints: tintsForTheme(manifest),
      })
    } catch (err) {
      console.warn(`[theme] ${t.id}: ${err.message}`)
    }
  }
  console.log(`[setup] loaded themes: ${[...themes.keys()].join(", ")}`)

  const browser = await chromium.launch({ headless: true })
  let ok = 0
  for (const shot of SHOTS) {
    const deck = decks.get(shot.deck)
    const theme = themes.get(shot.theme)
    if (!deck || !theme) {
      console.warn(
        `[skip] ${shot.out}: missing deck=${shot.deck} theme=${shot.theme}`,
      )
      continue
    }
    const ctx = await browser.newContext({
      viewport: {
        width: FRAME_W + PAD * 6,
        height: FRAME_H + PAD * 6,
      },
      deviceScaleFactor: 3,
    })
    const page = await ctx.newPage()
    try {
      const html = renderHtml(deck.name, deck.buttons, theme)
      if (process.env.CAPTURE_DEBUG_HTML) {
        await fs.writeFile(resolve(outDir, `${shot.out}.html`), html)
      }
      await page
        .setContent(html, {
          waitUntil: "networkidle",
          timeout: 20_000,
        })
        .catch(() => {}) // CDN failure still leaves readable DOM below
      await page.waitForSelector(".frame", { timeout: 5000 })
      await page.evaluate(() => window.lucide?.createIcons()).catch(() => {})
      await page.waitForTimeout(150)
      const outPath = resolve(outDir, shot.out)
      await page.locator(".frame").screenshot({ path: outPath })
      ok += 1
      const alias = ALIASES[shot.out]
      if (alias) {
        await fs.copyFile(outPath, resolve(outDir, alias))
        console.log(`[capture] ok  ${shot.out}  (+alias ${alias})`)
      } else {
        console.log(`[capture] ok  ${shot.out}`)
      }
    } catch (err) {
      console.warn(`[capture] fail ${shot.out}: ${err.message}`)
    } finally {
      await ctx.close()
    }
  }
  await browser.close()
  console.log(`[done] ${ok}/${SHOTS.length} captured`)
}

main().catch((err) => {
  console.error("[fatal]", err)
  process.exit(1)
})
