const db = require("../models");
const fetch = require("node-fetch"); // Đảm bảo đã cài node-fetch
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
    const aiResponse = await fetch(
      "http://localhost:5002/generate_stream_question",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt }),
      }
    );
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
          assessment = await db.HealthAssessment.create({
            user_id: userId,
            total_score: scoreResult.totalScore,
            max_score: scoreResult.maxScore,
            percentage: scoreResult.percentage,
            health_level: scoreResult.healthLevel,
            answers: JSON.stringify(answers),
            ai_advice: aiAdvice,
            test_key: testKey,
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
        order: [["id", "ASC"]],
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
          order: [["id", "ASC"]],
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
        // Tạo câu hỏi mới
        const newQuestion = await db.Question.create({
          question_text: data.question_text,
          category_question_id: data.category_question_id,
          is_active: data.is_active !== undefined ? data.is_active : true,
        });

        // Thêm đáp án
        if (data.options && data.options.length > 0) {
          const optionsToCreate = data.options.map((opt) => ({
            question_id: newQuestion.id,
            option_text: opt.option_text,
            score: opt.score,
          }));
          await db.QuestionOption.bulkCreate(optionsToCreate);
        }

        resolve({
          errCode: 0,
          errMessage: "ok",
          questionId: newQuestion.id,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

// Sửa câu hỏi
let editQuestion = (data) => {
  console.log("check data edit question", data);
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id || !data.question_text || !data.category_question_id) {
        resolve({
          errCode: 1,
          errMessage: "Missing parameter",
        });
      } else {
        // Cập nhật câu hỏi
        await db.Question.update(
          {
            question_text: data.question_text,
            category_question_id: data.category_question_id,
            is_active: data.is_active,
          },
          { where: { id: data.id } }
        );

        // Xoá đáp án cũ
        await db.QuestionOption.destroy({ where: { question_id: data.id } });

        // Thêm đáp án mới
        if (data.options && data.options.length > 0) {
          const optionsToCreate = data.options.map((opt) => ({
            question_id: data.id,
            option_text: opt.option_text,
            score: opt.score,
          }));
          await db.QuestionOption.bulkCreate(optionsToCreate);
        }

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
        await db.QuestionOption.destroy({ where: { question_id: id } });
        await db.Question.destroy({ where: { id } });
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
module.exports = {
  submitAssessment: submitAssessment,
  getAllCategoryQuestions,
  getQuestionsByCategory,
  createNewCategoryQuestion,
  createNewQuestion,
  editQuestion,
  getQuestionById,
  deleteQuestion,
};
