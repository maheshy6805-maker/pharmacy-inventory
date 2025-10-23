const fs = require("fs");
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
exports.sendAccountSetupSuccessEmail = async (to, userData) => {
  const htmlTemplate = `
  <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; border-radius: 8px; max-width: 500px; margin: auto; border: 1px solid #e5e7eb;">
    <h2 style="color: #7e22ce; text-align: center;">Pharmalogy</h2>
    <p>Dear ${userData?.fullName},</p>
    <p>We're excited to welcome you to Pharmalogy! Your enterprise, <strong>${userData?.enterprise}</strong>, has been successfully registered.</p>
    <p>You're now ready to experience seamless and efficient pharmacy management with us.</p>
    <div style="font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0;">Happy Billing 😊</div>
    <p><strong>Note:</strong> You are currently using the beta version of our application. Some features may still be under development and might not function as expected. If you encounter any issues or technical difficulties, please don’t hesitate to reach out to our support team.</p>
    <p>Thank you for choosing Pharmalogy.</p>
  </div>
`;

  try {
    const sendSmtpEmail = {
      sender: { name: "Pharmalogy", email: "no-reply@pharmalogy.co.in" },
      to: [{ email: to }],
      subject: "Welcome to Pharmalogy 🎉",
      htmlContent: htmlTemplate,
    };

    const response = await client.sendTransacEmail(sendSmtpEmail);
    console.log(
      "✅ Welcome email triggered:",
      response.body?.messageId || response
    );
  } catch (err) {
    console.error(
      "❌ Failed to trigger welcome email:",
      err.response?.body || err.message
    );
  }
};

/**
 * Send Bill Email with Cloud PDF Attachment
 * @param {string} to - Recipient email
 * @param {object} bill - Bill object
 * @param {string} pdfUrl - Cloudflare R2 public file URL (https://...)
 * @param {object} enterprise - Enterprise details
 */
exports.sendBillEmail = async (to, bill, pdfUrl, enterprise) => {
  try {
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; border-radius: 8px; max-width: 600px; margin: auto;">
        <h2 style="color: #7e22ce; text-align: center;">Pharmalogy Invoice</h2>
        <p>Dear ${bill.customer?.name || "Customer"},</p>
        <p>Thank you for your purchase from <strong>${
          enterprise?.name || "Pharmalogy"
        }</strong>.</p>
        <p>Your total bill amount is <strong>₹${bill.totalAmount}</strong>.</p>
        <p>Payment Mode: <strong>${bill.paymentMode}</strong></p>
        <p>You can view or download your detailed invoice by clicking the button below:</p>
        <div style="text-align:center; margin: 20px 0;">
          <a href="${pdfUrl}" target="_blank" style="background-color:#7e22ce; color:#fff; padding:10px 20px; border-radius:5px; text-decoration:none;">View Invoice</a>
        </div>
        <p>Regards,<br/><strong>${enterprise?.name || "Pharmalogy"}</strong></p>
      </div>
    `;

    const sendSmtpEmail = {
      sender: {
        name: enterprise?.name || "Pharmalogy",
        email: "no-reply@pharmalogy.co.in",
      },
      to: [{ email: to }],
      subject: `Invoice #${bill._id} - ${enterprise?.name || "Pharmalogy"}`,
      htmlContent: htmlTemplate,
    };

    const response = await client.sendTransacEmail(sendSmtpEmail);
    console.log(
      `✅ Bill email sent to ${to}:`,
      response.body?.messageId || response
    );
  } catch (err) {
    console.error(
      "❌ Failed to send bill email:",
      err.response?.body || err.message
    );
  }
};
