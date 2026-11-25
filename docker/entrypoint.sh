#!/bin/sh
set -e

# Sessions need a stable secret. Use BETTER_AUTH_SECRET if given, else make one once and keep
# it in the /data volume so sign-ins survive restarts.
if [ -z "$BETTER_AUTH_SECRET" ]; then
  if [ ! -s /data/auth-secret ]; then
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > /data/auth-secret
  fi
  BETTER_AUTH_SECRET="$(cat /data/auth-secret)"
  export BETTER_AUTH_SECRET
fi

node docker/migrate.mjs
echo "Entre Páginas a correr em ${BETTER_AUTH_URL:-http://localhost:$PORT}"
exec node server.js
