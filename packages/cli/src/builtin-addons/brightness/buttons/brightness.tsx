import type { AddonButtonTypeDefinition } from "@/addon/api.ts";
import { Text } from "@/themes/default/components/Text.tsx";

import { buildMacOSCommand, formatCommand, isMacOS } from "../domain/macos.ts";
import { BrightnessButtonSchema } from "../schemas.ts";

export const builtinBrightnessButton: AddonButtonTypeDefinition = {
  type: "brightness",
  configSchema: BrightnessButtonSchema,
  render: ({ config }) => {
    const platform = (globalThis as { process?: { platform?: string } }).process?.platform as
      | NodeJS.Platform
      | undefined;
    if (platform === undefined || !isMacOS(platform)) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Text size="xs" tone="muted" className="text-center">
            Not supported
            <br />
            on this platform
          </Text>
        </div>
      );
    }
    const arrow = config.action === "down" ? "🔅" : config.action === "set" ? "☀️" : "🔆";
    const label = config.action === "set" && config.value !== undefined ? `${config.value}%` : null;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <span className="text-2xl leading-none">{arrow}</span>
        {label ? <Text size="xs" tone="accent">{label}</Text> : null}
      </div>
    );
  },
  onTap: ({ config, hostContext }) => {
    const platform = (globalThis as { process?: { platform?: string } }).process?.platform as
      | NodeJS.Platform
      | undefined;
    if (platform === undefined || !isMacOS(platform)) return;
    const cmd = buildMacOSCommand(config);
    const exec = hostContext["exec"] as
      | ((cmd: string, args: string[]) => Promise<{ exitCode: number; stderr: string }>)
      | undefined;
    if (!exec) return;
    void exec(cmd[0]!, cmd.slice(1)).catch((err: unknown) => {
      const error = err as { message?: string };
      void error;
      void formatCommand(cmd);
    });
  },
};

export const brightnessAddon = {
  apiVersion: 3 as const,
  name: "brightness",
  kind: "runtime" as const,
  buttons: [builtinBrightnessButton],
};