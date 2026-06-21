import type { SurfaceSpec } from '@/render/protocol';
import { Text } from '@/ui';

export interface DateTimeSurfacePayload {
  buttonType: string;
  format?: string;
  label?: string;
}

export function isDateTimeSurfaceSpec(spec: unknown): spec is SurfaceSpec & { config: DateTimeSurfacePayload } {
  if (!spec || typeof spec !== 'object') return false;
  const s = spec as Record<string, unknown>;
  return (
    typeof s.addonName === 'string' &&
    s.addonName === 'date-time' &&
    typeof s.buttonType === 'string'
  );
}

const SUPPORTED_BUTTON_TYPES = new Set([
  'date-time',
  'time',
  'date',
  'clock',
  'analog-clock',
  'locked-time-tile',
]);

export default function DateTimeFrontend(props: { spec: SurfaceSpec }) {
  const { spec } = props;
  if (!SUPPORTED_BUTTON_TYPES.has(spec.buttonType)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-danger/10 p-1">
        <Text size="xs" tone="danger">
          unknown: {spec.buttonType}
        </Text>
      </div>
    );
  }
  const config = (spec.config ?? {}) as DateTimeSurfacePayload;
  const label = config.label ?? config.format ?? spec.buttonType;
  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-1">
      <Text size="md" tone="foreground" typography="main" fit="shrink">
        {label}
      </Text>
    </div>
  );
}