import { Description } from "@heroui/react"
import { Fragment } from "react"

import { joinPath, labelFor } from "../utils"
import type { ControlProps } from "../types"

export const ObjectControl = ({
  schema,
  value,
  path,
  error,
  compact,
  onChange,
  renderConfig,
  deckOptions,
  onPendingAssetChange,
}: ControlProps) => (
  <div className="grid min-w-0 gap-3 border-l border-neutral-800 pl-3">
    {schema.description && <Description>{schema.description}</Description>}
    {error && (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    )}
    {Object.entries(schema.properties ?? {})
      .filter(([, child]) => child.internal !== true)
      .map(([key, child]) => (
        <Fragment key={key}>
          {renderConfig({
            schema: child,
            value:
              typeof value === "object" && value !== null
                ? (value as Record<string, unknown>)[key]
                : undefined,
            path: joinPath(path, key),
            onChange,
            deckOptions,
            compact,
            onPendingAssetChange,
          })}
        </Fragment>
      ))}
    {Object.entries(schema.properties ?? {}).filter(
      ([, child]) => child.internal !== true,
    ).length === 0 && (
      <p className="text-xs text-neutral-500">
        {schema.title ?? labelFor(path.split(".").at(-1) ?? "Config")} has no
        fields.
      </p>
    )}
  </div>
)
