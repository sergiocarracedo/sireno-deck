import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { Icon, Text } from '@/ui/index'

const LOGO_DATA_URL = `data:image/png;base64,${readFileSync(
  fileURLToPath(new URL('../assets/logo72x72.png', import.meta.url)),
).toString('base64')}`

const { version: CLI_VERSION } = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../package.json', import.meta.url)),
    'utf8',
  ),
)

interface SystemBackButtonProps {
  isMainDeck: boolean
  backIconOverride?: string
}

export function SystemBackButton(props: SystemBackButtonProps): ReactElement {
  const { isMainDeck, backIconOverride } = props

  if (isMainDeck) {
    return (
      <ButtonSurface full>
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <img
            alt="Sireno Deck"
            className="shrink-0"
            src={LOGO_DATA_URL}
            style={{ height: 48, width: 48 }}
          />
          <Text size="xs" tone="foreground">
            v{CLI_VERSION}
          </Text>
        </div>
      </ButtonSurface>
    )
  }

  return (
    <ButtonSurface>
      <button
        className="flex h-full w-full items-center justify-center gap-1"
        data-sireno-system-back="true"
        type="button"
      >
        <Icon icon={backIconOverride ?? 'chevron-left'} size={16} />
        <Text size="sm" tone="foreground">
          Back
        </Text>
      </button>
    </ButtonSurface>
  )
}
