import { Accordion, Fieldset, Tabs } from "@heroui/react"

import { ActionValueEditor } from "./ActionValueEditor"

type GestureActions = { tap?: string; dbltap?: string; hold?: string }

export const ButtonActionsEditor = ({
  value,
  ownedGestures = [],
  onChange,
}: {
  readonly value: GestureActions
  readonly ownedGestures?: readonly ("tap" | "dbl-tap" | "hold")[]
  readonly onChange: (value: GestureActions) => void
}) => {
  const gestures = (
    [
      ["tap", "tap", "Tap"],
      ["dbl-tap", "dbltap", "Double tap"],
      ["hold", "hold", "Hold"],
    ] as const
  ).filter(([gesture]) => !ownedGestures.includes(gesture))

  if (gestures.length === 0) return null

  const changeGesture = (
    key: "tap" | "dbltap" | "hold",
    next: string,
  ): void => {
    const actions = { ...value }
    if (next === "") delete actions[key]
    else actions[key] = next
    onChange(actions)
  }

  return (
    <Accordion variant="surface" className="w-full">
      <Accordion.Item
        id="gesture-actions"
        className="rounded-lg bg-neutral-800"
      >
        <Accordion.Heading>
          <Accordion.Trigger>
            Gesture actions
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="bg-neutral-800">
            <Fieldset className="grid gap-3 border-0 p-0">
              <Fieldset.Legend className="sr-only">
                Gesture actions
              </Fieldset.Legend>
              <Tabs
                aria-label="Gesture actions"
                defaultSelectedKey={gestures[0]![1]}
              >
                <Tabs.ListContainer>
                  <Tabs.List>
                    {gestures.map(([, key, label]) => (
                      <Tabs.Tab key={key} id={key}>
                        {label}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
                {gestures.map(([, key, label]) => (
                  <Tabs.Panel key={key} id={key}>
                    <ActionValueEditor
                      label={label}
                      value={value[key] ?? ""}
                      onChange={(next) => changeGesture(key, next)}
                    />
                  </Tabs.Panel>
                ))}
              </Tabs>
            </Fieldset>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
