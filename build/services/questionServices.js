"use strict";

function _regenerator() {
  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e,
    t,
    r = "function" == typeof Symbol ? Symbol : {},
    n = r.iterator || "@@iterator",
    o = r.toStringTag || "@@toStringTag";
  function i(r, n, o, i) {
    var c = n && n.prototype instanceof Generator ? n : Generator,
      u = Object.create(c.prototype);
    return (
      _regeneratorDefine2(
        u,
        "_invoke",
        (function (r, n, o) {
          var i,
            c,
            u,
            f = 0,
            p = o || [],
            y = !1,
            G = {
              p: 0,
              n: 0,
              v: e,
              a: d,
              f: d.bind(e, 4),
              d: function d(t, r) {
                return (i = t), (c = 0), (u = e), (G.n = r), a;
              },
            };
          function d(r, n) {
            for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) {
              var o,
                i = p[t],
                d = G.p,
                l = i[2];
              r > 3
                ? (o = l === n) &&
                  ((u = i[(c = i[4]) ? 5 : ((c = 3), 3)]), (i[4] = i[5] = e))
                : i[0] <= d &&
                  ((o = r < 2 && d < i[1])
                    ? ((c = 0), (G.v = n), (G.n = i[1]))
                    : d < l &&
                      (o = r < 3 || i[0] > n || n > l) &&
                      ((i[4] = r), (i[5] = n), (G.n = l), (c = 0)));
            }
            if (o || r > 1) return a;
            throw ((y = !0), n);
          }
          return function (o, p, l) {
            if (f > 1) throw TypeError("Generator is already running");
            for (
              y && 1 === p && d(p, l), c = p, u = l;
              (t = c < 2 ? e : u) || !y;

            ) {
              i ||
                (c
                  ? c < 3
                    ? (c > 1 && (G.n = -1), d(c, u))
                    : (G.n = u)
                  : (G.v = u));
              try {
                if (((f = 2), i)) {
                  if ((c || (o = "next"), (t = i[o]))) {
                    if (!(t = t.call(i, u)))
                      throw TypeError("iterator result is not an object");
                    if (!t.done) return t;
                    (u = t.value), c < 2 && (c = 0);
                  } else
                    1 === c && (t = i["return"]) && t.call(i),
                      c < 2 &&
                        ((u = TypeError(
                          "The iterator does not provide a '" + o + "' method"
                        )),
                        (c = 1));
                  i = e;
                } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break;
              } catch (t) {
                (i = e), (c = 1), (u = t);
              } finally {
                f = 1;
              }
            }
            return { value: t, done: y };
          };
        })(r, o, i),
        !0
      ),
      u
    );
  }
  var a = {};
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  t = Object.getPrototypeOf;
  var c = [][n]
      ? t(t([][n]()))
      : (_regeneratorDefine2((t = {}), n, function () {
          return this;
        }),
        t),
    u =
      (GeneratorFunctionPrototype.prototype =
      Generator.prototype =
        Object.create(c));
  function f(e) {
    return (
      Object.setPrototypeOf
        ? Object.setPrototypeOf(e, GeneratorFunctionPrototype)
        : ((e.__proto__ = GeneratorFunctionPrototype),
          _regeneratorDefine2(e, o, "GeneratorFunction")),
      (e.prototype = Object.create(u)),
      e
    );
  }
  return (
    (GeneratorFunction.prototype = GeneratorFunctionPrototype),
    _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype),
    _regeneratorDefine2(
      GeneratorFunctionPrototype,
      "constructor",
      GeneratorFunction
    ),
    (GeneratorFunction.displayName = "GeneratorFunction"),
    _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"),
    _regeneratorDefine2(u),
    _regeneratorDefine2(u, o, "Generator"),
    _regeneratorDefine2(u, n, function () {
      return this;
    }),
    _regeneratorDefine2(u, "toString", function () {
      return "[object Generator]";
    }),
    (_regenerator = function _regenerator() {
      return { w: i, m: f };
    })()
  );
}
function _regeneratorDefine2(e, r, n, t) {
  var i = Object.defineProperty;
  try {
    i({}, "", {});
  } catch (e) {
    i = 0;
  }
  (_regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) {
    function o(r, n) {
      _regeneratorDefine2(e, r, function (e) {
        return this._invoke(r, n, e);
      });
    }
    r
      ? i
        ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t })
        : (e[r] = n)
      : (o("next", 0), o("throw", 1), o("return", 2));
  }),
    _regeneratorDefine2(e, r, n, t);
}
function asyncGeneratorStep(n, t, e, r, o, a, c) {
  try {
    var i = n[a](c),
      u = i.value;
  } catch (n) {
    return void e(n);
  }
  i.done ? t(u) : Promise.resolve(u).then(r, o);
}
function _asyncToGenerator(n) {
  return function () {
    var t = this,
      e = arguments;
    return new Promise(function (r, o) {
      var a = n.apply(t, e);
      function _next(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
      }
      function _throw(n) {
        asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
      }
      _next(void 0);
    });
  };
}
function _slicedToArray(r, e) {
  return (
    _arrayWithHoles(r) ||
    _iterableToArrayLimit(r, e) ||
    _unsupportedIterableToArray(r, e) ||
    _nonIterableRest()
  );
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
  );
}
function _iterableToArrayLimit(r, l) {
  var t =
    null == r
      ? null
      : ("undefined" != typeof Symbol && r[Symbol.iterator]) || r["@@iterator"];
  if (null != t) {
    var e,
      n,
      i,
      u,
      a = [],
      f = !0,
      o = !1;
    try {
      if (((i = (t = t.call(r)).next), 0 === l)) {
        if (Object(t) !== t) return;
        f = !1;
      } else
        for (
          ;
          !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l);
          f = !0
        );
    } catch (r) {
      (o = !0), (n = r);
    } finally {
      try {
        if (!f && null != t["return"] && ((u = t["return"]()), Object(u) !== u))
          return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function _toConsumableArray(r) {
  return (
    _arrayWithoutHoles(r) ||
    _iterableToArray(r) ||
    _unsupportedIterableToArray(r) ||
    _nonIterableSpread()
  );
}
function _nonIterableSpread() {
  throw new TypeError(
    "Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
  );
}
function _iterableToArray(r) {
  if (
    ("undefined" != typeof Symbol && null != r[Symbol.iterator]) ||
    null != r["@@iterator"]
  )
    return Array.from(r);
}
function _arrayWithoutHoles(r) {
  if (Array.isArray(r)) return _arrayLikeToArray(r);
}
function _createForOfIteratorHelper(r, e) {
  var t =
    ("undefined" != typeof Symbol && r[Symbol.iterator]) || r["@@iterator"];
  if (!t) {
    if (
      Array.isArray(r) ||
      (t = _unsupportedIterableToArray(r)) ||
      (e && r && "number" == typeof r.length)
    ) {
      t && (r = t);
      var _n = 0,
        F = function F() {};
      return {
        s: F,
        n: function n() {
          return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] };
        },
        e: function e(r) {
          throw r;
        },
        f: F,
      };
    }
    throw new TypeError(
      "Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
    );
  }
  var o,
    a = !0,
    u = !1;
  return {
    s: function s() {
      t = t.call(r);
    },
    n: function n() {
      var r = t.next();
      return (a = r.done), r;
    },
    e: function e(r) {
      (u = !0), (o = r);
    },
    f: function f() {
      try {
        a || null == t["return"] || t["return"]();
      } finally {
        if (u) throw o;
      }
    },
  };
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return (
      "Object" === t && r.constructor && (t = r.constructor.name),
      "Map" === t || "Set" === t
        ? Array.from(r)
        : "Arguments" === t ||
          /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)
        ? _arrayLikeToArray(r, a)
        : void 0
    );
  }
}
function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
var db = require("../models");
import fetch from "node-fetch";
var testsConfig = {
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
  var config = testsConfig[testKey] || null;
  if (!config) {
    throw new Error(
      "Ch\u01B0a c\xF3 c\u1EA5u h\xECnh cho test ".concat(testKey)
    );
  }
  var totalScore = 0;
  var maxScore = 0;
  var _iterator = _createForOfIteratorHelper(questions),
    _step;
  try {
    var _loop = function _loop() {
      var question = _step.value;
      var userAnswer = answers.find(function (a) {
        return a.question_id === question.id;
      });
      if (!userAnswer) return 1; // continue
      var selectedOption = question.options.find(function (o) {
        return o.option_text === userAnswer.option_text;
      });
      if (selectedOption) {
        totalScore += selectedOption.score;
      }

      // Tính điểm tối đa
      var maxQuestionScore = Math.max.apply(
        Math,
        _toConsumableArray(
          question.options.map(function (o) {
            return o.score;
          })
        )
      );
      maxScore += maxQuestionScore;
    };
    for (_iterator.s(); !(_step = _iterator.n()).done; ) {
      if (_loop()) continue;
    }

    // Nếu chưa trả lời hết câu hỏi → scale lên tương ứng
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  if (answers.length < config.totalQuestions) {
    totalScore = Math.round(
      (totalScore * config.totalQuestions) / answers.length
    );
    maxScore = Math.round((maxScore * config.totalQuestions) / answers.length);
  }

  // Tìm mức đánh giá theo ranges
  var healthLevel = "Không xác định";
  var _iterator2 = _createForOfIteratorHelper(config.ranges),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done; ) {
      var _step2$value = _slicedToArray(_step2.value, 3),
        low = _step2$value[0],
        high = _step2$value[1],
        text = _step2$value[2];
      if (totalScore >= low && totalScore <= high) {
        healthLevel = text;
        break;
      }
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  console.log("Max Score:", maxScore);
  console.log("Total Score:", totalScore);
  console.log("Health Level:", healthLevel);
  var percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  console.log("Percentage:", percentage);
  return {
    totalScore: totalScore,
    maxScore: maxScore,
    percentage: percentage,
    healthLevel: healthLevel,
  };
}
function getHealthAdvice(_x, _x2, _x3) {
  return _getHealthAdvice.apply(this, arguments);
} // function analyzeCategoryScores(answers, questions) {
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
function _getHealthAdvice() {
  _getHealthAdvice = _asyncToGenerator(
    /*#__PURE__*/ _regenerator().m(function _callee9(
      answers,
      scoreResult,
      questions
    ) {
      var answerDetails, prompt, aiResponse, aiText, _t9;
      return _regenerator().w(
        function (_context9) {
          while (1)
            switch ((_context9.p = _context9.n)) {
              case 0:
                _context9.p = 0;
                // Tạo context chi tiết cho AI, kiểm tra question tồn tại
                answerDetails = answers
                  .map(function (answer, index) {
                    var question = questions.find(function (q) {
                      return q.id === answer.question_id;
                    });
                    if (question && question.question_text) {
                      // 📝 Regex để lấy phần trong ngoặc (ví dụ: "Bi quan về tương lai")
                      // const match = question.question_text.match(/\((.*?)\)/);
                      // const shortTopic = match ? match[1] : question.question_text;
                      var shortTopic = question.question_text;

                      // 📝 Rút gọn câu trả lời: bỏ bớt từ đầu kiểu "Tôi", "Đã", "Muốn"
                      var shortAnswer = answer.option_text;
                      return ""
                        .concat(shortTopic, " \u2192 ")
                        .concat(shortAnswer);
                    }

                    // Nếu không tìm thấy câu hỏi
                    return ""
                      .concat(
                        index + 1,
                        ". [Kh\xF4ng t\xECm th\u1EA5y c\xE2u h\u1ECFi #"
                      )
                      .concat(answer.question_id, "] \u2192 ")
                      .concat(answer.answer);
                  })
                  .join("\n"); // const categoryAnalysis = analyzeCategoryScores(answers, questions);
                prompt =
                  "\n     H\xE3y nh\u1EADn x\xE9t t\u1ED5ng \u0111i\u1EC3m, t\u1EF7 l\u1EC7, m\u1EE9c \u0111\u1ED9 s\u1EE9c kh\u1ECFe b\xEAn d\u01B0\u1EDBi v\xE0 \u0111\u01B0a ra l\u1EDDi khuy\xEAn h\u1EEFu \xEDch, ng\u1EAFn g\u1ECDn cho ng\u01B0\u1EDDi d\xF9ng d\u1EF1a tr\xEAn k\u1EBFt qu\u1EA3 b\xE0i test s\u1EE9c kh\u1ECFe. D\u1EF1a v\xE0o c\xE1c c\xE2u tr\u1EA3 l\u1EDDi chi ti\u1EBFt b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 hi\u1EC3u r\xF5 h\u01A1n v\u1EC1 t\xECnh tr\u1EA1ng s\u1EE9c kh\u1ECFe c\u1EE7a h\u1ECD.:\n      - T\u1ED5ng \u0111i\u1EC3m: "
                    .concat(scoreResult.totalScore, "/")
                    .concat(scoreResult.maxScore, "\n      - T\u1EF7 l\u1EC7: ")
                    .concat(
                      scoreResult.percentage,
                      "%\n      - M\u1EE9c \u0111\u1ED9 s\u1EE9c kh\u1ECFe: "
                    )
                    .concat(
                      scoreResult.healthLevel,
                      "\n\n      **CHI TI\u1EBET C\xC2U TR\u1EA2 L\u1EDCI:**\n      "
                    )
                    .concat(answerDetails, "\n      "); // Gọi API AI
                _context9.n = 1;
                const PATH = process.env.REACT_APP_CHATBOT_URL;
                return fetch(`${PATH}/generate_stream_question`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    prompt: prompt,
                  }),
                });
              case 1:
                aiResponse = _context9.v;
                console.log("AI Response Status:", aiResponse.status);
                _context9.n = 2;
                return aiResponse.text();
              case 2:
                aiText = _context9.v;
                return _context9.a(2, aiText.trim());
              case 3:
                _context9.p = 3;
                _t9 = _context9.v;
                console.error("Error getting AI advice:", _t9);
                return _context9.a(
                  2,
                  "Không thể lấy lời khuyên từ AI vào lúc này."
                );
            }
        },
        _callee9,
        null,
        [[0, 3]]
      );
    })
  );
  return _getHealthAdvice.apply(this, arguments);
}
var submitAssessment = function submitAssessment(data) {
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee(resolve, reject) {
          var userId,
            category_question_id,
            testKey,
            answers,
            questions,
            questionsForScore,
            scoreResult,
            aiAdvice,
            assessment,
            _t;
          return _regenerator().w(
            function (_context) {
              while (1)
                switch ((_context.p = _context.n)) {
                  case 0:
                    _context.p = 0;
                    (userId = data.userId),
                      (category_question_id = data.category_question_id),
                      (testKey = data.testKey),
                      (answers = data.answers);
                    if (
                      !(
                        !userId ||
                        !category_question_id ||
                        !answers ||
                        !testKey
                      )
                    ) {
                      _context.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing parameter",
                    });
                    _context.n = 6;
                    break;
                  case 1:
                    _context.n = 2;
                    return db.Question.findAll({
                      where: {
                        category_question_id: category_question_id,
                      },
                      include: [
                        {
                          model: db.QuestionOption,
                          as: "options",
                        },
                      ],
                      raw: false,
                      nest: true,
                    });
                  case 2:
                    questions = _context.v;
                    // Chuyển đổi dữ liệu cho hàm tính điểm
                    questionsForScore = questions.map(function (q) {
                      return {
                        id: q.id,
                        question_text: q.question_text,
                        options: q.options
                          ? q.options.map(function (opt) {
                              return {
                                option_text: opt.option_text,
                                score: opt.score,
                              };
                            })
                          : [],
                        category_question_id: category_question_id,
                      };
                    }); // Tính điểm
                    scoreResult = calculateScore(
                      answers,
                      questionsForScore,
                      testKey
                    );
                    console.log("Score Result:", scoreResult);
                    process.stdout.write(
                      "Score Result: " + JSON.stringify(scoreResult) + "\n"
                    );

                    // Gọi AI để lấy lời khuyên
                    _context.n = 3;
                    return getHealthAdvice(
                      answers,
                      scoreResult,
                      questionsForScore
                    );
                  case 3:
                    aiAdvice = _context.v;
                    // Lưu kết quả vào database (nếu có bảng HealthAssessment)
                    assessment = null;
                    if (!db.HealthAssessment) {
                      _context.n = 5;
                      break;
                    }
                    _context.n = 4;
                    return db.HealthAssessment.create({
                      user_id: userId,
                      total_score: scoreResult.totalScore,
                      max_score: scoreResult.maxScore,
                      percentage: scoreResult.percentage,
                      health_level: scoreResult.healthLevel,
                      answers: JSON.stringify(answers),
                      ai_advice: aiAdvice,
                      test_key: testKey,
                    });
                  case 4:
                    assessment = _context.v;
                  case 5:
                    resolve({
                      errCode: 0,
                      errMessage: "ok",
                      assessmentId: assessment ? assessment.id : null,
                      score: scoreResult,
                      advice: aiAdvice,
                    });
                  case 6:
                    _context.n = 8;
                    break;
                  case 7:
                    _context.p = 7;
                    _t = _context.v;
                    console.error("submitAssessment error:", _t);
                    reject(_t);
                  case 8:
                    return _context.a(2);
                }
            },
            _callee,
            null,
            [[0, 7]]
          );
        })
      );
      return function (_x4, _x5) {
        return _ref.apply(this, arguments);
      };
    })()
  );
};

