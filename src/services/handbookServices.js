const db = require("../models");
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
  let isValid = true;
  let element = "";

  for (let i = 0; i < arrFields.length; i++) {
    let field = arrFields[i];
    let value = inputData[field];

    // check riêng cho reviewers (mảng)
    if (field === "reviewers" || field === "authors") {
      if (!Array.isArray(value) || value.length === 0) {
        isValid = false;
        element = field;
        break;
      }
    } else {
      if (!value || value.toString().trim() === "") {
        isValid = false;
        element = field;
        break;
      }
    }
  }

  return { isValid, element };
};

let createHandBook = (inputData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let checkObj = checkRequiredFields(inputData);

      if (!checkObj.isValid) {
        return resolve({
          errCode: 1,
          errMessage: `Missing parameter: ${checkObj.element}`,
        });
      }

      // CREATE
      if (inputData.action === "CREATE") {
        // Tạo mới handbook
        let handbookData = await db.HandBook.create({
          image: inputData.imageBase64,
          authors: Array.isArray(inputData.authors)
            ? JSON.stringify(inputData.authors)
            : inputData.authors || "",
          reviewers: Array.isArray(inputData.reviewers)
            ? JSON.stringify(inputData.reviewers)
            : inputData.reviewers || "",
          published:
            inputData.published || new Date().toISOString().split("T")[0],
          updated: inputData.updated || new Date().toISOString().split("T")[0],
          views: inputData.views || 0,
          category: inputData.category || "Cẩm nang",
        });
        await db.HandBook_Translation.create({
          handbookId: handbookData.id,
          title: inputData.title,
          lang: inputData.lang,
        });

        // Tạo mới markdown liên quan
        await db.Markdown.create({
          handbookId: handbookData.id,
          contentHTML: inputData.contentHTML,
          contentMarkdown: inputData.contentMarkdown,
          lang: inputData.lang,
        });

        return resolve({
          errCode: 0,
          errMessage: "Tạo cẩm nang thành công",
        });
      }
      // UPDATE
      if (inputData.action === "UPDATE") {
        // Cập nhật thông tin hanbook

        let handbook = await db.HandBook.findOne({
          where: { id: inputData.handbookId },
          raw: false,
        });

        if (!handbook) {
          return resolve({
            errCode: 2,
            errMessage: "Không tìm thấy cẩm nang để cập nhật",
          });
        }
        handbook.authors = Array.isArray(inputData.authors)
          ? JSON.stringify(inputData.authors)
          : inputData.authors || "";
        handbook.image = inputData.imageBase64;
        handbook.reviewers = Array.isArray(inputData.reviewers)
          ? JSON.stringify(inputData.reviewers)
          : inputData.reviewers || "";

        handbook.published = inputData.published;
        handbook.updated = inputData.updated;
        handbook.category = inputData.category;
        await handbook.save();

        // Cập nhật thông tin handbook_translations
        let handbook_translations = await db.HandBook_Translation.findOne({
          where: { handbookId: inputData.handbookId, lang: inputData.lang },
          raw: false,
        });

        if (handbook_translations) {
          console.log("handbook_translations", handbook_translations);
          handbook_translations.handbookId = inputData.handbookId;
          handbook_translations.title = inputData.title;
          handbook_translations.lang = inputData.lang;

          await handbook_translations.save();
        } else {
          console.log("handbook_translations chua co");
          // Nếu chưa có HandBook_Translation thì tạo mới
          await db.HandBook_Translation.create({
            handbookId: handbook.id,
            title: inputData.title,
            lang: inputData.lang,
          });
        }

        // Cập nhật markdown
        let handbookMarkdown = await db.Markdown.findOne({
          where: { handbookId: inputData.handbookId, lang: inputData.lang },
          raw: false,
        });
        //console.log("handbookMarkdown", handbookMarkdown);
        if (handbookMarkdown) {
          handbookMarkdown.contentHTML = inputData.contentHTML;
          handbookMarkdown.contentMarkdown = inputData.contentMarkdown;
          handbookMarkdown.lang = inputData.lang;
          handbookMarkdown.updatedAt = new Date();
          await handbookMarkdown.save();
        } else {
          // Nếu chưa có markdown thì tạo mới
          await db.Markdown.create({
            handbookId: handbook.id,
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            lang: inputData.lang,
          });
        }

        return resolve({
          errCode: 0,
          errMessage: "Cập nhật cẩm nang thành công",
        });
      }

      return resolve({
        errCode: 3,
        errMessage: "Hành động không hợp lệ",
      });
    } catch (e) {
      reject(e);
    }
  });
};

