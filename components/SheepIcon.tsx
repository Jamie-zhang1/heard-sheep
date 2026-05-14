import clsx from "clsx";

export type SheepVariant = "front" | "sleepy" | "floating" | "recording" | "thinking" | "tiny";

type SheepIconProps = {
  className?: string;
  variant?: SheepVariant;
};

const sheepImage = "/sheep/brand/sheep-mascot-main-v1.png";

export function SheepIcon({ className, variant = "front" }: SheepIconProps) {
  return (
    <span
      className={clsx(
        "relative inline-flex items-center justify-center overflow-visible",
        "sheep-icon-motion",
        variant === "front" && "sheep-motion-front",
        variant === "floating" && "sheep-motion-floating",
        variant === "thinking" && "sheep-motion-thinking sheep-thinking-soft",
        variant === "sleepy" && "sheep-motion-sleepy",
        variant === "tiny" && "sheep-motion-tiny",
        variant === "recording" && "sheep-motion-recording",
        className
      )}
      aria-hidden="true"
    >
      <img
        src={sheepImage}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-contain object-center sheep-image-center"
      />
    </span>
  );
}