// Lấy tất cả category_question cùng các câu hỏi và options
var getAllCategoryQuestions = function getAllCategoryQuestions() {
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref2 = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee2(resolve, reject) {
          var data, _t2;
          return _regenerator().w(
            function (_context2) {
              while (1)
                switch ((_context2.p = _context2.n)) {
                  case 0:
                    _context2.p = 0;
                    _context2.n = 1;
                    return db.Category_Question.findAll({
                      include: [
                        {
                          model: db.Question,
                          as: "questions",
                          include: [
                            {
                              model: db.QuestionOption,
                              as: "options",
                            },
                          ],
                        },
                      ],
                      order: [["id", "ASC"]],
                      raw: false,
                      nest: true,
                    });
                  case 1:
                    data = _context2.v;
                    resolve({
                      errMessage: "ok",
                      errCode: 0,
                      data: data,
                    });
                    _context2.n = 3;
                    break;
                  case 2:
                    _context2.p = 2;
                    _t2 = _context2.v;
                    reject(_t2);
                  case 3:
                    return _context2.a(2);
                }
            },
            _callee2,
            null,
            [[0, 2]]
          );
        })
      );
      return function (_x6, _x7) {
        return _ref2.apply(this, arguments);
      };
    })()
  );
};

// Lấy tất cả câu hỏi theo category_question_id
var getQuestionsByCategory = function getQuestionsByCategory(
  category_question_id
) {
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref3 = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee3(resolve, reject) {
          var data, _t3;
          return _regenerator().w(
            function (_context3) {
              while (1)
                switch ((_context3.p = _context3.n)) {
                  case 0:
                    _context3.p = 0;
                    if (category_question_id) {
                      _context3.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing parameter",
                    });
                    _context3.n = 3;
                    break;
                  case 1:
                    _context3.n = 2;
                    return db.Question.findAll({
                      where: {
                        category_question_id: category_question_id,
                      },
                      include: [
                        {
                          model: db.QuestionOption,
                          as: "options",
                        },
                      ],
                      order: [["id", "ASC"]],
                      raw: false,
                      nest: true,
                    });
                  case 2:
                    data = _context3.v;
                    resolve({
                      errMessage: "ok",
                      errCode: 0,
                      data: data,
                    });
                  case 3:
                    _context3.n = 5;
                    break;
                  case 4:
                    _context3.p = 4;
                    _t3 = _context3.v;
                    reject(_t3);
                  case 5:
                    return _context3.a(2);
                }
            },
            _callee3,
            null,
            [[0, 4]]
          );
        })
      );
      return function (_x8, _x9) {
        return _ref3.apply(this, arguments);
      };
    })()
  );
};

