# Dev Wrapped — `wrapped.cajuos.dev`

Teu ano no GitHub em 1 card. All-time de verdade (soma ano a ano via GraphQL), não só 365 dias.

## Estrutura

```
wrapped/
├── site/    # Next.js dark-first → Vercel → wrapped.cajuos.dev
└── worker/  # Cloudflare Worker → wrapped-api.cajuos.dev (token secreto aqui)
```

## Por que worker e não direto do browser

All-time exige GraphQL com token (`contributionsCollection` ano a ano). Token no browser = vaza. Worker guarda o segredo e expõe só `GET /stats?u=`.

## Setup

```bash
# 1. PAT read-only (sem scopes, só dados públicos)
#    github.com/settings/tokens → Generate new token (classic), sem marcar nada

cd worker
npm install
wrangler secret put GITHUB_TOKEN
wrangler dev   # testa com site em localhost:3000

# KV opcional (cache 7d + rate limit):
wrangler kv namespace create WRAPPED_CACHE
# cola o id no wrangler.toml (descomenta) e:
wrangler deploy

cd ../site
npm install
npm run dev
```

## Deploy

Um único subdomínio público: `wrapped.cajuos.dev` (Vercel). O worker não tem
domínio próprio — o site faz proxy `/api/stats` → worker via rewrite.

```bash
cd worker
wrangler secret put GITHUB_TOKEN   # PAT read-only, sem scopes
# KV opcional: wrangler kv namespace create WRAPPED_CACHE (cola id, descomenta)
wrangler deploy   # anota a URL https://caju-wrapped.<conta>.workers.dev
```

Na Vercel (importa `CajuOS/wrapped`, root `site/`):

- Domínio: `wrapped.cajuos.dev` (+ DNS na Cloudflare, único registro)
- Env `WRAPPED_API_URL` = URL workers.dev acima

## Licença

MIT — igual o resto do CajuOS.
