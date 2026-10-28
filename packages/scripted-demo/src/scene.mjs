const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const assert = (condition, message) => {
  if (!condition) throw new Error(`Invalid scripted demo scene: ${message}`)
}

export const parseScene = (value) => {
  assert(isObject(value), "expected an object")
  assert(value.version === 1, "version must be 1")
  assert(
    value.mode === "standalone" || value.mode === "passthrough",
    "mode must be standalone or passthrough",
  )
  assert(isObject(value.frontend), "frontend is required")
  assert(typeof value.frontend.root === "string", "frontend.root is required")
  assert(
    typeof value.frontend.configFile === "string",
    "frontend.configFile is required",
  )
  if (value.mode === "passthrough")
    assert(
      typeof value.upstreamUrl === "string",
      "upstreamUrl is required in passthrough mode",
    )
  assert(
    value.replaceChannels === undefined || Array.isArray(value.replaceChannels),
    "replaceChannels must be an array",
  )
  assert(
    Array.isArray(value.initialMessages ?? []),
    "initialMessages must be an array",
  )
  assert(Array.isArray(value.timeline ?? []), "timeline must be an array")

  for (const [index, step] of (value.timeline ?? []).entries()) {
    assert(isObject(step), `timeline[${index}] must be an object`)
    assert(
      Number.isFinite(step.atMs) && step.atMs >= 0,
      `timeline[${index}].atMs must be a positive number`,
    )
    assert(
      ["message", "gesture", "snapshot"].includes(step.kind),
      `timeline[${index}].kind is unsupported`,
    )
    if (step.kind === "message")
      assert(isObject(step.message), `timeline[${index}].message is required`)
    if (step.kind === "gesture") {
      assert(
        step.target === "frontend" || step.target === "service",
        `timeline[${index}].target must be frontend or service`,
      )
      assert(isObject(step.message), `timeline[${index}].message is required`)
    }
    if (step.kind === "snapshot")
      assert(
        typeof step.path === "string",
        `timeline[${index}].path is required`,
      )
  }
  return value
}

export const resolveScenePaths = (scene, sceneDirectory) => {
  const resolvePath = (path) => resolve(sceneDirectory, path)
  return {
    ...scene,
    frontend: {
      ...scene.frontend,
      root: resolvePath(scene.frontend.root),
      configFile: resolvePath(scene.frontend.configFile),
      ...(scene.frontend.theme
        ? {
            theme: {
              ...scene.frontend.theme,
              manifestPath: resolvePath(scene.frontend.theme.manifestPath),
            },
          }
        : {}),
    },
  }
}
import { resolve } from "node:path"
