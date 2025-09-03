const db = require("../models");
let checkRequiredFields = (inputData) => {
  let arrFields = [
    "action",
    "address",
    "imageBase64",
    "contentHTML",
    "contentMarkdown",
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
let createClinicServices = (inputData) => {
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
        // Tạo mới clinic
        let clinicData = await db.Clinic.create({
          image: inputData.imageBase64,
        });
        await db.Clinic_Translation.create({
          clinicId: clinicData.id,
          name: inputData.name,
          address: inputData.address,
          lang: inputData.lang,
        });

        // Tạo mới markdown liên quan
        await db.Markdown.create({
          clinicId: clinicData.id,
          contentHTML: inputData.contentHTML,
          contentMarkdown: inputData.contentMarkdown,
          lang: inputData.lang,
        });

        return resolve({
          errCode: 0,
          errMessage: "Tạo phòng khám thành công",
        });
      }

      // UPDATE
      if (inputData.action === "UPDATE") {
        // Cập nhật thông tin clinic
        let clinic = await db.Clinic.findOne({
          where: { id: inputData.clinicId },
          raw: false,
        });
        if (!clinic) {
          return resolve({
            errCode: 2,
            errMessage: "Không tìm thấy phòng khám để cập nhật",
          });
        }
        clinic.image = inputData.imageBase64;
        await clinic.save();
        // Cập nhật thông tin clinic_translations
        let clinic_translations = await db.Clinic_Translation.findOne({
          where: { clinicId: inputData.clinicId, lang: inputData.lang },
          raw: false,
        });

        if (clinic_translations) {
          clinic_translations.clinicId = inputData.clinicId;
          clinic_translations.name = inputData.name;
          clinic_translations.address = inputData.address;
          clinic_translations.lang = inputData.lang;

          await clinic_translations.save();
        } else {
          // Nếu chưa có markdown thì tạo mới
          await db.Clinic_Translation.create({
            clinicId: inputData.clinicId,
            name: inputData.name,
            address: inputData.address,
            lang: inputData.lang,
          });
        }

        // Cập nhật markdown
        let clinicMarkdown = await db.Markdown.findOne({
          where: { clinicId: inputData.clinicId, lang: inputData.lang },
          raw: false,
        });

        if (clinicMarkdown) {
          clinicMarkdown.contentHTML = inputData.contentHTML;
          clinicMarkdown.contentMarkdown = inputData.contentMarkdown;
          clinicMarkdown.lang = inputData.lang;
          clinicMarkdown.updatedAt = new Date();
          await clinicMarkdown.save();
        } else {
          // Nếu chưa có markdown thì tạo mới
          await db.Markdown.create({
            clinicId: inputData.clinicId,
            contentHTML: inputData.contentHTML,
            contentMarkdown: inputData.contentMarkdown,
            lang: inputData.lang,
          });
        }

        return resolve({
          errCode: 0,
          errMessage: "Cập nhật phòng khám thành công",
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

let getAllClinic = (lang) => {
  return new Promise(async (resolve, reject) => {
    try {
      let clinicResult = await db.Clinic.findAll({
        include: [
          {
            model: db.Clinic_Translation,
            where: { lang: lang },
            attributes: {
              exclude: ["id"],
            },
            as: "clinicData",
            required: false,
          },
          {
            model: db.Markdown,
            where: { lang: lang },
            attributes: ["contentHTML", "contentMarkdown"],
            as: "clinicMarkdown",
          },
        ],
        raw: true,
        nest: true,
      });
      if (clinicResult && clinicResult.length > 0) {
        clinicResult.map((item) => {
          if (item.image) {
            item.image = Buffer.from(item.image, "base64").toString("binary");
          }
          return item;
        });
      }
      let data = clinicResult.map((item) => {
        return {
          ...item,
          ...item.clinicData,
        };
      });

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
let getDetailClinicById = (inputId, lang) => {
  console.log("check inputId", inputId);
  console.log("check lang", lang);
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId || !lang) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        let result = {};
        result = await db.Clinic.findOne({
          where: {
            id: inputId,
          },
          attributes: ["image"],
          include: [
            {
              model: db.Clinic_Translation,
              attributes: {
                exclude: ["id"], // bỏ cột id
              },
              as: "clinicData",
              where: { lang: lang },
              required: false,
            },
            {
              model: db.Doctor_Infor,
              as: "doctorClinic",
              where: {
                clinicId: inputId,
              },
              required: false,
              attributes: ["doctorId", "provinceId"],
            },
            {
              model: db.Markdown,
              attributes: ["contentHTML", "contentMarkdown"],
              as: "clinicMarkdown",
              where: { lang: lang },
              required: false,
            },
          ],
          raw: true,
          nest: true,
        });

        result.image = new Buffer.from(result.image, "base64").toString(
          "binary"
        );

        let data = {
          ...result,
          ...result.clinicData,
        };
        console.log("check data", result);

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
  createClinicServices: createClinicServices,
  getAllClinic: getAllClinic,
  getDetailClinicById: getDetailClinicById,
};
