import { Input, Label, ListBox, Select, TextField } from "@heroui/react"

import { parsePlatformMacro } from "@/deck/macro-parse"
import { MacroPreview } from "./MacroPreview"

type MacroParts = {
  fallback: string
  macos: string
  linux: string
  windows: string
}

const parseMacro = (value: string): MacroParts => {
  if (!value.startsWith("macro://"))
    return { fallback: value, macos: "", linux: "", windows: "" }
  const inner = value.slice("macro://".length)
  if (inner.startsWith("{")) {
    try {
      const overrides = JSON.parse(inner) as Record<string, unknown>
      return {
        fallback: typeof overrides.all === "string" ? overrides.all : "",
        macos:
          typeof overrides.macos === "string"
            ? overrides.macos
            : typeof overrides.osx === "string"
              ? overrides.osx
              : "",
        linux: typeof overrides.linux === "string" ? overrides.linux : "",
        windows: typeof overrides.windows === "string" ? overrides.windows : "",
      }
    } catch {
      return { fallback: inner, macos: "", linux: "", windows: "" }
    }
  }
  try {
    const parsed = parsePlatformMacro(inner)
    return {
      fallback: parsed.fallback,
      macos: parsed.overrides.get("macos") ?? "",
      linux: parsed.overrides.get("linux") ?? "",
      windows: parsed.overrides.get("windows") ?? "",
    }
  } catch {
    return { fallback: "", macos: "", linux: "", windows: "" }
  }
}

export const isValidActionValue = (value: string): boolean => {
  if (!value.startsWith("macro://")) return true
  try {
    parsePlatformMacro(value.slice("macro://".length))
    return true
  } catch {
    return false
  }
}

const buildMacro = (parts: MacroParts): string => {
  if (parts.fallback.trim() === "") return "macro://"
  const overrides = (
    [
      ["macos", parts.macos],
      ["linux", parts.linux],
      ["windows", parts.windows],
    ] as const
  )
    .filter(([, command]) => command.trim() !== "")
    .map(([os, command]) => `[${os}:${command}]`)
    .join("")
  return `macro://${overrides}${parts.fallback}`
}

export const ActionValueEditor = ({
  label,
  value,
  onChange,
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
}) => {
  const isMacro = value.startsWith("macro://")
  const macro = parseMacro(value)
  const setMacro = (patch: Partial<MacroParts>): void =>
    onChange(buildMacro({ ...macro, ...patch }))
  const macroFields: Array<{
    label: string
    value: string
    onChange: (value: string) => void
  }> = [
    {
      label: "Default macro",
      value: macro.fallback,
      onChange: (fallback) => setMacro({ fallback }),
    },
    {
      label: "macOS override",
      value: macro.macos,
      onChange: (macos) => setMacro({ macos }),
    },
    {
      label: "Linux override",
      value: macro.linux,
      onChange: (linux) => setMacro({ linux }),
    },
    {
      label: "Windows override",
      value: macro.windows,
      onChange: (windows) => setMacro({ windows }),
    },
  ]

  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-separator bg-neutral-900 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Select
          aria-label={`${label} kind`}
          selectedKey={isMacro ? "macro" : "command"}
          onSelectionChange={(key) => {
            if (String(key) === "macro" && !isMacro)
              onChange(`macro://${value}`)
            else if (String(key) === "command" && isMacro)
              onChange(macro.fallback)
          }}
        >
          <Select.Trigger className="min-w-32">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="command" textValue="Command">
                Command
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="macro" textValue="Keyboard macro">
                Keyboard macro
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      {isMacro ? (
        <div className="grid min-w-0 gap-2">
          {macroFields.map((field) => (
            <TextField
              key={field.label}
              className="grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-2"
            >
              <Label className="min-w-0 break-words">{field.label}</Label>
              <Input
                aria-label={field.label}
                value={field.value}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                onChange={(event) => field.onChange(event.target.value)}
                className="min-w-0 bg-neutral-950 font-mono text-sm"
              />
            </TextField>
          ))}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {(
              [
                ["Default", macro.fallback],
                ["macOS", macro.macos],
                ["Linux", macro.linux],
                ["Windows", macro.windows],
              ] as const
            )
              .filter(([, command]) => command.trim() !== "")
              .map(([platform, command]) => (
                <div key={platform} className="flex items-center gap-1">
                  <span className="text-xs text-muted">{platform}</span>
                  <MacroPreview value={command} />
                </div>
              ))}
          </div>
          {macro.fallback.trim() === "" && (
            <p className="text-sm text-danger md:col-span-2">
              Add a default macro; platform overrides alone are not sufficient.
            </p>
          )}
          {!isValidActionValue(value) && macro.fallback.trim() !== "" && (
            <p role="alert" className="text-sm text-danger md:col-span-2">
              Check the platform override syntax; each override uses a key
              sequence such as <code>ctrl+c</code>.
            </p>
          )}
        </div>
      ) : (
        <TextField className="grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-2">
          <Label className="min-w-0 break-words">{label} command</Label>
          <Input
            aria-label={`${label} command`}
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 bg-neutral-950 font-mono text-sm"
          />
        </TextField>
      )}
    </div>
  )
}
