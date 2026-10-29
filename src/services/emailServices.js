require("dotenv").config();
import nodemailer from "nodemailer";

// Gửi email xác nhận đặt lịch khám (Gốc - Chạy trực tiếp)
let sendSimpleEmailDirect = async (dataSend) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
      user: process.env.EMAIL_APP,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });

  try {
    let info = await transporter.sendMail({
      from: '"Trần Xuân Đức" <ductranxuan28@gmail.com>', // sender address
      to: dataSend.reciverEmail, // list of receivers
      subject: "Thông tin đặt lịch khám bệnh", // Subject line
      html: getBodyHTMLEmail(dataSend),
    });
    console.log("✅ Gửi email xác nhận thành công:", info.messageId);
  } catch (error) {
    console.error("❌ Gửi email xác nhận thất bại:", error);
    throw error;
  }
};

let getBodyHTMLEmail = (dataSend) => {
  let result = "";
  if (dataSend.language === "vi") {
    result = `
    <h3>Xin chào ${dataSend.patientName}!</h3>
    <p>Bạn nhận được email này vì đã đặt bệnh online trên Booking care</p>
    <p>Thông tin đăt lịch khám bệnh</p>
    <div><b>Thời gian: ${dataSend.time}</b>
    </div>
     <div><b>Bác sĩ: ${dataSend.doctorName}</b>
    </div>
    <p>Nếu các thông tin trên là đúng sự thật vui lòng click vào đường link bên dưới để xác nhận và hoàn tất thủ tục đặt lịch khám bệnh</p>
    <div>
    <a href=${dataSend.redirectLink} target="_blank">Click here</a>
    </div>
    <div> Xin chân thành cảm ơn!</div>
    `;
  }
  if (dataSend.language === "en") {
    result = `
        <h3>Dear ${dataSend.patientName}!</h3>
    <p>You received this email because you booked an appointment online on Booking care.</p>
    <p>Information to schedule appointment</p>
    <div><b>Time: ${dataSend.time}</b>
    </div>
     <div><b>Doctor: ${dataSend.doctorName}</b>
    </div>
    <p>If the above information is correct, please click on the link below to confirm and complete the appointment procedure.</p>
    <div>
    <a href=${dataSend.redirectLink} target="_blank">Click here</a>
    </div>
    <div> Sincerely thank!</div>
    `;
  }
  return result;
};

let getBodyHTMLEmailRemedy = (dataSend) => {
  let result = "";
  let paymentSection = "";

  if (dataSend.payosUrl) {
    // Luồng PayOS: Hiển thị nút bấm thanh toán trực tuyến đẹp mắt
    paymentSection = `
      <div style="margin: 20px 0;">
        <p><b>Vui lòng nhấn vào nút bên dưới để tiến hành thanh toán trực tuyến (hỗ trợ chuyển khoản nhanh VietQR hoặc thẻ ngân hàng):</b></p>
        <a href="${dataSend.payosUrl}" target="_blank" 
           style="background: linear-gradient(135deg, #0070f3 0%, #00a4ff 100%); color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif;">
          Thanh Toán Hóa Đơn (PayOS)
        </a>
      </div>
    `;
  } else {
    // Luồng Casso cũ: Đã tạm dừng hoạt động
    paymentSection = `
      <div style="margin-top: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 12px; border-radius: 6px; font-family: sans-serif;">
        <p><b>Thông báo:</b> Cổng thanh toán chuyển khoản thủ công (Casso) đang được bảo trì. Vui lòng liên hệ phòng khám để biết thêm chi tiết.</p>
      </div>
    `;
  }

  if (dataSend.language === "vi") {
    result = `
      <h3>Xin chào ${dataSend.patientInfo.fullName}!</h3>
      <p>Bạn nhận được email này vì đã đặt lịch khám bệnh trên Booking Care.</p>
      <p><b>Thông tin đơn thuốc: (Nhấn vào file đính kèm để xem)</b></p>
      <div><b>Thời gian:</b> ${dataSend.time}</div>
      <div><b>Bác sĩ:</b> ${dataSend.doctorName}</div>
      ${paymentSection}
      <div style="margin-top: 15px;">Xin chân thành cảm ơn!</div>
    `;
  } else {
    result = `
      <h3>Dear ${dataSend.patientInfo.fullName}!</h3>
      <p>You received this email because you booked a medical appointment on Booking Care.</p>
      <p><b>Prescription Information: (Click attached file to view)</b></p>
      <div><b>Time:</b> ${dataSend.time}</div>
      <div><b>Doctor:</b> ${dataSend.doctorName}</div>
      ${dataSend.payosUrl ? `
        <div style="margin: 20px 0;">
          <p><b>Please click the button below to pay online (supports fast VietQR transfer or local bank card):</b></p>
          <a href="${dataSend.payosUrl}" target="_blank" 
             style="background: linear-gradient(135deg, #0070f3 0%, #00a4ff 100%); color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: sans-serif;">
            Pay Invoice (PayOS)
          </a>
        </div>
      ` : `
        <div style="margin-top: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 12px; border-radius: 6px; font-family: sans-serif;">
          <p><b>Notice:</b> The manual bank transfer (Casso) is currently undergoing maintenance. Please contact the clinic for more details.</p>
        </div>
      `}
      <div style="margin-top: 15px;">Thank you very much!</div>
    `;
  }

  return result;
};