// Tạo mới category_question
var createNewCategoryQuestion = function createNewCategoryQuestion(data) {
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref4 = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee4(resolve, reject) {
          var _yield$db$Category_Qu,
            _yield$db$Category_Qu2,
            category,
            created,
            _t4;
          return _regenerator().w(
            function (_context4) {
              while (1)
                switch ((_context4.p = _context4.n)) {
                  case 0:
                    _context4.p = 0;
                    if (data.title) {
                      _context4.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing parameter",
                    });
                    _context4.n = 3;
                    break;
                  case 1:
                    _context4.n = 2;
                    return db.Category_Question.findOrCreate({
                      where: {
                        title: data.title,
                      },
                      defaults: {
                        title: data.title,
                        description: data.description || "",
                      },
                    });
                  case 2:
                    _yield$db$Category_Qu = _context4.v;
                    _yield$db$Category_Qu2 = _slicedToArray(
                      _yield$db$Category_Qu,
                      2
                    );
                    category = _yield$db$Category_Qu2[0];
                    created = _yield$db$Category_Qu2[1];
                    resolve({
                      errCode: 0,
                      errMessage: "ok",
                      data: category,
                    });
                  case 3:
                    _context4.n = 5;
                    break;
                  case 4:
                    _context4.p = 4;
                    _t4 = _context4.v;
                    reject(_t4);
                  case 5:
                    return _context4.a(2);
                }
            },
            _callee4,
            null,
            [[0, 4]]
          );
        })
      );
      return function (_x0, _x1) {
        return _ref4.apply(this, arguments);
      };
    })()
  );
};

