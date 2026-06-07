import { Label } from '@/ui'
import { defineMountedButton } from '@/addon/api'

import {
  EMOJI_FONT_STACK,
  EMOJI_LAUNCHER_GRID,
  EmojiLauncherButtonSchema,
} from '../support'

const emojiSelectorButton = defineMountedButton({
  configSchema: EmojiLauncherButtonSchema,
  render: () => (
    <div>
      <div
        className="grid grid-cols-3 grid-rows-2 w-full h-full gap-0 p-1"
        data-sireno-launcher-grid="true"
      >
        {EMOJI_LAUNCHER_GRID.map((char) => (
          <div
            className="-mx-1 -my-1 flex items-center justify-center text-md"
            data-sireno-launcher-cell="true"
            key={char}
            style={{ fontFamily: EMOJI_FONT_STACK }}
          >
            <div className="">{char}</div>
          </div>
        ))}
      </div>
      <Label>Emojis</Label>
    </div>
  ),
  onTap: ({ methods }) => {
    methods.navigateToDeck('emoji')
  },
  type: 'emoji-selector',
})

export { emojiSelectorButton as emojiLauncherButton }
