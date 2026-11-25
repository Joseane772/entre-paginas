# Entre Páginas: self-contained image (Next.js standalone server + migrations).
# Normally used through docker-compose.yml:  docker compose up

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No database exists while the image builds: catalogue pages are rendered on first request
# instead (see src/lib/cache-life.ts). The secret below only satisfies the build; the real one
# is generated or supplied when the container starts.
RUN NEXT_OUTPUT=standalone BUILD_WITHOUT_DB=1 \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    npx next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app && mkdir /data && chown app:app /data
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
# Migrations run at start-up, before the server.
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build /app/node_modules/postgres ./node_modules/postgres
COPY docker/migrate.mjs docker/entrypoint.sh ./docker/
# In case the files were checked out with Windows line endings.
RUN sed -i 's/\r$//' docker/entrypoint.sh docker/migrate.mjs
USER app
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["sh", "docker/entrypoint.sh"]