// Tạo mới câu hỏi cho category_question
var createNewQuestion = function createNewQuestion(data) {
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref5 = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee5(resolve, reject) {
          var newQuestion, optionsToCreate, _t5;
          return _regenerator().w(
            function (_context5) {
              while (1)
                switch ((_context5.p = _context5.n)) {
                  case 0:
                    _context5.p = 0;
                    if (
                      !(
                        !data.question_text ||
                        !data.category_question_id ||
                        !data.options
                      )
                    ) {
                      _context5.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing parameter",
                    });
                    _context5.n = 4;
                    break;
                  case 1:
                    _context5.n = 2;
                    return db.Question.create({
                      question_text: data.question_text,
                      category_question_id: data.category_question_id,
                      is_active:
                        data.is_active !== undefined ? data.is_active : true,
                    });
                  case 2:
                    newQuestion = _context5.v;
                    if (!(data.options && data.options.length > 0)) {
                      _context5.n = 3;
                      break;
                    }
                    optionsToCreate = data.options.map(function (opt) {
                      return {
                        question_id: newQuestion.id,
                        option_text: opt.option_text,
                        score: opt.score,
                      };
                    });
                    _context5.n = 3;
                    return db.QuestionOption.bulkCreate(optionsToCreate);
                  case 3:
                    resolve({
                      errCode: 0,
                      errMessage: "ok",
                      questionId: newQuestion.id,
                    });
                  case 4:
                    _context5.n = 6;
                    break;
                  case 5:
                    _context5.p = 5;
                    _t5 = _context5.v;
                    reject(_t5);
                  case 6:
                    return _context5.a(2);
                }
            },
            _callee5,
            null,
            [[0, 5]]
          );
        })
      );
      return function (_x10, _x11) {
        return _ref5.apply(this, arguments);
      };
    })()
  );
};

