interface ComponentProps {
  readonly config: unknown;
  readonly state: unknown;
}

const Component = ({ config }: ComponentProps) => {
  const { emoji, label } = (config as { emoji?: string; label?: string }) ?? {};
  return (
    <span className="flex h-full w-full items-center justify-center text-3xl text-fg">
      {emoji ?? label ?? ""}
    </span>
  );
};

export default Component;
