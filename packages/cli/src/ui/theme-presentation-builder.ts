import type { ThemeUiPresentation, ThemeOverrideContext } from "@/ui"
import { labelBase } from "./primitives/Label"
import { textBase } from "./primitives/Text"
import { iconBase } from "./primitives/Icon"
import { chipBase } from "./primitives/Chip"
import { tapIndicatorBase } from "./primitives/TapIndicator"
import { progressBarBase } from "./primitives/ProgressBar"
import { iconLabelSurfaceBase } from "./surfaces/IconLabelSurface"
import { iconLabelProgressSurfaceBase } from "./surfaces/IconLabelProgressSurface"
import { barsSurfaceBase } from "./surfaces/BarsSurface"
import { splitActionSurfaceBase } from "./surfaces/SplitActionSurface"
import { labelValueListSurfaceBase } from "./surfaces/LabelValueListSurface"
import { temporaryErrorSurfaceBase } from "./surfaces/TemporaryErrorSurface"
import { valueChartBase } from "./surfaces/ValueChart"
import { paginatedSurfaceBase } from "./surfaces/PaginatedSurface"
import { buttonFrameBase } from "./ButtonFrame"

interface UiOverridesModule {
  components?: { ButtonFrame?: ThemeUiPresentation["buttonFrame"] }
  surfaces?: ThemeUiPresentation["surfaces"]
  primitives?: ThemeUiPresentation["primitives"]
}

/**
 * Build a ThemeUiPresentation from a ui-overrides module. Returns undefined
 * when the module has no overrides so the provider can stay free of extra
 * context. Used by both `frontend/src/App.tsx` and `config-ui/src/App.tsx`
 * so changes to the override contract stay in one place.
 */
export const buildPresentation = (
  uiOverrides: unknown,
): ThemeUiPresentation | undefined => {
  if (uiOverrides === null || uiOverrides === undefined) return undefined
  const overrides = uiOverrides as UiOverridesModule
  const components = overrides.components
  const surfaces = overrides.surfaces
  const primitives = overrides.primitives
  if (!components?.ButtonFrame && !surfaces && !primitives) return undefined

  const wrappedPrimitives = primitives
    ? {
        ...(primitives.chip
          ? {
              chip: (
                props: Parameters<typeof chipBase>[0],
                ctx?: ThemeOverrideContext,
              ) => primitives.chip!(props, ctx, chipBase),
            }
          : {}),
        ...(primitives.icon
          ? {
              icon: (
                props: Parameters<typeof iconBase>[0],
                ctx?: ThemeOverrideContext,
              ) => primitives.icon!(props, ctx, iconBase),
            }
          : {}),
        ...(primitives.text
          ? {
              text: (
                props: Parameters<typeof textBase>[0],
                ctx?: ThemeOverrideContext,
              ) => primitives.text!(props, ctx, textBase),
            }
          : {}),
        ...(primitives.label
          ? {
              label: (
                props: Parameters<typeof labelBase>[0],
                ctx?: ThemeOverrideContext,
              ) => primitives.label!(props, ctx, labelBase),
            }
          : {}),
        ...(primitives.tapIndicator
          ? {
              tapIndicator: (
                props: Parameters<typeof tapIndicatorBase>[0],
                ctx?: ThemeOverrideContext,
              ) => primitives.tapIndicator!(props, ctx, tapIndicatorBase),
            }
          : {}),
        ...(primitives.progressBar
          ? {
              progressBar: (
                props: Parameters<typeof progressBarBase>[0],
                ctx?: ThemeOverrideContext,
              ) => primitives.progressBar!(props, ctx, progressBarBase),
            }
          : {}),
      }
    : undefined

  const wrappedSurfaces = surfaces
    ? {
        ...(surfaces.iconLabel
          ? {
              iconLabel: (
                props: Parameters<typeof iconLabelSurfaceBase>[0],
                ctx?: ThemeOverrideContext,
              ) => surfaces.iconLabel!(props, ctx, iconLabelSurfaceBase),
            }
          : {}),
        ...(surfaces.iconLabelProgress
          ? {
              iconLabelProgress: (
                props: Parameters<typeof iconLabelProgressSurfaceBase>[0],
                ctx?: ThemeOverrideContext,
              ) =>
                surfaces.iconLabelProgress!(
                  props,
                  ctx,
                  iconLabelProgressSurfaceBase,
                ),
            }
          : {}),
        ...(surfaces.bars
          ? {
              bars: (
                props: Parameters<typeof barsSurfaceBase>[0],
                ctx?: ThemeOverrideContext,
              ) => surfaces.bars!(props, ctx, barsSurfaceBase),
            }
          : {}),
        ...(surfaces.splitAction
          ? {
              splitAction: (
                props: Parameters<typeof splitActionSurfaceBase>[0],
                ctx?: ThemeOverrideContext,
              ) => surfaces.splitAction!(props, ctx, splitActionSurfaceBase),
            }
          : {}),
        ...(surfaces.labelValueList
          ? {
              labelValueList: (
                props: Parameters<typeof labelValueListSurfaceBase>[0],
                ctx?: ThemeOverrideContext,
              ) =>
                surfaces.labelValueList!(props, ctx, labelValueListSurfaceBase),
            }
          : {}),
        ...(surfaces.temporaryError
          ? {
              temporaryError: (
                props: Parameters<typeof temporaryErrorSurfaceBase>[0],
                ctx?: ThemeOverrideContext,
              ) =>
                surfaces.temporaryError!(props, ctx, temporaryErrorSurfaceBase),
            }
          : {}),
        ...(surfaces.valueChart
          ? {
              valueChart: (
                props: Parameters<typeof valueChartBase>[0],
                ctx?: ThemeOverrideContext,
              ) => surfaces.valueChart!(props, ctx, valueChartBase),
            }
          : {}),
        ...(surfaces.paginated
          ? {
              paginated: (
                props: Parameters<typeof paginatedSurfaceBase>[0],
                ctx?: ThemeOverrideContext,
              ) => surfaces.paginated!(props, ctx, paginatedSurfaceBase),
            }
          : {}),
      }
    : undefined

  const wrappedButtonFrame = components?.ButtonFrame
    ? (
        props: Parameters<typeof buttonFrameBase>[0],
        ctx?: ThemeOverrideContext,
      ) => components.ButtonFrame!(props, ctx, buttonFrameBase)
    : undefined

  if (!wrappedButtonFrame && !wrappedSurfaces && !wrappedPrimitives)
    return undefined

  return {
    ...(wrappedButtonFrame ? { buttonFrame: wrappedButtonFrame } : {}),
    ...(wrappedSurfaces ? { surfaces: wrappedSurfaces } : {}),
    ...(wrappedPrimitives ? { primitives: wrappedPrimitives } : {}),
  }
}
