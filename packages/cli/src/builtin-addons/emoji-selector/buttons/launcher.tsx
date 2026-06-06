import { Label } from '@/ui'
import { defineMountedButton } from '../../../addon/api.js'

import {
  EMOJI_FONT_STACK,
  EMOJI_LAUNCHER_GRID,
  EmojiLauncherButtonSchema,
} from '../support'
import { getHostHidToolStatus } from '../os-shims.js'

const emojiSelectorButton = defineMountedButton({
  configSchema: EmojiLauncherButtonSchema,
  render: ({ hostContext }) => {
    const toolStatus = getHostHidToolStatus(hostContext.os.type)
    if (!toolStatus.available) {
      return (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center"
          data-sireno-launcher-error="true"
        >
          <div className="text-2xl">⚠</div>
          <div className="text-[10px] font-mono">HID tool missing</div>
          <div className="text-[9px] opacity-80 leading-tight">
            {toolStatus.reason}
          </div>
          <div className="text-[9px] opacity-60 leading-tight italic mt-1">
            {toolStatus.installHint}
          </div>
        </div>
      )
    }
    return (
      <div>
        <div
          className="grid grid-cols-3 grid-rows-2 w-full h-full gap-0.5 p-1"
          data-sireno-launcher-grid="true"
        >
          {EMOJI_LAUNCHER_GRID.map((char) => (
            <div
              className="flex items-center justify-center text-md"
              data-sireno-launcher-cell="true"
              key={char}
              style={{ fontFamily: EMOJI_FONT_STACK }}
            >
              <div className="-ml-1 -mt-1">{char}</div>
            </div>
          ))}
        </div>
        <Label>Emojis</Label>
      </div>
    )
  },
  onTap: ({ methods, hostContext }) => {
    const toolStatus = getHostHidToolStatus(hostContext.os.type)
    if (!toolStatus.available) return
    methods.navigateToDeck('emojis')
  },
  type: 'emoji-selector',
})

export { emojiSelectorButton as emojiLauncherButton }
