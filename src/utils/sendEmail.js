require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.MAIL_SERVICE,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendOtpEmail = async (to, otp) => {
  const info = await transporter.sendMail({
    from: `"Pharmacy App" <${process.env.MAIL_USER}>`,
    to,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`,
  });

  console.log("Preview OTP Email: %s", nodemailer.getTestMessageUrl(info));
};
