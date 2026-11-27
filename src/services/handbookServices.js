const db = require("../models");
const { imageOut, pickTranslation, toJsonText, upsertTranslation, defined } = require("../utils/legacyContent");
const { markdownOf } = require("../utils/legacyShapes");

let checkRequiredFields = (inputData) => {
  let arrFields = [
    "action",
    "title",
    "authors",
    "reviewers",
    "published",
    "updated",
    "category",
    "imageBase64",
    "contentHTML",
    "contentMarkdown",
  ];
  for (let i = 0; i < arrFields.length; i++) {
    let field = arrFields[i];
    let value = inputData[field];
    if (field === "reviewers" || field === "authors") {
      if (!Array.isArray(value) || value.length === 0) return { isValid: false, element: field };
    } else if (!value || value.toString().trim() === "") {
      return { isValid: false, element: field };
    }
  }
  return { isValid: true, element: "" };
};

const today = () => new Date().toISOString().split("T")[0];

let createHandBook = async (inputData) => {
  let checkObj = checkRequiredFields(inputData);
  if (!checkObj.isValid) {
    return { errCode: 1, errMessage: `Missing parameter: ${checkObj.element}` };
  }
  if (inputData.action !== "CREATE" && inputData.action !== "UPDATE") {
    return { errCode: 3, errMessage: "Hành động không hợp lệ" };
  }
  if (!inputData.lang) {
    return { errCode: 1, errMessage: "Missing parameter: lang" };
  }
  const t = await db.sequelize.transaction();
  try {
    const content = defined({
      title: inputData.title,
      contentHtml: inputData.contentHTML,
      contentMarkdown: inputData.contentMarkdown,
      description: inputData.description,
    });
    if (inputData.action === "CREATE") {
      const handbook = await db.HandBook.create(
        {
          image: inputData.imageBase64,
          authors: toJsonText(inputData.authors),
          reviewers: toJsonText(inputData.reviewers),
          published: inputData.published || today(),
          updated: inputData.updated || today(),
          views: inputData.views || 0,
          category: inputData.category || "Cẩm nang",
        },
        { transaction: t }
      );
      await upsertTranslation(db.HandBook_Translation, "handbookId", handbook.id, inputData.lang, content, t);
      await t.commit();
      return { errCode: 0, errMessage: "Tạo cẩm nang thành công" };
    }
    // UPDATE
    const handbook = await db.HandBook.findOne({ where: { id: inputData.handbookId }, raw: false, transaction: t });
    if (!handbook) {
      await t.rollback();
      return { errCode: 2, errMessage: "Không tìm thấy cẩm nang để cập nhật" };
    }
    handbook.authors = toJsonText(inputData.authors);
    handbook.reviewers = toJsonText(inputData.reviewers);
    handbook.image = inputData.imageBase64;
    handbook.published = inputData.published;
    handbook.updated = inputData.updated;
    handbook.category = inputData.category;
    await handbook.save({ transaction: t });
    await upsertTranslation(db.HandBook_Translation, "handbookId", handbook.id, inputData.lang, content, t);
    await t.commit();
    return { errCode: 0, errMessage: "Cập nhật cẩm nang thành công" };
  } catch (e) {
    await t.rollback().catch(() => {});
    throw e;
  }
};

const TR_ATTRS = ["handbookId", "lang", "title", "description", "contentMarkdown", "contentHtml", "createdAt", "updatedAt"];
const handbookDataOf = (t) => pickTranslation(t, "handbookId", "handbookId", ["title"]);
const hbMarkdownOf = (t) => {
  const md = markdownOf(t);
  return { contentHTML: md.contentHTML, contentMarkdown: md.contentMarkdown };
};
const hasContent = (t) => t && (t.contentHtml != null || t.contentMarkdown != null);

const translationsByHandbook = async (lang, ids) => {
  const where = { lang };
  if (ids) where.handbookId = ids;
  const rows = await db.HandBook_Translation.findAll({ where, attributes: TR_ATTRS });
  return new Map(rows.map((t) => [String(t.handbookId), t]));
};

const parseJsonList = (raw, fallback) => {
  try {
    if (raw) return JSON.parse(raw);
    return fallback;
  } catch (e) {
    return raw ? [raw] : fallback;
  }
};

let getAllHandBook = async (lang) => {
  const books = await db.HandBook.findAll({
    attributes: ["id", "image", "published", "updated", "views", "category", "authors", "createdAt"],
    order: [["createdAt", "DESC"], ["id", "DESC"]],
  });
  const trMap = await translationsByHandbook(lang);
  const data = [];
  for (const b of books) {
    const t = trMap.get(String(b.id));
    // Cũ: JOIN bắt buộc với Markdown theo lang => chỉ trả cẩm nang đã có nội dung ở ngôn ngữ đó.
    if (!hasContent(t)) continue;
    data.push({
      id: b.id,
      image: imageOut(b.image),
      published: b.published,
      updated: b.updated,
      views: b.views,
      category: b.category,
      authors: b.authors,
      handbookData: [handbookDataOf(t)],
      handbookMarkdown: [hbMarkdownOf(t)],
    });
  }
  return { errMessage: "Lấy tất cả cẩm nang", errCode: 0, data };
};

let getDetailHandBookById = async (id, lang) => {
  if (!id || !lang) {
    return { errCode: 1, errMessage: "Missing parameter" };
  }
  const handbook = await db.HandBook.findOne({
    where: { id },
    attributes: ["id", "image", "authors", "reviewers", "published", "updated", "views", "category", "createdAt", "updatedAt"],
  });
  if (!handbook) {
    return { errCode: 2, errMessage: "Handbook not found" };
  }
  const t = await db.HandBook_Translation.findOne({ where: { handbookId: handbook.id, lang }, attributes: TR_ATTRS });
  const data = {
    id: handbook.id,
    image: imageOut(handbook.image),
    authors: parseJsonList(handbook.authors, ["BookingCare Team"]),
    reviewers: parseJsonList(handbook.reviewers, []),
    published: handbook.published,
    updated: handbook.updated,
    views: handbook.views,
    category: handbook.category,
    createdAt: handbook.createdAt,
    updatedAt: handbook.updatedAt,
    handbookData: handbookDataOf(t),
    handbookMarkdown: hbMarkdownOf(t),
  };
  // Tăng lượt xem (response trả số lượt TRƯỚC khi tăng, như bản cũ)
  await db.HandBook.increment("views", { where: { id: handbook.id } });
  return { errCode: 0, errMessage: "ok", data };
};

let getRelatedHandBooks = async (currentId, limit = 4, lang) => {
  const books = await db.HandBook.findAll({
    where: { id: { [db.Sequelize.Op.ne]: currentId } },
    attributes: ["id", "image", "published", "updated", "views", "category", "authors"],
    order: [["views", "DESC"], ["createdAt", "DESC"], ["id", "DESC"]],
    limit: Number.isFinite(limit) && limit > 0 ? limit : 4,
  });
  const trMap = await translationsByHandbook(lang, books.map((b) => b.id));
  const data = books.map((b) => ({
    id: b.id,
    image: imageOut(b.image),
    published: b.published,
    updated: b.updated,
    views: b.views,
    category: b.category,
    authors: b.authors,
    handbookData: handbookDataOf(trMap.get(String(b.id))),
  }));
  return { errMessage: "ok", errCode: 0, data };
};

module.exports = {
  createHandBook: createHandBook,
  getAllHandBook: getAllHandBook,
  getDetailHandBookById: getDetailHandBookById,
  getRelatedHandBooks: getRelatedHandBooks,
};
