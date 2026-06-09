import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'

import {
  CLI_VERSION,
  LOGO_DATA_URL,
  LogoVersion,
} from '../surfaces/LogoVersion'

describe('LogoVersion', () => {
  it('renders the logo image and the version text', () => {
    const html = renderReactNodeToHtml(createElement(LogoVersion))
    expect(html).toContain('data:image/png;base64')
    expect(html).toContain(`v${CLI_VERSION}`)
  })

  it('exports LOGO_DATA_URL and CLI_VERSION', () => {
    expect(typeof LOGO_DATA_URL).toBe('string')
    expect(LOGO_DATA_URL.length).toBeGreaterThan(0)
    expect(LOGO_DATA_URL.startsWith('data:image/png;base64,')).toBe(true)
    expect(typeof CLI_VERSION).toBe('string')
    expect(CLI_VERSION.length).toBeGreaterThan(0)
  })

  it('renders a className marker for test introspection', () => {
    const html = renderReactNodeToHtml(createElement(LogoVersion))
    expect(html).toContain('sireno-logo-version')
  })
})
