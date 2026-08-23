/** Ambient cosmic backdrop, ported from the original Nebula app's .bg-glow treatment. */
export function BgGlow() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 animate-glow-drift bg-nebula-glow"
    />
  );
}
