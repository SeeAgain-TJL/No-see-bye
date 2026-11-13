FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN DATABASE_URL=file:/app/data/app.db npm run db:generate && npm run build && mkdir -p /app/data/uploads && chown -R node:node /app/data
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
USER node
EXPOSE 3000
CMD ["node", "scripts/start-container.mjs"]