let getAllHandBook = (lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await db.HandBook.findAll({
        attributes: [
          "id",
          "image",
          "published",
          "updated",
          "views",
          "category",
          "authors",
        ],
        include: [
          {
            model: db.HandBook_Translation,
            where: { lang: lang },
            attributes: {
              exclude: ["id"],
            },
            as: "handbookData",
            required: false,
          },
          {
            model: db.Markdown,
            where: { lang: lang },
            attributes: ["contentHTML", "contentMarkdown"],
            as: "handbookMarkdown",
            require: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        raw: false,
      });

      if (data && data.length > 0) {
        data.map((item) => {
          if (item.image) {
            item.image = new Buffer(item.image, "base64").toString("binary");
          }
          return item;
        });
      }
      resolve({
        errMessage: "Lấy tất cả cẩm nang",
        errCode: 0,
        data,
      });
    } catch (e) {
      reject(e);
    }
  });
};

let getDetailHandBookById = (id, lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id || !lang) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      }

      let handbook = await db.HandBook.findOne({
        where: { id: id },
        attributes: [
          "id",
          "image",
          "authors",
          "reviewers",
          "published",
          "updated",
          "views",
          "category",
          "createdAt",
          "updatedAt",
        ],
        include: [
          {
            model: db.HandBook_Translation,
            where: {
              handbookId: id,
              lang: lang,
            },
            attributes: {
              exclude: ["id"], // bỏ cột id
            },
            as: "handbookData",
            required: false,
          },
          {
            model: db.Markdown,
            where: {
              handbookId: id,
              lang: lang,
            },
            attributes: ["contentHTML", "contentMarkdown"],
            as: "handbookMarkdown",
            required: false,
          },
        ],
        raw: true,
        nest: true,
      });

      if (handbook) {
        // Convert image from base64
        if (handbook.image) {
          handbook.image = new Buffer(handbook.image, "base64").toString(
            "binary"
          );
        }
        // Parse authors and reviewers as arrays if they're stored as JSON strings
        try {
          if (handbook.authors) {
            handbook.authors = JSON.parse(handbook.authors);
          } else {
            handbook.authors = ["BookingCare Team"];
          }
        } catch (e) {
          handbook.authors = handbook.authors
            ? [handbook.authors]
            : ["BookingCare Team"];
        }

        try {
          if (handbook.reviewers) {
            handbook.reviewers = JSON.parse(handbook.reviewers);
          } else {
            handbook.reviewers = [];
          }
        } catch (e) {
          handbook.reviewers = handbook.reviewers ? [handbook.reviewers] : [];
        }

        // Increment view count
        await db.HandBook.increment("views", { where: { id: id } });

        resolve({
          errCode: 0,
          errMessage: "ok",
          data: handbook,
        });
      } else {
        resolve({
          errCode: 2,
          errMessage: "Handbook not found",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let getRelatedHandBooks = (currentId, limit = 4, lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await db.HandBook.findAll({
        where: {
          id: { [db.Sequelize.Op.ne]: currentId },
        },
        attributes: [
          "id",
          "image",
          "published",
          "updated",
          "views",
          "category",
          "authors",
        ],
        include: [
          {
            model: db.HandBook_Translation,
            where: {
              handbookId: currentId,
              lang: lang,
            },
            attributes: {
              exclude: ["id"], // bỏ cột id
            },
            as: "handbookData",
            required: false,
          },
        ],
        order: [
          ["views", "DESC"],
          ["createdAt", "DESC"],
        ],
        limit: limit,
        raw: true,
        nest: true,
      });

      if (data && data.length > 0) {
        data.map((item) => {
          if (item.image) {
            item.image = new Buffer(item.image, "base64").toString("binary");
          }
          return item;
        });
      }

      //console.log("Related handbooks:", data);

      resolve({
        errMessage: "ok",
        errCode: 0,
        data,
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  createHandBook: createHandBook,
  getAllHandBook: getAllHandBook,
  getDetailHandBookById: getDetailHandBookById,
  getRelatedHandBooks: getRelatedHandBooks,
};
