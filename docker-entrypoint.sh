#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
	echo "[entrypoint] Applying database migrations..."
	node scripts/migrate.mjs
fi

exec "$@"
