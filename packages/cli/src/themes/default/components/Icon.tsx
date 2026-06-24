import type { ReactNode } from "react";

export interface IconProps {
  ref: string;
  size?: "sm" | "md" | "lg";
  fallback?: ReactNode;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<IconProps["size"]>, string> = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

const isLikelyImageRef = (ref: string): boolean =>
  ref.startsWith("./") ||
  ref.startsWith("../") ||
  ref.startsWith("/") ||
  ref.startsWith("http://") ||
  ref.startsWith("https://") ||
  ref.startsWith("data:") ||
  ref.startsWith("blob:") ||
  /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(ref);

export const Icon = ({ ref: refValue, size = "md", fallback, className }: IconProps) => {
  const cls = ["shrink-0", SIZE_CLASS[size], className ?? ""].filter(Boolean).join(" ");
  if (refValue.length === 0) {
    return <span className={cls}>{fallback ?? ""}</span>;
  }
  if (isLikelyImageRef(refValue)) {
    return <img src={refValue} alt="" className={cls} draggable={false} />;
  }
  return <span className={cls}>{fallback ?? refValue.slice(0, 1).toUpperCase()}</span>;
};

export const IconDefaultExport = Icon;
