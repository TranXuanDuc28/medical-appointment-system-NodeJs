/**
 * Tạo (hoặc tạo lại) database trống cho schema v2.
 *   node scripts/db-v2-create.js            -> tạo nếu chưa có
 *   node scripts/db-v2-create.js --recreate -> XOÁ rồi tạo lại (chỉ dùng cho DB v2!)
 * Tên DB lấy từ V2_DB_NAME (mặc định webhealthcare_v2). Không bao giờ đụng tới DB_DATABASE_NAME cũ.
 */
require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");

(async () => {
  const name = process.env.V2_DB_NAME || "webhealthcare_v2";
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error("Tên DB không hợp lệ");
  if (name === process.env.DB_DATABASE_NAME && process.env.DB_DATABASE_NAME !== name) {
    throw new Error("Từ chối thao tác lên DB đang chạy");
  }
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  });
  if (process.argv.includes("--recreate")) {
    await conn.query(`DROP DATABASE IF EXISTS \`${name}\``);
    console.log(`🗑️  Đã xoá DB ${name}`);
  }
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`✅ DB ${name} sẵn sàng`);
  await conn.end();
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
