import { SheepVisual } from "./SheepVisual";
import type { SheepVisualVariant } from "./SheepVisual";

export type SheepVariant = "front" | "sleepy" | "floating" | "recording" | "thinking" | "tiny";

type SheepIconProps = {
  className?: string;
  variant?: SheepVariant;
};

const legacyVariantMap: Record<SheepVariant, SheepVisualVariant> = {
  front: "mascot",
  sleepy: "empty",
  floating: "floating",
  recording: "recording",
  thinking: "thinking",
  tiny: "mascot",
};

const legacyMotionMap: Record<SheepVariant, "none" | "soft" | "float" | "bounce" | "thinking"> = {
  front: "soft",
  sleepy: "soft",
  floating: "float",
  recording: "bounce",
  thinking: "thinking",
  tiny: "soft",
};

export function SheepIcon({ className, variant = "front" }: SheepIconProps) {
  return (
    <SheepVisual
      variant={legacyVariantMap[variant]}
      motion={legacyMotionMap[variant]}
      className={className}
      decorative
    />
  );
}
