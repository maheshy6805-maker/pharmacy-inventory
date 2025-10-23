// sendWhatsapp.js
import fetch from "node-fetch";
import fs from "fs";

/**
 * Send a WhatsApp message with a PDF bill (optional)
 * @param {string} to - Receiver phone number (with country code, e.g. +9198xxxxxx)
 * @param {string} message - Message text
 * @param {string} pdfUrl - Optional hosted PDF link (for sending bills)
 */
export const sendWhatsappMessage = async (to, message) => {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Define API URL
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    // Base message body
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ WhatsApp send error:", data);
      return { success: false, error: data };
    }

    console.log("✅ WhatsApp message sent successfully:", data);
    return { success: true, data };
  } catch (err) {
    console.error("🚨 WhatsApp message failed:", err);
    return { success: false, error: err.message };
  }
};
