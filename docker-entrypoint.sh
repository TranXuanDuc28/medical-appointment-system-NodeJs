#!/bin/sh
# Khởi động container API: đợi DB -> migrate -> seed mã tham chiếu -> (seed demo) -> chạy server.
set -e
export V2_DB_NAME="${V2_DB_NAME:-$DB_DATABASE_NAME}"

echo "[entrypoint] Đợi MySQL ${DB_HOST}:${DB_PORT:-3306} ..."
i=0
until node -e 'const m=require("mysql2");const c=m.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT||3306,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,database:process.env.DB_DATABASE_NAME});c.connect(e=>{c.destroy();process.exit(e?1:0)})' 2>/dev/null; do
  i=$((i+1))
  if [ "$i" -gt 60 ]; then echo "[entrypoint] MySQL không sẵn sàng sau 120s"; exit 1; fi
  sleep 2
done

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] migrate"
  node scripts/db-v2-run.js migrate
  echo "[entrypoint] seed mã tham chiếu"
  node scripts/db-v2-run.js seed || echo "[entrypoint] seed tham chiếu bỏ qua (có thể đã có)"
fi
if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "[entrypoint] seed dữ liệu demo"
  node scripts/seed-demo.js
fi
exec "$@"
