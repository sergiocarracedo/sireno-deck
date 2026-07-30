import type { ThemeUiPresentation } from "@/ui"

interface UiOverridesModule {
  components?: { ButtonFrame?: ThemeUiPresentation["buttonFrame"] }
  surfaces?: ThemeUiPresentation["surfaces"]
  primitives?: ThemeUiPresentation["primitives"]
}

/**
 * Build a ThemeUiPresentation from a ui-overrides module. Returns undefined
 * when the module has no overrides so the provider can stay free of extra
 * context. Used by both `frontend/src/App.tsx` and `emulator/src/App.tsx`
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
  return {
    ...(components?.ButtonFrame ? { buttonFrame: components.ButtonFrame } : {}),
    ...(surfaces ? { surfaces } : {}),
    ...(primitives ? { primitives } : {}),
  }
}
