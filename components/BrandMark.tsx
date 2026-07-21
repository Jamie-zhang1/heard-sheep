import clsx from "clsx";

type BrandMarkProps = {
  className?: string;
  tone?: "brand" | "light" | "success" | "warning" | "muted";
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
};

const sizeClasses = {
  xs: "h-6 w-6 rounded-lg",
  sm: "h-10 w-10 rounded-xl",
  md: "h-14 w-14 rounded-2xl",
  lg: "h-20 w-20 rounded-[24px]"
} as const;

const toneClasses = {
  brand: "bg-brand text-white shadow-btn",
  light: "bg-brand-light text-brand",
  success: "bg-tag-green text-[#353535]",
  warning: "bg-tag-amber text-[#555555]",
  muted: "bg-surface-2 text-ink-2"
} as const;

export function BrandMark({ className, tone = "brand", size = "sm", label }: BrandMarkProps) {
  return (
    <span
      className={clsx(
        "brand-mark inline-flex shrink-0 items-center justify-center",
        sizeClasses[size],
        toneClasses[tone],
        className
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 48 48" className="h-[62%] w-[62%]" fill="none">
        <path d="M8 25h4l3-8 5 15 5-21 5 27 4-13h6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m29 15 3 3 7-8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
