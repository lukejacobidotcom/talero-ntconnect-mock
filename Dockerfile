# Multi-stage build. Runtime image has ZERO npm dependencies (app uses Node built-ins only).
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=8787
# Production requires TOKEN_SECRET and TALERO_PARTNER_SECRET to be injected (k8s Secret / env).
COPY --from=build /app/dist ./dist
COPY public ./public
COPY data ./data
COPY package.json ./
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8787/healthz || exit 1
CMD ["node", "dist/server.js"]
