import type { NextConfig } from "next";

// Proxy same-origin: o browser só vê wrapped.cajuos.dev.
// WRAPPED_API_URL = URL workers.dev do worker (env na Vercel; dev local: wrangler na 8787).
const API = process.env.WRAPPED_API_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/stats", destination: `${API}/stats` }];
  },
};

export default nextConfig;
