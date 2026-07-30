/**
 * Remotion bundling configuration. Tokens come from packages/cli via the
 * sync-tokens.mjs script; no Tailwind (we render with inline styles driven by
 * the deck's own design system).
 */

import { Config } from "@remotion/cli/config"

Config.setVideoImageFormat("jpeg")
Config.setOverwriteOutput(true)
