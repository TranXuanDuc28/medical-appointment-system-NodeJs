const db = require("../models");
let checkRequiredFields = (inputData) => {
  let arrFields = [
    "action",
    "imageBase64",
    "contentHTML",
    "contentMarkdown",
    "lang",
  ];
  let isValid = true;
  let element = "";
  for (let i = 0; i < arrFields.length; i++) {
    if (!inputData[arrFields[i]]) {
      isValid = false;
      element = arrFields[i];
      break;
    }
  }
  return {
    isValid: isValid,
    element: element,
  };
};
let createSpecialty = (inputData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let checkObj = checkRequiredFields(inputData);
      if (!checkObj.isValid) {
        return resolve({
          errCode: 1,
          errMessage: `Missing parameter: ${checkObj.element}`,
        });
      }
      //CREATE
      if (inputData.action === "CREATE") {
        let specialtyData = await db.Specialty.create({
          image: inputData.imageBase64,
        });
        await db.Specialty_Translation.create({
          specialtyId: specialtyData.id,
          name: inputData.name,
          lang: inputData.lang,
        });

        // Tạo mới markdown liên quan
        await db.Markdown.create({
          specialtyId: specialtyData.id,
          contentHTML: inputData.contentHTML,
          contentMarkdown: inputData.contentMarkdown,
          lang: inputData.lang,
        });
        resolve({
          errCode: 0,
          errMesssage: "Tạo chuyên khoa thành công",
        });
      }
      // UPDATE
      if (inputData.action === "UPDATE") {
        // Cập nhật thông tin specialty
        let specialtyData = await db.Specialty.findOne({
          where: { id: inputData.specialtyId },
          raw: false,
        });
        if (!specialtyData) {
          return resolve({
            errCode: 2,
            errMessage: "Không tìm thấy chuyên khoa để cập nhật",
          });
        }
        specialtyData.image = inputData.imageBase64;
        await specialtyData.save();
        // Cập nhật thông tin specialty_translations
        let specialty_translations = await db.Specialty_Translation.findOne({
          where: { specialtyId: inputData.specialtyId, lang: inputData.lang },
          raw: false,
        });

        if (specialty_translations) {
          specialty_translations.specialtyId = inputData.specialtyId;
          specialty_translations.name = inputData.name;
          specialty_translations.lang = inputData.lang;

          await specialty_translations.save();
        } else {
          // Nếu chưa có Specialty_Translation thì tạo mới
          await db.Specialty_Translation.create({
            specialtyId: inputData.specialtyId,
            name: inputData.name,
            lang: inputData.lang,
          });
        }

        // Cập nhật markdown
        let specialtyMarkdown = await db.Markdown.findOne({
          where: { specialtyId: inputData.specialtyId, lang: inputData.lang },
          raw: false,
        });

        if (specialtyMarkdown) {
          specialtyMarkdown.contentHTML = inputData.contentHTML;
          specialtyMarkdown.contentMarkdown = inputData.contentMarkdown;
          specialtyMarkdown.lang = inputData.lang;
          specialtyMarkdown.updatedAt = new Date();
          await specialtyMarkdown.save();
        } else {
          // Nếu chưa có markdown thì tạo mới
          await db.Markdown.create({
            specialtyId: inputData.specialtyId,
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            lang: inputData.lang,
          });
        }

        return resolve({
          errCode: 0,
          errMessage: "Cập nhật chuyên khoa thành công",
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

let getAllSpecialty = (lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      let specialtyResult = await db.Specialty.findAll({
        include: [
          {
            model: db.Specialty_Translation,
            where: { lang: lang },
            attributes: {
              exclude: ["id"],
            },
            as: "specialtyData",
            required: false,
          },
          {
            model: db.Markdown,
            where: { lang: lang },
            attributes: ["contentHTML", "contentMarkdown"],
            as: "specialtyMarkdown",
            require: false,
          },
        ],
        raw: true,
        nest: true,
      });
      // console.log("specialtyResult", specialtyResult);

      if (specialtyResult && specialtyResult.length > 0) {
        specialtyResult.map((item) => {
          if (item.image) {
            item.image = new Buffer(item.image, "base64").toString("binary");
            return item;
          }
        });
      }
      let data = specialtyResult.map((item) => {
        return {
          ...item,
          ...item.specialtyData,
        };
      });
      resolve({
        errMessage: "Lấy tất cả chuyên khoa",
        errCode: 0,
        data,
      });
    } catch (e) {
      reject(e);
    }
  });
};
let getDetailSpecialtyById = (inputId, location, lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId || !location || !lang) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        let data = {};
        if (location === "ALL") {
          data = await db.Specialty.findOne({
            where: {
              id: inputId,
            },

            attributes: ["image"],
            include: [
              {
                model: db.Specialty_Translation,
                where: {
                  specialtyId: inputId,
                  lang: lang,
                },
                attributes: {
                  exclude: ["id"], // bỏ cột id
                },
                as: "specialtyData",
                required: false,
              },
              {
                model: db.Doctor_Infor,
                as: "doctorSpecialty",
                where: {
                  lang: lang,
                },
                attributes: ["doctorId", "provinceId"],
              },
              {
                model: db.Markdown,
                attributes: ["contentHTML", "contentMarkdown"],
                as: "specialtyMarkdown",
                where: { specialtyId: inputId, lang: lang },
                required: false,
              },
            ],
            raw: false,
          });
        } else {
          data = await db.Specialty.findOne({
            where: {
              id: inputId,
            },

            attributes: ["image"],
            include: [
              {
                model: db.Specialty_Translation,
                where: {
                  specialtyId: inputId,
                  lang: lang,
                },
                attributes: {
                  exclude: ["id"], // bỏ cột id
                },
                as: "specialtyData",

                required: false,
              },
              {
                model: db.Doctor_Infor,
                where: {
                  provinceId: location,
                  lang: lang,
                },
                attributes: ["doctorId", "provinceId"],
                as: "doctorSpecialty",
                required: false,
              },

              {
                model: db.Markdown,
                attributes: ["contentHTML", "contentMarkdown"],
                as: "specialtyMarkdown",
                where: { specialtyId: inputId, lang: lang },
                required: false,
              },
            ],
            raw: true,
          });
        }
        if (data.image) {
          data.image = new Buffer.from(data.image, "base64").toString("binary");
        }

        //console.log("Duc data", data);
        resolve({
          errMessage: "ok",
          errCode: 0,
          data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};
module.exports = {
  createSpecialty: createSpecialty,
  getAllSpecialty: getAllSpecialty,
  getDetailSpecialtyById: getDetailSpecialtyById,
};
