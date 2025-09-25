require("dotenv").config();
const brevo = require("@getbrevo/brevo");

// Initialize Brevo client
const client = new brevo.TransactionalEmailsApi();
client.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

exports.sendOtpEmail = async (to, otp) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; border-radius: 8px; max-width: 500px; margin: auto; border: 1px solid #e5e7eb;">
      <h2 style="color: #7e22ce; text-align: center;">Pharmalogy</h2>
      <p>Dear User,</p>
      <p>Your One Time Password for registration is:</p>
      <div style="font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0;">${otp}</div>
      <p>This OTP is valid for <strong>5 minutes</strong>. Please do not share it.</p>
    </div>
  `;

  try {
    const sendSmtpEmail = {
      sender: { name: "Pharmalogy", email: "no-reply@pharmalogy.co.in" }, // must match verified sender
      to: [{ email: to }],
      subject: "Your OTP Code",
      htmlContent: htmlTemplate,
    };

    const response = await client.sendTransacEmail(sendSmtpEmail);
    console.log("✅ OTP Email sent:", response.body?.messageId || response);
  } catch (err) {
    console.error(
      "❌ Failed to send OTP email:",
      err.response?.body || err.message
    );
  }
};
