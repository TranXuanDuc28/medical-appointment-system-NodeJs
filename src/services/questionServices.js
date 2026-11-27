const db = require("../models");
import fetch from "node-fetch";
import { assessmentOwner } from "../utils/legacyMisc";
const PATH = process.env.API_CHATBOT_URL;
const testsConfig = {
  BDI_II: {
    totalQuestions: 21,
    scoring: "sum",
    ranges: [
      [0, 9, "Không trầm cảm hoặc rất nhẹ"],
      [10, 18, "Trầm cảm nhẹ – trung bình"],
      [19, 29, "Trầm cảm vừa"],
      [30, 63, "Trầm cảm nặng"],
    ],
  },
  PHQ_9: {
    totalQuestions: 10,
    scoring: "sum",
    ranges: [
      [0, 4, "Răng miệng khỏe"],
      [5, 9, "Nguy cơ nhẹ"],
      [10, 14, "Trung bình, nên khám nha sĩ"],
      [15, 20, "Nghiêm trọng, cần điều trị"],
    ],
  },
  // Có thể thêm nhiều test khác...
};
// Thứ tự trả về: sortOrder (nếu có) rồi id => khớp thứ tự id của bản cũ.
const QUESTION_ORDER = [
  ["sortOrder", "ASC"],
  ["id", "ASC"],
  [{ model: db.QuestionOption, as: "options" }, "sortOrder", "ASC"],
  [{ model: db.QuestionOption, as: "options" }, "id", "ASC"],
];
function calculateScore(answers, questions, testKey) {
  const config = testsConfig[testKey] || null;
  if (!config) {
    throw new Error(`Chưa có cấu hình cho test ${testKey}`);
  }

  let totalScore = 0;
  let maxScore = 0;

  for (const question of questions) {
    const userAnswer = answers.find((a) => a.question_id === question.id);
    if (!userAnswer) continue;

    const selectedOption = question.options.find(
      (o) => o.option_text === userAnswer.option_text
    );

    if (selectedOption) {
      totalScore += selectedOption.score;
    }

    // Tính điểm tối đa
    const maxQuestionScore = Math.max(...question.options.map((o) => o.score));
    maxScore += maxQuestionScore;
  }

  // Nếu chưa trả lời hết câu hỏi → scale lên tương ứng
  if (answers.length < config.totalQuestions) {
    totalScore = Math.round(
      (totalScore * config.totalQuestions) / answers.length
    );
    maxScore = Math.round((maxScore * config.totalQuestions) / answers.length);
  }

  // Tìm mức đánh giá theo ranges
  let healthLevel = "Không xác định";
  for (const [low, high, text] of config.ranges) {
    if (totalScore >= low && totalScore <= high) {
      healthLevel = text;
      break;
    }
  }
  console.log("Max Score:", maxScore);
  console.log("Total Score:", totalScore);
  console.log("Health Level:", healthLevel);

  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  console.log("Percentage:", percentage);
  return {
    totalScore,
    maxScore,
    percentage,
    healthLevel,
  };
}

