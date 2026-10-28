import MediaPlayerButton from "../../cli/src/builtin-addons/media/buttons/media-player/frontend"
import WeatherButton from "../../cli/src/builtin-addons/weather/buttons/weather/frontend"

export const manifest = {
  buttonTypes: {
    "media:player": { frontend: MediaPlayerButton },
    "weather:weather": { frontend: WeatherButton },
  },
}
