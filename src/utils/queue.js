import { Queue, Worker } from "bullmq";
import emailServices from "../services/emailServices";

let emailQueue = null;
let emailWorker = null;
let queueConnectionOptions = null;

// Helper to prepare PDF, generate PayOS link, and save history in background
const prepareRemedyDataAndSaveHistory = async (data) => {
  const doctorServices = require("../services/doctorServices");
  const db = require("../models/index");

  // 1. Generate PDF
  console.log(`[Queue] Generating PDF for booking ${data.bookingId}...`);
  let pdfBase64 = "";
  try {
    pdfBase64 = await doctorServices.getPrescriptionPDFBase64(data.pdfData);
    data.imgBase64 = `data:application/pdf;base64,${pdfBase64}`;
  } catch (pdfErr) {
    console.error("[Queue] Error generating PDF prescription:", pdfErr);
  }

  // 2. Create PayOS Payment Link
  console.log(`[Queue] Creating PayOS payment link for booking ${data.bookingId}...`);
  try {
    const payosRes = await doctorServices.createPayOSPaymentLink({
      bookingId: data.bookingId,
      amount: data.amount,
    });
    if (payosRes && payosRes.errCode === 0) {
      data.payosUrl = payosRes.checkoutUrl;
    }
  } catch (payosErr) {
    console.error("[Queue] Error creating PayOS link:", payosErr);
  }

  // 3. Save to History database
  console.log(`[Queue] Saving medical history for booking ${data.bookingId}...`);
  try {
    const medicalDescription = JSON.stringify({
      diagnosis: data.examInfo.diagnosis,
      clinicalExam: data.examInfo.clinicalExam,
      detailExam: data.examInfo.detailExam,
      treatment: data.examInfo.conclusion,
      advice: data.examInfo.advice,
      prescription: data.prescription,
    });
    await db.History.create({
      description: medicalDescription,
      doctorId: data.doctorId,
      patientId: data.patientId,
      files: pdfBase64,
    });
  } catch (dbErr) {
    console.error("[Queue] Error saving medical history to database:", dbErr);
  }
};

// Thư mục chứa các hàm gửi mail gốc để chạy trực tiếp (khi Redis offline)
const executeEmailDirectly = async (taskType, data) => {
  console.log(`[Queue Fallback] Processing task ${taskType} directly`);
  try {
    if (taskType === "sendSimpleEmail") {
      await emailServices.sendSimpleEmailDirect(data);
    } else if (taskType === "sendAttachment") {
      await prepareRemedyDataAndSaveHistory(data);
      await emailServices.sendAttachmentDirect(data);
    } else if (taskType === "sendEmailPaymentSuccess") {
      await emailServices.sendEmailPaymentSuccessDirect(data);
    }
  } catch (error) {
    console.error(`[Queue Fallback] Failed to execute email task directly for ${taskType}:`, error);
  }
};

export const initQueue = () => {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = parseInt(process.env.REDIS_PORT || "6379");
  queueConnectionOptions = { host, port };

  try {
    // BullMQ khởi tạo Queue
    emailQueue = new Queue("emailQueue", {
      connection: queueConnectionOptions,
    });

    // BullMQ khởi tạo Worker xử lý các jobs
    emailWorker = new Worker(
      "emailQueue",
      async (job) => {
        const { taskType, data } = job.data;
        console.log(`[Queue Worker] Executing job ${job.id} for task ${taskType}`);

        if (taskType === "sendSimpleEmail") {
          await emailServices.sendSimpleEmailDirect(data);
        } else if (taskType === "sendAttachment") {
          await prepareRemedyDataAndSaveHistory(data);
          await emailServices.sendAttachmentDirect(data);
        } else if (taskType === "sendEmailPaymentSuccess") {
          await emailServices.sendEmailPaymentSuccessDirect(data);
        }
      },
      {
        connection: queueConnectionOptions,
        concurrency: 2, // Xử lý tối đa 2 job đồng thời
      }
    );

    emailQueue.on("error", (err) => {
      console.warn("⚠️ BullMQ Queue connection warning:", err.message);
    });

    emailWorker.on("error", (err) => {
      console.warn("⚠️ BullMQ Worker connection warning:", err.message);
    });

    emailWorker.on("completed", (job) => {
      console.log(`[Queue Worker] Job ${job.id} completed successfully.`);
    });

    emailWorker.on("failed", (job, err) => {
      console.error(`[Queue Worker] Job ${job.id} failed with error:`, err.message);
    });

    console.log("✅ BullMQ Task Queue & Worker initialized successfully!");
  } catch (error) {
    console.warn("⚠️ Could not initialize BullMQ. Using direct synchronous execution instead.", error.message);
    emailQueue = null;
    emailWorker = null;
  }
};

export const addEmailJob = async (taskType, data) => {
  if (emailQueue) {
    try {
      await emailQueue.add(
        taskType,
        { taskType, data },
        {
          attempts: 3, // Retry tối đa 3 lần nếu lỗi
          backoff: {
            type: "exponential",
            delay: 5000, // Đợi 5s trước khi retry
          },
        }
      );
      console.log(`[Queue] Successfully queued job: ${taskType}`);
      return;
    } catch (err) {
      console.warn(`[Queue] Failed to add job to BullMQ, falling back to direct execution: ${err.message}`);
    }
  }

  // Chạy đồng bộ trực tiếp nếu Redis/Queue không hoạt động
  setImmediate(() => executeEmailDirectly(taskType, data));
};
