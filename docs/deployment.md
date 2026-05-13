# Deployment — Whodo Ledger Web

Dev e prod compartilham o **mesmo Dockerfile** (multi-stage); o que muda é o target e o compose.

## Estrutura Docker

```
Dockerfile
├── stage "base"     → node + deps (cache de node_modules)
├── stage "dev"      → vite dev server, bind mount, HMR
├── stage "builder"  → roda `vite build`, gera dist/
└── stage "prod"     → nginx alpine servindo dist/ com headers de segurança

docker-compose.yml         → dev: target=dev, mount de ./ → /app, porta 5173
docker-compose.prod.yml    → prod: target=prod, sem mount, porta 80
```

## Dockerfile (referência)

```dockerfile
# syntax=docker/dockerfile:1.6

FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- DEV ----------
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- BUILD ----------
FROM base AS builder
COPY . .
RUN npm run build

# ---------- PROD ----------
FROM nginx:1.27-alpine AS prod
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

## nginx/default.conf (referência)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Headers de segurança
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.whodo.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

    # SPA fallback: qualquer rota cai no index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache agressivo para assets versionados (Vite gera hash no nome)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html nunca cacheado (precisa pegar build novo)
    location = /index.html {
        add_header Cache-Control "no-store";
    }

    # gzip básico
    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/wasm image/svg+xml;
    gzip_min_length 1024;
}
```

## docker-compose.yml (dev)

```yaml
services:
  web:
    build:
      context: .
      target: dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules    # impede o mount de sobrescrever node_modules do container
    env_file: .env.local
    environment:
      - CHOKIDAR_USEPOLLING=true   # alguns hosts (Windows) precisam disso pro HMR funcionar
```

Salvar arquivo `.tsx` → Vite HMR aplica em milissegundos, sem perder estado da página.

## docker-compose.prod.yml

```yaml
services:
  web:
    build:
      context: .
      target: prod
    image: whodo-ledger-web:latest
    restart: unless-stopped
    ports:
      - "80:80"
```

HTTPS termina em reverse proxy/LB **à frente** do container (Caddy, Cloudflare, LB do provedor). nginx do container fala só HTTP internamente.

Alternativa simples para self-hosted: trocar `nginx:1.27-alpine` por uma imagem do **Caddy** que faz HTTPS automático via Let's Encrypt. Em cloud (Fly, Vercel, Railway), o provedor faz a terminação.

## Variáveis de ambiente

Diferente do back-end, o front tem **dois momentos** com env:

- **No build**: variáveis `VITE_PUBLIC_*` são injetadas no bundle JS pelo Vite. Mudar = rebuildar.
- **Em runtime**: nada. SPA é arquivo estático.

Para configurar URL da API diferente entre staging/prod sem rebuild, há duas estratégias:

1. **Builds separados por ambiente** (mais simples, recomendado): pipeline gera `dist-staging/` e `dist-prod/`, cada um com sua URL.
2. **Runtime config via arquivo `/config.json`**: o app faz `fetch('/config.json')` no boot e usa o que veio. nginx serve um `config.json` diferente em cada ambiente. Use só se precisar mesmo.

## Plataforma de deploy

Opções razoáveis:

1. **Cloudflare Pages / Vercel / Netlify** — push pra `main`, build automático, CDN global, HTTPS automático. Recomendado para SPA estática.
2. **Fly.io / Railway** — `fly deploy` com `fly.toml`. Roda o container nginx.
3. **VPS com Caddy à frente** — `docker compose -f docker-compose.prod.yml up -d`. Mais barato, mais responsabilidade.

Decidir quando estiver perto de subir. Por enquanto, focar em rodar local.

## CI/CD (futuro)

Quando configurar:
- GitHub Actions em PR: `npm ci`, `npm run lint`, `npm run type-check`, `npm run test`, `npm audit --audit-level=high`.
- Em merge na `main`: `npm run build`, deploy automático pra staging (preview).
- Promoção pra prod: manual (gate de aprovação) ou tag.

## Procedimento manual de release

1. `git pull` na main.
2. `docker compose -f docker-compose.prod.yml build`
3. `docker compose -f docker-compose.prod.yml up -d`
4. Abrir o domínio no browser → verificar que carrega, login funciona, primeira tela renderiza.
5. Conferir headers no DevTools (Network → response headers): CSP, HSTS, etc. estão lá?
6. `curl -I https://app.whodo.io` para sanity check.
