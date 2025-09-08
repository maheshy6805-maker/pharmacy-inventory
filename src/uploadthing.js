// src/uploadthing.js
require("dotenv").config(); // ensure env loaded if using this file directly
const {
  createUploadthing,
  createRouteHandler,
} = require("uploadthing/express");

const f = createUploadthing();

// Define your file router
const uploadRouter = {
  // "media" is the endpoint slug you will call from the front-end
  media: f({
    // allow images + pdf/doc types
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 2 },
    "application/msword": { maxFileSize: "10MB", maxFileCount: 2 }, // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 2, // .docx
    },
  })
    .middleware(async ({ req }) => {
      // This runs before upload starts. You can attach metadata (e.g. user id)
      // IMPORTANT: If you want req.user here, make sure your auth middleware runs before createRouteHandler in app.js
      const userId = req.user ? req.user.id || req.user._id : "anon";
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      // file contains: { url, key, name, size, type, ... }
      // metadata contains what middleware returned (e.g. userId)
      // You can use this hook to write DB records automatically, if desired.
      // We'll just return a small object that will be sent back to client.
      return {
        url: file.url,
        key: file.key,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: metadata.userId,
      };
    }),
};

module.exports = { uploadRouter, createRouteHandler };
