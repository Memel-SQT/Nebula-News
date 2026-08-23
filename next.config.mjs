/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle: what the Electron desktop build spawns as
  // a child process, and also a valid (if unused-by-default) way to
  // self-host outside Vercel. Harmless for Vercel deployments — Vercel uses
  // its own build output regardless of this setting.
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // No image-optimization server/sharp binary to carry around in a
    // packaged desktop app; next/image just behaves like a plain <img>.
    unoptimized: true,
  },
};

export default nextConfig;
