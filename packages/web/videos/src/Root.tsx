import { Composition } from "remotion"
import { HeroLoop } from "./compositions/HeroLoop"
import { OverlayDeckShowcase } from "./compositions/OverlayDeckShowcase"
import { ButtonVariants } from "./compositions/ButtonVariants"
import { DeckStack } from "./compositions/DeckStack"

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HeroLoop"
        component={HeroLoop}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="OverlayDeckShowcase"
        component={OverlayDeckShowcase}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ButtonVariants"
        component={ButtonVariants}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DeckStack"
        component={DeckStack}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
