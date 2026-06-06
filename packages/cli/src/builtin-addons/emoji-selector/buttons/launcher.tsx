import { defineMountedButton } from '../../../addon/api.js'

import {
  EmojiLauncherButtonSchema,
  EMOJI_LAUNCHER_GRID,
  EMOJI_FONT_STACK,
} from '../support'

const emojiLauncherButton = defineMountedButton({
  configSchema: EmojiLauncherButtonSchema,
  render: () => (
    <div
      className="grid grid-cols-3 grid-rows-2 w-full h-full gap-0.5 p-1"
      data-sireno-launcher-grid="true"
    >
      {EMOJI_LAUNCHER_GRID.map((char) => (
        <div
          className="flex items-center justify-center text-2xl"
          data-sireno-launcher-cell="true"
          key={char}
          style={{ fontFamily: EMOJI_FONT_STACK }}
        >
          {char}
        </div>
      ))}
    </div>
  ),
  type: 'emoji-launcher',
})

export { emojiLauncherButton }
