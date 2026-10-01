"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WORKER =
  process.env.NEXT_PUBLIC_WORKER_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:8787" : "https://wrapped-api.cajuos.dev");
const STORE_KEY = "cajuos:wrapped";

type Theme = "dark" | "light" | "neon";

const THEMES: Record<Theme, { bg: string; fg: string; muted: string; accent: string; card: string; bar: string }> = {
  dark: { bg: "#0a0a0a", fg: "#ededed", muted: "#a1a1aa", accent: "#dc2626", card: "#141414", bar: "#27272a" },
  light: { bg: "#fafafa", fg: "#18181b", muted: "#71717a", accent: "#dc2626", card: "#ffffff", bar: "#e4e4e7" },
  neon: { bg: "#03130b", fg: "#d1ffe6", muted: "#5f8a72", accent: "#00ff88", card: "#062417", bar: "#0e3a24" },
};

interface Stats {
  profile: { login: string; name: string | null; avatarUrl: string; createdAt: string };
  totals: {
    commits: number; prs: number; issues: number; reviews: number;
    stars: number; repos: number; followers: number; yearsActive: number;
  };
  topLangs: { name: string; repos: number; stars: number }[];
}

interface Fun {
  cafe: number; sexta: number; prod: number; reuniao: number;
}

const FUN_DEFAULTS: Fun = { cafe: 4, sexta: 0, prod: 0, reuniao: 3 };

const ERRORS: Record<string, string> = {
  "invalid-user": "Usuário não existe no GitHub. Confere o @.",
  "rate-limited": "Muita gente gerando agora. Espera 1 minuto.",
  "no-token": "Worker sem token do GitHub. Volta mais tarde.",
};

function num(n: number): string {
  return n.toLocaleString("pt-BR");
}