async function getHealthAdvice(answers, scoreResult, questions) {
  try {
    // Tạo context chi tiết cho AI, kiểm tra question tồn tại
    const answerDetails = answers
      .map((answer, index) => {
        const question = questions.find((q) => q.id === answer.question_id);

        if (question && question.question_text) {
          // 📝 Regex để lấy phần trong ngoặc (ví dụ: "Bi quan về tương lai")
          // const match = question.question_text.match(/\((.*?)\)/);
          // const shortTopic = match ? match[1] : question.question_text;
          const shortTopic = question.question_text;

          // 📝 Rút gọn câu trả lời: bỏ bớt từ đầu kiểu "Tôi", "Đã", "Muốn"
          let shortAnswer = answer.option_text;

          return `${shortTopic} → ${shortAnswer}`;
        }

        // Nếu không tìm thấy câu hỏi
        return `${index + 1}. [Không tìm thấy câu hỏi #${
          answer.question_id
        }] → ${answer.answer}`;
      })
      .join("\n");

    // const categoryAnalysis = analyzeCategoryScores(answers, questions);

    const prompt = `
     Hãy nhận xét tổng điểm, tỷ lệ, mức độ sức khỏe bên dưới và đưa ra lời khuyên hữu ích, ngắn gọn cho người dùng dựa trên kết quả bài test sức khỏe. Dựa vào các câu trả lời chi tiết bên dưới để hiểu rõ hơn về tình trạng sức khỏe của họ.:
      - Tổng điểm: ${scoreResult.totalScore}/${scoreResult.maxScore}
      - Tỷ lệ: ${scoreResult.percentage}%
      - Mức độ sức khỏe: ${scoreResult.healthLevel}

      **CHI TIẾT CÂU TRẢ LỜI:**
      ${answerDetails}
      `;
    // Gọi API AI
    const aiResponse = await fetch(`${PATH}/generate_stream_question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt }),
    });
    console.log("AI Response Status:", aiResponse.status);
    const aiText = await aiResponse.text();
    return aiText.trim();
  } catch (error) {
    console.error("Error getting AI advice:", error);
    return "Không thể lấy lời khuyên từ AI vào lúc này.";
  }
}

// function analyzeCategoryScores(answers, questions) {
//   const categoryScores = {};
//   console.log("questions for analysis:", questions);

//   for (const question of questions) {
//     const category = question.category;
//     console.log("Analyzing question in category:", category);
//     const userAnswer = answers.find((a) => a.questionId === question.id);

//     if (!categoryScores[category]) {
//       categoryScores[category] = { current: 0, max: 0 };
//     }

//     const maxQuestionScore = Math.max(...question.options.map((o) => o.score));
//     categoryScores[category].max += maxQuestionScore;

//     if (userAnswer) {
//       const selectedOption = question.options.find(
//         (o) => o.option_text === userAnswer.answer
//       );
//       if (selectedOption) {
//         categoryScores[category].current += selectedOption.score;
//       }
//     }
//   }

//   return categoryScores;
// }

let submitAssessment = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { userId, category_question_id, testKey, answers } = data;
      if (!userId || !category_question_id || !answers || !testKey) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        // Lấy câu hỏi và options để tính điểm
        const questions = await db.Question.findAll({
          where: { category_question_id },
          include: [
            {
              model: db.QuestionOption,
              as: "options",
            },
          ],
          order: QUESTION_ORDER,
          raw: false,
          nest: true,
        });

        // Chuyển đổi dữ liệu cho hàm tính điểm
        const questionsForScore = questions.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          options: q.options
            ? q.options.map((opt) => ({
                option_text: opt.option_text,
                score: opt.score,
              }))
            : [],
          category_question_id: category_question_id,
        }));

        // Tính điểm
        const scoreResult = calculateScore(answers, questionsForScore, testKey);
        console.log("Score Result:", scoreResult);
        process.stdout.write(
          "Score Result: " + JSON.stringify(scoreResult) + "\n"
        );

        // Gọi AI để lấy lời khuyên
        const aiAdvice = await getHealthAdvice(
          answers,
          scoreResult,
          questionsForScore
        );

        // Lưu kết quả vào database (nếu có bảng HealthAssessment)
        let assessment = null;
        if (db.HealthAssessment) {
          const owner = await assessmentOwner(userId);
          assessment = await db.HealthAssessment.create({
            ...owner,
            total_score: scoreResult.totalScore,
            max_score: scoreResult.maxScore,
            percentage: scoreResult.percentage,
            health_level: scoreResult.healthLevel,
            answers: answers, // cột JSON: truyền thẳng mảng, không stringify (tránh mã hoá 2 lần)
            ai_advice: aiAdvice,
            completed_at: new Date(),
          });
        }

        resolve({
          errCode: 0,
          errMessage: "ok",
          assessmentId: assessment ? assessment.id : null,
          score: scoreResult,
          advice: aiAdvice,
        });
      }
    } catch (e) {
      console.error("submitAssessment error:", e);
      reject(e);
    }
  });
};

// Lấy tất cả category_question cùng các câu hỏi và options
let getAllCategoryQuestions = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await db.Category_Question.findAll({
        include: [
          {
            model: db.Question,
            as: "questions",
            include: [{ model: db.QuestionOption, as: "options" }],
          },
        ],
        order: [
          ["id", "ASC"],
          [{ model: db.Question, as: "questions" }, "sortOrder", "ASC"],
          [{ model: db.Question, as: "questions" }, "id", "ASC"],
          [
            { model: db.Question, as: "questions" },
            { model: db.QuestionOption, as: "options" },
            "sortOrder",
            "ASC",
          ],
          [
            { model: db.Question, as: "questions" },
            { model: db.QuestionOption, as: "options" },
            "id",
            "ASC",
          ],
        ],
        raw: false,
        nest: true,
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

// Lấy tất cả câu hỏi theo category_question_id
let getQuestionsByCategory = (category_question_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!category_question_id) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        let data = await db.Question.findAll({
          where: { category_question_id },
          include: [{ model: db.QuestionOption, as: "options" }],
          order: QUESTION_ORDER,
          raw: false,
          nest: true,
        });
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

// Tạo mới category_question
let createNewCategoryQuestion = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.title) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        const [category, created] = await db.Category_Question.findOrCreate({
          where: { title: data.title },
          defaults: { title: data.title, description: data.description || "" },
        });
        resolve({
          errCode: 0,
          errMessage: "ok",
          data: category,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

// Tạo mới câu hỏi cho category_question
let createNewQuestion = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.question_text || !data.category_question_id || !data.options) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        const questionId = await db.sequelize.transaction(async (transaction) => {
          // sortOrder: xếp cuối danh mục
          const last = await db.Question.max("sortOrder", {
            where: { category_question_id: data.category_question_id },
            transaction,
          });
          // Tạo câu hỏi mới
          const newQuestion = await db.Question.create(
            {
              question_text: data.question_text,
              category_question_id: data.category_question_id,
              sortOrder: (Number(last) || 0) + 1,
              is_active: data.is_active !== undefined ? data.is_active : true,
            },
            { transaction }
          );

          // Thêm đáp án
          if (data.options && data.options.length > 0) {
            const optionsToCreate = data.options.map((opt, idx) => ({
              question_id: newQuestion.id,
              option_text: opt.option_text,
              score: opt.score,
              sortOrder: idx + 1,
            }));
            await db.QuestionOption.bulkCreate(optionsToCreate, { transaction });
          }
          return newQuestion.id;
        });

        resolve({
          errCode: 0,
          errMessage: "ok",
          questionId,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

// Sửa câu hỏi
let editQuestion = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.question_text || !data.category_question_id) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        await db.sequelize.transaction(async (transaction) => {
          // Cập nhật câu hỏi
          await db.Question.update(
            {
              question_text: data.question_text,
              category_question_id: data.category_question_id,
              is_active: data.is_active,
            },
            { where: { id: data.id }, transaction }
          );

          // Xoá đáp án cũ
          await db.QuestionOption.destroy({
            where: { question_id: data.id },
            transaction,
          });

          // Thêm đáp án mới
          if (data.options && data.options.length > 0) {
            const optionsToCreate = data.options.map((opt, idx) => ({
              question_id: data.id,
              option_text: opt.option_text,
              score: opt.score,
              sortOrder: idx + 1,
            }));
            await db.QuestionOption.bulkCreate(optionsToCreate, { transaction });
          }
        });

        resolve({
          errCode: 0,
          errMessage: "ok",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

// Lấy chi tiết 1 câu hỏi (kèm options)
let getQuestionById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        const data = await db.Question.findOne({
          where: { id },
          include: [{ model: db.QuestionOption, as: "options" }],
          order: QUESTION_ORDER,
          raw: false,
          nest: true,
        });
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

// Xóa câu hỏi
let deleteQuestion = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        await db.sequelize.transaction(async (transaction) => {
          await db.QuestionOption.destroy({ where: { question_id: id }, transaction });
          await db.Question.destroy({ where: { id }, transaction });
        });
        resolve({
          errCode: 0,
          errMessage: "ok",
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

// ---- Các hàm controller đã gọi nhưng bản cũ chưa cài (route /api/get_all_questions, history, detail) ----

// Lấy tất cả câu hỏi (kèm options) của mọi danh mục
let getAllQuestions = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await db.Question.findAll({
        include: [{ model: db.QuestionOption, as: "options" }],
        order: [["category_question_id", "ASC"], ...QUESTION_ORDER],
        raw: false,
        nest: true,
      });
      resolve({ errMessage: "ok", errCode: 0, data });
    } catch (e) {
      reject(e);
    }
  });
};

// Dạng trả về một lần đánh giá: user_id luôn là chuỗi giống input của frontend (id số hoặc guest_key)
const assessmentOf = (row) => ({
  id: row.id,
  user_id: row.user_id !== null && row.user_id !== undefined ? String(row.user_id) : row.guest_key,
  total_score: row.total_score,
  max_score: row.max_score,
  percentage: Number(row.percentage),
  health_level: row.health_level,
  answers: row.answers,
  ai_advice: row.ai_advice,
  completed_at: row.completed_at,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// Lịch sử đánh giá theo userId (id số của user đăng nhập hoặc khóa khách "user_...")
let getAssessmentHistoryById = (userId, limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!userId) {
        resolve({ errCode: 1, errMessage: "Missing parameter" });
      } else {
        const owner = await assessmentOwner(userId);
        const where = owner.user_id !== null ? { user_id: owner.user_id } : { guest_key: owner.guest_key };
        const lim = parseInt(limit);
        const rows = await db.HealthAssessment.findAll({
          where,
          order: [
            ["createdAt", "DESC"],
            ["id", "DESC"],
          ],
          ...(lim > 0 ? { limit: lim } : {}),
        });
        resolve({ errMessage: "ok", errCode: 0, data: rows.map(assessmentOf) });
      }
    } catch (e) {
      reject(e);
    }
  });
};

// Chi tiết một lần đánh giá
let getAssessmentDetailById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        resolve({ errCode: 1, errMessage: "Missing parameter" });
      } else {
        const row = await db.HealthAssessment.findOne({ where: { id } });
        if (!row) {
          resolve({ errCode: 2, errMessage: "Assessment not found" });
        } else {
          resolve({ errMessage: "ok", errCode: 0, data: assessmentOf(row) });
        }
      }
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  submitAssessment: submitAssessment,
  getAllQuestions,
  getAllCategoryQuestions,
  getQuestionsByCategory,
  createNewCategoryQuestion,
  createNewQuestion,
  editQuestion,
  getQuestionById,
  deleteQuestion,
  getAssessmentHistoryById,
  getAssessmentDetailById,
};
