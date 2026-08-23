import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "accent";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide",
        variant === "default" && "bg-nebula-card-alt text-nebula-text-secondary",
        variant === "outline" &&
          "border border-nebula-border text-nebula-text-secondary",
        variant === "accent" &&
          "bg-nebula-gradient text-white shadow-[0_6px_20px_-8px_rgba(139,92,246,0.7)]",
        className
      )}
    >
      {children}
    </span>
  );
}
