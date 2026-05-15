import clsx from "clsx";
import { withBasePath } from "@/lib/api-path";
import { sheepAssets, type SheepVisualVariant } from "@/lib/sheep-assets";

type SheepVisualSize = "xs" | "sm" | "md" | "lg" | "xl";

type SheepVisualProps = {
  variant?: SheepVisualVariant;
  size?: SheepVisualSize;
  className?: string;
  decorative?: boolean;
  motion?: "none" | "soft" | "float" | "bounce" | "thinking";
  preferUiAsset?: boolean;
};

const sizeClass: Record<SheepVisualSize, string> = {
  xs: "h-5 w-5",
  sm: "h-10 w-10",
  md: "h-20 w-20",
  lg: "h-28 w-28",
  xl: "h-36 w-36",
};

const motionClass = {
  none: "",
  soft: "sheep-motion-front",
  float: "sheep-motion-floating",
  bounce: "sheep-motion-recording",
  thinking: "sheep-motion-thinking sheep-thinking-soft",
};

export function SheepVisual({
  variant = "mascot",
  size = "md",
  className,
  decorative = false,
  motion = "soft",
  preferUiAsset = true,
}: SheepVisualProps) {
  const asset = sheepAssets[variant] ?? sheepAssets.mascot;
  const src = preferUiAsset && asset.uiSrc ? asset.uiSrc : asset.src;

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center overflow-visible",
        "sheep-icon-motion",
        sizeClass[size],
        motionClass[motion],
        className,
      )}
      aria-hidden={decorative ? true : undefined}
    >
      <img
        src={withBasePath(src)}
        alt={decorative ? "" : asset.alt}
        draggable={false}
        loading={variant === "mascot" ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full select-none object-contain object-center"
      />
    </span>
  );
}

export type { SheepVisualVariant };
