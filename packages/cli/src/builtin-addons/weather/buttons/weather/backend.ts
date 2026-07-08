import type { AddonButtonServiceContext, AddonButtonTypeService } from "@/addon/api";

import { configSchema, type ConfigSchema } from "./config";

const registerCity = (ctx: AddonButtonServiceContext<ConfigSchema>): void => {
  const loc = ctx.config?.location;
  if (loc === undefined) return;
  ctx.methods["weather:registerCity"]?.(ctx.buttonId, loc, ctx.config.units);
};

const unregisterCity = (ctx: AddonButtonServiceContext<ConfigSchema>): void => {
  ctx.methods["weather:unregisterCity"]?.(ctx.buttonId);
};

const refreshWeather = (ctx: AddonButtonServiceContext<ConfigSchema>): void => {
  ctx.methods["weather:refreshWeather"]?.();
};

export default {
  configSchema,
  onMount: registerCity,
  onTap: refreshWeather,
  dispose: unregisterCity,
} satisfies AddonButtonTypeService<ConfigSchema>;