function clamp(n: number): number {
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

async function loadAvatar(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawWrapped(
  canvas: HTMLCanvasElement,
  stats: Stats,
  fun: Fun,
  theme: Theme,
  format: "wide" | "square",
  avatar: HTMLImageElement | null,
) {
  const T = THEMES[theme];
  const W = format === "wide" ? 1200 : 1080;
  const H = format === "wide" ? 628 : 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const F = (w: number, extra = "") => `${w}px Geist, system-ui, sans-serif${extra}`;

  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, W, H);
  // dot grid sutil
  ctx.fillStyle = T.bar;
  const pad = format === "wide" ? 64 : 72;
  for (let x = pad; x < W - pad; x += 28) {
    for (let y = pad; y < H - pad; y += 28) {
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  let y = pad + 8;
  // header: avatar + login
  const R = 48;
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pad + R, y + R, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, pad, y, R * 2, R * 2);
    ctx.restore();
  } else {
    ctx.fillStyle = T.accent;
    ctx.beginPath();
    ctx.arc(pad + R, y + R, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = T.bg;
    ctx.font = `700 44px ${F(44)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stats.profile.login.slice(0, 2).toUpperCase(), pad + R, y + R + 2);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = T.fg;
  ctx.font = `700 54px ${F(54)}`;
  ctx.fillText(`@${stats.profile.login}`, pad + R * 2 + 24, y + 52);
  ctx.fillStyle = T.muted;
  ctx.font = `400 26px ${F(26)}`;
  const since = new Date(stats.profile.createdAt).getFullYear();
  const name = stats.profile.name ? `${stats.profile.name} · ` : "";
  ctx.fillText(`${name}no GitHub desde ${since} · ${stats.totals.yearsActive} anos de contribuição`, pad + R * 2 + 24, y + 88);
  y += R * 2 + 48;

  // stats grandes
  const big: [string, number][] = [
    ["commits", stats.totals.commits],
    ["PRs", stats.totals.prs],
    ["stars ganhas", stats.totals.stars],
    ["seguidores", stats.totals.followers],
  ];
  const cols = format === "wide" ? 4 : 2;
  const colW = (W - pad * 2) / cols;
  big.forEach(([label, v], i) => {
    const cx = pad + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * 130;
    ctx.fillStyle = T.fg;
    ctx.font = `700 52px ${F(52)}`;
    ctx.fillText(num(v), cx, cy + 44);
    ctx.fillStyle = T.muted;
    ctx.font = `400 24px ${F(24)}`;
    ctx.fillText(label, cx, cy + 80);
  });
  y += Math.ceil(big.length / cols) * 130 + 24;

  // faixa zoeira
  const funItems: [string, string][] = [
    ["cafés/dia", String(fun.cafe)],
    ["deploys numa sexta", String(fun.sexta)],
    ["dias sem quebrar prod", String(fun.prod)],
    ["reuniões que eram email", String(fun.reuniao)],
  ];
  ctx.fillStyle = T.card;
  const stripH = format === "wide" ? 84 : funItems.length * 52 + 32;
  ctx.beginPath();
  ctx.roundRect(pad, y, W - pad * 2, stripH, 16);
  ctx.fill();
  if (format === "wide") {
    funItems.forEach(([label, v], i) => {
      const cx = pad + 28 + i * ((W - pad * 2 - 56) / 4);
      ctx.fillStyle = T.accent;
      ctx.font = `700 34px ${F(34)}`;
      ctx.fillText(v, cx, y + 52);
      ctx.fillStyle = T.muted;
      ctx.font = `400 20px ${F(20)}`;
      ctx.fillText(label, cx, y + 74 - 8);
    });
  } else {
    funItems.forEach(([label, v], i) => {
      ctx.fillStyle = T.accent;
      ctx.font = `700 30px ${F(30)}`;
      ctx.fillText(v, pad + 28, y + 44 + i * 52);
      ctx.fillStyle = T.muted;
      ctx.font = `400 24px ${F(24)}`;
      ctx.fillText(label, pad + 110, y + 44 + i * 52);
    });
  }
  y += stripH + 28;

  // top linguagens
  const totalRepos = stats.topLangs.reduce((a, l) => a + l.repos, 0) || 1;
  ctx.fillStyle = T.muted;
  ctx.font = `400 22px ${F(22)}`;
  ctx.fillText("top linguagens", pad, y);
  y += 14;
  stats.topLangs.forEach((l) => {
    const bw = W - pad * 2;
    const frac = l.repos / totalRepos;
    y += 30;
    ctx.fillStyle = T.fg;
    ctx.font = `600 24px ${F(24)}`;
    ctx.fillText(l.name, pad, y);
    ctx.fillStyle = T.muted;
    ctx.font = `400 22px ${F(22)}`;
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(frac * 100)}%`, W - pad, y);
    ctx.textAlign = "left";
    y += 10;
    ctx.fillStyle = T.bar;
    ctx.beginPath();
    ctx.roundRect(pad, y, bw, 10, 5);
    ctx.fill();
    ctx.fillStyle = T.accent;
    if (frac > 0) {
      ctx.beginPath();
      ctx.roundRect(pad, y, Math.max(10, bw * frac), 10, 5);
      ctx.fill();
    }
    y += 10;
  });

  // marca d'água
  ctx.fillStyle = T.muted;
  ctx.font = `400 22px ${F(22)}`;
  ctx.textAlign = "right";
  ctx.fillText("wrapped.cajuos.dev", W - pad, H - 32);
  ctx.textAlign = "left";
}

function loadInitial(): { user: string; fun: Fun; theme: Theme; auto: boolean } {
  const fallback = { user: "", fun: FUN_DEFAULTS, theme: "dark" as Theme, auto: false };
  if (typeof window === "undefined") return fallback;
  const q = new URLSearchParams(window.location.search);
  const fun = { ...FUN_DEFAULTS };
  (["cafe", "sexta", "prod", "reuniao"] as const).forEach((k) => {
    if (q.has(k)) fun[k] = clamp(Number(q.get(k)));
  });
  let theme: Theme = "dark";
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as { fun?: Fun; theme?: Theme };
      // link compartilhado vence o que estava salvo
      if (!q.has("u") && s.fun) Object.assign(fun, s.fun);
      if (s.theme && THEMES[s.theme]) theme = s.theme;
    }
  } catch {
    // segue com defaults
  }
  const user = q.has("u") ? (q.get("u") ?? "").replace(/^@/, "").slice(0, 39) : "";
  return { user, fun, theme, auto: q.has("u") && user.length > 0 };
}