// Sửa câu hỏi
var editQuestion = function editQuestion(data) {
  console.log("check data edit question", data);
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref6 = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee6(resolve, reject) {
          var optionsToCreate, _t6;
          return _regenerator().w(
            function (_context6) {
              while (1)
                switch ((_context6.p = _context6.n)) {
                  case 0:
                    _context6.p = 0;
                    if (
                      !(
                        !data.id ||
                        !data.question_text ||
                        !data.category_question_id
                      )
                    ) {
                      _context6.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing parameter",
                    });
                    _context6.n = 5;
                    break;
                  case 1:
                    _context6.n = 2;
                    return db.Question.update(
                      {
                        question_text: data.question_text,
                        category_question_id: data.category_question_id,
                        is_active: data.is_active,
                      },
                      {
                        where: {
                          id: data.id,
                        },
                      }
                    );
                  case 2:
                    _context6.n = 3;
                    return db.QuestionOption.destroy({
                      where: {
                        question_id: data.id,
                      },
                    });
                  case 3:
                    if (!(data.options && data.options.length > 0)) {
                      _context6.n = 4;
                      break;
                    }
                    optionsToCreate = data.options.map(function (opt) {
                      return {
                        question_id: data.id,
                        option_text: opt.option_text,
                        score: opt.score,
                      };
                    });
                    _context6.n = 4;
                    return db.QuestionOption.bulkCreate(optionsToCreate);
                  case 4:
                    resolve({
                      errCode: 0,
                      errMessage: "ok",
                    });
                  case 5:
                    _context6.n = 7;
                    break;
                  case 6:
                    _context6.p = 6;
                    _t6 = _context6.v;
                    reject(_t6);
                  case 7:
                    return _context6.a(2);
                }
            },
            _callee6,
            null,
            [[0, 6]]
          );
        })
      );
      return function (_x12, _x13) {
        return _ref6.apply(this, arguments);
      };
    })()
  );
};

