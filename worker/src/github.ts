export interface Env {
  GITHUB_TOKEN?: string;
  WRAPPED_CACHE?: KVNamespace;
  ALLOWED_ORIGIN?: string;
}

export interface LangStat {
  name: string;
  repos: number;
  stars: number;
}

export interface WrappedStats {
  profile: {
    login: string;
    name: string | null;
    avatarUrl: string;
    createdAt: string;
  };
  totals: {
    commits: number;
    prs: number;
    issues: number;
    reviews: number;
    stars: number;
    repos: number;
    followers: number;
    yearsActive: number;
  };
  topLangs: LangStat[];
  generatedAt: string;
}

const USER_RE = /^[a-zA-Z0-9-]{1,39}$/;
const CACHE_TTL = 7 * 86400;

async function gh(token: string, query: string, variables: Record<string, unknown>) {
  const resp = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "caju-wrapped",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) throw new Error(`github-${resp.status}`);
  const json = (await resp.json()) as {
    data?: Record<string, unknown>;
    errors?: { message: string; type?: string }[];
  };
  if (json.errors?.length) {
    if (json.errors.some((e) => e.type === "NOT_FOUND")) throw new Error("invalid-user");
    throw new Error(`github-query: ${json.errors[0].message}`);
  }
  return json.data as Record<string, unknown>;
}

interface Q1User {
  login: string;
  name: string | null;
  avatarUrl: string;
  createdAt: string;
  followers: { totalCount: number };
  repositories: {
    totalCount: number;
    nodes: { stargazerCount: number; primaryLanguage: { name: string } | null }[];
  };
}

const Q1 = `
query($login: String!) {
  user(login: $login) {
    login name avatarUrl createdAt
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes { stargazerCount primaryLanguage { name } }
    }
  }
}`;

function yearsQuery(years: number[]): string {
  const parts = years.map(
    (y) =>
      `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y + 1}-01-01T00:00:00Z") {
        totalCommitContributions totalPullRequestContributions
        totalIssueContributions totalPullRequestReviewContributions
      }`,
  );
  return `query($login: String!) { user(login: $login) { ${parts.join("\n")} } }`;
}

export async function wrappedStats(login: string, env: Env): Promise<{ stats: WrappedStats; cached: boolean }> {
  if (!USER_RE.test(login)) throw new Error("invalid-user");
  if (!env.GITHUB_TOKEN) throw new Error("no-token");
  const key = `w1:${login.toLowerCase()}`;
  if (env.WRAPPED_CACHE) {
    try {
      const hit = await env.WRAPPED_CACHE.get(key, "json");
      if (hit) return { stats: hit as WrappedStats, cached: true };
    } catch {
      // segue sem cache
    }
  }

  const q1 = (await gh(env.GITHUB_TOKEN, Q1, { login })) as { user: Q1User | null };
  if (!q1.user) throw new Error("invalid-user");
  const u = q1.user;

  // All-time = soma das collections anuais (default da API seria só 365 dias).
  // Anos = desde a criação da conta até hoje (anos zerados retornam 0, sem custo extra).
  const nowYear = new Date().getFullYear();
  const joinYear = Math.max(2008, new Date(u.createdAt).getFullYear());
  const years: number[] = [];
  for (let y = joinYear; y <= nowYear; y++) years.push(y);
  const totals = { commits: 0, prs: 0, issues: 0, reviews: 0 };
  if (years.length > 0) {
    const q2 = (await gh(env.GITHUB_TOKEN!, yearsQuery(years), { login })) as {
      user: Record<string, { totalCommitContributions: number; totalPullRequestContributions: number; totalIssueContributions: number; totalPullRequestReviewContributions: number } | null> | null;
    };
    for (const y of years) {
      const c = q2.user?.[`y${y}`];
      if (!c) continue;
      totals.commits += c.totalCommitContributions;
      totals.prs += c.totalPullRequestContributions;
      totals.issues += c.totalIssueContributions;
      totals.reviews += c.totalPullRequestReviewContributions;
    }
  }

  const langMap = new Map<string, LangStat>();
  let stars = 0;
  for (const r of u.repositories.nodes) {
    stars += r.stargazerCount;
    if (r.primaryLanguage) {
      const cur = langMap.get(r.primaryLanguage.name) ?? { name: r.primaryLanguage.name, repos: 0, stars: 0 };
      cur.repos += 1;
      cur.stars += r.stargazerCount;
      langMap.set(r.primaryLanguage.name, cur);
    }
  }
  const topLangs = [...langMap.values()].sort((a, b) => b.repos - a.repos || b.stars - a.stars).slice(0, 3);

  const stats: WrappedStats = {
    profile: { login: u.login, name: u.name, avatarUrl: u.avatarUrl, createdAt: u.createdAt },
    totals: {
      ...totals,
      stars,
      repos: u.repositories.totalCount,
      followers: u.followers.totalCount,
      yearsActive: years.length,
    },
    topLangs,
    generatedAt: new Date().toISOString(),
  };
  if (env.WRAPPED_CACHE) {
    try {
      await env.WRAPPED_CACHE.put(key, JSON.stringify(stats), { expirationTtl: CACHE_TTL });
    } catch {
      // falha de cache não derruba a resposta
    }
  }
  return { stats, cached: false };
}
