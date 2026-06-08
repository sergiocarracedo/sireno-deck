import type { ReactElement } from "react"

import { ButtonSurface } from "@/addon/api"
import { Icon, Text } from "@/ui/index"
import { LogoVersion } from "@/ui/LogoVersion"

interface SystemBackButtonProps {
  backIconOverride?: string
  isMainDeck: boolean
  onNavigateToSettings?: () => void
}

export function SystemBackButton(props: SystemBackButtonProps): ReactElement {
  const { isMainDeck, backIconOverride, onNavigateToSettings } = props

  if (isMainDeck) {
    if (onNavigateToSettings) {
      return (
        <ButtonSurface full>
          <button
            className="flex h-full w-full flex-col items-center justify-center gap-0.5"
            data-sireno-settings-affordance="true"
            onClick={onNavigateToSettings}
            type="button"
          >
            <Icon icon="settings" size={48} />
            <Text size="xs" tone="foreground">Settings</Text>
          </button>
        </ButtonSurface>
      )
    }
    return (
      <ButtonSurface full>
        <LogoVersion />
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
        <Icon icon={backIconOverride ?? "chevron-left"} size={16} />
        <Text size="sm" tone="foreground">Back</Text>
      </button>
    </ButtonSurface>
  )
}
