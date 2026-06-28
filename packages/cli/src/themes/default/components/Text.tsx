import type { CSSProperties, ReactElement, ReactNode } from "react";

export type TextAlign = "center" | "left" | "right";
export type TextFit = "ellipsis" | "shrink" | "wrap" | "hidden";
export type TextTone = "fg" | "muted" | "accent" | "danger" | "primary" | "success";
export type TextTypography = "mono" | "main" | "aux";
export type TextSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "5xl";

export interface TextProps {
  align?: TextAlign;
  children: ReactNode;
  className?: string;
  fit?: TextFit;
  fontStack?: string;
  style?: CSSProperties;
  tone?: TextTone;
  typography?: TextTypography;
  size?: TextSize;
}

const ALIGN_CLASS: Record<TextAlign, string> = {
  center: "text-center",
  left: "text-left",
  right: "text-right",
};

const TONE_CLASS: Record<TextTone, string> = {
  fg: "text-foreground",
  muted: "text-muted",
  accent: "text-accent",
  danger: "text-danger",
  primary: "text-primary",
  success: "text-success",
};

const TYPOGRAPHY_CLASS: Record<TextTypography, string> = {
  mono: "font-mono",
  main: "font-main",
  aux: "font-aux",
};

const SIZE_CLASS: Record<TextSize, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "5xl": "text-5xl",
};

const RICH_TONE_TAGS = ["accent", "danger", "fg", "primary", "success"] as const;
const RICH_SIZE_TAGS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "5xl"] as const;
type RichToneTag = (typeof RICH_TONE_TAGS)[number];
type RichSizeTag = (typeof RICH_SIZE_TAGS)[number];
type RichMarkupTag = "blink" | "highlight" | RichToneTag | RichSizeTag;

interface RichTextNode {
  type: "text" | "line-break" | "tag";
  value?: string;
  tag?: RichMarkupTag;
  children?: RichTextNode[];
}

type ParseStopTag = { kind: "tag"; tag: string };
type ParseStopHighlight = { kind: "highlight" };

const RICH_TAG_NAMES = new Set<string>([...RICH_TONE_TAGS, ...RICH_SIZE_TAGS, "blink", "dim"]);

const parseRichText = (input: string): RichTextNode[] | null => {
  let index = 0;

  const parseSequence = (stop?: ParseStopTag | ParseStopHighlight): RichTextNode[] | null => {
    const nodes: RichTextNode[] = [];
    let textStart = index;

    const flushText = () => {
      if (textStart < index) {
        nodes.push({ type: "text" as const, value: input.slice(textStart, index) });
      }
    };

    while (index < input.length) {
      if (stop?.kind === "highlight" && input[index] === "*") {
        flushText();
        index += 1;
        return nodes;
      }
      if (stop?.kind === "tag" && input.startsWith(`</${stop.tag}>`, index)) {
        flushText();
        index += stop.tag.length + 3;
        return nodes;
      }

      const current = input[index];
      if (current === "|") {
        flushText();
        nodes.push({ type: "line-break" as const });
        index += 1;
        textStart = index;
        continue;
      }
      if (current === "*") {
        flushText();
        index += 1;
        textStart = index;
        const children = parseSequence({ kind: "highlight" });
        if (children === null) return null;
        nodes.push({ type: "tag" as const, tag: "highlight" as const, children });
        textStart = index;
        continue;
      }
      if (current === "<") {
        if (input.startsWith("</", index)) return null;
        const closeIndex = input.indexOf(">", index + 1);
        if (closeIndex === -1) return null;
        const tagName = input.slice(index + 1, closeIndex);
        if (!RICH_TAG_NAMES.has(tagName)) return null;
        flushText();
        index = closeIndex + 1;
        textStart = index;
        const children = parseSequence({ kind: "tag", tag: tagName });
        if (children === null) return null;
        nodes.push({ type: "tag" as const, tag: tagName as RichMarkupTag, children });
        textStart = index;
        continue;
      }
      index += 1;
    }

    flushText();
    return stop ? null : nodes;
  };

  return parseSequence();
};

const isPlainTextTree = (nodes: ReadonlyArray<RichTextNode>): boolean =>
  nodes.every((n) => n.type === "text");

const renderRichTextNodes = (nodes: ReadonlyArray<RichTextNode>, keyPrefix: string): ReactNode[] =>
  nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.type === "text") return node.value;
    if (node.type === "line-break") {
      return <span key={key} data-sireno-rich-text-tag="line-break" />;
    }
    if (node.tag === "blink") {
      return (
        <span key={key} className="sireno-rich-text-blink">
          {renderRichTextNodes(node.children ?? [], key)}
        </span>
      );
    }
    const classes: string[] = [];
    if (node.tag === "highlight") classes.push("font-bold", TONE_CLASS.accent);
    else if (node.tag === "dim") classes.push("text-muted");
    else classes.push(TONE_CLASS[node.tag as TextTone] ?? SIZE_CLASS[node.tag as TextSize] ?? "");
    return (
      <span key={key} className={classes.filter(Boolean).join(" ")} data-sireno-rich-text-tag={node.tag}>
        {renderRichTextNodes(node.children ?? [], key)}
      </span>
    );
  });

const renderTextChildren = (children: ReactNode): ReactNode => {
  if (typeof children !== "string") return children;
  const parsed = parseRichText(children);
  if (parsed === null || isPlainTextTree(parsed)) return children;
  return renderRichTextNodes(parsed, "rich");
};

export const Text = ({
  align = "center",
  children,
  className,
  fit = "wrap",
  fontStack,
  style,
  tone = "fg",
  typography = "main",
  size = "md",
}: TextProps): ReactElement => {
  const renderedChildren = renderTextChildren(children);
  const fitClasses: Record<TextFit, string> = {
    wrap: "whitespace-normal break-words",
    ellipsis: "overflow-hidden whitespace-nowrap text-ellipsis",
    shrink: "sireno-text-fit-shrink whitespace-normal break-words",
    hidden: "overflow-hidden whitespace-nowrap",
  };
  const composedStyle = fontStack !== undefined ? { ...style, fontFamily: fontStack } : style;

  return (
    <div
      className={[
        "block max-w-full min-w-0 leading-tight",
        TYPOGRAPHY_CLASS[typography],
        TONE_CLASS[tone],
        ALIGN_CLASS[align],
        SIZE_CLASS[size],
        fitClasses[fit],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-sireno-text-fit={fit}
      data-sireno-text-size={size}
      data-sireno-ui-text="true"
      style={composedStyle}
    >
      {renderedChildren}
    </div>
  );
};

export const TextDefaultExport = Text;
