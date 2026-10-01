import { wrappedStats, type Env } from "./github";

const RATE_PER_MIN = 30;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowed = new Set([
      "https://wrapped.cajuos.dev",
      "https://cajuos.dev",
      "http://localhost:3000",
      "http://localhost:3001",
    ]);
    if (env.ALLOWED_ORIGIN) allowed.add(env.ALLOWED_ORIGIN);
    const origin = request.headers.get("Origin");
    const cors = new Headers();
    if (origin && allowed.has(origin)) {
      cors.set("Access-Control-Allow-Origin", origin);
      cors.set("Vary", "Origin");
      cors.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      cors.set("Access-Control-Max-Age", "86400");
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname !== "/stats" || request.method !== "GET") {
      return Response.json({ ok: false, error: "not-found" }, { status: 404, headers: cors });
    }

    // Rate limit simples via KV (sem KV, sem limit).
    const ip = request.headers.get("CF-Connecting-IP") ?? "";
    if (env.WRAPPED_CACHE && ip) {
      try {
        const minute = Math.floor(Date.now() / 60_000);
        const k = `rl:stats:${ip}:${minute}`;
        const cur = Number((await env.WRAPPED_CACHE.get(k)) ?? "0");
        if (cur >= RATE_PER_MIN) {
          return Response.json({ ok: false, error: "rate-limited" }, { status: 429, headers: cors });
        }
        await env.WRAPPED_CACHE.put(k, String(cur + 1), { expirationTtl: 120 });
      } catch {
        // segue sem limit
      }
    }

    try {
      const login = url.searchParams.get("u") ?? "";
      const { stats, cached } = await wrappedStats(login, env);
      const headers = new Headers(cors);
      headers.set("X-Cache", cached ? "HIT" : "MISS");
      return Response.json({ ok: true, ...stats }, { headers });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      const status = msg === "invalid-user" ? 404 : msg === "rate-limited" ? 429 : 502;
      return Response.json({ ok: false, error: msg }, { status, headers: cors });
    }
  },
};
