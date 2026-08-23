import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-nebula-border bg-nebula-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