// Lấy chi tiết 1 câu hỏi (kèm options)
var getQuestionById = function getQuestionById(id) {
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref7 = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee7(resolve, reject) {
          var data, _t7;
          return _regenerator().w(
            function (_context7) {
              while (1)
                switch ((_context7.p = _context7.n)) {
                  case 0:
                    _context7.p = 0;
                    if (id) {
                      _context7.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing parameter",
                    });
                    _context7.n = 3;
                    break;
                  case 1:
                    _context7.n = 2;
                    return db.Question.findOne({
                      where: {
                        id: id,
                      },
                      include: [
                        {
                          model: db.QuestionOption,
                          as: "options",
                        },
                      ],
                      raw: false,
                      nest: true,
                    });
                  case 2:
                    data = _context7.v;
                    resolve({
                      errMessage: "ok",
                      errCode: 0,
                      data: data,
                    });
                  case 3:
                    _context7.n = 5;
                    break;
                  case 4:
                    _context7.p = 4;
                    _t7 = _context7.v;
                    reject(_t7);
                  case 5:
                    return _context7.a(2);
                }
            },
            _callee7,
            null,
            [[0, 4]]
          );
        })
      );
      return function (_x14, _x15) {
        return _ref7.apply(this, arguments);
      };
    })()
  );
};

