import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "relative z-10 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </main>
  );
}
