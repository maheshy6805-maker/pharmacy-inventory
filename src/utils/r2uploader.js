const AWS = require("aws-sdk");
const fs = require("fs");
require("dotenv").config();

const s3 = new AWS.S3({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, // ✅ correct R2 endpoint
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: "auto", // ✅ must be explicitly defined (R2 ignores region but SDK needs it)
  signatureVersion: "v4",
  s3ForcePathStyle: true, // ✅ required for Cloudflare R2
});

exports.uploadToR2 = async (
  filePath,
  fileName,
  mimeType = "application/pdf"
) => {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: process.env.R2_BUCKET,
    Key: fileName,
    Body: fileContent,
    ContentType: mimeType,
  };

  try {
    // Upload file
    await s3.putObject(params).promise();

    // Delete local file after upload
    fs.unlinkSync(filePath);

    // Return public URL
    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error("❌ R2 upload failed:", error);
    throw new Error(`R2 upload failed: ${error.message}`);
  }
};
