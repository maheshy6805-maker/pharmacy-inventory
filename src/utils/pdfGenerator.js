const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/**
 * Generates a professional, clean, aligned PDF invoice
 * @param {Object} bill
 * @param {Object} enterprise
 * @returns {Promise<string>} Path to generated PDF file
 */
exports.generateBillPDF = async (bill, enterprise) => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.join(__dirname, "../uploads/bills");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${bill._id}.pdf`);
      const pdf = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      pdf.pipe(stream);

      // ---- Header ----
      pdf
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#7e22ce")
        .text(enterprise?.name || "Pharmalogy", { align: "center" });

      if (enterprise?.email)
        pdf
          .moveDown(0.2)
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#555")
          .text(enterprise.email, { align: "center" });

      pdf.moveDown(1.2);
      pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).strokeColor("#ddd").stroke();
      pdf.moveDown(1);

      // ---- Invoice Info ----
      pdf.font("Helvetica-Bold").fontSize(16).fillColor("#000").text("Invoice");
      pdf.moveDown(0.3);
      pdf
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#333")
        .text(`Invoice ID: ${bill._id}`)
        .text(`Date: ${new Date(bill.createdAt).toLocaleString()}`)
        .text(`Payment Mode: ${bill.paymentMode}`)
        .text(`Bill Type: ${bill.billType}`);
      pdf.moveDown(1);

      // ---- Customer ----
      pdf
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#000")
        .text("Customer details");
      pdf
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#333")
        .text(`Name: ${bill.customer?.name || "-"}`)
        .text(`Mobile: ${bill.customer?.mobile || "-"}`)
        .text(`Email: ${bill.customer?.email || "N/A"}`);
      pdf.moveDown(1.2);

      // ---- Table Header ----
      pdf
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#000")
        .text("Products");
      pdf.moveDown(0.4);

      const startY = pdf.y;
      const tableLeft = 50;
      const tableWidth = 500;

      // Draw header background
      pdf
        .rect(tableLeft, startY - 5, tableWidth, 22)
        .fill("#ede9fe")
        .strokeColor("#ccc")
        .stroke();

      const headers = [
        { label: "Name", x: 55, width: 160, align: "left" },
        { label: "Qty", x: 220, width: 40, align: "center" },
        { label: "Unit (₹)", x: 270, width: 60, align: "right" },
        { label: "GST%", x: 340, width: 50, align: "center" },
        { label: "Discount%", x: 400, width: 70, align: "center" },
        { label: "Total (₹)", x: 480, width: 70, align: "right" },
      ];

      pdf.fillColor("#333").fontSize(11);
      headers.forEach((h) =>
        pdf.text(h.label, h.x, startY, { width: h.width, align: h.align })
      );

      // ---- Table Rows ----
      let y = startY + 25;
      pdf.font("Helvetica").fontSize(10).fillColor("#000");

      bill.products.forEach((item, index) => {
        const { name, gst, discount, price } = item.product;
        const rowHeight = 20;

        // alternate background color
        if (index % 2 === 0) {
          pdf
            .rect(tableLeft, y - 5, tableWidth, rowHeight)
            .fill("#f9f9f9")
            .strokeColor("#eee")
            .stroke();
        }

        pdf
          .fillColor("#000")
          .text(name || "-", 55, y, { width: 160 })
          .text(item.quantitySold.toString(), 220, y, {
            width: 40,
            align: "center",
          })
          .text(`₹${(price || 0).toFixed(2)}`, 270, y, {
            width: 60,
            align: "right",
          })
          .text(`${gst || 0}%`, 340, y, { width: 50, align: "center" })
          .text(`${discount || 0}%`, 400, y, { width: 70, align: "center" })
          .text(`₹${item.totalPrice.toFixed(2)}`, 480, y, {
            width: 70,
            align: "right",
          });

        y += rowHeight;
      });

      // table bottom border
      pdf
        .moveTo(tableLeft, y)
        .lineTo(tableLeft + tableWidth, y)
        .strokeColor("#ccc")
        .stroke();

      // ---- Totals ----
      pdf.moveDown(2);
      pdf
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(`Total Amount: ₹${bill.totalAmount.toFixed(2)}`, {
          align: "right",
        });
      pdf
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#444")
        .text(`Payment Mode: ${bill.paymentMode}`, { align: "right" });

      // ---- Notes / Warnings ----
      if (bill.warnings?.length) {
        pdf.moveDown(1);
        pdf
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#b91c1c")
          .text("⚠ Notes:");
        pdf.font("Helvetica").fillColor("#333").fontSize(11);
        bill.warnings.forEach((w) => pdf.text(`- ${w}`));
      }

      // ---- Footer ----
      pdf.moveDown(2.5);
      pdf
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#7e22ce")
        .text("Thank you for your purchase!", { align: "center" });

      pdf
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#888")
        .text(`© Powered by Pharmalogy`, { align: "center" });

      pdf.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};
