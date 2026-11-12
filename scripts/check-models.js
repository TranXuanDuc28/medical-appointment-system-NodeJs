/**
 * Đối chiếu model Sequelize với schema thật trong DB (DB_DATABASE_NAME).
 *   node scripts/check-models.js   -> thoát mã 1 nếu có model trỏ vào bảng/cột không tồn tại.
 */
require("dotenv").config({ quiet: true });
const db = require("../src/models");

(async () => {
  const qi = db.sequelize.getQueryInterface();
  let bad = 0;
  const covered = new Set();
  for (const [name, model] of Object.entries(db.sequelize.models)) {
    const table = model.getTableName();
    const t = typeof table === "string" ? table : table.tableName;
    covered.add(t);
    const desc = await qi.describeTable(t).catch(() => null);
    if (!desc) {
      console.log(`❌ ${name}: bảng "${t}" không tồn tại`);
      bad++;
      continue;
    }
    const cols = Object.values(model.rawAttributes).map((a) => a.field || a.fieldName);
    const missing = cols.filter((c) => !(c in desc));
    if (missing.length) {
      console.log(`❌ ${name} (${t}): model có nhưng DB không có cột: ${missing.join(", ")}`);
      bad++;
    }
  }
  const [rows] = await db.sequelize.query("SHOW TABLES", { raw: false });
  const all = rows.map((r) => Object.values(r)[0]);
  const noModel = all.filter((t) => !covered.has(t) && !/^sequelize/i.test(t));
  console.log(`\nBảng chưa có model (dự kiến: bảng tạo sẵn cho nhóm hàng đợi/AI): ${noModel.join(", ")}`);
  console.log(bad ? `\n❌ ${bad} lỗi lệch model ↔ DB` : `\n✅ ${covered.size} model khớp schema DB`);
  await db.sequelize.close();
  process.exit(bad ? 1 : 0);
})();
