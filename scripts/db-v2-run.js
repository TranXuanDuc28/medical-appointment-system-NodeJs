/**
 * Chạy sequelize-cli cho DB v2 mà không cần set biến môi trường thủ công (đa nền tảng).
 *   node scripts/db-v2-run.js migrate | undo | seed
 * Luôn trỏ vào V2_DB_NAME (mặc định webhealthcare_v2) và thư mục migrations-v2 / seeders-v2.
 */
require("dotenv").config({ quiet: true });
const { spawnSync } = require("child_process");
const path = require("path");

const cmd = process.argv[2];
const map = {
  migrate: ["db:migrate", "--migrations-path", "src/migrations"],
  undo: ["db:migrate:undo", "--migrations-path", "src/migrations"],
  seed: ["db:seed:all", "--seeders-path", "src/seeders"],
};
if (!map[cmd]) {
  console.error("Dùng: node scripts/db-v2-run.js migrate|undo|seed");
  process.exit(1);
}
const env = { ...process.env, DB_DATABASE_NAME: process.env.V2_DB_NAME || "webhealthcare_v2" };
const bin = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "sequelize-cli.cmd" : "sequelize-cli");
const r = spawnSync(bin, [...map[cmd], "--config", "src/config/config.js"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
  cwd: path.join(__dirname, ".."),
});
process.exit(r.status === null ? 1 : r.status);