export function WrappedGenerator() {
  const [init] = useState(loadInitial);
  const [user, setUser] = useState(init.user);
  const [fun, setFun] = useState<Fun>(init.fun);
  const [theme, setTheme] = useState<Theme>(init.theme);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = useCallback(async (login: string) => {
    const u = login.trim().replace(/^@/, "");
    if (!u) return;
    setStatus("loading");
    setError("");
    try {
      const resp = await fetch(`${WORKER}/stats?u=${encodeURIComponent(u)}`);
      const json = (await resp.json()) as { ok: boolean; error?: string } & Stats;
      if (!json.ok) throw new Error(json.error ?? "unknown");
      setStats(json);
      setStatus("done");
    } catch (e) {
      setError(ERRORS[(e as Error).message] ?? "Falha ao buscar. Tenta de novo.");
      setStatus("error");
    }
  }, []);

  // auto-fetch quando abre link compartilhado (fetch no mount = caso canônico de effect)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (init.auto) void generate(init.user);
  }, [init, generate]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ fun, theme }));
    } catch {
      // segue sem persistir
    }
  }, [fun, theme]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // redesenha preview quando algo muda
  useEffect(() => {
    if (status !== "done" || !stats || !canvasRef.current) return;
    let alive = true;
    void loadAvatar(stats.profile.avatarUrl).then((img) => {
      if (alive && canvasRef.current) drawWrapped(canvasRef.current, stats, fun, theme, "wide", img);
    });
    return () => {
      alive = false;
    };
  }, [stats, fun, theme, status]);

  const q = new URLSearchParams();
  if (user) q.set("u", user);
  q.set("cafe", String(fun.cafe));
  q.set("sexta", String(fun.sexta));
  q.set("prod", String(fun.prod));
  q.set("reuniao", String(fun.reuniao));
  const shareParams = q.toString();

  const download = async (format: "wide" | "square") => {
    if (!stats || !canvasRef.current) return;
    const off = document.createElement("canvas");
    const img = await loadAvatar(stats.profile.avatarUrl);
    drawWrapped(off, stats, fun, theme, format, img);
    const a = document.createElement("a");
    a.href = off.toDataURL("image/png");
    a.download = `dev-wrapped-${stats.profile.login}-${format}.png`;
    a.click();
    setDownloaded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDownloaded(false), 2000);
  };

  const tweetText = stats
    ? `Meu Dev Wrapped: ${num(stats.totals.commits)} commits, ${num(stats.totals.prs)} PRs e ${fun.cafe} cafés/dia. Gera o teu:`
    : "Gera teu Dev Wrapped:";
  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(`https://wrapped.cajuos.dev/?${shareParams}`)}`;

  const setF = (k: keyof Fun) => (v: string) => setFun((p) => ({ ...p, [k]: clamp(Number(v)) }));
  const numCls =
    "mt-1 block w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="block flex-1">
          <span className="text-xs text-muted">Usuário do GitHub</span>
          <input
            type="text" value={user} onChange={(e) => setUser(e.target.value.replace(/^@/, "").slice(0, 39))}
            placeholder="octocat" onKeyDown={(e) => e.key === "Enter" && generate(user)}
            className={numCls} autoComplete="off" spellCheck={false}
          />
        </label>
        <div className="flex items-end">
          <button
            onClick={() => generate(user)} disabled={status === "loading" || !user.trim()}
            className="pressable w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50 sm:w-auto"
          >
            {status === "loading" ? "Buscando…" : "Gerar wrapped"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["cafe", "Cafés/dia"], ["sexta", "Deploys sexta"], ["prod", "Dias sem quebrar prod"], ["reuniao", "Reuniões-email"]] as const).map(([k, label]) => (
          <label key={k} className="block">
            <span className="text-xs text-muted">{label}</span>
            <input type="number" min={0} value={fun[k]} onChange={(e) => setF(k)(e.target.value)} className={numCls} />
          </label>
        ))}
      </div>

      {status === "error" && <p className="mt-4 text-sm text-accent">{error}</p>}

      {status === "done" && stats && (
        <>
          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <canvas ref={canvasRef} className="block h-auto w-full" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(Object.keys(THEMES) as Theme[]).map((t) => (
              <button
                key={t} onClick={() => setTheme(t)} aria-pressed={theme === t}
                className={`pressable rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors${theme === t ? " border-foreground bg-foreground text-background" : " border-border hover:border-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => download("wide")} className="pressable rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background">
              {downloaded ? "Baixado!" : "Baixar (X)"}
            </button>
            <button onClick={() => download("square")} className="pressable rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-foreground">
              Baixar (quadrado)
            </button>
            <a href={tweetUrl} target="_blank" rel="noopener noreferrer" className="pressable rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-foreground">
              Postar no X →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
