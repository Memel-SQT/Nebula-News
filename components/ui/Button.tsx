import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-150 ease-out disabled:cursor-default disabled:opacity-60",
        variant === "primary" &&
          "bg-nebula-gradient text-white shadow-[0_10px_30px_-12px_rgba(139,92,246,0.55)] hover:bg-nebula-gradient-hover hover:-translate-y-0.5 active:translate-y-0",
        variant === "secondary" &&
          "border border-nebula-border bg-nebula-card-alt text-nebula-text hover:border-nebula-violet",
        variant === "ghost" &&
          "text-nebula-text-secondary hover:text-nebula-text",
        className
      )}
      {...props}
    />
  );
}
