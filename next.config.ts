import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `npm run build` emits ./out, which any static server can host.
  // Everything runs client-side, so the whole app works offline once cached.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