// Xóa câu hỏi
var deleteQuestion = function deleteQuestion(id) {
  return new Promise(
    /*#__PURE__*/ (function () {
      var _ref8 = _asyncToGenerator(
        /*#__PURE__*/ _regenerator().m(function _callee8(resolve, reject) {
          var _t8;
          return _regenerator().w(
            function (_context8) {
              while (1)
                switch ((_context8.p = _context8.n)) {
                  case 0:
                    _context8.p = 0;
                    if (id) {
                      _context8.n = 1;
                      break;
                    }
                    resolve({
                      errCode: 1,
                      errMessage: "Missing parameter",
                    });
                    _context8.n = 4;
                    break;
                  case 1:
                    _context8.n = 2;
                    return db.QuestionOption.destroy({
                      where: {
                        question_id: id,
                      },
                    });
                  case 2:
                    _context8.n = 3;
                    return db.Question.destroy({
                      where: {
                        id: id,
                      },
                    });
                  case 3:
                    resolve({
                      errCode: 0,
                      errMessage: "ok",
                    });
                  case 4:
                    _context8.n = 6;
                    break;
                  case 5:
                    _context8.p = 5;
                    _t8 = _context8.v;
                    reject(_t8);
                  case 6:
                    return _context8.a(2);
                }
            },
            _callee8,
            null,
            [[0, 5]]
          );
        })
      );
      return function (_x16, _x17) {
        return _ref8.apply(this, arguments);
      };
    })()
  );
};
module.exports = {
  submitAssessment: submitAssessment,
  getAllCategoryQuestions: getAllCategoryQuestions,
  getQuestionsByCategory: getQuestionsByCategory,
  createNewCategoryQuestion: createNewCategoryQuestion,
  createNewQuestion: createNewQuestion,
  editQuestion: editQuestion,
  getQuestionById: getQuestionById,
  deleteQuestion: deleteQuestion,
};