// Gửi email kèm đơn thuốc (Gốc - Chạy trực tiếp)
let sendAttachmentDirect = async (dataSend) => {
  try {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use `true` for port 465, `false` for all other ports
      auth: {
        user: process.env.EMAIL_APP,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });
    let info = await transporter.sendMail({
      from: '"Trần Xuân Đức" <ductranxuan28@gmail.com>', // sender address
      to: dataSend.patientInfo.email, // list of receivers
      subject: "Kết quả đặt lịch khám bệnh và Hóa đơn", // Subject line
      html: getBodyHTMLEmailRemedy(dataSend),
      attachments: [
        {
          filename:
            dataSend.imgBase64 &&
            dataSend.imgBase64.startsWith("data:application/pdf")
              ? `don-thuoc.pdf`
              : `don-thuoc.png`,
          content: dataSend.imgBase64
            ? dataSend.imgBase64.split("base64,")[1]
            : "",
          encoding: "base64",
        },
      ],
    });
    console.log("✅ Gửi email đơn thuốc kèm hóa đơn thành công:", info.messageId);
    return {
      errCode: 0,
      errMessage: "Send remedy success!",
    };
  } catch (error) {
    console.error("❌ Gửi email đơn thuốc thất bại:", error);
    throw error;
  }
};

// Gửi email thông báo thanh toán thành công (Gốc - Chạy trực tiếp)
let sendEmailPaymentSuccessDirect = async (dataSend) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_APP,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  try {
    let info = await transporter.sendMail({
      from: '"Trần Xuân Đức" <ductranxuan28@gmail.com>',
      to: dataSend.reciverEmail,
      subject: "Thông báo: Giao dịch thanh toán thành công!",
      html: getBodyHTMLEmailPayment(dataSend),
    });
    console.log("✅ Gửi email thanh toán thành công:", info.messageId);
  } catch (error) {
    console.error("❌ Gửi email thanh toán thất bại:", error);
    throw error;
  }
};

let getBodyHTMLEmailPayment = (dataSend) => {
  let result = "";
  if (dataSend.language === "vi") {
    result = `
    <h3>Xin chào ${dataSend.patientName}!</h3>
    <p>Bạn đã thanh toán thành công về chí phí tại Booking care</p>
    <p>Thông tin thanh toán</p>
    <div><b>Thời gian: ${dataSend.time}</b>
    </div>
     <div><b>Tổng chi phí đã thanh toán: ${dataSend.amount} VND</b>
    </div>
    <div> Xin chân thành cảm ơn!</div>
    `;
  }
  return result;
};

// ---------------- WRAPPERS GỬI QUA TASK QUEUE ----------------

let sendSimpleEmail = async (dataSend) => {
  const { addEmailJob } = require("../utils/queue");
  await addEmailJob("sendSimpleEmail", dataSend);
};

let sendAttachment = async (dataSend) => {
  const { addEmailJob } = require("../utils/queue");
  await addEmailJob("sendAttachment", dataSend);
  return {
    errCode: 0,
    errMessage: "Remedy job has been added to queue!",
  };
};

let sendEmailPaymentSuccess = async (dataSend) => {
  const { addEmailJob } = require("../utils/queue");
  await addEmailJob("sendEmailPaymentSuccess", dataSend);
};

module.exports = {
  sendSimpleEmail: sendSimpleEmail,
  sendAttachment: sendAttachment,
  sendEmailPaymentSuccess: sendEmailPaymentSuccess,
  
  // Export direct methods for BullMQ Worker
  sendSimpleEmailDirect: sendSimpleEmailDirect,
  sendAttachmentDirect: sendAttachmentDirect,
  sendEmailPaymentSuccessDirect: sendEmailPaymentSuccessDirect,
};
