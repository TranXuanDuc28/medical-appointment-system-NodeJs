require("dotenv").config();
import nodemailer from "nodemailer";

let sendSimpleEmail = async (dataSend) => {
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
  // console.log("transporter", transporter);
  try {
    let info = await transporter.sendMail({
      from: '"Trần Xuân Đức 👻" <ductranxuan28@gmail.com>', // sender address
      to: dataSend.reciverEmail, // list of receivers
      subject: "Thông tin đặt lịch khám bệnh", // Subject line
      html: getBodyHTMLEmail(dataSend),
    });
    // console.log("✅ Gửi thành công", info);
  } catch (error) {
    console.error("❌ Gửi thất bại", error);
  }
};

let getBodyHTMLEmail = (dataSend) => {
  let result = "";
  if (dataSend.language === "vi") {
    result = `
    <h3>Xin chào ${dataSend.patientName}!</h3>
    <p>Bạn nhận được email này vì đã đặt bệnh online trên Booking care</p>
    <p>Thông tin đăt lịch khám bệnh</p>
    <div><b>Thời gian:${dataSend.time}</b>
    </div>
     <div><b>Bác sĩ:${dataSend.doctorName}</b>
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
    <div><b>Time:${dataSend.time}</b>
    </div>
     <div><b>Doctor:${dataSend.doctorName}</b>
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
  let BANK_ID = "mbbank";
  let ACCOUNT_NO = "0367462316";
  let TEMPLATE = "compact2";
  let AMOUNT = dataSend.amount ? dataSend.amount : "5000"; // Default amount if not provided
  let DESCRIPTION = encodeURIComponent("Booking care - Thanh toán dịch vụ");
  let ACCOUNT_NAME = encodeURIComponent("Thanh toán dịch vụ");

  const qrImage = `
    <div style="margin-top: 20px;">
      <p>Hoặc quét mã QR để thanh toán:</p>
      <img src="https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.jpg?amount=${AMOUNT}&addInfo=${DESCRIPTION}&accountName=${ACCOUNT_NAME}" 
      alt="QR Code thanh toán" style="width: 200px; height: auto;" />
    </div>
  `;

  if (dataSend.language === "vi") {
    result = `
      <h3>Xin chào ${dataSend.patientName}!</h3>
      <p>Bạn nhận được email này vì đã đặt lịch khám bệnh trên Booking Care.</p>
      <p><b>Thông tin đơn thuốc:</b></p>
      <div><b>Thời gian:</b> ${dataSend.time}</div>
      <div><b>Bác sĩ:</b> ${dataSend.doctorName}</div>
      <p>Nếu các thông tin trên là chính xác, vui lòng click vào đường link bên dưới để thanh toán:</p>
      <div>
        <a href="${dataSend.redirectLink}" target="_blank">Click vào đây để thanh toán</a>
      </div>
      ${qrImage}
      <div>Xin chân thành cảm ơn!</div>
    `;
  } else {
    // Trường hợp ngôn ngữ khác (ví dụ English)
    result = `
      <h3>Dear ${dataSend.patientName}!</h3>
      <p>You received this email because you booked a medical appointment on Booking Care.</p>
      <p><b>Prescription Information:</b></p>
      <div><b>Time:</b> ${dataSend.time}</div>
      <div><b>Doctor:</b> ${dataSend.doctorName}</div>
      <p>If the above information is correct, please click the link below to proceed with payment:</p>
      <div>
        <a href="${dataSend.redirectLink}" target="_blank">Click here to pay</a>
      </div>
      ${qrImage}
      <div>Thank you very much!</div>
    `;
  }

  return result;
};

let sendAttachment = async (dataSend) => {
  return new Promise(async (resolve, reject) => {
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
        to: dataSend.email, // list of receivers
        subject: "Kết quả đặt lịch khám bệnh", // Subject line
        html: getBodyHTMLEmailRemedy(dataSend),
        attachments: [
          {
            filename: `remedy-${dataSend.email}-${new Date().getTime()}.png`,
            content: dataSend.imgBase64
              ? dataSend.imgBase64.split("base64,")[1]
              : "",
            encoding: "base64",
          },
        ],
      });
      resolve({
        errCode: 0,
        errMessage: "Send remedy success!",
      });
      // console.log("✅ Gửi thành công", info);
    } catch (error) {
      console.error("❌ Gửi thất bại", error);
      reject(error);
    }
  });
};

module.exports = {
  sendSimpleEmail: sendSimpleEmail,
  sendAttachment: sendAttachment,
};
