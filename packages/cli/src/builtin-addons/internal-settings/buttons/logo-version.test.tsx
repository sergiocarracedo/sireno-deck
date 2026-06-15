import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'

import {
  internalSettingsLogoVersionButton,
  InternalSettingsLogoVersionButtonSchema,
} from './logo-version'

describe('InternalSettingsLogoVersionButtonSchema', () => {
  it('parses an empty config', () => {
    expect(InternalSettingsLogoVersionButtonSchema.parse({})).toEqual({})
  })
})

describe('internalSettingsLogoVersionButton', () => {
  it('has the expected type and configSchema', () => {
    expect(internalSettingsLogoVersionButton.type).toBe(
      '__sireno_internal_settings_logo_version',
    )
    expect(internalSettingsLogoVersionButton.configSchema).toBe(
      InternalSettingsLogoVersionButtonSchema,
    )
  })

  it('does not define onTap', () => {
    expect(internalSettingsLogoVersionButton.onTap).toBeUndefined()
  })

  it('renders the sireno logo and v1 label', () => {
    const html = renderReactNodeToHtml(
      (internalSettingsLogoVersionButton.render as never)({
        config: {},
        full: false,
        position: 3,
      }),
    )
    expect(html).toContain('data-sireno-settings-button="logo-version"')
    expect(html).toContain('sireno')
    expect(html).toContain('v1')
  })
})
