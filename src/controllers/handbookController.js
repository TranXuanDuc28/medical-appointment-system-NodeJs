const handbookService = require("../services/handbookServices");

let createHandBook = async (req, res) => {
  try {
    let infor = await handbookService.createHandBook(req.body);
    return res.status(200).json(infor);
  } catch (e) {
    return res.status(500).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let getAllHandBook = async (req, res) => {
  try {
    let infor = await handbookService.getAllHandBook(req.query.lang);
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let getDetailHandBookById = async (req, res) => {
  try {
    let infor = await handbookService.getDetailHandBookById(
      req.query.id,
      req.query.lang
    );
    if (!infor) {
      return res.status(404).json({
        errCode: 1,
        errMessage: "Handbook not found",
      });
    }
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

let getRelatedHandBooks = async (req, res) => {
  try {
    const { id, limit = 4, lang } = req.query;
    if (!id) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing handbook ID",
      });
    }

    let infor = await handbookService.getRelatedHandBooks(
      id,
      parseInt(limit),
      lang
    );
    return res.status(200).json(infor);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      errCode: -1,
      errMessage: "Error from the server",
    });
  }
};

module.exports = {
  createHandBook: createHandBook,
  getAllHandBook: getAllHandBook,
  getDetailHandBookById: getDetailHandBookById,
  getRelatedHandBooks: getRelatedHandBooks,
};
