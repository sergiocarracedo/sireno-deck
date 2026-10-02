import { ArrayControl } from "./controls/ArrayControl"
import { BooleanControl } from "./controls/BooleanControl"
import { DeckSelectControl } from "./controls/DeckSelectControl"
import { ObjectControl } from "./controls/ObjectControl"
import { RecordControl } from "./controls/RecordControl"
import { SelectControl } from "./controls/SelectControl"
import { TextControl } from "./controls/TextControl"
import { UnionControl } from "./controls/UnionControl"
import { X_CONTROL_COMPONENTS } from "./controls/registry"
import { labelFor } from "./utils"
import type { ConfigFormProps, ControlProps } from "./types"

export const ConfigForm = (props: ConfigFormProps) => {
  const { schema, path } = props
  const controlProps: ControlProps = {
    ...props,
    label: schema.title ?? labelFor(path.split(".").at(-1) ?? "Value"),
    description: schema.description,
    renderConfig: ConfigForm,
  }

  const variants = schema.oneOf ?? schema.anyOf
  if (variants !== undefined && variants.length > 0)
    return <UnionControl {...controlProps} />

  if (
    schema.type === "object" &&
    schema.additionalProperties !== undefined &&
    Object.keys(schema.properties ?? {}).length === 0
  )
    return <RecordControl {...controlProps} />

  const customControl = X_CONTROL_COMPONENTS[schema["x-control"] ?? ""]
  if (customControl !== undefined) {
    const CustomControl = customControl
    return <CustomControl {...controlProps} />
  }

  if (schema.enum !== undefined) return <SelectControl {...controlProps} />

  if (path.split(".").at(-1) === "deck" && props.deckOptions !== undefined)
    return <DeckSelectControl {...controlProps} />

  if (schema.type === "object" || schema.properties !== undefined)
    return <ObjectControl {...controlProps} />

  if (schema.type === "array") return <ArrayControl {...controlProps} />
  if (schema.type === "boolean") return <BooleanControl {...controlProps} />
  return <TextControl {...controlProps} />
}
