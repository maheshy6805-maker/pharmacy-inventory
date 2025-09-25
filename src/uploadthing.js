// uploadthing.js
const { createUploadthing } = require("uploadthing/express");
const { processCsvAndInsert } = require("./utils/csvHandler");

const f = createUploadthing();

const uploadRouter = {
  media: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf: { maxFileSize: "16MB", maxFileCount: 2 },
    blob: { maxFileSize: "16MB", maxFileCount: 2 },
    // 👇 force callback even for small files
    awaitServerData: true,
  })
    .middleware(async ({ req }) => ({
      enterpriseId: req.user?.enterprise || null,
      userId: req.user ? req.user.id || req.user._id : "anon",
    }))
    .onUploadComplete(async ({ file, metadata }) => {
      console.log("🔥 UPLOAD COMPLETE – file:", file.name);
      console.log(
        "endsWith .csv ?",
        file.name.trim().toLowerCase().endsWith(".csv")
      );

      if (file.name.trim().toLowerCase().endsWith(".csv")) {
        try {
          const result = await processCsvAndInsert(
            file.ufsUrl,
            metadata.enterpriseId
          );
          console.log("CSV Process Result:", result);
          return { type: "csv", ...result };
        } catch (err) {
          console.error("CSV import error:", err);
          return { type: "csv", error: err.message };
        }
      }

      return {
        url: file.ufsUrl,
        key: file.key,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: metadata.userId,
      };
    }),
};

module.exports = { uploadRouter };
