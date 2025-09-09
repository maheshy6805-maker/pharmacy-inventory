// uploadthing.js
const { createUploadthing } = require("uploadthing/express");
const f = createUploadthing();

const uploadRouter = {
  media: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 2 },
    "application/msword": { maxFileSize: "10MB", maxFileCount: 2 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 2,
    },
  })
    .middleware(async ({ req }) => {
      const userId = req.user ? req.user.id || req.user._id : "anon";
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
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

module.exports = { uploadRouter };
