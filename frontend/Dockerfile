# ── Stage 1: Build React SPA ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first — Docker caches this layer until they change
COPY package*.json ./
RUN npm install --silent

# Copy application source and build production bundle
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────────────────
FROM nginx:alpine

# Copy the production build output
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx config (SPA routing + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
