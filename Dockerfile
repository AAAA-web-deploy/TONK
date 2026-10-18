FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Public values must be supplied at build time, for example with --build-arg.
ARG NEXT_PUBLIC_TOKEN_CA=""
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_ADDRESS_BAR_LABEL="tonkfun.xyz"
ARG NEXT_PUBLIC_LOGO_MODE="image"
ARG NEXT_PUBLIC_TRADE_URL=""
ENV NEXT_PUBLIC_TOKEN_CA=$NEXT_PUBLIC_TOKEN_CA
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ADDRESS_BAR_LABEL=$NEXT_PUBLIC_ADDRESS_BAR_LABEL
ENV NEXT_PUBLIC_LOGO_MODE=$NEXT_PUBLIC_LOGO_MODE
ENV NEXT_PUBLIC_TRADE_URL=$NEXT_PUBLIC_TRADE_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TONK_DATA_DIR=/data
RUN addgroup -S -g 1001 nextjs && adduser -S -u 1001 -G nextjs nextjs && mkdir /data && chown nextjs:nextjs /data
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
