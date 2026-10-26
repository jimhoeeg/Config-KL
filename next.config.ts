import type { NextConfig } from "next";

// Sites allowed to show /embed in an iframe. Everything else may not frame the app.
const embedOrigins = (process.env.EMBED_ALLOWED_ORIGINS ?? "https://klkoleteknik.dk https://www.klkoleteknik.dk").trim();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    return [
      { source: "/((?!embed).*)", headers: [...common, { key: "Content-Security-Policy", value: "frame-ancestors 'self'" }] },
      { source: "/embed", headers: [...common, { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${embedOrigins}` }] },
      { source: "/embed.js", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }, { key: "Cache-Control", value: "public, max-age=3600" }] },
    ];
  },
};

export default nextConfig;
