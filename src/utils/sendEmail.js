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
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; border-radius: 8px; max-width: 500px; margin: auto; border: 1px solid #e5e7eb;">
      <h2 style="color: #7e22ce; text-align: center;">Pharmalogy</h2>
      <p style="font-size: 16px; color: #374151;">
        Dear User,
      </p>
      <p style="font-size: 16px; color: #374151;">
        Your One Time Password for registration is:
      </p>
      <div style="font-size: 24px; font-weight: bold; color: #111827; text-align: center; margin: 20px 0;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        &copy; ${new Date().getFullYear()} Pharmalogy. All rights reserved.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Pharmacy App" <${process.env.MAIL_USER}>`,
    to,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`, // fallback for non-HTML clients
    html: htmlTemplate,
  });

  console.log("OTP Email sent to:", to);
};
